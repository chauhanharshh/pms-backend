import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { UserRole } from '@prisma/client';

type CreateLicenseInput = {
  hotelId?: string;
  adminId?: string;
  plan: 'monthly' | 'annual';
  durationMonths: number;
  amount: number;
  startDate?: string;
};

type ExtendLicenseInput = {
  licenseId: string;
  extendMonths: number;
  amount: number;
  paymentMethod: string;
  notes?: string;
};

type CheckLicenseInput = {
  licenseKey: string;
  deviceName?: string;
  os?: string;
  ip?: string;
  version?: string;
};

type ActivateLicenseInput = {
  licenseKey: string;
  userId: string;
  role: UserRole;
  hotelId?: string;
};

const GRACE_PERIOD_DAYS = 7;
const READ_ONLY_PERIOD_DAYS = 15;

const toDateOnly = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addMonths = (date: Date, months: number) => {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const diffInDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));

const computeStatus = (expiryDate: Date) => {
  const today = toDateOnly(new Date());
  const expiry = toDateOnly(expiryDate);
  const daysPast = diffInDays(today, expiry);
  const daysLeft = diffInDays(expiry, today);

  if (daysPast <= 0) {
    if (daysLeft <= 7) return { status: 'expiring_soon', daysLeft };
    return { status: 'active', daysLeft };
  }

  if (daysPast <= GRACE_PERIOD_DAYS) return { status: 'grace_period', daysLeft: 0 };
  if (daysPast <= READ_ONLY_PERIOD_DAYS) return { status: 'read_only', daysLeft: 0 };
  return { status: 'expired', daysLeft: 0 };
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'grace_period':
      return 'Grace Period';
    case 'read_only':
      return 'Read Only';
    case 'expired':
      return 'Expired';
    case 'expiring_soon':
      return 'Expiring Soon';
    default:
      return 'Active';
  }
};

export class LicenseService {
  generateLicenseKey() {
    const alphaNum = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () => Array.from({ length: 4 }, () => alphaNum[Math.floor(Math.random() * alphaNum.length)]).join('');
    return `HTLS-${part()}-${part()}-${part()}-${part()}`;
  }

  async createLicense(input: CreateLicenseInput, createdBy?: string) {
    const resolvedAdminId = input.adminId?.trim() || undefined;
    if (!resolvedAdminId) {
      throw new BadRequestError('adminId is required');
    }
    if (![1, 3, 6, 12].includes(Number(input.durationMonths))) {
      throw new BadRequestError('durationMonths must be one of 1, 3, 6, 12');
    }

    const startDate = input.startDate ? toDateOnly(new Date(input.startDate)) : toDateOnly(new Date());
    if (Number.isNaN(startDate.getTime())) throw new BadRequestError('Invalid startDate');

    const expiryDate = addMonths(startDate, Number(input.durationMonths));

    let key = this.generateLicenseKey();
    // Retry a few times for unique collision resistance.
    for (let i = 0; i < 5; i += 1) {
      const existing = await (prisma as any).license.findUnique({
        where: { licenseKey: key },
        select: { id: true }
      });
      if (!existing) break;
      key = this.generateLicenseKey();
    }

    const computed = computeStatus(expiryDate);

    const created = await (prisma as any).license.create({
      data: {
        adminId: resolvedAdminId,
        licenseKey: key,
        plan: input.plan || 'monthly',
        amount: Number(input.amount) || 0,
        startDate,
        expiryDate,
        status: computed.status,
        gracePeriodDays: GRACE_PERIOD_DAYS,
        maxHotels: 1, // default
        createdBy: createdBy ?? null,
      },
      include: {
        admin: {
          select: {
            fullName: true,
            username: true,
          }
        }
      }
    });

    return {
      ...created,
      adminName: created.admin?.fullName,
      adminUsername: created.admin?.username,
      statusLabel: statusLabel(created.status),
    };
  }

  async getAllLicenses() {
    const licenses = await (prisma as any).license.findMany({
      include: {
        admin: {
          select: {
            fullName: true,
            username: true,
          }
        },
        _count: {
          select: { devices: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const results = [];
    for (const license of licenses) {
      const computed = computeStatus(new Date(license.expiryDate));
      
      if (license.status !== computed.status) {
        await (prisma as any).license.update({
          where: { id: license.id },
          data: { status: computed.status }
        });
        license.status = computed.status;
      }

      results.push({
        ...license,
        adminName: license.admin?.fullName,
        adminUsername: license.admin?.username,
        devices: license._count?.devices || 0,
        statusLabel: statusLabel(license.status),
        daysLeft: computed.daysLeft,
      });
    }

    return results;
  }

  async extendLicense(input: ExtendLicenseInput) {
    const license = await (prisma as any).license.findUnique({
      where: { id: input.licenseId }
    });

    if (!license) throw new NotFoundError('License not found');

    if (![1, 3, 6, 12].includes(Number(input.extendMonths))) {
      throw new BadRequestError('extendMonths must be one of 1, 3, 6, 12');
    }

    const today = toDateOnly(new Date());
    const currentExpiry = toDateOnly(new Date(license.expiryDate));
    const effectiveStart = currentExpiry > today ? currentExpiry : today;
    const newExpiry = addMonths(effectiveStart, Number(input.extendMonths));
    const computed = computeStatus(newExpiry);

    const updated = await (prisma as any).license.update({
      where: { id: input.licenseId },
      data: {
        expiryDate: newExpiry,
        status: computed.status,
        updatedAt: new Date(),
      },
      include: {
        admin: {
          select: {
            fullName: true,
            username: true,
          }
        }
      }
    });

    await (prisma as any).licensePayment.create({
      data: {
        licenseId: input.licenseId,
        amount: Number(input.amount),
        method: input.paymentMethod,
        notes: input.notes ?? null,
        extendedFrom: currentExpiry,
        extendedTo: newExpiry,
      }
    });

    return {
      ...updated,
      adminName: updated.admin?.fullName,
      adminUsername: updated.admin?.username,
      statusLabel: statusLabel(updated.status),
    };
  }

  async getLicenseDevices(licenseId: string) {
    return (prisma as any).licenseDevice.findMany({
      where: { licenseId },
      orderBy: { lastActive: 'desc' }
    });
  }

  async getLicensePayments(licenseId: string) {
    return (prisma as any).licensePayment.findMany({
      where: { licenseId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async checkLicense(input: CheckLicenseInput) {
    if (!input.licenseKey?.trim()) throw new BadRequestError('licenseKey is required');

    const license = await (prisma as any).license.findUnique({
      where: { licenseKey: input.licenseKey.trim() }
    });

    if (!license) {
      return { valid: false, status: 'expired', statusLabel: statusLabel('expired') };
    }

    const computed = computeStatus(new Date(license.expiryDate));
    if (license.status !== computed.status) {
      await (prisma as any).license.update({
        where: { id: license.id },
        data: { status: computed.status }
      });
    }

    if (input.deviceName || input.ip) {
      await (prisma as any).licenseDevice.upsert({
        where: {
          licenseId_deviceName_ip: {
            licenseId: license.id,
            deviceName: input.deviceName ?? null,
            ip: input.ip ?? null,
          }
        },
        create: {
          licenseId: license.id,
          deviceName: input.deviceName ?? null,
          os: input.os ?? null,
          ip: input.ip ?? null,
          version: input.version ?? null,
        },
        update: {
          os: input.os ?? null,
          version: input.version ?? null,
          lastActive: new Date(),
        }
      });
    }

    return {
      valid: computed.status !== 'expired',
      status: computed.status,
      statusLabel: statusLabel(computed.status),
      daysLeft: computed.daysLeft,
      adminId: license.adminId,
      plan: license.plan,
      expiryDate: license.expiryDate,
    };
  }

  async activateLicense(input: ActivateLicenseInput & { adminId?: string }) {
    const key = input.licenseKey?.trim();
    if (!key) throw new BadRequestError('licenseKey is required');

    const user = await (prisma as any).user.findUnique({
      where: { id: input.userId },
      include: {
        hotel: {
          select: { adminId: true }
        }
      }
    });

    const adminId =
      user?.role === 'admin' || user?.role === 'hotel_manager'
        ? user.id                    // they ARE the admin
        : user?.hotel?.adminId;      // hotel staff → their hotel's admin

    if (!adminId) {
      throw new BadRequestError('Could not resolve administrator for this account');
    }

    const license = await (prisma as any).license.findUnique({
      where: { licenseKey: key }
    });

    if (!license) {
      throw new BadRequestError('Invalid license key');
    }

    if (license.adminId !== adminId) {
      throw new BadRequestError('This license key is not assigned to your account');
    }

    const computed = computeStatus(new Date(license.expiryDate));
    if (license.status !== computed.status) {
      await (prisma as any).license.update({
        where: { id: license.id },
        data: { status: computed.status }
      });
    }

    if (computed.status === 'expired') {
      throw new BadRequestError('License has expired. Please contact support to renew.');
    }

    return {
      success: true,
      message: 'License activated successfully',
      status: computed.status,
      statusLabel: statusLabel(computed.status),
      expiryDate: license.expiryDate,
      adminId: license.adminId,
    };
  }

  async checkStaffLicense(userId: string) {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            adminId: true,
          }
        }
      }
    });

    if (!user?.hotel?.adminId) {
      return {
        valid: false,
        message: 'No hotel or admin found for this account.'
      };
    }

    const adminId = user.hotel.adminId;

    const license = await (prisma as any).license.findUnique({
      where: { adminId }
    });

    if (!license) {
      return {
        valid: false,
        message: 'License is not activated. Please contact your administrator.'
      };
    }

    const now = new Date();
    const graceEnd = new Date(license.expiryDate);
    graceEnd.setDate(graceEnd.getDate() + (license.gracePeriodDays || 7));

    if (now > graceEnd) {
      return {
        valid: false,
        message: 'Your plan has expired. Please contact your administrator to renew.'
      };
    }

    return {
      valid: true,
      message: 'License active',
      adminId,
      licenseKey: license.licenseKey,
      expiryDate: license.expiryDate,
      status: license.status
    };
  }
}
