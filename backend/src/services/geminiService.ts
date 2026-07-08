import { GoogleGenerativeAI } from '@google/generative-ai';

// Target CRM Schema Fields
export const TARGET_CRM_FIELDS = [
  { name: 'first_name', label: 'First Name', required: false, description: 'First name of the lead contact' },
  { name: 'last_name', label: 'Last Name', required: false, description: 'Last name of the lead contact' },
  { name: 'email', label: 'Email Address', required: true, description: 'Email address of the lead contact' },
  { name: 'phone', label: 'Phone Number', required: false, description: 'Phone number of the lead contact' },
  { name: 'company', label: 'Company Name', required: false, description: 'Name of the company/organization' },
  { name: 'job_title', label: 'Job Title', required: false, description: 'Job position / title' },
  { name: 'estimated_value', label: 'Estimated Value', required: false, description: 'Potential deal value (numeric)' },
  { name: 'lead_status', label: 'Lead Status', required: false, description: 'Status: New, Contacted, Qualified, or Unqualified' },
  { name: 'notes', label: 'Notes / Description', required: false, description: 'Additional details or other unmapped columns' },
];

function getModel(apiKey: string | undefined) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here' || key.trim() === '') {
    throw new Error('Gemini API key is not configured. Please add it to your .env file or enter it in the app settings.');
  }
  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return genAI.getGenerativeModel({ model: modelName });
}

export interface MappingResult {
  mappings: Record<string, string | null>;
  confidence: Record<string, number>;
  reasoning: string;
}

// Automatically analyze CSV headers and suggest mappings using Gemini AI
export async function suggestColumnMapping(
  headers: string[],
  sampleRows: string[][],
  apiKey?: string
): Promise<MappingResult> {
  const model = getModel(apiKey);

  const prompt = `
You are an expert CRM Integration Assistant. You need to map columns from an uploaded CSV file to standard CRM lead schema fields.

Target CRM Fields:
${TARGET_CRM_FIELDS.map(f => `- \`${f.name}\`: ${f.description} (${f.required ? 'REQUIRED' : 'OPTIONAL'})`).join('\n')}

CSV Headers to map:
${JSON.stringify(headers)}

CSV Sample Rows (up to 5 rows of data for context):
${JSON.stringify(sampleRows)}

Instructions:
1. Map each target CRM field to the most appropriate CSV header. A CSV header can only be mapped to one target CRM field.
2. If there is no logical match for a CRM field, set the mapping to null.
3. If the CSV has a single full name column (e.g. 'Name' or 'Contact Name'), map BOTH \`first_name\` and \`last_name\` to that same column name. The data parser will split them automatically.
4. If a CSV column is named 'Status' or similar, map it to \`lead_status\`.
5. Provide a confidence score (from 0.0 to 1.0) for each mapped field.
6. Provide a brief reasoning for the mappings.

Return your response in JSON format. The response must be a single JSON object matching this schema:
{
  "mappings": {
    "first_name": "CSV_HEADER" | null,
    "last_name": "CSV_HEADER" | null,
    "email": "CSV_HEADER" | null,
    "phone": "CSV_HEADER" | null,
    "company": "CSV_HEADER" | null,
    "job_title": "CSV_HEADER" | null,
    "estimated_value": "CSV_HEADER" | null,
    "lead_status": "CSV_HEADER" | null,
    "notes": "CSV_HEADER" | null
  },
  "confidence": {
    "first_name": number,
    "last_name": number,
    "email": number,
    "phone": number,
    "company": number,
    "job_title": number,
    "estimated_value": number,
    "lead_status": number,
    "notes": number
  },
  "reasoning": "brief explanation"
}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    return JSON.parse(responseText) as MappingResult;
  } catch (error: any) {
    console.error('Gemini mapping suggestion failed:', error);
    throw new Error(`AI mapping analysis failed: ${error.message || error}`);
  }
}

export interface ProcessedLeadResult {
  status: 'success' | 'skipped';
  reason: string | null;
  lead: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    job_title: string | null;
    estimated_value: number | null;
    lead_status: 'New' | 'Contacted' | 'Qualified' | 'Unqualified';
    notes: string | null;
  };
}

// Programmatic mapping helper (pre-process before AI cleaning)
function preMapRecords(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string | null>
): any[] {
  const mappedCsvHeaders = new Set(Object.values(mapping).filter(Boolean));

  return rows.map((row) => {
    // Convert row array to key-value object based on CSV headers
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] || '';
    });

    const lead: Record<string, any> = {};

    // Handle full name splitting
    const nameHeader = mapping['first_name'];
    const lastNameHeader = mapping['last_name'];

    if (nameHeader && nameHeader === lastNameHeader) {
      // Split full name
      const fullName = (rowObj[nameHeader] || '').trim();
      const parts = fullName.split(/\s+/);
      lead['first_name'] = parts[0] || '';
      lead['last_name'] = parts.slice(1).join(' ') || '';
    } else {
      lead['first_name'] = mapping['first_name'] ? rowObj[mapping['first_name']!] : '';
      lead['last_name'] = mapping['last_name'] ? rowObj[mapping['last_name']!] : '';
    }

    // Map other standard fields
    lead['email'] = mapping['email'] ? rowObj[mapping['email']!] : '';
    lead['phone'] = mapping['phone'] ? rowObj[mapping['phone']!] : '';
    lead['company'] = mapping['company'] ? rowObj[mapping['company']!] : '';
    lead['job_title'] = mapping['job_title'] ? rowObj[mapping['job_title']!] : '';
    lead['estimated_value'] = mapping['estimated_value'] ? rowObj[mapping['estimated_value']!] : '';
    lead['lead_status'] = mapping['lead_status'] ? rowObj[mapping['lead_status']!] : '';
    
    // Aggregate unmapped columns to append to notes
    const extraNotes: string[] = [];
    headers.forEach((h) => {
      if (!mappedCsvHeaders.has(h) && rowObj[h]) {
        extraNotes.push(`${h}: ${rowObj[h]}`);
      }
    });

    const initialNotes = mapping['notes'] ? rowObj[mapping['notes']!] : '';
    lead['notes'] = [initialNotes, ...extraNotes].filter(Boolean).join(' | ');

    return lead;
  });
}

// Clean and validate lead records using Gemini AI in batches
export async function cleanAndValidateLeads(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string | null>,
  apiKey?: string
): Promise<ProcessedLeadResult[]> {
  const initialLeads = preMapRecords(headers, rows, mapping);
  const model = getModel(apiKey);
  const results: ProcessedLeadResult[] = [];
  
  // Batch size: 30 leads per request
  const batchSize = 30;

  for (let i = 0; i < initialLeads.length; i += batchSize) {
    const batch = initialLeads.slice(i, i + batchSize);
    
    const prompt = `
You are an expert CRM Data Quality Engine. Your task is to clean, standardize, validate, and enrich the following batch of lead records.

Formatting Rules for CRM Fields:
- \`first_name\`: Format to Title Case (e.g. 'john' -> 'John').
- \`last_name\`: Format to Title Case (e.g. 'DOE' -> 'Doe').
- \`email\`: Validate the email format. If missing or completely invalid (doesn't contain '@' or a valid domain), mark \`status\` as 'skipped' and explain in \`reason\`.
- \`phone\`: Standardize to a clean telephone format (e.g. '+1 (555) 019-2834' or '+44 20 7946 0958' or E.164 format).
- \`company\`: Standardize names (e.g. 'Google Inc.' -> 'Google'). If missing, look at the email domain (if it's not a public provider like gmail.com, yahoo.com, outlook.com, hotmail.com, etc.) and suggest a company name (e.g. 'sarah@stripe.com' -> Company 'Stripe').
- \`job_title\`: Normalize common job titles (e.g. 'vp of sales' -> 'Vice President of Sales', 'software engineer II' -> 'Software Engineer').
- \`estimated_value\`: Clean and parse into a numeric value. Convert text like '$5,000', '10k', '500.50' to numbers (5000, 10000, 500.5). If empty or unparseable, set to null.
- \`lead_status\`: Normalize to one of the following exact string values: 'New', 'Contacted', 'Qualified', 'Unqualified'. Default to 'New' if not specified or empty.
- \`notes\`: Clean up whitespace and retain notes.

Validation Criteria:
1. Email is required. If a record has an empty email, it MUST be marked with status 'skipped' and reason 'Missing email address'.
2. Email must contain '@'. If invalid, status is 'skipped' and reason 'Invalid email format'.

Input batch of lead records to process:
${JSON.stringify(batch)}

Your output must be a single JSON object containing a \`processed_leads\` array of objects corresponding exactly to the records in this input batch.
Schema for the output:
{
  "processed_leads": [
    {
      "status": "success" | "skipped",
      "reason": "validation error message or null",
      "lead": {
        "first_name": string | null,
        "last_name": string | null,
        "email": string | null,
        "phone": string | null,
        "company": string | null,
        "job_title": string | null,
        "estimated_value": number | null,
        "lead_status": "New" | "Contacted" | "Qualified" | "Unqualified",
        "notes": string | null
      }
    }
  ]
}
`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      
      if (parsed && Array.isArray(parsed.processed_leads)) {
        results.push(...parsed.processed_leads);
      } else {
        throw new Error('Invalid JSON structure returned from AI model.');
      }
    } catch (error: any) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      // Fallback: If AI fails for a batch, programmatically create fallback objects so we do not fail the whole import
      batch.forEach((lead) => {
        const val = parseFloat(String(lead.estimated_value).replace(/[^0-9.]/g, ''));
        const email = String(lead.email).trim();
        const hasEmail = email.includes('@');
        
        results.push({
          status: hasEmail ? 'success' : 'skipped',
          reason: hasEmail ? null : (email ? 'Invalid email format (AI Fallback)' : 'Missing email address (AI Fallback)'),
          lead: {
            first_name: lead.first_name ? String(lead.first_name).trim() : null,
            last_name: lead.last_name ? String(lead.last_name).trim() : null,
            email: email || null,
            phone: lead.phone ? String(lead.phone).trim() : null,
            company: lead.company ? String(lead.company).trim() : null,
            job_title: lead.job_title ? String(lead.job_title).trim() : null,
            estimated_value: isNaN(val) ? null : val,
            lead_status: 'New',
            notes: lead.notes || null,
          },
        });
      });
    }
  }

  return results;
}

// Deprecated fallback method signature mapping
export async function mapLeadRecordsWithGemini(records: any[]): Promise<any> {
  return [];
}

