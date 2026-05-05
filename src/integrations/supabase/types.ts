export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      guest_forms: {
        Row: {
          id: string
          reservation_id: string
          full_name: string
          date_of_birth: string
          country_of_residence: string | null
          region: string | null
          district: string | null
          village_city: string | null
          street_house_apartment: string | null
          passport_series: string | null
          issued_by: string | null
          ubk: string | null
          ubk_discount_applied: boolean | null
          phone_number: string | null
          vehicle_number: string | null
          created_by_admin_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reservation_id: string
          full_name: string
          date_of_birth: string
          country_of_residence?: string | null
          region?: string | null
          district?: string | null
          village_city?: string | null
          street_house_apartment?: string | null
          passport_series?: string | null
          issued_by?: string | null
          ubk?: string | null
          ubk_discount_applied?: boolean | null
          phone_number?: string | null
          vehicle_number?: string | null
          created_by_admin_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reservation_id?: string
          full_name?: string
          date_of_birth?: string
          country_of_residence?: string | null
          region?: string | null
          district?: string | null
          village_city?: string | null
          street_house_apartment?: string | null
          passport_series?: string | null
          issued_by?: string | null
          ubk?: string | null
          ubk_discount_applied?: boolean | null
          phone_number?: string | null
          vehicle_number?: string | null
          created_by_admin_id?: string | null
          created_at?: string
          updated_at?: string
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
      hotel_settings: {
        Row: {
          address: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          currency: string | null
          email: string | null
          hotel_description: string | null
          hotel_name: string
          hotel_tagline: string | null
          id: string
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          hotel_description?: string | null
          hotel_name?: string
          hotel_tagline?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          hotel_description?: string | null
          hotel_name?: string
          hotel_tagline?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commission_rate: number | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          commission_rate?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          commission_rate?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          admin_notes: string | null
          booking_source: Database["public"]["Enums"]["booking_source"] | null
          check_in_date: string
          check_out_date: string
          commission_rate: number | null
          confirmed_by_admin_id: string | null
          created_at: string
          created_by_admin_id: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          num_guests: number
          room_unit_id: string
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          booking_group_id?: string | null
          booking_source?: Database["public"]["Enums"]["booking_source"] | null
          check_in_date: string
          check_out_date: string
          commission_rate?: number | null
          confirmed_by_admin_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          num_guests?: number
          room_unit_id: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          booking_group_id?: string | null
          booking_source?: Database["public"]["Enums"]["booking_source"] | null
          check_in_date?: string
          check_out_date?: string
          commission_rate?: number | null
          confirmed_by_admin_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          num_guests?: number
          room_unit_id?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
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
      room_types: {
        Row: {
          amenities: string[] | null
          base_price: number
          bed_type: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_guests: number
          name: string
          short_description: string | null
          size_sqm: number | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          base_price: number
          bed_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_guests?: number
          name: string
          short_description?: string | null
          size_sqm?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          base_price?: number
          bed_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_guests?: number
          name?: string
          short_description?: string | null
          size_sqm?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      room_units: {
        Row: {
          created_at: string
          floor: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          room_number: string
          room_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          room_number: string
          room_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      booking_source: "SITE" | "ADMIN"
      booking_status: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "CHECK_IN" | "CHECK_OUT"
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
      app_role: ["admin", "user", "super_admin"],
      booking_source: ["SITE", "ADMIN"],
      booking_status: ["PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "CHECK_IN", "CHECK_OUT"],
    },
  },
} as const
