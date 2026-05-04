/**
 * Custom HashMap - Open Addressing with Linear Probing
 * Used as the primary file metadata store for O(1) lookups
 *
 * Time Complexity:
 *   - put: O(1) amortized
 *   - get: O(1) amortized
 *   - delete: O(1) amortized
 *   - getAll: O(N)
 * Space Complexity: O(N)
 *
 * Features:
 *   - Custom hash function (FNV-1a inspired)
 *   - Linear probing for collision resolution
 *   - Dynamic resizing when load factor > 0.7
 */

const DELETED = Symbol('DELETED');

class HashMapEntry {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}

class HashMap {
  constructor(initialCapacity = 64) {
    this.capacity = initialCapacity;
    this.buckets = new Array(this.capacity).fill(null);
    this._size = 0;
    this.loadFactorThreshold = 0.7;
    this.totalCollisions = 0;
    this.totalResizes = 0;
  }

  /**
   * FNV-1a inspired hash function
   * @param {string} key
   * @returns {number} hash value
   */
  _hash(key) {
    let hash = 2166136261; // FNV offset basis (32-bit)
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = (hash * 16777619) >>> 0; // FNV prime, force unsigned 32-bit
    }
    return hash % this.capacity;
  }

  /**
   * Insert or update a key-value pair
   * @param {string} key
   * @param {*} value
   */
  put(key, value) {
    if (this._size / this.capacity >= this.loadFactorThreshold) {
      this._resize();
    }

    let index = this._hash(key);
    let firstDeletedIndex = -1;

    for (let i = 0; i < this.capacity; i++) {
      const probe = (index + i) % this.capacity;
      const entry = this.buckets[probe];

      if (entry === null) {
        // Empty slot found
        const insertAt = firstDeletedIndex !== -1 ? firstDeletedIndex : probe;
        this.buckets[insertAt] = new HashMapEntry(key, value);
        this._size++;
        if (i > 0) this.totalCollisions++;
        return;
      }

      if (entry === DELETED) {
        if (firstDeletedIndex === -1) firstDeletedIndex = probe;
        continue;
      }

      if (entry.key === key) {
        // Update existing key
        entry.value = value;
        return;
      }

      if (i > 0) this.totalCollisions++;
    }

    // If we get here with a deleted slot, use it
    if (firstDeletedIndex !== -1) {
      this.buckets[firstDeletedIndex] = new HashMapEntry(key, value);
      this._size++;
    }
  }

  /**
   * Get value by key
   * @param {string} key
   * @returns {*} value or undefined
   */
  get(key) {
    let index = this._hash(key);

    for (let i = 0; i < this.capacity; i++) {
      const probe = (index + i) % this.capacity;
      const entry = this.buckets[probe];

      if (entry === null) return undefined;
      if (entry === DELETED) continue;
      if (entry.key === key) return entry.value;
    }

    return undefined;
  }

  /**
   * Check if key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key-value pair
   * @param {string} key
   * @returns {boolean} true if deleted
   */
  delete(key) {
    let index = this._hash(key);

    for (let i = 0; i < this.capacity; i++) {
      const probe = (index + i) % this.capacity;
      const entry = this.buckets[probe];

      if (entry === null) return false;
      if (entry === DELETED) continue;

      if (entry.key === key) {
        this.buckets[probe] = DELETED;
        this._size--;
        return true;
      }
    }

    return false;
  }

  /**
   * Get all entries as an array of {key, value}
   * @returns {Array<{key: string, value: *}>}
   */
  getAll() {
    const entries = [];
    for (const entry of this.buckets) {
      if (entry !== null && entry !== DELETED) {
        entries.push({ key: entry.key, value: entry.value });
      }
    }
    return entries;
  }

  /**
   * Get all values
   * @returns {Array}
   */
  values() {
    const vals = [];
    for (const entry of this.buckets) {
      if (entry !== null && entry !== DELETED) {
        vals.push(entry.value);
      }
    }
    return vals;
  }

  /**
   * Get all keys
   * @returns {string[]}
   */
  keys() {
    const keys = [];
    for (const entry of this.buckets) {
      if (entry !== null && entry !== DELETED) {
        keys.push(entry.key);
      }
    }
    return keys;
  }

  /**
   * Current number of entries
   * @returns {number}
   */
  size() {
    return this._size;
  }

  /**
   * Resize the hash table (double capacity)
   */
  _resize() {
    const oldBuckets = this.buckets;
    this.capacity *= 2;
    this.buckets = new Array(this.capacity).fill(null);
    this._size = 0;
    this.totalResizes++;

    for (const entry of oldBuckets) {
      if (entry !== null && entry !== DELETED) {
        this.put(entry.key, entry.value);
      }
    }
  }

  /**
   * Get statistics about the HashMap
   */
  getStats() {
    let occupied = 0;
    let deleted = 0;
    for (const entry of this.buckets) {
      if (entry !== null && entry !== DELETED) occupied++;
      if (entry === DELETED) deleted++;
    }

    return {
      size: this._size,
      capacity: this.capacity,
      loadFactor: (this._size / this.capacity).toFixed(3),
      occupied,
      deletedSlots: deleted,
      totalCollisions: this.totalCollisions,
      totalResizes: this.totalResizes,
    };
  }

  /**
   * Serialize to plain object for snapshotting
   */
  toJSON() {
    const entries = [];
    for (const entry of this.buckets) {
      if (entry !== null && entry !== DELETED) {
        entries.push({ key: entry.key, value: entry.value });
      }
    }
    return entries;
  }

  /**
   * Restore from serialized data
   * @param {Array<{key: string, value: *}>} data
   */
  fromJSON(data) {
    this.capacity = Math.max(64, data.length * 2);
    this.buckets = new Array(this.capacity).fill(null);
    this._size = 0;
    this.totalCollisions = 0;

    for (const { key, value } of data) {
      this.put(key, value);
    }
  }
}

module.exports = { HashMap };
