/**
 * File Routes - API endpoints for file management
 */

const express = require('express');
const {
  createFile,
  getFile,
  updateTags,
  deleteFile,
  listFiles,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
} = require('../controllers/fileController');

const router = express.Router();

// File CRUD endpoints
router.post('/files', createFile);
router.get('/files', listFiles);
router.get('/files/:id', getFile);
router.put('/files/:id/tags', updateTags);
router.delete('/files/:id', deleteFile);

// Presigned URL endpoints
router.post('/files/upload-url', getPresignedUploadUrl);
router.get('/files/:id/download-url', getPresignedDownloadUrl);

module.exports = router;
