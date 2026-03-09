import { z } from 'zod';

export const createStewardSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
        isActive: z.boolean().optional(),
        hotelId: z.string().uuid('Invalid Hotel ID').optional(),
    }),
});

export const updateStewardSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
        isActive: z.boolean().optional(),
        hotelId: z.string().uuid('Invalid Hotel ID').optional(),
    }),
});

export type CreateStewardInput = z.infer<typeof createStewardSchema>['body'];
export type UpdateStewardInput = z.infer<typeof updateStewardSchema>['body'];
