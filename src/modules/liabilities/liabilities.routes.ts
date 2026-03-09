import { Router } from 'express';
import { LiabilitiesController } from './liabilities.controller';
import { authenticate } from '../../middleware/authenticate';

import { tenantIsolation } from '../../middleware/tenantIsolation';
const router = Router();
const liabilitiesController = new LiabilitiesController();

router.use(authenticate, tenantIsolation);

router.get('/', liabilitiesController.getLiabilities);
router.post('/', liabilitiesController.createLiability);
router.patch('/:id', liabilitiesController.updateLiability);
router.post('/:id/payments', liabilitiesController.addPayment);
router.delete('/:id', liabilitiesController.deleteLiability);

export default router;
