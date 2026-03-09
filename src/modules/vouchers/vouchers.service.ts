import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class VouchersService {
    async getVouchersByHotel(hotelId: string) {
        return prisma.paymentVoucher.findMany({
            where: { hotelId, isDeleted: false },
            orderBy: { voucherDate: 'desc' },
        });
    }

    async createVoucher(data: any, hotelId: string, userId: string) {
        // Auto-generate voucher number
        const last = await prisma.paymentVoucher.findFirst({
            where: { hotelId },
            orderBy: { createdAt: 'desc' },
        });
        const count = last ? parseInt(last.voucherNumber.split('-').pop() || '0') + 1 : 1;
        const voucherNumber = `PV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

        return prisma.paymentVoucher.create({
            data: {
                hotelId,
                voucherNumber,
                payee: data.payee,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                purpose: data.purpose,
                voucherDate: data.voucherDate ? new Date(data.voucherDate) : new Date(),
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async updateVoucher(voucherId: string, hotelId: string, data: any, userId: string) {
        const voucher = await prisma.paymentVoucher.findFirst({ where: { id: voucherId, hotelId } });
        if (!voucher) throw new NotFoundError('Voucher not found');
        return prisma.paymentVoucher.update({
            where: { id: voucherId },
            data: { ...data, updatedBy: userId },
        });
    }

    async deleteVoucher(voucherId: string, hotelId: string, userId: string) {
        const voucher = await prisma.paymentVoucher.findFirst({ where: { id: voucherId, hotelId } });
        if (!voucher) throw new NotFoundError('Voucher not found');
        return prisma.paymentVoucher.update({
            where: { id: voucherId },
            data: { isDeleted: true, updatedBy: userId },
        });
    }
}
