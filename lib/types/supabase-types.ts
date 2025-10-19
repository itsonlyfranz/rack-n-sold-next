export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          role: 'admin' | 'seller' | 'buyer'
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          role?: 'admin' | 'seller' | 'buyer'
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          role?: 'admin' | 'seller' | 'buyer'
        }
      }
      artworks: {
        Row: {
          id: string
          title: string
          artist?: string
          description: string
          price: number
          image_url: string
          created_at: string
          updated_at: string
          user_id: string
          status?: string
          approved_at?: string
          approved_by?: string
          rejected_at?: string
          rejected_by?: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string
          description: string
          price: number
          image_url: string
          created_at?: string
          updated_at?: string
          user_id: string
          status?: string
          approved_at?: string
          approved_by?: string
          rejected_at?: string
          rejected_by?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          description?: string
          price?: number
          image_url?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          status?: string
          approved_at?: string
          approved_by?: string
          rejected_at?: string
          rejected_by?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          artwork_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          artwork_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          artwork_id?: string
          created_at?: string
          updated_at?: string
        }
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
  }
} 