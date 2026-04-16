/**
 * Radix Trie (Compressed Prefix Tree) for fast prefix search
 * Time Complexity:
 *   - Insert: O(L) where L = key length
 *   - Search: O(L + K) where K = number of results
 *   - Delete: O(L)
 * Space Complexity: O(N * L) where N = number of keys
 */

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.fileIDs = []; // Stores file UUIDs at this node
  }
}

class RadixTrie {
  constructor() {
    this.root = new TrieNode();
    this.size = 0; // Total number of unique paths
  }

  /**
   * Insert a file path into the trie
   * @param {string} path - File path or S3 key
   * @param {string} fileID - UUID of the file
   */
  insert(path, fileID) {
    if (!path || !fileID) {
      throw new Error('Path and fileID are required');
    }

    let node = this.root;

    for (const char of path) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }

    node.isEnd = true;
    
    // Add fileID if not already present
    if (!node.fileIDs.includes(fileID)) {
      node.fileIDs.push(fileID);
    }

    this.size++;
  }

  /**
   * Search for exact path match
   * @param {string} path - File path to search
   * @returns {string[]} Array of fileIDs
   */
  search(path) {
    let node = this.root;

    for (const char of path) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char);
    }

    return node.isEnd ? [...node.fileIDs] : [];
  }

  /**
   * Prefix search - find all files matching the prefix
   * @param {string} prefix - Prefix to search for
   * @returns {string[]} Array of fileIDs matching the prefix
   */
  prefixSearch(prefix) {
    let node = this.root;

    // Navigate to the node representing the prefix
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return []; // Prefix not found
      }
      node = node.children.get(char);
    }

    // Collect all fileIDs from this node and its descendants
    const results = [];
    this._collectAllFileIDs(node, results);

    return results;
  }

  /**
   * Delete a file from the trie
   * @param {string} path - File path
   * @param {string} fileID - File UUID to remove
   */
  delete(path, fileID) {
    if (!path || !fileID) {
      return;
    }

    const pathStack = [];
    let node = this.root;

    // Navigate to the target node
    for (const char of path) {
      if (!node.children.has(char)) {
        return; // Path doesn't exist
      }
      pathStack.push({ node, char });
      node = node.children.get(char);
    }

    // Remove fileID from the node
    const index = node.fileIDs.indexOf(fileID);
    if (index !== -1) {
      node.fileIDs.splice(index, 1);
    }

    // If no more fileIDs and no children, remove the node
    if (node.fileIDs.length === 0 && node.children.size === 0) {
      node.isEnd = false;
      this._pruneEmptyNodes(pathStack);
    }

    this.size = Math.max(0, this.size - 1);
  }

  /**
   * Get all unique prefixes up to a certain depth
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {string[]} Array of prefixes
   */
  getPrefixes(maxDepth = 3) {
    const prefixes = [];
    this._collectPrefixes(this.root, '', prefixes, maxDepth, 0);
    return prefixes;
  }

  /**
   * Helper: Collect all fileIDs from a node and its descendants
   */
  _collectAllFileIDs(node, results) {
    if (node.isEnd && node.fileIDs.length > 0) {
      results.push(...node.fileIDs);
    }

    for (const childNode of node.children.values()) {
      this._collectAllFileIDs(childNode, results);
    }
  }

  /**
   * Helper: Prune empty nodes from the trie
   */
  _pruneEmptyNodes(pathStack) {
    for (let i = pathStack.length - 1; i >= 0; i--) {
      const { node, char } = pathStack[i];
      const childNode = node.children.get(char);

      if (
        childNode &&
        childNode.children.size === 0 &&
        childNode.fileIDs.length === 0 &&
        !childNode.isEnd
      ) {
        node.children.delete(char);
      } else {
        break; // Stop pruning if we find a non-empty node
      }
    }
  }

  /**
   * Helper: Collect prefixes up to maxDepth
   */
  _collectPrefixes(node, currentPrefix, prefixes, maxDepth, depth) {
    if (depth > 0 && node.isEnd) {
      prefixes.push(currentPrefix);
    }

    if (depth >= maxDepth) {
      return;
    }

    for (const [char, childNode] of node.children.entries()) {
      this._collectPrefixes(
        childNode,
        currentPrefix + char,
        prefixes,
        maxDepth,
        depth + 1
      );
    }
  }

  /**
   * Get trie statistics
   */
  getStats() {
    return {
      totalPaths: this.size,
      rootChildren: this.root.children.size,
      depth: this._getMaxDepth(this.root),
    };
  }

  _getMaxDepth(node) {
    if (node.children.size === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const childNode of node.children.values()) {
      maxDepth = Math.max(maxDepth, this._getMaxDepth(childNode));
    }

    return 1 + maxDepth;
  }
}

module.exports = { RadixTrie, TrieNode };
