import { test } from 'node:test';
import assert from 'node:assert';
import { parseCSV } from './csvParser';

test('CSV Parser', async (t) => {
  await t.test('should parse simple CSV records', () => {
    const csv = `first_name,last_name,email
John,Doe,john@example.com
Jane,Smith,jane@example.com`;

    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, [
      ['first_name', 'last_name', 'email'],
      ['John', 'Doe', 'john@example.com'],
      ['Jane', 'Smith', 'jane@example.com']
    ]);
  });

  await t.test('should handle quoted fields with commas', () => {
    const csv = `name,company,notes
"Doe, John",Google,"Likes coding, reading"`;

    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, [
      ['name', 'company', 'notes'],
      ['Doe, John', 'Google', 'Likes coding, reading']
    ]);
  });

  await t.test('should handle escaped quotes inside quoted fields', () => {
    const csv = `title,description
"A ""Good"" Book","This is a ""great"" story"`;

    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, [
      ['title', 'description'],
      ['A "Good" Book', 'This is a "great" story']
    ]);
  });

  await t.test('should skip completely empty rows', () => {
    const csv = `first_name,last_name,email

John,Doe,john@example.com

`;

    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, [
      ['first_name', 'last_name', 'email'],
      ['John', 'Doe', 'john@example.com']
    ]);
  });

  await t.test('should handle CR LF line endings', () => {
    const csv = 'first_name,last_name\r\nJohn,Doe\r\nJane,Smith';

    const parsed = parseCSV(csv);
    assert.deepStrictEqual(parsed, [
      ['first_name', 'last_name'],
      ['John', 'Doe'],
      ['Jane', 'Smith']
    ]);
  });
});
