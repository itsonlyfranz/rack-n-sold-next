import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a price value as a currency string
 * @param price - The price value to format
 * @param options - Formatting options including currency and notation
 * @returns Formatted price string with currency symbol
 */
export function formatPrice(
  price: number | string | null | undefined,
  options: {
    currency?: 'USD' | 'EUR' | 'GBP' | 'BDT'
    notation?: Intl.NumberFormatOptions['notation']
  } = {}
) {
  // Handle undefined, null, or empty values
  if (price === undefined || price === null) {
    return '$0.00';
  }
  
  // Convert string to number if needed
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  const { currency = 'USD', notation = 'standard' } = options
  
  // Format the price using Intl.NumberFormat
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation,
  }).format(numericPrice)
} 