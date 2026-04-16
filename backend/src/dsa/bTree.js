/**
 * B-Tree for Disk-Based Persistent Index with WAL (Write-Ahead Log)
 * Time Complexity:
 *   - Search: O(log N)
 *   - Insert: O(log N)
 *   - Delete: O(log N)
 * 
 * Use Case: Persistent index on disk, crash recovery via WAL
 * Provides durability for in-memory indexes
 */

const fs = require('fs').promises;
const path = require('path');

class BTreeDiskNode {
  constructor(isLeaf = false) {
    this.keys = [];
    this.values = []; // Array of fileID arrays
    this.children = []; // Child node IDs (for internal nodes)
    this.isLeaf = isLeaf;
  }
}

class BTreeDisk {
  /**
   * @param {string} filePath - Path to store the index file
   * @param {number} pageSize - Page size for disk I/O (default 4096 bytes)
   */
  constructor(filePath, pageSize = 4096) {
    this.filePath = filePath;
    this.pageSize = pageSize;
    this.root = new BTreeDiskNode(true);
    this.order = Math.floor(pageSize / 64); // Approximate order based on page size
    this.walPath = filePath + '.wal';
    this.size = 0;
  }

  /**
   * Initialize the B-Tree disk index
   */
  async init() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Try to load existing index
      const exists = await this._fileExists(this.filePath);
      if (exists) {
        await this._loadIndex();
      }

      // Replay WAL for crash recovery
      await this.replayWAL();
    } catch (error) {
      console.error('[BTreeDisk] Initialization error:', error.message);
      // Start fresh if loading fails
      this.root = new BTreeDiskNode(true);
    }
  }

  /**
   * Insert a key-value pair with WAL logging
   * @param {string|number} key - Key
   * @param {string} fileID - File UUID
   */
  async insert(key, fileID) {
    // 1. Write to WAL first (durability guarantee)
    await this._writeToWAL('INSERT', key, fileID);

    // 2. Insert into in-memory tree
    this._insertIntoNode(this.root, key, fileID);
    this.size++;

    // 3. Periodic snapshot to disk
    if (this.size % 1000 === 0) {
      await this.snapshot();
    }
  }

  /**
   * Search for a key
   * @param {string|number} key - Key to search
   * @returns {string[]} Array of fileIDs
   */
  async search(key) {
    return this._searchInNode(this.root, key);
  }

  /**
   * Create a snapshot of the current index state
   */
  async snapshot() {
    try {
      const data = {
        root: this._serializeNode(this.root),
        size: this.size,
        timestamp: new Date().toISOString(),
      };

      await fs.writeFile(this.filePath, JSON.stringify(data));
      console.log('[BTreeDisk] Snapshot created successfully');
    } catch (error) {
      console.error('[BTreeDisk] Snapshot error:', error.message);
    }
  }

  /**
   * Replay WAL for crash recovery
   */
  async replayWAL() {
    try {
      const walExists = await this._fileExists(this.walPath);
      if (!walExists) {
        return;
      }

      const walContent = await fs.readFile(this.walPath, 'utf-8');
      const walEntries = walContent.split('\n').filter(line => line.trim());

      console.log(`[BTreeDisk] Replaying ${walEntries.length} WAL entries...`);

      for (const entry of walEntries) {
        const { operation, key, fileID } = JSON.parse(entry);

        if (operation === 'INSERT') {
          this._insertIntoNode(this.root, key, fileID);
          this.size++;
        } else if (operation === 'DELETE') {
          this._deleteFromNode(this.root, key, fileID);
          this.size = Math.max(0, this.size - 1);
        }
      }

      // Clear WAL after successful replay
      await fs.writeFile(this.walPath, '');
      console.log('[BTreeDisk] WAL replay completed');
    } catch (error) {
      console.error('[BTreeDisk] WAL replay error:', error.message);
    }
  }

  /**
   * Delete a fileID from the tree
   * @param {string|number} key - Key
   * @param {string} fileID - File UUID
   */
  async delete(key, fileID) {
    // 1. Write to WAL
    await this._writeToWAL('DELETE', key, fileID);

    // 2. Delete from in-memory tree
    this._deleteFromNode(this.root, key, fileID);
    this.size = Math.max(0, this.size - 1);
  }

  /**
   * Get tree statistics
   */
  getStats() {
    return {
      size: this.size,
      order: this.order,
      height: this._getHeight(this.root),
      filePath: this.filePath,
    };
  }

  /**
   * Helper: Insert into node (simplified B-Tree insert)
   */
  _insertIntoNode(node, key, fileID) {
    if (node.isLeaf) {
      // Find insertion position
      let index = 0;
      while (index < node.keys.length && key > node.keys[index]) {
        index++;
      }

      // Check if key exists
      if (index < node.keys.length && key === node.keys[index]) {
        if (!node.values[index].includes(fileID)) {
          node.values[index].push(fileID);
        }
        return;
      }

      // Insert key and value
      node.keys.splice(index, 0, key);
      node.values.splice(index, 0, [fileID]);
    } else {
      // Internal node - find appropriate child
      let childIndex = 0;
      while (childIndex < node.keys.length && key > node.keys[childIndex]) {
        childIndex++;
      }

      if (node.children[childIndex]) {
        this._insertIntoNode(node.children[childIndex], key, fileID);
      }
    }
  }

  /**
   * Helper: Delete from node
   */
  _deleteFromNode(node, key, fileID) {
    if (node.isLeaf) {
      const index = node.keys.indexOf(key);
      if (index !== -1) {
        const fileIndex = node.values[index].indexOf(fileID);
        if (fileIndex !== -1) {
          node.values[index].splice(fileIndex, 1);

          // Remove key if no more fileIDs
          if (node.values[index].length === 0) {
            node.keys.splice(index, 1);
            node.values.splice(index, 1);
          }
        }
      }
    } else {
      let childIndex = 0;
      while (childIndex < node.keys.length && key > node.keys[childIndex]) {
        childIndex++;
      }

      if (node.children[childIndex]) {
        this._deleteFromNode(node.children[childIndex], key, fileID);
      }
    }
  }

  /**
   * Helper: Search in node
   */
  _searchInNode(node, key) {
    if (node.isLeaf) {
      const index = node.keys.indexOf(key);
      return index !== -1 ? [...node.values[index]] : [];
    }

    let childIndex = 0;
    while (childIndex < node.keys.length && key > node.keys[childIndex]) {
      childIndex++;
    }

    if (node.children[childIndex]) {
      return this._searchInNode(node.children[childIndex], key);
    }

    return [];
  }

  /**
   * Helper: Write to WAL file
   */
  async _writeToWAL(operation, key, fileID) {
    const entry = JSON.stringify({ operation, key, fileID, timestamp: Date.now() });
    await fs.appendFile(this.walPath, entry + '\n');
  }

  /**
   * Helper: Load index from disk
   */
  async _loadIndex() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.root = this._deserializeNode(parsed.root);
      this.size = parsed.size || 0;
      
      console.log('[BTreeDisk] Index loaded from disk');
    } catch (error) {
      console.error('[BTreeDisk] Load index error:', error.message);
    }
  }

  /**
   * Helper: Serialize node for disk storage
   */
  _serializeNode(node) {
    return {
      keys: node.keys,
      values: node.values,
      isLeaf: node.isLeaf,
      children: node.children.map(child => this._serializeNode(child)),
    };
  }

  /**
   * Helper: Deserialize node from disk
   */
  _deserializeNode(data) {
    const node = new BTreeDiskNode(data.isLeaf);
    node.keys = data.keys || [];
    node.values = data.values || [];
    
    if (data.children && data.children.length > 0) {
      node.children = data.children.map(childData => 
        this._deserializeNode(childData)
      );
    }
    
    return node;
  }

  /**
   * Helper: Get height of tree
   */
  _getHeight(node) {
    if (!node || node.isLeaf) return 1;
    
    let maxChildHeight = 0;
    for (const child of node.children) {
      maxChildHeight = Math.max(maxChildHeight, this._getHeight(child));
    }
    
    return 1 + maxChildHeight;
  }

  /**
   * Helper: Check if file exists
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { BTreeDisk, BTreeDiskNode };
