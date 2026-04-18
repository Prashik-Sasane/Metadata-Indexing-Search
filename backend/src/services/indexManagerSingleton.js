/**
 * Shared IndexManager Singleton
 * Ensures all controllers use the same index instance
 */

const { IndexManager } = require('../dsa/indexManager');

// Singleton instance
let indexManagerInstance = null;

/**
 * Get or create the IndexManager singleton
 * @returns {IndexManager}
 */
function getIndexManager() {
  if (!indexManagerInstance) {
    indexManagerInstance = new IndexManager();
    console.log('[IndexManager] Singleton created');
  }
  return indexManagerInstance;
}

/**
 * Initialize the IndexManager (call once on app startup)
 */
async function initIndexManager() {
  const manager = getIndexManager();
  await manager.init();
  return manager;
}

module.exports = {
  getIndexManager,
  initIndexManager,
};
