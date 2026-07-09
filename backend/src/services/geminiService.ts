import { GoogleGenerativeAI } from '@google/generative-ai';

// Target CRM Schema Fields (GrowEasy Assignment Specifications)
export const TARGET_CRM_FIELDS = [
  { name: 'created_at', label: 'Created At', required: false, description: 'Lead creation date (JS parseable format)' },
  { name: 'name', label: 'Name', required: false, description: 'Full name of the lead contact' },
  { name: 'email', label: 'Email', required: false, description: 'Primary email address' },
  { name: 'country_code', label: 'Country Code', required: false, description: 'Phone country code (e.g. +91)' },
  { name: 'mobile_without_country_code', label: 'Mobile Number', required: false, description: 'Mobile number without country code' },
  { name: 'company', label: 'Company', required: false, description: 'Company/Organization name' },
  { name: 'city', label: 'City', required: false, description: 'City name' },
  { name: 'state', label: 'State', required: false, description: 'State name' },
  { name: 'country', label: 'Country', required: false, description: 'Country name' },
  { name: 'lead_owner', label: 'Lead Owner', required: false, description: 'Email address of the lead owner' },
  { name: 'crm_status', label: 'CRM Status', required: false, description: 'Status: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, or SALE_DONE' },
  { name: 'crm_note', label: 'CRM Note', required: false, description: 'Notes, remarks, comments, extra phones/emails, or unmapped details' },
  { name: 'data_source', label: 'Data Source', required: false, description: 'Source: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots' },
  { name: 'possession_time', label: 'Possession Time', required: false, description: 'Property possession time' },
  { name: 'description', label: 'Description', required: false, description: 'Additional description details' },
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

export async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let attempt = 0;
  let currentDelay = delay;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      console.warn(`Gemini API call failed (attempt ${attempt}/${retries}). Retrying in ${currentDelay}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= 2; // Exponential backoff
    }
  }
  throw new Error('Unexpected retry failure');
}

export interface MappingResult {
  mappings: Record<string, string | null>;
  confidence: Record<string, number>;
  reasoning: string;
}

// Fallback helper for mapping headers programmatically when AI suggestion fails (e.g. rate-limited 429)
function programmaticSuggestMapping(headers: string[]): MappingResult {
  const mappings: Record<string, string | null> = {};
  const confidence: Record<string, number> = {};

  TARGET_CRM_FIELDS.forEach((field) => {
    mappings[field.name] = null;
    confidence[field.name] = 0;
  });

  const lowercaseHeaders = headers.map(h => h.toLowerCase().trim());
  const mappedHeaders = new Set<string>();

  TARGET_CRM_FIELDS.forEach((field) => {
    let matchIdx = -1;

    // Local heuristic keyword rules
    if (field.name === 'email') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('email') || h.includes('e-mail') || h.includes('mail') || h.includes('addr'));
    } else if (field.name === 'name') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('name') || h.includes('contact') || h.includes('lead'));
    } else if (field.name === 'mobile_without_country_code') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number') || h.includes('cell'));
    } else if (field.name === 'created_at') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('date') || h.includes('created') || h.includes('time'));
    } else if (field.name === 'company') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('company') || h.includes('org') || h.includes('firm') || h.includes('employer'));
    } else if (field.name === 'city') {
      matchIdx = lowercaseHeaders.findIndex(h => h === 'city' || h.includes('town'));
    } else if (field.name === 'state') {
      matchIdx = lowercaseHeaders.findIndex(h => h === 'state' || h.includes('province') || h.includes('region'));
    } else if (field.name === 'country') {
      matchIdx = lowercaseHeaders.findIndex(h => h === 'country');
    } else if (field.name === 'lead_owner') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('owner') || h.includes('agent') || h.includes('assigned'));
    } else if (field.name === 'crm_status') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('status') || h.includes('stage'));
    } else if (field.name === 'crm_note') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('remark') || h.includes('feedback'));
    } else if (field.name === 'data_source') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('source') || h.includes('channel') || h.includes('campaign'));
    } else if (field.name === 'possession_time') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('possession') || h.includes('timeline'));
    } else if (field.name === 'description') {
      matchIdx = lowercaseHeaders.findIndex(h => h.includes('desc') || h.includes('about') || h.includes('info'));
    }

    if (matchIdx !== -1) {
      const headerName = headers[matchIdx];
      // Ensure one header is not mapped to multiple target fields programmatically
      if (!mappedHeaders.has(headerName)) {
        mappings[field.name] = headerName;
        confidence[field.name] = 0.7;
        mappedHeaders.add(headerName);
      }
    }
  });

  return {
    mappings,
    confidence,
    reasoning: 'Gemini AI API quota exceeded or key invalid. Switched to local rule-based header mapper fallback.'
  };
}

// Automatically analyze CSV headers and suggest mappings.
// NOTE: To adhere strictly to the "No AI processing should happen yet" preview guidelines
// and avoid rate-limiting / latency during file uploads, this uses a local keyword mapper.
export async function suggestColumnMapping(
  headers: string[],
  sampleRows: string[][],
  apiKey?: string
): Promise<MappingResult> {
  return programmaticSuggestMapping(headers);
}

export interface ProcessedLeadResult {
  status: 'success' | 'skipped';
  reason: string | null;
  lead: {
    created_at: string | null;
    name: string | null;
    email: string | null;
    country_code: string | null;
    mobile_without_country_code: string | null;
    company: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    lead_owner: string | null;
    crm_status: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE' | null;
    crm_note: string | null;
    data_source: 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | null;
    possession_time: string | null;
    description: string | null;
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
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] || '';
    });

    const lead: Record<string, any> = {};

    TARGET_CRM_FIELDS.forEach((field) => {
      lead[field.name] = mapping[field.name] ? rowObj[mapping[field.name]!] : '';
    });

    // Aggregate any unmapped columns to crm_note
    const extraNotes: string[] = [];
    headers.forEach((h) => {
      if (!mappedCsvHeaders.has(h) && rowObj[h]) {
        extraNotes.push(`${h}: ${rowObj[h]}`);
      }
    });

    const initialNote = lead['crm_note'] || '';
    lead['crm_note'] = [initialNote, ...extraNotes].filter(Boolean).join(' | ');

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
  
  const batchSize = 30;

  for (let i = 0; i < initialLeads.length; i += batchSize) {
    const batch = initialLeads.slice(i, i + batchSize);
    
    const prompt = `
You are an expert CRM Data Quality Engine. Your task is to clean, standardize, validate, and enrich the following batch of lead records according to the GrowEasy CRM rules.

Formatting and Cleaning Rules:
1. \`name\`: Standardize to Title Case (e.g. 'john doe' -> 'John Doe').
2. \`created_at\`: Format as a JavaScript-parseable date string (e.g. 'YYYY-MM-DD HH:MM:SS'). Default to current date/time if missing or empty.
3. \`email\`: Validate format. If multiple emails exist, put the first in \`email\` and append any remaining emails to \`crm_note\`.
4. \`country_code\`: Standardize to a plus sign followed by numeric code (e.g. '+91' or '+1'). If missing, look at other fields or phone values to infer, otherwise default to '+91' or leave blank.
5. \`mobile_without_country_code\`: Clean the number (remove spaces, symbols, and country codes if present). If multiple numbers exist, put the first in \`mobile_without_country_code\` and append any remaining numbers to \`crm_note\`.
6. \`company\`: Clean names. If missing, look at the email domain (excluding public providers like gmail, yahoo, outlook, hotmail, mail, icloud) to infer and enrich the company field (e.g., 'sarah@stripe.com' -> Company 'Stripe').
7. \`crm_status\`: Normalize to ONE of these exact values:
   - GOOD_LEAD_FOLLOW_UP
   - DID_NOT_CONNECT
   - BAD_LEAD
   - SALE_DONE
   Default to GOOD_LEAD_FOLLOW_UP if empty or unmapped.
8. \`data_source\`: Normalize to ONE of these exact values:
   - leads_on_demand
   - meridian_tower
   - eden_park
   - varah_swamy
   - sarjapur_plots
   If none match confidently, set to null/empty string.
9. \`crm_note\`: Retain notes, and append any extra phone numbers, extra email addresses, or unmapped details here. Escaped newlines (\\n) are allowed, but do not output actual carriage returns or unescaped newlines to maintain CSV compatibility.

Validation / Skip Criteria:
- If a record has NEITHER a valid \`email\` nor a valid mobile number (\`mobile_without_country_code\`), it MUST be marked with status 'skipped' and the appropriate explanation in \`reason\`. Otherwise, mark status as 'success'.

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
        "created_at": string | null,
        "name": string | null,
        "email": string | null,
        "country_code": string | null,
        "mobile_without_country_code": string | null,
        "company": string | null,
        "city": string | null,
        "state": string | null,
        "country": string | null,
        "lead_owner": string | null,
        "crm_status": "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE" | null,
        "crm_note": string | null,
        "data_source": "leads_on_demand" | "meridian_tower" | "eden_park" | "varah_swamy" | "sarjapur_plots" | null,
        "possession_time": string | null,
        "description": string | null
      }
    }
  ]
}
`;

    try {
      const result = await callWithRetry(() => model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }));

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      
      if (parsed && Array.isArray(parsed.processed_leads)) {
        parsed.processed_leads.forEach((r: any) => {
          if (r.lead) {
            // If created_at was not mapped from the CSV, stamp it with the current date/time.
            // Otherwise, validate the mapped date.
            if (!mapping['created_at']) {
              r.lead.created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
            } else {
              const dateVal = r.lead.created_at;
              if (!dateVal || isNaN(Date.parse(dateVal))) {
                r.lead.created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
              }
            }

            // Post-AI Safety Rule: If it actually has neither email nor mobile, force it to 'skipped'
            const email = String(r.lead.email || '').trim();
            const mobile = String(r.lead.mobile_without_country_code || '').trim();
            const hasEmail = email.includes('@');
            const hasMobile = mobile.length >= 7;

            if (!hasEmail && !hasMobile) {
              r.status = 'skipped';
              r.reason = 'Missing both email and mobile number (Post-AI Enforced)';
            }
          }
        });
        results.push(...parsed.processed_leads);
      } else {
        throw new Error('Invalid JSON structure returned from AI model.');
      }
    } catch (error: any) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      
      // Fallback: Programmatic backup parser when AI fails
      batch.forEach((lead) => {
        const rawEmail = String(lead.email || '').trim();
        const rawMobile = String(lead.mobile_without_country_code || '').trim();
        
        // Skip logic: Neither email nor phone
        const hasEmail = rawEmail.includes('@');
        const hasMobile = rawMobile.length >= 7; // Basic numeric length check

        let status: 'success' | 'skipped' = 'success';
        let reason: string | null = null;

        if (!hasEmail && !hasMobile) {
          status = 'skipped';
          reason = 'Missing both email and mobile number (AI Fallback)';
        }

        // Clean names
        const cleanName = lead.name ? String(lead.name).trim().replace(/\b\w/g, c => c.toUpperCase()) : null;

        // Date check
        let createdAt = lead.created_at ? String(lead.created_at).trim() : null;
        if (!createdAt) {
          createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        // Handle first email / first mobile
        const emailParts = rawEmail.split(/[\s,;]+/);
        const email = emailParts[0] || null;
        const extraEmails = emailParts.slice(1);

        const cleanMobile = rawMobile.replace(/[^0-9]/g, '');
        const extraMobiles: string[] = [];
        // Extract country code if starts with +
        let cc = lead.country_code ? String(lead.country_code).trim() : '';
        if (!cc && rawMobile.startsWith('+')) {
          cc = rawMobile.split(' ')[0] || '';
        }
        if (!cc) cc = '+91'; // default country code for India per assignments

        // Notes formatting
        const notesList = [lead.crm_note];
        if (extraEmails.length > 0) notesList.push(`Extra Emails: ${extraEmails.join(', ')}`);
        if (extraMobiles.length > 0) notesList.push(`Extra Mobiles: ${extraMobiles.join(', ')}`);
        const finalNotes = notesList.filter(Boolean).join(' | ');

        results.push({
          status,
          reason,
          lead: {
            created_at: createdAt,
            name: cleanName || null,
            email: email || null,
            country_code: cc || null,
            mobile_without_country_code: cleanMobile || null,
            company: lead.company ? String(lead.company).trim() : null,
            city: lead.city ? String(lead.city).trim() : null,
            state: lead.state ? String(lead.state).trim() : null,
            country: lead.country ? String(lead.country).trim() : null,
            lead_owner: lead.lead_owner ? String(lead.lead_owner).trim() : null,
            crm_status: lead.crm_status || 'GOOD_LEAD_FOLLOW_UP',
            crm_note: finalNotes || null,
            data_source: lead.data_source || null,
            possession_time: lead.possession_time ? String(lead.possession_time).trim() : null,
            description: lead.description ? String(lead.description).trim() : null,
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
