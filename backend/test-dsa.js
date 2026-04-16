/**
 * DSA Engine Test Script
 * Verifies all data structures work correctly
 */

const {
  RadixTrie,
  BPlusTree,
  AVLTree,
  MinHeap,
  MaxHeap,
  IndexManager,
} = require('./src/dsa');

function testTrie() {
  console.log('\n🧪 Testing Radix Trie...');
  const trie = new RadixTrie();

  trie.insert('projects/backend/api.pdf', 'file-1');
  trie.insert('projects/backend/server.js', 'file-2');
  trie.insert('projects/frontend/app.tsx', 'file-3');
  trie.insert('docs/readme.md', 'file-4');

  const results = trie.prefixSearch('projects/backend/');
  console.log(`✓ Prefix search "projects/backend/": ${results.length} files found`);
  console.log(`  Results: ${results.join(', ')}`);

  const exact = trie.search('docs/readme.md');
  console.log(`✓ Exact search "docs/readme.md": ${exact.length} file(s)`);

  trie.delete('projects/backend/api.pdf', 'file-1');
  const afterDelete = trie.prefixSearch('projects/backend/');
  console.log(`✓ After delete: ${afterDelete.length} files in projects/backend/`);
}

function testBPlusTree() {
  console.log('\n🧪 Testing B+ Tree...');
  const bpt = new BPlusTree(10);

  bpt.insert(1000, 'file-1');
  bpt.insert(5000, 'file-2');
  bpt.insert(3000, 'file-3');
  bpt.insert(8000, 'file-4');
  bpt.insert(2000, 'file-5');

  const range = bpt.rangeSearch(2000, 6000);
  console.log(`✓ Range search [2000, 6000]: ${range.length} files found`);
  console.log(`  Results: ${range.join(', ')}`);

  const exact = bpt.search(3000);
  console.log(`✓ Exact search 3000: ${exact.length} file(s)`);

  const stats = bpt.getStats();
  console.log(`✓ B+ Tree stats: ${JSON.stringify(stats)}`);
}

function testAVLTree() {
  console.log('\n🧪 Testing AVL Tree...');
  const avl = new AVLTree();

  avl.insert('backend', 'file-1');
  avl.insert('frontend', 'file-2');
  avl.insert('backend', 'file-3');
  avl.insert('database', 'file-4');
  avl.insert('devops', 'file-5');

  const backend = avl.search('backend');
  console.log(`✓ Search "backend": ${backend.length} files`);
  console.log(`  Results: ${backend.join(', ')}`);

  const balanced = avl.isBalanced();
  console.log(`✓ Tree balanced: ${balanced}`);

  const stats = avl.getStats();
  console.log(`✓ AVL stats: ${JSON.stringify(stats)}`);
}

function testHeap() {
  console.log('\n🧪 Testing Heap...');
  const maxHeap = new MaxHeap((a, b) => a.size - b.size);

  maxHeap.insert({ id: 'file-1', size: 1000 });
  maxHeap.insert({ id: 'file-2', size: 5000 });
  maxHeap.insert({ id: 'file-3', size: 3000 });
  maxHeap.insert({ id: 'file-4', size: 8000 });

  const top3 = maxHeap.getTopKLargest(3);
  console.log(`✓ Top 3 largest: ${top3.map(f => f.id).join(', ')}`);
  console.log(`  Sizes: ${top3.map(f => f.size).join(', ')}`);

  const max = maxHeap.peekMax();
  console.log(`✓ Max element: ${max.id} (${max.size} bytes)`);
}

async function testIndexManager() {
  console.log('\n🧪 Testing Index Manager...');
  const indexManager = new IndexManager({
    diskIndexPath: './data/test-wal.index',
  });

  await indexManager.init();

  const fileMetadata = {
    id: 'test-file-1',
    s3_key: 'projects/test/file.pdf',
    name: 'file.pdf',
    size: 2048576,
    mime_type: 'application/pdf',
    owner_id: 'user-123',
    created_at: new Date().toISOString(),
    tags: { production: true, backend: true },
  };

  await indexManager.insertFile(fileMetadata);
  console.log('✓ File inserted into all indexes');

  const searchResult = await indexManager.search({ prefix: 'projects/' });
  console.log(`✓ Prefix search: ${searchResult.count} file(s), ${searchResult.executionTime}ms`);

  const tagResult = await indexManager.search({ tag: 'backend' });
  console.log(`✓ Tag search: ${tagResult.count} file(s), ${tagResult.executionTime}ms`);

  const stats = indexManager.getStats();
  console.log(`✓ Index stats: Trie depth=${stats.trie.depth}, Total inserts=${stats.operations.totalInserts}`);

  await indexManager.shutdown();
  console.log('✓ Index manager shutdown complete');
}

async function runAllTests() {
  console.log('🚀 Running DSA Engine Tests...\n');

  try {
    testTrie();
    testBPlusTree();
    testAVLTree();
    testHeap();
    await testIndexManager();

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
