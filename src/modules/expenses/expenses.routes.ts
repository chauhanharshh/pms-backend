import { Router } from 'express';
import { ExpensesController } from './expenses.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const expensesController = new ExpensesController();

router.use(authenticate);

router.get('/', expensesController.getExpenses.bind(expensesController));
router.post('/', expensesController.createExpense.bind(expensesController));
router.put('/:id', expensesController.updateExpense.bind(expensesController));
router.delete('/:id', expensesController.deleteExpense.bind(expensesController));

export default router;
