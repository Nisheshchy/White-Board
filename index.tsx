import React, { useEffect, useRef, useState } from 'react';

type Tool = 'brush' | 'pen' | 'colorPen' | 'eraser';

const PRESET_COLORS: { name: string; value: string }[] = [
  { name: 'Black', value: '#111827' }, // gray-900
  { name: 'Blue', value: '#3b82f6' }, // blue-500
  { name: 'Red', value: '#ef4444' }, // red-500
  { name: 'Green', value: '#22c55e' }, // green-500
  { name: 'Yellow', value: '#eab308' }, // yellow-500
  { name: 'Purple', value: '#a855f7' }, // purple-500
  { name: 'Orange', value: '#f97316' }, // orange-500
  { name: 'Teal', value: '#14b8a6' }, // teal-500
  { name: 'Sky', value: '#0ea5e9' }, // sky-500
  { name: 'Pink', value: '#ec4899' }, // pink-500
];

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function IconBrush(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.5} {...props}>
      <path d='M3 21c1.5 0 3-.5 4-1.5S8 17 9.5 16l7.7-7.7a2.5 2.5 0 1 0-3.5-3.5L6 12.5C5 14 3.5 14.5 2.5 15.5S1 19.5 3 21z' />
    </svg>
  );
}

function IconPen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.5} {...props}>
      <path d='M16 3l5 5-9.5 9.5a4 4 0 0 1-1.9 1.1L6 20l.4-3.6a4 4 0 0 1 1.1-1.9L16 3z' />
      <path d='M15 4l5 5' />
    </svg>
  );
}

function IconPalettePen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.5} {...props}>
      <circle cx='7' cy='7' r='2' />
      <circle cx='12' cy='6' r='2' />
      <circle cx='17' cy='7' r='2' />
      <path d='M12 13l7-7 2 2-7 7-3 1 1-3z' />
    </svg>
  );
}

function IconEraser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.5} {...props}>
      <path d='M3 15l7-7a3 3 0 0 1 4.2 0l3.8 3.8a3 3 0 0 1 0 4.2L14 21H7l-4-4z' />
      <path d='M7 21l7-7' />
    </svg>
  );
}

export default function IndexPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const dprRef = useRef<number>(1);

  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState<string>(PRESET_COLORS[0].value);
  const [size, setSize] = useState<number>(8);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Resize canvas to match its CSS size and DPR, preserving content
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    const prevData = canvas.toDataURL();
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctxRef.current = ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before scaling
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    img.src = prevData;
  };

  // Initialize canvas context on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctxRef.current = ctx;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => resizeCanvas();
    resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recalculate canvas size when toggling fullscreen
  useEffect(() => {
    const id = window.requestAnimationFrame(() => resizeCanvas());
    return () => window.cancelAnimationFrame(id);
  }, [isExpanded]);

  // Prevent background scrolling when expanded
  useEffect(() => {
    if (!isExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isExpanded]);

  const getActiveColor = () => {
    if (tool === 'pen') return '#111827';
    return color;
  };

  const getActiveWidth = (pressure?: number) => {
    const base = size;
    if (tool === 'pen') return Math.max(1, Math.round(base * 0.5));
    if (tool === 'colorPen') return Math.max(1, Math.round(base * 0.75));
    if (tool === 'brush') {
      const p = pressure ?? 0.5;
      return Math.max(1, Math.round(base * (0.5 + p)));
    }
    if (tool === 'eraser') return Math.round(base * 1.25);
    return base;
  };

  const pointerToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    return { x, y };
  };

  const beginStroke = (x: number, y: number, e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = getActiveColor();
    ctx.lineWidth = getActiveWidth(e.pressure);
    ctx.globalAlpha = tool === 'brush' ? 0.95 : 1;

    if (tool === 'brush') {
      ctx.shadowBlur = 1;
      ctx.shadowColor = 'rgba(0,0,0,0.05)';
    } else {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawStroke = (x: number, y: number, e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (tool === 'brush') {
      ctx.lineWidth = getActiveWidth(e.pressure);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.closePath();
    ctx.globalCompositeOperation = 'source-over';
    // Release pointer capture if available
    if (e && canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const { x, y } = pointerToCanvas(e);
    isDrawingRef.current = true;
    beginStroke(x, y, e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = pointerToCanvas(e);
    drawStroke(x, y, e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    endStroke(e);
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const ToolButton: React.FC<{
    id: Tool;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }> = ({ id, label, Icon }) => {
    const active = tool === id;
    return (
      <button
        type='button'
        onClick={() => setTool(id)}
        aria-pressed={active}
        title={label}
        className={classNames(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
          active ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        )}
      >
        <Icon className='w-4 h-4' />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto p-4'>
        <header className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700'>
              <IconBrush className='w-5 h-5' />
            </div>
            <div>
              <h1 className='text-lg font-semibold text-gray-900'>Whiteboard</h1>
              <p className='text-xs text-gray-500'>Large canvas with fullscreen option</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button onClick={handleClear} className='px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50'>
              Clear
            </button>
            <button onClick={handleDownload} className='px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700'>
              Download
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className='px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50'
            >
              Fullscreen
            </button>
          </div>
        </header>

        <div className='flex flex-wrap items-center gap-3 mb-4'>
          <div className='flex items-center gap-2'>
            <ToolButton id='brush' label='Brush' Icon={IconBrush} />
            <ToolButton id='pen' label='Pen' Icon={IconPen} />
            <ToolButton id='colorPen' label='Color Pen' Icon={IconPalettePen} />
            <ToolButton id='eraser' label='Eraser' Icon={IconEraser} />
          </div>

          <div className='w-px h-8 bg-gray-200' />

          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>Color</span>
            <div className='flex items-center gap-2'>
              {PRESET_COLORS.map((c) => {
                const selected = color === c.value && tool !== 'pen';
                return (
                  <button
                    key={c.value}
                    type='button'
                    title={c.name}
                    onClick={() => setColor(c.value)}
                    className={classNames('w-6 h-6 rounded-full border', selected ? 'ring-2 ring-indigo-500' : '', 'border-gray-300')}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.name}
                  />
                );
              })}
            </div>
          </div>

          <div className='w-px h-8 bg-gray-200' />

          <div className='flex items-center gap-3'>
            <label className='text-sm text-gray-600' htmlFor='thickness'>Thickness</label>
            <input
              id='thickness'
              type='range'
              min={1}
              max={48}
              step={1}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10))}
              className='w-40'
            />
            <span className='text-sm text-gray-700 w-8 text-right'>{size}</span>
          </div>
        </div>

        {/* Whiteboard container: large by default (h-screen), fullscreen when expanded */}
        <div
          className={classNames(
            isExpanded
              ? 'fixed inset-0 z-50 bg-white flex flex-col'
              : 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden select-none'
          )}
        >
          <div className='px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between'>
            <span className='text-sm text-gray-600'>
              Tool: <span className='font-medium text-gray-900 capitalize'>{tool === 'colorPen' ? 'color pen' : tool}</span>
            </span>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-500 hidden sm:inline'>Tip: Use a stylus for pressure-sensitive strokes</span>
              {isExpanded && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className='px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50'
                >
                  Exit Fullscreen
                </button>
              )}
            </div>
          </div>

          <div className={classNames(isExpanded ? 'flex-1 relative' : 'relative')}>
            <canvas
              ref={canvasRef}
              className={classNames(
                isExpanded ? 'block w-full h-full bg-white touch-none cursor-crosshair' : 'block w-full h-[600px] bg-white touch-none',
                tool === 'eraser' ? 'cursor-pointer' : 'cursor-crosshair'
              )}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
