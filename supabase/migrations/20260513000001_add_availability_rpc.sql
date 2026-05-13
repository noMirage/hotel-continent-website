-- Availability check for anonymous (public) users.
--
-- Direct SELECT on `reservations` requires admin auth (RLS).
-- This SECURITY DEFINER function bypasses RLS and returns only the
-- room_unit_ids that are blocked for the requested date range — no guest PII
-- is ever exposed to the caller.
--
-- Covers both individual reservations and group bookings.

CREATE OR REPLACE FUNCTION public.get_blocked_unit_ids(
  p_check_in  DATE,
  p_check_out DATE
)
RETURNS TABLE (room_unit_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.room_unit_id
  FROM   public.reservations r
  WHERE  r.status IN ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'CHECK_IN')
    AND  r.check_in_date  < p_check_out
    AND  r.check_out_date > p_check_in

  UNION

  SELECT gba.room_unit_id
  FROM   public.group_booking_room_assignments gba
  JOIN   public.group_bookings gb ON gb.id = gba.group_booking_id
  WHERE  gb.status IN ('PENDING', 'CONFIRMED', 'CHECK_IN')
    AND  gb.check_in_date  < p_check_out
    AND  gb.check_out_date > p_check_in;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_unit_ids(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_blocked_unit_ids(DATE, DATE) TO authenticated;
