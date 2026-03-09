import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class VendorsService {
    async getVendorsByHotel(hotelId: string) {
        return prisma.vendor.findMany({
            where: { hotelId },
            orderBy: { name: 'asc' },
        });
    }

    async createVendor(data: any, hotelId: string) {
        return prisma.vendor.create({
            data: {
                hotelId,
                name: data.name,
                category: data.category,
                contactPerson: data.contactPerson,
                phone: data.phone,
                email: data.email,
                address: data.address,
                gstNumber: data.gstNumber,
                notes: data.notes,
                totalOrders: data.totalOrders || 0,
                totalPaid: data.totalPaid || 0,
            },
        });
    }

    async updateVendor(vendorId: string, hotelId: string, data: any) {
        const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, hotelId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        return prisma.vendor.update({
            where: { id: vendorId },
            data: {
                ...data,
                totalPaid: data.totalPaid !== undefined ? Number(data.totalPaid) : undefined,
            },
        });
    }

    async deleteVendor(vendorId: string, hotelId: string) {
        const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, hotelId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        return prisma.vendor.delete({
            where: { id: vendorId },
        });
    }
}
