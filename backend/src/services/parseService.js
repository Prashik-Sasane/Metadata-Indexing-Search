/**
 * Parse Service - Extracts content and metadata from uploaded files
 * Supports: .txt, .csv, .json, .md, .pdf, .xml, .html
 */

class ParseService {
  /**
   * Parse file content based on mime type
   * @param {Buffer} fileBuffer - Raw file buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - MIME type
   * @returns {Object} { content, wordCount, extractedMetadata }
   */
  async parse(fileBuffer, fileName, mimeType) {
    const ext = fileName.split('.').pop().toLowerCase();

    try {
      switch (ext) {
        case 'txt':
        case 'md':
        case 'log':
          return this._parseText(fileBuffer, ext);

        case 'csv':
          return this._parseCsv(fileBuffer);

        case 'json':
          return this._parseJson(fileBuffer);

        case 'xml':
        case 'html':
        case 'htm':
          return this._parseMarkup(fileBuffer, ext);

        case 'pdf':
          return await this._parsePdf(fileBuffer);

        default:
          return this._parseGeneric(fileBuffer, fileName, mimeType);
      }
    } catch (error) {
      console.error(`[ParseService] Error parsing ${fileName}:`, error.message);
      return {
        content: '',
        wordCount: 0,
        extractedMetadata: {
          parseError: error.message,
          extension: ext,
        },
      };
    }
  }

  /**
   * Parse plain text files
   */
  _parseText(buffer, ext) {
    const content = buffer.toString('utf-8').trim();
    const lines = content.split('\n');
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return {
      content: content.substring(0, 10000), // Store up to 10k chars
      wordCount,
      extractedMetadata: {
        lineCount: lines.length,
        charCount: content.length,
        format: ext.toUpperCase(),
      },
    };
  }

  /**
   * Parse CSV files — extract headers and row count
   */
  _parseCsv(buffer) {
    const content = buffer.toString('utf-8').trim();
    const lines = content.split('\n');
    const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')) : [];
    const rowCount = Math.max(0, lines.length - 1);

    return {
      content: content.substring(0, 10000),
      wordCount: content.split(/\s+/).filter(Boolean).length,
      extractedMetadata: {
        format: 'CSV',
        headers,
        rowCount,
        columnCount: headers.length,
      },
    };
  }

  /**
   * Parse JSON files — extract keys and structure info
   */
  _parseJson(buffer) {
    const raw = buffer.toString('utf-8').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        content: raw.substring(0, 10000),
        wordCount: raw.split(/\s+/).filter(Boolean).length,
        extractedMetadata: { format: 'JSON', valid: false },
      };
    }

    const isArray = Array.isArray(parsed);
    const topLevelKeys = isArray ? [] : Object.keys(parsed);
    const textContent = JSON.stringify(parsed, null, 0);

    return {
      content: textContent.substring(0, 10000),
      wordCount: textContent.split(/\s+/).filter(Boolean).length,
      extractedMetadata: {
        format: 'JSON',
        valid: true,
        isArray,
        topLevelKeys,
        arrayLength: isArray ? parsed.length : undefined,
      },
    };
  }

  /**
   * Parse XML/HTML — strip tags, extract text
   */
  _parseMarkup(buffer, ext) {
    const raw = buffer.toString('utf-8').trim();
    // Simple tag stripping
    const textContent = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    return {
      content: textContent.substring(0, 10000),
      wordCount,
      extractedMetadata: {
        format: ext.toUpperCase(),
        rawLength: raw.length,
        textLength: textContent.length,
      },
    };
  }

  /**
   * Parse PDF files using pdf-parse v2 (class-based API)
   */
  async _parsePdf(buffer) {
    let parser = null;
    try {
      const { PDFParse } = require('pdf-parse');

      parser = new PDFParse({
        verbosity: 0,
        data: new Uint8Array(buffer),
      });

      await parser.load();

      const result = await parser.getText();
      const text = result?.text || '';
      const pageCount = result?.total || result?.pages?.length || 0;

      let info = {};
      try { info = parser.getInfo() || {}; } catch (_) {}

      return {
        content: text.substring(0, 10000),
        wordCount: text.split(/\s+/).filter(Boolean).length,
        extractedMetadata: {
          format: 'PDF',
          pageCount,
          pdfVersion: info.PDFFormatVersion || '',
          title: info.Title || '',
          author: info.Author || '',
        },
      };
    } catch (error) {
      console.warn('[ParseService] PDF parsing failed:', error.message);
      return {
        content: '',
        wordCount: 0,
        extractedMetadata: {
          format: 'PDF',
          parseError: error.message,
        },
      };
    }
    // Note: do NOT call parser.destroy() — it triggers an unhandled async rejection in pdf-parse v2
  }

  /**
   * Generic fallback — just store basic metadata
   */
  _parseGeneric(buffer, fileName, mimeType) {
    return {
      content: '',
      wordCount: 0,
      extractedMetadata: {
        format: fileName.split('.').pop().toUpperCase(),
        mimeType,
        binarySize: buffer.length,
      },
    };
  }
}

module.exports = { ParseService };
