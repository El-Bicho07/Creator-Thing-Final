import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PostRepository } from '../db/storage.js';
import { parseInstagramCSV } from '../services/csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function previewCSV(req, res) {
  try {
    let csvData = '';

    if (req.file) {
      csvData = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csvString) {
      csvData = req.body.csvString;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No CSV file or CSV string provided.',
      });
    }

    const existingPosts = await PostRepository.find();
    const result = await parseInstagramCSV(csvData, existingPosts);

    return res.json({
      success: true,
      message: `Parsed ${result.totalParsed} records successfully. ${result.validCount} valid, ${result.duplicateCount} duplicates, ${result.errorCount} invalid.`,
      data: result,
    });
  } catch (error) {
    console.error('[Import Ctrl] previewCSV error:', error);
    return res.status(500).json({
      success: false,
      message: `CSV parsing failed: ${error.message}`,
    });
  }
}

export async function commitImport(req, res) {
  try {
    const { records, skipDuplicates = true } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided for commit.',
      });
    }

    const existingPosts = await PostRepository.find();
    const existingIds = new Set(existingPosts.map(p => p.originalId).filter(Boolean));

    const toInsert = [];
    let skippedCount = 0;

    for (const r of records) {
      if (skipDuplicates && existingIds.has(r.originalId)) {
        skippedCount++;
        continue;
      }

      toInsert.push({
        userId: req.user ? req.user.id : null,
        originalId: r.originalId || `IMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        caption: r.caption,
        mediaType: r.mediaType || 'IMAGE',
        postDate: r.postDate ? new Date(r.postDate) : new Date(),
        reach: r.reach || 0,
        views: r.views || 0,
        likes: r.likes || 0,
        comments: r.comments || 0,
        shares: r.shares || 0,
        saves: r.saves || 0,
        hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
        permalink: r.permalink || '',
        isSynthetic: r.isSynthetic !== undefined ? r.isSynthetic : false,
      });
    }

    if (toInsert.length === 0) {
      return res.json({
        success: true,
        message: 'All records were duplicates and were skipped.',
        importedCount: 0,
        skippedCount,
      });
    }

    const inserted = await PostRepository.insertMany(toInsert);

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} posts into your library (${skippedCount} duplicates skipped).`,
      importedCount: inserted.length,
      skippedCount,
    });
  } catch (error) {
    console.error('[Import Ctrl] commitImport error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to commit imported records: ${error.message}`,
    });
  }
}

export async function downloadSampleCSV(req, res) {
  try {
    const csvPath = path.resolve(__dirname, '../data/sample_instagram_data.csv');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, message: 'Sample CSV file not found.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sample_instagram_data.csv"');
    const fileStream = fs.createReadStream(csvPath);
    fileStream.pipe(res);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to download sample CSV.' });
  }
}
