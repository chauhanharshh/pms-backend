import { Router } from 'express';
import { MiscChargesController } from './misc-charges.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const miscChargesController = new MiscChargesController();

router.use(authenticate);

router.get('/', miscChargesController.getMiscCharges.bind(miscChargesController));
router.post('/', miscChargesController.createMiscCharge.bind(miscChargesController));
router.put('/:id', miscChargesController.updateMiscCharge.bind(miscChargesController));
router.delete('/:id', miscChargesController.deleteMiscCharge.bind(miscChargesController));

export default router;
