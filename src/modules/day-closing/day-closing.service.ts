import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';

export class DayClosingService {
    async getWorkingDateTotals(hotelId: string, workingDate: Date) {
        const start = new Date(workingDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(workingDate);
        end.setHours(23, 59, 59, 999);

        // 1. Cash Received
        const advanceCash = await prisma.advancePayment.aggregate({
            where: { hotelId, paymentMethod: 'cash', paymentDate: { gte: start, lte: end }, isDeleted: false },
            _sum: { amount: true },
        });
        const cashReceived = (advanceCash._sum.amount || new Decimal(0));

        // 2. Bank Received
        const advanceBank = await prisma.advancePayment.aggregate({
            where: {
                hotelId,
                paymentMethod: { in: ['card', 'upi', 'bank'] },
                paymentDate: { gte: start, lte: end },
                isDeleted: false
            },
            _sum: { amount: true },
        });
        const bankReceived = (advanceBank._sum.amount || new Decimal(0));

        const voucherCash = await prisma.paymentVoucher.aggregate({
            where: { hotelId, paymentMethod: 'cash', voucherDate: { gte: start, lte: end }, isDeleted: false },
            _sum: { amount: true },
        });
        const cashPaid = (voucherCash._sum.amount || new Decimal(0));

        const voucherBank = await prisma.paymentVoucher.aggregate({
            where: {
                hotelId,
                paymentMethod: { in: ['card', 'upi', 'bank'] },
                voucherDate: { gte: start, lte: end },
                isDeleted: false
            },
            _sum: { amount: true },
        });
        const bankPaid = (voucherBank._sum.amount || new Decimal(0));

        // 5. Credit Sale (Invoices generated but not fully paid)
        const invoices = await prisma.invoice.findMany({
            where: {
                hotelId,
                invoiceDate: { gte: start, lte: end },
                isDeleted: false,
                bill: { balanceDue: { gt: 0 } }
            },
            include: { bill: true }
        });
        const creditSale = invoices.reduce((sum, inv) => {
            if (inv.bill) {
                return sum.add(inv.bill.balanceDue);
            }
            return sum;
        }, new Decimal(0));

        return {
            workingDate,
            cashReceived,
            bankReceived,
            cashPaid,
            bankPaid,
            creditSale,
        };
    }

    async closeDay(hotelId: string, workingDateStr: string, userId: string) {
        const workingDate = new Date(workingDateStr);

        // Check if already closed
        const existing = await prisma.dayClosing.findUnique({
            where: { hotelId_workingDate: { hotelId, workingDate } }
        });
        if (existing) throw new BadRequestError('Day already closed for this date');

        const totals = await this.getWorkingDateTotals(hotelId, workingDate);

        return prisma.dayClosing.create({
            data: {
                hotelId,
                workingDate,
                cashReceived: totals.cashReceived,
                bankReceived: totals.bankReceived,
                cashPaid: totals.cashPaid,
                bankPaid: totals.bankPaid,
                creditSale: totals.creditSale,
                closedBy: userId,
                status: 'closed'
            }
        });
    }

    async getClosingRecords(hotelId: string) {
        return prisma.dayClosing.findMany({
            where: { hotelId },
            include: { user: { select: { fullName: true } } },
            orderBy: { workingDate: 'desc' }
        });
    }

    async deleteLastClosing(hotelId: string) {
        const last = await prisma.dayClosing.findFirst({
            where: { hotelId },
            orderBy: { workingDate: 'desc' }
        });

        if (!last) throw new NotFoundError('No closing records found');

        return prisma.dayClosing.delete({
            where: { id: last.id }
        });
    }

    async getPendingDates(hotelId: string) {
        // Find last closed date
        const lastClosed = await prisma.dayClosing.findFirst({
            where: { hotelId },
            orderBy: { workingDate: 'desc' }
        });

        const startDate = lastClosed
            ? new Date(new Date(lastClosed.workingDate).getTime() + 86400000)
            : new Date(new Date().setDate(new Date().getDate() - 30)); // Look back 30 days if no closing exists

        const end = new Date();
        end.setHours(0, 0, 0, 0);

        const pendingDates = [];
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);

        while (current <= end) {
            pendingDates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        // Filter out dates with no transactions if we want, but usually better to show all pending
        return pendingDates;
    }

    async getPendingProcesses(hotelId: string) {
        // 1. Incomplete Payments (Bills with balance > 0)
        const pendingBills = await prisma.bill.findMany({
            where: { hotelId, status: { in: ['pending', 'partial'] }, isDeleted: false },
            include: { booking: true }
        });

        // 2. Open Invoices (Invoices not marked as paid)
        const openInvoices = await prisma.invoice.findMany({
            where: { hotelId, status: 'issued', isDeleted: false },
            include: { bill: true }
        });

        return {
            pendingBills,
            openInvoices
        };
    }

    /**
     * Check if a working date is closed
     */
    async isDateClosed(hotelId: string, date: Date) {
        const workingDate = new Date(date);
        workingDate.setHours(0, 0, 0, 0);
        const closing = await prisma.dayClosing.findUnique({
            where: { hotelId_workingDate: { hotelId, workingDate } }
        });
        return !!closing;
    }
}
