import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { JwtUtil } from '../../utils/jwt';
import { UnauthorizedError, BadRequestError } from '../../utils/errors';
import { LoginInput } from './auth.validation';
import logger from '../../utils/logger';

export class AuthService {
  async login(input: LoginInput) {
    try {
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
