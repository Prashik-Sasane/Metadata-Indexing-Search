const express = require('express');
const {
  search,
  getPrefixSuggestions,
  getSearchStats,
} = require('../controllers/searchController');

const router = express.Router();

router.get('/search', search);
router.get('/search/suggestions', getPrefixSuggestions);
router.get('/search/stats', getSearchStats);

module.exports = router;
