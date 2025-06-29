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
      bolge: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_details: {
        Row: {
          amount: number
          created_at: string
          detail_date: string
          detail_description: string | null
          expense_list_id: number
          expense_type_id: number
          id: number
          receipt_no: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          detail_date: string
          detail_description?: string | null
          expense_list_id: number
          expense_type_id: number
          id?: number
          receipt_no?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          detail_date?: string
          detail_description?: string | null
          expense_list_id?: number
          expense_type_id?: number
          id?: number
          receipt_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_details_expense_list_id_fkey"
            columns: ["expense_list_id"]
            isOneToOne: false
            referencedRelation: "expenses_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_details_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_group: boolean
          name: string
          parent_id: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          is_group?: boolean
          name: string
          parent_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          is_group?: boolean
          name?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_types_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_list: {
        Row: {
          created_at: string
          description: string | null
          entry_date: string
          expense_no: string
          id: number
          supplier_id: number | null
          total_amount: number
          vehicle_id: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_date: string
          expense_no: string
          id?: number
          supplier_id?: number | null
          total_amount?: number
          vehicle_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_date?: string
          expense_no?: string
          id?: number
          supplier_id?: number | null
          total_amount?: number
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_list_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_list_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      extras: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string
          bolge_id: number | null
          created_at: string | null
          deleted_at: string | null
          id: number
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string | null
        }
        Insert: {
          address: string
          bolge_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string
          bolge_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_bolge_id_foreign"
            columns: ["bolge_id"]
            isOneToOne: false
            referencedRelation: "bolge"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string | null
          currency: string
          deleted_at: string | null
          from_bolge_id: number | null
          id: number
          is_active: boolean
          price: number
          price_type: Database["public"]["Enums"]["price_type"]
          to_bolge_id: number | null
          transfer_type: Database["public"]["Enums"]["transfer_type"]
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          deleted_at?: string | null
          from_bolge_id?: number | null
          id?: number
          is_active?: boolean
          price: number
          price_type?: Database["public"]["Enums"]["price_type"]
          to_bolge_id?: number | null
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          deleted_at?: string | null
          from_bolge_id?: number | null
          id?: number
          is_active?: boolean
          price?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          to_bolge_id?: number | null
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_from_bolge_id_foreign"
            columns: ["from_bolge_id"]
            isOneToOne: false
            referencedRelation: "bolge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_lists_to_bolge_id_foreign"
            columns: ["to_bolge_id"]
            isOneToOne: false
            referencedRelation: "bolge"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_extra: {
        Row: {
          created_at: string | null
          extra_id: number
          id: number
          price: number
          quantity: number
          reservation_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          extra_id: number
          id?: number
          price: number
          quantity: number
          reservation_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          extra_id?: number
          id?: number
          price?: number
          quantity?: number
          reservation_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_extra_extra_id_foreign"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_extra_reservation_id_foreign"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          code: string
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          dropoff_location_id: number
          flight_airline_name: string | null
          flight_arrival_airport: string | null
          flight_arrival_delay: number | null
          flight_arrival_gate: string | null
          flight_arrival_terminal: string | null
          flight_arrival_time: string | null
          flight_departure_airport: string | null
          flight_departure_delay: number | null
          flight_departure_gate: string | null
          flight_departure_terminal: string | null
          flight_departure_time: string | null
          flight_last_checked: string | null
          flight_number: string | null
          flight_status: string | null
          id: number
          notes: string | null
          passenger_count: number
          payment_status: string
          pickup_location_id: number
          reservation_time: string
          status: string
          supplier_cost: number | null
          supplier_id: number | null
          total_price: number
          updated_at: string | null
          vehicle_id: number
        }
        Insert: {
          code: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          dropoff_location_id: number
          flight_airline_name?: string | null
          flight_arrival_airport?: string | null
          flight_arrival_delay?: number | null
          flight_arrival_gate?: string | null
          flight_arrival_terminal?: string | null
          flight_arrival_time?: string | null
          flight_departure_airport?: string | null
          flight_departure_delay?: number | null
          flight_departure_gate?: string | null
          flight_departure_terminal?: string | null
          flight_departure_time?: string | null
          flight_last_checked?: string | null
          flight_number?: string | null
          flight_status?: string | null
          id?: number
          notes?: string | null
          passenger_count: number
          payment_status?: string
          pickup_location_id: number
          reservation_time: string
          status?: string
          supplier_cost?: number | null
          supplier_id?: number | null
          total_price: number
          updated_at?: string | null
          vehicle_id: number
        }
        Update: {
          code?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          dropoff_location_id?: number
          flight_airline_name?: string | null
          flight_arrival_airport?: string | null
          flight_arrival_delay?: number | null
          flight_arrival_gate?: string | null
          flight_arrival_terminal?: string | null
          flight_arrival_time?: string | null
          flight_departure_airport?: string | null
          flight_departure_delay?: number | null
          flight_departure_gate?: string | null
          flight_departure_terminal?: string | null
          flight_departure_time?: string | null
          flight_last_checked?: string | null
          flight_number?: string | null
          flight_status?: string | null
          id?: number
          notes?: string | null
          passenger_count?: number
          payment_status?: string
          pickup_location_id?: number
          reservation_time?: string
          status?: string
          supplier_cost?: number | null
          supplier_id?: number | null
          total_price?: number
          updated_at?: string | null
          vehicle_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservations_dropoff_location_id_foreign"
            columns: ["dropoff_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_pickup_location_id_foreign"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_supplier_id_foreign"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_foreign"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          id: string
          ip_address: string | null
          last_activity: number
          payload: string
          user_agent: string | null
          user_id: number | null
        }
        Insert: {
          id: string
          ip_address?: string | null
          last_activity: number
          payload: string
          user_agent?: string | null
          user_id?: number | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          last_activity?: number
          payload?: string
          user_agent?: string | null
          user_id?: number | null
        }
        Relationships: []
      }
      supplier_price_lists: {
        Row: {
          cost: number | null
          created_at: string | null
          currency: string | null
          from_bolge_id: number | null
          id: number
          supplier_id: number
          to_bolge_id: number | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          vehicle_id: number | null
          vehicle_type: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          from_bolge_id?: number | null
          id?: number
          supplier_id: number
          to_bolge_id?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          vehicle_id?: number | null
          vehicle_type?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          from_bolge_id?: number | null
          id?: number
          supplier_id?: number
          to_bolge_id?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          vehicle_id?: number | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_lists_from_bolge_id_fkey"
            columns: ["from_bolge_id"]
            isOneToOne: false
            referencedRelation: "bolge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_lists_supplier_id_foreign"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_lists_to_bolge_id_fkey"
            columns: ["to_bolge_id"]
            isOneToOne: false
            referencedRelation: "bolge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_lists_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: number
          is_active: boolean
          name: string
          phone: string | null
          supplier_type: string
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean
          name: string
          phone?: string | null
          supplier_type?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: number
          is_active?: boolean
          name?: string
          phone?: string | null
          supplier_type?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string
          email_verified_at: string | null
          id: number
          name: string
          password: string
          remember_token: string | null
          supplier_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email: string
          email_verified_at?: string | null
          id?: number
          name: string
          password: string
          remember_token?: string | null
          supplier_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          email_verified_at?: string | null
          id?: number
          name?: string
          password?: string
          remember_token?: string | null
          supplier_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_supplier_id_foreign"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity: number
          created_at: string | null
          deleted_at: string | null
          description: string | null
          driver_phone: string | null
          id: number
          image_url: string | null
          is_active: boolean
          luggage_capacity: number
          name: string
          operation_phone: string | null
          plate_number: string | null
          supplier_id: number | null
          type: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          capacity: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_phone?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          luggage_capacity?: number
          name: string
          operation_phone?: string | null
          plate_number?: string | null
          supplier_id?: number | null
          type: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_phone?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          luggage_capacity?: number
          name?: string
          operation_phone?: string | null
          plate_number?: string | null
          supplier_id?: number | null
          type?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      location_type: "airport" | "hotel" | "other"
      price_type: "per_vehicle" | "per_person"
      transfer_type: "private" | "shared"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      location_type: ["airport", "hotel", "other"],
      price_type: ["per_vehicle", "per_person"],
      transfer_type: ["private", "shared"],
    },
  },
} as const 