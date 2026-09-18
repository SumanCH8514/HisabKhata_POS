import rawHtml from './invoice_receipt.html';

export function buildInvoiceReceiptEmail({
  companyName = 'MC Electronics',
  companyEmail = 'pos@sumanonline.com',
  companyPhone = '+91 8641850073',
  invoiceNumber = 'INV-2026-0042',
  invoiceDate = new Date().toLocaleDateString(),
  customerName = 'Rahul Sharma',
  customerPhone = '+91 98765 43210',
  paymentMethod = 'UPI / Online',
  items = [],
  subtotal = '1,228.81',
  taxTotal = '221.19',
  grandTotal = '1,450.00',
  currency = '₹'
} = {}) {
  const year = new Date().getFullYear().toString();

  const itemsRows = items.length > 0
    ? items.map(item => `
      <tr class="table-row" style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; color: #0f172a; font-size: 13px; font-weight: 500;">${item.name || item.description || 'Item'}</td>
        <td align="center" class="table-cell-muted" style="padding: 12px 8px; color: #64748b; font-size: 13px;">${item.qty || item.quantity || 1}</td>
        <td align="right" style="padding: 12px 0; color: #0f172a; font-size: 13px; font-weight: 600;">${currency}${Number(item.total || item.price || 0).toFixed(2)}</td>
      </tr>
    `).join('')
    : `
      <tr class="table-row" style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; color: #0f172a; font-size: 13px; font-weight: 500;">Sales Transaction</td>
        <td align="center" class="table-cell-muted" style="padding: 12px 8px; color: #64748b; font-size: 13px;">1</td>
        <td align="right" style="padding: 12px 0; color: #0f172a; font-size: 13px; font-weight: 600;">${currency}${grandTotal}</td>
      </tr>
    `;

  let html = rawHtml;
  if (items.length > 0) {
    html = html.replace(/<tbody class="items-body">[\s\S]*?<\/tbody>/, `<tbody class="items-body">${itemsRows}</tbody>`);
  }

  html = html
    .replace(/Invoice #INV-2026-0042/g, `Invoice #${invoiceNumber}`)
    .replace(/\{\{invoiceNumber\}\}/g, invoiceNumber)
    .replace(/MC Electronics/g, companyName)
    .replace(/\{\{companyName\}\}/g, companyName)
    .replace(/pos@sumanonline\.com/g, companyEmail || companyName)
    .replace(/\{\{companyEmail\}\}/g, companyEmail || companyName)
    .replace(/\+91 8641850073/g, companyPhone || '')
    .replace(/\{\{companyPhone\}\}/g, companyPhone || '')
    .replace(/Rahul Sharma/g, customerName)
    .replace(/\{\{customerName\}\}/g, customerName)
    .replace(/\+91 98765 43210/g, customerPhone || '')
    .replace(/\{\{customerPhone\}\}/g, customerPhone || '')
    .replace(/18\/09\/2026/g, invoiceDate)
    .replace(/\{\{invoiceDate\}\}/g, invoiceDate)
    .replace(/UPI \/ Online/g, paymentMethod)
    .replace(/\{\{paymentMethod\}\}/g, paymentMethod)
    .replace(/₹1,450\.00/g, `${currency}${grandTotal}`)
    .replace(/\{\{grandTotal\}\}/g, `${currency}${grandTotal}`)
    .replace(/₹1,228\.81/g, `${currency}${subtotal}`)
    .replace(/\{\{subtotal\}\}/g, `${currency}${subtotal}`)
    .replace(/₹221\.19/g, `${currency}${taxTotal}`)
    .replace(/\{\{taxTotal\}\}/g, `${currency}${taxTotal}`)
    .replace(/2026/g, year)
    .replace(/\{\{year\}\}/g, year);

  const text = `${companyName} - Tax Invoice #${invoiceNumber}\nDate: ${invoiceDate}\nBilled to: ${customerName}\nTotal Paid: ${currency}${grandTotal}\nPayment Method: ${paymentMethod}\nThank you for your business!`;

  return {
    subject: `Invoice #${invoiceNumber} from ${companyName}`,
    html,
    text
  };
}
