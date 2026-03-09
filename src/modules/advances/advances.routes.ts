import { Router } from 'express';
import { AdvancesController } from './advances.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const advancesController = new AdvancesController();

router.use(authenticate);

router.get('/', advancesController.getAdvances.bind(advancesController));
router.post('/', advancesController.createAdvance.bind(advancesController));
router.put('/:id', advancesController.updateAdvance.bind(advancesController));
router.delete('/:id', advancesController.deleteAdvance.bind(advancesController));

export default router;
