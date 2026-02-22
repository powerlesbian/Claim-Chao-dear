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

type BankType = 'amex' | 'hangseng' | 'unknown';

// Month name to number mapping (full names for AMEX)
const MONTHS_FULL: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3,
  may: 4, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

// Month abbreviations for Hang Seng
const MONTHS_ABBR: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const SKIP_PATTERNS_AMEX = [
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

const SKIP_PATTERNS_HANGSENG = [
  /^opening balance/i,
  /^autopay pymt/i,
  /^card total/i,
  /^fee-overseas txn/i,
  /^total hkjc/i,
  /hkjc facility charges/i,
  /non hkjc new activities/i,
  /^trans date/i,
  /^post date/i,
  /^new activity/i,
  /^amount$/i,
  /member no\./i,
  /^account no/i,
  /closing date/i,
  /payment due/i,
  /minimum payment/i,
  /credit limit/i,
  /previous balance/i,
  /new balance/i,
  /finance charge/i,
  /will be deducted/i,
  /please note/i,
  /apple pay-others/i,
  /foreign currency amount/i,
  /exchange rate/i,
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

// Detect which bank the statement is from
function detectBank(rows: RowData[]): BankType {
  const allText = rows.map(r => r.items.map(i => i.text).join(' ')).join(' ').toUpperCase();
  
  if (allText.includes('HANG SENG BANK') || allText.includes('恒生銀行') || allText.includes('HKJC')) {
    return 'hangseng';
  }
  if (allText.includes('AMERICAN EXPRESS') || allText.includes('AMEX')) {
    return 'amex';
  }
  
  // Default to amex pattern detection (Month Day format)
  if (/JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER/.test(allText)) {
    return 'amex';
  }
  
  return 'unknown';
}

// Parse AMEX date: "Month Day" -> "YYYY-MM-DD"
function parseAmexDate(dateStr: string, year: number): string | null {
  const match = dateStr.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})$/i);
  
  if (!match) return null;
  
  const monthName = match[1].toLowerCase();
  const day = parseInt(match[2], 10);
  const month = MONTHS_FULL[monthName];
  
  if (month === undefined || isNaN(day)) return null;
  
  // Handle year rollover (Dec transactions in Jan statement)
  let actualYear = year;
  if (month >= 10) { // Oct, Nov, Dec likely previous year
    actualYear = year - 1;
  }
  
  return `${actualYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Parse Hang Seng date: "DD MMM YYYY" -> "YYYY-MM-DD"
function parseHangSengDate(dateStr: string): string | null {
  const match = dateStr.match(/^(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/i);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const monthAbbr = match[2].toUpperCase();
  const year = parseInt(match[3], 10);
  
  const month = MONTHS_ABBR[monthAbbr];
  if (!month) return null;
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Parse amount for AMEX
function parseAmexAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/^(\d+\.\d{2})$/);
  
  if (match) {
    const amount = parseFloat(match[1]);
    return isNaN(amount) ? null : amount;
  }
  return null;
}

// Parse Hang Seng amount (handles "123.45-" for credits)
function parseHangSengAmount(text: string): { amount: number; isCredit: boolean } | null {
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/^(\d+\.\d{2})(-?)$/);
  
  if (match) {
    const amount = parseFloat(match[1]);
    const isCredit = match[2] === '-';
    return isNaN(amount) ? null : { amount, isCredit };
  }
  return null;
}

function shouldSkipRowAmex(rowText: string): boolean {
  return SKIP_PATTERNS_AMEX.some(pattern => pattern.test(rowText));
}

function shouldSkipRowHangSeng(rowText: string): boolean {
  return SKIP_PATTERNS_HANGSENG.some(pattern => pattern.test(rowText));
}

function detectStatementYear(rows: RowData[]): number {
  for (const row of rows.slice(0, 20)) {
    const text = row.items.map(i => i.text).join(' ');
    
    // Match patterns like "2026 1 11" or "31 DEC 2025"
    const match = text.match(/\b(202[0-9])\b/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return new Date().getFullYear();
}

// Main parser - auto-detects bank and routes to appropriate parser
export async function parsePDF(dataUrl: string): Promise<Transaction[]> {
  const rows = await extractPositionedText(dataUrl);
  const bank = detectBank(rows);
  
  console.log(`Detected bank: ${bank}`);
  
  switch (bank) {
    case 'hangseng':
      return parseHangSengFromRows(rows);
    case 'amex':
      return parseAmexFromRows(rows);
    default:
      // Try both and return whichever finds more transactions
      const amexResults = await parseAmexFromRows(rows);
      const hangSengResults = await parseHangSengFromRows(rows);
      return amexResults.length >= hangSengResults.length ? amexResults : hangSengResults;
  }
}

// Parse Hang Seng statement from positioned rows
function parseHangSengFromRows(rows: RowData[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  console.log(`Parsing Hang Seng statement with ${rows.length} rows`);

  for (const row of rows) {
    const items = row.items;
    if (items.length < 3) continue;

    const rowText = items.map(i => i.text).join(' ');
    if (shouldSkipRowHangSeng(rowText)) continue;

    // Look for pattern: "DD MMM YYYY" at start (trans date)
    // Hang Seng has two dates: trans date and post date
    let transDateStr = '';
    let dateEndIndex = 0;
    
    // Try to find "DD MMM YYYY" pattern in first items
    for (let i = 0; i < Math.min(5, items.length); i++) {
      const combined = items.slice(0, i + 1).map(it => it.text).join(' ').trim();
      if (/^\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}$/i.test(combined)) {
        transDateStr = combined;
        dateEndIndex = i + 1;
        break;
      }
    }

    if (!transDateStr) continue;

    const parsedDate = parseHangSengDate(transDateStr);
    if (!parsedDate) continue;

    // Skip the post date (another DD MMM YYYY pattern)
    let descStartIndex = dateEndIndex;
    for (let i = dateEndIndex; i < Math.min(dateEndIndex + 4, items.length); i++) {
      const combined = items.slice(dateEndIndex, i + 1).map(it => it.text).join(' ').trim();
      if (/^\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}$/i.test(combined)) {
        descStartIndex = i + 1;
        break;
      }
    }

    // Look for amount at the end
    let amount: number | null = null;
    let isCredit = false;
    let amountStartIndex = items.length;

    for (let i = items.length - 1; i >= descStartIndex; i--) {
      const parsed = parseHangSengAmount(items[i].text);
      if (parsed !== null && parsed.amount > 0) {
        amount = parsed.amount;
        isCredit = parsed.isCredit;
        amountStartIndex = i;
        break;
      }
    }

    if (amount === null || amount <= 0) continue;
    
    // Skip credits (payments)
    if (isCredit) continue;

    // Everything between dates and amount is the description
    const descriptionParts = items.slice(descStartIndex, amountStartIndex).map(i => i.text);
    let description = descriptionParts.join(' ').trim();

    // Clean up description - remove location codes like "HK", "IE", "AU", "MY", "US"
    description = description
      .replace(/\s+(HK|IE|AU|MY|US|SG|GB|JP|CN)$/i, '') // Remove country codes at end
      .replace(/\s+(Hong Kong|HONG KONG|HongKong|KUALA LUMPUR|SAGGART).*$/i, '') // Remove locations
      .replace(/\s+\d{10,}$/g, '') // Remove long numbers (reference codes)
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length < 2) continue;

    transactions.push({
      date: parsedDate,
      description,
      amount,
      currency: 'HKD',
      rawText: rowText,
    });
  }

  console.log(`parseHangSengFromRows found ${transactions.length} transactions`);
  return transactions;
}

// Parse AMEX statement from positioned rows
function parseAmexFromRows(rows: RowData[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  const statementYear = detectStatementYear(rows);
  console.log(`Parsing AMEX statement, year: ${statementYear}`);

  for (const row of rows) {
    const items = row.items;
    if (items.length < 2) continue;

    const rowText = items.map(i => i.text).join(' ');
    if (shouldSkipRowAmex(rowText)) continue;

    // Look for date at the start (leftmost items)
    let dateStr = '';
    let dateEndIndex = 0;
    
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const combined = items.slice(0, i + 1).map(it => it.text).join(' ').trim();
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}$/i.test(combined)) {
        dateStr = combined;
        dateEndIndex = i + 1;
        break;
      }
    }

    if (!dateStr) continue;

    const parsedDate = parseAmexDate(dateStr, statementYear);
    if (!parsedDate) continue;

    // Look for amount at the end
    let amount: number | null = null;
    let amountStartIndex = items.length;

    for (let i = items.length - 1; i >= dateEndIndex; i--) {
      const potentialAmount = parseAmexAmount(items[i].text);
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

    description = description
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\&\*\.\']/g, '')
      .trim();

    if (description.length < 2) continue;

    if (/^(payment|credit|autopay|direct debit)/i.test(description)) continue;

    transactions.push({
      date: parsedDate,
      description,
      amount,
      currency: 'HKD',
      rawText: rowText,
    });
  }

  console.log(`parseAmexFromRows found ${transactions.length} transactions`);
  return transactions;
}

// Legacy export for backward compatibility
export async function parseAmexPDF(dataUrl: string): Promise<Transaction[]> {
  return parsePDF(dataUrl);
}

// Legacy functions for backward compatibility
export function parseTransactionsFromText(_text: string): Transaction[] {
  console.log('Using legacy text parser as fallback');
  return [];
}

export function parseAmexStatement(_text: string): Transaction[] {
  console.log('Using legacy AMEX parser as fallback');
  return [];
}
