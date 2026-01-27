import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  currency: string;
  rawText: string;
}

interface TextItem {
  str: string;
  transform: number[];
}

interface PositionedText {
  text: string;
  x: number;
  y: number;
}

interface RowData {
  y: number;
  items: PositionedText[];
}

// Month name to number mapping
const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3,
  may: 4, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

const SKIP_PATTERNS = [
  /^payment received/i,
  /^direct debit/i,
  /^autopay/i,
  /^cr$/i,
  /總額/,
  /賬項/,
  /會員/,
  /截數/,
  /月結單/,
];

export async function extractTextFromPDF(dataUrl: string): Promise<string> {
  try {
    if (!dataUrl || !dataUrl.includes('base64')) {
      throw new Error('Invalid data URL format');
    }

    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      throw new Error('No base64 data found');
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (error) {
    console.error('Detailed PDF parsing error:', error);
    if (error instanceof Error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
    throw new Error('Failed to parse PDF - unknown error');
  }
}

// Extract text with position data for structured parsing
export async function extractPositionedText(dataUrl: string): Promise<RowData[]> {
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('No base64 data found');

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const allRows: RowData[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group by Y position (with tolerance for same row)
    const rowMap = new Map<number, PositionedText[]>();
    
    for (const item of textContent.items as TextItem[]) {
      if (!item.str.trim()) continue;
      
      const x = Math.round(item.transform[4]);
      const y = Math.round(item.transform[5]);
      
      // Find existing row within tolerance (±3 pixels)
      let rowKey = y;
      for (const existingY of rowMap.keys()) {
        if (Math.abs(existingY - y) <= 3) {
          rowKey = existingY;
          break;
        }
      }
      
      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, []);
      }
      rowMap.get(rowKey)!.push({ text: item.str, x, y });
    }

    // Convert to sorted rows
    const pageRows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0]) // Top to bottom (descending Y)
      .map(([y, items]) => ({
        y,
        items: items.sort((a, b) => a.x - b.x), // Left to right
      }));

    allRows.push(...pageRows);
  }

  return allRows;
}

function parseDate(dateStr: string, year: number): string | null {
  const match = dateStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})$/i);
  
  if (!match) return null;
  
  const monthName = match[1].toLowerCase();
  const day = parseInt(match[2], 10);
  const month = MONTHS[monthName];
  
  if (month === undefined || isNaN(day)) return null;
  
  // Handle year rollover (Dec transactions in Jan statement)
  let actualYear = year;
  if (month >= 10) { // Oct, Nov, Dec likely previous year
    actualYear = year - 1;
  }
  
  return `${actualYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseAmount(text: string): number | null {
  // Clean the text and look for amount pattern
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/^(\d+\.\d{2})$/);
  
  if (match) {
    const amount = parseFloat(match[1]);
    return isNaN(amount) ? null : amount;
  }
  return null;
}

function shouldSkipRow(rowText: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(rowText));
}

function detectStatementYear(rows: RowData[]): number {
  // Look for year in the first few rows
  for (const row of rows.slice(0, 20)) {
    const text = row.items.map(i => i.text).join(' ');
    
    // Match patterns like "2026 1 11" or "2026年1月"
    const match = text.match(/\b(202[0-9])\s+\d{1,2}\s+\d{1,2}\b/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return new Date().getFullYear();
}

export async function parseAmexPDF(dataUrl: string): Promise<Transaction[]> {
  const rows = await extractPositionedText(dataUrl);
  const transactions: Transaction[] = [];
  
  const statementYear = detectStatementYear(rows);
  console.log(`Detected statement year: ${statementYear}`);

  for (const row of rows) {
    const items = row.items;
    if (items.length < 2) continue;

    // Get full row text for skip check
    const rowText = items.map(i => i.text).join(' ');
    if (shouldSkipRow(rowText)) continue;

    // Look for date at the start (leftmost items)
    let dateStr = '';
    let dateEndIndex = 0;
    
    // Try to find "Month Day" pattern in first few items
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const combined = items.slice(0, i + 1).map(it => it.text).join(' ').trim();
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}$/i.test(combined)) {
        dateStr = combined;
        dateEndIndex = i + 1;
        break;
      }
    }

    if (!dateStr) continue;

    const parsedDate = parseDate(dateStr, statementYear);
    if (!parsedDate) continue;

    // Look for amount at the end (rightmost items)
    let amount: number | null = null;
    let amountStartIndex = items.length;

    for (let i = items.length - 1; i >= dateEndIndex; i--) {
      const potentialAmount = parseAmount(items[i].text);
      if (potentialAmount !== null && potentialAmount > 0) {
        amount = potentialAmount;
        amountStartIndex = i;
        break;
      }
    }

    if (amount === null || amount <= 0) continue;

    // Everything between date and amount is the description
    const descriptionParts = items.slice(dateEndIndex, amountStartIndex).map(i => i.text);
    let description = descriptionParts.join(' ').trim();

    // Clean up description
    description = description
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\&\*\.\']/g, '') // Remove special chars except common ones
      .trim();

    if (description.length < 2) continue;

    // Skip if it's a credit/payment
    if (/^(payment|credit|autopay|direct debit)/i.test(description)) continue;

    transactions.push({
      date: parsedDate,
      description,
      amount,
      currency: 'HKD',
      rawText: rowText,
    });
  }

  console.log(`parseAmexPDF found ${transactions.length} transactions`);
  return transactions;
}

// Legacy functions for backward compatibility
export function parseTransactionsFromText(text: string): Transaction[] {
  // This is now a fallback - the main parsing uses parseAmexPDF
  console.log('Using legacy text parser as fallback');
  return [];
}

export function parseAmexStatement(text: string): Transaction[] {
  // This is now a fallback - the main parsing uses parseAmexPDF
  console.log('Using legacy AMEX parser as fallback');
  return [];
}
