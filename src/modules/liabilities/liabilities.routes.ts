import { Router } from 'express';
import { LiabilitiesController } from './liabilities.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const liabilitiesController = new LiabilitiesController();

router.use(authenticate);

router.get('/', liabilitiesController.getLiabilities);
router.post('/', liabilitiesController.createLiability);
router.patch('/:id', liabilitiesController.updateLiability);
router.post('/:id/payments', liabilitiesController.addPayment);
router.delete('/:id', liabilitiesController.deleteLiability);

export default router;
