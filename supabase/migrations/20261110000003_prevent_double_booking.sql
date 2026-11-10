-- Database-level guard against double bookings.
--
-- Until now every client (public site, admin calendar, manual booking dialog) checked for
-- conflicts itself and then inserted in a separate request, so two concurrent saves could
-- still book the same unit for overlapping nights. create_public_booking serialises only
-- public bookings. These triggers make the database the single authority:
--
--   * reservations: INSERT / UPDATE of a blocking row (status UNPROCESSED, PENDING,
--     CONFIRMED, CHECK_IN with a room unit) must not overlap another blocking reservation
--     or an active group booking on the same unit. Edits that do not touch unit, dates or
--     blocking state (notes, payments, …) are not re-checked, so legacy overlaps that may
--     already exist never block unrelated admin edits.
--   * group_booking_room_assignments: assigning a unit to an active group booking is checked
--     the same way.
--   * group_bookings: changing dates or activating the group re-checks all assigned units.
--
-- Same-day turnover (one guest checks out the day another checks in) is still allowed —
-- the comparison is check_in < other.check_out AND check_out > other.check_in.
-- Conflicts raise 'ROOM_UNAVAILABLE' (SQLSTATE P0001).
--
-- Per-unit advisory locks serialise concurrent writers, so the check + insert pair cannot
-- interleave. The locks are taken in the same transaction as the write and released with it.

CREATE OR REPLACE FUNCTION public.assert_room_unit_free(
  p_unit_id          UUID,
  p_check_in         DATE,
  p_check_out        DATE,
  p_skip_reservation UUID DEFAULT NULL,
  p_skip_group       UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('room_unit:' || p_unit_id::text));

  IF EXISTS (
       SELECT 1 FROM reservations r
       WHERE r.room_unit_id = p_unit_id
         AND r.status IN ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'CHECK_IN')
         AND r.check_in_date  < p_check_out
         AND r.check_out_date > p_check_in
         AND (p_skip_reservation IS NULL OR r.id <> p_skip_reservation)
     )
     OR EXISTS (
       SELECT 1
       FROM group_booking_room_assignments a
       JOIN group_bookings g ON g.id = a.group_booking_id
       WHERE a.room_unit_id = p_unit_id
         AND g.status IN ('PENDING', 'CONFIRMED', 'CHECK_IN')
         AND g.check_in_date  < p_check_out
         AND g.check_out_date > p_check_in
         AND (p_skip_group IS NULL OR g.id <> p_skip_group)
     )
  THEN
    RAISE EXCEPTION 'ROOM_UNAVAILABLE' USING ERRCODE = 'P0001';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.assert_room_unit_free(UUID, DATE, DATE, UUID, UUID) FROM PUBLIC, anon;

-- ── reservations ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reservations_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_blocking BOOLEAN := NEW.room_unit_id IS NOT NULL
                            AND NEW.status IN ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'CHECK_IN');
  v_old_blocking BOOLEAN;
BEGIN
  IF NOT v_new_blocking THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_blocking := OLD.room_unit_id IS NOT NULL
                      AND OLD.status IN ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'CHECK_IN');
    -- Nothing that affects availability changed: skip the check.
    IF v_old_blocking
       AND NEW.room_unit_id   = OLD.room_unit_id
       AND NEW.check_in_date  = OLD.check_in_date
       AND NEW.check_out_date = OLD.check_out_date THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.assert_room_unit_free(NEW.room_unit_id, NEW.check_in_date, NEW.check_out_date, NEW.id, NULL);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reservations_no_overlap ON public.reservations;
CREATE TRIGGER reservations_no_overlap
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.reservations_no_overlap();

-- ── group_booking_room_assignments ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.group_assignment_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.room_unit_id = OLD.room_unit_id AND NEW.group_booking_id = OLD.group_booking_id THEN
    RETURN NEW;
  END IF;

  SELECT check_in_date, check_out_date, status INTO g
  FROM group_bookings WHERE id = NEW.group_booking_id;

  IF g.status IN ('PENDING', 'CONFIRMED', 'CHECK_IN') THEN
    PERFORM public.assert_room_unit_free(NEW.room_unit_id, g.check_in_date, g.check_out_date, NULL, NEW.group_booking_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS group_assignment_no_overlap ON public.group_booking_room_assignments;
CREATE TRIGGER group_assignment_no_overlap
  BEFORE INSERT OR UPDATE ON public.group_booking_room_assignments
  FOR EACH ROW EXECUTE FUNCTION public.group_assignment_no_overlap();

-- ── group_bookings (dates / status changes) ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.group_booking_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit UUID;
BEGIN
  IF NEW.status NOT IN ('PENDING', 'CONFIRMED', 'CHECK_IN') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('PENDING', 'CONFIRMED', 'CHECK_IN')
     AND NEW.check_in_date  = OLD.check_in_date
     AND NEW.check_out_date = OLD.check_out_date THEN
    RETURN NEW;
  END IF;

  FOR v_unit IN SELECT room_unit_id FROM group_booking_room_assignments WHERE group_booking_id = NEW.id LOOP
    PERFORM public.assert_room_unit_free(v_unit, NEW.check_in_date, NEW.check_out_date, NULL, NEW.id);
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS group_booking_no_overlap ON public.group_bookings;
CREATE TRIGGER group_booking_no_overlap
  BEFORE UPDATE ON public.group_bookings
  FOR EACH ROW EXECUTE FUNCTION public.group_booking_no_overlap();
