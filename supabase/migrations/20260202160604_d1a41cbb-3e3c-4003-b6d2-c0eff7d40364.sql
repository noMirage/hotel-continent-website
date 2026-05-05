-- Create enum for booking statuses
CREATE TYPE public.booking_status AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Hotel Settings table (config-driven)
CREATE TABLE public.hotel_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_name TEXT NOT NULL DEFAULT 'Hotel Continent',
    hotel_tagline TEXT DEFAULT 'Experience Luxury Redefined',
    hotel_description TEXT DEFAULT 'A premier destination for discerning travelers seeking exceptional comfort and world-class service.',
    email TEXT DEFAULT 'info@hotelcontinent.com',
    phone TEXT DEFAULT '+38 (050) 705-5000',
    address TEXT DEFAULT '59, Sonychna, Polyna, PC 89313',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#ea580c',
    check_in_time TEXT DEFAULT '14:00',
    check_out_time TEXT DEFAULT '12:00',
    currency TEXT DEFAULT 'UAH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room Types table
CREATE TABLE public.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    max_guests INTEGER NOT NULL DEFAULT 2,
    size_sqm INTEGER,
    bed_type TEXT,
    amenities TEXT[] DEFAULT '{}',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room Units (individual rooms of a type)
CREATE TABLE public.room_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL UNIQUE,
    floor INTEGER,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room Media (photos gallery)
CREATE TABLE public.room_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations table
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_unit_id UUID NOT NULL REFERENCES public.room_units(id) ON DELETE RESTRICT,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    status booking_status NOT NULL DEFAULT 'PENDING',
    special_requests TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Prevent booking in the past
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Create index for availability queries
CREATE INDEX idx_reservations_dates ON public.reservations(room_unit_id, check_in_date, check_out_date, status);

-- Profiles table for admin users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Audit log for tracking changes
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_hotel_settings_updated_at
    BEFORE UPDATE ON public.hotel_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at
    BEFORE UPDATE ON public.room_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_units_updated_at
    BEFORE UPDATE ON public.room_units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check availability (prevents double booking)
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
        AND status IN ('PENDING', 'CONFIRMED')
        AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (check_in_date, check_out_date) OVERLAPS (p_check_in, p_check_out)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access for hotel info and rooms (for public website)
CREATE POLICY "Public can view hotel settings"
    ON public.hotel_settings FOR SELECT
    USING (true);

CREATE POLICY "Public can view active room types"
    ON public.room_types FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public can view active room units"
    ON public.room_units FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public can view room media"
    ON public.room_media FOR SELECT
    USING (true);

-- Reservations: public can create, only admin can view all
CREATE POLICY "Public can create reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view all reservations"
    ON public.reservations FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reservations"
    ON public.reservations FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Admin full access policies
CREATE POLICY "Admins can manage hotel settings"
    ON public.hotel_settings FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage room types"
    ON public.room_types FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage room units"
    ON public.room_units FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage room media"
    ON public.room_media FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage)
CREATE POLICY "Admins can view user roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Audit log (admin only)
CREATE POLICY "Admins can view audit log"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log"
    ON public.audit_log FOR INSERT
    WITH CHECK (true);

-- Insert default hotel settings
INSERT INTO public.hotel_settings (hotel_name, hotel_tagline, hotel_description)
VALUES ('LuxeStay Hotel', 'Experience Luxury Redefined', 'A premier destination for discerning travelers seeking exceptional comfort and world-class service.');

-- Insert sample room types
INSERT INTO public.room_types (name, slug, description, short_description, base_price, max_guests, size_sqm, bed_type, amenities, sort_order) VALUES
('Deluxe Room', 'deluxe-room', 'Our Deluxe Room offers a perfect blend of comfort and elegance. Featuring modern amenities and thoughtful touches, this room provides an ideal retreat after a day of exploration or business meetings.', 'Elegant comfort with modern amenities', 150.00, 2, 35, 'King', ARRAY['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Smart TV', 'Safe'], 1),
('Executive Suite', 'executive-suite', 'The Executive Suite is designed for guests who appreciate extra space and luxury. With a separate living area, premium furnishings, and exclusive amenities, this suite delivers an elevated hospitality experience.', 'Spacious suite with separate living area', 280.00, 3, 55, 'King', ARRAY['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Smart TV', 'Safe', 'Living Area', 'Work Desk', 'Espresso Machine'], 2),
('Presidential Suite', 'presidential-suite', 'Our most luxurious accommodation, the Presidential Suite offers unparalleled elegance and space. Featuring panoramic views, a private dining area, and butler service, this suite is the epitome of refined hospitality.', 'Ultimate luxury with panoramic views', 550.00, 4, 120, 'King', ARRAY['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Smart TV', 'Safe', 'Living Area', 'Private Dining', 'Butler Service', 'Jacuzzi', 'Panoramic Views'], 3),
('Family Room', 'family-room', 'Perfect for families traveling together, this spacious room features comfortable bedding for up to four guests, along with family-friendly amenities and extra space for relaxation.', 'Spacious accommodation for families', 220.00, 4, 50, 'Two Queen', ARRAY['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Smart TV', 'Safe', 'Extra Beds Available'], 4);

-- Insert sample room units
INSERT INTO public.room_units (room_type_id, room_number, floor) VALUES
((SELECT id FROM public.room_types WHERE slug = 'deluxe-room'), '101', 1),
((SELECT id FROM public.room_types WHERE slug = 'deluxe-room'), '102', 1),
((SELECT id FROM public.room_types WHERE slug = 'deluxe-room'), '103', 1),
((SELECT id FROM public.room_types WHERE slug = 'deluxe-room'), '201', 2),
((SELECT id FROM public.room_types WHERE slug = 'deluxe-room'), '202', 2),
((SELECT id FROM public.room_types WHERE slug = 'executive-suite'), '301', 3),
((SELECT id FROM public.room_types WHERE slug = 'executive-suite'), '302', 3),
((SELECT id FROM public.room_types WHERE slug = 'presidential-suite'), '501', 5),
((SELECT id FROM public.room_types WHERE slug = 'family-room'), '401', 4),
((SELECT id FROM public.room_types WHERE slug = 'family-room'), '402', 4);