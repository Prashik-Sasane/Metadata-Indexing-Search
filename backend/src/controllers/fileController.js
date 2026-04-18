/**
 * File Controller - Handles file metadata CRUD operations
 */

const { IngestService } = require('../services/ingestService');
const { MetadataService } = require('../services/metadataService');
const { getIndexManager } = require('../services/indexManagerSingleton');
const { z } = require('zod');

// Get shared IndexManager instance
const indexManager = getIndexManager();
const ingestService = new IngestService(indexManager);
const metadataService = new MetadataService(indexManager);

// Validation schemas
const FileCreateSchema = z.object({
  s3_key: z.string().min(1).max(1024),
  bucket: z.string().min(1).max(255),
  name: z.string().min(1).max(1024),
  size: z.coerce.number().int().nonnegative(),
  mime_type: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  tags: z.record(z.boolean()).optional().default({}),
  custom: z.record(z.any()).optional().default({}),
});

const TagUpdateSchema = z.object({
  tags: z.record(z.boolean()),
});

/**
 * POST /api/v1/files
 * Create file metadata and index it
 */
async function createFile(req, res, next) {
  try {
    const parsed = FileCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const file = await ingestService.createFile(parsed.data);

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
 * Get single file metadata
 */
async function getFile(req, res, next) {
  try {
    const { id } = req.params;
    const file = await metadataService.getFile(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error('[FileController] Get file error:', error.message);
    next(error);
  }
}

/**
 * PUT /api/v1/files/:id/tags
 * Update file tags
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
 * Delete file (soft delete)
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
 * List files with pagination
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
 * Get presigned URL for file upload
 */
async function getPresignedUploadUrl(req, res, next) {
  try {
    const { fileName, mimeType } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'fileName is required',
      });
    }

    const result = await metadataService.getPresignedUploadUrl(
      fileName,
      mimeType || 'application/octet-stream'
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[FileController] Get upload URL error:', error.message);
    next(error);
  }
}

/**
 * GET /api/v1/files/:id/download-url
 * Get presigned URL for file download
 */
async function getPresignedDownloadUrl(req, res, next) {
  try {
    const { id } = req.params;
    const file = await metadataService.getFile(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    const url = await metadataService.getPresignedDownloadUrl(file.s3_key);

    return res.status(200).json({
      success: true,
      data: { downloadUrl: url, expiresIn: 3600 },
    });
  } catch (error) {
    console.error('[FileController] Get download URL error:', error.message);
    next(error);
  }
}

module.exports = {
  createFile,
  getFile,
  updateTags,
  deleteFile,
  listFiles,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
};
