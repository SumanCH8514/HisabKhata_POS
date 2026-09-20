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
          <tr class="table-row" style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 4px 10px 0; color: #0f172a; font-size: 12px; font-weight: 500;">${itemName}</td>
            <td align="center" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${qty}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${mrp}</td>
            <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${amt}</td>
            ${isRegistered ? `<td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${tax}</td>` : ''}
            <td align="right" style="padding: 10px 0 10px 4px; color: #0f172a; font-size: 12px; font-weight: 700;">${currency}${total}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr class="table-row" style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 4px 10px 0; color: #0f172a; font-size: 12px; font-weight: 500;">Sales Transaction</td>
        <td align="center" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">1</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${grandTotal}</td>
        <td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}${grandTotal}</td>
        ${isRegistered ? `<td align="right" class="table-cell-muted" style="padding: 10px 4px; color: #64748b; font-size: 12px;">${currency}0.00</td>` : ''}
        <td align="right" style="padding: 10px 0 10px 4px; color: #0f172a; font-size: 12px; font-weight: 700;">${currency}${grandTotal}</td>
      </tr>
    `;

  const itemsCards = items.length > 0
    ? items.map(item => {
        const { itemName, qty, mrp, total, tax } = buildItemVars(item);
        return `<div class="item-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-size:13px;font-weight:600;color:#0f172a;flex:1;padding-right:8px;">${itemName}</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;">${currency}${total}</div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <span style="font-size:11px;color:#64748b;">Qty: <b>${qty}</b></span>
            <span style="font-size:11px;color:#64748b;">MRP: <b>${currency}${mrp}</b></span>
            ${isRegistered && Number(tax) > 0 ? `<span style="font-size:11px;color:#64748b;">Tax: <b>${currency}${tax}</b></span>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<div class="item-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;"><div style="font-size:13px;font-weight:600;color:#0f172a;">Sales Transaction</div><div style="font-size:14px;font-weight:700;color:#0f172a;">${currency}${grandTotal}</div></div>
      </div>`;

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
  html = html.replace(/<div class="items-cards"[^>]*><\/div>/, `<div class="items-cards" style="display:none;margin-bottom:16px;">${itemsCards}</div>`);

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
    ? `<th align="right" style="padding: 10px 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.4px;">Tax</th>`
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
