/**
 * Crawler Controller — API endpoints for web crawling
 */

const { CrawlerService } = require('../services/crawlerService');
const { getIndexManager } = require('../services/indexManagerSingleton');

const indexManager = getIndexManager();
const crawlerService = new CrawlerService(indexManager);

/**
 * POST /api/v1/crawler/crawl
 * Start a web crawl — returns SSE stream with real-time updates
 */
async function startCrawl(req, res) {
  const { url, maxDepth = 3, maxPages = 30, algorithm = 'bfs' } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  // Validate algorithm
  if (!['bfs', 'dfs'].includes(algorithm)) {
    return res.status(400).json({ success: false, error: 'Algorithm must be "bfs" or "dfs"' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  console.log(`[Crawler] Starting ${algorithm.toUpperCase()} crawl: ${url} (depth=${maxDepth}, max=${maxPages})`);

  try {
    await crawlerService.crawl(
      { url, maxDepth: Math.min(maxDepth, 10), maxPages: Math.min(maxPages, 100), algorithm },
      (update) => {
        try {
          res.write(`data: ${JSON.stringify(update)}\n\n`);
        } catch (e) {
          // Client disconnected
        }
      }
    );
  } catch (error) {
    console.error('[Crawler] Crawl error:', error.message);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    } catch {}
  } finally {
    res.end();
  }
}

/**
 * GET /api/v1/crawler/results
 * Get all crawled pages
 */
function getCrawledPages(req, res) {
  try {
    const pages = crawlerService.getCrawledPages();
    return res.status(200).json({
      success: true,
      data: pages,
      total: pages.length,
    });
  } catch (error) {
    console.error('[Crawler] Get results error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/v1/crawler/results
 * Clear all crawled pages
 */
async function clearCrawledPages(req, res) {
  try {
    const count = await crawlerService.clearCrawledPages();
    return res.status(200).json({
      success: true,
      message: `Cleared ${count} crawled pages`,
      deleted: count,
    });
  } catch (error) {
    console.error('[Crawler] Clear error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { startCrawl, getCrawledPages, clearCrawledPages };
