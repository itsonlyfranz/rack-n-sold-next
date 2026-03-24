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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      artworks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artist: string
          buyer_wallet: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          opensea_listing_url: string | null
          price: number
          rejected_at: string | null
          rejected_by: string | null
          sold_at: string | null
          status: string | null
          title: string
          token_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artist: string
          buyer_wallet?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          opensea_listing_url?: string | null
          price: number
          rejected_at?: string | null
          rejected_by?: string | null
          sold_at?: string | null
          status?: string | null
          title: string
          token_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artist?: string
          buyer_wallet?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          opensea_listing_url?: string | null
          price?: number
          rejected_at?: string | null
          rejected_by?: string | null
          sold_at?: string | null
          status?: string | null
          title?: string
          token_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string | null
          artwork_id: string
          id: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          artwork_id: string
          id?: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          artwork_id?: string
          id?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mint_requests: {
        Row: {
          admin_wallet_address: string | null
          approved_at: string | null
          approved_by: string | null
          artwork_id: string
          created_at: string | null
          id: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          requested_by: string
          status: string
          token_id: string | null
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          admin_wallet_address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          artwork_id: string
          created_at?: string | null
          id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          token_id?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_wallet_address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          artwork_id?: string
          created_at?: string | null
          id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          token_id?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mint_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mint_requests_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mint_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_collections: {
        Row: {
          created_at: string | null
          description: string | null
          floor_price: number | null
          id: number
          image_url: string | null
          last_fetched: string | null
          market_cap: number | null
          name: string
          num_owners: number | null
          slug: string
          total_supply: number | null
          total_volume: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          floor_price?: number | null
          id?: number
          image_url?: string | null
          last_fetched?: string | null
          market_cap?: number | null
          name: string
          num_owners?: number | null
          slug: string
          total_supply?: number | null
          total_volume?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          floor_price?: number | null
          id?: number
          image_url?: string | null
          last_fetched?: string | null
          market_cap?: number | null
          name?: string
          num_owners?: number | null
          slug?: string
          total_supply?: number | null
          total_volume?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          artwork_id: string
          id: string
          order_id: string
          price: number
          quantity: number | null
        }
        Insert: {
          artwork_id: string
          id?: string
          order_id: string
          price: number
          quantity?: number | null
        }
        Update: {
          artwork_id?: string
          id?: string
          order_id?: string
          price?: number
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: string | null
          created_at: string | null
          id: string
          payment_method: string | null
          shipping_address: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_address?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          shipping_address?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          shipping_address?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artwork_id: string
          created_at: string | null
          id: string
          opensea_listing_url: string | null
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          requested_by: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artwork_id: string
          created_at?: string | null
          id?: string
          opensea_listing_url?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artwork_id?: string
          created_at?: string | null
          id?: string
          opensea_listing_url?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_requests_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          phone: string | null
          profile_picture: string | null
          role: string
          status: string | null
          updated_at: string | null
          username: string | null
          wallet_address: string | null
          wallet_chain_id: number | null
          wallet_connected_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          phone?: string | null
          profile_picture?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
          username?: string | null
          wallet_address?: string | null
          wallet_chain_id?: number | null
          wallet_connected_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          profile_picture?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
          username?: string | null
          wallet_address?: string | null
          wallet_chain_id?: number | null
          wallet_connected_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
