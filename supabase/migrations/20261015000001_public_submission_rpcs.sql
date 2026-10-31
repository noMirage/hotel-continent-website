-- Public website write path.
--
-- The website no longer inserts rows directly from the browser. Every public form goes
-- through one of these SECURITY DEFINER functions, which validate the input and derive
-- everything that must not be client-controlled (prices, room units, promotion titles).
--
-- create_public_booking also fixes three problems of the old client-side flow:
--   * total_price was computed in the browser and could be tampered with;
--   * multi-room bookings were inserted one by one and "rolled back" with an anonymous
--     DELETE that RLS forbids, leaving partial bookings behind;
--   * the availability check and the insert were separate requests (double booking race).
--
-- After the old SPA stops serving the public pages, the direct anon INSERT policies are
-- dropped by a follow-up migration (see 20261015000002_*).

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_form_text(p_value TEXT, p_max INT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$ SELECT NULLIF(left(btrim(p_value), p_max), '') $$;

CREATE OR REPLACE FUNCTION public.public_form_check_contact(p_name TEXT, p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) < 2 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'INVALID_NAME' USING ERRCODE = 'P0001';
  END IF;
  -- Ukrainian mobile in any formatting: +380 followed by 9 digits
  IF p_phone IS NULL OR regexp_replace(p_phone, '\D', '', 'g') !~ '^380\d{9}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ── Room booking (one or more rooms, one transaction) ─────────────────────────
-- p_rooms: [{ "room_type_id": "<uuid>", "guests": 2 }, ...]

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_check_in         DATE,
  p_check_out        DATE,
  p_rooms            JSONB,
  p_guest_name       TEXT,
  p_guest_phone      TEXT,
  p_guest_email      TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today    DATE := (now() AT TIME ZONE 'Europe/Kyiv')::date;
  v_nights   INT  := p_check_out - p_check_in;
  v_group    UUID;
  v_room     JSONB;
  v_type_id  UUID;
  v_guests   INT;
  v_max      INT;
  v_unit_id  UUID;
  v_rate     NUMERIC;
  v_total    NUMERIC := 0;
  v_taken    UUID[] := '{}';
BEGIN
  PERFORM public.public_form_check_contact(p_guest_name, p_guest_phone);

  IF p_check_in IS NULL OR p_check_out IS NULL
     OR p_check_in < v_today OR v_nights < 1 OR v_nights > 60
     OR p_check_in > v_today + 730 THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(p_rooms) <> 'array' OR jsonb_array_length(p_rooms) NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'INVALID_ROOMS' USING ERRCODE = 'P0001';
  END IF;

  -- Serialise public bookings so two visitors cannot grab the same last room.
  PERFORM pg_advisory_xact_lock(hashtext('public.create_public_booking'));

  v_group := CASE WHEN jsonb_array_length(p_rooms) > 1 THEN gen_random_uuid() END;

  FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms) LOOP
    v_type_id := (v_room->>'room_type_id')::uuid;
    v_guests  := (v_room->>'guests')::int;

    SELECT max_guests INTO v_max FROM room_types WHERE id = v_type_id AND is_active;
    IF v_max IS NULL OR v_guests IS NULL OR v_guests < 1 OR v_guests > v_max THEN
      RAISE EXCEPTION 'INVALID_ROOMS' USING ERRCODE = 'P0001';
    END IF;

    -- First free active unit of this type (same blocking rules as get_blocked_unit_ids)
    SELECT ru.id INTO v_unit_id
    FROM room_units ru
    WHERE ru.room_type_id = v_type_id
      AND ru.is_active
      AND ru.id <> ALL (v_taken)
      AND ru.id NOT IN (SELECT b.room_unit_id FROM public.get_blocked_unit_ids(p_check_in, p_check_out) b
                        WHERE b.room_unit_id IS NOT NULL)
    ORDER BY ru.room_number
    LIMIT 1;

    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'NO_AVAILABILITY' USING ERRCODE = 'P0001';
    END IF;
    v_taken := v_taken || v_unit_id;

    SELECT COALESCE(gp.price_per_night, rt.base_price) INTO v_rate
    FROM room_types rt
    LEFT JOIN room_type_guest_prices gp ON gp.room_type_id = rt.id AND gp.guest_count = v_guests
    WHERE rt.id = v_type_id;

    INSERT INTO reservations (
      type, room_unit_id, guest_name, guest_phone, guest_email,
      check_in_date, check_out_date, num_guests, total_price,
      status, booking_source, special_requests, booking_group_id
    ) VALUES (
      'room', v_unit_id, btrim(p_guest_name), btrim(p_guest_phone), public.public_form_text(p_guest_email, 200),
      p_check_in, p_check_out, v_guests, v_rate * v_nights,
      'UNPROCESSED', 'SITE', public.public_form_text(p_special_requests, 2000), v_group
    );

    v_total := v_total + v_rate * v_nights;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'nights', v_nights, 'rooms', jsonb_array_length(p_rooms));
END $$;

-- ── Banquet request ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_banquet_request(
  p_guest_name   TEXT,
  p_guest_phone  TEXT,
  p_event_date   DATE,
  p_event_type   TEXT,
  p_guests_count INT,
  p_comment      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.public_form_check_contact(p_guest_name, p_guest_phone);
  IF p_event_date IS NULL OR p_event_date < (now() AT TIME ZONE 'Europe/Kyiv')::date THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = 'P0001';
  END IF;
  IF p_event_type NOT IN ('wedding','birthday','corporate','christening','anniversary','conference','kids_party') THEN
    RAISE EXCEPTION 'INVALID_EVENT_TYPE' USING ERRCODE = 'P0001';
  END IF;
  IF p_guests_count IS NULL OR p_guests_count NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'INVALID_GUESTS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO reservations (
    type, room_unit_id, guest_name, guest_email, guest_phone,
    check_in_date, check_out_date, num_guests, guests_count, event_type,
    total_price, tourist_tax_amount, early_checkin_fee, late_checkout_fee, commission_rate,
    status, booking_source, special_requests,
    has_accommodation, has_menu, has_decor, has_music
  ) VALUES (
    'banquet', NULL, btrim(p_guest_name), '', btrim(p_guest_phone),
    p_event_date, p_event_date + 1, p_guests_count, p_guests_count, p_event_type,
    0, 0, 0, 0, 0,
    'UNPROCESSED', 'SITE', public.public_form_text(p_comment, 2000),
    false, false, false, false
  );
END $$;

-- ── Promotion application ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_promo_application(
  p_promotion_id UUID,
  p_guest_name   TEXT,
  p_guest_phone  TEXT,
  p_guest_email  TEXT DEFAULT NULL,
  p_comment      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  PERFORM public.public_form_check_contact(p_guest_name, p_guest_phone);
  SELECT title INTO v_title FROM promotions WHERE id = p_promotion_id AND is_active;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'INVALID_PROMOTION' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO promo_applications (promotion_id, promotion_title, guest_name, guest_phone, guest_email, comment, status)
  VALUES (p_promotion_id, v_title, btrim(p_guest_name), btrim(p_guest_phone),
          public.public_form_text(p_guest_email, 200), public.public_form_text(p_comment, 2000), 'new');
END $$;

-- ── Group booking request ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_group_request(
  p_guest_name  TEXT,
  p_guest_phone TEXT,
  p_check_in    DATE,
  p_check_out   DATE,
  p_num_guests  INT,
  p_guest_email TEXT DEFAULT NULL,
  p_wishes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.public_form_check_contact(p_guest_name, p_guest_phone);
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in
     OR p_check_in < (now() AT TIME ZONE 'Europe/Kyiv')::date THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = 'P0001';
  END IF;
  IF p_num_guests IS NULL OR p_num_guests NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'INVALID_GUESTS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO group_booking_requests (guest_name, guest_phone, guest_email, check_in, check_out, num_guests, wishes, status)
  VALUES (btrim(p_guest_name), btrim(p_guest_phone), public.public_form_text(p_guest_email, 200),
          p_check_in, p_check_out, p_num_guests, public.public_form_text(p_wishes, 2000), 'new');
END $$;

-- ── Permissions ───────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.create_public_booking(DATE, DATE, JSONB, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_banquet_request(TEXT, TEXT, DATE, TEXT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_promo_application(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_group_request(TEXT, TEXT, DATE, DATE, INT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_public_booking(DATE, DATE, JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_banquet_request(TEXT, TEXT, DATE, TEXT, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_promo_application(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_group_request(TEXT, TEXT, DATE, DATE, INT, TEXT, TEXT) TO anon, authenticated;
