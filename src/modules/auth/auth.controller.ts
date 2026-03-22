import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { AuthService } from './auth.service';
import { ResponseHandler } from '../../utils/response';
import { googleLoginSchema, loginSchema, registerSchema } from './auth.validation';

const authService = new AuthService();

export class AuthController {
  async getBranding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const username = req.query.username as string | undefined;
      const branding = await authService.getBrandingByUsername(username);
      return ResponseHandler.success(res, branding);
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);
      return ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);
      return ResponseHandler.success(res, result, 'Registration submitted. Awaiting approval.', 201);
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const input = googleLoginSchema.parse(req.body);
      const result = await authService.googleLogin(input.credential);
      return ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await authService.getProfile(userId);
      return ResponseHandler.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // Server can implement token blacklisting if needed
      return ResponseHandler.success(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }
}
