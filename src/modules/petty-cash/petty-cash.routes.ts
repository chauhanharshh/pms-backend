import { Router } from 'express';
import { PettyCashController } from './petty-cash.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const pettyCashController = new PettyCashController();

router.use(authenticate);

router.get('/', pettyCashController.getTxns);
router.post('/', pettyCashController.createTxn);
router.delete('/:id', pettyCashController.deleteTxn);

export default router;
