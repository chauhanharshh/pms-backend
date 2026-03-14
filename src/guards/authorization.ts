import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ForbiddenError } from '../utils/errors';
import { UserRole } from '@prisma/client';

/**
 * Role-based authorization guard
 * Checks if user has one of the required roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ForbiddenError('User not authenticated');
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin only guard
 */
export const adminOnly = authorize('admin', 'super_admin' as UserRole);

/**
 * Super Admin only guard
 */
export const superAdminOnly = authorize('super_admin' as UserRole);

/**
 * Admin and Super Admin guard
 */
export const adminAndAbove = authorize('admin', 'super_admin' as UserRole);

/**
 * Hotel manager and above guard
 */
export const managerAndAbove = authorize('admin', 'super_admin' as UserRole, 'hotel_manager');
