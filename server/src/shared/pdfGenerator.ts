import puppeteer from 'puppeteer';

export const generateInvoicePdfBuffer = async (invoiceData: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
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
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --primary: #000000;
          --secondary: #666666;
          --border: #eeeeee;
          --bg-light: #fafafa;
        }
        body { 
          font-family: 'Outfit', sans-serif; 
          padding: 50px; 
          color: var(--primary); 
          line-height: 1.5; 
          background: #ffffff;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          margin-bottom: 50px; 
        }
        .logo img { 
          max-width: 180px; 
          height: auto;
        }
        .invoice-badge {
          background: var(--primary);
          color: #ffffff;
          padding: 8px 16px;
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          border-radius: 4px;
          font-weight: 500;
        }
        .greeting {
          font-size: 24px;
          font-weight: 300;
          margin-bottom: 40px;
          letter-spacing: -0.5px;
        }
        .greeting strong {
          font-weight: 600;
        }
        .details-grid { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 40px; 
          background: var(--bg-light);
          padding: 30px;
          border-radius: 12px;
        }
        .section-title { 
          font-size: 11px; 
          font-weight: 600; 
          color: var(--secondary); 
          text-transform: uppercase; 
          letter-spacing: 1.5px;
          margin-bottom: 12px; 
        }
        .info-block p { 
          margin: 4px 0; 
          font-size: 14px; 
          font-weight: 400;
        }
        .info-block p strong {
          font-weight: 500;
        }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 40px; 
          font-size: 14px; 
        }
        .table th { 
          padding: 16px 12px; 
          text-align: left; 
          font-weight: 600; 
          border-bottom: 2px solid var(--primary); 
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .table td { 
          padding: 16px 12px; 
          border-bottom: 1px solid var(--border); 
          vertical-align: middle;
        }
        .item-name {
          font-weight: 500;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .item-meta {
          font-size: 12px;
          color: var(--secondary);
        }
        .table th.right, .table td.right { text-align: right; }
        .table th.center, .table td.center { text-align: center; }
        
        .totals-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 50px;
        }
        .totals { 
          width: 350px; 
          font-size: 14px; 
          background: var(--bg-light);
          padding: 24px;
          border-radius: 12px;
        }
        .totals-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 10px 0; 
          color: var(--secondary);
        }
        .totals-row.grand { 
          font-size: 20px; 
          font-weight: 600; 
          color: var(--primary); 
          border-top: 1px solid var(--border); 
          margin-top: 12px; 
          padding-top: 16px; 
        }
        .footer { 
          text-align: center; 
          font-size: 12px; 
          color: var(--secondary); 
          padding-top: 30px; 
          border-top: 1px solid var(--border);
        }
        .footer-heart {
          color: #ff4b4b;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="https://pastelcosmeticsuk.com/cdn/shop/files/pastel-cosmetics-uk-logo-dark_5f8eb610-3cb9-49d3-9c5f-dc4d303eecc2_1200x1200.png?v=1629311553" alt="Pastel Cosmetics" />
        </div>
        <div>
          <div class="invoice-badge">TAX INVOICE</div>
        </div>
      </div>

      <div class="greeting">
        Hello <strong>${invoiceData.customerName.split(' ')[0]}</strong>, <br/>
        <span style="font-size: 18px; color: var(--secondary);">Thank you for shopping with Pastel Arabia! Here are the details of your recent order.</span>
      </div>

      <div class="details-grid">
        <div class="info-block" style="width: 30%;">
          <div class="section-title">Invoice Details</div>
          <p><strong>Invoice No:</strong> ${invoiceData.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoiceData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600; text-transform: capitalize;">${invoiceData.status}</span></p>
        </div>

        <div class="info-block" style="width: 30%;">
          <div class="section-title">Billed To</div>
          <p><strong>${invoiceData.customerName}</strong></p>
          ${invoiceData.customerAddress ? `<p>${invoiceData.customerAddress}</p>` : ''}
          ${invoiceData.customerPhone ? `<p>${invoiceData.customerPhone}</p>` : ''}
          ${invoiceData.customerTrn ? `<p>TRN: ${invoiceData.customerTrn}</p>` : ''}
        </div>

        <div class="info-block" style="width: 30%;">
          <div class="section-title">Sold By</div>
          <p><strong>${invoiceData.businessSettings?.companyName || 'Pastel Cosmetics Arabia'}</strong></p>
          <p>${invoiceData.businessSettings?.address || 'Dubai, United Arab Emirates'}</p>
          <p>TRN: <strong>${invoiceData.businessSettings?.trn || '100000000000003'}</strong></p>
          <p>${invoiceData.businessSettings?.phone || '+971 4 123 4567'}</p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Item Description</th>
            <th class="center">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">VAT (5%)</th>
            <th class="right">Total (AED)</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map((item: any) => `
            <tr>
              <td>
                <div class="item-name">${item.productName}</div>
                <div class="item-meta">SKU: ${item.variantSku || item.productSku} ${item.shadeName ? `| Shade: ${item.shadeName}` : ''}</div>
              </td>
              <td class="center" style="font-weight: 500;">${item.quantity}</td>
              <td class="right">${parseFloat(item.unitPrice).toFixed(2)}</td>
              <td class="right">${(parseFloat(item.totalPrice) * 0.05).toFixed(2)}</td>
              <td class="right" style="font-weight: 500;">${parseFloat(item.totalPrice).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-container">
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span style="color: var(--primary);">AED ${parseFloat(invoiceData.subtotal).toFixed(2)}</span>
          </div>
          ${parseFloat(invoiceData.discountAmount) > 0 ? `
          <div class="totals-row" style="color: #ef4444;">
            <span>Discount Applied</span>
            <span>- AED ${parseFloat(invoiceData.discountAmount).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="totals-row">
            <span>Estimated VAT (5%)</span>
            <span style="color: var(--primary);">AED ${parseFloat(invoiceData.vatAmount).toFixed(2)}</span>
          </div>
          <div class="totals-row grand">
            <span>Total Amount</span>
            <span>AED ${parseFloat(invoiceData.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p style="font-size: 14px; font-weight: 500; color: var(--primary); margin-bottom: 8px;">Enjoy your new Pastel products! <span class="footer-heart">♥</span></p>
        <p>This is a computer-generated tax invoice. No physical signature is required.</p>
        <p style="margin-top: 4px;">pastelarabia.com | @pastelarabia</p>
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
