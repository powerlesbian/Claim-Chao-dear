import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  rawText: string;
}

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
        .map((item: any) => {
          if (item.str) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      fullText += pageText + '\n';
    }

    console.log(`Extracted ${fullText.length} characters from PDF`);
    console.log('First 500 characters:', fullText.substring(0, 500));
    return fullText;
  } catch (error) {
    console.error('Detailed PDF parsing error:', error);
    if (error instanceof Error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
    throw new Error('Failed to parse PDF - unknown error');
  }
}

export function parseTransactionsFromText(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  // More flexible date patterns - supports MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.
  const datePattern = /\b(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4}|\d{4}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/i;

  // More flexible amount patterns - handles various currency formats
  const amountPattern = /(?:[-+]?\s*)?(?:\$|USD|EUR|GBP|CAD)?\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+\.\d{2}/g;

  console.log(`Parsing ${lines.length} lines for transactions...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 10) continue; // Skip very short lines

    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const amounts = line.match(amountPattern);
    if (!amounts || amounts.length === 0) continue;

    // Try to find the most likely transaction amount (usually the last one)
    const lastAmount = amounts[amounts.length - 1]
      .replace(/\$|USD|EUR|GBP|CAD|,|\s/g, '')
      .trim();
    const amount = parseFloat(lastAmount);

    if (isNaN(amount) || amount === 0) continue;

    let description = line
      .replace(dateMatch[0], '')
      .replace(amounts[amounts.length - 1], '')
      .replace(/\s+/g, ' ')
      .trim();

    // Clean up common statement artifacts
    description = description
      .replace(/^[-\s]+|[-\s]+$/g, '')
      .replace(/\s{2,}/g, ' ');

    if (description.length > 2) {
      transactions.push({
        date: dateMatch[0],
        description,
        amount: Math.abs(amount),
        rawText: line,
      });
    }
  }

  console.log(`Found ${transactions.length} potential transactions`);
  if (transactions.length > 0) {
    console.log('Sample transaction:', transactions[0]);
  }

  return transactions;
}
