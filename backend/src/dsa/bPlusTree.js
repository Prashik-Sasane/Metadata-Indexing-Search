/**
 * B+ Tree Implementation for Range Queries
 * Time Complexity:
 *   - Search: O(log N)
 *   - Insert: O(log N)
 *   - Delete: O(log N)
 *   - Range Query: O(log N + K) where K = number of results
 * 
 * Use Case: File size ranges, date ranges, numeric range queries
 */
class BPlusTreeNode {
  constructor(isLeaf = false) {
    this.keys = []; // Sorted array of keys
    this.values = []; // Array of fileID arrays (parallel to keys)
    this.children = []; // Child node pointers (for internal nodes)
    this.isLeaf = isLeaf;
    this.next = null; // Pointer to next leaf node (for range scans)
    this.parent = null; // Parent pointer
  }

  isFull(order) {
    return this.keys.length >= order;
  }

  isUnderflow(order) {
    const minKeys = Math.ceil(order / 2) - 1;
    return this.keys.length < minKeys;
  }
}

class BPlusTree {
  constructor(order = 100) {
    this.order = order; // Maximum number of children
    this.root = new BPlusTreeNode(true);
    this.leafHead = this.root; // Head of leaf linked list
    this.size = 0; // Total number of entries
  }

  /**
   * Insert a key-value pair into the B+ Tree
   * @param {number} key - Numeric key (size, timestamp, etc.)
   * @param {string} fileID - File UUID
   */
  insert(key, fileID) {
    if (typeof key !== 'number') {
      throw new Error('Key must be a number');
    }

    const result = this._insertIntoNode(this.root, key, fileID);

    // If root was split, create new root
    if (result.split) {
      const newRoot = new BPlusTreeNode(false);
      newRoot.keys = [result.key];
      newRoot.children = [result.left, result.right];
      result.left.parent = newRoot;
      result.right.parent = newRoot;
      this.root = newRoot;
    }

    this.size++;
  }

  /**
   * Search for exact key match
   * @param {number} key - Key to search for
   * @returns {string[]} Array of fileIDs
   */
  search(key) {
    const leaf = this._findLeaf(key);
    const index = leaf.keys.indexOf(key);
    
    if (index !== -1) {
      return [...leaf.values[index]];
    }
    
    return [];
  }

  /**
   * Range query - find all fileIDs with keys in [min, max]
   * @param {number} min - Minimum key (inclusive)
   * @param {number} max - Maximum key (inclusive)
   * @returns {string[]} Array of fileIDs in range
   */
  rangeSearch(min, max) {
    if (min > max) {
      throw new Error('min must be <= max');
    }

    const results = [];
    let leaf = this._findLeaf(min);

    // Traverse leaf nodes using linked list
    while (leaf) {
      for (let i = 0; i < leaf.keys.length; i++) {
        const key = leaf.keys[i];
        
        if (key >= min && key <= max) {
          results.push(...leaf.values[i]);
        } else if (key > max) {
          return results; // Past the range
        }
      }
      
      leaf = leaf.next;
    }

    return results;
  }

  /**
   * Delete a fileID from the tree
   * @param {number} key - Key
   * @param {string} fileID - File UUID to remove
   */
  delete(key, fileID) {
    const leaf = this._findLeaf(key);
    const index = leaf.keys.indexOf(key);

    if (index !== -1) {
      const fileIndex = leaf.values[index].indexOf(fileID);
      if (fileIndex !== -1) {
        leaf.values[index].splice(fileIndex, 1);

        // If no more fileIDs for this key, remove the key
        if (leaf.values[index].length === 0) {
          leaf.keys.splice(index, 1);
          leaf.values.splice(index, 1);
        }

        this.size--;
      }
    }
  }

  /**
   * Get minimum key
   * @returns {number|null}
   */
  getMin() {
    let node = this.root;
    while (!node.isLeaf) {
      node = node.children[0];
    }
    return node.keys.length > 0 ? node.keys[0] : null;
  }

  /**
   * Get maximum key
   * @returns {number|null}
   */
  getMax() {
    let node = this.root;
    while (!node.isLeaf) {
      node = node.children[node.children.length - 1];
    }
    return node.keys.length > 0 ? node.keys[node.keys.length - 1] : null;
  }

  /**
   * Helper: Find the leaf node that should contain the key
   */
  _findLeaf(key) {
    let node = this.root;

    while (!node.isLeaf) {
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) {
        i++;
      }
      node = node.children[i];
    }

    return node;
  }

  /**
   * Helper: Insert into a node (handles splitting)
   */
  _insertIntoNode(node, key, fileID) {
    if (node.isLeaf) {
      // Insert into leaf node
      let index = 0;
      while (index < node.keys.length && key > node.keys[index]) {
        index++;
      }

      if (index < node.keys.length && key === node.keys[index]) {
        // Key exists, add fileID to existing entry
        if (!node.values[index].includes(fileID)) {
          node.values[index].push(fileID);
        }
        return { split: false };
      }

      // Insert new key
      node.keys.splice(index, 0, key);
      node.values.splice(index, 0, [fileID]);

      // Check if node needs splitting
      if (node.isFull(this.order)) {
        return this._splitLeaf(node);
      }

      return { split: false };
    } else {
      // Internal node - find child to insert into
      let childIndex = 0;
      while (childIndex < node.keys.length && key >= node.keys[childIndex]) {
        childIndex++;
      }

      const child = node.children[childIndex];
      const result = this._insertIntoNode(child, key, fileID);

      if (result.split) {
        // Insert the new key and child
        node.keys.splice(childIndex, 0, result.key);
        node.children.splice(childIndex, 1, result.left, result.right);

        // Check if this node needs splitting
        if (node.isFull(this.order)) {
          return this._splitInternal(node);
        }
      }

      return { split: false };
    }
  }

  /**
   * Helper: Split a leaf node
   */
  _splitLeaf(leaf) {
    const midIndex = Math.floor(leaf.keys.length / 2);

    const newLeaf = new BPlusTreeNode(true);
    newLeaf.keys = leaf.keys.slice(midIndex);
    newLeaf.values = leaf.values.slice(midIndex);
    newLeaf.next = leaf.next;
    newLeaf.parent = leaf.parent;

    leaf.keys = leaf.keys.slice(0, midIndex);
    leaf.values = leaf.values.slice(0, midIndex);
    leaf.next = newLeaf;

    // Update parent pointers for values
    return {
      split: true,
      key: newLeaf.keys[0],
      left: leaf,
      right: newLeaf,
    };
  }

  /**
   * Helper: Split an internal node
   */
  _splitInternal(node) {
    const midIndex = Math.floor(node.keys.length / 2);
    const midKey = node.keys[midIndex];

    const newNode = new BPlusTreeNode(false);
    newNode.keys = node.keys.slice(midIndex + 1);
    newNode.children = node.children.slice(midIndex + 1);
    newNode.parent = node.parent;

    // Update parent pointers for children
    for (const child of newNode.children) {
      child.parent = newNode;
    }

    node.keys = node.keys.slice(0, midIndex);
    node.children = node.children.slice(0, midIndex + 1);

    return {
      split: true,
      key: midKey,
      left: node,
      right: newNode,
    };
  }

  /**
   * Get tree statistics
   */
  getStats() {
    return {
      size: this.size,
      order: this.order,
      height: this._getHeight(this.root),
      leafCount: this._countLeaves(this.root),
      minKey: this.getMin(),
      maxKey: this.getMax(),
    };
  }

  _getHeight(node) {
    if (node.isLeaf) return 1;
    return 1 + this._getHeight(node.children[0]);
  }

  _countLeaves(node) {
    if (node.isLeaf) return 1;
    
    let count = 0;
    for (const child of node.children) {
      count += this._countLeaves(child);
    }
    return count;
  }
}

module.exports = { BPlusTree, BPlusTreeNode };
