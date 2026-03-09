import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      // Avoid logging full sensitive headers if necessary, but keep basic info
      userAgent: req.headers['user-agent'],
    },
  }, err.message || 'Unhandled error');

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'fail',
        message: 'Unique constraint violation',
        errors: err.meta,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'fail',
        message: 'Record not found',
      });
    }
  }

  // Custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode < 500 ? 'fail' : 'error',
      message: err.message,
    });
  }

  // Default server error
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
