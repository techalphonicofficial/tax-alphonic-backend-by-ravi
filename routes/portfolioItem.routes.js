const express = require('express');
const router = express.Router();
const PortfolioItemController = require('../controllers/PortfolioItemController');


router.post('/', PortfolioItemController.createItem);
router.get('/', PortfolioItemController.getItems);
router.get('/:id', PortfolioItemController.getItemById);
router.put('/:id', PortfolioItemController.updateItem);
router.delete('/:id', PortfolioItemController.deleteItem);

module.exports = router;
