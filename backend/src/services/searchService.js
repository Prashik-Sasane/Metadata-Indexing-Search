/**
 * Search Service - DSA-powered search with PostgreSQL hydration
 * Routes queries to appropriate DSA structures and hydrates results
 */

const { query } = require('../../config/db.js');

class SearchService {
  constructor(indexManager) {
    this.indexManager = indexManager;
  }

  /**
   * Execute search query using DSA structures
   * @param {Object} searchParams - Search parameters
   * @returns {Object} Search results with pagination
   */
  async search(searchParams) {
    const startTime = Date.now();

    const {
      prefix,
      sizeMin,
      sizeMax,
      dateFrom,
      dateTo,
      tag,
      owner,
      topK,
      sort,
      page = 1,
      limit = 50,
    } = searchParams;

    try {
      // 1. Use DSA indexes to get file IDs (fast in-memory lookup)
      const dsaResult = await this.indexManager.search({
        prefix,
        sizeMin: sizeMin !== undefined ? parseInt(sizeMin) : undefined,
        sizeMax: sizeMax !== undefined ? parseInt(sizeMax) : undefined,
        dateFrom,
        dateTo,
        tag,
        owner,
        topK: topK ? parseInt(topK) : undefined,
        sort,
      });

      // 2. Hydrate file metadata from PostgreSQL
      const files = await this.hydrateFiles(dsaResult.fileIDs);

      // 3. Apply pagination
      const paginatedFiles = this.paginate(files, page, limit);

      const executionTime = Date.now() - startTime;

      return {
        files: paginatedFiles.data,
        pagination: {
          page: paginatedFiles.page,
          limit: paginatedFiles.limit,
          total: paginatedFiles.total,
          totalPages: Math.ceil(paginatedFiles.total / limit),
        },
        performance: {
          executionTime: `${executionTime}ms`,
          searchType: dsaResult.searchType,
          indexLookups: dsaResult.count,
        },
      };
    } catch (error) {
      console.error('[SearchService] Search error:', error.message);
      throw error;
    }
  }

  /**
   * Get prefix suggestions for autocomplete
   * @param {string} prefix - Search prefix
   * @param {number} limit - Max suggestions
   * @returns {string[]} Array of prefix suggestions
   */
  async getPrefixSuggestions(prefix, limit = 10) {
    try {
      const prefixes = this.indexManager.trie.getPrefixes(3);
      return prefixes
        .filter(p => p.startsWith(prefix.toLowerCase()))
        .slice(0, limit);
    } catch (error) {
      console.error('[SearchService] Get prefix suggestions error:', error.message);
      throw error;
    }
  }

  /**
   * Hydrate file IDs with full metadata from PostgreSQL
   * @param {string[]} fileIDs - Array of file UUIDs
   * @returns {Object[]} Array of file objects
   */
  async hydrateFiles(fileIDs) {
  if (fileIDs.length === 0) {
    return [];
  }

  try {
    // PostgreSQL supports arrays directly — no placeholders needed
    const result = await query(
      `SELECT 
        f.id,
        f.s3_key,
        f.bucket,
        f.name,
        f.size,
        f.mime_type,
        f.owner_id,
        f.created_at,
        f.updated_at,
        fm.tags,
        fm.custom
       FROM files f
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       WHERE f.id = ANY($1) AND f.is_deleted = FALSE
       ORDER BY f.created_at DESC`,
      [fileIDs]  // <-- Passed as array
    );

    return result.rows.map(row => ({
      id: row.id,
      s3_key: row.s3_key,
      bucket: row.bucket,
      name: row.name,
      size: row.size,
      mime_type: row.mime_type,
      owner_id: row.owner_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags || {},
      custom: row.custom || {},
      sizeFormatted: this.formatFileSize(row.size),
    }));
  } catch (error) {
    console.error('[SearchService] Hydrate files error:', error.message);
    return [];
  }
}

  /**
   * Paginate results
   */
  paginate(items, page, limit) {
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      data: paginatedItems,
      page: parseInt(page),
      limit: parseInt(limit),
      total: items.length,
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get search statistics
   */
  async getSearchStats() {
    try {
      const stats = this.indexManager.getStats();
      
      // Get database stats
      const fileCount = await query('SELECT COUNT(*) as count FROM files WHERE is_deleted = FALSE');
      const totalSize = await query('SELECT SUM(size) as sum FROM files WHERE is_deleted = FALSE');

      return {
        dsaIndexes: stats,
        database: {
          totalFiles: parseInt(fileCount.rows[0].count),
          totalSize: parseInt(totalSize.rows[0].sum || 0),
          totalSizeFormatted: this.formatFileSize(parseInt(totalSize.rows[0].sum || 0)),
        },
      };
    } catch (error) {
      console.error('[SearchService] Get stats error:', error.message);
      throw error;
    }
  }
}

module.exports = { SearchService };
