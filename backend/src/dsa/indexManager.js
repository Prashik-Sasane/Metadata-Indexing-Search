/**
 * Index Manager - Orchestrates all DSA structures
 * Manages concurrent access to in-memory indexes and persistent disk index
 * Provides unified interface for insert, delete, and search operations
 *
 * DSA Structures Used:
 *   - HashMap: O(1) file metadata store (primary lookup)
 *   - RadixTrie: O(L) prefix search on file paths/names
 *   - B+ Tree: O(log N) range queries on size and date
 *   - AVL Tree: O(log N) equality lookups on tags, owner, mime_type
 *   - Min/Max Heap: O(1) top-K queries (largest, most recent)
 *   - Suffix Array: O(m·log n) arbitrary substring search
 *   - B-Tree Disk: Persistent WAL-backed index
 */

const fs = require('fs');
const path = require('path');
const { RadixTrie } = require('./trie');
const { BPlusTree } = require('./bPlusTree');
const { AVLTree } = require('./avlTree');
const { MinHeap, MaxHeap } = require('./heap');
const { BTreeDisk } = require('./bTree');
const { HashMap } = require('./hashMap');
const { SuffixArray } = require('./suffixArray');

class IndexManager {
  constructor(options = {}) {
    // Primary metadata store — O(1) lookups
    this.fileStore = new HashMap(options.hashMapCapacity || 256);

    // In-memory indexes
    this.trie = new RadixTrie(); // Prefix search on file paths
    this.bPlusTreeSize = new BPlusTree(options.bPlusOrder || 100); // Size range queries
    this.bPlusTreeDate = new BPlusTree(options.bPlusOrder || 100); // Date range queries
    this.avlTreeTags = new AVLTree(); // Tag-based equality lookups
    this.avlTreeOwner = new AVLTree(); // Owner-based lookups
    this.avlTreeMimeType = new AVLTree(); // MIME type lookups

    // Content index — stores extracted text for full-text-ish search
    this.contentTrie = new RadixTrie(); // Prefix search on content words

    // Suffix Array — O(m·log n) arbitrary substring search across all content
    this.suffixArray = new SuffixArray();

    // Heap for Top-K queries
    this.minHeapSize = new MinHeap((a, b) => a.size - b.size); // Smallest files
    this.maxHeapSize = new MaxHeap((a, b) => a.size - b.size); // Largest files
    this.maxHeapRecent = new MaxHeap((a, b) => a.createdAt - b.createdAt); // Most recent

    // Persistent disk index with WAL
    this.bTreeDisk = new BTreeDisk(
      options.diskIndexPath || './data/wal.index',
      options.pageSize || 4096
    );

    // Concurrent access control
    this.readWriteLock = {
      isWriting: false,
      readCount: 0,
      writeQueue: [],
      readQueue: [],
    };

    // Statistics
    this.stats = {
      totalInserts: 0,
      totalDeletes: 0,
      totalSearches: 0,
      lastSnapshot: null,
    };

    // Snapshot path
    this.snapshotPath = options.snapshotPath || './data/snapshot.json';

    // Periodic snapshot interval (5 minutes default)
    this.snapshotInterval = options.snapshotInterval || 5 * 60 * 1000;
    this._snapshotTimer = null;
  }

  /**
   * Initialize the index manager
   */
  async init() {
    console.log('[IndexManager] Initializing...');
    await this.bTreeDisk.init();

    // Try to load snapshot to restore in-memory state
    this._loadSnapshot();

    // Start periodic snapshots
    this._startPeriodicSnapshot();
    console.log('[IndexManager] Initialized successfully');
  }

  /**
   * Insert file metadata into all indexes
   * @param {Object} fileMetadata - File metadata object
   */
  async insertFile(fileMetadata) {
    await this._acquireWriteLock();

    try {
      const startTime = Date.now();
      const {
        id, s3_key, name, size, mime_type, owner_id,
        created_at, tags, content, bucket, custom
      } = fileMetadata;

      // 1. Store full metadata in HashMap — O(1)
      this.fileStore.put(id, {
        id,
        s3_key,
        bucket: bucket || process.env.S3_BUCKET || 'metadata-search-files',
        name,
        size,
        mime_type,
        owner_id,
        created_at: created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: tags || {},
        custom: custom || {},
        content: content || '',
        wordCount: content ? content.split(/\s+/).filter(Boolean).length : 0,
      });

      // 2. Update Trie (prefix search on S3 key and name)
      this.trie.insert(s3_key, id);
      this.trie.insert(name.toLowerCase(), id);

      // 3. Index content words in contentTrie
      if (content) {
        const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const uniqueWords = [...new Set(words)];
        for (const word of uniqueWords.slice(0, 500)) { // Limit to 500 unique words
          this.contentTrie.insert(word, id);
        }
      }

      // 3b. Update Suffix Array (substring search on name + content + tags)
      this.suffixArray.insert(id, { name, content, tags, mime_type });

      // 4. Update B+ Tree for size range queries
      this.bPlusTreeSize.insert(size, id);

      // 5. Update B+ Tree for date range queries
      const timestamp = created_at ? new Date(created_at).getTime() : Date.now();
      this.bPlusTreeDate.insert(timestamp, id);

      // 6. Update AVL Trees for equality lookups
      if (owner_id) {
        this.avlTreeOwner.insert(owner_id, id);
      }

      if (mime_type) {
        this.avlTreeMimeType.insert(mime_type, id);
      }

      // 7. Update AVL Tree for tags
      if (tags && typeof tags === 'object') {
        for (const tag of Object.keys(tags)) {
          this.avlTreeTags.insert(tag.toLowerCase(), id);
        }
      }

      // 8. Update Heaps for Top-K queries
      const fileEntry = {
        id,
        size,
        createdAt: timestamp,
      };
      this.maxHeapSize.insert(fileEntry);
      this.maxHeapRecent.insert(fileEntry);

      // 9. Write to disk index (WAL)
      await this.bTreeDisk.insert(s3_key, id);

      // Update statistics
      this.stats.totalInserts++;

      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.warn(`[IndexManager] Slow insert: ${duration}ms for file ${id}`);
      }
    } finally {
      this._releaseWriteLock();
    }
  }

  /**
   * Delete file from all indexes
   * @param {string} fileID - File UUID
   * @param {Object} metadata - File metadata for index removal
   */
  async deleteFile(fileID, metadata) {
    await this._acquireWriteLock();

    try {
      // Get metadata from HashMap if not provided
      const meta = metadata || this.fileStore.get(fileID) || {};
      const { s3_key, name, size, mime_type, owner_id, created_at, tags, content } = meta;

      // 1. Remove from HashMap
      this.fileStore.delete(fileID);

      // 2. Remove from Trie
      // Remove from Suffix Array
      this.suffixArray.delete(fileID);

      if (s3_key) this.trie.delete(s3_key, fileID);
      if (name) this.trie.delete(name.toLowerCase(), fileID);

      // 3. Remove content words from contentTrie
      if (content) {
        const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const uniqueWords = [...new Set(words)];
        for (const word of uniqueWords.slice(0, 500)) {
          this.contentTrie.delete(word, fileID);
        }
      }

      // 4. Remove from B+ Trees
      if (size !== undefined) this.bPlusTreeSize.delete(size, fileID);
      if (created_at) {
        const timestamp = new Date(created_at).getTime();
        this.bPlusTreeDate.delete(timestamp, fileID);
      }

      // 5. Remove from AVL Trees
      if (owner_id) this.avlTreeOwner.delete(owner_id, fileID);
      if (mime_type) this.avlTreeMimeType.delete(mime_type, fileID);

      if (tags && typeof tags === 'object') {
        for (const tag of Object.keys(tags)) {
          this.avlTreeTags.delete(tag.toLowerCase(), fileID);
        }
      }

      // 6. Remove from disk index
      if (s3_key) {
        await this.bTreeDisk.delete(s3_key, fileID);
      }

      // Update statistics
      this.stats.totalDeletes++;
    } finally {
      this._releaseWriteLock();
    }
  }

  /**
   * Get a single file by ID from the HashMap — O(1)
   * @param {string} fileID
   * @returns {Object|undefined}
   */
  getFile(fileID) {
    const file = this.fileStore.get(fileID);
    if (!file) return null;
    return {
      ...file,
      sizeFormatted: this._formatFileSize(file.size),
    };
  }

  /**
   * List files with pagination from HashMap
   * @param {Object} params
   * @returns {Object}
   */
  listFiles(params = {}) {
    const { page = 1, limit = 50, owner_id, mime_type } = params;
    let files = this.fileStore.values();

    // Filter
    if (owner_id) {
      files = files.filter(f => f.owner_id === owner_id);
    }
    if (mime_type) {
      files = files.filter(f => f.mime_type === mime_type);
    }

    // Sort by created_at descending
    files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = files.length;
    const offset = (page - 1) * limit;
    const paginatedFiles = files.slice(offset, offset + limit).map(f => ({
      ...f,
      sizeFormatted: this._formatFileSize(f.size),
    }));

    return {
      files: paginatedFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search files using DSA structures
   * @param {Object} query - Search query parameters
   * @returns {Object} Search results with fileIDs and metadata
   */
  async search(query) {
    await this._acquireReadLock();

    try {
      const startTime = Date.now();
      let fileIDs = new Set();
      let searchType = 'unknown';
      let isFirstFilter = true;

      const intersect = (newIDs) => {
        const newSet = new Set(newIDs);
        if (isFirstFilter) {
          fileIDs = newSet;
          isFirstFilter = false;
        } else {
          fileIDs = new Set([...fileIDs].filter(id => newSet.has(id)));
        }
      };

      // Route query to appropriate DSA structure
      if (query.prefix) {
        // Use Suffix Array for substring search — O(m·log n)
        // This matches ANY substring in filename, content, tags, metadata
        searchType = 'substring';
        const saResult = this.suffixArray.search(query.prefix.toLowerCase());

        // Also try Trie prefix for exact prefix matches (fast path)
        const nameResults = this.trie.prefixSearch(query.prefix.toLowerCase());
        const contentResults = this.contentTrie.prefixSearch(query.prefix.toLowerCase());

        // Union all results: suffix array + trie
        const allResults = new Set([
          ...saResult.fileIds,
          ...nameResults,
          ...contentResults,
        ]);
        intersect(Array.from(allResults));
      }

      if (query.sizeMin !== undefined && query.sizeMax !== undefined) {
        // B+ Tree range search — O(log N + K)
        searchType = fileIDs.size > 0 ? 'combined' : 'size_range';
        const results = this.bPlusTreeSize.rangeSearch(query.sizeMin, query.sizeMax);
        intersect(results);
      }

      if (query.dateFrom || query.dateTo) {
        // B+ Tree date range search
        searchType = fileIDs.size > 0 ? 'combined' : 'date_range';
        const from = query.dateFrom ? new Date(query.dateFrom).getTime() : 0;
        const to = query.dateTo ? new Date(query.dateTo).getTime() : Date.now();
        const results = this.bPlusTreeDate.rangeSearch(from, to);
        intersect(results);
      }

      if (query.tag) {
        // AVL Tree tag lookup — O(log N)
        searchType = fileIDs.size > 0 ? 'combined' : 'tag';
        const results = this.avlTreeTags.search(query.tag.toLowerCase());
        intersect(results);
      }

      if (query.owner) {
        // AVL Tree owner lookup
        searchType = fileIDs.size > 0 ? 'combined' : 'owner';
        const results = this.avlTreeOwner.search(query.owner);
        intersect(results);
      }

      if (query.mimeType) {
        searchType = fileIDs.size > 0 ? 'combined' : 'mime_type';
        const results = this.avlTreeMimeType.search(query.mimeType);
        intersect(results);
      }

      if (query.topK) {
        // Heap Top-K query — O(K log N)
        searchType = query.sort === 'size' ? 'topk_size' : 'topk_recent';
        const heap = query.sort === 'size' ? this.maxHeapSize : this.maxHeapRecent;
        const results = heap.getTopKLargest(query.topK);
        return {
          fileIDs: results.map(r => r.id),
          searchType,
          count: results.length,
          executionTime: Date.now() - startTime,
        };
      }

      // Update statistics
      this.stats.totalSearches++;

      return {
        fileIDs: Array.from(fileIDs),
        searchType,
        count: fileIDs.size,
        executionTime: Date.now() - startTime,
      };
    } finally {
      this._releaseReadLock();
    }
  }

  /**
   * Create a snapshot of all indexes to disk
   */
  async snapshot() {
    await this._acquireWriteLock();

    try {
      console.log('[IndexManager] Creating snapshot...');
      await this.bTreeDisk.snapshot();

      // Save in-memory data to JSON
      this._saveSnapshot();

      this.stats.lastSnapshot = new Date().toISOString();
      console.log('[IndexManager] Snapshot created');
    } finally {
      this._releaseWriteLock();
    }
  }

  /**
   * Save in-memory state to snapshot file
   */
  _saveSnapshot() {
    try {
      const data = {
        version: 2,
        timestamp: new Date().toISOString(),
        fileStore: this.fileStore.toJSON(),
        stats: this.stats,
      };

      const dir = path.dirname(this.snapshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.snapshotPath, JSON.stringify(data, null, 2));
      console.log(`[IndexManager] Snapshot saved: ${this.fileStore.size()} files`);
    } catch (error) {
      console.error('[IndexManager] Save snapshot error:', error.message);
    }
  }

  /**
   * Load snapshot and rebuild all in-memory indexes
   */
  _loadSnapshot() {
    try {
      if (!fs.existsSync(this.snapshotPath)) {
        console.log('[IndexManager] No snapshot found, starting fresh');
        return;
      }

      const raw = fs.readFileSync(this.snapshotPath, 'utf-8');
      const data = JSON.parse(raw);

      if (!data.fileStore || !Array.isArray(data.fileStore)) {
        console.warn('[IndexManager] Invalid snapshot format');
        return;
      }

      console.log(`[IndexManager] Loading snapshot: ${data.fileStore.length} files`);

      // Rebuild all indexes from the snapshot data
      for (const { key, value } of data.fileStore) {
        // Store in HashMap
        this.fileStore.put(key, value);

        // Rebuild Trie
        if (value.s3_key) this.trie.insert(value.s3_key, value.id);
        if (value.name) this.trie.insert(value.name.toLowerCase(), value.id);

        // Rebuild content trie
        if (value.content) {
          const words = value.content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const uniqueWords = [...new Set(words)];
          for (const word of uniqueWords.slice(0, 500)) {
            this.contentTrie.insert(word, value.id);
          }
        }

        // Rebuild B+ Trees
        if (value.size !== undefined) this.bPlusTreeSize.insert(value.size, value.id);
        const ts = value.created_at ? new Date(value.created_at).getTime() : Date.now();
        this.bPlusTreeDate.insert(ts, value.id);

        // Rebuild AVL Trees
        if (value.owner_id) this.avlTreeOwner.insert(value.owner_id, value.id);
        if (value.mime_type) this.avlTreeMimeType.insert(value.mime_type, value.id);
        if (value.tags && typeof value.tags === 'object') {
          for (const tag of Object.keys(value.tags)) {
            this.avlTreeTags.insert(tag.toLowerCase(), value.id);
          }
        }

        // Rebuild Heaps
        this.maxHeapSize.insert({ id: value.id, size: value.size, createdAt: ts });
        this.maxHeapRecent.insert({ id: value.id, size: value.size, createdAt: ts });

        // Rebuild Suffix Array
        this.suffixArray.insert(value.id, {
          name: value.name,
          content: value.content,
          tags: value.tags,
          mime_type: value.mime_type,
        });
      }

      // Restore stats
      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }

      console.log(`[IndexManager] Snapshot loaded successfully`);
    } catch (error) {
      console.error('[IndexManager] Load snapshot error:', error.message);
    }
  }

  /**
   * Get comprehensive index statistics
   */
  getStats() {
    return {
      operations: this.stats,
      fileStore: this.fileStore.getStats(),
      suffixArray: this.suffixArray.getStats(),
      trie: this.trie.getStats(),
      contentTrie: this.contentTrie.getStats(),
      bPlusTreeSize: this.bPlusTreeSize.getStats(),
      bPlusTreeDate: this.bPlusTreeDate.getStats(),
      avlTreeTags: this.avlTreeTags.getStats(),
      avlTreeOwner: this.avlTreeOwner.getStats(),
      avlTreeMimeType: this.avlTreeMimeType.getStats(),
      bTreeDisk: this.bTreeDisk.getStats(),
      heaps: {
        maxHeapSize: this.maxHeapSize.size(),
        maxHeapRecent: this.maxHeapRecent.size(),
      },
    };
  }

  /**
   * Format file size for display
   */
  _formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // --- Concurrency Control ---

  async _acquireReadLock() {
    while (this.readWriteLock.isWriting) {
      await new Promise(resolve => this.readWriteLock.readQueue.push(resolve));
    }
    this.readWriteLock.readCount++;
  }

  _releaseReadLock() {
    this.readWriteLock.readCount--;
    if (this.readWriteLock.readCount === 0 && this.readWriteLock.writeQueue.length > 0) {
      const nextWriter = this.readWriteLock.writeQueue.shift();
      nextWriter();
    }
  }

  async _acquireWriteLock() {
    if (!this.readWriteLock.isWriting && this.readWriteLock.readCount === 0) {
      this.readWriteLock.isWriting = true;
      return;
    }

    await new Promise(resolve => this.readWriteLock.writeQueue.push(resolve));
    this.readWriteLock.isWriting = true;
  }

  _releaseWriteLock() {
    this.readWriteLock.isWriting = false;

    if (this.readWriteLock.writeQueue.length > 0) {
      const nextWriter = this.readWriteLock.writeQueue.shift();
      nextWriter();
    } else {
      while (this.readWriteLock.readQueue.length > 0) {
        const reader = this.readWriteLock.readQueue.shift();
        reader();
      }
    }
  }

  _startPeriodicSnapshot() {
    this._snapshotTimer = setInterval(async () => {
      try {
        await this.snapshot();
      } catch (error) {
        console.error('[IndexManager] Periodic snapshot error:', error.message);
      }
    }, this.snapshotInterval);
  }

  async shutdown() {
    console.log('[IndexManager] Shutting down...');
    if (this._snapshotTimer) clearInterval(this._snapshotTimer);
    await this.snapshot();
    console.log('[IndexManager] Shutdown complete');
  }
}

module.exports = { IndexManager };
