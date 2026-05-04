/**
 * Crawler Routes — API endpoints for web crawling
 */

const express = require('express');
const { startCrawl, getCrawledPages, clearCrawledPages } = require('../controllers/crawlerController');

const router = express.Router();

// Start a crawl (SSE stream)
router.post('/crawler/crawl', startCrawl);

// Get all crawled pages
router.get('/crawler/results', getCrawledPages);

// Clear all crawled pages
router.delete('/crawler/results', clearCrawledPages);

module.exports = router;
