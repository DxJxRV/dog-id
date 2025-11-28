const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticateUserOrVet } = require('../middlewares/auth');

router.get('/search', authenticateUserOrVet, searchController.globalSearch);

module.exports = router;
