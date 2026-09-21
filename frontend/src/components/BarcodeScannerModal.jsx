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
          } catch (e) {
            console.warn('Native BarcodeDetector init failed, using ZXing:', e);
          }
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
      className="modal-overlay fixed inset-0 z-[11000] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 animate-fade-in select-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Continuous Scan Result Feedback Toast */}
      {lastScanResult && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[12000] animate-fade-in pointer-events-none">
          {lastScanResult.success ? (
            <div className="bg-emerald-600 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-black border border-emerald-400/80 backdrop-blur-md">
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
            <div className="bg-rose-600 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black border border-rose-400/80 backdrop-blur-md">
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

      {/* Main Modal Panel: Bottom-sheet on mobile, centered card on desktop */}
      <div className="modal-panel w-full sm:max-w-md bg-white text-slate-800 border border-slate-200/80 shadow-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up sm:animate-fade-in flex flex-col max-h-[92vh]">
        {/* Mobile Pull Bar Indicator */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 shadow-xs">
              <ScanLine size={18} strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {title}
                </h3>
                {continuous && cartLength > 0 && (
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    {cartLength} in Cart
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
            title="Close"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto">
          {/* Camera Viewport with Floating Controls */}
          <div className="relative w-full aspect-[4/3] sm:aspect-16/10 max-h-[40vh] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner border border-slate-900">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Floating Camera Controls (Torch & Zoom) on Top-Right of Viewfinder */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-md flex items-center gap-1 transition-all cursor-pointer ${
                    torchOn
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-amber-500/30'
                      : 'bg-slate-900/75 text-white border-white/20 hover:bg-slate-900/90'
                  }`}
                >
                  {torchOn ? <Zap size={13} className="fill-slate-950" /> : <ZapOff size={13} />}
                  <span>Flash</span>
                </button>
              )}

              {hasZoom && (
                <button
                  type="button"
                  onClick={handleToggleZoom}
                  title={`Zoom: ${zoomLevel}x`}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-md flex items-center gap-1 transition-all cursor-pointer ${
                    zoomLevel > 1
                      ? 'bg-emerald-500 text-white border-emerald-300 font-extrabold shadow-emerald-500/30'
                      : 'bg-slate-900/75 text-white border-white/20 hover:bg-slate-900/90'
                  }`}
                >
                  {zoomLevel > 1 ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
                  <span>{zoomLevel}x</span>
                </button>
              )}
            </div>

            {/* Viewfinder Target Framing */}
            <div className="absolute inset-0 m-4 sm:m-6 pointer-events-none flex flex-col justify-between p-1">
              <div className="flex justify-between">
                <div className="w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg shadow-[0_0_8px_#34d399]" />
                <div className="w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg shadow-[0_0_8px_#34d399]" />
              </div>

              {/* Glowing Laser Scanline */}
              <div className="relative w-full flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
                <span className="absolute text-[9px] font-extrabold text-emerald-300 bg-slate-950/70 px-2 py-0.5 rounded-full backdrop-blur-xs tracking-wider uppercase border border-emerald-400/30 shadow-xs">
                  Align Barcode
                </span>
              </div>

              <div className="flex justify-between">
                <div className="w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg shadow-[0_0_8px_#34d399]" />
                <div className="w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-lg shadow-[0_0_8px_#34d399]" />
              </div>
            </div>

            {/* Error Message if camera failed */}
            {error && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-30">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20 mb-2">
                  <Camera size={22} />
                </div>
                <p className="text-xs font-bold text-white mb-1">Camera Not Available</p>
                <p className="text-[11px] text-slate-400 max-w-[240px] mb-2.5">{error}</p>
                <p className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-500/20">
                  Type barcode number below
                </p>
              </div>
            )}
          </div>

          {/* Clean Scanner Status */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-slate-600 text-[11px]">Ready • Point at barcode</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Auto-Detect
            </span>
          </div>

          {/* Manual Barcode Input Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white text-slate-900 transition-colors shadow-2xs"
                placeholder="Type barcode manually..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
            >
              Use
            </button>
          </form>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {continuous ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} strokeWidth={2.8} />
                <span>Done Scanning {cartLength > 0 ? `(${cartLength} in Cart)` : ''}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 text-center">
              <Info size={11} className="text-slate-400 shrink-0" />
              <span>USB & Bluetooth handheld scanners work automatically</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return targetNode ? createPortal(modalContent, targetNode) : modalContent;
}
