import { Router } from 'express';
import { getSystemSettings, updateSystemSettings } from './system-settings.controller';
import { authenticate } from '../../middleware/authenticate';
import { adminOnly } from '../../guards/authorization';

const router = Router();

router.get('/theme', getSystemSettings);

// Only authenticated users can access, but controller or middleware should check for admin
router.use(authenticate);

router.put('/theme', adminOnly, updateSystemSettings);

export default router;
