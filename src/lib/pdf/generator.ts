import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CompanyInfo {
  name: string;
  address: string;
  gstin: string;
  phone?: string;
  email?: string;
  logoBase64?: string;
}

interface ReceiptData {
  receiptNumber: string;
  receiptDate: string;
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  customerGstin?: string;
  amount: number;
  amountInWords: string;
  paymentMethod: string;
  referenceNumber?: string;
  description?: string;
  mode: 'payment' | 'credit' | 'debit';
}

interface StatementData {
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  customerGstin?: string;
  openingBalance: number;
  openingBalanceType: 'receivable' | 'payable';
  transactions: Array<{
    date: string;
    type: string;
    description: string;
    referenceNumber?: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closingBalance: number;
  closingBalanceType: 'receivable' | 'payable';
  fromDate: string;
  toDate: string;
}

interface RateListData {
  companyInfo: CompanyInfo;
  reportTitle: string;
  products: Array<{
    category: string;
    items: Array<{
      itemName: string;
      itemCode: string;
      unit: string;
      quantity: number;
      rate: number;
      gstPercentage: number;
      finalRate: number;
      hsnCode?: string;
      description?: string;
    }>;
  }>;
  generatedDate: string;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  }

  if (num === 0) return 'Zero Rupees Only';

  let result = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore > 0) result += convertHundreds(crore) + 'Crore ';
  if (lakh > 0) result += convertHundreds(lakh) + 'Lakh ';
  if (thousand > 0) result += convertHundreds(thousand) + 'Thousand ';
  if (hundred > 0) result += convertHundreds(hundred) + 'Hundred ';
  if (num > 0) {
    if (result && (crore > 0 || lakh > 0 || thousand > 0 || hundred > 0)) {
      result += 'and ';
    }
    result += convertHundreds(num);
  }

  return result.trim() + ' Rupees Only';
}

function safeText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x00-\x7F]/g, ' ')
    .trim();
}

function safeFormatCurrency(amount: number): string {
  return 'Rs. ' + (amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function drawTable(
  page: any,
  headers: string[],
  rows: string[][],
  startX: number,
  startY: number,
  colWidths: number[],
  font: any,
  fontSize: number = 8,
  rowHeight: number = 18
): number {
  const boldFont = font;
  let y = startY;
  const pageWidth = page.getWidth();

  // Draw header
  let x = startX;
  page.drawRectangle({
    x,
    y: y - rowHeight,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: rowHeight,
    color: rgb(0.9, 0.9, 0.9),
  });

  headers.forEach((header, i) => {
    page.drawText(safeText(header), {
      x: x + 2,
      y: y - rowHeight + 4,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    x += colWidths[i];
  });

  y -= rowHeight;

  // Draw rows
  rows.forEach((row, rowIndex) => {
    x = startX;
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x,
        y: y - rowHeight,
        width: colWidths.reduce((a, b) => a + b, 0),
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    row.forEach((cell, i) => {
      page.drawText(safeText(cell), {
        x: x + 2,
        y: y - rowHeight + 4,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      x += colWidths[i];
    });

    y -= rowHeight;
  });

  // Draw table border
  page.drawRectangle({
    x: startX,
    y: y,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: startY - y,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  return y - 10;
}

export async function generateReceiptPDF(
  companyInfo: CompanyInfo,
  receiptData: ReceiptData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;

  // Company Header
  if (companyInfo.logoBase64) {
    const logoImage = await pdfDoc.embedPng(companyInfo.logoBase64);
    page.drawImage(logoImage, { x: margin, y: y - 50, width: 80, height: 80 });
  }

  page.drawText(companyInfo.name, {
    x: margin + (companyInfo.logoBase64 ? 90 : 0),
    y: y - 20,
    size: 22,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.4),
  });

  const companyDetails = [
    companyInfo.address || '',
    companyInfo.gstin ? `GSTIN: ${companyInfo.gstin}` : '',
    companyInfo.phone && `Phone: ${companyInfo.phone}`,
    companyInfo.email && `Email: ${companyInfo.email}`,
  ].filter(Boolean) as string[];

  companyDetails.forEach((detail, i) => {
    page.drawText(detail, {
      x: margin + (companyInfo.logoBase64 ? 90 : 0),
      y: y - 45 - i * 14,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  y -= 100;

  // Receipt Title
  const title = receiptData.mode === 'payment' ? 'PAYMENT RECEIPT' :
                receiptData.mode === 'credit' ? 'CREDIT NOTE' : 'DEBIT NOTE';

  page.drawRectangle({
    x: margin,
    y: y - 30,
    width: width - 2 * margin,
    height: 30,
    color: rgb(0.1, 0.1, 0.4),
  });

  page.drawText(title, {
    x: margin + 10,
    y: y - 22,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Receipt Number & Date
  page.drawText(`Receipt No: ${receiptData.receiptNumber}`, {
    x: width - margin - 180,
    y: y - 22,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Date: ${formatDate(receiptData.receiptDate)}`, {
    x: width - margin - 180,
    y: y - 45,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  y -= 60;

  // Customer Details
  page.drawText('Bill To:', {
    x: margin,
    y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 18;
  const customerLines = [
    receiptData.customerName || '',
    receiptData.customerMobile || '',
    receiptData.customerAddress || '',
    receiptData.customerGstin && `GSTIN: ${receiptData.customerGstin}`,
  ].filter(Boolean) as string[];

  customerLines.forEach(line => {
    page.drawText(line, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
  });

  y -= 10;

  // Details Table
  const details = [
    ['Payment Method', receiptData.paymentMethod.toUpperCase()],
    ['Reference No', receiptData.referenceNumber ?? '-'],
    ['Description', receiptData.description ?? '-'],
  ];

  let x = margin;
  details.forEach(([label, value]) => {
    page.drawText(label + ':', { x, y, size: 9, font: boldFont });
    x += 100;
    page.drawText(value, { x, y, size: 9, font });
    x = margin;
    y -= 18;
  });

  y -= 10;

  // Amount Table
  const amountHeaders = ['Description', 'Amount'];
  const amountRows = [
    [receiptData.description ?? 'Payment Received', formatCurrency(receiptData.amount)],
    ['Total', formatCurrency(receiptData.amount)],
  ];
  const amountColWidths = [width - 2 * margin - 100, 100];

  y = drawTable(page, amountHeaders, amountRows, margin, y, amountColWidths, font, 9, 22);

  // Amount in Words
  y -= 5;
  page.drawText('Amount in Words:', { x: margin, y, size: 9, font: boldFont });
  y -= 14;
  page.drawText(receiptData.amountInWords, { x: margin, y, size: 9, font, color: rgb(0.1, 0.1, 0.4) });

  y -= 30;

  // Signature
  page.drawLine({
    start: { x: width - margin - 150, y: y + 10 },
    end: { x: width - margin, y: y + 10 },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('Authorized Signatory', {
    x: width - margin - 130,
    y: y - 5,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer
  page.drawText('This is a computer-generated receipt. No signature required.', {
    x: margin,
    y: margin,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}

export async function generateStatementPDF(
  companyInfo: CompanyInfo,
  statementData: StatementData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = height - margin;

  // Company Header
  page.drawText(companyInfo.name, {
    x: margin,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.4),
  });

  y -= 22;
  page.drawText(companyInfo.address, { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;
  page.drawText(`GSTIN: ${companyInfo.gstin}`, { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

  y -= 30;

  // Statement Title
  page.drawRectangle({
    x: margin,
    y: y - 25,
    width: width - 2 * margin,
    height: 25,
    color: rgb(0.1, 0.1, 0.4),
  });

  page.drawText('STATEMENT OF ACCOUNT', {
    x: margin + 10,
    y: y - 18,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  y -= 50;

  // Customer Info
  page.drawText('Customer Details:', { x: margin, y, size: 10, font: boldFont });
  y -= 18;

  const customerLines = [
    statementData.customerName || '',
    statementData.customerMobile || '',
    statementData.customerAddress || '',
    statementData.customerGstin && `GSTIN: ${statementData.customerGstin}`,
  ].filter(Boolean) as string[];

  customerLines.forEach(line => {
    page.drawText(line, { x: margin, y, size: 9, font });
    y -= 14;
  });

  y -= 10;

  // Period
  page.drawText(`Period: ${formatDate(statementData.fromDate)} to ${formatDate(statementData.toDate)}`, {
    x: margin,
    y,
    size: 9,
    font: boldFont,
  });

  y -= 25;

  // Opening Balance
  const obLabel = statementData.openingBalanceType === 'receivable' ? 'Opening Balance (Dr)' : 'Opening Balance (Cr)';
  page.drawText(`${obLabel}: ${formatCurrency(statementData.openingBalance)}`, {
    x: margin,
    y,
    size: 10,
    font: boldFont,
    color: statementData.openingBalanceType === 'receivable' ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.6, 0.2),
  });

  y -= 25;

  // Transactions Table
  const headers = ['Date', 'Type', 'Description', 'Ref No.', 'Debit', 'Credit', 'Balance'];
  const colWidths = [65, 70, 140, 70, 70, 70, 70];

  const rows = statementData.transactions.map(t => [
    formatDate(t.date),
    t.type.toUpperCase(),
    t.description.length > 35 ? t.description.substring(0, 35) + '...' : t.description,
    t.referenceNumber || '-',
    t.debit > 0 ? formatCurrency(t.debit) : '-',
    t.credit > 0 ? formatCurrency(t.credit) : '-',
    formatCurrency(t.balance),
  ]);

  y = drawTable(page, headers, rows, margin, y, colWidths, font, 7.5, 18);

  // Closing Balance
  y -= 5;
  const cbLabel = statementData.closingBalanceType === 'receivable' ? 'Closing Balance (Dr)' : 'Closing Balance (Cr)';
  page.drawText(`${cbLabel}: ${formatCurrency(statementData.closingBalance)}`, {
    x: width - margin - 200,
    y,
    size: 11,
    font: boldFont,
    color: statementData.closingBalanceType === 'receivable' ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.6, 0.2),
  });

  y -= 30;

  // Footer
  page.drawText('This is a computer-generated statement.', {
    x: margin,
    y: margin,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}

export async function generateRateListPDF(
  data: RateListData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = height - margin;

  const addNewPage = () => {
    page = pdfDoc.addPage(PageSizes.A4);
    y = height - margin;
  };

  const checkSpace = (needed: number) => {
    if (y - needed < margin + 20) {
      addNewPage();
    }
  };

  // Company Header
  page.drawText(safeText(data.companyInfo.name || 'Hisab Kitab'), {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.4),
  });

  y -= 20;
  if (data.companyInfo.address) {
    page.drawText(safeText(data.companyInfo.address), { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 10;
  }
  if (data.companyInfo.gstin) {
    page.drawText(safeText(`GSTIN: ${data.companyInfo.gstin}`), { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 10;
  }

  y -= 10;

  // Report Title
  page.drawText(safeText(data.reportTitle || 'Rate List'), {
    x: margin,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.4),
  });

  y -= 15;
  page.drawText(safeText(`Generated on: ${formatDate(data.generatedDate)}`), {
    x: margin,
    y,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  y -= 25;

  // Products by Category
  data.products.forEach((categoryGroup, catIndex) => {
    checkSpace(100);

    // Category Header
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: width - 2 * margin,
      height: 18,
      color: rgb(0.9, 0.92, 0.98),
    });

    page.drawText(safeText(`${categoryGroup.category} (${categoryGroup.items.length} items)`), {
      x: margin + 5,
      y: y - 14,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.4),
    });

    y -= 22;

    // Table
    const headers = ['Item Name', 'Code', 'Unit', 'Qty', 'Rate', 'GST%', 'Final Rate', 'HSN'];
    const colWidths = [140, 50, 40, 35, 55, 35, 60, 45];

    const rows = categoryGroup.items.map(item => [
      safeText(item.itemName.length > 30 ? item.itemName.substring(0, 30) + '...' : item.itemName),
      safeText(item.itemCode || '-'),
      safeText(item.unit || 'Piece'),
      safeText(item.quantity?.toString() || '1'),
      safeFormatCurrency(item.rate),
      `${item.gstPercentage}%`,
      safeFormatCurrency(item.finalRate),
      safeText(item.hsnCode || '-'),
    ]);

    y = drawTable(page, headers, rows, margin, y, colWidths, font, 7, 16);

    y -= 10;
  });

  // Footer on last page
  page.drawText('This is a computer-generated rate list.', {
    x: margin,
    y: margin,
    size: 7,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}

export { numberToWords };