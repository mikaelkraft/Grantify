// Currency formatting utilities for Nigerian Naira (NGN)
// Uses explicit formatting to ensure cross-browser compatibility

/**
 * Format a number as Nigerian Naira currency
 * Uses Intl.NumberFormat for consistent display across browsers
 */
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format a number as Nigerian Naira with compact notation (e.g., NGN 1.5M, NGN 500k)
 */
export const formatNairaCompact = (num: number): string => {
  const MILLION = 1000000;
  const THOUSAND = 1000;
  
  if (num >= MILLION) {
    const value = num / MILLION;
    const hasRemainder = num % MILLION !== 0;
    return `NGN ${value.toFixed(hasRemainder ? 1 : 0)}M`;
  }
  if (num >= THOUSAND) {
    return `NGN ${(num / THOUSAND).toFixed(0)}k`;
  }
  return formatNaira(num);
};
