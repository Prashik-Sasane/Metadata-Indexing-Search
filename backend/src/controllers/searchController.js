/**
 * Search Controller - Handles search API requests
 */

const { SearchService } = require('../services/searchService');
const { IndexManager } = require('../../dsa/indexManager');

// Singleton instances
const indexManager = new IndexManager();
const searchService = new SearchService(indexManager);

/**
 * GET /api/v1/search
 * Search files using DSA-powered indexes
 */
async function search(req, res, next) {
  try {
    const searchParams = {
      prefix: req.query.prefix,
      sizeMin: req.query.sizeMin,
      sizeMax: req.query.sizeMax,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      tag: req.query.tag,
      owner: req.query.owner,
      topK: req.query.topK,
      sort: req.query.sort,
      page: req.query.page || 1,
      limit: req.query.limit || 50,
    };

    const results = await searchService.search(searchParams);

    return res.status(200).json({
      success: true,
      data: results.files,
      pagination: results.pagination,
      performance: results.performance,
    });
  } catch (error) {
    console.error('[SearchController] Search error:', error.message);
    next(error);
  }
}

/**
 * GET /api/v1/search/suggestions
 * Get prefix suggestions for autocomplete
 */
async function getPrefixSuggestions(req, res, next) {
  try {
    const { prefix, limit = 10 } = req.query;

    if (!prefix) {
      return res.status(400).json({
        success: false,
        error: 'Prefix query parameter is required',
      });
    }

    const suggestions = await searchService.getPrefixSuggestions(prefix, parseInt(limit));

    return res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('[SearchController] Get suggestions error:', error.message);
    next(error);
  }
}

/**
 * GET /api/v1/search/stats
 * Get search and index statistics
 */
async function getSearchStats(req, res, next) {
  try {
    const stats = await searchService.getSearchStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[SearchController] Get stats error:', error.message);
    next(error);
  }
}

module.exports = {
  search,
  getPrefixSuggestions,
  getSearchStats,
};
