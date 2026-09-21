import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ScanLine,
  X,
  Camera,
  AlertCircle,
  Check,
  Zap,
  ZapOff,
  ZoomIn,
  ZoomOut,
  Keyboard,
  Info
} from 'lucide-react';
import {
  MultiFormatReader,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  DecodeHintType,
  BarcodeFormat
} from '@zxing/library';

// Web Audio API Beep on successful scan
// Fix @zxing/library bundler bug where "ex instanceof ReaderException" evaluates to false
// across ESM chunks in Vite, causing NotFoundExceptions to flood the console with warnings.
if (typeof MultiFormatReader !== 'undefined' && MultiFormatReader.prototype?.decodeInternal) {
  MultiFormatReader.prototype.decodeInternal = function (image) {
    if (!this.readers) return null;
    for (const reader of this.readers) {
      try {
        const res = reader.decode(image, this.hints);
        if (res) return res;
      } catch {
        continue;
      }
    }
    return null;
  };
}

function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

function triggerHaptic() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }
  } catch {}
}

export default function BarcodeScannerModal({
  onClose,
  onDetected,
  continuous = false,
  cartLength = 0,
  title = 'Scan Product Barcode',
  subtitle = 'Align barcode inside the camera frame',
  container = null
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const lastScannedTimeRef = useRef({});

  const [targetNode, setTargetNode] = useState(() => (
    container ||
    (typeof document !== 'undefined'
      ? (document.fullscreenElement || document.webkitFullscreenElement || document.body)
      : null)
  ));

  useEffect(() => {
    if (container) {
      setTargetNode(container);
      return;
    }
    const handleFs = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement || document.body;
      setTargetNode(el);
    };
    document.addEventListener('fullscreenchange', handleFs);
    document.addEventListener('webkitfullscreenchange', handleFs);
    return () => {
      document.removeEventListener('fullscreenchange', handleFs);
      document.removeEventListener('webkitfullscreenchange', handleFs);
    };
  }, [container]);

  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [engineInfo, setEngineInfo] = useState('Initializing scanner…');

  const handleScanSuccess = (rawCode) => {
    if (!rawCode) return;
    const code = String(rawCode).trim();
    if (!code) return;

    const now = Date.now();
    const lastTime = lastScannedTimeRef.current[code] || 0;

    // Debounce duplicate scans within 1500ms
    if (now - lastTime < 1500) {
      return;
    }
    lastScannedTimeRef.current[code] = now;

    // Sound & Haptic Feedback
    playScanBeep();
    triggerHaptic();

    if (continuous) {
      const res = onDetected ? onDetected(code) : null;
      if (res) {
        setLastScanResult(res);
        setTimeout(() => setLastScanResult(null), 2500);
      }
    } else {
      if (onDetected) {
        onDetected(code);
      }
      onClose();
    }
  };

  useEffect(() => {
    let active = true;
    let barcodeDetector = null;
    let zxingReader = null;

    // Initialize ZXing MultiFormatReader
    try {
      zxingReader = new MultiFormatReader();
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.ITF,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE
      ]);
      zxingReader.setHints(hints);
    } catch (err) {
      console.warn('ZXing init error:', err);
    }

    async function setupCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported on this device/browser');
        }

        // Request high resolution with continuous autofocus
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            advanced: [{ focusMode: 'continuous' }]
          }
        };

        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // Fallback if strict constraints fail on older devices
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        }

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];

        // Check camera hardware capabilities (torch, zoom)
        if (videoTrack?.getCapabilities) {
          try {
            const caps = videoTrack.getCapabilities();
            if (caps.torch) setHasTorch(true);
            if (caps.zoom) {
              setHasZoom(true);
              setMaxZoom(caps.zoom.max || 3);
            }
          } catch {}
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Initialize Native BarcodeDetector if available
        const ALL_NATIVE_FORMATS = [
          'itf',
          'code_128',
          'code_39',
          'code_93',
          'codabar',
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'qr_code',
          'data_matrix',
          'aztec',
          'pdf417'
        ];

        let hasNativeDetector = false;
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            let formatsToUse = ALL_NATIVE_FORMATS;
            if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
              const supported = await window.BarcodeDetector.getSupportedFormats();
              formatsToUse = ALL_NATIVE_FORMATS.filter(f => supported.includes(f));
            }
            barcodeDetector = new window.BarcodeDetector({ formats: formatsToUse });
            hasNativeDetector = true;
            setEngineInfo(`Engine: Native MLKit (${formatsToUse.length} formats, ITF included)`);
          } catch (e) {
            console.warn('Native BarcodeDetector init failed, using ZXing:', e);
          }
        }

        if (!hasNativeDetector) {
          setEngineInfo('Engine: Universal ZXing Reader (ITF, Code 128, EAN, 2 of 5)');
        }

        // Scan interval loop
        let isProcessing = false;
        intervalRef.current = setInterval(async () => {
          if (!active || isProcessing) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) return;

          isProcessing = true;
          try {
            let detected = false;

            // 1. Try Native BarcodeDetector
            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes && barcodes.length > 0) {
                  const raw = barcodes[0].rawValue;
                  if (raw && active) {
                    detected = true;
                    handleScanSuccess(raw);
                  }
                }
              } catch {}
            }

            // 2. Fallback/Augment with ZXing if not detected
            if (!detected && zxingReader && canvasRef.current) {
              try {
                const canvas = canvasRef.current;
                const vWidth = video.videoWidth;
                const vHeight = video.videoHeight;

                // Center crop (viewfinder region where user holds barcode)
                // This maximizes effective resolution for small 1D barcodes
                const cropWidth = Math.floor(vWidth * 0.75);
                const cropHeight = Math.floor(vHeight * 0.45);
                const cropX = Math.floor((vWidth - cropWidth) / 2);
                const cropY = Math.floor((vHeight - cropHeight) / 2);

                canvas.width = cropWidth;
                canvas.height = cropHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(
                    video,
                    cropX, cropY, cropWidth, cropHeight,
                    0, 0, cropWidth, cropHeight
                  );

                  const imgData = ctx.getImageData(0, 0, cropWidth, cropHeight);
                  const lumSource = new RGBLuminanceSource(
                    new Uint8ClampedArray(imgData.data.buffer),
                    cropWidth,
                    cropHeight
                  );

                  // Try GlobalHistogramBinarizer first (superior on 1D barcodes with faint/thin lines)
                  let bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(lumSource));
                  let result = null;
                  try {
                    result = zxingReader.decode(bitmap);
                  } catch {}

                  // Fallback to HybridBinarizer if not found
                  if (!result) {
                    try {
                      bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
                      result = zxingReader.decode(bitmap);
                    } catch {}
                  }

                  if (result && result.getText && result.getText() && active) {
                    detected = true;
                    handleScanSuccess(result.getText());
                  }
                }
              } catch {}
            }
          } finally {
            isProcessing = false;
          }
        }, 220);

      } catch (err) {
        if (active) setError(err.message || 'Unable to access camera');
      }
    }

    setupCamera();

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [continuous, onDetected]);

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // Toggle Zoom Level
  const handleToggleZoom = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && hasZoom) {
      try {
        const nextZoom = zoomLevel === 1 ? Math.min(maxZoom, 2.0) : 1.0;
        await track.applyConstraints({ advanced: [{ zoom: nextZoom }] });
        setZoomLevel(nextZoom);
      } catch (err) {
        console.warn('Zoom toggle failed:', err);
      }
    }
  };

  // Handle Manual Input Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
      setManualCode('');
    }
  };

  const modalContent = (
    <div
      className="modal-overlay p-2 sm:p-4 fixed inset-0 z-[11000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Continuous Scan Result Feedback Toast */}
      {lastScanResult && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[12000] animate-fade-in pointer-events-none">
          {lastScanResult.success ? (
            <div className="bg-emerald-600 text-white px-3.5 py-2 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-black border border-emerald-400/80 backdrop-blur-md">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check size={13} strokeWidth={3} className="text-white" />
                </div>
                <span className="truncate">
                  Added: {lastScanResult.item?.name || lastScanResult.name || 'Item'}
                </span>
              </div>
              <span className="shrink-0 bg-white/25 px-2 py-0.5 rounded-full text-[10px] font-bold ml-2">
                +1 in Cart
              </span>
            </div>
          ) : (
            <div className="bg-rose-600 text-white px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black border border-rose-400/80 backdrop-blur-md">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <AlertCircle size={13} strokeWidth={3} className="text-white" />
              </div>
              <span className="truncate">
                No product found for "{lastScanResult.code}"
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Modal Panel */}
      <div className="modal-panel max-w-md w-full bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fade-in flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 shadow-xs">
              <ScanLine size={17} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                  {title}
                </h3>
                {continuous && cartLength > 0 && (
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    Cart: {cartLength}
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Flashlight button if supported */}
            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  torchOn
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {torchOn ? <Zap size={15} /> : <ZapOff size={15} />}
              </button>
            )}

            {/* Zoom button if supported */}
            {hasZoom && (
              <button
                type="button"
                onClick={handleToggleZoom}
                title={`Zoom: ${zoomLevel}x`}
                className={`p-1.5 rounded-lg border text-[11px] font-black transition-colors cursor-pointer flex items-center gap-0.5 ${
                  zoomLevel > 1
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {zoomLevel > 1 ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                <span>{zoomLevel}x</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 overflow-y-auto">
          {/* Camera Viewport */}
          <div className="relative w-full aspect-16/10 sm:aspect-4/3 max-h-[34vh] sm:max-h-[38vh] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Viewfinder Target Framing */}
            <div className="absolute inset-0 border-2 border-emerald-500/70 m-3 sm:m-6 rounded-xl pointer-events-none flex flex-col justify-between p-1.5 sm:p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              </div>
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>

            {/* Error Message if camera failed */}
            {error && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-3 text-center z-10">
                <Camera size={26} className="text-rose-400 mb-1.5" />
                <p className="text-xs font-bold text-white mb-0.5">Camera Not Available</p>
                <p className="text-[10px] text-slate-300 max-w-[240px] mb-2">{error}</p>
                <p className="text-[9px] text-emerald-400 font-semibold">
                  You can type the barcode manually below
                </p>
              </div>
            )}
          </div>

          {/* Symbology Info Note */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="truncate">{engineInfo}</span>
            <span className="font-semibold text-emerald-600 shrink-0">Auto-Detect</span>
          </div>

          {/* Manual Barcode Input Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              <Keyboard size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white text-slate-900 transition-colors"
                placeholder="Or type barcode (e.g. 7000000491)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Use
            </button>
          </form>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Info size={11} className="text-slate-400" />
              USB / Bluetooth scanners can scan directly
            </span>
            <button
              type="button"
              onClick={onClose}
              className="font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              {continuous ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return targetNode ? createPortal(modalContent, targetNode) : modalContent;
}
