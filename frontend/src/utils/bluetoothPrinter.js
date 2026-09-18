const COMMON_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000fee0-0000-1000-8000-00805f9b34fb',
  '0000fef5-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
  '00001800-0000-1000-8000-00805f9b34fb',
  '0000ffff-0000-1000-8000-00805f9b34fb'
];

let cachedDevice = null;
let cachedCharacteristic = null;
let remotePrinterStatus = null;

const btChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('hk_bt_printer_bridge')
  : null;

const pendingJobResolvers = new Map();

if (btChannel) {
  btChannel.onmessage = async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'GET_BT_STATUS') {
      const local = getLocalConnectedPrinter();
      if (local) {
        btChannel.postMessage({ type: 'BT_STATUS_UPDATE', isConnected: true, name: local.name });
      }
    } else if (msg.type === 'BT_STATUS_UPDATE') {
      if (msg.isConnected) {
        remotePrinterStatus = { name: msg.name || 'Bluetooth Thermal Printer', isRemote: true };
        window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_connected', { detail: { name: msg.name } }));
      } else {
        remotePrinterStatus = null;
        window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_disconnected'));
      }
    } else if (msg.type === 'EXEC_PRINT_JOB') {
      const local = getLocalConnectedPrinter();
      if (local && msg.jobId) {
        try {
          await executeLocalEscPosPrint(msg.invoice, msg.company, msg.cfg, msg.catalog);
          btChannel.postMessage({ type: 'PRINT_JOB_RESULT', jobId: msg.jobId, success: true });
        } catch (err) {
          btChannel.postMessage({ type: 'PRINT_JOB_RESULT', jobId: msg.jobId, success: false, error: String(err) });
        }
      }
    } else if (msg.type === 'EXEC_RAW_BYTES') {
      const local = getLocalConnectedPrinter();
      if (local && msg.jobId && msg.rawBytes) {
        try {
          const uint8 = new Uint8Array(msg.rawBytes);
          await sendChunks(cachedCharacteristic, uint8);
          btChannel.postMessage({ type: 'PRINT_JOB_RESULT', jobId: msg.jobId, success: true });
        } catch (err) {
          btChannel.postMessage({ type: 'PRINT_JOB_RESULT', jobId: msg.jobId, success: false, error: String(err) });
        }
      }
    } else if (msg.type === 'PRINT_JOB_RESULT') {
      if (msg.jobId && pendingJobResolvers.has(msg.jobId)) {
        const resolver = pendingJobResolvers.get(msg.jobId);
        pendingJobResolvers.delete(msg.jobId);
        if (msg.success) {
          resolver.resolve(true);
        } else {
          resolver.reject(new Error(msg.error || 'Remote print failed'));
        }
      }
    }
  };
}

export const isBluetoothSupported = () => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

const getLocalConnectedPrinter = () => {
  if (cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected && cachedCharacteristic) {
    return { device: cachedDevice, characteristic: cachedCharacteristic, name: cachedDevice.name || 'Bluetooth Thermal Printer', isLocal: true };
  }
  return null;
};

export const getConnectedPrinter = () => {
  const local = getLocalConnectedPrinter();
  if (local) return local;
  if (remotePrinterStatus) return remotePrinterStatus;
  if (typeof localStorage !== 'undefined' && localStorage.getItem('hk_bt_printer_paired') === 'true') {
    const savedName = localStorage.getItem('hk_bt_printer_name') || 'Bluetooth Thermal Printer';
    return { name: savedName, isSaved: true };
  }
  return null;
};

export const connectBluetoothPrinter = async () => {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome or Edge.');
  }

  let device = null;
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Thermal' },
        { namePrefix: 'Printer' },
        { namePrefix: 'POS' },
        { namePrefix: 'MTP' },
        { namePrefix: 'RP' },
        { namePrefix: 'MPT' },
        { namePrefix: 'PT' },
        { namePrefix: 'BT' },
        { namePrefix: '58' },
        { namePrefix: '80' },
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }
      ],
      optionalServices: COMMON_PRINTER_SERVICES
    });
  } catch (filterErr) {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_PRINTER_SERVICES
    });
  }

  if (!device || !device.gatt) {
    throw new Error('Bluetooth GATT server is not available on this device.');
  }

  const server = await device.gatt.connect();
  let writeChar = null;

  for (const serviceUuid of COMMON_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    } catch { }
  }

  if (!writeChar) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      }
    } catch { }
  }

  if (!writeChar) {
    throw new Error('Could not discover a writable ESC/POS printing characteristic on this Bluetooth device.');
  }

  cachedDevice = device;
  cachedCharacteristic = writeChar;
  remotePrinterStatus = null;

  device.addEventListener('gattserverdisconnected', () => {
    cachedDevice = null;
    cachedCharacteristic = null;
    if (btChannel) {
      btChannel.postMessage({ type: 'BT_STATUS_UPDATE', isConnected: false });
    }
    window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_disconnected'));
  });

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('hk_bt_printer_paired', 'true');
    localStorage.setItem('hk_bt_printer_name', device.name || 'Bluetooth Thermal Printer');
  }

  if (btChannel) {
    btChannel.postMessage({ type: 'BT_STATUS_UPDATE', isConnected: true, name: device.name || 'Bluetooth Thermal Printer' });
  }

  window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_connected', { detail: { name: device.name || 'Bluetooth Thermal Printer' } }));
  return { device, characteristic: writeChar, name: device.name || 'Bluetooth Thermal Printer', isLocal: true };
};

export const autoReconnectBluetoothPrinter = async () => {
  const local = getLocalConnectedPrinter();
  if (local) return local;

  if (btChannel) {
    btChannel.postMessage({ type: 'GET_BT_STATUS' });
    await new Promise(r => setTimeout(r, 150));
    if (remotePrinterStatus) {
      return remotePrinterStatus;
    }
  }

  if (typeof localStorage !== 'undefined' && localStorage.getItem('hk_bt_printer_paired') !== 'true') {
    return null;
  }

  if (!isBluetoothSupported() || !navigator.bluetooth.getDevices) return null;
  try {
    const devices = await navigator.bluetooth.getDevices();
    for (const device of devices) {
      if (device.gatt) {
        let server;
        try {
          server = device.gatt.connected ? device.gatt : await device.gatt.connect();
        } catch {
          continue;
        }

        let writeChar = null;
        for (const serviceUuid of COMMON_PRINTER_SERVICES) {
          try {
            const service = await server.getPrimaryService(serviceUuid);
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                writeChar = char;
                break;
              }
            }
            if (writeChar) break;
          } catch { }
        }

        if (!writeChar) {
          try {
            const services = await server.getPrimaryServices();
            for (const service of services) {
              const chars = await service.getCharacteristics();
              for (const char of chars) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writeChar = char;
                  break;
                }
              }
              if (writeChar) break;
            }
          } catch { }
        }

        if (writeChar) {
          cachedDevice = device;
          cachedCharacteristic = writeChar;
          device.addEventListener('gattserverdisconnected', () => {
            cachedDevice = null;
            cachedCharacteristic = null;
            if (btChannel) {
              btChannel.postMessage({ type: 'BT_STATUS_UPDATE', isConnected: false });
            }
            window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_disconnected'));
          });
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hk_bt_printer_paired', 'true');
            localStorage.setItem('hk_bt_printer_name', device.name || 'Bluetooth Thermal Printer');
          }
          if (btChannel) {
            btChannel.postMessage({ type: 'BT_STATUS_UPDATE', isConnected: true, name: device.name || 'Bluetooth Thermal Printer' });
          }
          window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_connected', { detail: { name: device.name || 'Bluetooth Thermal Printer' } }));
          return { device, characteristic: writeChar, name: device.name || 'Bluetooth Thermal Printer', isLocal: true };
        }
      }
    }
  } catch { }
  return null;
};

export const disconnectBluetoothPrinter = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('hk_bt_printer_paired');
    localStorage.removeItem('hk_bt_printer_name');
  }
  if (cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected) {
    cachedDevice.gatt.disconnect();
  }
  cachedDevice = null;
  cachedCharacteristic = null;
  remotePrinterStatus = null;
  if (btChannel) {
    btChannel.postMessage({ type: 'BT_STATUS_UPDATE', isConnected: false });
  }
  window.dispatchEvent(new CustomEvent('hk_bluetooth_printer_disconnected'));
};

const sendChunks = async (characteristic, uint8Array) => {
  const CHUNK_SIZE = 120;
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.slice(i, i + CHUNK_SIZE);
    try {
      if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
    } catch {
      await characteristic.writeValue(chunk);
    }
    await new Promise(r => setTimeout(r, 10));
  }
};

const encodeText = (text) => {
  const encoder = new TextEncoder();
  return encoder.encode(text);
};

const wrapText = (text, max = 32) => {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + (current ? ' ' : '') + w).length <= max) {
      current += (current ? ' ' : '') + w;
    } else {
      if (current) lines.push(current);
      current = w.slice(0, max);
    }
  }
  if (current) lines.push(current);
  return lines;
};

export const printTestReceipt = async (shopName = 'HisabKhata POS') => {
  let printer = getConnectedPrinter();
  if (!printer) {
    printer = await connectBluetoothPrinter();
  }

  const ESC = 0x1B;
  const GS = 0x1D;

  const commands = [
    ESC, 0x40,
    ESC, 0x6C, 0x00,
    ESC, 0x61, 0x01,
    ESC, 0x45, 0x01,
    ...encodeText(`${shopName.slice(0, 30)}\n`),
    ESC, 0x45, 0x00,
    ...encodeText('BT Printer Connected\n'),
    ...encodeText('--------------------------------\n'),
    ESC, 0x61, 0x00,
    ...encodeText(`Date: ${new Date().toLocaleDateString()}\n`),
    ...encodeText(`Time: ${new Date().toLocaleTimeString()}\n`),
    ...encodeText('Status: Online & Ready\n'),
    ...encodeText('Feed: ESC/POS 58mm/80mm Ready\n'),
    ...encodeText('--------------------------------\n'),
    ESC, 0x61, 0x01,
    ESC, 0x45, 0x01,
    ...encodeText('TEST PRINT SUCCESSFUL!\n'),
    ESC, 0x45, 0x00,
    ...encodeText('Thanks for using HisabKhata\n\n\n\n'),
    GS, 0x56, 0x41, 0x00
  ];

  if (cachedCharacteristic) {
    await sendChunks(cachedCharacteristic, new Uint8Array(commands));
  }
};

const formatInvoiceDate = (d) => {
  if (!d) return new Date().toLocaleDateString('en-GB');
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(d);
  }
};

const twoCols = (left, right, width = 32) => {
  const l = String(left || '');
  const r = String(right || '');
  const spaces = Math.max(1, width - l.length - r.length);
  return (l + ' '.repeat(spaces) + r).slice(0, width);
};

const splitItemName = (name, maxLine1 = 14, maxLine2 = 28) => {
  if (!name) return { line1: '', line2: '' };
  const trimmed = name.trim();
  if (trimmed.length <= maxLine1) return { line1: trimmed, line2: '' };

  const words = trimmed.split(' ');
  let l1 = '';
  let idx = 0;
  for (let i = 0; i < words.length; i++) {
    const next = l1 ? `${l1} ${words[i]}` : words[i];
    if (next.length <= maxLine1) {
      l1 = next;
      idx = i + 1;
    } else {
      break;
    }
  }
  if (!l1) {
    l1 = trimmed.slice(0, maxLine1);
    const rem = trimmed.slice(maxLine1).trim();
    return {
      line1: l1,
      line2: rem.length > maxLine2 ? rem.slice(0, maxLine2 - 3) + '...' : rem
    };
  }
  const remaining = words.slice(idx).join(' ');
  const l2 = remaining.length > maxLine2 ? remaining.slice(0, maxLine2 - 3) + '...' : remaining;
  return { line1: l1, line2: l2 };
};

const sanitizeAscii = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/₹/g, 'Rs.')
    .replace(/[•●]/g, '|')
    .replace(/[–—]/g, '-')
    .replace(/’|‘/g, "'")
    .replace(/“|”/g, '"')
    .replace(/[^\x20-\x7E\n]/g, '');
};

const executeLocalEscPosPrint = async (invoice, company = {}, cfg = {}, catalog = []) => {
  if (!cachedCharacteristic) {
    throw new Error('No local Bluetooth characteristic available');
  }

  const ESC = 0x1B;
  const GS = 0x1D;

  const rawName = cfg.customCompanyName || (typeof company === 'string' ? company : company?.name) || 'HisabKhata POS';
  const effectiveName = sanitizeAscii(rawName.toUpperCase()).slice(0, 32);
  const showAddress = cfg.showAddress !== false && company?.address;
  const showPhone = cfg.showContact !== false && company?.phone;
  const showGst = cfg.showGstin !== false && (company?.gst_number || company?.trade_licence);
  const showMrp = Boolean(cfg.showMrpColumn);

  let cmd = [
    ESC, 0x40,
    ESC, 0x6C, 0x00,
    GS, 0x4C, 0x00, 0x00,
    ESC, 0x61, 0x01,
    ESC, 0x45, 0x01,
    ...encodeText(`${effectiveName.slice(0, 32)}\n`),
    ESC, 0x45, 0x00
  ];

  if (cfg.isCompositionScheme) {
    cmd.push(...encodeText('Composition Taxable Person\nNot eligible to collect tax\n'));
  }

  if (showAddress) {
    const cleanAddr = sanitizeAscii(company.address);
    if (cleanAddr.length <= 44) {
      cmd.push(
        ESC, 0x61, 0x01,
        ESC, 0x21, 0x01,
        ...encodeText(`${cleanAddr}\n`),
        ESC, 0x21, 0x00
      );
    } else {
      const addrLines = wrapText(cleanAddr, 32);
      addrLines.forEach(l => cmd.push(...encodeText(`${l}\n`)));
    }
  }

  if (showPhone || (cfg.showWebsite !== false && company?.website)) {
    const parts = [];
    if (showPhone && company?.phone) {
      const cleanPhone = sanitizeAscii(company.phone).replace(/\s+/g, '');
      parts.push(cleanPhone);
    }
    if (cfg.showWebsite !== false && company?.website) parts.push(sanitizeAscii(company.website.replace(/^https?:\/\//, '')));
    const line = parts.join(' | ');
    cmd.push(
      ESC, 0x61, 0x01,
      ESC, 0x21, 0x01,
      ...encodeText(`${line}\n`),
      ESC, 0x21, 0x00
    );
  }

  if (showGst) {
    const cleanGst = sanitizeAscii(company.gst_number || company.trade_licence);
    cmd.push(...encodeText(`GSTIN: ${cleanGst}\n`));
  }

  if (cfg.invoiceTitle && cfg.invoiceTitle !== 'NAN' && cfg.invoiceTitle !== 'NONE') {
    cmd.push(...encodeText(`[ ${sanitizeAscii(cfg.invoiceTitle)} ]\n`));
  }

  const invNum = sanitizeAscii(invoice.invoice_number || 'N/A');
  const invDate = sanitizeAscii(formatInvoiceDate(invoice.date));
  const partyName = sanitizeAscii(invoice.party_name || 'Walk-in');
  const rawMode = sanitizeAscii(invoice.payment_mode || 'CASH');
  const payMode = rawMode.replace(/^UPI\s*\((.*)\)$/i, '$1').replace(/^UPI$/i, 'UPI');

  cmd.push(
    ...encodeText('--------------------------------\n'),
    ESC, 0x61, 0x00,
    ...encodeText(`${twoCols(`Bill: ${invNum.slice(0, 14)}`, `Dt: ${invDate}`, 32)}\n`),
    ...encodeText(`${twoCols(`Cust: ${partyName.slice(0, 12)}`, `Mode: ${payMode.slice(0, 12)}`, 32)}\n`),
    ...encodeText('--------------------------------\n')
  );

  if (showMrp) {
    cmd.push(...encodeText('ITEM         ' + '  QTY' + '    MRP' + '  PRICE\n'));
  } else {
    cmd.push(...encodeText('ITEM            ' + '   QTY' + '     PRICE\n'));
  }
  cmd.push(...encodeText('--------------------------------\n'));

  const items = invoice.items || [];
  for (const it of items) {
    const matchedCatalogItem = (catalog || []).find(c => String(c.id) === String(it.item_id) || (c.name && it.item_name && c.name.toLowerCase() === it.item_name.toLowerCase()));
    const itemAmt = it.total !== undefined ? it.total : (it.quantity * it.rate);
    const unitPrice = it.quantity > 0 ? (itemAmt / it.quantity) : it.rate;
    const mrpVal = it.item_mrp || it.mrp || matchedCatalogItem?.mrp || unitPrice;

    const cleanItemName = sanitizeAscii(it.item_name || 'Item');
    const { line1: l1, line2: l2 } = splitItemName(cleanItemName, showMrp ? 13 : 16, 30);
    const paddedName = l1.slice(0, showMrp ? 13 : 16).padEnd(showMrp ? 13 : 16, ' ');

    const qtyUnit = `${it.quantity}${cfg.showUnitColumn ? (sanitizeAscii(it.unit) || '') : ''}`.trim();
    const qtyStr = qtyUnit.slice(0, showMrp ? 5 : 6).padStart(showMrp ? 5 : 6, ' ');
    const mrpStr = showMrp ? String(Number(mrpVal).toFixed(0)).slice(0, 7).padStart(7, ' ') : '';
    const priceStr = String(Number(unitPrice).toFixed(0)).slice(0, showMrp ? 7 : 10).padStart(showMrp ? 7 : 10, ' ');

    cmd.push(
      ESC, 0x21, 0x00,
      ...encodeText(showMrp ? `${paddedName}${qtyStr}${mrpStr}${priceStr}\n` : `${paddedName}${qtyStr}${priceStr}\n`)
    );

    if (l2) {
      cmd.push(
        ESC, 0x21, 0x00,
        ...encodeText(`${l2.slice(0, 32)}\n`)
      );
    }
  }

  const subtotal = Number(invoice.subtotal || 0).toFixed(2);
  const tax = Number(invoice.tax_amount || 0).toFixed(2);
  const total = Number(invoice.total_amount || 0).toFixed(2);
  const paid = Number(invoice.amount_paid !== undefined ? invoice.amount_paid : invoice.total_amount || 0).toFixed(2);

  cmd.push(
    ...encodeText('--------------------------------\n'),
    ESC, 0x61, 0x00,
    ...encodeText(`${twoCols('Subtotal:', `Rs.${subtotal}`, 32)}\n`),
    ...encodeText(`${twoCols('GST Tax:', `Rs.${tax}`, 32)}\n`),
    ...encodeText('--------------------------------\n'),
    ESC, 0x45, 0x01,
    ...encodeText(`${twoCols('TOTAL:', `Rs.${total}`, 32)}\n`),
    ESC, 0x45, 0x00,
    ...encodeText(`${twoCols('Paid:', `Rs.${paid}`, 32)}\n`),
    ...encodeText('--------------------------------\n')
  );

  cmd.push(
    ESC, 0x61, 0x01,
    ...encodeText('Thank you for shopping with us!\n'),
    ...encodeText('Please visit again.\n'),
    ...encodeText('POS.HisabKhata.SumanOnline.Com\n\n\n\n'),
    GS, 0x56, 0x41, 0x00
  );

  await sendChunks(cachedCharacteristic, new Uint8Array(cmd));
};

export const printEscPosInvoice = async (invoice, company = {}, cfg = {}, catalog = []) => {
  let local = getLocalConnectedPrinter();
  if (!local) {
    local = await autoReconnectBluetoothPrinter();
  }

  if (local && cachedCharacteristic) {
    await executeLocalEscPosPrint(invoice, company, cfg, catalog);
    return;
  }

  if (btChannel) {
    btChannel.postMessage({ type: 'GET_BT_STATUS' });
    await new Promise(r => setTimeout(r, 150));

    if (remotePrinterStatus) {
      const jobId = Math.random().toString(36).slice(2) + Date.now();
      const printPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingJobResolvers.delete(jobId);
          reject(new Error('Bluetooth cross-tab print timed out'));
        }, 8000);

        pendingJobResolvers.set(jobId, {
          resolve: (val) => {
            clearTimeout(timeout);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          }
        });
      });

      btChannel.postMessage({
        type: 'EXEC_PRINT_JOB',
        jobId,
        invoice,
        company,
        cfg,
        catalog
      });

      await printPromise;
      return;
    }
  }

  const newConn = await connectBluetoothPrinter();
  if (newConn) {
    await executeLocalEscPosPrint(invoice, company, cfg, catalog);
  }
};

export const canvasToEscPosRaster = (canvas, targetWidth = 384) => {
  const tempCtx = canvas.getContext('2d', { willReadFrequently: true });
  const srcImgData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  const srcPixels = srcImgData.data;

  let minX = canvas.width;
  let maxX = 0;
  let minY = canvas.height;
  let maxY = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const a = srcPixels[idx + 3];
      if (a > 30) {
        const r = srcPixels[idx];
        const g = srcPixels[idx + 1];
        const b = srcPixels[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 220) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    maxX = canvas.width;
    minY = 0;
    maxY = canvas.height;
  }

  const paddingX = 4;
  const paddingY = 4;
  const cropX = Math.max(0, minX - paddingX);
  const cropY = Math.max(0, minY - paddingY);
  const cropW = Math.min(canvas.width - cropX, (maxX - minX) + paddingX * 2);
  const cropH = Math.min(canvas.height - cropY, (maxY - minY) + paddingY * 2);

  const scale = targetWidth / cropW;
  const targetHeight = Math.round(cropH * scale);

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;
  const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imgData.data;

  const widthBytes = Math.ceil(targetWidth / 8);
  const totalHeight = targetHeight;

  const SLICE_HEIGHT = 48;
  const commands = [
    0x1B, 0x40,
    0x1B, 0x6C, 0x00
  ];

  for (let startY = 0; startY < totalHeight; startY += SLICE_HEIGHT) {
    const currentSliceHeight = Math.min(SLICE_HEIGHT, totalHeight - startY);
    const xL = widthBytes % 256;
    const xH = Math.floor(widthBytes / 256);
    const yL = currentSliceHeight % 256;
    const yH = Math.floor(currentSliceHeight / 256);

    commands.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    for (let y = 0; y < currentSliceHeight; y++) {
      const srcY = startY + y;
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const srcX = xByte * 8 + bit;
          if (srcX < targetWidth) {
            const idx = (srcY * targetWidth + srcX) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            const luminance = a < 128 ? 255 : (0.299 * r + 0.587 * g + 0.114 * b);
            if (luminance < 205) {
              byteVal |= (1 << (7 - bit));
            }
          }
        }
        commands.push(byteVal);
      }
    }
  }

  commands.push(
    0x1B, 0x64, 0x03,
    0x1D, 0x56, 0x41, 0x00
  );

  return new Uint8Array(commands);
};

export const printElementRasterBitmap = async (elementOrId, options = {}) => {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) throw new Error('Element not found for raster bitmap printing');

  if (!window.html2canvas) {
    throw new Error('html2canvas library is not loaded');
  }

  const targetWidth = options.targetWidth || (options.is80mm ? 576 : 384);
  const canvas = await window.html2canvas(element, {
    scale: 1,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const rasterBytes = canvasToEscPosRaster(canvas, targetWidth);
  const local = getLocalConnectedPrinter();

  if (local && cachedCharacteristic) {
    await sendChunks(cachedCharacteristic, rasterBytes);
    return;
  }

  if (btChannel) {
    btChannel.postMessage({ type: 'GET_BT_STATUS' });
    await new Promise(r => setTimeout(r, 150));

    if (remotePrinterStatus) {
      const jobId = Math.random().toString(36).slice(2) + Date.now();
      const printPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingJobResolvers.delete(jobId);
          reject(new Error('Bluetooth cross-tab raster print timed out'));
        }, 30000);

        pendingJobResolvers.set(jobId, {
          resolve: (val) => {
            clearTimeout(timeout);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          }
        });
      });

      const binaryArr = Array.from(rasterBytes);
      btChannel.postMessage({
        type: 'EXEC_RAW_BYTES',
        jobId,
        rawBytes: binaryArr
      });

      await printPromise;
      return;
    }
  }

  const newConn = await connectBluetoothPrinter();
  if (newConn && cachedCharacteristic) {
    await sendChunks(cachedCharacteristic, rasterBytes);
  }
};
