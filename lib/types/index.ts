import { Database } from './database'

// User types
export type User = Database['public']['Tables']['users']['Row']
export type InsertUser = Database['public']['Tables']['users']['Insert']
export type UpdateUser = Database['public']['Tables']['users']['Update']

// Artwork types
export type Artwork = Database['public']['Tables']['artworks']['Row']
export type InsertArtwork = Database['public']['Tables']['artworks']['Insert']
export type UpdateArtwork = Database['public']['Tables']['artworks']['Update']

// Cart item types
export type CartItem = Database['public']['Tables']['cart_items']['Row']
export type InsertCartItem = Database['public']['Tables']['cart_items']['Insert']
export type UpdateCartItem = Database['public']['Tables']['cart_items']['Update']

// Extended types with relationships
export type ArtworkWithUser = Artwork & {
  user?: {
    id: string;
    // The username field might not exist in the actual database
    // Use email or another field as a fallback
    email?: string;
  }
}

export type CartItemWithArtwork = CartItem & {
  artwork?: Artwork
}

// Auth related types
export type AuthFormData = {
  email: string
  password: string
}

export type SignUpFormData = AuthFormData & {
  username?: string // Make username optional
  role: User['role']
}

// Role type
export type UserRole = 'admin' | 'seller' | 'buyer' 