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

interface InvoiceItem {
  itemName: string;
  itemCode?: string;
  description?: string;
  hsnCode?: string;
  unit: string;
  quantity: number;
  rate: number;
  gstPercentage: number;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  lineSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  lineTotal: number;
}

interface InvoiceData {
  companyInfo: CompanyInfo;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerMobile?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerState?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  amountInWords: string;
  paymentTerms?: string;
  notes?: string;
  reverseCharge?: boolean;
  placeOfSupply?: string;
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

export async function generateInvoicePDF(
  data: InvoiceData
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
  if (data.companyInfo.logoBase64) {
    try {
      const logoImage = await pdfDoc.embedPng(data.companyInfo.logoBase64);
      page.drawImage(logoImage, { x: margin, y: y - 60, width: 80, height: 80 });
      y -= 70;
    } catch (e) {
      // Ignore logo errors
    }
  }

  page.drawText(safeText(data.companyInfo.name || 'Hisab Kitab'), {
    x: margin,
    y,
    size: 22,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.4),
  });

  y -= 22;
  if (data.companyInfo.address) {
    page.drawText(safeText(data.companyInfo.address), { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }
  if (data.companyInfo.gstin) {
    page.drawText(safeText(`GSTIN: ${data.companyInfo.gstin}`), { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }
  if (data.companyInfo.phone) {
    page.drawText(safeText(`Phone: ${data.companyInfo.phone}`), { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }
  if (data.companyInfo.email) {
    page.drawText(safeText(`Email: ${data.companyInfo.email}`), { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }

  y -= 10;

  // Invoice Title
  page.drawRectangle({
    x: margin,
    y: y - 30,
    width: width - 2 * margin,
    height: 30,
    color: rgb(0.1, 0.1, 0.4),
  });

  page.drawText('TAX INVOICE', {
    x: margin + 10,
    y: y - 22,
    size: 16,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Invoice Number & Date on right side
  page.drawText(`Invoice No: ${data.invoiceNumber}`, {
    x: width - margin - 180,
    y: y - 22,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Date: ${formatDate(data.invoiceDate)}`, {
    x: width - margin - 180,
    y: y - 42,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  y -= 55;

  // Customer Details & Place of Supply
  const customerColWidth = (width - 2 * margin - 20) / 2;

  // Bill To
  page.drawText('Bill To:', {
    x: margin,
    y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 18;
  const customerLines = [
    data.customerName || '',
    data.customerMobile || '',
    data.customerAddress || '',
    data.customerGstin && `GSTIN: ${data.customerGstin}`,
    data.customerState && `State: ${data.customerState}`,
  ].filter(Boolean) as string[];

  customerLines.forEach(line => {
    page.drawText(safeText(line), {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
  });

  // Place of Supply on right
  let rightY = y + customerLines.length * 14 + 18;
  if (data.placeOfSupply) {
    page.drawText('Place of Supply:', {
      x: margin + customerColWidth + 20,
      y: rightY,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    rightY -= 14;
    page.drawText(safeText(data.placeOfSupply), {
      x: margin + customerColWidth + 20,
      y: rightY,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  if (data.reverseCharge) {
    rightY -= 18;
    page.drawText('Reverse Charge: Yes', {
      x: margin + customerColWidth + 20,
      y: rightY,
      size: 9,
      font: boldFont,
      color: rgb(0.8, 0.2, 0.2),
    });
  }

  y -= 10;

  // Items Table
  checkSpace(80);

  const headers = ['#', 'Description', 'HSN', 'Unit', 'Qty', 'Rate', 'Disc.', 'Taxable', 'GST%', 'GST Amt', 'Total'];
  const colWidths = [25, 135, 45, 35, 35, 50, 40, 55, 35, 50, 55];

  // Draw header
  let x = margin;
  page.drawRectangle({
    x,
    y: y - 22,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: 22,
    color: rgb(0.1, 0.1, 0.4),
  });

  headers.forEach((header, i) => {
    page.drawText(safeText(header), {
      x: x + 2,
      y: y - 18,
      size: 7.5,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    x += colWidths[i];
  });

  y -= 22;

  // Draw rows
  data.items.forEach((item, rowIndex) => {
    checkSpace(20);

    x = margin;
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x,
        y: y - 18,
        width: colWidths.reduce((a, b) => a + b, 0),
        height: 18,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    const discountLabel = item.discountType === 'percentage' ? `${item.discountValue}%` :
                          item.discountType === 'fixed' ? safeFormatCurrency(item.discountValue) : '-';

    const row = [
      String(rowIndex + 1),
      safeText(item.itemName + (item.itemCode ? ` (${item.itemCode})` : '') + (item.description ? ` - ${item.description}` : '')),
      safeText(item.hsnCode || '-'),
      safeText(item.unit),
      safeText(item.quantity.toString()),
      safeFormatCurrency(item.rate),
      discountLabel,
      safeFormatCurrency(item.taxableAmount),
      `${item.gstPercentage}%`,
      safeFormatCurrency(item.gstAmount),
      safeFormatCurrency(item.lineTotal),
    ];

    row.forEach((cell, i) => {
      page.drawText(cell, {
        x: x + 2,
        y: y - 15,
        size: 7,
        font,
        color: rgb(0, 0, 0),
      });
      x += colWidths[i];
    });

    y -= 18;
  });

  // Table border
  page.drawRectangle({
    x: margin,
    y: y,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: (height - margin - y),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });

  y -= 15;

  // Totals Section
  checkSpace(120);

  const totalsX = width - margin - 200;
  const totalsWidth = 200;
  const labelWidth = 110;
  const valueWidth = 90;
  const rowHeight = 20;

  // Subtotal
  page.drawText('Subtotal:', { x: totalsX, y, size: 9, font: boldFont });
  page.drawText(safeFormatCurrency(data.subtotal), { x: totalsX + labelWidth, y, size: 9, font });
  y -= rowHeight;

  // Item-level Discounts
  if (data.discountAmount > 0) {
    page.drawText('Less: Item Discounts:', { x: totalsX, y, size: 9, font });
    page.drawText(`-${safeFormatCurrency(data.discountAmount)}`, { x: totalsX + labelWidth, y, size: 9, font, color: rgb(0.8, 0.2, 0.2) });
    y -= rowHeight;
  }

  // Taxable Amount
  page.drawText('Taxable Value:', { x: totalsX, y, size: 9, font: boldFont });
  page.drawText(safeFormatCurrency(data.taxableAmount), { x: totalsX + labelWidth, y, size: 9, font });
  y -= rowHeight;

  // CGST
  if (data.cgst > 0) {
    page.drawText(`CGST (${(data.cgst / data.taxableAmount * 100).toFixed(2)}%):`, { x: totalsX, y, size: 9, font });
    page.drawText(safeFormatCurrency(data.cgst), { x: totalsX + labelWidth, y, size: 9, font });
    y -= rowHeight;
  }

  // SGST
  if (data.sgst > 0) {
    page.drawText(`SGST (${(data.sgst / data.taxableAmount * 100).toFixed(2)}%):`, { x: totalsX, y, size: 9, font });
    page.drawText(safeFormatCurrency(data.sgst), { x: totalsX + labelWidth, y, size: 9, font });
    y -= rowHeight;
  }

  // IGST
  if (data.igst > 0) {
    page.drawText(`IGST (${(data.igst / data.taxableAmount * 100).toFixed(2)}%):`, { x: totalsX, y, size: 9, font });
    page.drawText(safeFormatCurrency(data.igst), { x: totalsX + labelWidth, y, size: 9, font });
    y -= rowHeight;
  }

  // Total GST
  if (data.totalGst > 0) {
    page.drawText('Total GST:', { x: totalsX, y, size: 9, font: boldFont });
    page.drawText(safeFormatCurrency(data.totalGst), { x: totalsX + labelWidth, y, size: 9, font, color: rgb(0.1, 0.1, 0.4) });
    y -= rowHeight;
  }

  // Grand Total
  y -= 5;
  page.drawRectangle({
    x: totalsX - 5,
    y: y - 5,
    width: totalsWidth + 10,
    height: 30,
    color: rgb(0.1, 0.1, 0.4),
  });

  page.drawText('GRAND TOTAL:', {
    x: totalsX,
    y: y + 5,
    size: 11,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(safeFormatCurrency(data.grandTotal), {
    x: totalsX + labelWidth,
    y: y + 5,
    size: 11,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  y -= 40;

  // Amount in Words
  checkSpace(40);
  page.drawText('Amount in Words:', { x: margin, y, size: 9, font: boldFont });
  y -= 14;
  page.drawText(safeText(data.amountInWords), { x: margin, y, size: 9, font, color: rgb(0.1, 0.1, 0.4) });

  y -= 20;

  // Payment Terms / Notes
  if (data.paymentTerms) {
    page.drawText('Payment Terms:', { x: margin, y, size: 9, font: boldFont });
    y -= 14;
    page.drawText(safeText(data.paymentTerms), { x: margin, y, size: 9, font });
    y -= 14;
  }

  if (data.notes) {
    page.drawText('Notes:', { x: margin, y, size: 9, font: boldFont });
    y -= 14;
    page.drawText(safeText(data.notes), { x: margin, y, size: 9, font });
    y -= 14;
  }

  // Declaration
  y -= 10;
  page.drawText('Declaration:', { x: margin, y, size: 9, font: boldFont });
  y -= 14;
  page.drawText('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', {
    x: margin,
    y,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: width - 2 * margin,
  });

  y -= 25;

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

  y -= 30;

  // Footer
  page.drawText('This is a computer-generated invoice.', {
    x: margin,
    y: margin,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}

export { numberToWords };