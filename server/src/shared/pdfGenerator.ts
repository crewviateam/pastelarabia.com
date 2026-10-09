import puppeteer from 'puppeteer-core';

export const generateInvoicePdfBuffer = async (invoiceData: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome'),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // UAE Legal Requirements:
  // Must have "Tax Invoice" clearly written
  // Must have TRN of the seller and TRN of the buyer (if any)
  // Must have Date of issue
  // Must have description of goods, unit price, quantity, rate of tax, tax amount payable, gross amount payable.

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${invoiceData.invoiceNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 150px; font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #333; text-align: right; text-transform: uppercase; letter-spacing: 2px; }
        .details-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .section-title { font-size: 12px; font-weight: bold; color: #777; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .info-block p { margin: 2px 0; font-size: 14px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px; }
        .table th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd; }
        .table td { padding: 12px; border-bottom: 1px solid #eee; }
        .table th.right, .table td.right { text-align: right; }
        .totals { width: 40%; margin-left: auto; font-size: 14px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .totals-row.grand { font-size: 18px; font-weight: bold; color: #000; border-bottom: none; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          ${invoiceData.businessSettings?.companyName || 'Glow Wholesale'}
        </div>
        <div>
          <div class="invoice-title">TAX INVOICE</div>
          <div style="text-align: right; font-size: 14px; margin-top: 8px;">
            <p style="margin:2px 0"><strong>Invoice No:</strong> ${invoiceData.invoiceNumber}</p>
            <p style="margin:2px 0"><strong>Date:</strong> ${new Date(invoiceData.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div class="details-grid">
        <div class="info-block" style="width: 45%;">
          <div class="section-title">Supplier Details</div>
          <p><strong>${invoiceData.businessSettings?.companyName || 'Glow Wholesale LLC'}</strong></p>
          <p>${invoiceData.businessSettings?.address || 'Dubai, UAE'}</p>
          <p>TRN: <strong>${invoiceData.businessSettings?.trn || '100000000000003'}</strong></p>
          <p>Phone: ${invoiceData.businessSettings?.phone || '+971 4 123 4567'}</p>
        </div>
        
        <div class="info-block" style="width: 45%;">
          <div class="section-title">Customer Details</div>
          <p><strong>${invoiceData.customerName}</strong></p>
          ${invoiceData.customerAddress ? `<p>${invoiceData.customerAddress}</p>` : ''}
          ${invoiceData.customerTrn ? `<p>TRN: <strong>${invoiceData.customerTrn}</strong></p>` : ''}
          ${invoiceData.customerPhone ? `<p>Phone: ${invoiceData.customerPhone}</p>` : ''}
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">VAT (5%)</th>
            <th class="right">Amount (AED)</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map((item: any) => `
            <tr>
              <td>
                <div style="font-weight: 500">${item.productName}</div>
                <div style="font-size: 12px; color: #666;">SKU: ${item.variantSku || item.productSku} ${item.shadeName ? `- ${item.shadeName}` : ''}</div>
              </td>
              <td class="right">${item.quantity}</td>
              <td class="right">${parseFloat(item.unitPrice).toFixed(2)}</td>
              <td class="right">${(parseFloat(item.totalPrice) * 0.05).toFixed(2)}</td>
              <td class="right">${parseFloat(item.totalPrice).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal (Excl. VAT)</span>
          <span>AED ${parseFloat(invoiceData.subtotal).toFixed(2)}</span>
        </div>
        ${parseFloat(invoiceData.discountAmount) > 0 ? `
        <div class="totals-row" style="color: #d32f2f;">
          <span>Discount</span>
          <span>- AED ${parseFloat(invoiceData.discountAmount).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="totals-row">
          <span>Total VAT (5%)</span>
          <span>AED ${parseFloat(invoiceData.vatAmount).toFixed(2)}</span>
        </div>
        <div class="totals-row grand">
          <span>Total Amount</span>
          <span>AED ${parseFloat(invoiceData.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();

  // Convert Uint8Array to Buffer properly
  return Buffer.from(pdfBuffer);
};
