/**
 * Suffix Array — Enables O(m·log n) arbitrary substring search
 * across all indexed file content, names, tags, and metadata.
 *
 * How it works:
 *   1. Each file's searchable text (name + tags + content) is concatenated
 *      with a sentinel character ($) and added to a global text buffer.
 *   2. A suffix array is built: an array of indices into the global text,
 *      sorted lexicographically by the suffix starting at that index.
 *   3. Substring search uses binary search on the sorted suffix array
 *      to find all occurrences of any arbitrary substring in O(m·log n).
 *
 * Time Complexity:
 *   - Build: O(n·log²n) where n = total characters across all files
 *   - Search: O(m·log n) where m = query length
 *   - Insert: O(n·log²n) rebuild (acceptable for this scale)
 *   - Delete: O(n·log²n) rebuild
 *
 * Space Complexity: O(n) for suffix array + O(n) for text buffer
 */

class SuffixArray {
  constructor() {
    // Global text buffer — concatenation of all documents
    this.text = '';
    // Suffix array — sorted indices into this.text
    this.sa = [];
    // Document registry: maps fileId → { start, end, searchText }
    this.documents = new Map();
    // Position → fileId mapping for fast reverse lookup
    this.positionMap = []; // Array of { start, end, fileId }
    // Stats
    this.totalChars = 0;
    this.buildCount = 0;
    this.searchCount = 0;
  }

  /**
   * Add a document to the suffix array index
   * @param {string} fileId - Unique file identifier
   * @param {Object} doc - { name, content, tags, mime_type }
   */
  insert(fileId, doc) {
    // Build searchable text from all fields
    const parts = [];
    if (doc.name) parts.push(doc.name.toLowerCase());
    if (doc.mime_type) parts.push(doc.mime_type.toLowerCase());
    if (doc.tags && typeof doc.tags === 'object') {
      parts.push(Object.keys(doc.tags).join(' ').toLowerCase());
    }
    if (doc.content) {
      // Limit content to first 5000 chars for suffix array (memory)
      parts.push(doc.content.toLowerCase().substring(0, 5000));
    }

    const searchText = parts.join(' ');
    this.documents.set(fileId, { searchText });

    // Rebuild the entire suffix array
    this._rebuild();
  }

  /**
   * Remove a document from the suffix array index
   * @param {string} fileId
   */
  delete(fileId) {
    if (!this.documents.has(fileId)) return;
    this.documents.delete(fileId);
    this._rebuild();
  }

  /**
   * Search for an arbitrary substring across all indexed documents
   * Uses binary search on the suffix array — O(m·log n)
   *
   * @param {string} query - Substring to search for
   * @param {number} limit - Max results to return
   * @returns {{ fileIds: string[], comparisons: number }}
   */
  search(query, limit = 100) {
    if (!query || this.sa.length === 0) {
      return { fileIds: [], comparisons: 0 };
    }

    this.searchCount++;
    const q = query.toLowerCase();
    const qLen = q.length;
    let comparisons = 0;

    // Binary search: find the leftmost suffix that starts with the query
    let lo = 0;
    let hi = this.sa.length - 1;
    let firstMatch = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      comparisons++;
      const suffix = this.text.substring(this.sa[mid], this.sa[mid] + qLen);
      const cmp = this._compare(suffix, q);

      if (cmp < 0) {
        lo = mid + 1;
      } else if (cmp > 0) {
        hi = mid - 1;
      } else {
        firstMatch = mid;
        hi = mid - 1; // Keep searching left for the first occurrence
      }
    }

    if (firstMatch === -1) {
      return { fileIds: [], comparisons };
    }

    // Binary search: find the rightmost suffix that starts with the query
    lo = firstMatch;
    hi = this.sa.length - 1;
    let lastMatch = firstMatch;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      comparisons++;
      const suffix = this.text.substring(this.sa[mid], this.sa[mid] + qLen);
      const cmp = this._compare(suffix, q);

      if (cmp === 0) {
        lastMatch = mid;
        lo = mid + 1; // Keep searching right for the last occurrence
      } else {
        hi = mid - 1;
      }
    }

    // Collect unique file IDs from all matching positions
    const fileIdSet = new Set();
    for (let i = firstMatch; i <= lastMatch && fileIdSet.size < limit; i++) {
      const pos = this.sa[i];
      const fileId = this._getFileIdAtPosition(pos);
      if (fileId) fileIdSet.add(fileId);
    }

    return {
      fileIds: Array.from(fileIdSet),
      comparisons,
      matchRange: [firstMatch, lastMatch],
      totalSuffixMatches: lastMatch - firstMatch + 1,
    };
  }

  /**
   * Rebuild the suffix array from all documents
   * Uses a simplified O(n·log²n) construction
   */
  _rebuild() {
    this.buildCount++;
    this.positionMap = [];

    if (this.documents.size === 0) {
      this.text = '';
      this.sa = [];
      this.totalChars = 0;
      return;
    }

    // Concatenate all documents with sentinel separator ($)
    const parts = [];
    let offset = 0;

    for (const [fileId, doc] of this.documents) {
      const start = offset;
      parts.push(doc.searchText);
      offset += doc.searchText.length;

      this.positionMap.push({ start, end: offset, fileId });

      // Add sentinel between documents
      parts.push('$');
      offset += 1;
    }

    this.text = parts.join('');
    this.totalChars = this.text.length;

    // Build suffix array: create array of indices, sort by suffix
    const n = this.text.length;
    this.sa = new Array(n);
    for (let i = 0; i < n; i++) {
      this.sa[i] = i;
    }

    // Sort suffixes — using built-in sort with suffix comparison
    // This is O(n·log²n) in practice with JS's Timsort
    const text = this.text;
    this.sa.sort((a, b) => {
      // Compare suffixes starting at positions a and b
      const lenA = n - a;
      const lenB = n - b;
      const len = Math.min(lenA, lenB);

      for (let i = 0; i < len; i++) {
        const ca = text.charCodeAt(a + i);
        const cb = text.charCodeAt(b + i);
        if (ca !== cb) return ca - cb;
      }

      return lenA - lenB;
    });

    // Remove suffixes that start with sentinel
    this.sa = this.sa.filter(i => this.text[i] !== '$');
  }

  /**
   * Reverse lookup: given a position in the global text,
   * find which file it belongs to — O(log d) where d = num documents
   */
  _getFileIdAtPosition(pos) {
    // Binary search in positionMap
    let lo = 0;
    let hi = this.positionMap.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const entry = this.positionMap[mid];

      if (pos < entry.start) {
        hi = mid - 1;
      } else if (pos >= entry.end) {
        lo = mid + 1;
      } else {
        return entry.fileId;
      }
    }

    return null;
  }

  /**
   * String comparison helper
   */
  _compare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      documents: this.documents.size,
      totalChars: this.totalChars,
      suffixArraySize: this.sa.length,
      buildCount: this.buildCount,
      searchCount: this.searchCount,
      memoryEstimateMB: ((this.totalChars * 8 + this.sa.length * 8) / (1024 * 1024)).toFixed(2),
    };
  }

  /**
   * Serialize for snapshots
   */
  toJSON() {
    const docs = [];
    for (const [fileId, doc] of this.documents) {
      docs.push({ fileId, searchText: doc.searchText });
    }
    return docs;
  }

  /**
   * Restore from snapshot
   */
  fromJSON(data) {
    this.documents.clear();
    for (const { fileId, searchText } of data) {
      this.documents.set(fileId, { searchText });
    }
    this._rebuild();
  }
}

module.exports = { SuffixArray };
