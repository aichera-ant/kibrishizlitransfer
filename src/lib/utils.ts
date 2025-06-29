import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currencyCode: string = 'TRY') {
	if (typeof window === 'undefined') {
		const formattedAmount = amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		return `${formattedAmount} ${currencyCode}`;
	}

	try {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        console.error("Error formatting currency:", error);
        const formattedAmount = amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		return `${formattedAmount} ${currencyCode}`;
    }
}
