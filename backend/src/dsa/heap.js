/**
 * Min/Max Heap Implementation for Top-K Queries
 * Time Complexity:
 *   - Insert: O(log N)
 *   - Extract Min/Max: O(log N)
 *   - Get Top-K: O(K log N)
 *   - Peek: O(1)
 * 
 * Use Case: Top-K largest files, most recent uploads, priority queues
 */

class MinHeap {
  /**
   * @param {Function} compareFn - Comparison function (a, b) => a.value - b.value
   */
  constructor(compareFn = (a, b) => a - b) {
    this.heap = [];
    this.compare = compareFn;
  }

  /**
   * Insert an element into the heap
   * @param {any} element - Element to insert
   */
  insert(element) {
    this.heap.push(element);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Extract and return the minimum element
   * @returns {any|null}
   */
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._bubbleDown(0);

    return min;
  }

  /**
   * Peek at the minimum element without removing it
   * @returns {any|null}
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /**
   * Get Top-K smallest elements
   * @param {number} k - Number of elements to retrieve
   * @returns {any[]}
   */
  getTopK(k) {
    if (k <= 0) return [];
    if (k >= this.heap.length) return [...this.heap].sort(this.compare);

    // Create a temporary copy to avoid modifying original heap
    const tempHeap = [...this.heap];
    const result = [];

    for (let i = 0; i < Math.min(k, this.heap.length); i++) {
      if (tempHeap.length === 0) break;

      // Extract min from temp heap
      const min = tempHeap[0];
      result.push(min);
      
      tempHeap[0] = tempHeap.pop();
      this._bubbleDownInArray(tempHeap, 0, this.compare);
    }

    return result;
  }

  /**
   * Get heap size
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * Check if heap is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Clear all elements
   */
  clear() {
    this.heap = [];
  }

  /**
   * Build heap from array
   * @param {any[]} array - Array of elements
   */
  buildHeap(array) {
    this.heap = [...array];
    
    // Start from last non-leaf node
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this._bubbleDown(i);
    }
  }

  /**
   * Helper: Bubble up element to maintain heap property
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
        break;
      }

      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Helper: Bubble down element to maintain heap property
   */
  _bubbleDown(index) {
    const length = this.heap.length;
    
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
        smallest = leftChild;
      }

      if (rightChild < length && this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      this._swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * Helper: Swap two elements
   */
  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  /**
   * Helper: Bubble down in arbitrary array (for getTopK)
   */
  _bubbleDownInArray(array, index, compare) {
    const length = array.length;
    
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && compare(array[leftChild], array[smallest]) < 0) {
        smallest = leftChild;
      }

      if (rightChild < length && compare(array[rightChild], array[smallest]) < 0) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [array[index], array[smallest]] = [array[smallest], array[index]];
      index = smallest;
    }
  }

  /**
   * Get all elements (for debugging)
   * @returns {any[]}
   */
  toArray() {
    return [...this.heap];
  }
}

/**
 * MaxHeap - Extends MinHeap with reversed comparison
 */
class MaxHeap extends MinHeap {
  constructor(compareFn = (a, b) => a - b) {
    // Reverse the comparison function
    super((a, b) => -compareFn(a, b));
  }

  /**
   * Extract and return the maximum element
   * @returns {any|null}
   */
  extractMax() {
    return this.extractMin(); // In max heap, extractMin gives us max
  }

  /**
   * Peek at the maximum element
   * @returns {any|null}
   */
  peekMax() {
    return this.peek();
  }

  /**
   * Get Top-K largest elements
   * @param {number} k - Number of elements to retrieve
   * @returns {any[]}
   */
  getTopKLargest(k) {
    return this.getTopK(k);
  }
}

/**
 * Priority Queue - Built on MinHeap
 */
class PriorityQueue extends MinHeap {
  constructor() {
    // Compare by priority (lower number = higher priority)
    super((a, b) => a.priority - b.priority);
  }

  /**
   * Enqueue with priority
   * @param {any} data - Data to enqueue
   * @param {number} priority - Priority (lower = higher priority)
   */
  enqueue(data, priority = 0) {
    this.insert({ data, priority });
  }

  /**
   * Dequeue highest priority item
   * @returns {any|null}
   */
  dequeue() {
    const element = this.extractMin();
    return element ? element.data : null;
  }
}

module.exports = { MinHeap, MaxHeap, PriorityQueue };
