/**
 * File Routes - API endpoints for file management
 */

const express = require('express');
const validateUUID = require('../middleware/validateUUID');
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

// Presigned URL endpoints
router.post('/files/upload-url', getPresignedUploadUrl);
router.get('/files/:id/download-url', getPresignedDownloadUrl);

// File CRUD endpoints
router.post('/files', createFile);
router.get('/files', listFiles);

router.get('/files/:id', validateUUID, getFile);
router.put('/files/:id', validateUUID, updateTags);
router.delete('/files/:id', validateUUID, deleteFile);


module.exports = router;
