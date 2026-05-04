/**
 * Search Controller - Handles search API requests
 */

const { SearchService } = require('../services/searchService');
const { getIndexManager } = require('../services/indexManagerSingleton');

// Get shared IndexManager instance
const indexManager = getIndexManager();
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

    // Get DSA visualization data for the frontend
    const dsaVisualization = {
      searchType: results.performance?.searchType || 'unknown',
      trieVisited: 0,
      suffixArrayComparisons: 0,
      bPlusNodesVisited: 0,
      avlComparisons: 0,
      heapOperations: 0,
      totalCandidates: results.pagination?.total || 0,
      executionTime: parseInt(results.performance?.executionTime) || 0,
    };

    // Calculate DSA operations based on search type
    if (searchParams.prefix) {
      const saStats = indexManager.suffixArray.getStats();
      // Suffix Array: binary search = O(m·log n) comparisons
      dsaVisualization.suffixArrayComparisons = Math.ceil(
        searchParams.prefix.length * Math.log2(Math.max(saStats.suffixArraySize, 1))
      );
      // Trie: path length traversal
      dsaVisualization.trieVisited = searchParams.prefix.length + 1;
    }
    if (searchParams.sizeMin !== undefined || searchParams.sizeMax !== undefined) {
      dsaVisualization.bPlusNodesVisited = Math.ceil(Math.log2(results.pagination?.total || 100) * 2);
    }
    if (searchParams.tag) {
      dsaVisualization.avlComparisons = Math.ceil(Math.log2(indexManager.getStats().avlTreeTags?.nodeCount || 1000));
    }
    if (searchParams.topK) {
      dsaVisualization.heapOperations = searchParams.topK * Math.ceil(Math.log2(indexManager.getStats().heaps?.maxHeapSize || 1000));
    }

    return res.status(200).json({
      success: true,
      data: results.files,
      pagination: results.pagination,
      performance: results.performance,
      dsaVisualization, // New: DSA structure visualization data
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
