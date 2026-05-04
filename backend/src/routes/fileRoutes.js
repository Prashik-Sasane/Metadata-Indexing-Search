/**
 * File Routes - API endpoints for file management
 */

const express = require('express');
const multer = require('multer');
const validateUUID = require('../middleware/validateUUID');
const {
  uploadFile,
  createFile,
  getFile,
  updateTags,
  deleteFile,
  listFiles,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  downloadFile,
} = require('../controllers/fileController');

const router = express.Router();

// Multer config — store files in memory for parsing before S3 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

// Direct file upload endpoint (multipart/form-data)
router.post('/files/upload', upload.single('file'), uploadFile);

// Presigned URL endpoints
router.post('/files/upload-url', getPresignedUploadUrl);
router.get('/files/:id/download-url', getPresignedDownloadUrl);
router.get('/files/:id/download', downloadFile);

// File CRUD endpoints
router.post('/files', createFile);
router.get('/files', listFiles);

router.get('/files/:id', validateUUID, getFile);
router.put('/files/:id', validateUUID, updateTags);
router.delete('/files/:id', validateUUID, deleteFile);

module.exports = router;
