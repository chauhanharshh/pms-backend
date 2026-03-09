import { Router } from 'express';
import { RoomBlocksController } from './room-blocks.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const roomBlocksController = new RoomBlocksController();

router.use(authenticate);

router.get('/', roomBlocksController.getBlocks);
router.post('/', roomBlocksController.createBlock);
router.patch('/:id', roomBlocksController.updateBlock);
router.delete('/:id', roomBlocksController.deleteBlock);

export default router;
