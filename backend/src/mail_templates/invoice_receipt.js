import rawHtml from './invoice_receipt.html';

export function buildInvoiceReceiptEmail({
  companyName = 'HisabKhata Store',
  companyEmail = '',
  companyPhone = '',
  invoiceNumber = '',
  invoiceDate = new Date().toLocaleDateString(),
  customerName = 'Valued Customer',
  customerPhone = '',
  customerEmail = '',
  receiptUrl = '',
  paymentMethod = 'CASH',
  items = [],
  subtotal = '0.00',
  taxTotal = '0.00',
  grandTotal = '0.00',
  paidAmount = '0.00',
  balanceDue = '0.00',
  currency = '₹'
} = {}) {
  const year = new Date().getFullYear().toString();
  const finalReceiptUrl = receiptUrl || `https://pos.hisabkhata.sumanonline.com/receipt/${encodeURIComponent(invoiceNumber)}`;

  const itemsRows = items.length > 0
    ? items.map(item => {
        const itemName = item.name || item.description || item.item_name || 'Item';
        const qty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
        const mrp = item.mrp !== undefined ? item.mrp : (item.rate || '0.00');
        const amt = item.amt !== undefined ? item.amt : (Number(qty) * Number(item.rate || 0)).toFixed(2);
        const tax = item.tax !== undefined ? item.tax : (item.tax_amount !== undefined ? Number(item.tax_amount).toFixed(2) : '0.00');
        const total = item.total !== undefined ? Number(item.total).toFixed(2) : (Number(amt) + Number(tax)).toFixed(2);

        return `
          <tr class="table-row" style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 4px 10px 0; color: #0f172a; font-size: 12px; font-weight: 500;">${itemName}</td>
            <td align="center" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${qty}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${mrp}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${amt}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${tax}</td>
            <td align="right" style="padding: 10px 0 10px 4px; color: #0f172a; font-size: 12px; font-weight: 700;">${currency}${total}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr class="table-row" style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 4px 10px 0; color: #0f172a; font-size: 12px; font-weight: 500;">Sales Transaction</td>
        <td align="center" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">1</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${grandTotal}</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${subtotal}</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${taxTotal}</td>
        <td align="right" style="padding: 10px 0 10px 4px; color: #0f172a; font-size: 12px; font-weight: 700;">${currency}${grandTotal}</td>
      </tr>
    `;

  const acceptedOffers = items.length > 0
    ? items.map(item => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Product",
          "name": item.name || item.description || item.item_name || "Item"
        },
        "price": Number(item.total || item.price || 0).toFixed(2),
        "priceCurrency": "INR",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "value": Number(item.qty || item.quantity || 1)
        }
      }))
    : [{
        "@type": "Offer",
        "itemOffered": {
          "@type": "Product",
          "name": "Sales Transaction"
        },
        "price": grandTotal,
        "priceCurrency": "INR",
        "eligibleQuantity": {
          "@type": "QuantitativeValue",
          "value": 1
        }
      }];

  const schemaLd = {
    "@context": "http://schema.org",
    "@type": "Order",
    "merchant": {
      "@type": "Organization",
      "name": companyName || "HisabKhata Store",
      "email": companyEmail || undefined,
      "telephone": companyPhone || undefined
    },
    "customer": {
      "@type": "Person",
      "name": customerName || "Valued Customer",
      "email": customerEmail || undefined
    },
    "orderNumber": invoiceNumber || "",
    "orderDate": new Date().toISOString(),
    "priceCurrency": "INR",
    "price": grandTotal,
    "acceptedOffer": acceptedOffers,
    "orderStatus": "http://schema.org/OrderDelivered",
    "potentialAction": {
      "@type": "ViewAction",
      "name": "Download Receipt",
      "url": finalReceiptUrl
    }
  };

  let html = rawHtml;
  html = html.replace(/<tbody class="items-body">[\s\S]*?<\/tbody>/, `<tbody class="items-body">${itemsRows}</tbody>`);

  const numDue = Number(balanceDue) || 0;
  const paymentStatusText = numDue > 0
    ? `Partially Paid via ${paymentMethod} (${currency}${balanceDue} remaining balance)`
    : `Paid in full via ${paymentMethod}`;

  const customerEmailBlock = customerEmail ? customerEmail : '';
  const customerPhoneBlock = customerPhone ? customerPhone : '';

  html = html
    .replace(/\{\{schemaJsonLd\}\}/g, JSON.stringify(schemaLd, null, 2))
    .replace(/\{\{invoiceNumber\}\}/g, invoiceNumber || '')
    .replace(/Invoice #INV-2026-0042/g, `Invoice #${invoiceNumber || ''}`)
    .replace(/\{\{companyName\}\}/g, companyName || 'HisabKhata Store')
    .replace(/MC Electronics/g, companyName || 'HisabKhata Store')
    .replace(/\{\{companyEmail\}\}/g, companyEmail || '')
    .replace(/pos@sumanonline\.com/g, companyEmail || '')
    .replace(/\{\{companyPhone\}\}/g, companyPhone || '')
    .replace(/\+91 8641850073/g, companyPhone || '')
    .replace(/\{\{customerName\}\}/g, customerName || 'Valued Customer')
    .replace(/Rahul Sharma/g, customerName || 'Valued Customer')
    .replace(/\{\{customerEmailBlock\}\}/g, customerEmailBlock)
    .replace(/\{\{customerPhoneBlock\}\}/g, customerPhoneBlock)
    .replace(/\+91 98765 43210/g, customerPhoneBlock)
    .replace(/\{\{invoiceDate\}\}/g, invoiceDate)
    .replace(/18\/09\/2026/g, invoiceDate)
    .replace(/\{\{paymentStatusText\}\}/g, paymentStatusText)
    .replace(/\{\{paymentMethod\}\}/g, paymentMethod)
    .replace(/UPI \/ Online/g, paymentMethod)
    .replace(/\{\{currency\}\}/g, currency)
    .replace(/\{\{grandTotal\}\}/g, grandTotal)
    .replace(/₹1,450\.00/g, `${currency}${grandTotal}`)
    .replace(/\{\{subtotal\}\}/g, subtotal)
    .replace(/₹1,228\.81/g, `${currency}${subtotal}`)
    .replace(/\{\{taxTotal\}\}/g, taxTotal)
    .replace(/₹221\.19/g, `${currency}${taxTotal}`)
    .replace(/\{\{receiptUrl\}\}/g, finalReceiptUrl)
    .replace(/\{\{year\}\}/g, year)
    .replace(/2026/g, year);

  const text = `${companyName} - Tax Invoice #${invoiceNumber}\nDate: ${invoiceDate}\nBilled to: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}\nTotal: ${currency}${grandTotal}\nPayment: ${paymentStatusText}\n\nDownload / View Receipt: ${finalReceiptUrl}\n\nThank you for your business!`;

  return {
    subject: `Invoice #${invoiceNumber} from ${companyName}`,
    html,
    text
  };
}
