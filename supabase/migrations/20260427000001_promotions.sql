-- Promotional offers managed by admins
CREATE TABLE public.promotions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  title_uk       TEXT,
  description    TEXT,
  description_uk TEXT,
  badge          TEXT,
  badge_uk       TEXT,
  highlights     TEXT[]      NOT NULL DEFAULT '{}',
  highlights_uk  TEXT[]      NOT NULL DEFAULT '{}',
  valid_from     DATE,
  valid_to       DATE,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guest applications submitted through the public website
CREATE TABLE public.promo_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id     UUID        REFERENCES public.promotions(id) ON DELETE SET NULL,
  promotion_title  TEXT,
  guest_name       TEXT        NOT NULL,
  guest_phone      TEXT        NOT NULL,
  guest_email      TEXT,
  comment          TEXT,
  status           TEXT        NOT NULL DEFAULT 'new',
  admin_feedback   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.promotions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_applications ENABLE ROW LEVEL SECURITY;

-- Promotions: public read, authenticated full access
CREATE POLICY "Anyone can read promotions"
  ON public.promotions FOR SELECT USING (true);

CREATE POLICY "Authenticated manage promotions"
  ON public.promotions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Applications: public insert (website form), authenticated read + update
CREATE POLICY "Anyone can submit applications"
  ON public.promo_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated read applications"
  ON public.promo_applications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated update applications"
  ON public.promo_applications FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
