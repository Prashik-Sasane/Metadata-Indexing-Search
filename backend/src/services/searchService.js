/**
 * Search Service - Executes search queries using DSA structures
 * Uses IndexManager for fast in-memory search, hydrates from HashMap
 */

class SearchService {
  constructor(indexManager) {
    this.indexManager = indexManager;
  }

  /**
   * Execute search query using DSA structures
   */
  async search(searchParams) {
    const startTime = Date.now();

    const {
      prefix, sizeMin, sizeMax, dateFrom, dateTo,
      tag, owner, mimeType, topK, sort,
      page = 1, limit = 50,
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
        mimeType,
        topK: topK ? parseInt(topK) : undefined,
        sort,
      });

      // 2. Hydrate file metadata from HashMap — O(1) per file
      // Pass query to extract match context snippets
      const files = this.hydrateFiles(dsaResult.fileIDs, prefix || tag || '');

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
   */
  async getPrefixSuggestions(prefix, limit = 10) {
    try {
      const prefixes = this.indexManager.trie.getPrefixes(5);
      return prefixes
        .filter(p => p.startsWith(prefix.toLowerCase()))
        .slice(0, limit);
    } catch (error) {
      console.error('[SearchService] Get prefix suggestions error:', error.message);
      throw error;
    }
  }

  /**
   * Hydrate file IDs with full metadata from HashMap — O(1) per file
   * Attaches match context snippets when a search query is provided
   */
  hydrateFiles(fileIDs, query = '') {
    if (!fileIDs || fileIDs.length === 0) return [];

    const files = [];
    const seen = new Set(); // Deduplicate
    const q = (query || '').toLowerCase();

    for (const id of fileIDs) {
      if (seen.has(id)) continue;
      seen.add(id);

      const file = this.indexManager.getFile(id);
      if (file) {
        // Attach match context snippets if query exists
        if (q.length > 0) {
          file.matchSnippets = this._extractMatchSnippets(file, q);
          file.matchCount = file.matchSnippets.reduce((sum, s) => sum + s.matches.length, 0);
        }
        files.push(file);
      }
    }

    return files;
  }

  /**
   * Extract VS Code-style match snippets from a file's content, name, and tags
   * Returns contextual lines around each match occurrence
   *
   * @param {Object} file - File metadata object
   * @param {string} query - Lowercase search query
   * @returns {Array<{ field, matches: Array<{ line, lineNumber, column, contextBefore, contextAfter, matchText }> }>}
   */
  _extractMatchSnippets(file, query) {
    const snippets = [];
    const CONTEXT_CHARS = 60; // chars of context before/after match

    // 1. Check filename
    const nameMatches = this._findMatches(file.name || '', query);
    if (nameMatches.length > 0) {
      snippets.push({
        field: 'filename',
        fieldLabel: 'File Name',
        matches: nameMatches.map(m => ({
          text: file.name,
          matchStart: m.index,
          matchEnd: m.index + query.length,
          matchText: file.name.substring(m.index, m.index + query.length),
        })),
      });
    }

    // 2. Check tags
    if (file.tags && typeof file.tags === 'object') {
      const tagKeys = Object.keys(file.tags);
      const tagMatches = tagKeys.filter(t => t.toLowerCase().includes(query));
      if (tagMatches.length > 0) {
        snippets.push({
          field: 'tags',
          fieldLabel: 'Tags',
          matches: tagMatches.map(t => ({
            text: t,
            matchStart: t.toLowerCase().indexOf(query),
            matchEnd: t.toLowerCase().indexOf(query) + query.length,
            matchText: t,
          })),
        });
      }
    }

    // 3. Check content — line-by-line with context (like grep/vscode)
    if (file.content) {
      const lines = file.content.split('\n');
      const contentMatches = [];

      for (let lineNum = 0; lineNum < lines.length && contentMatches.length < 10; lineNum++) {
        const line = lines[lineNum];
        const lineLower = line.toLowerCase();
        let searchFrom = 0;

        while (searchFrom < lineLower.length && contentMatches.length < 10) {
          const idx = lineLower.indexOf(query, searchFrom);
          if (idx === -1) break;

          // Extract context around the match
          const contextStart = Math.max(0, idx - CONTEXT_CHARS);
          const contextEnd = Math.min(line.length, idx + query.length + CONTEXT_CHARS);
          const contextText = line.substring(contextStart, contextEnd);

          // Adjust match position relative to context
          const relativeStart = idx - contextStart;

          contentMatches.push({
            lineNumber: lineNum + 1,
            text: (contextStart > 0 ? '...' : '') + contextText + (contextEnd < line.length ? '...' : ''),
            matchStart: relativeStart + (contextStart > 0 ? 3 : 0),
            matchEnd: relativeStart + query.length + (contextStart > 0 ? 3 : 0),
            matchText: line.substring(idx, idx + query.length),
            column: idx + 1,
          });

          searchFrom = idx + query.length;
        }
      }

      if (contentMatches.length > 0) {
        snippets.push({
          field: 'content',
          fieldLabel: 'Content',
          matches: contentMatches,
        });
      }
    }

    return snippets;
  }

  /**
   * Find all occurrences of a substring (case-insensitive)
   */
  _findMatches(text, query) {
    const matches = [];
    const lower = text.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(query, idx)) !== -1) {
      matches.push({ index: idx });
      idx += query.length;
    }
    return matches;
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
   * Get search and index statistics
   */
  async getSearchStats() {
    const stats = this.indexManager.getStats();
    const fileStoreStats = stats.fileStore || {};

    // Calculate total size from files in HashMap
    const allFiles = this.indexManager.fileStore.values();
    const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    return {
      dsaIndexes: stats,
      database: {
        totalFiles: fileStoreStats.size || 0,
        totalSize,
        totalSizeFormatted: this._formatFileSize(totalSize),
      },
    };
  }

  _formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = { SearchService };
