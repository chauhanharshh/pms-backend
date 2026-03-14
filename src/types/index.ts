import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  hotelId?: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  hotelId?: string; // Tenant isolation
  file?: Express.Multer.File;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}
