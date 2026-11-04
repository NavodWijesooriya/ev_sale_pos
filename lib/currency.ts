/**
 * Currency localization for Sri Lankan Rupees (LKR / Rs.)
 * Standard formatting: Rs. 450,000 using en-LK locale
 */

export function formatLKR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) {
    return "Rs. 0"
  }
  const formatted = new Intl.NumberFormat("en-LK", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
  return `Rs. ${formatted}`
}

export function formatCurrency(amount: number | null | undefined): string {
  return formatLKR(amount)
}
