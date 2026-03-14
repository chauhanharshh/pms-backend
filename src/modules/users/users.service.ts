import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';

export class UsersService {
  private isAdminLikeRole(role?: string) {
    return role === 'admin' || role === 'super_admin';
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
    return prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        hotelId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        hotel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdminAccount(data: any, requestingUserId: string) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) throw new BadRequestError('Username already exists');
    if (!data.password) throw new BadRequestError('Password is required');

    const passwordHash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: 'admin',
        hotelId: data.hotelId || null,
        isActive: data.isActive ?? true,
        createdBy: requestingUserId,
        updatedBy: requestingUserId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        hotelId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        hotel: { select: { id: true, name: true } },
      },
    });
  }

  async updateAdminAccount(userId: string, data: any, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role !== 'admin') throw new BadRequestError('Only admin accounts can be edited from this panel');

    const updateData: any = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      hotelId: data.hotelId ?? user.hotelId,
      isActive: data.isActive ?? user.isActive,
      updatedBy: requestingUserId,
    };

    if (data.username && data.username !== user.username) {
      const usernameExists = await prisma.user.findUnique({ where: { username: data.username } });
      if (usernameExists) throw new BadRequestError('Username already exists');
      updateData.username = data.username;
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        hotelId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        hotel: { select: { id: true, name: true } },
      },
    });
  }

  async resetAdminPassword(userId: string, password: string, requestingUserId: string) {
    if (!password) throw new BadRequestError('Password is required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role !== 'admin') throw new BadRequestError('Password reset is only supported for admin accounts');

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.user.update({
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
        role: true,
        hotelId: true,
        isActive: true,
        updatedAt: true,
        hotel: { select: { id: true, name: true } },
      },
    });
  }

  async setAdminStatus(userId: string, isActive: boolean, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.role !== 'admin') throw new BadRequestError('Status update is only supported for admin accounts');

    return prisma.user.update({
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
        role: true,
        hotelId: true,
        isActive: true,
        updatedAt: true,
        hotel: { select: { id: true, name: true } },
      },
    });
  }
}
