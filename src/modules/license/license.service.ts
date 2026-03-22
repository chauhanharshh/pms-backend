import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { UserRole } from '@prisma/client';

type CreateLicenseInput = {
  hotelId: string;
  planType: 'monthly' | 'annual';
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

const GRACE_PERIOD_DAYS = 3;
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

let initialized = false;

export class LicenseService {
  async ensureTables() {
    if (initialized) return;

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "licenses" (
        "id" UUID PRIMARY KEY,
        "hotelId" UUID NOT NULL REFERENCES "hotels"("id") ON DELETE CASCADE,
        "licenseKey" VARCHAR(64) NOT NULL UNIQUE,
        "planType" VARCHAR(20) NOT NULL,
        "durationMonths" INTEGER NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "startDate" DATE NOT NULL,
        "expiryDate" DATE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'active',
        "createdBy" UUID NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_licenses_hotel" ON "licenses"("hotelId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "license_devices" (
        "id" UUID PRIMARY KEY,
        "licenseId" UUID NOT NULL REFERENCES "licenses"("id") ON DELETE CASCADE,
        "deviceName" VARCHAR(200) NULL,
        "os" VARCHAR(100) NULL,
        "ip" VARCHAR(100) NULL,
        "version" VARCHAR(100) NULL,
        "lastActive" TIMESTAMP NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_license_devices_unique" ON "license_devices"("licenseId", "deviceName", "ip");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "license_payments" (
        "id" UUID PRIMARY KEY,
        "licenseId" UUID NOT NULL REFERENCES "licenses"("id") ON DELETE CASCADE,
        "hotelId" UUID NOT NULL REFERENCES "hotels"("id") ON DELETE CASCADE,
        "amount" DECIMAL(12,2) NOT NULL,
        "method" VARCHAR(50) NOT NULL,
        "notes" TEXT NULL,
        "extendedFrom" DATE NULL,
        "extendedTo" DATE NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_license_payments_license" ON "license_payments"("licenseId");
    `);

    initialized = true;
  }

  generateLicenseKey() {
    const alphaNum = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () => Array.from({ length: 4 }, () => alphaNum[Math.floor(Math.random() * alphaNum.length)]).join('');
    return `HTLS-${part()}-${part()}-${part()}-${part()}`;
  }

  async createLicense(input: CreateLicenseInput, createdBy?: string) {
    await this.ensureTables();

    if (!input.hotelId) throw new BadRequestError('hotelId is required');
    if (![1, 3, 6, 12].includes(Number(input.durationMonths))) {
      throw new BadRequestError('durationMonths must be one of 1, 3, 6, 12');
    }

    const startDate = input.startDate ? toDateOnly(new Date(input.startDate)) : toDateOnly(new Date());
    if (Number.isNaN(startDate.getTime())) throw new BadRequestError('Invalid startDate');

    const expiryDate = addMonths(startDate, Number(input.durationMonths));

    let key = this.generateLicenseKey();
    // Retry a few times for unique collision resistance.
    for (let i = 0; i < 5; i += 1) {
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "licenses" WHERE "licenseKey" = ${key} LIMIT 1
      `;
      if (existing.length === 0) break;
      key = this.generateLicenseKey();
    }

    const id = randomUUID();
    const computed = computeStatus(expiryDate);

    await prisma.$executeRaw`
      INSERT INTO "licenses"
      ("id", "hotelId", "licenseKey", "planType", "durationMonths", "amount", "startDate", "expiryDate", "status", "createdBy", "updatedAt")
      VALUES
      (${id}::uuid, ${input.hotelId}::uuid, ${key}, ${input.planType}, ${Number(input.durationMonths)}, ${Number(input.amount)}, ${startDate}, ${expiryDate}, ${computed.status}, ${createdBy ?? null}::uuid, NOW())
    `;

    const [created] = await prisma.$queryRaw<Array<any>>`
      SELECT l."id", l."hotelId", h."name" AS "hotelName", l."licenseKey", l."planType", l."durationMonths", l."amount",
             l."startDate", l."expiryDate", l."status", l."createdAt", l."updatedAt"
      FROM "licenses" l
      JOIN "hotels" h ON h."id" = l."hotelId"
      WHERE l."id" = ${id}::uuid
      LIMIT 1
    `;

    return {
      ...created,
      statusLabel: statusLabel(created.status),
    };
  }

  async getAllLicenses() {
    await this.ensureTables();

    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT l."id", l."hotelId", h."name" AS "hotelName", l."licenseKey", l."planType", l."durationMonths", l."amount",
             l."startDate", l."expiryDate", l."status", l."createdAt", l."updatedAt",
             COALESCE(COUNT(d."id"), 0)::int AS "devices"
      FROM "licenses" l
      JOIN "hotels" h ON h."id" = l."hotelId"
      LEFT JOIN "license_devices" d ON d."licenseId" = l."id"
      GROUP BY l."id", h."name"
      ORDER BY l."createdAt" DESC
    `;

    const updates = rows
      .map((row) => ({ row, computed: computeStatus(new Date(row.expiryDate)) }))
      .filter(({ row, computed }) => row.status !== computed.status);

    if (updates.length > 0) {
      await Promise.all(
        updates.map(({ row, computed }) => prisma.$executeRaw`
          UPDATE "licenses" SET "status" = ${computed.status}, "updatedAt" = NOW() WHERE "id" = ${row.id}::uuid
        `),
      );
    }

    return rows.map((row) => {
      const computed = computeStatus(new Date(row.expiryDate));
      return {
        ...row,
        status: computed.status,
        statusLabel: statusLabel(computed.status),
        daysLeft: computed.daysLeft,
      };
    });
  }

  async extendLicense(input: ExtendLicenseInput) {
    await this.ensureTables();

    if (![1, 3, 6, 12].includes(Number(input.extendMonths))) {
      throw new BadRequestError('extendMonths must be one of 1, 3, 6, 12');
    }

    const [license] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM "licenses" WHERE "id" = ${input.licenseId}::uuid LIMIT 1
    `;

    if (!license) throw new NotFoundError('License not found');

    const today = toDateOnly(new Date());
    const currentExpiry = toDateOnly(new Date(license.expiryDate));
    const effectiveStart = currentExpiry > today ? currentExpiry : today;
    const newExpiry = addMonths(effectiveStart, Number(input.extendMonths));
    const computed = computeStatus(newExpiry);

    await prisma.$executeRaw`
      UPDATE "licenses"
      SET "expiryDate" = ${newExpiry},
          "status" = ${computed.status},
          "updatedAt" = NOW()
      WHERE "id" = ${input.licenseId}::uuid
    `;

    await prisma.$executeRaw`
      INSERT INTO "license_payments"
      ("id", "licenseId", "hotelId", "amount", "method", "notes", "extendedFrom", "extendedTo")
      VALUES
      (${randomUUID()}::uuid, ${input.licenseId}::uuid, ${license.hotelId}::uuid, ${Number(input.amount)}, ${input.paymentMethod}, ${input.notes ?? null}, ${currentExpiry}, ${newExpiry})
    `;

    const [updated] = await prisma.$queryRaw<Array<any>>`
      SELECT l."id", l."hotelId", h."name" AS "hotelName", l."licenseKey", l."planType", l."durationMonths", l."amount",
             l."startDate", l."expiryDate", l."status", l."createdAt", l."updatedAt"
      FROM "licenses" l
      JOIN "hotels" h ON h."id" = l."hotelId"
      WHERE l."id" = ${input.licenseId}::uuid
      LIMIT 1
    `;

    return {
      ...updated,
      statusLabel: statusLabel(updated.status),
    };
  }

  async getLicenseDevices(licenseId: string) {
    await this.ensureTables();

    return prisma.$queryRaw<Array<any>>`
      SELECT d."id", d."deviceName", d."os", d."ip", d."version", d."lastActive"
      FROM "license_devices" d
      WHERE d."licenseId" = ${licenseId}::uuid
      ORDER BY d."lastActive" DESC
    `;
  }

  async getLicensePayments(licenseId: string) {
    await this.ensureTables();

    return prisma.$queryRaw<Array<any>>`
      SELECT p."id", p."amount", p."method", p."notes", p."extendedFrom", p."extendedTo", p."createdAt"
      FROM "license_payments" p
      WHERE p."licenseId" = ${licenseId}::uuid
      ORDER BY p."createdAt" DESC
    `;
  }

  async checkLicense(input: CheckLicenseInput) {
    await this.ensureTables();

    if (!input.licenseKey?.trim()) throw new BadRequestError('licenseKey is required');

    const [license] = await prisma.$queryRaw<Array<any>>`
      SELECT l."id", l."hotelId", h."name" AS "hotelName", l."licenseKey", l."planType", l."startDate", l."expiryDate"
      FROM "licenses" l
      JOIN "hotels" h ON h."id" = l."hotelId"
      WHERE l."licenseKey" = ${input.licenseKey.trim()}
      LIMIT 1
    `;

    if (!license) {
      return { valid: false, status: 'expired', statusLabel: statusLabel('expired') };
    }

    const computed = computeStatus(new Date(license.expiryDate));
    await prisma.$executeRaw`
      UPDATE "licenses" SET "status" = ${computed.status}, "updatedAt" = NOW() WHERE "id" = ${license.id}::uuid
    `;

    if (input.deviceName || input.ip) {
      await prisma.$executeRaw`
        INSERT INTO "license_devices"
        ("id", "licenseId", "deviceName", "os", "ip", "version", "lastActive")
        VALUES
        (${randomUUID()}::uuid, ${license.id}::uuid, ${input.deviceName ?? null}, ${input.os ?? null}, ${input.ip ?? null}, ${input.version ?? null}, NOW())
        ON CONFLICT ("licenseId", "deviceName", "ip")
        DO UPDATE SET "os" = EXCLUDED."os", "version" = EXCLUDED."version", "lastActive" = NOW()
      `;
    }

    return {
      valid: computed.status !== 'expired',
      status: computed.status,
      statusLabel: statusLabel(computed.status),
      daysLeft: computed.daysLeft,
      hotelId: license.hotelId,
      hotelName: license.hotelName,
      planType: license.planType,
      expiryDate: license.expiryDate,
    };
  }

  async activateLicense(input: ActivateLicenseInput) {
    await this.ensureTables();

    const key = input.licenseKey?.trim();
    if (!key) throw new BadRequestError('licenseKey is required');

    const [license] = await prisma.$queryRaw<Array<any>>`
      SELECT l."id", l."hotelId", l."licenseKey", l."status", l."expiryDate", h."name" AS "hotelName"
      FROM "licenses" l
      JOIN "hotels" h ON h."id" = l."hotelId"
      WHERE l."licenseKey" = ${key}
      LIMIT 1
    `;

    if (!license) {
      throw new BadRequestError('Invalid license key');
    }

    const allowedHotelIds = new Set<string>();
    if (input.hotelId) {
      allowedHotelIds.add(input.hotelId);
    }

    if (input.role === 'admin') {
      const ownedHotels = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "hotels" WHERE "adminId" = ${input.userId}::uuid
      `;
      for (const hotel of ownedHotels) {
        allowedHotelIds.add(hotel.id);
      }
    }

    if (!allowedHotelIds.has(license.hotelId)) {
      throw new BadRequestError('This license key is not assigned to your account');
    }

    const computed = computeStatus(new Date(license.expiryDate));
    await prisma.$executeRaw`
      UPDATE "licenses" SET "status" = ${computed.status}, "updatedAt" = NOW() WHERE "id" = ${license.id}::uuid
    `;

    if (computed.status === 'expired') {
      throw new BadRequestError('License has expired. Please contact support to renew.');
    }

    return {
      success: true,
      message: 'License activated successfully',
      status: computed.status,
      statusLabel: statusLabel(computed.status),
      expiryDate: license.expiryDate,
      hotelId: license.hotelId,
      hotelName: license.hotelName,
    };
  }
}
