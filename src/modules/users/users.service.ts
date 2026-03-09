import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class UsersService {
  async getUsersByHotel(hotelId?: string) {
    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    return prisma.user.findMany({
      where,
      select: {
        id: true, username: true, fullName: true, email: true,
        phone: true, role: true, hotelId: true, isActive: true,
        createdAt: true, updatedAt: true,
        hotel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(data: any, requestingUserId: string) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) throw new BadRequestError('Username already exists');
    const passwordHash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        hotelId: data.hotelId || null,
        isActive: data.isActive ?? true,
        createdBy: requestingUserId,
        updatedBy: requestingUserId,
      },
      select: {
        id: true, username: true, fullName: true, email: true,
        phone: true, role: true, hotelId: true, isActive: true, createdAt: true,
        hotel: { select: { id: true, name: true } },
      },
    });
  }

  async updateUser(userId: string, data: any, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    const updateData: any = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      hotelId: data.hotelId ?? user.hotelId,
      isActive: data.isActive ?? user.isActive,
      updatedBy: requestingUserId,
    };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, username: true, fullName: true, email: true,
        phone: true, role: true, hotelId: true, isActive: true,
        hotel: { select: { id: true, name: true } },
      },
    });
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}
