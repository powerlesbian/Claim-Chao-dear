import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
        .map((item: any) => item.str)
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

export function parseTransactionsFromText(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');

  const datePattern = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/;
  const amountPattern = /[-]?\$?\s*\d+[,.]?\d*\.?\d{0,2}/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const amounts = line.match(amountPattern);
    if (!amounts || amounts.length === 0) continue;

    const lastAmount = amounts[amounts.length - 1]
      .replace(/\$|,/g, '')
      .trim();
    const amount = parseFloat(lastAmount);

    if (isNaN(amount)) continue;

    let description = line
      .replace(dateMatch[0], '')
      .replace(lastAmount, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length > 0) {
      transactions.push({
        date: dateMatch[0],
        description,
        amount: Math.abs(amount),
        rawText: line,
      });
    }
  }

  return transactions;
}
