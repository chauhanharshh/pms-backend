import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../types';
import { LicenseService } from './license.service';

const service = new LicenseService();

export class LicenseController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.createLicense(
        {
          hotelId: req.body.hotelId,
          adminId: req.body.adminId,
          plan: (req.body.planType || req.body.plan || 'monthly') as 'monthly' | 'annual',
          durationMonths: Number(req.body.durationMonths ?? req.body.duration),
          amount: Number(req.body.amount || 0),
          startDate: req.body.startDate,
        },
        req.user?.userId,
      );
      res.status(201).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.getAllLicenses();
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async extend(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.extendLicense({
        licenseId: req.body.licenseId,
        extendMonths: Number(req.body.extendMonths),
        amount: Number(req.body.amount || 0),
        paymentMethod: req.body.paymentMethod || 'cash',
        notes: req.body.notes,
      });
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async devices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.getLicenseDevices(req.params.id);
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async payments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.getLicensePayments(req.params.id);
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async check(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.checkLicense({
        licenseKey: req.body.licenseKey,
        deviceName: req.body.deviceName,
        os: req.body.os,
        ip: req.body.ip,
        version: req.body.version,
      });
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async activate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.activateLicense({
        licenseKey: req.body.licenseKey,
        userId: req.user!.userId,
        role: req.user!.role,
        hotelId: req.user?.hotelId,
      });
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async checkStaff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.checkStaffLicense(req.body.userId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}
