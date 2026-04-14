/**
 * Formats a number into a currency string (e.g., $1,234.56).
 * Assumes USD currency for simplicity.
 * 
 * @param price - The numerical price value.
 * @param currency - The currency symbol (default: 'USD').
 * @param locale - The locale for formatting (default: 'en-US').
 * @returns A formatted currency string, or an empty string if the price is invalid.
 */
export function formatPrice(
  price: number | null | undefined,
  currency: string = 'PHP',
  locale: string = 'en-PH'
): string {
  if (price === null || price === undefined || isNaN(price)) {
    return '-'; // Return dash for invalid or zero prices
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch (error) {
    console.error('Error formatting price:', error);
    // Fallback for invalid currency codes or other errors
    return `$${price.toFixed(2)}`;
  }
} 