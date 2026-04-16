/**
 * AVL Tree (Self-Balancing Binary Search Tree)
 * Time Complexity:
 *   - Search: O(log N)
 *   - Insert: O(log N)
 *   - Delete: O(log N)
 * 
 * Use Case: Tag-based lookups, equality searches, owner-based queries
 * Guarantees O(log N) through strict balance factor enforcement
 */

class AVLNode {
  constructor(key, fileID) {
    this.key = key;
    this.fileIDs = [fileID]; // Multiple files can have same tag
    this.height = 1;
    this.left = null;
    this.right = null;
  }
}

class AVLTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  /**
   * Insert a key-fileID pair into the AVL tree
   * @param {string} key - Tag or metadata value
   * @param {string} fileID - File UUID
   */
  insert(key, fileID) {
    if (!key || !fileID) {
      throw new Error('Key and fileID are required');
    }

    this.root = this._insert(this.root, key, fileID);
  }

  /**
   * Search for exact key match
   * @param {string} key - Key to search for
   * @returns {string[]} Array of fileIDs
   */
  search(key) {
    const node = this._search(this.root, key);
    return node ? [...node.fileIDs] : [];
  }

  /**
   * Delete a fileID from the tree
   * @param {string} key - Key
   * @param {string} fileID - File UUID to remove
   */
  delete(key, fileID) {
    if (!key || !fileID) {
      return;
    }

    this.root = this._delete(this.root, key, fileID);
  }

  /**
   * Get all keys in sorted order (in-order traversal)
   * @returns {string[]} Sorted array of keys
   */
  getInOrder() {
    const result = [];
    this._inOrder(this.root, result);
    return result;
  }

  /**
   * Get minimum key
   * @returns {string|null}
   */
  getMin() {
    if (!this.root) return null;
    let node = this.root;
    while (node.left) {
      node = node.left;
    }
    return node.key;
  }

  /**
   * Get maximum key
   * @returns {string|null}
   */
  getMax() {
    if (!this.root) return null;
    let node = this.root;
    while (node.right) {
      node = node.right;
    }
    return node.key;
  }

  /**
   * Get tree height
   * @returns {number}
   */
  getHeight() {
    return this._getHeight(this.root);
  }

  /**
   * Check if tree is balanced
   * @returns {boolean}
   */
  isBalanced() {
    return this._checkBalance(this.root);
  }

  /**
   * Helper: Internal insert with balancing
   */
  _insert(node, key, fileID) {
    // Standard BST insert
    if (!node) {
      this.size++;
      return new AVLNode(key, fileID);
    }

    if (key < node.key) {
      node.left = this._insert(node.left, key, fileID);
    } else if (key > node.key) {
      node.right = this._insert(node.right, key, fileID);
    } else {
      // Key exists, add fileID if not present
      if (!node.fileIDs.includes(fileID)) {
        node.fileIDs.push(fileID);
      }
      return node; // No rebalancing needed
    }

    // Update height
    node.height = 1 + Math.max(this._getHeight(node.left), this._getHeight(node.right));

    // Rebalance
    return this._rebalance(node);
  }

  /**
   * Helper: Internal delete with balancing
   */
  _delete(node, key, fileID) {
    if (!node) return null;

    if (key < node.key) {
      node.left = this._delete(node.left, key, fileID);
    } else if (key > node.key) {
      node.right = this._delete(node.right, key, fileID);
    } else {
      // Found the node
      const fileIndex = node.fileIDs.indexOf(fileID);
      if (fileIndex !== -1) {
        node.fileIDs.splice(fileIndex, 1);
      }

      // If no more fileIDs, remove the node
      if (node.fileIDs.length === 0) {
        if (!node.left) {
          this.size--;
          return node.right;
        } else if (!node.right) {
          this.size--;
          return node.left;
        }

        // Node with two children: get inorder successor
        const successor = this._getMinNode(node.right);
        node.key = successor.key;
        node.fileIDs = [...successor.fileIDs];
        node.right = this._delete(node.right, successor.key, successor.fileIDs[0]);
      }
    }

    if (!node) return null;

    // Update height
    node.height = 1 + Math.max(this._getHeight(node.left), this._getHeight(node.right));

    // Rebalance
    return this._rebalance(node);
  }

  /**
   * Helper: Rebalance a node based on balance factor
   */
  _rebalance(node) {
    const balance = this._getBalanceFactor(node);

    // Left Left Case
    if (balance > 1 && this._getBalanceFactor(node.left) >= 0) {
      return this._rotateRight(node);
    }

    // Left Right Case
    if (balance > 1 && this._getBalanceFactor(node.left) < 0) {
      node.left = this._rotateLeft(node.left);
      return this._rotateRight(node);
    }

    // Right Right Case
    if (balance < -1 && this._getBalanceFactor(node.right) <= 0) {
      return this._rotateLeft(node);
    }

    // Right Left Case
    if (balance < -1 && this._getBalanceFactor(node.right) > 0) {
      node.right = this._rotateRight(node.right);
      return this._rotateLeft(node);
    }

    return node;
  }

  /**
   * Helper: Right rotation
   */
  _rotateRight(y) {
    const x = y.left;
    const T2 = x.right;

    // Perform rotation
    x.right = y;
    y.left = T2;

    // Update heights
    y.height = Math.max(this._getHeight(y.left), this._getHeight(y.right)) + 1;
    x.height = Math.max(this._getHeight(x.left), this._getHeight(x.right)) + 1;

    return x;
  }

  /**
   * Helper: Left rotation
   */
  _rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;

    // Perform rotation
    y.left = x;
    x.right = T2;

    // Update heights
    x.height = Math.max(this._getHeight(x.left), this._getHeight(x.right)) + 1;
    y.height = Math.max(this._getHeight(y.left), this._getHeight(y.right)) + 1;

    return y;
  }

  /**
   * Helper: Search for a key
   */
  _search(node, key) {
    if (!node || node.key === key) {
      return node;
    }

    if (key < node.key) {
      return this._search(node.left, key);
    }

    return this._search(node.right, key);
  }

  /**
   * Helper: In-order traversal
   */
  _inOrder(node, result) {
    if (node) {
      this._inOrder(node.left, result);
      result.push(node.key);
      this._inOrder(node.right, result);
    }
  }

  /**
   * Helper: Get height of a node
   */
  _getHeight(node) {
    return node ? node.height : 0;
  }

  /**
   * Helper: Get balance factor
   */
  _getBalanceFactor(node) {
    return node ? this._getHeight(node.left) - this._getHeight(node.right) : 0;
  }

  /**
   * Helper: Get minimum node in subtree
   */
  _getMinNode(node) {
    let current = node;
    while (current && current.left) {
      current = current.left;
    }
    return current;
  }

  /**
   * Helper: Check if tree is balanced
   */
  _checkBalance(node) {
    if (!node) return true;

    const balance = this._getBalanceFactor(node);
    if (Math.abs(balance) > 1) return false;

    return this._checkBalance(node.left) && this._checkBalance(node.right);
  }

  /**
   * Get tree statistics
   */
  getStats() {
    return {
      size: this.size,
      height: this.getHeight(),
      isBalanced: this.isBalanced(),
      minKey: this.getMin(),
      maxKey: this.getMax(),
    };
  }
}

module.exports = { AVLTree, AVLNode };
