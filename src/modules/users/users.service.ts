import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';

export class UsersService {
  private isAdminLikeRole(role?: string) {
    return role === 'admin' || role === 'super_admin' || role === 'restaurant_admin';
  }

  private resolveMaxHotels(value: unknown, fallback = 1) {
    if (value == null || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestError('maxHotels must be an integer greater than or equal to 1');
    }
    return parsed;
  }

  private async mapAdminAccount(user: any) {
    const hotelsCount = await prisma.hotel.count({
      where: {
        OR: [
          { adminId: user.id },
          { adminId: null, createdBy: user.id },
        ],
      },
    });

    return {
      ...user,
      maxHotels: Number((user as any).maxHotels || 1),
      hotelsCount,
    };
  }

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

  async createUser(data: any, requestingUserId: string, requestingRole: string, requestingHotelId?: string) {
    if (requestingRole !== 'super_admin' && this.isAdminLikeRole(data.role)) {
      throw new ForbiddenError('Only Super Admin can create admin-level accounts');
    }

    if (requestingRole === 'admin' && requestingHotelId) {
      data.hotelId = requestingHotelId;
    }

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

  async updateUser(userId: string, data: any, requestingUserId: string, requestingRole: string, requestingHotelId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    if (requestingRole !== 'super_admin' && this.isAdminLikeRole(user.role)) {
      throw new ForbiddenError('Only Super Admin can edit admin-level accounts');
    }

    if (requestingRole !== 'super_admin' && this.isAdminLikeRole(data.role)) {
      throw new ForbiddenError('Only Super Admin can assign admin-level roles');
    }

    if (requestingRole === 'admin' && requestingHotelId && user.hotelId !== requestingHotelId) {
      throw new ForbiddenError('You can only update users from your assigned hotel');
    }

    if (requestingRole === 'admin' && requestingHotelId) {
      data.hotelId = requestingHotelId;
    }

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

  async deleteUser(userId: string, requestingRole: string, requestingHotelId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    if (requestingRole !== 'super_admin' && this.isAdminLikeRole(user.role)) {
      throw new ForbiddenError('Only Super Admin can deactivate admin-level accounts');
    }

    if (requestingRole === 'admin' && requestingHotelId && user.hotelId !== requestingHotelId) {
      throw new ForbiddenError('You can only deactivate users from your assigned hotel');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async getAdminAccounts() {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'restaurant_admin'] } },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        maxHotels: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(admins.map((admin) => this.mapAdminAccount(admin)));
  }

  async createAdminAccount(data: any, requestingUserId: string) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) throw new BadRequestError('Username already exists');
    if (!data.password) throw new BadRequestError('Password is required');

    const maxHotels = this.resolveMaxHotels(data.maxHotels, 1);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const created = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        maxHotels,
        role: data.role || 'admin',
        isActive: data.isActive ?? true,
        createdBy: requestingUserId,
        updatedBy: requestingUserId,
      } as any,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        maxHotels: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapAdminAccount(created);
  }

  async updateAdminAccount(userId: string, data: any, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User find failed');
    if (user.role !== 'admin' && user.role !== 'restaurant_admin') throw new BadRequestError('Only admin accounts can be edited from this panel');

    const updateData: any = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      isActive: data.isActive ?? user.isActive,
      updatedBy: requestingUserId,
    };

    if (data.maxHotels !== undefined) {
      updateData.maxHotels = this.resolveMaxHotels(data.maxHotels, Number((user as any).maxHotels || 1));
    }

    if (data.username && data.username !== user.username) {
      const usernameExists = await prisma.user.findUnique({ where: { username: data.username } });
      if (usernameExists) throw new BadRequestError('Username already exists');
      updateData.username = data.username;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        maxHotels: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapAdminAccount(updated);
  }

  async deleteAdminAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User delete failed');
    if (user.role !== 'admin' && user.role !== 'restaurant_admin') throw new BadRequestError('Only admin accounts can be deleted from this panel');

    return prisma.user.delete({
      where: { id: userId },
    });
  }

  async resetAdminPassword(userId: string, password: string, requestingUserId: string) {
    if (!password) throw new BadRequestError('Password is required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User reset failed');
    if (user.role !== 'admin' && user.role !== 'restaurant_admin') throw new BadRequestError('Password reset is only supported for admin accounts');

    const passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedBy: requestingUserId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        maxHotels: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return this.mapAdminAccount(updated);
  }

  async setAdminStatus(userId: string, isActive: boolean, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role !== 'admin' && user.role !== 'restaurant_admin') throw new BadRequestError('Status update is only supported for admin accounts');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        updatedBy: requestingUserId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        maxHotels: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return this.mapAdminAccount(updated);
  }
}
