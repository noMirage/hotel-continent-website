-- Fix check_room_availability to block on the full active status set,
-- matching the client-side BLOCKING constant in booking-conflicts.ts.
-- Previously only blocked PENDING + CONFIRMED; UNPROCESSED and CHECK_IN
-- could be double-booked via the calendar drag feature.

CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_unit_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.reservations
    WHERE room_unit_id = p_room_unit_id
      AND status IN ('UNPROCESSED', 'PENDING', 'CONFIRMED', 'CHECK_IN')
      AND (id != p_exclude_reservation_id OR p_exclude_reservation_id IS NULL)
      AND check_in_date < p_check_out
      AND check_out_date > p_check_in
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
