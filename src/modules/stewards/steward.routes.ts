import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { tenantIsolation } from '../../middleware/tenantIsolation';
import { StewardService } from './steward.service';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { validate } from '../../middleware/validate';
import { createStewardSchema, updateStewardSchema } from './steward.schema';

const router = Router();
const stewardService = new StewardService();

router.use(authenticate, tenantIsolation);

// Get all stewards by hotel
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || req.query.hotelId as string;
        const stewards = await stewardService.getStewardsByHotel(hotelId);
        res.json({ status: 'success', data: stewards });
    } catch (e) { next(e); }
});

// Create steward
router.post('/', validate(createStewardSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        console.log('--- POST /api/v1/stewards ---');
        console.log('Body:', req.body);
        console.log('User:', req.user);

        const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
        console.log('Resolved Hotel ID:', hotelId);

        if (!hotelId) throw new Error("Hotel ID is required");

        const steward = await stewardService.createSteward(req.body, hotelId);
        console.log('Successfully created steward:', steward);
        res.status(201).json({ status: 'success', data: steward });
    } catch (e) {
        console.error('Error in steward creation route:', e);
        next(e);
    }
});

// Update steward
router.put('/:id', validate(updateStewardSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || req.body.hotelId;
        if (!hotelId) throw new Error("Hotel ID is required");

        const steward = await stewardService.updateSteward(req.params.id, hotelId, req.body);
        res.json({ status: 'success', data: steward });
    } catch (e) { next(e); }
});

// Delete steward
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hotelId = req.hotelId || req.user?.hotelId || (req.query.hotelId as string);
        if (!hotelId) throw new Error("Hotel ID is required");

        await stewardService.deleteSteward(req.params.id, hotelId);
        res.json({ status: 'success', message: 'Steward deleted successfully' });
    } catch (e) { next(e); }
});

export default router;
