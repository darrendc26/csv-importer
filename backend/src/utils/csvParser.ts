// Utility to parse raw CSV content into JavaScript objects (array of row arrays)
export function parseCSV(csvContent: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentVal += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r' || char === '\n') {
        row.push(currentVal.trim());
        currentVal = '';
        
        // Add row if it contains at least one non-empty value
        if (row.some(val => val !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        currentVal += char;
      }
    }
  }

  // Handle final field and row if any
  if (currentVal !== '' || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(val => val !== '')) {
      result.push(row);
    }
  }

  return result;
}

