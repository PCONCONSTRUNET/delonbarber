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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      appointment_services: {
        Row: {
          appointment_id: string
          id: string
          price_at_booking: number
          service_id: string
        }
        Insert: {
          appointment_id: string
          id?: string
          price_at_booking: number
          service_id: string
        }
        Update: {
          appointment_id?: string
          id?: string
          price_at_booking?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string | null
          commission_percent_at_booking: number | null
          created_at: string | null
          guest_client_id: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          is_force_booking: boolean
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          total_duration: number | null
          total_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_id?: string | null
          commission_percent_at_booking?: number | null
          created_at?: string | null
          guest_client_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_force_booking?: boolean
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          total_duration?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_id?: string | null
          commission_percent_at_booking?: number | null
          created_at?: string | null
          guest_client_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_force_booking?: boolean
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          total_duration?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_guest_client_id_fkey"
            columns: ["guest_client_id"]
            isOneToOne: false
            referencedRelation: "guest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barbers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          commission_percent: number
          created_at: string
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          is_open_today: boolean
          is_owner: boolean
          name: string
          notify_push: boolean
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          commission_percent?: number
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_open_today?: boolean
          is_owner?: boolean
          name: string
          notify_push?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          commission_percent?: number
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_open_today?: boolean
          is_owner?: boolean
          name?: string
          notify_push?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          appointment_id: string | null
          barber_id: string | null
          blocked_date: string
          blocked_time: string
          created_at: string
          created_by: string | null
          id: string
          is_manual: boolean
          reason: string | null
        }
        Insert: {
          appointment_id?: string | null
          barber_id?: string | null
          blocked_date: string
          blocked_time: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_manual?: boolean
          reason?: string | null
        }
        Update: {
          appointment_id?: string | null
          barber_id?: string | null
          blocked_date?: string
          blocked_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_manual?: boolean
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          barber_id: string | null
          close_time: string
          day_of_week: number
          id: string
          is_open: boolean | null
          lunch_end: string | null
          lunch_start: string | null
          open_time: string
        }
        Insert: {
          barber_id?: string | null
          close_time: string
          day_of_week: number
          id?: string
          is_open?: boolean | null
          lunch_end?: string | null
          lunch_start?: string | null
          open_time: string
        }
        Update: {
          barber_id?: string | null
          close_time?: string
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          lunch_end?: string | null
          lunch_start?: string | null
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          admin_id: string | null
          client_id: string
          created_at: string | null
          id: string
          note: string
        }
        Insert: {
          admin_id?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          note: string
        }
        Update: {
          admin_id?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          note?: string
        }
        Relationships: []
      }
      client_package_usage: {
        Row: {
          appointment_id: string | null
          client_package_id: string
          id: string
          service_id: string
          used_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_package_id: string
          id?: string
          service_id: string
          used_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_package_id?: string
          id?: string
          service_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_package_usage_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_package_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          barber_id: string | null
          created_at: string | null
          end_date: string
          id: string
          package_id: string
          price_at_purchase: number | null
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barber_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          package_id: string
          price_at_purchase?: number | null
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barber_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          package_id?: string
          price_at_purchase?: number | null
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusive_clients: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_clients: {
        Row: {
          created_at: string
          id: string
          last_visit_at: string | null
          name: string
          phone: string
          total_spent: number | null
          total_visits: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_visit_at?: string | null
          name: string
          phone: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_visit_at?: string | null
          name?: string
          phone?: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_program: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          reward_description: string
          reward_type: string
          reward_value: number | null
          visits_required: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          reward_description: string
          reward_type?: string
          reward_value?: number | null
          visits_required?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reward_description?: string
          reward_type?: string
          reward_value?: number | null
          visits_required?: number
        }
        Relationships: []
      }
      loyalty_progress: {
        Row: {
          created_at: string | null
          id: string
          last_visit_at: string | null
          program_id: string
          rewards_claimed: number
          updated_at: string | null
          user_id: string
          visits_count: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_visit_at?: string | null
          program_id: string
          rewards_claimed?: number
          updated_at?: string | null
          user_id: string
          visits_count?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          last_visit_at?: string | null
          program_id?: string
          rewards_claimed?: number
          updated_at?: string | null
          user_id?: string
          visits_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_program"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          appointment_id: string | null
          claimed_at: string | null
          id: string
          program_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          claimed_at?: string | null
          id?: string
          program_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          claimed_at?: string | null
          id?: string
          program_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_program"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onesignal_subscriptions: {
        Row: {
          ativo: boolean
          created_at: string
          device_info: Json | null
          id: string
          player_id: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_info?: Json | null
          id?: string
          player_id: string
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_info?: Json | null
          id?: string
          player_id?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      package_benefits: {
        Row: {
          created_at: string | null
          id: string
          package_id: string
          quantity: number
          service_id: string
          weekly_limit: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_id: string
          quantity?: number
          service_id: string
          weekly_limit?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          package_id?: string
          quantity?: number
          service_id?: string
          weekly_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "package_benefits_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_benefits_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      package_cycles: {
        Row: {
          created_at: string
          id: string
          package_id: string
          sequence_order: number
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          sequence_order: number
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          sequence_order?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_cycles_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_cycles_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          benefits: string[] | null
          created_at: string | null
          description: string | null
          discount_percent: number
          duration_days: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          type: string | null
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          type?: string | null
        }
        Update: {
          benefits?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          ativo: boolean
          created_at: string
          device_info: Json | null
          id: string
          player_id: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_info?: Json | null
          id?: string
          player_id: string
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_info?: Json | null
          id?: string
          player_id?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string
          id: string
          is_public: boolean
          rating: number
          user_id: string
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          rating: number
          user_id: string
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          subscribers_only: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          subscribers_only?: boolean
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          subscribers_only?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      admin_assign_barber_account: {
        Args: { p_barber_id: string; p_email: string }
        Returns: string
      }
      auto_complete_appointments: { Args: never; Returns: number }
      claim_my_barber_account: {
        Args: never
        Returns: Database["public"]["Tables"]["barbers"]["Row"][]
      }
      get_barber_booked_slots: {
        Args: { p_barber_id: string | null; p_date: string }
        Returns: { slot_time: string }[]
      }
      get_default_barber_id: { Args: never; Returns: string | null }
      get_my_barber_id: { Args: never; Returns: string | null }
      get_my_barber_profile: {
        Args: never
        Returns: Database["public"]["Tables"]["barbers"]["Row"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_barber: { Args: { _user_id?: string }; Returns: boolean }
      toggle_my_barber_notify_push: {
        Args: { p_enabled?: boolean | null }
        Returns: boolean
      }
      toggle_my_barber_status: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
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
      app_role: ["admin", "user"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
