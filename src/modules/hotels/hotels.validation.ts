import { z } from 'zod';

export const createHotelSchema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  brandName: z.string().max(255).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  gstNumber: z.string().optional().nullable(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).default('14:00'),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).default('12:00'),
  taxRate: z.preprocess((val) => (val === '' ? undefined : typeof val === 'string' ? parseFloat(val) : val), z.number().min(0).max(100).optional().default(12)),
  currency: z.string().length(3).default('INR'),
  floors: z.preprocess((val) => (val === '' ? null : typeof val === 'string' ? parseInt(val, 10) : val), z.number().min(1).optional().nullable()),
  totalRooms: z.preprocess((val) => (val === '' ? null : typeof val === 'string' ? parseInt(val, 10) : val), z.number().min(0).optional().nullable()),
  rating: z.preprocess((val) => (val === '' ? null : typeof val === 'string' ? parseFloat(val) : val), z.number().min(0).max(5).optional().nullable()),
  isActive: z.boolean().optional(),
  sidebarColor: z.string().optional().nullable(),
  headerColor: z.string().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  isCustomTheme: z.boolean().optional(),
  posBossMode: z.boolean().optional(),
  showAllRooms: z.boolean().optional(),
  invoiceShowCustomLines: z.boolean().optional(),
  invoiceLine1: z.string().optional().nullable(),
  invoiceLine2: z.string().optional().nullable(),
  invoiceLine1Size: z.preprocess((val) => (val === '' ? undefined : typeof val === 'string' ? parseInt(val, 10) : val), z.number().min(8).max(40).optional().default(14)),
  invoiceLine2Size: z.preprocess((val) => (val === '' ? undefined : typeof val === 'string' ? parseInt(val, 10) : val), z.number().min(8).max(40).optional().default(16)),
  invoiceHotelNameColor: z.string().optional().nullable(),
  invoiceHeaderColor: z.string().optional().nullable(),
  showInvoiceWatermark: z.boolean().optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

export type CreateHotelInput = z.infer<typeof createHotelSchema>;
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;
