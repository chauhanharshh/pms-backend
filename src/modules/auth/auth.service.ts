import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { JwtUtil } from '../../utils/jwt';
import { UnauthorizedError, BadRequestError, ConflictError } from '../../utils/errors';
import { LoginInput, RegisterInput } from './auth.validation';
import logger from '../../utils/logger';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env';

export class AuthService {
  private toAuthPayload(user: any) {
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
        maxHotels: Number((user as any).maxHotels || 1),
        hotelId: user.hotelId,
        hotel: user.hotel
          ? {
              id: user.hotel.id,
              name: user.hotel.name,
              brandName: (user.hotel as any).brandName || null,
              logoUrl: (user.hotel as any).logoUrl || null,
            }
          : null,
      },
    };
  }

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

      return this.toAuthPayload(user);
    } catch (error: any) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new UnauthorizedError(`Login failed: ${msg}`);
    }
  }

  async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.email }],
      },
    });

    if (existing) {
      throw new ConflictError('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const hotel = await prisma.hotel.create({
      data: {
        name: input.hotelName,
        isActive: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        username: input.username,
        passwordHash,
        role: 'hotel_manager',
        hotelId: hotel.id,
        isActive: false,
      },
    });

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
      hotelName: hotel.name,
      approvalStatus: 'pending',
    };
  }

  async googleLogin(credential: string) {
    if (!config.google.clientId) {
      throw new BadRequestError('Google login is not configured');
    }

    const client = new OAuth2Client(config.google.clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      throw new UnauthorizedError('Google account email not available');
    }

    const user = await prisma.user.findFirst({
      where: { email },
      include: { hotel: true },
    });

    if (!user) {
      throw new UnauthorizedError('No account found with this Google email');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (user.hotelId && user.hotel && !user.hotel.isActive) {
      throw new UnauthorizedError('Hotel is deactivated');
    }

    return this.toAuthPayload(user);
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
        maxHotels: true,
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
