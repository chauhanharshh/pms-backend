import { Decimal } from '@prisma/client/runtime/library';

export interface TaxBreakdown {
    rate: Decimal;
    amount: Decimal;
    cgstRate: Decimal;
    cgstAmount: Decimal;
    sgstRate: Decimal;
    sgstAmount: Decimal;
}

/**
 * Calculates GST based on Indian Hotel GST rules:
 * - ₹0 to ₹7500: 5%
 * - Above ₹7500: 18%
 * 
 * @param dailyRent The rent per day for one room
 * @param nights Number of nights stayed
 * @returns Tax breakdown
 */
export function calculateRoomTax(dailyRent: number | Decimal, nights: number = 1): TaxBreakdown {
    const rent = new Decimal(dailyRent.toString());
    const numNights = new Decimal(nights.toString());

    let rateValue = 5;
    if (rent.gt(7500)) {
        rateValue = 18;
    }

    const rate = new Decimal(rateValue);
    const cgstRate = rate.div(2);
    const sgstRate = rate.div(2);

    const totalRoomCharges = rent.mul(numNights);

    const cgstAmount = totalRoomCharges.mul(cgstRate).div(100);
    const sgstAmount = totalRoomCharges.mul(sgstRate).div(100);
    const amount = cgstAmount.add(sgstAmount);

    return {
        rate,
        amount,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
    };
}
