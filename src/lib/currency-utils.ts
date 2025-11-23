export function getCurrencySymbol(currency: string): string {
  const currencyMap: Record<string, string> = {
    'BDT': '৳',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CNY': '¥',
  };
  
  return currencyMap[currency.toUpperCase()] || currency;
}

export function formatPrice(price: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${price.toFixed(2)}`;
}
