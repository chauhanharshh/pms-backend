import { Response } from 'express';

export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'fail';
  data?: T;
  message?: string;
  errors?: any;
}

export class ResponseHandler {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
    const response: ApiResponse<T> = {
      status: 'success',
      data,
      message,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode: number = 500, errors?: any) {
    const response: ApiResponse = {
      status: 'error',
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static fail(res: Response, message: string, statusCode: number = 400, errors?: any) {
    const response: ApiResponse = {
      status: 'fail',
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string) {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
