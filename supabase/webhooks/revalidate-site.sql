-- Notifies the public site (apps/site → POST /api/revalidate) whenever the admin panel
-- changes public content, so prices / rooms / promotions on the site update right away.
--
-- Environment-specific (URL + secret), so it is not a migration. Run once per database:
--
--   psql "$DB_URL" -v site_url='https://hotel-continent.com' -v secret="$REVALIDATE_SECRET" \
--        -f supabase/webhooks/revalidate-site.sql
--
-- `secret` must equal REVALIDATE_SECRET of the site's Vercel project. Re-running replaces
-- the previous URL/secret. Statement-level triggers: one request per admin save, not per row.
-- room_units only fires on the columns the site shows (number, type, active flag) — not on
-- cleanliness / housekeeping updates, which happen many times a day.
-- Requires the pg_net extension (Dashboard → Database → Extensions, or the line below).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

\o /dev/null
SELECT set_config('revalidate.url', :'site_url' || '/api/revalidate', false),
       set_config('revalidate.secret', :'secret', false);
\o

DO $do$
BEGIN
  EXECUTE format($fn$
    CREATE OR REPLACE FUNCTION public.notify_site_revalidate()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions
    AS $body$
    BEGIN
      PERFORM net.http_post(
        url     := %L,
        body    := jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', %L)
      );
      RETURN NULL;
    END
    $body$;
  $fn$, current_setting('revalidate.url'), current_setting('revalidate.secret'));
END
$do$;

REVOKE ALL ON FUNCTION public.notify_site_revalidate() FROM PUBLIC;

DO $$
DECLARE
  t TEXT;
  -- table → columns whose UPDATE should trigger a refresh (NULL = any column)
  tables TEXT[][] := ARRAY[
    ['room_types',             NULL],
    ['room_type_guest_prices', NULL],
    ['room_media',             NULL],
    ['room_units',             'room_number, room_type_id, is_active'],
    ['hotel_settings',         NULL],
    ['promotions',             NULL]
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(tables, 1) LOOP
    t := tables[i][1];
    EXECUTE format('DROP TRIGGER IF EXISTS site_revalidate ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER site_revalidate AFTER INSERT OR DELETE OR UPDATE %s ON public.%I
         FOR EACH STATEMENT EXECUTE FUNCTION public.notify_site_revalidate()',
      CASE WHEN tables[i][2] IS NULL THEN '' ELSE 'OF ' || tables[i][2] END,
      t);
  END LOOP;
END
$$;

-- To remove:
--   DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['room_types','room_type_guest_prices','room_media','room_units','hotel_settings','promotions']
--   LOOP EXECUTE format('DROP TRIGGER IF EXISTS site_revalidate ON public.%I', t); END LOOP; END $$;
--   DROP FUNCTION IF EXISTS public.notify_site_revalidate();
