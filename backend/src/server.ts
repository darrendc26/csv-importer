import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { parseCSV } from './utils/csvParser';
import { suggestColumnMapping, cleanAndValidateLeads } from './services/geminiService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Set body size limits higher to accommodate larger CSV imports
app.use(express.json({ limit: '10mb' }));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper to extract custom API key from request headers
const getApiKey = (req: express.Request): string | undefined => {
  const headerKey = req.headers['x-gemini-api-key'] || req.headers['x-gemini-key'];
  if (headerKey && typeof headerKey === 'string' && headerKey.trim() !== '') {
    return headerKey;
  }
  return undefined;
};

// POST /api/analyze-headers endpoint
// Accepts a multipart CSV file or a JSON payload containing headers and sampleRows
app.post('/api/analyze-headers', upload.single('csv'), async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    let headers: string[] = [];
    let sampleRows: string[][] = [];
    let allRows: string[][] = [];

    if (req.file) {
      // Parse CSV file content on backend
      const csvText = req.file.buffer.toString('utf-8');
      const parsed = parseCSV(csvText);
      if (parsed.length === 0) {
        return res.status(400).json({ error: 'The uploaded CSV file is empty or invalid.' });
      }
      headers = parsed[0];
      allRows = parsed.slice(1);
      sampleRows = allRows.slice(0, 5);
    } else if (req.body.headers && Array.isArray(req.body.headers)) {
      headers = req.body.headers;
      sampleRows = req.body.sampleRows || [];
    } else {
      return res.status(400).json({ error: 'Please upload a CSV file or provide headers in the request body.' });
    }

    if (headers.length === 0) {
      return res.status(400).json({ error: 'No headers detected in the CSV content.' });
    }

    const mappingResult = await suggestColumnMapping(headers, sampleRows, apiKey);

    res.json({
      headers,
      sampleRows,
      allRowsCount: allRows.length,
      // If we parsed the CSV here, return all rows so frontend doesn't have to re-parse
      rows: allRows,
      ...mappingResult
    });
  } catch (error: any) {
    console.error('Error analyzing headers:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/import endpoint for AI lead cleaning and validation
app.post('/api/import', async (req, res) => {
  try {
    const apiKey = getApiKey(req);
    const { headers, rows, mapping } = req.body;

    if (!headers || !Array.isArray(headers) || !rows || !Array.isArray(rows) || !mapping) {
      return res.status(400).json({ error: 'Missing required fields: headers, rows, and mapping are required.' });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No lead rows provided for importing.' });
    }

    const results = await cleanAndValidateLeads(headers, rows, mapping, apiKey);
    
    // Calculate import metrics
    const total = results.length;
    const successes = results.filter(r => r.status === 'success');
    const skipped = results.filter(r => r.status === 'skipped');
    
    // Count enrichment instances
    let enrichedFieldsCount = 0;
    successes.forEach(r => {
      // If company was extracted/modified, or phone formatted, count as enriched
      if (r.lead.company || r.lead.phone || r.lead.job_title || r.lead.estimated_value) {
        enrichedFieldsCount++;
      }
    });

    res.json({
      metrics: {
        total,
        successCount: successes.length,
        skippedCount: skipped.length,
        enrichmentRate: total > 0 ? Math.round((enrichedFieldsCount / total) * 100) : 0
      },
      results
    });
  } catch (error: any) {
    console.error('Error importing leads:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

