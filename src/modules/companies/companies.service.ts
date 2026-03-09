import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

export class CompaniesService {
    async getCompaniesByHotel(hotelId: string, activeOnly?: boolean) {
        const where: any = { hotelId, isDeleted: false };
        if (activeOnly !== undefined) where.isActive = activeOnly;

        return prisma.company.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }

    async getCompanyById(id: string, hotelId: string) {
        const company = await prisma.company.findFirst({
            where: { id, hotelId, isDeleted: false },
        });
        if (!company) throw new NotFoundError('Company not found');
        return company;
    }

    async createCompany(hotelId: string, data: any, userId: string) {
        // Prevent exact name duplicates
        const existing = await prisma.company.findFirst({
            where: { hotelId, name: data.name, isDeleted: false }
        });
        if (existing) throw new BadRequestError('A company with this exact name already exists');

        return prisma.company.create({
            data: {
                ...data,
                hotelId,
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async updateCompany(id: string, hotelId: string, data: any, userId: string) {
        const company = await this.getCompanyById(id, hotelId);

        // Prevent duplicate renaming conflicts
        if (data.name && data.name !== company.name) {
            const conflict = await prisma.company.findFirst({
                where: { hotelId, name: data.name, isDeleted: false }
            });
            if (conflict) throw new BadRequestError('Another company is already using this name');
        }

        return prisma.company.update({
            where: { id: company.id },
            data: { ...data, updatedBy: userId },
        });
    }

    async deleteCompany(id: string, hotelId: string, userId: string) {
        const company = await this.getCompanyById(id, hotelId);
        // Soft delete
        await prisma.company.update({
            where: { id: company.id },
            data: { isDeleted: true, updatedBy: userId },
        });
    }

    async toggleStatus(id: string, hotelId: string, userId: string) {
        const company = await this.getCompanyById(id, hotelId);
        return prisma.company.update({
            where: { id: company.id },
            data: { isActive: !company.isActive, updatedBy: userId },
        });
    }

    async createCompanyForAllHotels(data: any, userId: string) {
        const hotels = await prisma.hotel.findMany({
            where: { isActive: true },
            select: { id: true }
        });

        const creations = hotels.map(hotel =>
            prisma.company.create({
                data: {
                    ...data,
                    hotelId: hotel.id,
                    createdBy: userId,
                    updatedBy: userId,
                }
            })
        );

        return Promise.all(creations);
    }
}
