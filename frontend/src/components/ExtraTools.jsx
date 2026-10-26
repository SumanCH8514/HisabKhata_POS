import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Wrench, Barcode, Scale, Calculator, Coins, Copy, Check,
  Printer, RefreshCw, Plus, Trash2, Sliders, Eye, FileText,
  Building2, Layers, ArrowRightLeft, Sparkles, CheckCircle2,
  Tag, Download, ArrowRight, DollarSign, Percent, ChevronDown, Search
} from 'lucide-react';
import { getItems, getUnits, getUnitConversions, createUnitConversion, deleteUnitConversion, getCompany, fmtCurrency } from '../api/client.js';
import { toast } from '../utils/toast.js';
import html2canvas from 'html2canvas';

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

function generateCode128Bars(text) {
  if (!text) text = "HK-000001";
  const clean = text.replace(/[^\x20-\x7E]/g, '');
  const START_B = 104;
  const STOP = 106;
  
  let checksum = START_B;
  const patternList = [CODE128_PATTERNS[START_B]];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code < 103) {
      checksum += code * (i + 1);
      patternList.push(CODE128_PATTERNS[code]);
    }
  }

  const checkChar = checksum % 103;
  patternList.push(CODE128_PATTERNS[checkChar]);
  patternList.push(CODE128_PATTERNS[STOP]);

  const rawPattern = patternList.join('');
  let bars = [];
  let currentX = 0;
  let isBar = true;

  for (let i = 0; i < rawPattern.length; i++) {
    const width = parseInt(rawPattern[i], 10);
    if (isBar) {
      bars.push({ x: currentX, width });
    }
    currentX += width;
    isBar = !isBar;
  }

  return { bars, totalWidth: currentX };
}

const CODE39_TABLE = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
  '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101'
};

function generateCode39Bars(text) {
  if (!text) text = "HK000001";
  const clean = text.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
  const encoded = '*' + (clean || 'HK000001') + '*';
  let binary = '';
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    binary += (CODE39_TABLE[char] || CODE39_TABLE['0']) + '0';
  }
  let bars = [];
  let currentX = 0;
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      bars.push({ x: currentX, width: 1 });
    }
    currentX += 1;
  }
  return { bars, totalWidth: currentX };
}

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

function generateEan13Bars(text) {
  let digits = (text || '').replace(/\D/g, '');
  if (digits.length < 12) {
    digits = digits.padStart(12, '8');
  } else if (digits.length > 12) {
    digits = digits.slice(0, 12);
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  const full13 = digits + check.toString();

  const first = parseInt(full13[0], 10);
  const parity = EAN_PARITY[first];

  let bitString = '101';
  for (let i = 1; i <= 6; i++) {
    const d = parseInt(full13[i], 10);
    bitString += parity[i - 1] === 'L' ? EAN_L[d] : EAN_G[d];
  }
  bitString += '01010';
  for (let i = 7; i <= 12; i++) {
    const d = parseInt(full13[i], 10);
    bitString += EAN_R[d];
  }
  bitString += '101';

  let bars = [];
  let currentX = 0;
  for (let i = 0; i < bitString.length; i++) {
    if (bitString[i] === '1') {
      bars.push({ x: currentX, width: 1 });
    }
    currentX += 1;
  }
  return { bars, totalWidth: currentX };
}

function BarcodeSvg({ value, type = 'CODE128', height = 36 }) {
  const { bars, totalWidth } = useMemo(() => {
    if (type === 'CODE39') return generateCode39Bars(value);
    if (type === 'EAN13') return generateEan13Bars(value);
    return generateCode128Bars(value);
  }, [value, type]);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      width="100%"
      height={height}
      style={{ width: '100%', height: `${height}px`, maxHeight: `${height}px`, display: 'block' }}
      preserveAspectRatio="none"
    >
      {bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x}
          y={0}
          width={bar.width}
          height={height}
          fill="#000000"
        />
      ))}
    </svg>
  );
}

function CustomSelect({ value, onChange, options = [], placeholder = 'Select Option', className = '', searchable = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => String(o.label || '').toLowerCase().includes(q));
  }, [options, search, searchable]);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(prev => !prev);
          setSearch('');
        }}
        className={`w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border rounded-xl shadow-xs transition-all flex items-center justify-between gap-2 text-left cursor-pointer ${
          open ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+5px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 flex flex-col p-1 animate-fade-in">
          {searchable && (
            <div className="p-1.5 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 font-medium"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-52 scrollbar-thin p-0.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.key || opt.value || idx}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={13} className="text-emerald-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-slate-400 text-center font-medium">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExtraTools() {
  const [activeTab, setActiveTab] = useState('BARCODE');
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const labelRef = useRef(null);

  const [barcodeLayout, setBarcodeLayout] = useState('THERMAL_58MM');
  const [labelQty, setLabelQty] = useState(1);
  const [printMode, setPrintMode] = useState('BARCODE');
  const [codeType, setCodeType] = useState('CODE128');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [barcodeOptions, setBarcodeOptions] = useState({
    showStoreName: true,
    showProductName: true,
    showPrice: true,
    showBarcodeNumber: true,
    showCategory: false
  });

  const [fromUnitId, setFromUnitId] = useState('');
  const [toUnitId, setToUnitId] = useState('');
  const [convRate, setConvRate] = useState(1);
  const [calcFromUnit, setCalcFromUnit] = useState('');
  const [calcAmount, setCalcAmount] = useState(10);

  const [gstMode, setGstMode] = useState('FORWARD');
  const [calcBasePrice, setCalcBasePrice] = useState(1000);
  const [calcGstRate, setCalcGstRate] = useState(18);
  const [calcGrossPrice, setCalcGrossPrice] = useState(1180);

  const [marginCostPrice, setMarginCostPrice] = useState(500);
  const [marginPercent, setMarginPercent] = useState(25);

  const [denominations, setDenominations] = useState({
    2000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getItems().catch(() => []),
      getUnits().catch(() => []),
      getUnitConversions().catch(() => []),
      getCompany().catch(() => null)
    ])
      .then(([itemList, unitList, convList, comp]) => {
        setItems(itemList || []);
        setUnits(unitList || []);
        setConversions(convList || []);
        setCompany(comp);
        if (itemList && itemList.length > 0 && !selectedItemId) {
          setSelectedItemId(itemList[0].id);
        }
        if (unitList && unitList.length >= 2 && !fromUnitId) {
          setFromUnitId(unitList[0].id);
          setToUnitId(unitList[1].id);
          setCalcFromUnit(unitList[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedItem = useMemo(() => {
    return items.find(it => String(it.id) === String(selectedItemId)) || items[0];
  }, [items, selectedItemId]);

  const handleAddConversion = async (e) => {
    e.preventDefault();
    if (!fromUnitId || !toUnitId || !convRate) return;
    try {
      await createUnitConversion({
        from_unit_id: Number(fromUnitId),
        to_unit_id: Number(toUnitId),
        rate: Number(convRate)
      });
      setConvRate(1);
      toast.success('Unit conversion created successfully');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error creating unit conversion');
    }
  };

  const handleDownloadImage = async () => {
    if (!selectedItem) {
      toast.error('No barcode label available to download');
      return;
    }
    setDownloadingImage(true);
    try {
      const codeVal = selectedItem.barcode || `HK-${selectedItem.id.toString().padStart(6, '0')}`;
      const width = 640;
      let calculatedHeight = 60;
      if (barcodeOptions.showStoreName) calculatedHeight += 32;
      if (barcodeOptions.showProductName) calculatedHeight += 36;
      if (codeType === 'QR_CODE') calculatedHeight += 115;
      else calculatedHeight += 95;
      if (barcodeOptions.showBarcodeNumber) calculatedHeight += 32;
      if (barcodeOptions.showPrice) calculatedHeight += 44;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = calculatedHeight;
      const ctx = canvas.getContext('2d');

      const drawCardRounded = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      ctx.fillStyle = '#ffffff';
      drawCardRounded(4, 4, width - 8, calculatedHeight - 8, 22);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();

      let curY = 36;

      if (barcodeOptions.showStoreName) {
        ctx.fillStyle = '#475569';
        ctx.font = '900 20px Inter, system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const storeText = (company?.name || 'MC Electronics').toUpperCase();
        ctx.fillText(storeText, width / 2, curY);
        curY += 34;
      }

      if (barcodeOptions.showProductName) {
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 22px Inter, system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        let pName = selectedItem.name || 'Product Label';
        while (ctx.measureText(pName).width > width - 60 && pName.length > 5) {
          pName = pName.slice(0, -4) + '...';
        }
        ctx.fillText(pName, width / 2, curY);
        curY += 16;
      }

      if (codeType === 'QR_CODE') {
        const qrSize = 100;
        const qrX = (width - qrSize) / 2;
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, qrX, curY, qrSize, qrSize);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(codeVal)}`;
        });
        curY += qrSize + 16;
      } else {
        const { bars, totalWidth } = codeType === 'CODE39'
          ? generateCode39Bars(codeVal)
          : codeType === 'EAN13'
          ? generateEan13Bars(codeVal)
          : generateCode128Bars(codeVal);

        const barcodeH = 75;
        const barcodeW = width - 120;
        const startX = 60;
        const scaleX = barcodeW / totalWidth;

        ctx.fillStyle = '#000000';
        for (let i = 0; i < bars.length; i++) {
          const b = bars[i];
          ctx.fillRect(startX + (b.x * scaleX), curY, Math.max(1, b.width * scaleX), barcodeH);
        }
        curY += barcodeH + 18;
      }

      if (barcodeOptions.showBarcodeNumber) {
        ctx.fillStyle = '#475569';
        ctx.font = '700 17px monospace, Courier New, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(codeVal, width / 2, curY);
        curY += 22;
      }

      if (barcodeOptions.showPrice) {
        curY += 2;
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, curY);
        ctx.lineTo(width - 40, curY);
        ctx.stroke();
        curY += 26;

        const priceParts = [];
        if (selectedItem.mrp) {
          priceParts.push({ label: `MRP: ₹${selectedItem.mrp}`, color: '#0f172a' });
        }
        if (selectedItem.sale_price && (Number(selectedItem.sale_price) !== Number(selectedItem.mrp) || !selectedItem.mrp)) {
          priceParts.push({ label: `Our Price: ₹${selectedItem.sale_price}`, color: '#047857' });
        }
        if (priceParts.length === 0) {
          priceParts.push({ label: 'MRP: ₹0', color: '#0f172a' });
        }

        ctx.font = '900 22px Inter, system-ui, -apple-system, sans-serif';

        if (priceParts.length === 1) {
          ctx.fillStyle = priceParts[0].color;
          ctx.textAlign = 'center';
          ctx.fillText(priceParts[0].label, width / 2, curY);
        } else {
          const p1 = priceParts[0].label;
          const p2 = priceParts[1].label;
          const w1 = ctx.measureText(p1).width;
          const w2 = ctx.measureText(p2).width;
          const gap = 36;
          const totalW = w1 + gap + w2;
          const sX = (width - totalW) / 2;

          ctx.textAlign = 'left';
          ctx.fillStyle = priceParts[0].color;
          ctx.fillText(p1, sX, curY);

          ctx.fillStyle = priceParts[1].color;
          ctx.fillText(p2, sX + w1 + gap, curY);
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeName = (selectedItem.name || 'barcode_label').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCode = (selectedItem.barcode || `HK-${selectedItem.id || '001'}`).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeName}_${safeCode}_label.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Barcode label downloaded as image');
    } catch (err) {
      toast.error(err?.message || 'Failed to download barcode image');
    } finally {
      setDownloadingImage(false);
    }
  };

  const handlePrintLabels = () => {
    setPrintMode('BARCODE');
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');
    setTimeout(() => {
      window.print();
      if (wasDark) document.documentElement.classList.add('dark');
    }, 120);
  };

  const handlePrintCashSlip = () => {
    setPrintMode('CASH_TALLY');
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');
    setTimeout(() => {
      window.print();
      if (wasDark) document.documentElement.classList.add('dark');
    }, 120);
  };

  const totalCashTally = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [denom, count]) => {
      return sum + (Number(denom) * (Number(count) || 0));
    }, 0);
  }, [denominations]);

  const totalNotesCount = useMemo(() => {
    return Object.values(denominations).reduce((sum, count) => sum + (Number(count) || 0), 0);
  }, [denominations]);

  const handleCopyCashSummary = () => {
    const lines = [
      `*${company?.name || 'HisabKhata Store'} — Cash Closing Tally*`,
      `Date: ${new Date().toLocaleDateString('en-IN')}`,
      `----------------------------`,
      ...Object.entries(denominations)
        .filter(([_, count]) => count > 0)
        .map(([denom, count]) => `₹${denom} x ${count} = ₹${Number(denom) * count}`),
      `----------------------------`,
      `*Total Cash: ₹${totalCashTally.toLocaleString('en-IN')}* (${totalNotesCount} units)`,
      `Closing Sign: ________________`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const forwardGstCalculated = useMemo(() => {
    const base = Number(calcBasePrice) || 0;
    const rate = Number(calcGstRate) || 0;
    const gstAmt = (base * rate) / 100;
    const total = base + gstAmt;
    const cgst = gstAmt / 2;
    const sgst = gstAmt / 2;
    return { base, gstAmt, total, cgst, sgst };
  }, [calcBasePrice, calcGstRate]);

  const reverseGstCalculated = useMemo(() => {
    const gross = Number(calcGrossPrice) || 0;
    const rate = Number(calcGstRate) || 0;
    const base = (gross * 100) / (100 + rate);
    const gstAmt = gross - base;
    const cgst = gstAmt / 2;
    const sgst = gstAmt / 2;
    return { gross, base, gstAmt, cgst, sgst };
  }, [calcGrossPrice, calcGstRate]);

  const marginCalculated = useMemo(() => {
    const cost = Number(marginCostPrice) || 0;
    const margin = Number(marginPercent) || 0;
    const salePrice = margin >= 100 ? cost * 2 : cost / (1 - (margin / 100));
    const profit = salePrice - cost;
    const markup = cost > 0 ? (profit / cost) * 100 : 0;
    return { cost, margin, salePrice, profit, markup };
  }, [marginCostPrice, marginPercent]);

  const convertedUnitValue = useMemo(() => {
    const amt = Number(calcAmount) || 0;
    if (!calcFromUnit) return null;
    const matched = conversions.find(c => String(c.from_unit_id) === String(calcFromUnit));
    if (matched) {
      return {
        targetName: matched.to_name || 'Units',
        result: amt * matched.rate,
        rate: matched.rate,
        fromName: matched.from_name || 'Unit'
      };
    }
    return null;
  }, [calcAmount, calcFromUnit, conversions]);

  const gridColsClass = useMemo(() => {
    if (barcodeLayout === 'A4_24') return 'grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3';
    if (barcodeLayout === 'A4_40') return 'grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4';
    if (barcodeLayout === 'THERMAL_38_25') return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-2xl mx-auto';
    if (barcodeLayout === 'THERMAL_80MM') return 'grid-cols-1 max-w-xs mx-auto';
    if (barcodeLayout === 'THERMAL_58MM') return 'grid-cols-1 max-w-[260px] mx-auto';
    return 'grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-2xl mx-auto';
  }, [barcodeLayout]);

  const dynamicPrintStyle = useMemo(() => {
    if (printMode === 'CASH_TALLY') {
      return `
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm 3mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #root, #root > div, main {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          nav, header, aside, .print\\:hidden, .barcode-print-sheet {
            display: none !important;
          }
          #thermal-cash-tally-slip {
            display: block !important;
            width: 100% !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
            padding: 2mm 0 !important;
            color: #000000 !important;
          }
        }
      `;
    }

    let pageRules = '';
    let sheetRules = '';
    let cardRules = '';

    if (barcodeLayout === 'THERMAL_58MM') {
      pageRules = `
        @page {
          size: 58mm auto;
          margin: 0;
        }
      `;
      sheetRules = `
        .barcode-print-sheet {
          display: block !important;
          width: 48mm !important;
          max-width: 48mm !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }
      `;
      cardRules = `
        .barcode-sticker-card {
          width: 48mm !important;
          max-width: 48mm !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          padding: 1mm 1mm 1.5mm 1mm !important;
          margin: 0 0 1.5mm 0 !important;
          border-bottom: 1px dashed #000000 !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          border-radius: 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: auto !important;
          break-after: auto !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
        .barcode-sticker-card .sticker-store {
          font-size: 7.5pt !important;
          line-height: 1.1 !important;
          font-weight: 800 !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0 0 0.8mm 0 !important;
          max-width: 46mm !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .barcode-sticker-card .sticker-product {
          font-size: 7pt !important;
          line-height: 1.1 !important;
          font-weight: 900 !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0 0 0.2mm 0 !important;
          max-width: 46mm !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .barcode-sticker-card .sticker-barcode-svg {
          width: 100% !important;
          height: 8.5mm !important;
          max-height: 8.5mm !important;
          margin: 0.2mm 0 !important;
          padding: 0 1mm !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .barcode-sticker-card .sticker-barcode-svg svg {
          width: 95% !important;
          max-width: 44mm !important;
          height: 8.5mm !important;
          max-height: 8.5mm !important;
        }
        .barcode-sticker-card .sticker-barcode-svg img {
          width: 12mm !important;
          height: 12mm !important;
        }
        .barcode-sticker-card .sticker-code {
          font-size: 6pt !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          font-family: monospace !important;
          letter-spacing: 0.5px !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0.3mm 0 !important;
        }
        .barcode-sticker-card .sticker-price {
          font-size: 7pt !important;
          line-height: 1.1 !important;
          font-weight: 900 !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0.3mm 0 0 0 !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 1.5mm !important;
        }
      `;
    } else if (barcodeLayout === 'THERMAL_80MM') {
      pageRules = `
        @page {
          size: 80mm auto;
          margin: 0;
        }
      `;
      sheetRules = `
        .barcode-print-sheet {
          display: block !important;
          width: 72mm !important;
          max-width: 72mm !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }
      `;
      cardRules = `
        .barcode-sticker-card {
          width: 72mm !important;
          max-width: 72mm !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          padding: 1.5mm 2mm !important;
          margin: 0 0 2mm 0 !important;
          border-bottom: 1px dashed #000000 !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          border-radius: 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: auto !important;
          break-after: auto !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
        .barcode-sticker-card .sticker-store {
          font-size: 7.5pt !important;
          font-weight: 800 !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0 0 0.4mm 0 !important;
        }
        .barcode-sticker-card .sticker-product {
          font-size: 8.5pt !important;
          font-weight: 900 !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0 0 0.5mm 0 !important;
        }
        .barcode-sticker-card .sticker-barcode-svg {
          width: 100% !important;
          height: 10mm !important;
          max-height: 10mm !important;
          margin: 0.3mm 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .barcode-sticker-card .sticker-barcode-svg svg {
          width: 90% !important;
          max-width: 66mm !important;
          height: 10mm !important;
        }
        .barcode-sticker-card .sticker-barcode-svg img {
          width: 16mm !important;
          height: 16mm !important;
        }
        .barcode-sticker-card .sticker-code {
          font-size: 7pt !important;
          font-weight: 800 !important;
          font-family: monospace !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0.3mm 0 !important;
        }
        .barcode-sticker-card .sticker-price {
          font-size: 8pt !important;
          font-weight: 900 !important;
          color: #000000 !important;
          text-align: center !important;
          margin: 0.3mm 0 0 0 !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2mm !important;
        }
      `;
    } else if (barcodeLayout === 'THERMAL_50_25' || barcodeLayout === 'THERMAL_ROLL') {
      pageRules = `
        @page {
          size: 50mm 25mm;
          margin: 0;
        }
      `;
      sheetRules = `
        .barcode-print-sheet {
          display: block !important;
          width: 50mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          border: none !important;
        }
      `;
      cardRules = `
        .barcode-sticker-card {
          width: 50mm !important;
          height: 25mm !important;
          min-height: 25mm !important;
          max-height: 25mm !important;
          padding: 0.8mm 1.5mm !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: always !important;
          break-after: page !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
        .barcode-sticker-card .sticker-store {
          font-size: 6pt !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          color: #000000 !important;
          margin: 0 0 0.3mm 0 !important;
        }
        .barcode-sticker-card .sticker-product {
          font-size: 7pt !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          color: #000000 !important;
          margin: 0 0 0.3mm 0 !important;
        }
        .barcode-sticker-card .sticker-barcode-svg {
          height: 8.5mm !important;
          max-height: 8.5mm !important;
          margin: 0.2mm 0 !important;
        }
        .barcode-sticker-card .sticker-code {
          font-size: 6pt !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          color: #000000 !important;
          margin: 0.3mm 0 !important;
        }
        .barcode-sticker-card .sticker-price {
          font-size: 7pt !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          color: #000000 !important;
          margin: 0.3mm 0 0 0 !important;
        }
      `;
    } else if (barcodeLayout === 'THERMAL_38_25') {
      pageRules = `
        @page {
          size: 38mm 25mm;
          margin: 0;
        }
      `;
      sheetRules = `
        .barcode-print-sheet {
          display: block !important;
          width: 38mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          border: none !important;
        }
      `;
      cardRules = `
        .barcode-sticker-card {
          width: 38mm !important;
          height: 25mm !important;
          min-height: 25mm !important;
          max-height: 25mm !important;
          padding: 0.6mm 1mm !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: always !important;
          break-after: page !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
        .barcode-sticker-card .sticker-store {
          font-size: 5.5pt !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          color: #000000 !important;
          margin: 0 0 0.2mm 0 !important;
        }
        .barcode-sticker-card .sticker-product {
          font-size: 6.5pt !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          color: #000000 !important;
          margin: 0 0 0.3mm 0 !important;
        }
        .barcode-sticker-card .sticker-barcode-svg {
          height: 8mm !important;
          max-height: 8mm !important;
          margin: 0.2mm 0 !important;
        }
        .barcode-sticker-card .sticker-code {
          font-size: 5.5pt !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          color: #000000 !important;
          margin: 0.2mm 0 !important;
        }
        .barcode-sticker-card .sticker-price {
          font-size: 6.5pt !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          color: #000000 !important;
          margin: 0.2mm 0 0 0 !important;
        }
      `;
    } else if (barcodeLayout === 'A4_40') {
      pageRules = `
        @page {
          size: A4 portrait;
          margin: 4mm 5mm;
        }
      `;
      sheetRules = `
        .barcode-print-sheet {
          display: grid !important;
          width: 100% !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 1.5mm 2mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
        }
      `;
      cardRules = `
        .barcode-sticker-card {
          height: 26mm !important;
          min-height: 26mm !important;
          max-height: 26mm !important;
          padding: 1mm 2mm !important;
          border: 1px dashed #cbd5e1 !important;
          border-radius: 4px !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
      `;
    } else {
      pageRules = `
        @page {
          size: A4 portrait;
          margin: 4mm 5mm;
        }
      `;
      sheetRules = `
        .barcode-print-sheet {
          display: grid !important;
          width: 100% !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 2mm 3mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
        }
      `;
      cardRules = `
        .barcode-sticker-card {
          height: 33mm !important;
          min-height: 33mm !important;
          max-height: 33mm !important;
          padding: 1.5mm 2.5mm !important;
          border: 1px dashed #cbd5e1 !important;
          border-radius: 4px !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
      `;
    }

    return `
      @media print {
        ${pageRules}
        html, body {
          background-color: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #root, #root > div, main {
          display: block !important;
          position: static !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        nav, header, aside, .print\\:hidden, #thermal-cash-tally-slip {
          display: none !important;
        }
        ${sheetRules}
        ${cardRules}
      }
    `;
  }, [printMode, barcodeLayout]);

  const tabs = [
    { id: 'BARCODE', label: 'Barcode Label Studio', icon: Barcode },
    { id: 'GST_CALC', label: 'GST & Profit Margin Calculator', icon: Calculator },
    { id: 'CASH_TALLY', label: 'Cash Drawer Denomination Tally', icon: Coins },
    { id: 'UNITS', label: 'Unit Multipliers & Factors', icon: Scale }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12 print:p-0 print:m-0 print:max-w-full">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs print:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Wrench size={18} className="text-emerald-600 shrink-0" />
              <span className="truncate">Extra Tools & Utilities</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">High-precision barcode sticker designer, day-end cash counter, GST margin analyzer, and unit conversions</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'BARCODE' && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={downloadingImage || !selectedItem}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Download single barcode label as high-resolution PNG image"
                >
                  <Download size={14} className={downloadingImage ? 'animate-bounce text-emerald-600' : 'text-slate-500'} />
                  <span className="whitespace-nowrap">{downloadingImage ? 'Downloading...' : 'Download as Image'}</span>
                </button>
                <button
                  onClick={handlePrintLabels}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Printer size={14} strokeWidth={2.5} />
                  <span className="whitespace-nowrap">Print Labels</span>
                </button>
              </>
            )}
            {activeTab === 'CASH_TALLY' && (
              <button
                onClick={handlePrintCashSlip}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Printer size={14} strokeWidth={2.5} />
                <span className="whitespace-nowrap">Print Cash Slip</span>
              </button>
            )}
            <button
              onClick={loadData}
              title="Reload Data"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto no-scrollbar print:hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'BARCODE' && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              
              <div className="lg:col-span-5">
                <label className="text-[10px] sm:text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">Select Catalog Product</label>
                <CustomSelect
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                  options={items.map(it => ({
                    value: it.id,
                    label: `${it.name} — Barcode: ${it.barcode || `HK-${it.id.toString().padStart(6, '0')}`} (₹${it.sale_price || it.mrp || 0})`
                  }))}
                  placeholder="Select Product"
                  searchable={true}
                />
              </div>

              <div className="lg:col-span-3">
                <label className="text-[10px] sm:text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">Code Format</label>
                <CustomSelect
                  value={codeType}
                  onChange={setCodeType}
                  options={[
                    { value: 'CODE128', label: 'Barcode (Code 128 - Linear)' },
                    { value: 'QR_CODE', label: 'QR Code (2D Matrix)' },
                    { value: 'CODE39', label: 'Barcode (Code 39 - Alphanumeric)' },
                    { value: 'EAN13', label: 'Barcode (EAN-13 / UPC)' }
                  ]}
                />
              </div>

              <div className="lg:col-span-3">
                <label className="text-[10px] sm:text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">Sheet Format</label>
                <CustomSelect
                  value={barcodeLayout}
                  onChange={(val) => {
                    setBarcodeLayout(val);
                    if (val === 'A4_24') setLabelQty(24);
                    else if (val === 'A4_40') setLabelQty(40);
                    else if (val === 'THERMAL_58MM') setLabelQty(1);
                    else setLabelQty(5);
                  }}
                  options={[
                    { value: 'THERMAL_58MM', label: 'Everycom EC-58 / 58mm Thermal Roll (Continuous / 48mm)' },
                    { value: 'THERMAL_80MM', label: 'POS Thermal — 80mm Continuous Paper' },
                    { value: 'THERMAL_50_25', label: 'Thermal Roll — 50×25mm (Standard 2×1 in)' },
                    { value: 'THERMAL_38_25', label: 'Thermal Roll — 38×25mm (Jewelry / Small)' },
                    { value: 'A4_24', label: 'A4 Sheet — 24 Labels (3×8 Grid)' },
                    { value: 'A4_40', label: 'A4 Sheet — 40 Labels (4×10 Grid)' }
                  ]}
                />
              </div>

              <div className="lg:col-span-1">
                <label className="text-[10px] sm:text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1 text-left sm:text-center">Qty</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={labelQty}
                  onChange={(e) => setLabelQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-center font-black font-mono focus:bg-white focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Include on Label</span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  { key: 'showStoreName', label: 'Company Header' },
                  { key: 'showProductName', label: 'Product Name' },
                  { key: 'showPrice', label: 'MRP / Price' },
                  { key: 'showBarcodeNumber', label: 'Barcode #' },
                  { key: 'showCategory', label: 'Category Tag' }
                ].map(opt => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                      barcodeOptions[opt.key]
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={barcodeOptions[opt.key]}
                      onChange={(e) => setBarcodeOptions({ ...barcodeOptions, [opt.key]: e.target.checked })}
                      className="w-3.5 h-3.5 text-emerald-600 rounded"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

      <style>{dynamicPrintStyle}</style>

      {selectedItem && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-xs print:p-0 print:border-none print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 print:hidden">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Vector Print Sheet Preview ({labelQty} Stickers)</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">High-contrast vector Code 128 barcodes compatible with optical scanners</p>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl w-fit">
              Format: {
                barcodeLayout === 'THERMAL_58MM' ? 'Everycom EC-58 (58mm Roll)' :
                barcodeLayout === 'THERMAL_80MM' ? 'POS 80mm Roll' :
                barcodeLayout === 'THERMAL_50_25' ? 'Thermal 50×25mm' :
                barcodeLayout === 'THERMAL_38_25' ? 'Thermal 38×25mm' :
                barcodeLayout === 'A4_24' ? 'A4 3×8' :
                barcodeLayout === 'A4_40' ? 'A4 4×10' :
                'Thermal 58mm'
              }
            </span>
          </div>

          <div className={`grid ${gridColsClass} gap-3 sm:gap-4 print:gap-2 barcode-print-sheet sheet-${barcodeLayout}`}>
            {Array.from({ length: labelQty }).map((_, idx) => (
              <div
                key={idx}
                ref={idx === 0 ? labelRef : undefined}
                className="border border-slate-300 rounded-2xl p-4 text-center bg-white shadow-2xs flex flex-col items-center justify-between min-h-[145px] hover:border-emerald-400 transition-colors barcode-sticker-card"
              >
                {barcodeOptions.showStoreName && (
                  <span className="text-xs sm:text-[13px] font-black text-slate-600 uppercase tracking-wider truncate w-full sticker-store leading-tight mb-2">
                    {company?.name || 'MC Electronics'}
                  </span>
                )}

                {barcodeOptions.showProductName && (
                  <span className="text-xs sm:text-[13px] font-black text-slate-900 line-clamp-1 w-full sticker-product leading-tight mb-0.5">
                    {selectedItem.name}
                  </span>
                )}

                <div className="w-full h-10 flex items-center justify-center sticker-barcode-svg px-2 my-1 overflow-hidden">
                  {codeType === 'QR_CODE' ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(selectedItem.barcode || `HK-${selectedItem.id.toString().padStart(6, '0')}`)}`}
                      alt="QR Code"
                      crossOrigin="anonymous"
                      className="w-12 h-12 sm:w-13 sm:h-13 object-contain mx-auto print:w-11 print:h-11"
                    />
                  ) : (
                    <BarcodeSvg
                      value={selectedItem.barcode || `HK-${selectedItem.id.toString().padStart(6, '0')}`}
                      type={codeType}
                      height={34}
                    />
                  )}
                </div>

                {barcodeOptions.showBarcodeNumber && (
                  <span className="text-[10px] font-mono font-bold text-slate-600 tracking-wider sticker-code leading-tight mt-0.5 mb-1">
                    {selectedItem.barcode || `HK-${selectedItem.id.toString().padStart(6, '0')}`}
                  </span>
                )}

                <div className="flex items-center justify-center gap-2 w-full pt-1.5 border-t border-slate-100 print:border-none print:mt-0 print:pt-0">
                  {barcodeOptions.showPrice && (
                    <div className="flex items-center justify-center gap-4 sm:gap-5 flex-wrap text-xs font-black text-slate-900 sticker-price">
                      {selectedItem.mrp ? (
                        <span>MRP: ₹{selectedItem.mrp}</span>
                      ) : null}
                      {selectedItem.sale_price && (Number(selectedItem.sale_price) !== Number(selectedItem.mrp) || !selectedItem.mrp) ? (
                        <span className="text-emerald-700 font-black">
                          Our Price: ₹{selectedItem.sale_price}
                        </span>
                      ) : null}
                      {!selectedItem.mrp && !selectedItem.sale_price && (
                        <span>MRP: ₹0</span>
                      )}
                    </div>
                  )}
                  {barcodeOptions.showCategory && selectedItem.category_name && (
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded print:hidden">
                      {selectedItem.category_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        </div>
      )}

      {activeTab === 'GST_CALC' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Percent size={14} />
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">GST Tax Calculator (Forward & Reverse)</h3>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setGstMode('FORWARD')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    gstMode === 'FORWARD' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Forward (+GST)
                </button>
                <button
                  type="button"
                  onClick={() => setGstMode('REVERSE')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    gstMode === 'REVERSE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Reverse (Extract)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {gstMode === 'FORWARD' ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Base Price (Tax Exclusive)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={calcBasePrice}
                      onChange={(e) => setCalcBasePrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Gross MRP / Bill Total</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={calcGrossPrice}
                      onChange={(e) => setCalcGrossPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Applicable GST Slab</label>
                <CustomSelect
                  value={calcGstRate}
                  onChange={(val) => setCalcGstRate(Number(val))}
                  options={[
                    { value: 0, label: '0% (Nil / Exempted)' },
                    { value: 3, label: '3% (Gold & Precious Metals)' },
                    { value: 5, label: '5% (Essential Goods)' },
                    { value: 12, label: '12% (Standard 1)' },
                    { value: 18, label: '18% (Standard GST Rate)' },
                    { value: 28, label: '28% (Sin / Luxury Goods)' }
                  ]}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              {gstMode === 'FORWARD' ? (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Base Taxable Amount:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{forwardGstCalculated.base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>CGST ({calcGstRate / 2}%):</span>
                    <span className="font-bold text-slate-900 font-mono">₹{forwardGstCalculated.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>SGST ({calcGstRate / 2}%):</span>
                    <span className="font-bold text-slate-900 font-mono">₹{forwardGstCalculated.sgst.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-900">Total Customer Price (MRP):</span>
                    <span className="text-base font-black text-emerald-600 font-mono">₹{forwardGstCalculated.total.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Extracted Base Price:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{reverseGstCalculated.base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>CGST Portion ({calcGstRate / 2}%):</span>
                    <span className="font-bold text-slate-900 font-mono">₹{reverseGstCalculated.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>SGST Portion ({calcGstRate / 2}%):</span>
                    <span className="font-bold text-slate-900 font-mono">₹{reverseGstCalculated.sgst.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-900">Total Tax Extracted:</span>
                    <span className="text-base font-black text-emerald-600 font-mono">₹{reverseGstCalculated.gstAmt.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <DollarSign size={14} />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Profit Margin & Markup Engine</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Purchase / Cost Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={marginCostPrice}
                    onChange={(e) => setMarginCostPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Profit Margin (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(e.target.value)}
                    className="w-full pl-3 pr-7 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Calculated Selling Price:</span>
                <span className="font-extrabold text-slate-900 font-mono text-sm">₹{marginCalculated.salePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Net Profit per Unit:</span>
                <span className="font-bold text-emerald-600 font-mono">₹{marginCalculated.profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Effective Cost Markup:</span>
                <span className="font-bold text-indigo-600 font-mono">{marginCalculated.markup.toFixed(1)}%</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                Selling at ₹{marginCalculated.salePrice.toFixed(0)} ensures an exact {marginPercent}% gross margin on total revenue.
              </p>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'CASH_TALLY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Coins size={14} />
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Physical Cash Drawer Counter</h3>
              </div>
              <button
                type="button"
                onClick={() => setDenominations({ 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 })}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Reset All Counts
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.keys(denominations).map(denom => {
                const count = denominations[denom];
                const subtotal = Number(denom) * (Number(count) || 0);
                return (
                  <div key={denom} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="w-16">
                      <span className="text-xs font-black text-slate-900">₹{denom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">x</span>
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setDenominations({ ...denominations, [denom]: val });
                        }}
                        className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-center outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-xs font-mono font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Day-End Cash Closing Summary
              </h3>

              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Drawer Cash</span>
                <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                  ₹{totalCashTally.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-400 font-medium pt-1 border-t border-slate-800 flex justify-between">
                  <span>Total Notes / Coins:</span>
                  <span className="font-bold text-white font-mono">{totalNotesCount} units</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block text-[11px]">Active Denominations Breakdown:</span>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {Object.entries(denominations)
                    .filter(([_, count]) => count > 0)
                    .map(([denom, count]) => (
                      <div key={denom} className="flex justify-between py-0.5 border-b border-slate-100">
                        <span>₹{denom} x {count}</span>
                        <span className="font-bold text-slate-900">₹{(Number(denom) * count).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  {totalNotesCount === 0 && (
                    <div className="text-slate-400 text-center py-4">No denomination counts entered.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePrintCashSlip}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>Print Thermal Slip (80mm)</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCashSummary}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-black active:scale-98 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Summary Copied to Clipboard!' : 'Copy Closing Note'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'UNITS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Add Unit Conversion Rule
            </h2>
            <form onSubmit={handleAddConversion} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Base / Master Unit (From)</label>
                <CustomSelect
                  value={fromUnitId}
                  onChange={setFromUnitId}
                  options={units.map(u => ({ value: u.id, label: `${u.name} (${u.short_name})` }))}
                  placeholder="Select Unit"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Conversion Factor Multiplier</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 12"
                  value={convRate}
                  onChange={(e) => setConvRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none text-center font-bold font-mono focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Example: 1 Box contains 12 Pcs</span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Child / Fractional Unit (To)</label>
                <CustomSelect
                  value={toUnitId}
                  onChange={setToUnitId}
                  options={units.map(u => ({ value: u.id, label: `${u.name} (${u.short_name})` }))}
                  placeholder="Select Unit"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Save Conversion Rule
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 space-y-4">
            
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <ArrowRightLeft size={14} className="text-emerald-600" /> Interactive Unit Multiplier Calculator
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    className="w-24 px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                  />
                  <CustomSelect
                    value={calcFromUnit}
                    onChange={setCalcFromUnit}
                    options={units.map(u => ({ value: u.id, label: `${u.name} (${u.short_name})` }))}
                    placeholder="Select Unit"
                    className="flex-1"
                  />
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Equates to:</span>
                  {convertedUnitValue ? (
                    <span className="text-sm font-black text-emerald-800 font-mono">
                      {convertedUnitValue.result} {convertedUnitValue.targetName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No rule defined for this unit</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Active Unit Conversion Registry
              </h2>
              {conversions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {conversions.map(c => (
                    <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          1 {c.from_name || 'Unit'} = {c.rate} {c.to_name || 'Units'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Multiplier: {c.rate}x</span>
                      </div>
                      <button
                        onClick={async () => {
                          await deleteUnitConversion(c.id);
                          loadData();
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No unit conversion rules created yet.</div>
              )}
            </div>

          </div>
        </div>
      )}

      {printMode === 'CASH_TALLY' && (
        <div id="thermal-cash-tally-slip" className="hidden print:block font-mono text-black bg-white">
          <div className="text-center pb-2 border-b border-black">
            <h2 className="text-sm font-black uppercase tracking-tight">{company?.name || 'MC Electronics'}</h2>
            {company?.address && <p className="text-[10px] leading-tight mt-0.5">{company.address}</p>}
            {company?.phone && <p className="text-[10px] mt-0.5">Ph: {company.phone}</p>}
            {company?.gst_number && <p className="text-[10px] font-bold mt-0.5">GSTIN: {company.gst_number}</p>}
          </div>

          <div className="py-2 text-center border-b border-black">
            <p className="text-xs font-black tracking-wider uppercase">Cash Drawer Closing Report</p>
            <div className="flex justify-between text-[10px] mt-1 px-1 font-semibold">
              <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
              <span>Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="py-2 border-b border-black">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dashed border-black text-[10px] uppercase font-bold">
                  <th className="text-left pb-1">Denom</th>
                  <th className="text-center pb-1">Count</th>
                  <th className="text-right pb-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-black/40">
                {Object.entries(denominations)
                  .filter(([_, count]) => count > 0)
                  .map(([denom, count]) => (
                    <tr key={denom} className="text-xs">
                      <td className="py-1 text-left font-bold">₹{denom}</td>
                      <td className="py-1 text-center font-medium">x {count}</td>
                      <td className="py-1 text-right font-black">₹{(Number(denom) * count).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {totalNotesCount === 0 && (
              <p className="text-center text-[10px] py-2 text-black/70">No denomination counts recorded.</p>
            )}
          </div>

          <div className="py-2 border-b-2 border-black space-y-1">
            <div className="flex justify-between text-xs font-black">
              <span>TOTAL DRAWER CASH:</span>
              <span className="text-sm">₹{totalCashTally.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Total Units Counted:</span>
              <span>{totalNotesCount} notes/coins</span>
            </div>
          </div>

          <div className="pt-6 pb-2 space-y-6 text-[10px]">
            <div className="flex justify-between">
              <div className="text-left">
                <p>____________________</p>
                <p className="font-bold mt-1">Cashier Signature</p>
              </div>
              <div className="text-right">
                <p>____________________</p>
                <p className="font-bold mt-1">Manager / Owner</p>
              </div>
            </div>
            <p className="text-center text-[9px] uppercase tracking-wider text-black/60 pt-1">
              Generated via HisabKhata POS
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
