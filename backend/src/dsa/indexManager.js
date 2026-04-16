/**
 * Index Manager - Orchestrates all DSA structures
 * Manages concurrent access to in-memory indexes and persistent disk index
 * Provides unified interface for insert, delete, and search operations
 */

const { RadixTrie } = require('./trie');
const { BPlusTree } = require('./bPlusTree');
const { AVLTree } = require('./avlTree');
const { MinHeap, MaxHeap } = require('./heap');
const { BTreeDisk } = require('./bTree');

class IndexManager {
  constructor(options = {}) {
    // In-memory indexes
    this.trie = new RadixTrie(); // Prefix search on file paths
    this.bPlusTreeSize = new BPlusTree(options.bPlusOrder || 100); // Size range queries
    this.bPlusTreeDate = new BPlusTree(options.bPlusOrder || 100); // Date range queries
    this.avlTreeTags = new AVLTree(); // Tag-based equality lookups
    this.avlTreeOwner = new AVLTree(); // Owner-based lookups
    this.avlTreeMimeType = new AVLTree(); // MIME type lookups
    
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

    // Periodic snapshot interval (5 minutes default)
    this.snapshotInterval = options.snapshotInterval || 5 * 60 * 1000;
    this._startPeriodicSnapshot();
  }

  /**
   * Initialize the index manager
   */
  async init() {
    console.log('[IndexManager] Initializing...');
    await this.bTreeDisk.init();
    console.log('[IndexManager] Initialized successfully');
  }

  /**
   * Insert file metadata into all indexes
   * @param {Object} fileMetadata - File metadata object
   * @param {string} fileMetadata.id - File UUID
   * @param {string} fileMetadata.s3_key - S3 object key
   * @param {string} fileMetadata.name - File name
   * @param {number} fileMetadata.size - File size in bytes
   * @param {string} fileMetadata.mime_type - MIME type
   * @param {string} fileMetadata.owner_id - Owner UUID
   * @param {Date} fileMetadata.created_at - Creation timestamp
   * @param {Object} fileMetadata.tags - Tags object {tag1: true, tag2: true}
   */
  async insertFile(fileMetadata) {
    await this._acquireWriteLock();
    
    try {
      const startTime = Date.now();
      const { id, s3_key, name, size, mime_type, owner_id, created_at, tags } = fileMetadata;

      // 1. Update Trie (prefix search on S3 key and name)
      this.trie.insert(s3_key, id);
      this.trie.insert(name.toLowerCase(), id);

      // 2. Update B+ Tree for size range queries
      this.bPlusTreeSize.insert(size, id);

      // 3. Update B+ Tree for date range queries
      const timestamp = created_at ? new Date(created_at).getTime() : Date.now();
      this.bPlusTreeDate.insert(timestamp, id);

      // 4. Update AVL Trees for equality lookups
      if (owner_id) {
        this.avlTreeOwner.insert(owner_id, id);
      }
      
      if (mime_type) {
        this.avlTreeMimeType.insert(mime_type, id);
      }

      // 5. Update AVL Tree for tags
      if (tags && typeof tags === 'object') {
        for (const tag of Object.keys(tags)) {
          this.avlTreeTags.insert(tag.toLowerCase(), id);
        }
      }

      // 6. Update Heaps for Top-K queries
      const fileEntry = {
        id,
        size,
        createdAt: timestamp,
      };
      this.maxHeapSize.insert(fileEntry);
      this.maxHeapRecent.insert(fileEntry);

      // 7. Write to disk index (WAL)
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
      const { s3_key, name, size, mime_type, owner_id, created_at, tags } = metadata || {};

      // 1. Remove from Trie
      if (s3_key) this.trie.delete(s3_key, fileID);
      if (name) this.trie.delete(name.toLowerCase(), fileID);

      // 2. Remove from B+ Trees
      if (size !== undefined) this.bPlusTreeSize.delete(size, fileID);
      if (created_at) {
        const timestamp = new Date(created_at).getTime();
        this.bPlusTreeDate.delete(timestamp, fileID);
      }

      // 3. Remove from AVL Trees
      if (owner_id) this.avlTreeOwner.delete(owner_id, fileID);
      if (mime_type) this.avlTreeMimeType.delete(mime_type, fileID);
      
      if (tags && typeof tags === 'object') {
        for (const tag of Object.keys(tags)) {
          this.avlTreeTags.delete(tag.toLowerCase(), fileID);
        }
      }

      // 4. Remove from disk index
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

      // Route query to appropriate DSA structure
      if (query.prefix) {
        // Trie prefix search - O(L + K)
        searchType = 'prefix';
        const results = this.trie.prefixSearch(query.prefix.toLowerCase());
        fileIDs = new Set(results);
      }

      if (query.sizeMin !== undefined && query.sizeMax !== undefined) {
        // B+ Tree range search - O(log N + K)
        searchType = 'size_range';
        const results = this.bPlusTreeSize.rangeSearch(query.sizeMin, query.sizeMax);
        fileIDs = fileIDs.size > 0 
          ? new Set(results.filter(id => fileIDs.has(id))) 
          : new Set(results);
      }

      if (query.dateFrom || query.dateTo) {
        // B+ Tree date range search
        searchType = 'date_range';
        const from = query.dateFrom ? new Date(query.dateFrom).getTime() : 0;
        const to = query.dateTo ? new Date(query.dateTo).getTime() : Date.now();
        const results = this.bPlusTreeDate.rangeSearch(from, to);
        fileIDs = fileIDs.size > 0 
          ? new Set(results.filter(id => fileIDs.has(id))) 
          : new Set(results);
      }

      if (query.tag) {
        // AVL Tree tag lookup - O(log N)
        searchType = 'tag';
        const results = this.avlTreeTags.search(query.tag.toLowerCase());
        fileIDs = fileIDs.size > 0 
          ? new Set(results.filter(id => fileIDs.has(id))) 
          : new Set(results);
      }

      if (query.owner) {
        // AVL Tree owner lookup
        searchType = 'owner';
        const results = this.avlTreeOwner.search(query.owner);
        fileIDs = fileIDs.size > 0 
          ? new Set(results.filter(id => fileIDs.has(id))) 
          : new Set(results);
      }

      if (query.topK) {
        // Heap Top-K query - O(K log N)
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
      this.stats.lastSnapshot = new Date().toISOString();
      console.log('[IndexManager] Snapshot created');
    } finally {
      this._releaseWriteLock();
    }
  }

  /**
   * Get comprehensive index statistics
   */
  getStats() {
    return {
      operations: this.stats,
      trie: this.trie.getStats(),
      bPlusTreeSize: this.bPlusTreeSize.getStats(),
      bPlusTreeDate: this.bPlusTreeDate.getStats(),
      avlTreeTags: this.avlTreeTags.getStats(),
      avlTreeOwner: this.avlTreeOwner.getStats(),
      bTreeDisk: this.bTreeDisk.getStats(),
      heaps: {
        maxHeapSize: this.maxHeapSize.size(),
        maxHeapRecent: this.maxHeapRecent.size(),
      },
    };
  }

  /**
   * Helper: Acquire read lock (multiple readers allowed)
   */
  async _acquireReadLock() {
    while (this.readWriteLock.isWriting) {
      await new Promise(resolve => this.readWriteLock.readQueue.push(resolve));
    }
    this.readWriteLock.readCount++;
  }

  /**
   * Helper: Release read lock
   */
  _releaseReadLock() {
    this.readWriteLock.readCount--;
    if (this.readWriteLock.readCount === 0 && this.readWriteLock.writeQueue.length > 0) {
      const nextWriter = this.readWriteLock.writeQueue.shift();
      nextWriter();
    }
  }

  /**
   * Helper: Acquire write lock (exclusive access)
   */
  async _acquireWriteLock() {
    if (!this.readWriteLock.isWriting && this.readWriteLock.readCount === 0) {
      this.readWriteLock.isWriting = true;
      return;
    }
    
    await new Promise(resolve => this.readWriteLock.writeQueue.push(resolve));
    this.readWriteLock.isWriting = true;
  }

  /**
   * Helper: Release write lock
   */
  _releaseWriteLock() {
    this.readWriteLock.isWriting = false;
    
    // Prioritize waiting writers
    if (this.readWriteLock.writeQueue.length > 0) {
      const nextWriter = this.readWriteLock.writeQueue.shift();
      nextWriter();
    } else {
      // Allow all waiting readers
      while (this.readWriteLock.readQueue.length > 0) {
        const reader = this.readWriteLock.readQueue.shift();
        reader();
      }
    }
  }

  /**
   * Helper: Start periodic snapshot timer
   */
  _startPeriodicSnapshot() {
    setInterval(async () => {
      try {
        await this.snapshot();
      } catch (error) {
        console.error('[IndexManager] Periodic snapshot error:', error.message);
      }
    }, this.snapshotInterval);
  }

  /**
   * Cleanup resources
   */
  async shutdown() {
    console.log('[IndexManager] Shutting down...');
    await this.snapshot();
    console.log('[IndexManager] Shutdown complete');
  }
}

module.exports = { IndexManager };
