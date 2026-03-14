import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { JwtUtil } from '../../utils/jwt';
import { UnauthorizedError, BadRequestError } from '../../utils/errors';
import { LoginInput } from './auth.validation';
import logger from '../../utils/logger';

export class AuthService {
  async getBrandingByUsername(username?: string) {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) {
      return {
        brandName: null,
        logoUrl: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            brandName: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user || !user.hotel) {
      return {
        brandName: null,
        logoUrl: null,
      };
    }

    return {
      brandName: user.hotel.brandName || null,
      logoUrl: user.hotel.logoUrl || null,
      hotelName: user.hotel.name,
    };
  }

  private async ensureSuperAdminEnumValue() {
    // Defensive runtime migration for environments where DB migration was skipped.
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'super_admin';
      EXCEPTION
          WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  private async ensureDefaultSuperAdmin() {
    await this.ensureSuperAdminEnumValue();

    const passwordHash = await bcrypt.hash('superadmin123', 10);

    await prisma.user.upsert({
      where: { username: 'superadmin' },
      update: {
        passwordHash,
        role: 'super_admin' as any,
        hotelId: null,
        isActive: true,
        fullName: 'Super Administrator',
      },
      create: {
        username: 'superadmin',
        passwordHash,
        fullName: 'Super Administrator',
        role: 'super_admin' as any,
        hotelId: null,
        isActive: true,
      },
    });
  }

  async login(input: LoginInput) {
    try {
      // Keep a fixed bootstrap Super Admin account available across deployments.
      if (input.username === 'superadmin') {
        await this.ensureDefaultSuperAdmin();
      }

      const user = await prisma.user.findUnique({
        where: { username: input.username },
        include: { hotel: true },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }

      const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check hotel status for non-admin users
      if (user.hotelId && user.hotel && !user.hotel.isActive) {
        throw new UnauthorizedError('Hotel is deactivated');
      }

      const token = JwtUtil.sign({
        userId: user.id,
        hotelId: user.hotelId || undefined,
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          hotelId: user.hotelId,
          hotel: user.hotel ? {
            id: user.hotel.id,
            name: user.hotel.name,
            brandName: (user.hotel as any).brandName || null,
            logoUrl: (user.hotel as any).logoUrl || null,
          } : null,
        },
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new UnauthorizedError(`Login failed: ${msg}`);
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        hotelId: true,
        hotel: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }
}
