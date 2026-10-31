-- =============================================================================
-- Hotel Continent — DEMO data
--
-- Fills the database with realistic but entirely fictional data so the admin
-- panel can be shown to clients. All dates are relative to "today" (Kyiv time),
-- so the calendar, dashboard and analytics always look live after a re-run.
--
-- ⚠️  Run ONLY against the separate demo Supabase project, never production.
--     demo.reseed() refuses to run if auth.users contains any account whose
--     email is not @example.com.
--
-- First run:  paste this whole file into the SQL Editor of the demo project
--             (or: psql "$DEMO_DB_URL" -f supabase/demo/seed-demo.sql)
-- Re-run:     SELECT demo.reseed();
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS demo;

-- ── Random helpers ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION demo.today() RETURNS DATE
LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'Europe/Kyiv')::date $$;

CREATE OR REPLACE FUNCTION demo.rint(lo INT, hi INT) RETURNS INT
LANGUAGE sql VOLATILE AS $$ SELECT lo + floor(random() * (hi - lo + 1))::int $$;

CREATE OR REPLACE FUNCTION demo.pick(arr TEXT[]) RETURNS TEXT
LANGUAGE sql VOLATILE AS $$ SELECT arr[1 + floor(random() * array_length(arr, 1))::int] $$;

CREATE OR REPLACE FUNCTION demo.guest_name() RETURNS TEXT
LANGUAGE sql VOLATILE AS $$
  SELECT demo.pick(ARRAY[
    'Олександр','Олена','Андрій','Марія','Тарас','Ірина','Дмитро','Юлія','Сергій','Наталія',
    'Василь','Оксана','Іван','Тетяна','Михайло','Світлана','Богдан','Ганна','Віктор','Катерина',
    'Роман','Людмила','Юрій','Анастасія','Петро','Софія','Максим','Вікторія','Назар','Христина'
  ]) || ' ' || demo.pick(ARRAY[
    'Шевченко','Бойко','Коваленко','Ткаченко','Кравченко','Олійник','Мельник','Поліщук','Савчук','Гнатюк',
    'Романюк','Лисенко','Марченко','Руденко','Павлюк','Дмитренко','Гуменюк','Онищенко','Федорчук','Ковальчук',
    'Тимошенко','Кушнір','Мороз','Бондар','Сидоренко','Гриценко','Левченко','Приходько','Яковенко','Зінченко'
  ])
$$;

CREATE OR REPLACE FUNCTION demo.phone() RETURNS TEXT
LANGUAGE sql VOLATILE AS $$
  SELECT '+380' || demo.pick(ARRAY['50','66','95','67','68','97','63','93','73'])
       || lpad(demo.rint(0, 9999999)::text, 7, '0')
$$;

CREATE OR REPLACE FUNCTION demo.email() RETURNS TEXT
LANGUAGE sql VOLATILE AS $$
  SELECT demo.pick(ARRAY['anna','oleh','ivan','maria','taras','iryna','dmytro','yulia','serhii',
                         'natalia','andrii','olha','roman','sofia','petro','kateryna'])
       || '.' || demo.pick(ARRAY['koval','melnyk','bondar','tkach','shevch','hnat','lysenko','moroz','savchuk'])
       || demo.rint(10, 99) || '@example.com'
$$;

-- ── Users ────────────────────────────────────────────────────────────────────
-- Creates the auth user (or reuses one created via the Dashboard with the same
-- email), resets its password and attaches role + profile.

CREATE OR REPLACE FUNCTION demo.upsert_user(
  p_email TEXT, p_name TEXT, p_role public.app_role, p_password TEXT,
  p_rate_manual NUMERIC DEFAULT 5, p_rate_site NUMERIC DEFAULT 3
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;

  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
      crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', p_name),
      now() - interval '200 days', now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  ELSE
    -- Someone may have changed the password during a demo — put it back.
    UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
    WHERE id = v_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (v_id, p_role, now() - interval '200 days');
  INSERT INTO public.profiles (user_id, full_name, commission_rate, commission_rate_manual, commission_rate_site)
  VALUES (v_id, p_name, p_rate_site, p_rate_manual, p_rate_site);

  RETURN v_id;
END $$;

-- ── One room reservation with derived price / tax / payments ────────────────

CREATE OR REPLACE FUNCTION demo.add_reservation(
  p_unit UUID, p_ci DATE, p_co DATE,
  p_status public.booking_status, p_source public.booking_source,
  p_guests INT, p_admin UUID,
  p_group UUID DEFAULT NULL, p_name TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL,
  p_promo UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_nights   INT := p_co - p_ci;
  v_settled  BOOLEAN := p_status IN ('CONFIRMED', 'CHECK_IN', 'CHECK_OUT');
  v_stayed   BOOLEAN := p_status IN ('CHECK_IN', 'CHECK_OUT');
  v_rate     NUMERIC;
  v_disc     NUMERIC := 0;
  v_total    NUMERIC;
  v_tax_rate NUMERIC;
  v_created  TIMESTAMPTZ;
  v_email    TEXT;
  v_id       UUID;
BEGIN
  SELECT COALESCE(gp.price_per_night, rt.base_price) INTO v_rate
  FROM room_units ru
  JOIN room_types rt ON rt.id = ru.room_type_id
  LEFT JOIN room_type_guest_prices gp ON gp.room_type_id = rt.id AND gp.guest_count = p_guests
  WHERE ru.id = p_unit;

  SELECT tourist_tax_rate INTO v_tax_rate FROM hotel_settings LIMIT 1;
  IF p_promo IS NOT NULL THEN
    SELECT discount_percent INTO v_disc FROM promotions WHERE id = p_promo;
  END IF;
  v_total := round(v_rate * v_nights * (1 - v_disc / 100));

  IF p_status = 'UNPROCESSED' THEN
    v_created := now() - random() * interval '3 days';
  ELSE
    v_created := ((p_ci - demo.rint(2, 45))::timestamp
                  + make_interval(hours => demo.rint(8, 22), mins => demo.rint(0, 59))) AT TIME ZONE 'Europe/Kyiv';
    IF v_created > now() THEN
      v_created := now() - random() * interval '4 days';
    END IF;
  END IF;

  IF random() < (CASE WHEN p_source = 'SITE' THEN 0.7 ELSE 0.3 END) THEN
    v_email := demo.email();
  END IF;

  INSERT INTO reservations (
    type, room_unit_id, guest_name, guest_email, guest_phone,
    check_in_date, check_out_date, num_guests, total_price, status,
    special_requests, admin_notes, booking_source,
    created_by_admin_id, confirmed_by_admin_id, assigned_admin_id, commission_rate,
    deposit_amount, payment_method, tourist_tax_amount, early_checkin_fee, late_checkout_fee,
    booking_group_id, promotion_id, discount_percent, created_at, updated_at
  ) VALUES (
    'room', p_unit, COALESCE(p_name, demo.guest_name()), v_email, COALESCE(p_phone, demo.phone()),
    p_ci, p_co, p_guests, v_total, p_status,
    CASE WHEN random() < 0.25 THEN demo.pick(ARRAY[
      'Номер з видом на гори, якщо можливо',
      'Потрібне дитяче ліжечко',
      'Пізній заїзд, орієнтовно о 22:00',
      'Тихий номер, подалі від ліфта',
      'Святкуємо річницю — будемо вдячні за невеликий комплімент',
      'Потрібне паркомісце для мікроавтобуса',
      'Алергія на пір''я — гіпоалергенні подушки, будь ласка',
      'Чи можливий трансфер з Ужгорода?'
    ]) END,
    CASE WHEN random() < 0.15 THEN demo.pick(ARRAY[
      'Постійний гість',
      'Передоплата на картку',
      'Перенесли дати на прохання гостя',
      'Зателефонувати за день до заїзду',
      'Знижку погоджено з керуючим'
    ]) END,
    p_source,
    CASE WHEN p_source = 'ADMIN' THEN p_admin END,
    CASE WHEN v_settled THEN p_admin END,
    CASE WHEN p_status <> 'UNPROCESSED' THEN p_admin END,
    CASE WHEN p_source = 'ADMIN' THEN 5 ELSE 3 END,
    CASE WHEN v_settled AND random() < 0.7 THEN round(v_total * 0.3, -2) END,
    CASE WHEN v_stayed THEN CASE WHEN random() < 0.45 THEN 'cash' ELSE 'card' END END,
    v_tax_rate * p_guests * v_nights,
    CASE WHEN v_stayed AND random() < 0.07 THEN 500 ELSE 0 END,
    CASE WHEN v_stayed AND random() < 0.07 THEN 500 ELSE 0 END,
    p_group, p_promo, v_disc, v_created, v_created
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- ── Room assignments + guest names for a group booking ──────────────────────

CREATE OR REPLACE FUNCTION demo.fill_group_assignments(p_group UUID, p_with_names BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  g     RECORD;
  u     RECORD;
  i     INT := 0;
  base  INT;
  rem   INT;
  n     INT;
BEGIN
  SELECT * INTO g FROM group_bookings WHERE id = p_group;
  base := g.num_guests / array_length(g.room_unit_ids, 1);
  rem  := g.num_guests % array_length(g.room_unit_ids, 1);

  FOR u IN
    SELECT ru.id, rt.max_guests
    FROM room_units ru JOIN room_types rt ON rt.id = ru.room_type_id
    WHERE ru.id = ANY (g.room_unit_ids)
    ORDER BY ru.room_number
  LOOP
    n := LEAST(base + CASE WHEN i < rem THEN 1 ELSE 0 END, u.max_guests);
    INSERT INTO group_booking_room_assignments (group_booking_id, room_unit_id, guest_names)
    VALUES (
      p_group, u.id,
      ARRAY(SELECT CASE WHEN p_with_names AND s <= n THEN demo.guest_name() ELSE '' END
            FROM generate_series(1, u.max_guests) s)
    );
    i := i + 1;
  END LOOP;
END $$;

-- ── Main entry point ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION demo.reseed() RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c_password CONSTANT TEXT := 'Demo2026!';
  v_today    CONSTANT DATE := demo.today();

  u_owner UUID; u_super UUID; u_olena UUID; u_andrii UUID; u_viewer UUID;
  v_admins UUID[];

  t_std UUID; t_dlx UUID; t_fam UUID; t_exe UUID; t_pre UUID;
  p_early UUID; p_week UUID; p_thermal UUID;
  c_full UUID; c_breakfast UUID; c_school UUID;
  g_id UUID;

  u        RECORD;
  r_res    RECORD;
  r        FLOAT;
  i        INT;
  v_cursor DATE;
  v_end    DATE;
  v_ci     DATE;
  v_co     DATE;
  v_block  DATE;
  v_gap    INT;
  v_nights INT;
  v_guests INT;
  v_status public.booking_status;
  v_source public.booking_source;
  v_promo  UUID;
  v_place  TEXT;
  v_id_card BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email NOT LIKE '%@example.com') THEN
    RAISE EXCEPTION 'demo.reseed(): auth.users contains non-demo accounts — this does not look like the demo project. Aborting.';
  END IF;

  PERFORM setseed(0.42);

  TRUNCATE guest_forms, group_booking_room_assignments, group_bookings,
           group_calculation_services, group_calculations, promo_applications,
           reservations, promotions, group_booking_requests, audit_log,
           room_type_guest_prices, room_media, room_units, room_types,
           hotel_settings, profiles, user_roles;

  -- ── Hotel ─────────────────────────────────────────────────────────────────
  INSERT INTO hotel_settings (
    hotel_name, hotel_tagline, hotel_description, email, phone, address, address_uk,
    check_in_time, check_out_time, currency, tourist_tax_rate, extra_capacity
  ) VALUES (
    'Hotel Continent', 'Experience Luxury Redefined',
    'A premier destination for discerning travelers seeking exceptional comfort and world-class service in the heart of the Carpathians.',
    'continent2005@ukr.net', '+380 (50) 705 5000',
    'Ukraine, Zakarpattia Oblast, Polyana, 59 Soniachna St.',
    'Україна, Закарпатська обл., с. Поляна, вул. Сонячна, 59',
    '14:00', '12:00', 'UAH', 41.5, 4
  );

  -- ── Staff accounts (password for all: c_password) ─────────────────────────
  u_owner  := demo.upsert_user('owner@example.com',  'Михайло Власенко', 'owner',       c_password);
  u_super  := demo.upsert_user('admin@example.com',  'Наталія Гриценко', 'super_admin', c_password);
  u_olena  := demo.upsert_user('olena@example.com',  'Олена Коваль',     'admin',       c_password, 5, 3);
  u_andrii := demo.upsert_user('andrii@example.com', 'Андрій Мельник',   'admin',       c_password, 4, 2.5);
  u_viewer := demo.upsert_user('viewer@example.com', 'Ірина Бондар',     'viewer',      c_password);
  v_admins := ARRAY[u_olena, u_olena, u_andrii, u_andrii, u_super];

  -- ── Room types ────────────────────────────────────────────────────────────
  INSERT INTO room_types (name, name_uk, slug, short_description, short_description_uk, description, description_uk,
                          base_price, max_guests, size_sqm, bed_type, amenities, amenities_uk, sort_order)
  VALUES ('Standard Room', 'Стандартний номер', 'standard-room',
          'Cosy and well-equipped room perfect for short stays or weekend getaways in the Carpathians.',
          'Затишний та добре обладнаний номер, ідеальний для короткого відпочинку або поїздки вихідного дня в Карпатах.',
          'A comfortable and well-appointed standard room offering everything you need for a pleasant stay.',
          'Комфортний та добре оснащений стандартний номер, що пропонує все необхідне для приємного перебування.',
          1800, 2, 22, 'Double Bed',
          ARRAY['Free WiFi','Flat-Screen TV','Private Bathroom','Work Desk','Mini-Fridge','Hairdryer'],
          ARRAY['Безкоштовний WiFi','Телевізор','Власна ванна кімната','Письмовий стіл','Міні-холодильник','Фен'], 0)
  RETURNING id INTO t_std;

  INSERT INTO room_types (name, name_uk, slug, short_description, short_description_uk, description, description_uk,
                          base_price, max_guests, size_sqm, bed_type, amenities, amenities_uk, sort_order)
  VALUES ('Deluxe Room', 'Люкс Делюкс', 'deluxe-room',
          'Elegant comfort with modern amenities', 'Елегантний комфорт із сучасними зручностями',
          'Our Deluxe Room offers a perfect blend of comfort and elegance.',
          'Номер «Делюкс» пропонує ідеальне поєднання комфорту та елегантності.',
          2600, 2, 32, 'King',
          ARRAY['Free WiFi','Air Conditioning','Mini Bar','Smart TV','Safe','Mountain View'],
          ARRAY['Безкоштовний WiFi','Кондиціонер','Міні-бар','Смарт-ТВ','Сейф','Вид на гори'], 1)
  RETURNING id INTO t_dlx;

  INSERT INTO room_types (name, name_uk, slug, short_description, short_description_uk, description, description_uk,
                          base_price, max_guests, size_sqm, bed_type, amenities, amenities_uk, sort_order)
  VALUES ('Family Room', 'Сімейний номер', 'family-room',
          'Spacious accommodation for families', 'Просторе розміщення для сімей',
          'Perfect for families traveling together, with comfortable bedding for up to four guests.',
          'Ідеальний варіант для сімей — просторий номер з комфортними ліжками для чотирьох гостей.',
          3400, 4, 45, 'Double + Sofa',
          ARRAY['Free WiFi','Air Conditioning','Smart TV','Safe','Extra Beds Available'],
          ARRAY['Безкоштовний WiFi','Кондиціонер','Смарт-ТВ','Сейф','Додаткові ліжка'], 2)
  RETURNING id INTO t_fam;

  INSERT INTO room_types (name, name_uk, slug, short_description, short_description_uk, description, description_uk,
                          base_price, max_guests, size_sqm, bed_type, amenities, amenities_uk, sort_order)
  VALUES ('Executive Suite', 'Представницький люкс', 'executive-suite',
          'Spacious suite with separate living area', 'Просторий люкс з окремою вітальнею',
          'Designed for guests who appreciate extra space, with a separate living area and premium furnishings.',
          'Створений для гостей, які цінують простір: окрема вітальня та преміальні меблі.',
          3900, 3, 55, 'King',
          ARRAY['Free WiFi','Air Conditioning','Mini Bar','Smart TV','Living Area','Espresso Machine'],
          ARRAY['Безкоштовний WiFi','Кондиціонер','Міні-бар','Смарт-ТВ','Вітальня','Кавова машина'], 3)
  RETURNING id INTO t_exe;

  INSERT INTO room_types (name, name_uk, slug, short_description, short_description_uk, description, description_uk,
                          base_price, max_guests, size_sqm, bed_type, amenities, amenities_uk, sort_order)
  VALUES ('Presidential Suite', 'Президентський люкс', 'presidential-suite',
          'Ultimate luxury with panoramic views', 'Найвища розкіш із панорамним краєвидом',
          'Our most luxurious accommodation with panoramic views and a private jacuzzi.',
          'Наш найрозкішніший номер з панорамним видом та власним джакузі.',
          6500, 4, 90, 'King',
          ARRAY['Free WiFi','Air Conditioning','Mini Bar','Smart TV','Living Area','Jacuzzi','Panoramic Views'],
          ARRAY['Безкоштовний WiFi','Кондиціонер','Міні-бар','Смарт-ТВ','Вітальня','Джакузі','Панорамний вид'], 4)
  RETURNING id INTO t_pre;

  INSERT INTO room_type_guest_prices (room_type_id, guest_count, price_per_night) VALUES
    (t_std, 1, 1500), (t_std, 2, 1800),
    (t_dlx, 1, 2200), (t_dlx, 2, 2600),
    (t_fam, 2, 2800), (t_fam, 3, 3100), (t_fam, 4, 3400),
    (t_exe, 1, 3400), (t_exe, 2, 3900), (t_exe, 3, 4300),
    (t_pre, 2, 5800), (t_pre, 3, 6200), (t_pre, 4, 6500);

  -- ── Room units ────────────────────────────────────────────────────────────
  INSERT INTO room_units (room_type_id, room_number, floor, bed_config,
                          extra_accommodation_enabled, extra_accommodation_max, cleanliness_status, notes)
  SELECT CASE v.k WHEN 'std' THEN t_std WHEN 'dlx' THEN t_dlx WHEN 'fam' THEN t_fam
                  WHEN 'exe' THEN t_exe ELSE t_pre END,
         v.num, v.fl, v.bed, v.extra, v.extra_max, v.cl, v.note
  FROM (VALUES
    ('std', 'S01', 1, 'double_bed',      false, 0, 'clean',            NULL),
    ('std', 'S02', 1, 'twin_beds',       false, 0, 'clean',            NULL),
    ('std', 'S03', 1, 'double_bed',      false, 0, 'clean',            NULL),
    ('std', 'S04', 1, 'twin_beds',       false, 0, 'clean',            NULL),
    ('std', 'S05', 2, 'double_bed',      false, 0, 'clean',            NULL),
    ('std', 'S06', 2, 'twin_beds',       false, 0, 'clean',            NULL),
    ('std', 'S07', 2, 'double_bed',      false, 0, 'clean',            NULL),
    ('std', 'S08', 2, 'twin_beds',       false, 0, 'under_renovation', 'Заміна сантехніки у ванній'),
    ('dlx', '101', 1, 'double_bed',      false, 0, 'clean',            NULL),
    ('dlx', '102', 1, 'double_bed',      false, 0, 'clean',            NULL),
    ('dlx', '103', 1, 'twin_beds',       false, 0, 'clean',            NULL),
    ('dlx', '201', 2, 'double_bed',      false, 0, 'clean',            'Балкон з видом на гори'),
    ('dlx', '202', 2, 'double_bed',      false, 0, 'clean',            NULL),
    ('exe', '301', 3, 'double_bed_sofa', true,  1, 'clean',            NULL),
    ('exe', '302', 3, 'double_bed_sofa', true,  1, 'clean',            NULL),
    ('fam', '401', 4, 'double_bed_sofa', true,  1, 'clean',            NULL),
    ('fam', '402', 4, 'quad_single',     true,  1, 'clean',            NULL),
    ('pre', '501', 5, 'double_bed_sofa', true,  2, 'clean',            'Джакузі — перевіряти щодня')
  ) AS v(k, num, fl, bed, extra, extra_max, cl, note);

  -- ── Promotions ────────────────────────────────────────────────────────────
  INSERT INTO promotions (title, title_uk, description, description_uk, badge, badge_uk,
                          highlights, highlights_uk, discount_percent, valid_from, valid_to, is_active, sort_order)
  VALUES ('Early Booking', 'Раннє бронювання',
          'Book 30 days before arrival and save 10% on your stay.',
          'Бронюйте за 30 днів до заїзду та отримайте знижку 10% на проживання.',
          '-10%', '-10%',
          ARRAY['10% off all rooms','Free cancellation up to 14 days','Free breakfast for kids under 6'],
          ARRAY['Знижка 10% на всі номери','Безкоштовне скасування за 14 днів','Сніданок у подарунок дітям до 6 років'],
          10, v_today - 60, v_today + 120, true, 0)
  RETURNING id INTO p_early;

  INSERT INTO promotions (title, title_uk, description, description_uk, badge, badge_uk,
                          highlights, highlights_uk, discount_percent, valid_from, valid_to, is_active, sort_order)
  VALUES ('A Week in the Carpathians', 'Тиждень у Карпатах',
          'Stay 7 nights for the price of 6. Thermal pool access included.',
          'Проживання 7 ночей за ціною 6. Доступ до термального басейну включено.',
          '7 = 6', '7 = 6',
          ARRAY['7 nights for the price of 6','Thermal pool included','Late checkout until 14:00'],
          ARRAY['7 ночей за ціною 6','Термальний басейн включено','Пізній виїзд до 14:00'],
          14, v_today - 120, v_today + 120, true, 1)
  RETURNING id INTO p_week;

  INSERT INTO promotions (title, title_uk, description, description_uk, badge, badge_uk,
                          highlights, highlights_uk, discount_percent, valid_from, valid_to, is_active, sort_order)
  VALUES ('Thermal Weekend', 'Термальні вихідні',
          'Friday to Sunday with unlimited thermal pool and sauna.',
          'З п''ятниці до неділі з необмеженим доступом до термального басейну та сауни.',
          'Weekend', 'Вихідні',
          ARRAY['2 nights','Unlimited sauna','Welcome drink'],
          ARRAY['2 ночі','Необмежена сауна','Вітальний напій'],
          5, v_today - 200, v_today - 60, false, 2)
  RETURNING id INTO p_thermal;

  -- ── Group calculations ────────────────────────────────────────────────────
  INSERT INTO group_calculations (name, price_per_person_per_night, created_by_admin_id)
  VALUES ('Повний пансіон', 1350, u_super) RETURNING id INTO c_full;
  INSERT INTO group_calculation_services (calculation_id, service_name, cost) VALUES
    (c_full, 'Сніданок', 250), (c_full, 'Обід', 350), (c_full, 'Вечеря', 400);

  INSERT INTO group_calculations (name, price_per_person_per_night, created_by_admin_id)
  VALUES ('Сніданок включено', 950, u_super) RETURNING id INTO c_breakfast;
  INSERT INTO group_calculation_services (calculation_id, service_name, cost) VALUES
    (c_breakfast, 'Сніданок', 250);

  INSERT INTO group_calculations (name, price_per_person_per_night, created_by_admin_id)
  VALUES ('Шкільна група', 780, u_olena) RETURNING id INTO c_school;
  INSERT INTO group_calculation_services (calculation_id, service_name, cost) VALUES
    (c_school, 'Сніданок', 200), (c_school, 'Вечеря', 300), (c_school, 'Екскурсія', NULL);

  -- ── Group bookings (placed before regular bookings so the walk avoids them) ─
  INSERT INTO group_bookings (booking_name, contact_person, phone, num_guests, room_unit_ids,
                              check_in_date, check_out_date, status, admin_notes, calculation_id,
                              total_price, deposit_amount, created_by_admin_id, created_at)
  VALUES ('ТОВ «Карпати-Агро» — корпоратив', 'Василь Гуцуляк', demo.phone(), 12,
          ARRAY(SELECT id FROM room_units WHERE room_number IN ('S01','S02','S03','S04','S05','S06') ORDER BY room_number),
          v_today - 40, v_today - 37, 'CHECK_OUT', 'Оплата за рахунком (безготівка)', c_full,
          12 * 3 * 1350, 15000, u_olena, now() - interval '75 days')
  RETURNING id INTO g_id;
  PERFORM demo.fill_group_assignments(g_id, true);

  INSERT INTO group_bookings (booking_name, contact_person, phone, num_guests, room_unit_ids,
                              check_in_date, check_out_date, status, admin_notes, calculation_id,
                              total_price, deposit_amount, created_by_admin_id, created_at)
  VALUES ('Ліцей №3, м. Ужгород — екскурсія', 'Тетяна Гуменюк', demo.phone(), 10,
          ARRAY(SELECT id FROM room_units WHERE room_number IN ('S01','S02','S03','S04','S05') ORDER BY room_number),
          v_today - 1, v_today + 2, 'CHECK_IN', '2 супровідники, 8 учнів. Вечеря о 19:00', c_school,
          10 * 3 * 780, 10000, u_andrii, now() - interval '30 days')
  RETURNING id INTO g_id;
  PERFORM demo.fill_group_assignments(g_id, true);

  INSERT INTO group_bookings (booking_name, contact_person, phone, num_guests, room_unit_ids,
                              check_in_date, check_out_date, status, admin_notes, calculation_id,
                              total_price, deposit_amount, created_by_admin_id, created_at)
  VALUES ('Весілля Петренко — гості', 'Ольга Петренко', demo.phone(), 8,
          ARRAY(SELECT id FROM room_units WHERE room_number IN ('101','102','103','201') ORDER BY room_number),
          v_today + 18, v_today + 20, 'CONFIRMED', 'Гості весілля, банкет окремо', c_breakfast,
          8 * 2 * 950, 5000, u_super, now() - interval '12 days')
  RETURNING id INTO g_id;
  PERFORM demo.fill_group_assignments(g_id, true);

  INSERT INTO group_bookings (booking_name, contact_person, phone, num_guests, room_unit_ids,
                              check_in_date, check_out_date, status, admin_notes, calculation_id,
                              total_price, created_by_admin_id, created_at)
  VALUES ('ФК «Говерла» U-17 — збори', 'Ігор Савчук', demo.phone(), 14,
          ARRAY(SELECT id FROM room_units WHERE room_number IN ('S01','S02','S03','S04','S05','S06','S07') ORDER BY room_number),
          v_today + 33, v_today + 37, 'PENDING', 'Чекаємо підтвердження від клубу', c_full,
          14 * 4 * 1350, u_olena, now() - interval '2 days')
  RETURNING id INTO g_id;
  PERFORM demo.fill_group_assignments(g_id, false);

  -- ── Multi-room regular bookings (booking_group_id) ────────────────────────
  g_id := gen_random_uuid();
  PERFORM demo.add_reservation((SELECT id FROM room_units WHERE room_number = '102'), v_today - 20, v_today - 17,
                               'CHECK_OUT', 'SITE', 2, u_olena, g_id, 'Роман Левченко', '+380671234501');
  PERFORM demo.add_reservation((SELECT id FROM room_units WHERE room_number = '103'), v_today - 20, v_today - 17,
                               'CHECK_OUT', 'SITE', 2, u_olena, g_id, 'Роман Левченко', '+380671234501');

  g_id := gen_random_uuid();
  PERFORM demo.add_reservation((SELECT id FROM room_units WHERE room_number = '401'), v_today + 8, v_today + 12,
                               'CONFIRMED', 'ADMIN', 4, u_andrii, g_id, 'Світлана Приходько', '+380501234502', p_early);
  PERFORM demo.add_reservation((SELECT id FROM room_units WHERE room_number = '402'), v_today + 8, v_today + 12,
                               'CONFIRMED', 'ADMIN', 3, u_andrii, g_id, 'Світлана Приходько', '+380501234502', p_early);

  -- ── Regular bookings: walk each room's timeline, ~5.5 months back, ~2.5 ahead ─
  -- Keep the total under ~950 rows: PostgREST caps responses at 1000 rows and
  -- the bookings list / dashboard fetch reservations without pagination.
  FOR u IN
    SELECT ru.id, ru.cleanliness_status, rt.max_guests
    FROM room_units ru JOIN room_types rt ON rt.id = ru.room_type_id
    ORDER BY ru.room_number
  LOOP
    v_cursor := v_today - 165;
    v_end    := CASE WHEN u.cleanliness_status = 'under_renovation' THEN v_today - 12 ELSE v_today + 75 END;

    LOOP
      r := random();
      v_gap := CASE WHEN r < 0.42 THEN 0 WHEN r < 0.70 THEN 1 WHEN r < 0.90 THEN demo.rint(2, 3) ELSE demo.rint(4, 6) END;
      -- Far-future calendar is naturally emptier.
      IF v_cursor > v_today + 21 THEN v_gap := v_gap + demo.rint(0, 6);  END IF;
      IF v_cursor > v_today + 45 THEN v_gap := v_gap + demo.rint(3, 12); END IF;

      r := random();
      v_nights := CASE WHEN r < 0.25 THEN 1 WHEN r < 0.55 THEN 2 WHEN r < 0.75 THEN 3
                       WHEN r < 0.88 THEN 4 WHEN r < 0.95 THEN 5 ELSE demo.rint(6, 8) END;
      v_ci := v_cursor + v_gap;
      v_co := v_ci + v_nights;
      EXIT WHEN v_co > v_end;

      SELECT max(e) INTO v_block FROM (
        SELECT check_out_date AS e FROM reservations
        WHERE room_unit_id = u.id AND check_in_date < v_co AND check_out_date > v_ci
        UNION ALL
        SELECT gb.check_out_date FROM group_booking_room_assignments a
        JOIN group_bookings gb ON gb.id = a.group_booking_id
        WHERE a.room_unit_id = u.id AND gb.check_in_date < v_co AND gb.check_out_date > v_ci
      ) x;
      IF v_block IS NOT NULL THEN
        v_cursor := v_block;
        CONTINUE;
      END IF;

      r := random();
      IF v_co < v_today THEN
        v_status := (CASE WHEN r < 0.05 THEN 'CANCELLED' WHEN r < 0.08 THEN 'DECLINED' ELSE 'CHECK_OUT' END)::public.booking_status;
      ELSIF v_ci < v_today THEN
        v_status := 'CHECK_IN';
      ELSIF v_ci = v_today THEN
        v_status := 'CONFIRMED';
      ELSE
        v_status := (CASE WHEN r < 0.07 THEN 'UNPROCESSED' WHEN r < 0.27 THEN 'PENDING'
                          WHEN r < 0.93 THEN 'CONFIRMED' ELSE 'CANCELLED' END)::public.booking_status;
      END IF;

      v_source := (CASE WHEN v_status = 'UNPROCESSED' OR random() < 0.55 THEN 'SITE' ELSE 'ADMIN' END)::public.booking_source;
      v_guests := CASE WHEN random() < 0.2 THEN demo.rint(1, u.max_guests)
                       ELSE LEAST(u.max_guests, 2 + demo.rint(0, GREATEST(u.max_guests - 2, 0))) END;
      v_promo := CASE
                   WHEN v_nights >= 7 AND random() < 0.6 THEN p_week
                   WHEN v_ci BETWEEN v_today - 60 AND v_today + 120 AND random() < 0.12 THEN p_early
                 END;

      PERFORM demo.add_reservation(u.id, v_ci, v_co, v_status, v_source, v_guests,
                                   v_admins[demo.rint(1, array_length(v_admins, 1))],
                                   NULL, NULL, NULL, v_promo);
      v_cursor := v_co;
    END LOOP;
  END LOOP;

  -- ── Guest check-in forms (current guests + half of last month's) ─────────
  FOR r_res IN
    SELECT * FROM reservations
    WHERE type = 'room'
      AND (status = 'CHECK_IN' OR (status = 'CHECK_OUT' AND check_out_date >= v_today - 30))
    ORDER BY check_in_date
  LOOP
    CONTINUE WHEN r_res.status = 'CHECK_OUT' AND random() < 0.5;
    v_place := demo.pick(ARRAY[
      'Закарпатська|Ужгород', 'Закарпатська|Мукачево', 'Львівська|Львів', 'Київська|Бровари',
      'Київ|Київ', 'Івано-Франківська|Івано-Франківськ', 'Тернопільська|Тернопіль',
      'Хмельницька|Хмельницький', 'Вінницька|Вінниця', 'Дніпропетровська|Дніпро'
    ]);
    FOR i IN 1 .. r_res.num_guests LOOP
      v_id_card := random() < 0.6;
      INSERT INTO guest_forms (
        reservation_id, guest_index, full_name, date_of_birth, country_of_residence, region,
        village_city, street_house_apartment, passport_series, issued_by, ubk, ubk_discount_applied,
        phone_number, vehicle_number, created_by_admin_id, created_at
      ) VALUES (
        r_res.id, i,
        CASE WHEN i = 1 THEN r_res.guest_name ELSE demo.guest_name() END,
        CASE WHEN i > 2 THEN v_today - (demo.rint(4, 15) * 365 + demo.rint(0, 364))
                        ELSE v_today - (demo.rint(20, 70) * 365 + demo.rint(0, 364)) END,
        'Україна',
        split_part(v_place, '|', 1) || CASE WHEN split_part(v_place, '|', 1) = 'Київ' THEN '' ELSE ' обл.' END,
        split_part(v_place, '|', 2),
        CASE WHEN i = 1 THEN 'вул. ' || demo.pick(ARRAY['Шевченка','Грушевського','Івана Франка','Лесі Українки','Незалежності','Корятовича','Миру'])
                             || ', ' || demo.rint(1, 120) || ', кв. ' || demo.rint(1, 90) END,
        CASE WHEN i > 2 THEN NULL
             WHEN v_id_card THEN lpad(demo.rint(0, 999999999)::text, 9, '0')
             ELSE demo.pick(ARRAY['ВО','КА','СН','МЕ','ТТ','ЕР']) || ' ' || lpad(demo.rint(0, 999999)::text, 6, '0') END,
        CASE WHEN i > 2 THEN NULL
             WHEN v_id_card THEN demo.rint(1000, 8099)::text
             ELSE demo.pick(ARRAY['Ужгородським МВ УМВС України', 'Мукачівським РВ УМВС України',
                                  'Шевченківським РВ ГУ ДМС у м. Києві', 'Галицьким РВ ГУ ДМС у Львівській обл.']) END,
        CASE WHEN i = 1 AND random() < 0.05 THEN 'УБД ' || lpad(demo.rint(0, 999999)::text, 6, '0') END,
        false,
        CASE WHEN i = 1 THEN r_res.guest_phone END,
        CASE WHEN i = 1 AND random() < 0.4 THEN
          demo.pick(ARRAY['AO','AA','BC','KA','AT','BO']) || ' ' || lpad(demo.rint(0, 9999)::text, 4, '0') || ' '
          || demo.pick(ARRAY['AB','BX','KI','EM','HO','TC']) END,
        r_res.assigned_admin_id,
        (r_res.check_in_date::timestamp + interval '14 hours 20 minutes') AT TIME ZONE 'Europe/Kyiv'
      );
    END LOOP;
  END LOOP;
  UPDATE guest_forms SET ubk_discount_applied = true WHERE ubk IS NOT NULL;

  -- ── Banquets ──────────────────────────────────────────────────────────────
  INSERT INTO reservations (type, room_unit_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date,
                            num_guests, guests_count, event_type, total_price, deposit_amount, payment_method, status,
                            booking_source, special_requests, admin_notes, budget,
                            has_accommodation, has_menu, has_decor, has_music,
                            commission_rate, assigned_admin_id, confirmed_by_admin_id, created_at, updated_at)
  VALUES
    ('banquet', NULL, 'Анастасія Зінченко', '', demo.phone(), v_today + 75, v_today + 76,
     80, 80, 'wedding', 0, NULL, NULL, 'UNPROCESSED', 'SITE',
     'Весілля на 80 гостей, хочемо виїзну церемонію на терасі', NULL, '150 000 – 200 000 грн',
     false, false, false, false, 0, NULL, NULL, now() - interval '5 hours', now() - interval '5 hours'),
    ('banquet', NULL, 'Максим Яковенко', '', demo.phone(), v_today + 12, v_today + 13,
     25, 25, 'birthday', 0, NULL, NULL, 'UNPROCESSED', 'SITE',
     'Ювілей 50 років, потрібен караоке', NULL, NULL,
     false, false, false, false, 0, NULL, NULL, now() - interval '1 day 3 hours', now() - interval '1 day 3 hours'),
    ('banquet', NULL, 'Вікторія Левченко', '', demo.phone(), v_today + 40, v_today + 41,
     45, 45, 'corporate', 0, NULL, NULL, 'UNPROCESSED', 'SITE',
     'Новорічний корпоратив IT-компанії', NULL, '60 000 – 80 000 грн',
     false, false, false, false, 0, NULL, NULL, now() - interval '40 minutes', now() - interval '40 minutes'),
    ('banquet', NULL, 'Христина Павлюк', NULL, demo.phone(), v_today + 9, v_today + 10,
     30, 30, 'christening', 36000, NULL, NULL, 'PENDING', 'ADMIN',
     'Хрестини, 6 дітей до 7 років', 'Узгодити дитяче меню', NULL,
     false, true, true, false, 5, u_olena, NULL, now() - interval '6 days', now() - interval '6 days'),
    ('banquet', NULL, 'Петро Онищенко', NULL, demo.phone(), v_today + 21, v_today + 22,
     40, 40, 'anniversary', 64000, 20000, 'card', 'CONFIRMED', 'ADMIN',
     '30 років спільного життя', 'Живий музикант з 19:00', '60 000 – 70 000 грн',
     false, true, true, true, 5, u_super, u_super, now() - interval '18 days', now() - interval '18 days'),
    ('banquet', NULL, 'Юрій Федорчук', 'yurii.fed@example.com', demo.phone(), v_today + 5, v_today + 6,
     60, 60, 'conference', 42000, 15000, 'card', 'CONFIRMED', 'SITE',
     'Конференція фармкомпанії: проєктор, мікрофони, кава-брейк x2', 'Частина гостей з проживанням', NULL,
     true, true, false, false, 3, u_andrii, u_andrii, now() - interval '25 days', now() - interval '25 days'),
    ('banquet', NULL, 'Катерина Руденко', NULL, demo.phone(), v_today - 25, v_today - 24,
     95, 95, 'wedding', 210000, 60000, 'card', 'CHECK_OUT', 'ADMIN',
     'Весілля, жива музика та феєрверк', 'Все пройшло чудово, гості задоволені', '200 000+ грн',
     true, true, true, true, 5, u_super, u_super, now() - interval '90 days', now() - interval '24 days'),
    ('banquet', NULL, 'Назар Кушнір', NULL, demo.phone(), v_today - 9, v_today - 8,
     20, 20, 'kids_party', 18500, NULL, 'cash', 'CHECK_OUT', 'SITE',
     'День народження доньки, 7 років, аніматор', NULL, NULL,
     false, true, true, false, 3, u_olena, u_olena, now() - interval '30 days', now() - interval '8 days');

  -- ── Promo applications from the website ───────────────────────────────────
  INSERT INTO promo_applications (promotion_id, promotion_title, guest_name, guest_phone, guest_email,
                                  comment, status, admin_feedback, created_at, updated_at)
  VALUES
    (p_early, 'Early Booking', 'Ганна Марченко', demo.phone(), demo.email(),
     'Цікавить сімейний номер на новорічні свята', 'new', NULL, now() - interval '2 hours', now() - interval '2 hours'),
    (p_week, 'A Week in the Carpathians', 'Богдан Сидоренко', demo.phone(), NULL,
     'Двоє дорослих, з 1 по 8 число наступного місяця', 'new', NULL, now() - interval '20 hours', now() - interval '20 hours'),
    (p_early, 'Early Booking', 'Людмила Тимошенко', demo.phone(), demo.email(),
     NULL, 'in_progress', 'Надіслали варіанти номерів у Viber', now() - interval '3 days', now() - interval '2 days'),
    (p_week, 'A Week in the Carpathians', 'Віктор Кравченко', demo.phone(), demo.email(),
     'Чи можна з собакою?', 'in_progress', 'Уточнюємо умови для тварин', now() - interval '4 days', now() - interval '3 days'),
    (p_early, 'Early Booking', 'Софія Бойко', demo.phone(), NULL,
     NULL, 'resolved', 'Оформлено бронювання, номер 201', now() - interval '12 days', now() - interval '11 days'),
    (p_thermal, 'Thermal Weekend', 'Олександр Лисенко', demo.phone(), demo.email(),
     'На найближчі вихідні', 'declined', 'Акція завершилась, запропонували раннє бронювання', now() - interval '70 days', now() - interval '69 days');

  -- ── Group booking requests from the website ───────────────────────────────
  INSERT INTO group_booking_requests (guest_name, guest_phone, guest_email, check_in, check_out, num_guests,
                                      wishes, status, admin_notes, created_at, updated_at)
  VALUES
    ('Дмитро Ткаченко', demo.phone(), demo.email(), v_today + 50, v_today + 53, 22,
     'Туристичний клуб, потрібен ранній сніданок о 6:30', 'new', NULL, now() - interval '3 hours', now() - interval '3 hours'),
    ('Оксана Гнатюк', demo.phone(), NULL, v_today + 64, v_today + 66, 15,
     'Хор, потрібна зала для репетицій', 'new', NULL, now() - interval '1 day', now() - interval '1 day'),
    ('Сергій Олійник', demo.phone(), demo.email(), v_today + 28, v_today + 31, 30,
     'Корпоративний тімбілдинг, квадроцикли', 'in_progress', 'Готуємо комерційну пропозицію', now() - interval '5 days', now() - interval '4 days'),
    ('Ігор Савчук', demo.phone(), demo.email(), v_today + 33, v_today + 37, 14,
     'Футбольна команда U-17 + 2 тренери', 'resolved', 'Створено групове бронювання', now() - interval '9 days', now() - interval '2 days'),
    ('Марія Ковальчук', demo.phone(), NULL, v_today - 5, v_today - 2, 40,
     'Весілля, потрібні всі номери', 'declined', 'На ці дати немає вільних номерів', now() - interval '40 days', now() - interval '39 days');

  -- ── Finishing touches ─────────────────────────────────────────────────────
  UPDATE room_units SET cleanliness_status = 'dirty'
  WHERE cleanliness_status = 'clean'
    AND id IN (SELECT room_unit_id FROM reservations WHERE status = 'CHECK_OUT' AND check_out_date >= v_today - 1);

  UPDATE hotel_settings SET total_capacity = extra_capacity + (
    SELECT sum(rt.max_guests) FROM room_units ru JOIN room_types rt ON rt.id = ru.room_type_id WHERE ru.is_active
  );

  RETURN format('Demo data ready: %s room bookings, %s banquets, %s group bookings, %s guest forms (today = %s)',
    (SELECT count(*) FROM reservations WHERE type = 'room'),
    (SELECT count(*) FROM reservations WHERE type = 'banquet'),
    (SELECT count(*) FROM group_bookings),
    (SELECT count(*) FROM guest_forms),
    v_today);
END $$;

-- Not callable through the API — only from the SQL Editor / psql / pg_cron.
REVOKE ALL ON SCHEMA demo FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA demo FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON SCHEMA demo FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA demo FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

SELECT demo.reseed();

-- ── Optional: reset the demo every night at 03:00 Kyiv time ─────────────────
-- Enable the pg_cron extension (Dashboard → Database → Extensions), then run:
--
--   SELECT cron.schedule('demo-nightly-reset', '0 1 * * *', 'SELECT demo.reseed()');
