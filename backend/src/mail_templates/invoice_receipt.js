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
  currency = '₹',
  isRegistered = true
} = {}) {
  const year = new Date().getFullYear().toString();
  const finalReceiptUrl = receiptUrl || `https://pos.hisabkhata.sumanonline.com/receipt/${encodeURIComponent(invoiceNumber)}`;

  const buildItemVars = (item) => {
    const itemName = item.name || item.description || item.item_name || 'Item';
    const qty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
    const mrp = (item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0)
      ? Number(item.mrp).toFixed(2)
      : (item.total !== undefined && Number(qty) > 0 ? (Number(item.total) / Number(qty)).toFixed(2) : (item.rate || '0.00'));
    const total = item.total !== undefined ? Number(item.total).toFixed(2) : String(Number(item.amt || 0) + Number(item.tax || 0));
    const amt = !isRegistered
      ? total
      : (item.amt !== undefined ? item.amt : (Number(qty) * Number(item.rate || 0)).toFixed(2));
    const tax = !isRegistered ? '0.00' : (item.tax !== undefined ? item.tax : (item.tax_amount !== undefined ? Number(item.tax_amount).toFixed(2) : '0.00'));
    return { itemName, qty, mrp, total, amt, tax };
  };

  const itemsRows = items.length > 0
    ? items.map(item => {
        const { itemName, qty, mrp, total, amt, tax } = buildItemVars(item);
        return `
          <tr class="table-row" style="border-bottom: 1px solid #e2e8f0;">
            <td class="table-cell-heading" style="padding: 10px 4px 10px 0; color: #0f172a; font-size: 12px; font-weight: 700; line-height: 1.35; vertical-align: middle;">${itemName}</td>
            <td align="center" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; vertical-align: middle;">${qty}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: middle;">${currency}${mrp}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: middle;">${currency}${amt}</td>
            ${isRegistered ? `<td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: middle;">${currency}${tax}</td>` : ''}
            <td align="right" class="table-cell-total" style="padding: 10px 0 10px 4px; color: #0f172a; font-size: 12px; font-weight: 700; white-space: nowrap; vertical-align: middle;">${currency}${total}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr class="table-row" style="border-bottom: 1px solid #e2e8f0;">
        <td class="table-cell-heading" style="padding: 10px 4px 10px 0; color: #0f172a; font-size: 12px; font-weight: 700; line-height: 1.35; vertical-align: middle;">Sales Transaction</td>
        <td align="center" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; vertical-align: middle;">1</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: middle;">${currency}${grandTotal}</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: middle;">${currency}${grandTotal}</td>
        ${isRegistered ? `<td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px; white-space: nowrap; vertical-align: middle;">${currency}0.00</td>` : ''}
        <td align="right" class="table-cell-total" style="padding: 10px 0 10px 4px; color: #0f172a; font-size: 12px; font-weight: 700; white-space: nowrap; vertical-align: middle;">${currency}${grandTotal}</td>
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
  html = html.replace(/<div class="items-cards"[^>]*><\/div>/, '');

  const numDue = Number(balanceDue) || 0;
  const paymentStatusText = numDue > 0
    ? `Partially Paid via ${paymentMethod} (${currency}${balanceDue} remaining balance)`
    : `Paid in full via ${paymentMethod}`;

  const companyEmailBlock = companyEmail
    ? `<a href="mailto:${companyEmail}" class="no-underline" style="color: #64748b; text-decoration: none !important; border-bottom: none !important;">${companyEmail}</a>`
    : '';
  const companyPhoneBlock = companyPhone
    ? `<a href="tel:${companyPhone.replace(/\s+/g, '')}" class="no-underline" style="color: #64748b; text-decoration: none !important; border-bottom: none !important;">${companyPhone}</a>`
    : '';
  const customerEmailBlock = customerEmail
    ? `<a href="mailto:${customerEmail}" class="no-underline" style="color: #64748b; text-decoration: none !important; border-bottom: none !important;">${customerEmail}</a>`
    : '';
  const customerPhoneBlock = customerPhone
    ? `<a href="tel:${customerPhone.replace(/\s+/g, '')}" class="no-underline" style="color: #64748b; text-decoration: none !important; border-bottom: none !important;">${customerPhone}</a>`
    : '';

  const taxColumnHeader = isRegistered
    ? `<th align="right" style="padding: 8px 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">TAX</th>`
    : '';
  const taxTotalRow = isRegistered
    ? `<tr><td class="text-muted" style="font-size: 13px; color: #64748b; padding-bottom: 8px;">Tax / GST</td><td align="right" class="text-body" style="font-size: 13px; color: #0f172a; padding-bottom: 8px;">${currency}${taxTotal}</td></tr>`
    : '';
  const displaySubtotal = isRegistered ? subtotal : grandTotal;

  html = html
    .replace(/\{\{schemaJsonLd\}\}/g, JSON.stringify(schemaLd, null, 2))
    .replace(/\{\{invoiceNumber\}\}/g, invoiceNumber || '')
    .replace(/Invoice #INV-2026-0042/g, `Invoice #${invoiceNumber || ''}`)
    .replace(/\{\{companyName\}\}/g, companyName || 'HisabKhata Store')
    .replace(/MC Electronics/g, companyName || 'HisabKhata Store')
    .replace(/\{\{companyEmailBlock\}\}/g, companyEmailBlock)
    .replace(/\{\{companyEmail\}\}/g, companyEmailBlock)
    .replace(/pos@sumanonline\.com/g, companyEmailBlock)
    .replace(/\{\{companyPhoneBlock\}\}/g, companyPhoneBlock)
    .replace(/\{\{companyPhone\}\}/g, companyPhoneBlock)
    .replace(/\+91 8641850073/g, companyPhoneBlock)
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
    .replace(/\{\{subtotal\}\}/g, displaySubtotal)
    .replace(/₹1,228\.81/g, `${currency}${displaySubtotal}`)
    .replace(/\{\{taxTotal\}\}/g, taxTotal)
    .replace(/₹221\.19/g, `${currency}${taxTotal}`)
    .replace(/\{\{taxColumnHeader\}\}/g, taxColumnHeader)
    .replace(/\{\{taxTotalRow\}\}/g, taxTotalRow)
    .replace(/\{\{receiptUrl\}\}/g, finalReceiptUrl)
    .replace(/\{\{year\}\}/g, year)
    .replace(/2026/g, year);


  const invoiceLabel = isRegistered ? 'Tax Invoice' : 'Bill of Supply';
  const text = `${companyName} - ${invoiceLabel} #${invoiceNumber}\nDate: ${invoiceDate}\nBilled to: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}\nTotal: ${currency}${grandTotal}\nPayment: ${paymentStatusText}\n\nDownload / View Receipt: ${finalReceiptUrl}\n\nThank you for your business!`;

  return {
    subject: `${isRegistered ? 'Invoice' : 'Bill'} #${invoiceNumber} from ${companyName}`,
    html,
    text
  };
}
