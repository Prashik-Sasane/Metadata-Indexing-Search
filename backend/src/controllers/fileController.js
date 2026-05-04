/**
 * File Controller - Handles file upload, metadata CRUD operations
 */

const fs = require('fs');
const path = require('path');
const { IngestService } = require('../services/ingestService');
const { MetadataService } = require('../services/metadataService');
const { getIndexManager } = require('../services/indexManagerSingleton');
const z = require('zod');

// Local uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Get shared IndexManager instance
const indexManager = getIndexManager();
const ingestService = new IngestService(indexManager);
const metadataService = new MetadataService(indexManager);

// Validation schemas
const TagUpdateSchema = z.object({
  tags: z.record(z.boolean()),
});

/**
 * POST /api/v1/files/upload
 * Direct file upload — receives multipart form data,
 * uploads to S3, parses content, indexes in DSA structures
 */
async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Use multipart/form-data with field name "file".',
      });
    }

    const file = req.file;
    const tags = req.body.tags
      ? req.body.tags.split(',').reduce((acc, t) => {
          const tag = t.trim();
          if (tag) acc[tag] = true;
          return acc;
        }, {})
      : {};

    const s3Key = `uploads/${Date.now()}-${file.originalname}`;

    // Step 1: Upload to S3
    let s3Result = null;
    try {
      s3Result = await metadataService.uploadToS3(
        file.buffer,
        s3Key,
        file.mimetype
      );
      console.log(`[Upload] S3 upload success: ${s3Key}`);
    } catch (s3Error) {
      console.warn('[Upload] S3 upload failed (continuing with local indexing):', s3Error.message);
    }

    // Step 1b: Save file locally as fallback
    const localPath = path.join(UPLOADS_DIR, `${Date.now()}-${file.originalname}`);
    try {
      fs.writeFileSync(localPath, file.buffer);
    } catch (e) {
      console.warn('[Upload] Local save failed:', e.message);
    }

    // Step 2: Parse content + Index in DSA structures
    const result = await ingestService.createFile(
      {
        s3_key: s3Key,
        bucket: s3Result?.bucket || process.env.S3_BUCKET || 'metadata-search-files',
        name: file.originalname,
        size: file.size,
        mime_type: file.mimetype || 'application/octet-stream',
        owner_id: req.body.owner_id || undefined,
        tags,
      },
      file.buffer // Pass buffer for content parsing
    );

    // Store local path in result for download
    result.localPath = localPath;

    return res.status(201).json({
      success: true,
      message: 'File uploaded, parsed, and indexed',
      data: result,
      s3Uploaded: !!s3Result,
    });
  } catch (error) {
    console.error('[FileController] Upload error:', error.message);
    next(error);
  }
}

/**
 * POST /api/v1/files
 * Create file metadata (without file upload — for presigned URL flow)
 */
async function createFile(req, res, next) {
  try {
    const file = await ingestService.createFile(req.body);

    return res.status(201).json({
      success: true,
      message: 'File metadata created and indexed',
      data: file,
    });
  } catch (error) {
    console.error('[FileController] Create file error:', error.message);
    next(error);
  }
}

/**
 * GET /api/v1/files/:id
 */
async function getFile(req, res, next) {
  try {
    const { id } = req.params;
    const file = await metadataService.getFile(id);

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    return res.status(200).json({ success: true, data: file });
  } catch (error) {
    console.error('[FileController] Get file error:', error.message);
    next(error);
  }
}

/**
 * PUT /api/v1/files/:id/tags
 */
async function updateTags(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = TagUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tags format',
        details: parsed.error.flatten(),
      });
    }

    const updatedFile = await metadataService.updateTags(id, parsed.data.tags);
    return res.status(200).json({
      success: true,
      message: 'File tags updated',
      data: updatedFile,
    });
  } catch (error) {
    console.error('[FileController] Update tags error:', error.message);
    next(error);
  }
}

/**
 * DELETE /api/v1/files/:id
 */
async function deleteFile(req, res, next) {
  try {
    const { id } = req.params;
    await metadataService.deleteFile(id);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('[FileController] Delete file error:', error.message);
    next(error);
  }
}

/**
 * GET /api/v1/files
 */
async function listFiles(req, res, next) {
  try {
    const params = {
      page: req.query.page || 1,
      limit: req.query.limit || 50,
      owner_id: req.query.owner_id,
      mime_type: req.query.mime_type,
    };

    const result = await metadataService.listFiles(params);

    return res.status(200).json({
      success: true,
      data: result.files,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[FileController] List files error:', error.message);
    next(error);
  }
}

/**
 * POST /api/v1/files/upload-url
 */
async function getPresignedUploadUrl(req, res, next) {
  try {
    const { fileName, mimeType } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    const result = await metadataService.getPresignedUploadUrl(
      fileName,
      mimeType || 'application/octet-stream'
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[Upload URL ERROR]', error);
    next(error);
  }
}

/**
 * GET /api/v1/files/:id/download-url
 * Returns presigned S3 URL or local download URL
 */
async function getPresignedDownloadUrl(req, res, next) {
  try {
    const { id } = req.params;
    const file = await metadataService.getFile(id);

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Try S3 first
    try {
      const url = await metadataService.getPresignedDownloadUrl(file.s3_key);
      return res.status(200).json({
        success: true,
        data: { downloadUrl: url, expiresIn: 3600, source: 's3' },
      });
    } catch {
      // Fall back to local download
      return res.status(200).json({
        success: true,
        data: { downloadUrl: `/api/v1/files/${id}/download`, expiresIn: null, source: 'local' },
      });
    }
  } catch (error) {
    console.error('[FileController] Get download URL error:', error.message);
    next(error);
  }
}

/**
 * GET /api/v1/files/:id/download
 * Direct file download from local storage
 */
async function downloadFile(req, res, next) {
  try {
    const { id } = req.params;
    const file = await metadataService.getFile(id);

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Find the file in local uploads directory
    const uploadsDir = UPLOADS_DIR;
    const files = fs.readdirSync(uploadsDir);
    const localFile = files.find(f => f.endsWith(file.name));

    if (localFile) {
      const filePath = path.join(uploadsDir, localFile);
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      return res.sendFile(filePath);
    }

    // If not on disk, serve content from DSA store if available
    if (file.content) {
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(file.content);
    }

    return res.status(404).json({
      success: false,
      error: 'File not available locally. Configure AWS credentials for S3 download.',
    });
  } catch (error) {
    console.error('[FileController] Download error:', error.message);
    next(error);
  }
}

module.exports = {
  uploadFile,
  createFile,
  getFile,
  updateTags,
  deleteFile,
  listFiles,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  downloadFile,
};
