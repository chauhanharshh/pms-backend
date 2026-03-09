import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { JwtUtil } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = JwtUtil.verify(token);

    req.user = {
      userId: decoded.userId,
      hotelId: decoded.hotelId,
      role: decoded.role as any,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    next(error);
  }
};
