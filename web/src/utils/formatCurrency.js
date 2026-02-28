export const formatCurrency = (amount, currencySymbol = '₹') => {
    // Check if it's already a string with a symbol
    if (typeof amount === 'string' && (amount.includes('₹') || amount.includes('$') || amount.includes('£') || amount.includes('€'))) {
        return amount; // or strip and reapply if needed, but safest to return as is if already formatted
    }

    // Convert to number if it's a string representation of a number
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;

    if (isNaN(num)) return amount; // Return original if not a valid number

    // Basic formatting with commas
    // We could use Intl.NumberFormat here if we know the locale for the currency
    // For now, simple toLocaleString on the number provides commas
    const formattedNum = num.toLocaleString();

    return `${currencySymbol}${formattedNum}`;
};
