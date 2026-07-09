import { test } from 'node:test';
import assert from 'node:assert';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { suggestColumnMapping, cleanAndValidateLeads } from './geminiService';

// Mock variable to control the behavior of the mocked Gemini model
let shouldThrowError = false;
let mockResponseText = '';

// Intercept getGenerativeModel on the GoogleGenerativeAI class
GoogleGenerativeAI.prototype.getGenerativeModel = function (config: any) {
  return {
    generateContent: async () => {
      if (shouldThrowError) {
        throw new Error('API key not valid or rate limit exceeded');
      }
      return {
        response: {
          text: () => mockResponseText
        }
      };
    }
  } as any;
};

// Temporarily bypass setTimeout delays during tests to make retries instant
const originalSetTimeout = global.setTimeout;
const fastSetTimeout = (fn: any, delay: number, ...args: any[]) => {
  return originalSetTimeout(fn, 0, ...args);
};

test('Gemini Service AI Success Paths', async (t) => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'mock_key';

  t.after(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  await t.test('should successfully suggest column mappings', async () => {
    shouldThrowError = false;
    mockResponseText = JSON.stringify({
      mappings: {
        created_at: null,
        name: 'Full Name',
        email: 'Email Address',
        country_code: null,
        mobile_without_country_code: 'Phone',
        company: 'Company',
        city: null,
        state: null,
        country: null,
        lead_owner: null,
        crm_status: 'Status',
        crm_note: null,
        data_source: null,
        possession_time: null,
        description: null
      },
      confidence: {
        created_at: 0,
        name: 0.9,
        email: 1.0,
        country_code: 0,
        mobile_without_country_code: 0.9,
        company: 0.8,
        city: 0,
        state: 0,
        country: 0,
        lead_owner: 0,
        crm_status: 0.8,
        crm_note: 0,
        data_source: 0,
        possession_time: 0,
        description: 0
      },
      reasoning: 'Good match'
    });

    const result = await suggestColumnMapping(['Full Name', 'Email Address', 'Phone', 'Company', 'Status'], []);
    assert.strictEqual(result.mappings.name, 'Full Name');
    assert.strictEqual(result.mappings.email, 'Email Address');
    assert.strictEqual(result.mappings.mobile_without_country_code, 'Phone');
    assert.strictEqual(result.confidence.email, 1.0);
    assert.strictEqual(result.reasoning, 'Good match');
  });

  await t.test('should successfully clean and validate leads using mock AI', async () => {
    shouldThrowError = false;
    mockResponseText = JSON.stringify({
      processed_leads: [
        {
          status: 'success',
          reason: null,
          lead: {
            created_at: '2026-07-08 23:00:00',
            name: 'John Doe',
            email: 'john@stripe.com',
            country_code: '+91',
            mobile_without_country_code: '9876543210',
            company: 'Stripe',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            lead_owner: 'owner@groweasy.ai',
            crm_status: 'GOOD_LEAD_FOLLOW_UP',
            crm_note: 'Unmapped Col: metadata',
            data_source: 'leads_on_demand',
            possession_time: 'Immediate',
            description: 'Stripe lead'
          }
        }
      ]
    });

    const headers = ['Full Name', 'Email Address', 'Phone', 'Company', 'Unmapped Col'];
    const rows = [['John Doe', 'john@stripe.com', '9876543210', 'Stripe', 'metadata']];
    const mapping = {
      created_at: null,
      name: 'Full Name',
      email: 'Email Address',
      country_code: null,
      mobile_without_country_code: 'Phone',
      company: 'Company',
      city: null,
      state: null,
      country: null,
      lead_owner: null,
      crm_status: null,
      crm_note: null,
      data_source: null,
      possession_time: null,
      description: null
    };

    const results = await cleanAndValidateLeads(headers, rows, mapping);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].status, 'success');
    assert.strictEqual(results[0].lead.name, 'John Doe');
    assert.strictEqual(results[0].lead.company, 'Stripe');
    assert.strictEqual(results[0].lead.crm_status, 'GOOD_LEAD_FOLLOW_UP');
  });
});

test('Gemini Service Fallback Logic', async (t) => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'mock_key';

  const originalWarn = console.warn;
  const originalError = console.error;

  t.before(() => {
    // @ts-ignore
    global.setTimeout = fastSetTimeout;
    console.warn = () => {};
    console.error = () => {};
  });

  t.after(() => {
    global.setTimeout = originalSetTimeout;
    console.warn = originalWarn;
    console.error = originalError;
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  await t.test('should fall back to programmatic validation when API throws error', async () => {
    shouldThrowError = true;

    const headers = ['Full Name', 'Email Address', 'Phone', 'Company', 'Unmapped Col'];
    const rows = [
      ['John Doe', 'john@example.com', '9876543210', 'Stripe', 'some metadata'],
      ['Jane Smith', 'invalid-email', '', '', 'other metadata'] // neither email nor phone
    ];
    const mapping = {
      created_at: null,
      name: 'Full Name',
      email: 'Email Address',
      country_code: null,
      mobile_without_country_code: 'Phone',
      company: 'Company',
      city: null,
      state: null,
      country: null,
      lead_owner: null,
      crm_status: null,
      crm_note: null,
      data_source: null,
      possession_time: null,
      description: null
    };

    const results = await cleanAndValidateLeads(headers, rows, mapping);

    assert.strictEqual(results.length, 2);

    // Assert first record (success in fallback)
    assert.strictEqual(results[0].status, 'success');
    assert.strictEqual(results[0].reason, null);
    assert.strictEqual(results[0].lead.name, 'John Doe');
    assert.strictEqual(results[0].lead.email, 'john@example.com');
    assert.strictEqual(results[0].lead.mobile_without_country_code, '9876543210');
    assert.strictEqual(results[0].lead.company, 'Stripe');
    assert.strictEqual(results[0].lead.crm_status, 'GOOD_LEAD_FOLLOW_UP');
    assert.strictEqual(results[0].lead.crm_note, 'Unmapped Col: some metadata');

    // Assert second record (skipped in fallback due to missing both email and phone)
    assert.strictEqual(results[1].status, 'skipped');
    assert.strictEqual(results[1].reason, 'Missing both email and mobile number (AI Fallback)');
    assert.strictEqual(results[1].lead.name, 'Jane Smith');
  });
});
