import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Paintbrush,
  PaintBucket,
  Pipette,
  Hand,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Box,
  Search,
  Check,
  Download,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  ChevronRight,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { ConvertedArt, GridSettings, MinecraftBlock, BlockCategory } from '../types';
import { drawBlockTexture, getBlockSwatchUrl, subscribeTextureLoaded } from '../utils/textureRenderer';
import { MINECRAFT_BLOCKS } from '../data/minecraftBlocks';

interface FullscreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  art: ConvertedArt | null;
  onPaintBlock: (x: number, y: number, newBlock: MinecraftBlock) => void;
  onReplaceBlock: (sourceBlockId: string, targetBlock: MinecraftBlock) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenExportModal: () => void;
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
}

export const FullscreenEditor: React.FC<FullscreenEditorProps> = ({
  isOpen,
  onClose,
  art,
  onPaintBlock,
  onReplaceBlock,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenExportModal,
  gridSettings,
  setGridSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Tool state
  const [tool, setTool] = useState<'pan' | 'pencil' | 'bucket' | 'eyedropper'>('pan');

  // Spacebar pan modifier
  const [isSpaceHeld, setIsSpaceHeld] = useState<boolean>(false);
  const isSpaceHeldRef = useRef<boolean>(false);

  // Selected Block from Sidebar
  const [selectedBlock, setSelectedBlock] = useState<MinecraftBlock>(() => {
    return art?.blockPalette[0] || MINECRAFT_BLOCKS[0];
  });

  // Sidebar Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMovedDrag, setHasMovedDrag] = useState<boolean>(false);

  // Continuous Painting
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const lastPaintedRef = useRef<{ x: number; y: number } | null>(null);

  // Hover Inspector State
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; block: MinecraftBlock } | null>(null);
  const [textureTick, setTextureTick] = useState<number>(0);

  // Quick Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Keep selected block valid if art changes
  useEffect(() => {
    if (art && art.blockPalette.length > 0) {
      if (!MINECRAFT_BLOCKS.some((b) => b.id === selectedBlock.id)) {
        setSelectedBlock(art.blockPalette[0]);
      }
    }
  }, [art]);

  // Re-render canvas when textures load
  useEffect(() => {
    return subscribeTextureLoaded(() => {
      setTextureTick((t) => t + 1);
    });
  }, []);

  // Fit and center canvas on open
  const fitToView = useCallback(() => {
    if (!containerRef.current || !art) return;
    const container = containerRef.current;
    const padding = 48;
    const availW = Math.max(100, container.clientWidth - padding);
    const availH = Math.max(100, container.clientHeight - padding);

    const baseBlockSize = 24;
    const nativeCanvasWidth = art.width * baseBlockSize;
    const nativeCanvasHeight = art.height * baseBlockSize;

    if (nativeCanvasWidth === 0 || nativeCanvasHeight === 0) return;

    const scaleW = availW / nativeCanvasWidth;
    const scaleH = availH / nativeCanvasHeight;
    const initialFitZoom = Math.min(scaleW, scaleH, 1.35);
    const clampedZoom = Math.max(0.15, Math.min(initialFitZoom, 4.0));

    setZoom(clampedZoom);
    setPan({ x: 0, y: 0 });
    zoomRef.current = clampedZoom;
    panRef.current = { x: 0, y: 0 };
  }, [art?.width, art?.height]);

  // Initial fit ONLY when the editor is first opened (never on subsequent art/block edits)
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasFittedRef.current = false;
      return;
    }
    if (isOpen && !hasFittedRef.current && art) {
      hasFittedRef.current = true;
      const raf = requestAnimationFrame(() => {
        fitToView();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, fitToView, art?.width, art?.height]);

  // Observe container dimensions for responsive full-width layout (only re-fit if not already customized)
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      // Re-center on major resize only if canvas was never panned
      if (Math.abs(panRef.current.x) < 2 && Math.abs(panRef.current.y) < 2 && zoomRef.current <= 1.5) {
        fitToView();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isOpen, fitToView]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        setIsSpaceHeld(true);
        isSpaceHeldRef.current = true;
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (tool !== 'pan') {
          setTool('pan');
          showToast('Move & Zoom mode active (Brush deselected)');
        } else {
          onClose();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo();
        } else {
          if (canUndo) onUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'm') {
        setTool('pan');
        showToast('Move & Zoom tool active');
      } else if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
        setTool('pencil');
        showToast(`Pencil: Paint with "${selectedBlock.name}"`);
      } else if (e.key.toLowerCase() === 'g' || e.key.toLowerCase() === 'f') {
        setTool('bucket');
        showToast('Color Bucket: Click any block to replace everywhere');
      } else if (e.key.toLowerCase() === 'i') {
        setTool('eyedropper');
        showToast('Eyedropper: Click any block on canvas to pick it');
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(10.0, z * 1.25));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.15, z * 0.8));
      } else if (e.key.toLowerCase() === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpaceHeld(false);
        isSpaceHeldRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, tool, canUndo, canRedo, onUndo, onRedo, onClose, selectedBlock.name, showToast]);

  // Cursor-anchored wheel zooming
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      const zoomFactor = Math.min(Math.max(1 - delta * 0.0018, 0.7), 1.4);
      const nextZoom = Math.max(0.15, Math.min(currentZoom * zoomFactor, 12.0));

      if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

      const rect = container.getBoundingClientRect();
      const mouseRelCenterX = e.clientX - (rect.left + rect.width / 2);
      const mouseRelCenterY = e.clientY - (rect.top + rect.height / 2);

      const scaleRatio = nextZoom / currentZoom;
      const nextPanX = mouseRelCenterX - (mouseRelCenterX - currentPan.x) * scaleRatio;
      const nextPanY = mouseRelCenterY - (mouseRelCenterY - currentPan.y) * scaleRatio;

      zoomRef.current = nextZoom;
      panRef.current = { x: nextPanX, y: nextPanY };

      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    };

    container.addEventListener('wheel', onWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', onWheelNative);
  }, [isOpen]);

  // Canvas drawing
  useEffect(() => {
    if (!isOpen || !art || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, grid, blockPalette } = art;
    const baseBlockSize = 24;

    canvas.width = width * baseBlockSize;
    canvas.height = height * baseBlockSize;

    // Background
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blocks
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const blockIdx = grid[y][x];
        const block = blockPalette[blockIdx];
        if (!block) continue;

        const posX = x * baseBlockSize;
        const posY = y * baseBlockSize;

        drawBlockTexture(ctx, block, posX, posY, baseBlockSize, gridSettings.renderMode || 'texture');
      }
    }

    // Grid lines
    if (gridSettings.showGrid) {
      ctx.save();
      const gridColorMap = {
        subtle: 'rgba(255, 255, 255, 0.18)',
        'high-contrast': 'rgba(255, 255, 255, 0.55)',
        dark: 'rgba(0, 0, 0, 0.5)',
        neon: 'rgba(52, 211, 153, 0.45)',
      };

      ctx.strokeStyle = gridColorMap[gridSettings.gridColor] || 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = x * baseBlockSize;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height * baseBlockSize);
      }
      for (let y = 0; y <= height; y++) {
        const py = y * baseBlockSize;
        ctx.moveTo(0, py);
        ctx.lineTo(width * baseBlockSize, py);
      }
      ctx.stroke();

      // Chunk lines (every 16 blocks)
      if (gridSettings.showChunkGrid && (width > 16 || height > 16)) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 16) {
          const px = x * baseBlockSize;
          ctx.moveTo(px, 0);
          ctx.lineTo(px, height * baseBlockSize);
        }
        for (let y = 0; y <= height; y += 16) {
          const py = y * baseBlockSize;
          ctx.moveTo(0, py);
          ctx.lineTo(width * baseBlockSize, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Hover box
    if (hoveredCell && hoveredCell.x < width && hoveredCell.y < height) {
      const hx = hoveredCell.x * baseBlockSize;
      const hy = hoveredCell.y * baseBlockSize;
      ctx.strokeStyle = tool === 'bucket' ? '#f59e0b' : tool === 'eyedropper' ? '#38bdf8' : '#4ade80';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(hx + 0.5, hy + 0.5, baseBlockSize - 1, baseBlockSize - 1);
    }
  }, [isOpen, art, gridSettings, hoveredCell, textureTick, tool]);

  // Coordinate conversion
  const getCellFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!art || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (clientX < 0 || clientY < 0 || clientX >= rect.width || clientY >= rect.height) {
      return null;
    }

    const x = Math.floor((clientX / rect.width) * art.width);
    const y = Math.floor((clientY / rect.height) * art.height);

    if (x >= 0 && x < art.width && y >= 0 && y < art.height) {
      const blockIdx = art.grid[y][x];
      const block = art.blockPalette[blockIdx];
      return { x, y, block };
    }
    return null;
  };

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (isDragging) {
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setHasMovedDrag(true);
      }
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (canvasRef.current) {
      const cell = getCellFromMouse(e as React.MouseEvent<HTMLCanvasElement>);
      setHoveredCell(cell);

      // Continuous painting in pencil mode
      if (isPainting && tool === 'pencil' && cell && onPaintBlock) {
        if (!lastPaintedRef.current || lastPaintedRef.current.x !== cell.x || lastPaintedRef.current.y !== cell.y) {
          lastPaintedRef.current = { x: cell.x, y: cell.y };
          onPaintBlock(cell.x, cell.y, selectedBlock);
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2 || tool === 'pan') {
      setIsDragging(true);
      setHasMovedDrag(false);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button === 0) {
      const cell = getCellFromMouse(e as React.MouseEvent<HTMLCanvasElement>);
      if (cell) {
        if (tool === 'pencil') {
          setIsPainting(true);
          lastPaintedRef.current = { x: cell.x, y: cell.y };
          onPaintBlock(cell.x, cell.y, selectedBlock);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPainting(false);
    lastPaintedRef.current = null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasMovedDrag) return;
    const cell = getCellFromMouse(e);
    if (!cell) return;

    if (tool === 'bucket') {
      // Replace ALL instances of this block across the art with selectedBlock
      const prevBlockName = cell.block.name;
      onReplaceBlock(cell.block.id, selectedBlock);
      showToast(`Replaced all "${prevBlockName}" with "${selectedBlock.name}"!`);
    } else if (tool === 'eyedropper') {
      // Sample block from canvas and set as active
      setSelectedBlock(cell.block);
      setTool('pencil');
      showToast(`Picked "${cell.block.name}" from canvas`);
    } else if (tool === 'pencil' && !isPainting) {
      onPaintBlock(cell.x, cell.y, selectedBlock);
    }
  };

  // Determine cursor based on active tool and drag state
  let viewportCursor = 'cursor-grab';
  if (isDragging) {
    viewportCursor = 'cursor-grabbing';
  } else if (isSpaceHeld || tool === 'pan') {
    viewportCursor = 'cursor-grab';
  } else if (tool === 'pencil') {
    viewportCursor = 'cursor-crosshair';
  } else if (tool === 'bucket') {
    viewportCursor = 'cursor-pointer';
  } else if (tool === 'eyedropper') {
    viewportCursor = 'cursor-crosshair';
  }
  const filteredBlocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return MINECRAFT_BLOCKS.filter((b) => {
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);

      if (activeCategory === 'all') return matchesSearch;
      if (activeCategory === 'used') {
        const count = art?.counts[b.id] || 0;
        return matchesSearch && count > 0;
      }
      return matchesSearch && b.category === activeCategory;
    });
  }, [searchQuery, activeCategory, art]);

  // Categories list with counts
  const categories: { id: string; label: string; icon?: string }[] = useMemo(() => [
    { id: 'all', label: 'All Blocks' },
    { id: 'used', label: `In This Art (${art ? Object.keys(art.counts).length : 0})` },
    { id: 'concrete', label: 'Concrete' },
    { id: 'wool', label: 'Wool' },
    { id: 'terracotta', label: 'Terracotta' },
    { id: 'wood', label: 'Wood & Planks' },
    { id: 'stone', label: 'Stone & Brick' },
    { id: 'deepslate', label: 'Deepslate & Black' },
    { id: 'glass', label: 'Glass & Glazed' },
    { id: 'minerals', label: 'Minerals & Ores' },
    { id: 'nature', label: 'Nature & Nether' },
  ], [art]);

  if (!isOpen || !art) return null;

  const activeBlockInArtCount = art.counts[selectedBlock.id] || 0;

  return (
    <div
      id="fullscreen-pixel-editor"
      className="fixed inset-0 z-50 bg-[#0c0c10] text-slate-200 flex flex-col overflow-hidden select-none animate-fadeIn"
    >
      {/* Top Header Bar */}
      <header className="bg-[#101017] border-b border-[#20202e] px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg flex-shrink-0 z-20">
        {/* Left: Back button & Art Metadata */}
        <div className="flex items-center space-x-3">
          <button
            id="editor-back-btn"
            onClick={onClose}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#181824] hover:bg-[#242436] text-slate-200 hover:text-white border border-[#2a2a3c] transition-all cursor-pointer shadow-sm text-xs font-semibold"
            title="Back to Studio (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to Studio</span>
            <span className="hidden sm:inline text-[10px] bg-[#0c0c12] text-slate-400 px-1.5 py-0.5 rounded border border-[#2a2a3c]">
              Esc
            </span>
          </button>

          <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-[#242436] text-xs">
            <span className="font-bold text-white tracking-wide">Minecraft Blueprint Editor</span>
            <span className="font-mono text-emerald-400 bg-[#14261c] px-2 py-0.5 rounded-md border border-emerald-500/30">
              {art.width}×{art.height}
            </span>
            <span className="text-slate-400">
              <strong className="text-slate-200">{art.totalBlocks.toLocaleString()}</strong> blocks
            </span>
          </div>
        </div>

        {/* Center: Tools (Pan, Paint, Replace Bucket, Eyedropper) + Undo / Redo */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Tool buttons */}
          <div className="flex items-center bg-[#181824] border border-[#262638] rounded-xl p-1 shadow-inner">
            {/* Pan / Move & Zoom tool */}
            <button
              id="editor-tool-pan"
              onClick={() => {
                setTool('pan');
                showToast('Move & Zoom Mode: Drag freely to pan or scroll to zoom');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tool === 'pan'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-md ring-1 ring-purple-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#202030]'
              }`}
              title="Move & Zoom / Pan Tool (Space / H / Esc): Click and drag anywhere to move canvas safely without painting"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Move & Zoom</span>
            </button>

            {/* Pencil / Paint 1x1 */}
            <button
              id="editor-tool-pencil"
              onClick={() => {
                setTool('pencil');
                showToast(`Paint Mode: Painting with "${selectedBlock.name}"`);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tool === 'pencil'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md ring-1 ring-emerald-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#202030]'
              }`}
              title="Paint 1×1 Block (B / P): Click or drag on canvas to paint with selected block"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paint 1×1</span>
            </button>

            {/* Bucket / Replace All Color */}
            <button
              id="editor-tool-bucket"
              onClick={() => {
                setTool('bucket');
                showToast('Color Bucket: Click any block to replace everywhere');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tool === 'bucket'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md ring-1 ring-amber-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#202030]'
              }`}
              title="Replace Color Bucket (G / F): Click any block on canvas to swap ALL matching blocks with the selected block"
            >
              <PaintBucket className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Replace Color</span>
            </button>

            {/* Eyedropper / Pick */}
            <button
              id="editor-tool-eyedropper"
              onClick={() => {
                setTool('eyedropper');
                showToast('Eyedropper: Click any block on canvas to sample it');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tool === 'eyedropper'
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 font-bold shadow-md ring-1 ring-sky-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#202030]'
              }`}
              title="Eyedropper (I): Click any block on canvas to select it in the right sidebar"
            >
              <Pipette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pick Block</span>
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center bg-[#181824] border border-[#262638] rounded-xl p-1">
            <button
              id="editor-undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              id="editor-redo-btn"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: View Toggles, Zoom, Download & Exit */}
        <div className="flex items-center space-x-2">
          {/* Textures / Flat toggle */}
          <button
            id="editor-toggle-textures"
            onClick={() =>
              setGridSettings((p) => ({
                ...p,
                renderMode: p.renderMode === 'flat' ? 'texture' : 'flat',
              }))
            }
            className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              gridSettings.renderMode !== 'flat'
                ? 'bg-[#14261c] border-emerald-500/50 text-[#4ade80]'
                : 'bg-[#181824] border-[#262638] text-slate-400 hover:text-white'
            }`}
            title="Toggle 16x16 authentic Minecraft textures"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{gridSettings.renderMode === 'flat' ? 'Flat' : '16×16 Textures'}</span>
          </button>

          {/* Grid toggle */}
          <button
            id="editor-toggle-grid"
            onClick={() => setGridSettings((p) => ({ ...p, showGrid: !p.showGrid }))}
            className={`hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              gridSettings.showGrid
                ? 'bg-[#14261c] border-emerald-500/50 text-[#4ade80]'
                : 'bg-[#181824] border-[#262638] text-slate-400 hover:text-white'
            }`}
            title="Toggle block grid"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          {/* 16x16 Chunk Grid toggle */}
          <button
            id="editor-toggle-chunk"
            onClick={() => setGridSettings((p) => ({ ...p, showChunkGrid: !p.showChunkGrid }))}
            className={`hidden xl:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              gridSettings.showChunkGrid
                ? 'bg-[#261e12] border-amber-500/60 text-amber-300'
                : 'bg-[#181824] border-[#262638] text-slate-400 hover:text-white'
            }`}
            title="Toggle 16×16 chunk & stack lines"
          >
            <span>16×16 Chunks</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-[#181824] border border-[#262638] rounded-xl p-0.5">
            <button
              onClick={() => {
                const next = Math.max(0.15, zoom * 0.8);
                zoomRef.current = next;
                setZoom(next);
              }}
              className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                const next = Math.min(10.0, zoom * 1.25);
                zoomRef.current = next;
                setZoom(next);
              }}
              className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                zoomRef.current = 1;
                panRef.current = { x: 0, y: 0 };
              }}
              className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer border-l border-[#262638]"
              title="Reset Zoom & Pan"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle sidebar button (Full Width Canvas mode toggle) */}
          <button
            id="editor-toggle-sidebar"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              setTimeout(fitToView, 50);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              sidebarOpen
                ? 'bg-[#181824] text-slate-300 hover:text-white border-[#28283c]'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold border-emerald-400 shadow-md'
            }`}
            title={sidebarOpen ? 'Collapse sidebar for 100% Full-Width Canvas' : 'Show Minecraft Block Library Sidebar'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{sidebarOpen ? 'Full Width' : 'Show Palette'}</span>
          </button>

          {/* Save & Return button */}
          <button
            id="editor-done-btn"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/60 transition-all cursor-pointer hover:scale-[1.02]"
            title="Done editing and save changes"
          >
            <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Done</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout: Center Canvas + Right Block Library Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toast alert banner */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#12121c]/95 border border-emerald-500/50 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 shadow-2xl flex items-center space-x-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Center / Left Viewport Canvas Area */}
        <div
          ref={containerRef}
          className={`flex-1 relative bg-[#07070a] overflow-hidden flex items-center justify-center select-none touch-none ${viewportCursor}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setIsPainting(false);
            lastPaintedRef.current = null;
            setHoveredCell(null);
          }}
        >
          {/* Transformed Canvas Container */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '50% 50%',
              willChange: 'transform',
            }}
          >
            <canvas
              ref={canvasRef}
              id="fullscreen-canvas"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onClick={handleCanvasClick}
              className="shadow-2xl rounded-sm border border-[#20202e]"
              style={{ imageRendering: 'pixelated', touchAction: 'none' }}
            />
          </div>

          {/* Floating Instructions / Active Tool Overlay Top-Left */}
          {tool === 'pan' ? (
            <div className="absolute top-4 left-4 bg-[#121218]/95 border border-purple-500/40 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl flex items-center space-x-3 z-10 max-w-md">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-purple-500/60 bg-[#1a142c] flex items-center justify-center flex-shrink-0 text-purple-300 shadow-inner">
                <Hand className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-purple-300">MOVE &amp; ZOOM MODE</span>
                  <span className="text-[9px] font-mono text-purple-400 bg-purple-950/70 px-1.5 py-0.2 rounded border border-purple-500/30">
                    SAFE
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Drag anywhere to pan &bull; Scroll to zoom (Painting disabled)
                </p>
              </div>
              <button
                id="overlay-start-paint-btn"
                onClick={() => {
                  setTool('pencil');
                  showToast(`Switched to Paint with "${selectedBlock.name}"`);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-[11px] transition-all cursor-pointer flex items-center space-x-1 flex-shrink-0 shadow-sm"
                title="Start painting with selected block (B)"
              >
                <Paintbrush className="w-3 h-3 text-slate-950" />
                <span>Paint (B)</span>
              </button>
            </div>
          ) : (
            <div className="absolute top-4 left-4 bg-[#121218]/95 border border-[#252538] backdrop-blur-md rounded-2xl p-2.5 shadow-2xl flex items-center space-x-3 z-10 max-w-md">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/50 bg-[#0c0c10] flex-shrink-0 relative shadow-inner">
                <img
                  src={getBlockSwatchUrl(selectedBlock)}
                  alt={selectedBlock.name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-white truncate">{selectedBlock.name}</span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-[#14261c] px-1.5 py-0.2 rounded border border-emerald-500/30">
                    {tool.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {tool === 'pencil' && 'Click or drag on blueprint to paint'}
                  {tool === 'bucket' && 'Click any block on blueprint to replace ALL occurrences'}
                  {tool === 'eyedropper' && 'Click any block on blueprint to sample it into brush'}
                </p>
              </div>
              <button
                id="overlay-deselect-brush-btn"
                onClick={() => {
                  setTool('pan');
                  showToast('Deselected brush — Move & Zoom mode active (Esc)');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#1c182c] hover:bg-[#26203c] text-purple-300 hover:text-purple-200 border border-purple-500/40 font-semibold text-[11px] transition-all cursor-pointer flex items-center space-x-1.5 flex-shrink-0 shadow-sm"
                title="Deselect block & switch to Move / Pan mode (Esc)"
              >
                <Hand className="w-3 h-3 text-purple-400" />
                <span>Deselect (Esc)</span>
              </button>
            </div>
          )}

          {/* Hover Inspector Pill Floating at Bottom Left */}
          {hoveredCell ? (
            <div className="absolute bottom-4 left-4 bg-[#121218]/95 border border-[#2a2a3e] backdrop-blur-md rounded-2xl p-3 shadow-2xl flex items-center space-x-3 pointer-events-none z-10 max-w-sm">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#2a2a3e] bg-[#0c0c10] flex-shrink-0 relative shadow-inner">
                <img
                  src={getBlockSwatchUrl(hoveredCell.block)}
                  alt={hoveredCell.block.name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-bold text-xs text-white leading-tight truncate">
                    {hoveredCell.block.name}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-[#14261c] px-1.5 py-0.2 rounded border border-emerald-500/30 flex-shrink-0">
                    {hoveredCell.block.category}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  X: <strong className="text-slate-200">{hoveredCell.x}</strong>, Y:{' '}
                  <strong className="text-slate-200">{hoveredCell.y}</strong> &bull; Total:{' '}
                  <strong className="text-[#4ade80]">{art.counts[hoveredCell.block.id] || 0}</strong>
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold truncate mt-0.5">
                  {tool === 'pencil' && `Click / drag to paint with ${selectedBlock.name}`}
                  {tool === 'bucket' && `Click to replace ALL ${hoveredCell.block.name} with ${selectedBlock.name}`}
                  {tool === 'eyedropper' && `Click to sample ${hoveredCell.block.name}`}
                  {tool === 'pan' && 'Drag to move canvas'}
                </p>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-4 left-4 bg-[#121218]/85 backdrop-blur-md border border-[#222232] rounded-xl px-3 py-1.5 text-[11px] text-slate-400 pointer-events-none flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span>Select any block from the right sidebar, then click on the canvas to paint or swap</span>
            </div>
          )}
        </div>

        {/* Right Sidebar: Comprehensive Minecraft Block Library Palette */}
        {sidebarOpen && (
          <aside
            id="editor-block-library-sidebar"
            className="w-80 sm:w-96 bg-[#0f0f15] border-l border-[#20202e] flex flex-col h-full shadow-2xl flex-shrink-0 z-10"
          >
            {/* Sidebar Header: Active Selected Block Banner */}
            <div className="p-4 bg-gradient-to-b from-[#14141f] to-[#0f0f15] border-b border-[#20202e]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Selected Brush Block</span>
                </span>
                {tool === 'pan' ? (
                  <span className="text-[10px] font-mono bg-purple-950/70 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                    Move Mode (Safe)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    Painting Active
                  </span>
                )}
              </div>

              {/* Big active block card */}
              <div
                className={`rounded-2xl p-3 shadow-lg transition-all border ${
                  tool === 'pan'
                    ? 'bg-[#141220] border-purple-500/40 ring-1 ring-purple-500/20'
                    : 'bg-[#181826] border-emerald-500/50 ring-2 ring-emerald-500/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#2c2c40] bg-[#0c0c10] flex-shrink-0 relative shadow-inner">
                    <img
                      src={getBlockSwatchUrl(selectedBlock)}
                      alt={selectedBlock.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-white truncate">{selectedBlock.name}</h4>
                    <p className="text-[10px] font-mono text-emerald-400 mt-0.5 truncate">{selectedBlock.commandName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-400">
                        In current art:{' '}
                        <strong className="text-white font-mono">{activeBlockInArtCount.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deselect / Move Mode Toggle Bar */}
                <div className="mt-3 pt-2.5 border-t border-[#252538] flex items-center justify-between gap-2">
                  {tool !== 'pan' ? (
                    <button
                      id="sidebar-deselect-block-btn"
                      onClick={() => {
                        setTool('pan');
                        showToast('Deselected brush — Move & Zoom mode active');
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#201a34] hover:bg-[#2c2448] text-purple-300 hover:text-purple-200 border border-purple-500/40 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                      title="Deselect block to zoom and move canvas safely without painting (Esc)"
                    >
                      <Hand className="w-3.5 h-3.5 text-purple-400" />
                      <span>Deselect (Move &amp; Zoom)</span>
                    </button>
                  ) : (
                    <button
                      id="sidebar-resume-paint-btn"
                      onClick={() => {
                        setTool('pencil');
                        showToast(`Paint mode: Ready with "${selectedBlock.name}"`);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                      title="Resume painting with this block (B)"
                    >
                      <Paintbrush className="w-3.5 h-3.5 text-slate-950" />
                      <span>Paint With This Block</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Used Palette in this Blueprint (horizontal chips) */}
            {art.blockPalette.length > 0 && (
              <div className="px-4 py-2.5 border-b border-[#20202e] bg-[#12121a]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Palette in this Blueprint</span>
                  <span className="text-[10px] text-slate-500">{art.blockPalette.length} colors</span>
                </div>
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {art.blockPalette.map((b) => {
                    const isSelected = selectedBlock.id === b.id && tool !== 'pan';
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          if (selectedBlock.id === b.id && tool !== 'pan') {
                            setTool('pan');
                            showToast('Deselected brush — Move & Zoom mode active');
                          } else {
                            setSelectedBlock(b);
                            setTool('pencil');
                            showToast(`Selected "${b.name}" (Paint Mode)`);
                          }
                        }}
                        className={`w-7 h-7 rounded-lg overflow-hidden border flex-shrink-0 transition-transform hover:scale-110 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-400 ring-2 ring-emerald-500 shadow-md'
                            : selectedBlock.id === b.id
                            ? 'border-purple-400 ring-1 ring-purple-500/60'
                            : 'border-[#28283c] hover:border-slate-400'
                        }`}
                        title={`${b.name} (${art.counts[b.id] || 0} in build) - Click to paint, click active to deselect`}
                      >
                        <img
                          src={getBlockSwatchUrl(b)}
                          alt={b.name}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search and Category Filter */}
            <div className="p-3 border-b border-[#20202e] space-y-2 bg-[#101017]">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 100+ Minecraft blocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0a0e] border border-[#28283c] rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-500 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                        : 'bg-[#181824] text-slate-400 hover:text-slate-200 hover:bg-[#202030] border border-[#242436]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocks Scrollable Grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-1">
                <span>Click any block to set as active brush</span>
                <span>{filteredBlocks.length} blocks</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {filteredBlocks.map((b) => {
                  const isSelected = selectedBlock.id === b.id && tool !== 'pan';
                  const inArtCount = art.counts[b.id] || 0;

                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        if (selectedBlock.id === b.id && tool !== 'pan') {
                          setTool('pan');
                          showToast('Deselected brush — Move & Zoom mode active');
                        } else {
                          setSelectedBlock(b);
                          setTool('pencil');
                          showToast(`Selected "${b.name}" (Paint Mode)`);
                        }
                      }}
                      className={`p-2 rounded-xl border flex items-center space-x-2.5 text-left transition-all cursor-pointer group relative ${
                        isSelected
                          ? 'bg-[#162a1e] border-emerald-400 shadow-md ring-1 ring-emerald-500'
                          : selectedBlock.id === b.id
                          ? 'bg-[#1e1a30] border-purple-400/80 ring-1 ring-purple-500/50'
                          : 'bg-[#14141e] border-[#222234] hover:border-slate-500 hover:bg-[#1a1a28]'
                      }`}
                      title={`${b.name} (${b.category}) - Click to paint with this, click active to deselect (Move mode)`}
                    >
                      {/* Texture Swatch */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#2c2c40] bg-[#0c0c10] flex-shrink-0 relative shadow-inner">
                        <img
                          src={getBlockSwatchUrl(b)}
                          alt={b.name}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>

                      {/* Block info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold truncate leading-tight ${
                            isSelected ? 'text-emerald-300 font-bold' : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {b.name}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-slate-500 font-mono capitalize">{b.category}</span>
                          {inArtCount > 0 && (
                            <span className="text-[9px] font-mono text-[#4ade80] bg-[#14261c] px-1 py-0.2 rounded border border-emerald-500/30">
                              ×{inArtCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Indicator Checkmark */}
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0" title="Active Brush">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : selectedBlock.id === b.id ? (
                        <div className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center flex-shrink-0 text-[9px] font-mono" title="Selected (Move Mode)">
                          ✋
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {filteredBlocks.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Box className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                  <p>No blocks found matching "{searchQuery}"</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="mt-2 text-emerald-400 hover:underline font-semibold"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar Bottom Footer Info */}
            <div className="p-3 bg-[#101018] border-t border-[#20202e] text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className="text-slate-500">Shortcuts:</span>
                <span className="font-mono text-slate-300">B</span> Paint &bull;
                <span className="font-mono text-slate-300">G</span> Replace &bull;
                <span className="font-mono text-slate-300">I</span> Pick
              </div>
              <button
                onClick={onOpenExportModal}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
