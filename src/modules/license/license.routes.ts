import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize, superAdminOnly } from '../../guards/authorization';
import { LicenseController } from './license.controller';

const router = Router();
const controller = new LicenseController();

router.post('/activate', authenticate, authorize('admin', 'hotel_manager'), controller.activate.bind(controller));

router.use(authenticate, superAdminOnly);

router.post('/create', controller.create.bind(controller));
router.get('/all', controller.getAll.bind(controller));
router.post('/extend', controller.extend.bind(controller));
router.get('/:id/devices', controller.devices.bind(controller));
router.get('/:id/payments', controller.payments.bind(controller));
router.post('/check', controller.check.bind(controller));

export default router;
