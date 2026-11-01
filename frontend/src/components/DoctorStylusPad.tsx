'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  Eraser, 
  RotateCcw, 
  Trash2, 
  Layers, 
  User, 
  FileText, 
  Check, 
  Maximize2,
  Sparkles
} from 'lucide-react';

interface DoctorStylusPadProps {
  initialDataUrl?: string | null;
  onChange: (dataUrl: string | null) => void;
  onConvertToText?: (dataUrl: string) => void;
  isConverting?: boolean;
  height?: number;
}

type TemplateType = 'lined' | 'anatomy' | 'blank';

export default function DoctorStylusPad({
  initialDataUrl,
  onChange,
  onConvertToText,
  isConverting = false,
  height = 260
}: DoctorStylusPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing Tools State
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState<string>('#1d4ed8'); // Classic Clinical Blue
  const [penSize, setPenSize] = useState<number>(2.5); // Fine medical pen
  const [template, setTemplate] = useState<TemplateType>('lined');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Last pointer coordinates
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Draw background template on canvas
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, h: number, t: TemplateType) => {
    // 1. Fill base white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, h);

    if (t === 'lined') {
      // Subtle Medical Ruled Lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const lineSpacing = 28;
      for (let y = lineSpacing; y < h; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(width - 10, y);
        ctx.stroke();
      }
      // Top Rx margin line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(35, h);
      ctx.stroke();

      // Subtle Rx watermark
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 36px serif';
      ctx.fillText('℞', 10, 32);
    } else if (t === 'anatomy') {
      // Draw subtle human body outline for clinical markings (Head, Torso, Limbs)
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.fillStyle = '#f8fafc';
      ctx.lineWidth = 1.5;

      const drawAnatomyFigure = (centerX: number, label: string) => {
        const topY = 25;
        // Head
        ctx.beginPath();
        ctx.arc(centerX, topY + 18, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Neck
        ctx.beginPath();
        ctx.moveTo(centerX - 4, topY + 32);
        ctx.lineTo(centerX + 4, topY + 32);
        ctx.lineTo(centerX + 4, topY + 40);
        ctx.lineTo(centerX - 4, topY + 40);
        ctx.closePath();
        ctx.stroke();

        // Torso / Chest / Abdomen
        ctx.beginPath();
        ctx.moveTo(centerX - 24, topY + 45); // Left shoulder
        ctx.lineTo(centerX + 24, topY + 45); // Right shoulder
        ctx.lineTo(centerX + 18, topY + 115); // Right hip
        ctx.lineTo(centerX - 18, topY + 115); // Left hip
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Arms
        // Left arm
        ctx.beginPath();
        ctx.moveTo(centerX - 24, topY + 45);
        ctx.lineTo(centerX - 35, topY + 105);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(centerX + 24, topY + 45);
        ctx.lineTo(centerX + 35, topY + 105);
        ctx.stroke();

        // Legs
        // Left leg
        ctx.beginPath();
        ctx.moveTo(centerX - 12, topY + 115);
        ctx.lineTo(centerX - 14, topY + 195);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(centerX + 12, topY + 115);
        ctx.lineTo(centerX + 14, topY + 195);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, centerX, h - 8);
      };

      const mid1 = width * 0.35;
      const mid2 = width * 0.65;
      drawAnatomyFigure(mid1, 'ANTERIOR (Front)');
      drawAnatomyFigure(mid2, 'POSTERIOR (Back)');

      ctx.restore();
    }
  }, []);

  // Initialize Canvas & Resize Observer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = rect.width || 600;
    const canvasHeight = height;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.scale(dpr, dpr);
      drawBackground(ctx, canvasWidth, canvasHeight, template);

      // Restore initial image if provided
      if (initialDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          setHasDrawn(true);
        };
        img.src = initialDataUrl;
      }
    }
  }, [height, drawBackground, template, initialDataUrl]);

  // Save current state to history stack for Undo
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), imgData]);
  }, []);

  // Undo last stroke
  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    ctx.putImageData(previous, 0, 0);

    // Notify change
    onChange(canvas.toDataURL('image/png'));
  }, [history, onChange]);

  // Clear entire drawing canvas
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    pushHistory();
    const rect = container.getBoundingClientRect();
    drawBackground(ctx, rect.width || 600, height, template);
    setHasDrawn(false);
    onChange(null);
  }, [height, template, pushHistory, drawBackground, onChange]);

  // Pointer Event Handlers (Supports Stylus Pen, Touch, and Mouse)
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    pushHistory();
    setIsDrawing(true);
    setHasDrawn(true);

    const coords = getCoordinates(e);
    lastPointRef.current = coords;

    // Dot on single tap
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, penSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : penColor;
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentPoint = getCoordinates(e);

    // Dynamic Pressure scaling if hardware stylus supports it
    let currentWidth = penSize;
    if (e.pressure && e.pressure > 0) {
      currentWidth = penSize * (0.5 + e.pressure);
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = penSize * 4;
    } else {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = currentWidth;
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = currentPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    lastPointRef.current = null;

    // Export current drawing
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  return (
    <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col select-none">
      {/* TOOLBAR CONTROLS */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Tools & Colors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pen Tool */}
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
              tool === 'pen' ? 'bg-white shadow text-teal-800' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Digital Stylus / Pen"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Pen</span>
          </button>

          {/* Eraser Tool */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
              tool === 'eraser' ? 'bg-white shadow text-rose-800' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Color Palette */}
          {tool === 'pen' && (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
              {[
                { name: 'Clinical Blue', color: '#1d4ed8' },
                { name: 'Medical Black', color: '#0f172a' },
                { name: 'Alert Red', color: '#dc2626' },
                { name: 'Green', color: '#16a34a' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setPenColor(c.color)}
                  style={{ backgroundColor: c.color }}
                  className={`w-5 h-5 rounded-full transition transform active:scale-90 flex items-center justify-center ${
                    penColor === c.color ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                >
                  {penColor === c.color && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          )}

          {/* Pen Width Selector */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
            <span className="text-[10px] text-slate-400">Width:</span>
            {[
              { label: 'Fine', size: 1.8 },
              { label: 'Med', size: 3.5 },
              { label: 'Bold', size: 6.0 },
            ].map((w) => (
              <button
                key={w.label}
                type="button"
                onClick={() => setPenSize(w.size)}
                className={`px-1.5 py-0.5 rounded transition ${
                  penSize === w.size ? 'bg-slate-200 text-slate-900 font-bold' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Medical Templates & Canvas Actions */}
        <div className="flex items-center gap-2">
          {/* Medical Templates Selector */}
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setTemplate('lined');
                handleClear();
              }}
              className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                template === 'lined' ? 'bg-teal-50 text-teal-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Prescription Pad Ruled Paper"
            >
              <FileText className="w-3 h-3" />
              <span>Rx Lines</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTemplate('anatomy');
                handleClear();
              }}
              className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                template === 'anatomy' ? 'bg-teal-50 text-teal-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Body Outline (Front & Back) for marking pain / dermatology / injuries"
            >
              <User className="w-3 h-3" />
              <span>Anatomy</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTemplate('blank');
                handleClear();
              }}
              className={`px-2 py-1 rounded transition ${
                template === 'blank' ? 'bg-teal-50 text-teal-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Blank White Canvas"
            >
              Blank
            </button>
          </div>

          {/* Convert to Text (AI OCR) */}
          {onConvertToText && (
            <button
              type="button"
              onClick={() => {
                if (canvasRef.current) {
                  onConvertToText(canvasRef.current.toDataURL('image/png'));
                }
              }}
              disabled={!hasDrawn || isConverting}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 disabled:opacity-40 transition flex items-center gap-1.5 text-[11px] font-bold shadow-sm"
              title="Convert handwriting on canvas to typed text"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isConverting ? 'animate-spin' : ''}`} />
              <span>{isConverting ? 'Converting...' : '✨ Convert to Text'}</span>
            </button>
          )}

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 transition"
            title="Undo stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 disabled:opacity-40 text-rose-600 transition flex items-center gap-1 text-[11px] font-bold"
            title="Clear Pad"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* CANVAS DRAWING WORKSPACE (Touch & Stylus Pen Enabled) */}
      <div 
        ref={containerRef} 
        className="relative bg-white cursor-crosshair overflow-hidden touch-none"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 block touch-none"
          style={{ touchAction: 'none' }}
        />

        {/* Small Touch Indicator Watermark */}
        <div className="absolute bottom-2 right-2.5 pointer-events-none text-[10px] font-semibold text-slate-400 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 shadow-xs flex items-center gap-1">
          <PenTool className="w-3 h-3 text-teal-600" />
          <span>Stylus Pen & Touch Ready</span>
        </div>
      </div>
    </div>
  );
}
