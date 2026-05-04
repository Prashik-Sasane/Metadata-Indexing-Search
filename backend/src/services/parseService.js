/**
 * Parse Service - Extracts content and metadata from uploaded files.
 * Supports plain text, source/config files, CSV/JSON/XML/HTML, PDF,
 * and OpenXML office documents (.docx/.pptx/.xlsx).
 */

class ParseService {
  constructor() {
    this.textExtensions = new Set([
      'txt', 'text', 'md', 'markdown', 'log', 'rtf',
      'c', 'cc', 'cpp', 'cxx', 'h', 'hpp', 'hh', 'hxx',
      'java', 'kt', 'kts', 'scala', 'groovy',
      'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx',
      'py', 'rb', 'php', 'go', 'rs', 'swift', 'cs',
      'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1',
      'sql', 'graphql', 'gql',
      'css', 'scss', 'sass', 'less',
      'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
      'properties', 'gitignore', 'dockerfile',
      'vue', 'svelte', 'astro',
      'tex', 'csv', 'tsv',
    ]);

    this.jsonMimeTypes = new Set([
      'application/json',
      'text/json',
      'application/ld+json',
    ]);

    this.markupMimeTypes = new Set([
      'application/xml',
      'text/xml',
      'text/html',
      'application/xhtml+xml',
      'image/svg+xml',
    ]);

    this.openXmlMimeTypes = new Set([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]);
  }

  /**
   * Parse file content based on extension and MIME type.
   * @param {Buffer} fileBuffer - Raw file buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - MIME type
   * @returns {Object} { content, wordCount, extractedMetadata }
   */
  async parse(fileBuffer, fileName, mimeType) {
    const ext = this._getExtension(fileName);
    const normalizedMimeType = this._normalizeMimeType(mimeType);

    try {
      if (ext === 'csv' || normalizedMimeType === 'text/csv') {
        return this._parseCsv(fileBuffer, normalizedMimeType);
      }

      if (ext === 'json' || this._isJsonMimeType(normalizedMimeType)) {
        return this._parseJson(fileBuffer, normalizedMimeType);
      }

      if (this._isMarkupType(ext, normalizedMimeType)) {
        return this._parseMarkup(fileBuffer, ext || 'xml', normalizedMimeType);
      }

      if (ext === 'pdf' || normalizedMimeType === 'application/pdf') {
        return await this._parsePdf(fileBuffer);
      }

      if (this._isOpenXmlType(ext, normalizedMimeType)) {
        return this._parseOpenXml(fileBuffer, this._getOpenXmlFormat(ext, normalizedMimeType), normalizedMimeType);
      }

      if (this._isTextType(ext, normalizedMimeType, fileBuffer)) {
        return this._parseText(fileBuffer, ext || 'text', normalizedMimeType);
      }

      return this._parseGeneric(fileBuffer, fileName, normalizedMimeType || mimeType);
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
   * Parse plain text and code/config files.
   */
  _parseText(buffer, format, mimeType) {
    const content = this._decodeUtf8(buffer).trim();
    const lines = content ? content.split('\n') : [];
    const wordCount = this._countWords(content);

    return {
      content: content.substring(0, 10000),
      wordCount,
      extractedMetadata: {
        format: this._formatLabel(format),
        mimeType,
        lineCount: lines.length,
        charCount: content.length,
      },
    };
  }

  /**
   * Parse CSV files and capture table shape.
   */
  _parseCsv(buffer, mimeType) {
    const content = this._decodeUtf8(buffer).trim();
    const lines = content ? content.split('\n') : [];
    const headers = lines[0]
      ? lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, ''))
      : [];

    return {
      content: content.substring(0, 10000),
      wordCount: this._countWords(content),
      extractedMetadata: {
        format: 'CSV',
        mimeType,
        headers,
        rowCount: Math.max(0, lines.length - 1),
        columnCount: headers.length,
      },
    };
  }

  /**
   * Parse JSON files and capture top-level structure.
   */
  _parseJson(buffer, mimeType) {
    const raw = this._decodeUtf8(buffer).trim();
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        content: raw.substring(0, 10000),
        wordCount: this._countWords(raw),
        extractedMetadata: {
          format: 'JSON',
          mimeType,
          valid: false,
        },
      };
    }

    const isArray = Array.isArray(parsed);
    const topLevelKeys = isArray ? [] : Object.keys(parsed);
    const textContent = JSON.stringify(parsed);

    return {
      content: textContent.substring(0, 10000),
      wordCount: this._countWords(textContent),
      extractedMetadata: {
        format: 'JSON',
        mimeType,
        valid: true,
        isArray,
        topLevelKeys,
        arrayLength: isArray ? parsed.length : undefined,
      },
    };
  }

  /**
   * Parse XML/HTML/SVG by stripping tags and decoding basic entities.
   */
  _parseMarkup(buffer, ext, mimeType) {
    const raw = this._decodeUtf8(buffer).trim();
    const textContent = this._stripXml(raw);

    return {
      content: textContent.substring(0, 10000),
      wordCount: this._countWords(textContent),
      extractedMetadata: {
        format: this._formatLabel(ext),
        mimeType,
        rawLength: raw.length,
        textLength: textContent.length,
      },
    };
  }

  /**
   * Parse PDF files using pdf-parse v2 (class-based API).
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
      const text = (result?.text || '').trim();
      const pageCount = result?.total || result?.pages?.length || 0;

      let info = {};
      try {
        info = parser.getInfo() || {};
      } catch (_) {}

      return {
        content: text.substring(0, 10000),
        wordCount: this._countWords(text),
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
   * Parse zipped Office OpenXML documents.
   */
  _parseOpenXml(buffer, ext, mimeType) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    let content = '';
    let extractedMetadata = {
      format: this._formatLabel(ext),
      mimeType,
    };

    if (ext === 'docx') {
      const sectionPaths = this._getSortedEntryNames(
        zip,
        /^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/
      );
      const sections = sectionPaths.map((entryName) => {
        const xml = zip.readAsText(entryName, 'utf8');
        return this._extractDocxText(xml);
      }).filter(Boolean);

      content = sections.join('\n\n').trim();
      extractedMetadata = {
        ...extractedMetadata,
        sectionCount: sectionPaths.length,
      };
    } else if (ext === 'pptx') {
      const slidePaths = this._getSortedEntryNames(zip, /^ppt\/slides\/slide\d+\.xml$/);
      const notePaths = this._getSortedEntryNames(zip, /^ppt\/notesSlides\/notesSlide\d+\.xml$/);

      const slideTexts = slidePaths.map((entryName) => {
        const xml = zip.readAsText(entryName, 'utf8');
        return this._extractPptxText(xml);
      }).filter(Boolean);

      const noteTexts = notePaths.map((entryName) => {
        const xml = zip.readAsText(entryName, 'utf8');
        return this._extractPptxText(xml);
      }).filter(Boolean);

      content = [...slideTexts, ...noteTexts].join('\n\n').trim();
      extractedMetadata = {
        ...extractedMetadata,
        slideCount: slidePaths.length,
        notesCount: notePaths.length,
      };
    } else if (ext === 'xlsx') {
      const workbookXml = zip.getEntry('xl/workbook.xml')
        ? zip.readAsText('xl/workbook.xml', 'utf8')
        : '';
      const sheetNames = this._extractXlsxSheetNames(workbookXml);
      const sharedStrings = this._extractSharedStrings(zip);
      const sheetPaths = this._getSortedEntryNames(zip, /^xl\/worksheets\/sheet\d+\.xml$/);

      const sheetTexts = sheetPaths.map((entryName) => {
        const xml = zip.readAsText(entryName, 'utf8');
        return this._extractXlsxSheetText(xml, sharedStrings);
      }).filter(Boolean);

      content = sheetTexts.join('\n\n').trim();
      extractedMetadata = {
        ...extractedMetadata,
        sheetCount: sheetPaths.length,
        sheetNames,
      };
    }

    return {
      content: content.substring(0, 10000),
      wordCount: this._countWords(content),
      extractedMetadata: {
        ...extractedMetadata,
        charCount: content.length,
      },
    };
  }

  /**
   * Generic fallback for likely binary content.
   */
  _parseGeneric(buffer, fileName, mimeType) {
    return {
      content: '',
      wordCount: 0,
      extractedMetadata: {
        format: this._formatLabel(this._getExtension(fileName)),
        mimeType,
        binarySize: buffer.length,
      },
    };
  }

  _getExtension(fileName) {
    const parts = String(fileName || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  _normalizeMimeType(mimeType) {
    return String(mimeType || '').toLowerCase().split(';')[0].trim();
  }

  _formatLabel(value) {
    return String(value || 'unknown').replace(/[^a-z0-9]+/gi, '_').toUpperCase();
  }

  _countWords(text) {
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }

  _decodeUtf8(buffer) {
    return buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  _isJsonMimeType(mimeType) {
    return this.jsonMimeTypes.has(mimeType) || mimeType.endsWith('+json');
  }

  _isMarkupType(ext, mimeType) {
    return ext === 'xml'
      || ext === 'html'
      || ext === 'htm'
      || ext === 'svg'
      || this.markupMimeTypes.has(mimeType)
      || mimeType.endsWith('+xml');
  }

  _isOpenXmlType(ext, mimeType) {
    return ext === 'docx' || ext === 'pptx' || ext === 'xlsx' || this.openXmlMimeTypes.has(mimeType);
  }

  _getOpenXmlFormat(ext, mimeType) {
    if (ext === 'docx' || ext === 'pptx' || ext === 'xlsx') {
      return ext;
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'docx';
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return 'pptx';
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'xlsx';
    }

    return ext;
  }

  _isTextType(ext, mimeType, buffer) {
    if (this.textExtensions.has(ext)) {
      return true;
    }

    if (mimeType.startsWith('text/')) {
      return true;
    }

    if (
      mimeType === 'application/javascript'
      || mimeType === 'application/x-javascript'
      || mimeType === 'application/typescript'
      || mimeType === 'application/sql'
      || mimeType === 'application/x-sh'
      || mimeType === 'application/x-httpd-php'
      || mimeType === 'application/x-yaml'
      || mimeType === 'application/toml'
    ) {
      return true;
    }

    return this._isProbablyTextBuffer(buffer);
  }

  _isProbablyTextBuffer(buffer) {
    if (!buffer || buffer.length === 0) {
      return true;
    }

    const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
    let controlChars = 0;

    for (const byte of sample) {
      if (byte === 0) {
        return false;
      }

      const isWhitespace = byte === 9 || byte === 10 || byte === 13;
      const isPrintableAscii = byte >= 32 && byte <= 126;
      const isExtendedByte = byte >= 128;

      if (!isWhitespace && !isPrintableAscii && !isExtendedByte) {
        controlChars += 1;
      }
    }

    return (controlChars / sample.length) < 0.05;
  }

  _stripXml(xml) {
    return this._decodeXmlEntities(
      xml
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/(p|div|section|article|li|tr|h[1-6])\s*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  _decodeXmlEntities(value) {
    return String(value || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#xA;/gi, '\n')
      .replace(/&#10;/g, '\n')
      .replace(/&#x9;/gi, '\t')
      .replace(/&#9;/g, '\t');
  }

  _getSortedEntryNames(zip, pattern) {
    return zip.getEntries()
      .map((entry) => entry.entryName)
      .filter((entryName) => pattern.test(entryName))
      .sort((left, right) => this._naturalCompare(left, right));
  }

  _naturalCompare(left, right) {
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  }

  _extractDocxText(xml) {
    const text = xml
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<w:cr\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g);

    if (!text) {
      return '';
    }

    return this._decodeXmlEntities(
      text
        .map((match) => match.replace(/^<w:t[^>]*>|<\/w:t>$/g, ''))
        .join(' ')
        .replace(/\s*\n\s*/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim()
    );
  }

  _extractPptxText(xml) {
    const textRuns = xml.match(/<a:t[^>]*>[\s\S]*?<\/a:t>/g);

    if (!textRuns) {
      return '';
    }

    return this._decodeXmlEntities(
      textRuns
        .map((match) => match.replace(/^<a:t[^>]*>|<\/a:t>$/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  _extractSharedStrings(zip) {
    const entry = zip.getEntry('xl/sharedStrings.xml');

    if (!entry) {
      return [];
    }

    const xml = zip.readAsText(entry, 'utf8');
    const stringItems = xml.match(/<si[\s\S]*?<\/si>/g) || [];

    return stringItems.map((item) => this._decodeXmlEntities(
      (item.match(/<t[^>]*>[\s\S]*?<\/t>/g) || [])
        .map((match) => match.replace(/^<t[^>]*>|<\/t>$/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    ));
  }

  _extractXlsxSheetNames(xml) {
    const sheetMatches = xml.match(/<sheet[^>]*name="([^"]+)"/g) || [];
    return sheetMatches.map((match) => {
      const nameMatch = match.match(/name="([^"]+)"/);
      return nameMatch ? this._decodeXmlEntities(nameMatch[1]) : '';
    }).filter(Boolean);
  }

  _extractXlsxSheetText(xml, sharedStrings) {
    const cellMatches = xml.match(/<c\b[\s\S]*?<\/c>/g) || [];
    const values = [];

    for (const cell of cellMatches) {
      const typeMatch = cell.match(/\bt="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : '';

      if (cellType === 's') {
        const sharedIndexMatch = cell.match(/<v>(\d+)<\/v>/);
        if (sharedIndexMatch) {
          const sharedValue = sharedStrings[Number(sharedIndexMatch[1])];
          if (sharedValue) {
            values.push(sharedValue);
          }
        }
        continue;
      }

      if (cellType === 'inlineStr') {
        const inlineText = (cell.match(/<t[^>]*>[\s\S]*?<\/t>/g) || [])
          .map((match) => match.replace(/^<t[^>]*>|<\/t>$/g, ''))
          .join(' ')
          .trim();
        if (inlineText) {
          values.push(this._decodeXmlEntities(inlineText));
        }
        continue;
      }

      const rawValueMatch = cell.match(/<v>([\s\S]*?)<\/v>/);
      if (rawValueMatch && rawValueMatch[1].trim()) {
        values.push(this._decodeXmlEntities(rawValueMatch[1].trim()));
      }
    }

    return values.join(' ').replace(/\s+/g, ' ').trim();
  }
}

module.exports = { ParseService };
