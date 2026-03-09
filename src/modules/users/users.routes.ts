import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { adminOnly } from '../../guards/authorization';

const router = Router();
const usersController = new UsersController();

router.use(authenticate);

router.get('/', usersController.getAllUsers.bind(usersController));
router.post('/', adminOnly, usersController.createUser.bind(usersController));
router.put('/:id', adminOnly, usersController.updateUser.bind(usersController));
router.delete('/:id', adminOnly, usersController.deleteUser.bind(usersController));

export default router;
