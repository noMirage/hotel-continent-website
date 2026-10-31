export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      group_booking_requests: {
        Row: {
          admin_notes: string | null
          check_in: string
          check_out: string
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string
          id: string
          num_guests: number
          status: string
          updated_at: string
          wishes: string | null
        }
        Insert: {
          admin_notes?: string | null
          check_in: string
          check_out: string
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          id?: string
          num_guests: number
          status?: string
          updated_at?: string
          wishes?: string | null
        }
        Update: {
          admin_notes?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          id?: string
          num_guests?: number
          status?: string
          updated_at?: string
          wishes?: string | null
        }
        Relationships: []
      }
      group_booking_room_assignments: {
        Row: {
          check_in_override: string | null
          check_out_override: string | null
          created_at: string
          early_checkin_fee: number
          extra_accommodation: number
          extra_guest_names: string[]
          group_booking_id: string
          guest_names: string[]
          id: string
          late_checkout_fee: number
          room_notes: string | null
          room_unit_id: string
          ubd_documents: string[]
          updated_at: string
        }
        Insert: {
          check_in_override?: string | null
          check_out_override?: string | null
          created_at?: string
          early_checkin_fee?: number
          extra_accommodation?: number
          extra_guest_names?: string[]
          group_booking_id: string
          guest_names?: string[]
          id?: string
          late_checkout_fee?: number
          room_notes?: string | null
          room_unit_id: string
          ubd_documents?: string[]
          updated_at?: string
        }
        Update: {
          check_in_override?: string | null
          check_out_override?: string | null
          created_at?: string
          early_checkin_fee?: number
          extra_accommodation?: number
          extra_guest_names?: string[]
          group_booking_id?: string
          guest_names?: string[]
          id?: string
          late_checkout_fee?: number
          room_notes?: string | null
          room_unit_id?: string
          ubd_documents?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_booking_room_assignments_group_booking_id_fkey"
            columns: ["group_booking_id"]
            isOneToOne: false
            referencedRelation: "group_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_booking_room_assignments_room_unit_id_fkey"
            columns: ["room_unit_id"]
            isOneToOne: false
            referencedRelation: "room_units"
            referencedColumns: ["id"]
          },
        ]
      }
      group_bookings: {
        Row: {
          admin_notes: string | null
          booking_name: string
          calculation_id: string | null
          check_in_date: string
          check_out_date: string
          contact_person: string
          created_at: string
          created_by_admin_id: string | null
          custom_total: number | null
          deposit_amount: number | null
          id: string
          num_guests: number
          phone: string | null
          room_unit_ids: string[]
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          booking_name: string
          calculation_id?: string | null
          check_in_date: string
          check_out_date: string
          contact_person: string
          created_at?: string
          created_by_admin_id?: string | null
          custom_total?: number | null
          deposit_amount?: number | null
          id?: string
          num_guests: number
          phone?: string | null
          room_unit_ids?: string[]
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          booking_name?: string
          calculation_id?: string | null
          check_in_date?: string
          check_out_date?: string
          contact_person?: string
          created_at?: string
          created_by_admin_id?: string | null
          custom_total?: number | null
          deposit_amount?: number | null
          id?: string
          num_guests?: number
          phone?: string | null
          room_unit_ids?: string[]
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_bookings_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "group_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_calculation_services: {
        Row: {
          calculation_id: string
          cost: number | null
          created_at: string
          id: string
          service_name: string
        }
        Insert: {
          calculation_id: string
          cost?: number | null
          created_at?: string
          id?: string
          service_name: string
        }
        Update: {
          calculation_id?: string
          cost?: number | null
          created_at?: string
          id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_calculation_services_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "group_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_calculations: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          id: string
          name: string
          price_per_person_per_night: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          name: string
          price_per_person_per_night?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          name?: string
          price_per_person_per_night?: number
          updated_at?: string
        }
        Relationships: []
      }
      guest_forms: {
        Row: {
          country_of_residence: string | null
          created_at: string | null
          created_by_admin_id: string | null
          date_of_birth: string
          district: string | null
          full_name: string
          guest_index: number
          id: string
          issued_by: string | null
          passport_series: string | null
          phone_number: string | null
          region: string | null
          reservation_id: string
          street_house_apartment: string | null
          ubk: string | null
          ubk_discount_applied: boolean | null
          updated_at: string | null
          vehicle_number: string | null
          village_city: string | null
        }
        Insert: {
          country_of_residence?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          date_of_birth: string
          district?: string | null
          full_name: string
          guest_index?: number
          id?: string
          issued_by?: string | null
          passport_series?: string | null
          phone_number?: string | null
          region?: string | null
          reservation_id: string
          street_house_apartment?: string | null
          ubk?: string | null
          ubk_discount_applied?: boolean | null
          updated_at?: string | null
          vehicle_number?: string | null
          village_city?: string | null
        }
        Update: {
          country_of_residence?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          date_of_birth?: string
          district?: string | null
          full_name?: string
          guest_index?: number
          id?: string
          issued_by?: string | null
          passport_series?: string | null
          phone_number?: string | null
          region?: string | null
          reservation_id?: string
          street_house_apartment?: string | null
          ubk?: string | null
          ubk_discount_applied?: boolean | null
          updated_at?: string | null
          vehicle_number?: string | null
          village_city?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_forms_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_settings: {
        Row: {
          address: string | null
          address_uk: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          currency: string | null
          email: string | null
          extra_capacity: number | null
          hotel_description: string | null
          hotel_name: string
          hotel_tagline: string | null
          id: string
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          total_capacity: number | null
          tourist_tax_rate: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_uk?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          extra_capacity?: number | null
          hotel_description?: string | null
          hotel_name?: string
          hotel_tagline?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          total_capacity?: number | null
          tourist_tax_rate?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_uk?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          extra_capacity?: number | null
          hotel_description?: string | null
          hotel_name?: string
          hotel_tagline?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          total_capacity?: number | null
          tourist_tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commission_rate: number | null
          commission_rate_manual: number
          commission_rate_site: number
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          commission_rate?: number | null
          commission_rate_manual?: number
          commission_rate_site?: number
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          commission_rate?: number | null
          commission_rate_manual?: number
          commission_rate_site?: number
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_applications: {
        Row: {
          admin_feedback: string | null
          comment: string | null
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string
          id: string
          promotion_id: string | null
          promotion_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_feedback?: string | null
          comment?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          id?: string
          promotion_id?: string | null
          promotion_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_feedback?: string | null
          comment?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          id?: string
          promotion_id?: string | null
          promotion_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_applications_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          badge: string | null
          badge_uk: string | null
          created_at: string
          description: string | null
          description_uk: string | null
          discount_percent: number
          highlights: string[]
          highlights_uk: string[]
          id: string
          is_active: boolean
          sort_order: number
          title: string
          title_uk: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          badge?: string | null
          badge_uk?: string | null
          created_at?: string
          description?: string | null
          description_uk?: string | null
          discount_percent?: number
          highlights?: string[]
          highlights_uk?: string[]
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          title_uk?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          badge?: string | null
          badge_uk?: string | null
          created_at?: string
          description?: string | null
          description_uk?: string | null
          discount_percent?: number
          highlights?: string[]
          highlights_uk?: string[]
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          title_uk?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          admin_notes: string | null
          assigned_admin_id: string | null
          booking_group_id: string | null
          booking_source: Database["public"]["Enums"]["booking_source"] | null
          budget: string | null
          check_in_date: string
          check_out_date: string
          commission_rate: number | null
          confirmed_by_admin_id: string | null
          created_at: string
          created_by_admin_id: string | null
          deposit_amount: number | null
          discount_percent: number
          early_checkin_fee: number
          event_type: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number | null
          has_accommodation: boolean | null
          has_decor: boolean | null
          has_menu: boolean | null
          has_music: boolean | null
          id: string
          late_checkout_fee: number
          num_guests: number
          payment_method: string | null
          promotion_id: string | null
          room_unit_id: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          tourist_tax_amount: number
          type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          booking_group_id?: string | null
          booking_source?: Database["public"]["Enums"]["booking_source"] | null
          budget?: string | null
          check_in_date: string
          check_out_date: string
          commission_rate?: number | null
          confirmed_by_admin_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          deposit_amount?: number | null
          discount_percent?: number
          early_checkin_fee?: number
          event_type?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number | null
          has_accommodation?: boolean | null
          has_decor?: boolean | null
          has_menu?: boolean | null
          has_music?: boolean | null
          id?: string
          late_checkout_fee?: number
          num_guests?: number
          payment_method?: string | null
          promotion_id?: string | null
          room_unit_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          tourist_tax_amount?: number
          type?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          booking_group_id?: string | null
          booking_source?: Database["public"]["Enums"]["booking_source"] | null
          budget?: string | null
          check_in_date?: string
          check_out_date?: string
          commission_rate?: number | null
          confirmed_by_admin_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          deposit_amount?: number | null
          discount_percent?: number
          early_checkin_fee?: number
          event_type?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number | null
          has_accommodation?: boolean | null
          has_decor?: boolean | null
          has_menu?: boolean | null
          has_music?: boolean | null
          id?: string
          late_checkout_fee?: number
          num_guests?: number
          payment_method?: string | null
          promotion_id?: string | null
          room_unit_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          tourist_tax_amount?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_unit_id_fkey"
            columns: ["room_unit_id"]
            isOneToOne: false
            referencedRelation: "room_units"
            referencedColumns: ["id"]
          },
        ]
      }
      room_media: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          room_type_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          room_type_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          room_type_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_media_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_type_guest_prices: {
        Row: {
          created_at: string
          guest_count: number
          id: string
          price_per_night: number
          room_type_id: string
        }
        Insert: {
          created_at?: string
          guest_count: number
          id?: string
          price_per_night: number
          room_type_id: string
        }
        Update: {
          created_at?: string
          guest_count?: number
          id?: string
          price_per_night?: number
          room_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_type_guest_prices_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          amenities: string[] | null
          amenities_uk: string[] | null
          base_price: number
          bed_type: string | null
          created_at: string
          description: string | null
          description_uk: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_guests: number
          name: string
          name_uk: string | null
          short_description: string | null
          short_description_uk: string | null
          size_sqm: number | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          amenities_uk?: string[] | null
          base_price: number
          bed_type?: string | null
          created_at?: string
          description?: string | null
          description_uk?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_guests?: number
          name: string
          name_uk?: string | null
          short_description?: string | null
          short_description_uk?: string | null
          size_sqm?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          amenities_uk?: string[] | null
          base_price?: number
          bed_type?: string | null
          created_at?: string
          description?: string | null
          description_uk?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_guests?: number
          name?: string
          name_uk?: string | null
          short_description?: string | null
          short_description_uk?: string | null
          size_sqm?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      room_units: {
        Row: {
          bed_config: string | null
          cleanliness_status: string
          created_at: string
          extra_accommodation_enabled: boolean
          extra_accommodation_max: number
          floor: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          room_number: string
          room_type_id: string
          updated_at: string
        }
        Insert: {
          bed_config?: string | null
          cleanliness_status?: string
          created_at?: string
          extra_accommodation_enabled?: boolean
          extra_accommodation_max?: number
          floor?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          room_number: string
          room_type_id: string
          updated_at?: string
        }
        Update: {
          bed_config?: string | null
          cleanliness_status?: string
          created_at?: string
          extra_accommodation_enabled?: boolean
          extra_accommodation_max?: number
          floor?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          room_number?: string
          room_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_units_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_room_availability: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_exclude_reservation_id?: string
          p_room_unit_id: string
        }
        Returns: boolean
      }
      create_public_booking: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone: string
          p_rooms: Json
          p_special_requests?: string
        }
        Returns: Json
      }
      get_blocked_unit_ids: {
        Args: { p_check_in: string; p_check_out: string }
        Returns: {
          room_unit_id: string
        }[]
      }
      grant_admin_role: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      public_form_check_contact: {
        Args: { p_name: string; p_phone: string }
        Returns: undefined
      }
      public_form_text: {
        Args: { p_max: number; p_value: string }
        Returns: string
      }
      submit_banquet_request: {
        Args: {
          p_comment?: string
          p_event_date: string
          p_event_type: string
          p_guest_name: string
          p_guest_phone: string
          p_guests_count: number
        }
        Returns: undefined
      }
      submit_group_request: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone: string
          p_num_guests: number
          p_wishes?: string
        }
        Returns: undefined
      }
      submit_promo_application: {
        Args: {
          p_comment?: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone: string
          p_promotion_id: string
        }
        Returns: undefined
      }
      update_role_by_user_id: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "viewer" | "owner"
      booking_source: "SITE" | "ADMIN"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "DECLINED"
        | "CANCELLED"
        | "CHECK_IN"
        | "CHECK_OUT"
        | "UNPROCESSED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin", "viewer", "owner"],
      booking_source: ["SITE", "ADMIN"],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "DECLINED",
        "CANCELLED",
        "CHECK_IN",
        "CHECK_OUT",
        "UNPROCESSED",
      ],
    },
  },
} as const

