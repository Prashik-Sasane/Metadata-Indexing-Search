/**
 * Crawler Service — BFS/DFS web crawler engine
 * 
 * Data Structures used:
 *   - Queue (Array.shift) for BFS traversal
 *   - Stack (Array.pop) for DFS traversal
 *   - Set for URL deduplication (visited)
 *   - Graph (adjacency list via Map) for link structure
 *
 * Crawled pages are indexed into the DSA IndexManager as regular files
 * so they become searchable via Suffix Array, Trie, etc.
 */

const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class CrawlerService {
  constructor(indexManager) {
    this.indexManager = indexManager;
  }

  /**
   * Crawl a website using BFS or DFS
   * 
   * @param {Object} options
   * @param {string} options.url - Starting URL
   * @param {number} options.maxDepth - Maximum crawl depth (default 3)
   * @param {number} options.maxPages - Maximum pages to crawl (default 30)
   * @param {'bfs'|'dfs'} options.algorithm - Traversal algorithm
   * @param {Function} onUpdate - Callback for real-time SSE updates
   * @returns {Promise<Object>} Crawl results
   */
  async crawl({ url, maxDepth = 3, maxPages = 30, algorithm = 'bfs' }, onUpdate) {
    const startTime = Date.now();
    const visited = new Set();
    const nodes = [];
    const links = [];
    let duplicatesRemoved = 0;

    // Normalize starting URL
    const startUrl = this._normalizeUrl(url, url);
    if (!startUrl) throw new Error('Invalid URL');

    // BFS uses Queue (shift), DFS uses Stack (pop)
    const frontier = [{ url: startUrl, depth: 0, parentId: null }];
    if (algorithm === 'bfs') {
      visited.add(startUrl);
    }

    while (frontier.length > 0 && nodes.length < maxPages) {
      // Algorithm-specific selection
      const current = algorithm === 'bfs'
        ? frontier.shift()   // Queue: FIFO
        : frontier.pop();    // Stack: LIFO

      // For DFS, we mark as visited when explored (to allow deep paths)
      if (algorithm === 'dfs') {
        if (visited.has(current.url)) {
          duplicatesRemoved++;
          continue;
        }
        visited.add(current.url);
      }

      if (current.depth > maxDepth) continue;

      try {
        // Fetch and parse the page
        const pageData = await this._fetchPage(current.url);
        
        const nodeId = uuidv4();
        const wordCount = pageData.text.split(/\s+/).filter(w => w.length > 0).length;

        const node = {
          id: nodeId,
          url: current.url,
          title: pageData.title || this._extractTitleFromUrl(current.url),
          depth: current.depth,
          wordCount,
          outgoingLinks: pageData.links.length,
          incomingLinks: 0,
          contentPreview: pageData.text.substring(0, 200),
        };

        nodes.push(node);

        // Add link from parent
        if (current.parentId) {
          links.push({ source: current.parentId, target: nodeId });
          const parentNode = nodes.find(n => n.id === current.parentId);
          if (parentNode) node.incomingLinks++;
        }

        // Index this page into DSA structures
        await this._indexPage(nodeId, current.url, pageData, current.depth);

        // Discover new links (same domain only)
        if (current.depth < maxDepth) {
          for (const linkUrl of pageData.links) {
            const normalized = this._normalizeUrl(linkUrl, current.url);
            if (!normalized) continue;
            if (!this._isSameDomain(normalized, startUrl)) continue;

            // For BFS, mark visited immediately to keep queue small
            // For DFS, do not mark visited until popped, so deep paths are preferred
            if (algorithm === 'bfs') {
              if (visited.has(normalized)) {
                duplicatesRemoved++;
                continue;
              }
              visited.add(normalized);
            }

            if (nodes.length + frontier.length < maxPages * 10) { // Allow larger frontier for DFS
              frontier.push({ url: normalized, depth: current.depth + 1, parentId: nodeId });
            }
          }
        }

        // Send real-time update every page
        if (onUpdate) {
          onUpdate({
            type: 'update',
            data: {
              nodes,
              links,
              algorithm,
              stats: {
                totalPages: nodes.length,
                totalLinks: links.length,
                depth: Math.max(...nodes.map(n => n.depth), 0),
                duplicatesRemoved,
                crawlTime: Math.round((Date.now() - startTime) / 1000),
                averageLinksPerPage: nodes.length > 0
                  ? (links.length / nodes.length).toFixed(1)
                  : 0,
                algorithm,
                frontierSize: frontier.length,
              },
            },
          });
        }
      } catch (err) {
        console.warn(`[Crawler] Failed to crawl ${current.url}: ${err.message}`);
      }
    }

    const crawlTime = Math.round((Date.now() - startTime) / 1000);
    const result = {
      nodes,
      links,
      algorithm,
      stats: {
        totalPages: nodes.length,
        totalLinks: links.length,
        depth: nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0,
        duplicatesRemoved,
        crawlTime,
        averageLinksPerPage: nodes.length > 0
          ? (links.length / nodes.length).toFixed(1)
          : 0,
        algorithm,
      },
    };

    // Final complete event
    if (onUpdate) {
      onUpdate({ type: 'complete', data: result });
    }

    return result;
  }

  /**
   * Fetch a page and extract title, text content, and links
   */
  async _fetchPage(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 MetaIndex-Crawler/1.0',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const $ = cheerio.load(html);

      // 1. Extract title FIRST (before any removal)
      const title = $('title').text().trim() || $('h1').first().text().trim() || '';

      // 2. Extract ALL links BEFORE removing nav/header/footer
      //    (navigation links contain the most important crawl targets)
      const links = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
          links.push(href);
        }
      });

      // 3. NOW remove non-content elements for text extraction
      $('script, style, noscript, iframe, svg, link, meta').remove();

      // Extract text content (keep nav/header text for better indexing)
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Limit to 5K chars for indexing

      return { title, text, links };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Index a crawled page into DSA structures via IndexManager
   */
  async _indexPage(id, url, pageData, depth) {
    try {
      const hostname = new URL(url).hostname;
      
      const fileData = {
        id,
        s3_key: `crawled/${hostname}/${id}`,
        bucket: 'crawler',
        name: pageData.title || this._extractTitleFromUrl(url),
        size: pageData.text.length,
        mime_type: 'text/html',
        owner_id: null,
        tags: { crawled: true, [hostname]: true },
        content: pageData.text,
        custom: {
          type: 'crawled_page',
          url,
          depth,
          outgoingLinks: pageData.links.length,
          crawledAt: new Date().toISOString(),
        },
      };

      await this.indexManager.insertFile(fileData);
    } catch (err) {
      console.warn(`[Crawler] Index error for ${url}: ${err.message}`);
    }
  }

  /**
   * Get all crawled pages from IndexManager
   */
  getCrawledPages() {
    const allFiles = this.indexManager.fileStore.values();
    return allFiles.filter(f => f.custom?.type === 'crawled_page');
  }

  /**
   * Delete all crawled pages
   */
  async clearCrawledPages() {
    const pages = this.getCrawledPages();
    let count = 0;
    for (const page of pages) {
      try {
        await this.indexManager.deleteFile(page.id);
        count++;
      } catch (err) {
        console.warn(`[Crawler] Delete error: ${err.message}`);
      }
    }
    return count;
  }

  // --- URL Helpers ---

  _normalizeUrl(url, baseUrl) {
    try {
      if (!url.startsWith('http')) {
        const base = new URL(baseUrl);
        if (url.startsWith('/')) {
          url = base.origin + url;
        } else if (!url.startsWith('#')) {
          url = base.origin + '/' + url;
        } else {
          return null;
        }
      }
      const urlObj = new URL(url);
      // Remove hash, normalize
      return urlObj.origin + urlObj.pathname + urlObj.search;
    } catch {
      return null;
    }
  }

  _isSameDomain(url, baseUrl) {
    try {
      return new URL(url).hostname === new URL(baseUrl).hostname;
    } catch {
      return false;
    }
  }

  _extractTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(p => p);
      return decodeURIComponent(parts[parts.length - 1] || urlObj.hostname);
    } catch {
      return 'Page';
    }
  }
}

module.exports = { CrawlerService };
