// Migration + behaviour tests for the database, without Docker.
//
// Starts a throwaway embedded Postgres, stubs the Supabase platform schemas (auth, storage,
// extensions, the anon / authenticated / service_role roles), applies every file in
// supabase/migrations in order, then checks the behaviour the app relies on: RPC grants,
// role-management guards, one role per user, the double-booking triggers, the public
// booking rate limit.
//
//   npm run test:db            (root)  — also runs in CI
//
// Exit code 1 if any migration or check fails.
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
const PORT = Number(process.env.DB_TEST_PORT ?? 54329);
const dataDir = mkdtempSync(join(tmpdir(), "hc-pg-"));

const epg = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "postgres", port: PORT, persistent: false });
await epg.initialise();
await epg.start();

const c = new pg.Client({ connectionString: `postgres://postgres:postgres@localhost:${PORT}/postgres` });
await c.connect();
const q = (sql, params) => c.query(sql, params);

let failed = 0;
const ok = (name) => console.log("  ✓", name);
const fail = (name, e) => { failed++; console.log("  ✗", name, "—", e?.message ?? e); };
// Expectation helpers run inside an open transaction and use savepoints, so an expected
// error does not abort the surrounding transaction.
async function expectError(name, code, fn) {
  await q("SAVEPOINT t");
  try { await fn(); fail(name, `expected error ${code}, got none`); await q("RELEASE SAVEPOINT t"); }
  catch (e) { await q("ROLLBACK TO SAVEPOINT t"); if (e.message.includes(code)) ok(`${name} → ${code}`); else fail(name, e); }
}
async function expectOk(name, fn) {
  await q("SAVEPOINT t");
  try { await fn(); await q("RELEASE SAVEPOINT t"); ok(name); } catch (e) { await q("ROLLBACK TO SAVEPOINT t"); fail(name, e); }
}

async function shutdown(code) {
  await c.end().catch(() => {});
  await epg.stop().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
  process.exit(code);
}

try {
  // ── Supabase platform stubs ─────────────────────────────────────────────────
  await q(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean DEFAULT false);
    CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE SCHEMA extensions;
  `);

  // ── Apply migrations in order ───────────────────────────────────────────────
  console.log("Migrations:");
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8");
    try { await q("BEGIN"); await q(sql); await q("COMMIT"); console.log("  ✓", f); }
    catch (e) { await q("ROLLBACK"); failed++; console.log("  ✗", f, "—", e.message); }
  }
  if (failed) await shutdown(1);

  console.log("\nChecks:");

  // Grants on the public-form RPCs: server (service_role) only
  for (const [role, want] of [["anon", false], ["authenticated", false], ["service_role", true]]) {
    const { rows } = await q(`SELECT has_function_privilege($1, 'public.create_public_booking(date,date,jsonb,text,text,text,text)', 'EXECUTE') AS v`, [role]);
    rows[0].v === want ? ok(`create_public_booking EXECUTE for ${role} = ${want}`) : fail(`create_public_booking EXECUTE for ${role}`, `got ${rows[0].v}`);
  }
  for (const [role, want] of [["anon", false], ["authenticated", true]]) {
    const { rows } = await q(`SELECT has_function_privilege($1, 'public.grant_admin_role(text, public.app_role)', 'EXECUTE') AS v`, [role]);
    rows[0].v === want ? ok(`grant_admin_role EXECUTE for ${role} = ${want}`) : fail(`grant_admin_role EXECUTE for ${role}`, `got ${rows[0].v}`);
  }
  {
    const { rows } = await q(`SELECT has_function_privilege('anon', 'public.get_blocked_unit_ids(date,date)', 'EXECUTE') AS v`);
    rows[0].v ? ok("get_blocked_unit_ids EXECUTE for anon (public availability check)") : fail("get_blocked_unit_ids anon", "revoked");
  }

  // Role-management RPCs with no authenticated caller
  {
    const { rows } = await q(`SELECT public.grant_admin_role('nobody@example.com', 'super_admin') AS r`);
    rows[0].r === "PERMISSION_DENIED" ? ok("grant_admin_role without auth → PERMISSION_DENIED") : fail("grant_admin_role without auth", rows[0].r);
    const r2 = await q(`SELECT public.update_role_by_user_id(gen_random_uuid(), 'super_admin') AS r`);
    r2.rows[0].r === "PERMISSION_DENIED" ? ok("update_role_by_user_id without auth → PERMISSION_DENIED") : fail("update_role_by_user_id without auth", r2.rows[0].r);
  }

  // One role per user
  {
    const { rows } = await q(`SELECT conname FROM pg_constraint WHERE conrelid = 'public.user_roles'::regclass AND contype = 'u'`);
    const names = rows.map((r) => r.conname);
    names.includes("user_roles_user_id_key") && !names.includes("user_roles_user_id_role_key")
      ? ok(`user_roles unique constraints: ${names.join(", ")}`) : fail("user_roles constraints", names.join(", "));
    await q("BEGIN");
    await q(`INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'a@b.c')`);
    await q(`INSERT INTO public.user_roles (user_id, role) VALUES ('11111111-1111-1111-1111-111111111111', 'admin')`);
    await expectError("second role for the same user", "user_roles_user_id_key",
      () => q(`INSERT INTO public.user_roles (user_id, role) VALUES ('11111111-1111-1111-1111-111111111111', 'viewer')`));
    await q("ROLLBACK");
  }

  // ── Double-booking triggers ─────────────────────────────────────────────────
  await q("BEGIN");
  const { rows: [rt] } = await q(`
    INSERT INTO public.room_types (name, slug, base_price, max_guests, is_active, description, sort_order)
    VALUES ('Test Room', 'test-room-smoke', 1000, 3, true, 'd', 999) RETURNING id`);
  await q(`INSERT INTO public.room_units (room_type_id, room_number, is_active) VALUES ($1, 'T-1', true), ($1, 'T-2', true)`, [rt.id]);
  const { rows: unitRows } = await q(`SELECT id FROM public.room_units WHERE room_type_id = $1 ORDER BY room_number`, [rt.id]);
  const [u1, u2] = unitRows.map((u) => u.id);
  const RES = `INSERT INTO public.reservations (type, room_unit_id, guest_name, guest_phone, check_in_date, check_out_date, num_guests, total_price, status, booking_source)
               VALUES ('room', $1, 'Guest', '+380501234567', $2, $3, 1, 0, $4, 'ADMIN') RETURNING id`;

  const { rows: [a] } = await q(RES, [u1, "2027-03-01", "2027-03-05", "CONFIRMED"]);
  await expectError("overlapping reservation on the same unit", "ROOM_UNAVAILABLE", () => q(RES, [u1, "2027-03-03", "2027-03-07", "PENDING"]));
  await expectOk("same-day turnover (check-in on another guest's check-out day)", () => q(RES, [u1, "2027-03-05", "2027-03-08", "CONFIRMED"]));
  await expectOk("overlapping CANCELLED reservation is allowed", () => q(RES, [u1, "2027-03-02", "2027-03-04", "CANCELLED"]));
  await expectOk("other unit, same dates", () => q(RES, [u2, "2027-03-01", "2027-03-05", "UNPROCESSED"]));
  await expectOk("editing notes of a blocking reservation", () => q(`UPDATE public.reservations SET admin_notes = 'x' WHERE id = $1`, [a.id]));
  await expectError("extending a reservation onto an occupied range", "ROOM_UNAVAILABLE",
    () => q(`UPDATE public.reservations SET check_out_date = '2027-03-06' WHERE id = $1`, [a.id]));
  await expectOk("shrinking a reservation", () => q(`UPDATE public.reservations SET check_out_date = '2027-03-04' WHERE id = $1`, [a.id]));
  await expectError("cancelled → confirmed while overlapping", "ROOM_UNAVAILABLE",
    () => q(`UPDATE public.reservations SET status = 'CONFIRMED' WHERE room_unit_id = $1 AND status = 'CANCELLED'`, [u1]));

  const { rows: [g] } = await q(`
    INSERT INTO public.group_bookings (booking_name, contact_person, num_guests, check_in_date, check_out_date, status)
    VALUES ('Smoke group', 'Org', 5, '2027-04-01', '2027-04-05', 'PENDING') RETURNING id`);
  await expectOk("assigning a free unit to a group", () => q(`INSERT INTO public.group_booking_room_assignments (group_booking_id, room_unit_id) VALUES ($1, $2)`, [g.id, u2]));
  await expectError("reservation on a unit held by an active group", "ROOM_UNAVAILABLE", () => q(RES, [u2, "2027-04-02", "2027-04-04", "CONFIRMED"]));
  await q(RES, [u1, "2027-04-02", "2027-04-04", "CONFIRMED"]);
  await expectError("assigning an occupied unit to a group", "ROOM_UNAVAILABLE",
    () => q(`INSERT INTO public.group_booking_room_assignments (group_booking_id, room_unit_id) VALUES ($1, $2)`, [g.id, u1]));
  await expectError("moving group dates onto an occupied unit", "ROOM_UNAVAILABLE",
    () => q(`UPDATE public.group_bookings SET check_in_date = '2027-03-01', check_out_date = '2027-03-03' WHERE id = $1`, [g.id]));
  await expectOk("cancelling the group", () => q(`UPDATE public.group_bookings SET status = 'CANCELLED' WHERE id = $1`, [g.id]));
  await expectOk("reservation on the unit after the group is cancelled", () => q(RES, [u2, "2027-04-02", "2027-04-04", "CONFIRMED"]));
  await q("ROLLBACK");

  // ── Public booking RPC: rate limit, availability, banquet email ─────────────
  await q("BEGIN");
  const { rows: [rt2] } = await q(`
    INSERT INTO public.room_types (name, slug, base_price, max_guests, is_active, description, sort_order)
    VALUES ('Test Room', 'test-room-smoke', 1000, 3, true, 'd', 999) RETURNING id`);
  await q(`INSERT INTO public.room_units (room_type_id, room_number, is_active) VALUES ($1, 'T-1', true), ($1, 'T-2', true)`, [rt2.id]);
  const book = (day) => q(`SELECT public.create_public_booking($1, $2, $3, 'Guest Name', '+380 50 123 45 67', null, null) AS r`,
    [`2027-05-${String(day).padStart(2, "0")}`, `2027-05-${String(day + 1).padStart(2, "0")}`, JSON.stringify([{ room_type_id: rt2.id, guests: 2 }])]);
  for (let d = 1; d <= 5; d++) await expectOk(`public booking #${d}`, () => book(d));
  await expectError("public booking #6 within 24 h from the same phone", "TOO_MANY_REQUESTS", () => book(6));
  await expectError("public booking for 3 rooms when only 2 units exist", "NO_AVAILABILITY",
    () => q(`SELECT public.create_public_booking('2027-05-01', '2027-05-02', $1, 'Other Guest', '+380671112233', null, null)`,
      [JSON.stringify([{ room_type_id: rt2.id, guests: 1 }, { room_type_id: rt2.id, guests: 1 }, { room_type_id: rt2.id, guests: 1 }])]));
  await expectOk("banquet request", () => q(`SELECT public.submit_banquet_request('Guest Name', '+380671112233', '2027-06-01', 'wedding', 50, 'c')`));
  {
    const { rows } = await q(`SELECT guest_email FROM public.reservations WHERE type = 'banquet' ORDER BY created_at DESC LIMIT 1`);
    rows[0].guest_email === null ? ok("banquet guest_email stored as NULL") : fail("banquet guest_email", JSON.stringify(rows[0].guest_email));
  }
  await q("ROLLBACK");
} catch (e) {
  failed++;
  console.error("\nUnexpected failure:", e);
}

console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
await shutdown(failed ? 1 : 0);
