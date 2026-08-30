import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  CheckCircle,
  Layers,
  Download,
  Info,
  Box,
  Edit3,
  Paintbrush,
  PaintBucket,
  Pipette,
  Undo2,
  Redo2,
  RefreshCw,
  X,
  ChevronDown,
  Search,
  Hand,
} from 'lucide-react';
import { ConvertedArt, GridSettings, MinecraftBlock } from '../types';
import { drawBlockTexture, getBlockSwatchUrl, subscribeTextureLoaded } from '../utils/textureRenderer';
import { MINECRAFT_BLOCKS } from '../data/minecraftBlocks';

interface PixelArtCanvasProps {
  art: ConvertedArt | null;
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
  highlightBlockId: string | null;
  setHighlightBlockId: (id: string | null) => void;
  onBlockMarkToggle?: (x: number, y: number) => void;
  isolatedLayer: number | null; // If not null, only show this row/layer
  setIsolatedLayer: (layer: number | null) => void;
  onOpenCommands: () => void;
  onOpenLayerGuide: () => void;
  onDownloadHd: () => void;
  onQuickDownload?: () => void;
  onOpenBlockReplacer?: (sourceBlockId?: string | null) => void;
  onOpenFullscreenEditor?: () => void;
  onReplaceBlock?: (sourceBlockId: string, targetBlock: MinecraftBlock) => void;
  onPaintBlock?: (x: number, y: number, newBlock: MinecraftBlock) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const PixelArtCanvas: React.FC<PixelArtCanvasProps> = ({
  art,
  gridSettings,
  setGridSettings,
  highlightBlockId,
  setHighlightBlockId,
  onBlockMarkToggle,
  isolatedLayer,
  setIsolatedLayer,
  onOpenCommands,
  onOpenLayerGuide,
  onDownloadHd,
  onQuickDownload,
  onOpenBlockReplacer,
  onOpenFullscreenEditor,
  onReplaceBlock,
  onPaintBlock,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMovedDrag, setHasMovedDrag] = useState(false);

  // Edit / Replace mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editTool, setEditTool] = useState<'pencil' | 'bucket' | 'eyedropper' | 'pan'>('pencil');
  const [activeBrushBlock, setActiveBrushBlock] = useState<MinecraftBlock>(
    () => art?.blockPalette[0] || MINECRAFT_BLOCKS[0]
  );
  const [showBlockPicker, setShowBlockPicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const lastPaintedRef = useRef<{ x: number; y: number } | null>(null);

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Keep active brush synced if art palette updates
  useEffect(() => {
    if (art && art.blockPalette.length > 0) {
      if (!MINECRAFT_BLOCKS.some((b) => b.id === activeBrushBlock.id)) {
        setActiveBrushBlock(art.blockPalette[0]);
      }
    }
  }, [art]);

  // Touch state for mobile panning and tapping
  const touchStartRef = useRef<{ x: number; y: number; time: number; moved: boolean } | null>(null);

  // Hover state
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; block: MinecraftBlock } | null>(
    null
  );
  const [builderMode, setBuilderMode] = useState<boolean>(false); // In builder mode, clicking marks block as placed
  const [textureTick, setTextureTick] = useState<number>(0);

  // Subscribe to block texture loading events to refresh canvas once textures are ready
  useEffect(() => {
    return subscribeTextureLoaded(() => {
      setTextureTick((t) => t + 1);
    });
  }, []);

  // Keyboard shortcut listener for Undo / Redo / Tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo && onRedo) onRedo();
        } else {
          if (canUndo && onUndo) onUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo && onRedo) onRedo();
        return;
      }

      if (e.key === 'Escape') {
        if (highlightBlockId) {
          setHighlightBlockId(null);
        }
        if (isEditMode && editTool !== 'pan') {
          setEditTool('pan');
        }
        setShowBlockPicker(false);
        return;
      }

      if (isEditMode) {
        if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
          setEditTool('pencil');
        } else if (e.key.toLowerCase() === 'g' || e.key.toLowerCase() === 'f') {
          setEditTool('bucket');
        } else if (e.key.toLowerCase() === 'i') {
          setEditTool('eyedropper');
        } else if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'v' || e.key === ' ') {
          setEditTool('pan');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo, isEditMode]);

  // Attach non-passive native wheel listener to reliably zoom directly centered on where the cursor is hovered
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      // Smooth zoom factor calculation
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      const zoomFactor = Math.min(Math.max(1 - delta * 0.0018, 0.7), 1.4);
      const nextZoom = Math.max(0.2, Math.min(currentZoom * zoomFactor, 12.0));

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

    return () => {
      container.removeEventListener('wheel', onWheelNative);
    };
  }, [art]);

  // Reset or fit zoom when new art dimensions are loaded
  const lastFittedDimsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!art || !containerRef.current) return;
    const dimsKey = `${art.width}x${art.height}`;
    if (lastFittedDimsRef.current === dimsKey) return;
    lastFittedDimsRef.current = dimsKey;

    const container = containerRef.current;
    const padding = 40;
    const availW = container.clientWidth - padding;
    const availH = container.clientHeight - padding;

    const baseBlockSize = 20;
    const nativeCanvasWidth = art.width * baseBlockSize;
    const nativeCanvasHeight = art.height * baseBlockSize;

    const scaleW = availW / nativeCanvasWidth;
    const scaleH = availH / nativeCanvasHeight;
    const initialFitZoom = Math.min(scaleW, scaleH, 1.2);
    const clampedZoom = Math.max(0.25, Math.min(initialFitZoom, 3.0));

    setZoom(clampedZoom);
    setPan({ x: 0, y: 0 });
    zoomRef.current = clampedZoom;
    panRef.current = { x: 0, y: 0 };
  }, [art?.width, art?.height]);

  // Render canvas buffer with textures, grids, chunk borders and highlights
  useEffect(() => {
    if (!art || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, grid, blockPalette, placedState } = art;
    const baseBlockSize = 20;

    canvas.width = width * baseBlockSize;
    canvas.height = height * baseBlockSize;

    // Background fill
    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      const isTargetLayer = isolatedLayer === null || isolatedLayer === y;
      const isPreviousLayer = isolatedLayer !== null && y < isolatedLayer;

      if (isolatedLayer !== null && y > isolatedLayer) {
        continue;
      }

      for (let x = 0; x < width; x++) {
        const blockIdx = grid[y][x];
        const block = blockPalette[blockIdx];
        if (!block) continue;

        const posX = x * baseBlockSize;
        const posY = y * baseBlockSize;

        let alpha = 1.0;

        if (highlightBlockId) {
          if (block.id !== highlightBlockId) {
            alpha = 0.18;
          }
        }

        if (isPreviousLayer) {
          alpha *= 0.3; // ghost previous layer
        }

        ctx.globalAlpha = alpha;
        drawBlockTexture(ctx, block, posX, posY, baseBlockSize, gridSettings.renderMode || 'texture');

        // If placed in builder mode, draw check overlay
        if (placedState && placedState[y]?.[x]) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.fillRect(posX, posY, baseBlockSize, baseBlockSize);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold 11px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', posX + baseBlockSize / 2, posY + baseBlockSize / 2);
        }
      }
    }

    ctx.globalAlpha = 1.0;

    // Grid Overlay
    if (gridSettings.showGrid) {
      ctx.save();
      const gridColorMap = {
        subtle: 'rgba(255, 255, 255, 0.18)',
        'high-contrast': 'rgba(255, 255, 255, 0.5)',
        dark: 'rgba(0, 0, 0, 0.45)',
        neon: 'rgba(52, 211, 153, 0.45)',
      };

      ctx.strokeStyle = gridColorMap[gridSettings.gridColor] || 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      // Vertical grid lines
      for (let x = 0; x <= width; x++) {
        const px = x * baseBlockSize;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height * baseBlockSize);
      }
      // Horizontal grid lines
      for (let y = 0; y <= height; y++) {
        const py = y * baseBlockSize;
        ctx.moveTo(0, py);
        ctx.lineTo(width * baseBlockSize, py);
      }
      ctx.stroke();

      // Chunk / Stack boundaries (every 16 blocks)
      if (gridSettings.showChunkGrid && (width > 16 || height > 16)) {
        ctx.strokeStyle = '#f59e0b'; // Amber chunky line
        ctx.lineWidth = 2;
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

    // Draw active hover highlight box
    if (hoveredCell && hoveredCell.x < width && hoveredCell.y < height) {
      const hx = hoveredCell.x * baseBlockSize;
      const hy = hoveredCell.y * baseBlockSize;
      ctx.strokeStyle = isEditMode ? '#4ade80' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 0.5, hy + 0.5, baseBlockSize - 1, baseBlockSize - 1);
    }
  }, [art, gridSettings, highlightBlockId, isolatedLayer, hoveredCell, textureTick, isEditMode]);

  // Coordinate math from client click to canvas cell
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

  // Filtered block palette for the in-canvas picker
  const filteredBlocks = useMemo(() => {
    return MINECRAFT_BLOCKS.filter((b) => {
      const matchSearch =
        !pickerSearch.trim() ||
        b.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        b.id.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchCategory = pickerCategory === 'all' || b.category === pickerCategory;
      return matchSearch && matchCategory;
    });
  }, [pickerSearch, pickerCategory]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    MINECRAFT_BLOCKS.forEach((b) => cats.add(b.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (isDragging) {
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setHasMovedDrag(true);
      }
      setPan((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (canvasRef.current) {
      const cell = getCellFromMouse(e as React.MouseEvent<HTMLCanvasElement>);
      setHoveredCell(cell);

      // Continuous painting when dragging in pencil mode
      if (isPainting && isEditMode && editTool === 'pencil' && cell && onPaintBlock) {
        if (!lastPaintedRef.current || lastPaintedRef.current.x !== cell.x || lastPaintedRef.current.y !== cell.y) {
          lastPaintedRef.current = { x: cell.x, y: cell.y };
          onPaintBlock(cell.x, cell.y, activeBrushBlock);
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    // If Right-click, Middle-click, or if Pan tool is active, or if not in edit mode
    if (e.button === 1 || e.button === 2 || !isEditMode || editTool === 'pan') {
      setIsDragging(true);
      setHasMovedDrag(false);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // In Edit Mode with left click
    if (e.button === 0 && isEditMode) {
      const cell = getCellFromMouse(e as React.MouseEvent<HTMLCanvasElement>);
      if (cell) {
        if (editTool === 'pencil') {
          setIsPainting(true);
          lastPaintedRef.current = { x: cell.x, y: cell.y };
          if (onPaintBlock) {
            onPaintBlock(cell.x, cell.y, activeBrushBlock);
          }
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPainting(false);
    lastPaintedRef.current = null;
  };

  // Touch event handlers for mobile and tablet support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), moved: false };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        touchStartRef.current.moved = true;
      }
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      touchStartRef.current.x = t.clientX;
      touchStartRef.current.y = t.clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (touchStartRef.current && !touchStartRef.current.moved && art) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const clientX = touchStartRef.current.x - rect.left;
        const clientY = touchStartRef.current.y - rect.top;
        const blockSize = Math.round(28 * zoom);
        const x = Math.floor(clientX / blockSize);
        const y = Math.floor(clientY / blockSize);

        if (x >= 0 && x < art.width && y >= 0 && y < art.height) {
          const blockIdx = art.grid[y][x];
          const block = art.blockPalette[blockIdx];
          const cell = { x, y, block };
          setHoveredCell(cell);

          if (isEditMode) {
            if (editTool === 'pencil' && onPaintBlock) {
              onPaintBlock(x, y, activeBrushBlock);
            } else if (editTool === 'bucket' && onReplaceBlock) {
              onReplaceBlock(block.id, activeBrushBlock);
            } else if (editTool === 'eyedropper') {
              setActiveBrushBlock(block);
              setEditTool('pencil');
            }
          } else if (builderMode && onBlockMarkToggle) {
            onBlockMarkToggle(x, y);
          } else {
            if (highlightBlockId === block.id) {
              setHighlightBlockId(null);
            } else {
              setHighlightBlockId(block.id);
            }
          }
        }
      }
    }
    touchStartRef.current = null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasMovedDrag) return;
    const cell = getCellFromMouse(e);
    if (!cell) return;

    if (isEditMode) {
      if (editTool === 'bucket' && onReplaceBlock) {
        // Bulk replace all blocks of clicked type with active brush block
        onReplaceBlock(cell.block.id, activeBrushBlock);
      } else if (editTool === 'eyedropper') {
        // Pick block from canvas
        setActiveBrushBlock(cell.block);
        setEditTool('pencil');
      } else if (editTool === 'pencil' && onPaintBlock && !isPainting) {
        onPaintBlock(cell.x, cell.y, activeBrushBlock);
      }
      return;
    }

    if (builderMode && onBlockMarkToggle) {
      onBlockMarkToggle(cell.x, cell.y);
    } else {
      // Toggle highlight on this block
      if (highlightBlockId === cell.block.id) {
        setHighlightBlockId(null);
      } else {
        setHighlightBlockId(cell.block.id);
      }
    }
  };

  if (!art) {
    return (
      <div className="h-[520px] bg-[#121217] border border-[#22222c] rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-[#181824] border border-[#282838] flex items-center justify-center mb-4 text-[#4ade80]">
          <Grid className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-100 mb-1">Canvas Ready for Blueprint</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Select an image or one of the quick templates on the left, adjust your dimensions and
          palette, then click <strong className="text-[#4ade80]">"Generate Minecraft Pixel Art"</strong>.
        </p>
      </div>
    );
  }

  const placedCount = art.placedState
    ? art.placedState.reduce((acc, row) => acc + row.filter(Boolean).length, 0)
    : 0;
  const progressPercent = Math.round((placedCount / art.totalBlocks) * 100);

  // Determine viewport cursor style
  let viewportCursor = 'cursor-grab';
  if (isDragging) {
    viewportCursor = 'cursor-grabbing';
  } else if (isEditMode) {
    if (editTool === 'pencil') viewportCursor = 'cursor-crosshair';
    else if (editTool === 'bucket') viewportCursor = 'cursor-pointer';
    else if (editTool === 'eyedropper') viewportCursor = 'cursor-crosshair';
    else viewportCursor = 'cursor-grab';
  }

  return (
    <div className="bg-[#121217] border border-[#22222c] rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-200">
      {/* Top Toolbar */}
      <div className="bg-[#0e0e13] border-b border-[#20202a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left Actions: Grid, Chunk, Builder mode, Edit Blocks */}
        <div className="flex flex-wrap items-center space-x-1.5 sm:space-x-2">
          {/* Edit / Replace Blocks Mode Toggle */}
          <button
            id="toggle-edit-mode-btn"
            onClick={() => {
              if (onOpenFullscreenEditor) {
                onOpenFullscreenEditor();
              } else {
                setIsEditMode(!isEditMode);
                if (builderMode) setBuilderMode(false);
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border-emerald-400 hover:scale-[1.02]"
            title="Open Fullscreen Blueprint Canvas Editor with Block Library Palette"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-950" />
            <span>Edit Blueprint</span>
          </button>

          {/* Textures / Flat Mode Toggle */}
          <button
            id="toggle-texture-mode-btn"
            onClick={() =>
              setGridSettings((p) => ({
                ...p,
                renderMode: p.renderMode === 'flat' ? 'texture' : 'flat',
              }))
            }
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              gridSettings.renderMode !== 'flat'
                ? 'bg-[#14261c] border-emerald-500/60 text-[#4ade80]'
                : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
            }`}
            title="Toggle between authentic 16×16 Minecraft block textures and flat colors"
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {gridSettings.renderMode === 'flat' ? 'Flat Colors' : '16×16 Textures'}
            </span>
          </button>

          {/* Grid Toggle */}
          <button
            id="toggle-grid-btn"
            onClick={() => setGridSettings((p) => ({ ...p, showGrid: !p.showGrid }))}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              gridSettings.showGrid
                ? 'bg-[#14261c] border-emerald-500/60 text-[#4ade80]'
                : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
            }`}
            title="Toggle 1x1 block grid lines"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          {/* 16x16 Chunk Grid */}
          <button
            id="toggle-chunk-grid-btn"
            onClick={() => setGridSettings((p) => ({ ...p, showChunkGrid: !p.showChunkGrid }))}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              gridSettings.showChunkGrid
                ? 'bg-[#261e12] border-amber-500/60 text-amber-300'
                : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
            }`}
            title="Toggle 16x16 block chunk / stack lines"
          >
            <span>16×16 Chunks</span>
          </button>

          {/* Builder Checkmark Mode */}
          <button
            id="toggle-builder-mode"
            onClick={() => {
              setBuilderMode(!builderMode);
              if (isEditMode) setIsEditMode(false);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              builderMode
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                : 'bg-[#181824] border-[#262636] text-slate-300 hover:text-white'
            }`}
            title="Enable click-to-mark placed blocks in game"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Build Tracker</span>
          </button>

          {/* Active Highlight clear */}
          {highlightBlockId && (
            <button
              id="clear-highlight-btn"
              onClick={() => setHighlightBlockId(null)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#2e1319] border border-rose-600/50 text-rose-300 hover:bg-[#3d1822] transition-colors cursor-pointer"
            >
              <span>Clear Filter ✕</span>
            </button>
          )}
        </div>

        {/* Right: Undo / Redo & Zoom Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Undo / Redo buttons */}
          <div className="flex items-center bg-[#181824] border border-[#262636] rounded-lg p-0.5 mr-1">
            <button
              id="canvas-undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors cursor-pointer"
              title="Undo change (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              id="canvas-redo-btn"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors cursor-pointer"
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            id="zoom-out-btn"
            onClick={() => {
              const next = Math.max(0.2, zoom * 0.8);
              zoomRef.current = next;
              setZoom(next);
            }}
            className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#222230] text-slate-300 hover:text-white border border-[#262636] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            id="zoom-in-btn"
            onClick={() => {
              const next = Math.min(8.0, zoom * 1.25);
              zoomRef.current = next;
              setZoom(next);
            }}
            className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#222230] text-slate-300 hover:text-white border border-[#262636] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="zoom-reset-btn"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              zoomRef.current = 1;
              panRef.current = { x: 0, y: 0 };
            }}
            className="p-1.5 rounded-lg bg-[#181824] hover:bg-[#222230] text-slate-300 hover:text-white border border-[#262636] transition-colors cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Edit Toolbar (Shown when Edit Mode is active) */}
      {isEditMode && (
        <div className="bg-[#14141c] border-b border-[#282838] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Tool Selection */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Tool:
            </span>

            {/* Pencil / Paint 1x1 */}
            <button
              id="tool-pencil-btn"
              onClick={() => setEditTool('pencil')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer ${
                editTool === 'pencil'
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'bg-[#1a1a26] border-[#2c2c3e] text-slate-300 hover:text-white'
              }`}
              title="Paint single block (Click or Drag)"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Paint 1×1</span>
            </button>

            {/* Bucket / Replace All Identical */}
            <button
              id="tool-bucket-btn"
              onClick={() => setEditTool('bucket')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer ${
                editTool === 'bucket'
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'bg-[#1a1a26] border-[#2c2c3e] text-slate-300 hover:text-white'
              }`}
              title="Replace all matching blocks everywhere (Click any block to swap all instances)"
            >
              <PaintBucket className="w-3.5 h-3.5" />
              <span>Replace Color (Bucket)</span>
            </button>

            {/* Eyedropper / Sample */}
            <button
              id="tool-eyedropper-btn"
              onClick={() => setEditTool('eyedropper')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer ${
                editTool === 'eyedropper'
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'bg-[#1a1a26] border-[#2c2c3e] text-slate-300 hover:text-white'
              }`}
              title="Eyedropper tool: sample block from canvas"
            >
              <Pipette className="w-3.5 h-3.5" />
              <span>Pick Block</span>
            </button>

            {/* Pan / Move */}
            <button
              id="tool-pan-btn"
              onClick={() => setEditTool('pan')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer ${
                editTool === 'pan'
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'bg-[#1a1a26] border-[#2c2c3e] text-slate-300 hover:text-white'
              }`}
              title="Pan tool: drag to navigate canvas"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan</span>
            </button>
          </div>

          {/* Center / Right: Active Brush Block & Quick Swatches */}
          <div className="flex items-center space-x-2 relative">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:inline">
              Active Block:
            </span>

            {/* Active Block Popover Trigger */}
            <div className="relative">
              <button
                id="active-brush-block-btn"
                onClick={() => setShowBlockPicker(!showBlockPicker)}
                className="flex items-center space-x-2 bg-[#1c1c28] hover:bg-[#262638] border border-emerald-500/40 rounded-xl px-2.5 py-1 text-slate-200 transition-colors cursor-pointer shadow-sm"
                title="Click to select a different Minecraft block to paint or replace with"
              >
                <div className="w-5 h-5 rounded overflow-hidden border border-[#2e2e42] bg-[#0c0c0e] flex-shrink-0">
                  <img
                    src={getBlockSwatchUrl(activeBrushBlock)}
                    alt={activeBrushBlock.name}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="font-semibold text-white max-w-[120px] sm:max-w-[160px] truncate">
                  {activeBrushBlock.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Searchable Block Picker Dropdown */}
              {showBlockPicker && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#121217] border border-[#2a2a3a] rounded-2xl shadow-2xl z-50 p-3 flex flex-col space-y-2">
                  <div className="flex items-center justify-between border-b border-[#20202a] pb-2">
                    <span className="font-bold text-white text-xs">Choose Minecraft Block</span>
                    <button
                      onClick={() => setShowBlockPicker(false)}
                      className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search 100+ blocks..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#262636] rounded-xl pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto py-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setPickerCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors cursor-pointer ${
                          pickerCategory === cat
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-[#181824] text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Block grid */}
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-52 overflow-y-auto p-1 bg-[#0a0a0d] rounded-xl border border-[#1e1e28]">
                    {filteredBlocks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setActiveBrushBlock(b);
                          setShowBlockPicker(false);
                        }}
                        className={`p-1 rounded-lg border flex flex-col items-center group transition-transform hover:scale-105 cursor-pointer ${
                          activeBrushBlock.id === b.id
                            ? 'bg-emerald-950/60 border-emerald-500 shadow-sm'
                            : 'bg-[#14141d] border-[#222230] hover:border-slate-500'
                        }`}
                        title={`${b.name} (${b.category})`}
                      >
                        <div className="w-6 h-6 rounded overflow-hidden">
                          <img
                            src={getBlockSwatchUrl(b)}
                            alt={b.name}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick palette blocks from current art */}
            <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-[#282838]">
              {art.blockPalette.slice(0, 7).map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBrushBlock(b)}
                  className={`w-6 h-6 rounded-md overflow-hidden border transition-transform hover:scale-110 cursor-pointer ${
                    activeBrushBlock.id === b.id
                      ? 'border-emerald-400 ring-2 ring-emerald-500/50'
                      : 'border-[#262636] hover:border-slate-400'
                  }`}
                  title={`Select ${b.name}`}
                >
                  <img
                    src={getBlockSwatchUrl(b)}
                    alt={b.name}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </button>
              ))}
            </div>

            {/* Bulk Swap Everywhere Modal Button */}
            {onOpenBlockReplacer && (
              <button
                id="open-bulk-replacer-btn"
                onClick={() => onOpenBlockReplacer(null)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a26] hover:bg-[#252538] text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer text-xs"
                title="Open Bulk Swap dialog to replace any block type across the entire build"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Bulk Swap...</span>
              </button>
            )}

            {/* Close Edit Mode */}
            <button
              onClick={() => setIsEditMode(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#20202c] transition-colors cursor-pointer"
              title="Close editing mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Layer Isolator Bar (Quick Layer Slider) */}
      {isolatedLayer !== null && (
        <div className="bg-[#102217] border-b border-emerald-800/40 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#4ade80]" />
            <span className="font-semibold text-emerald-300">
              Isolating Layer {isolatedLayer + 1} of {art.height}
            </span>
            <span className="text-slate-400">(Previous layer ghosted below)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsolatedLayer(Math.max(0, isolatedLayer - 1))}
              disabled={isolatedLayer === 0}
              className="px-2 py-1 bg-[#181824] border border-[#262636] rounded-lg text-slate-200 disabled:opacity-30 cursor-pointer"
            >
              ◀ Prev Layer
            </button>
            <button
              onClick={() => setIsolatedLayer(Math.min(art.height - 1, isolatedLayer + 1))}
              disabled={isolatedLayer === art.height - 1}
              className="px-2 py-1 bg-[#181824] border border-[#262636] rounded-lg text-slate-200 disabled:opacity-30 cursor-pointer"
            >
              Next Layer ▶
            </button>
            <button
              onClick={() => setIsolatedLayer(null)}
              className="px-2 py-1 bg-[#181824] hover:bg-[#222230] border border-rose-800/40 text-rose-300 rounded-lg ml-2 cursor-pointer"
            >
              Show All Layers ✕
            </button>
          </div>
        </div>
      )}

      {/* Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        className={`relative flex-1 h-[48vh] min-h-[300px] sm:min-h-[420px] md:min-h-[500px] max-h-[620px] overflow-hidden bg-[#08080b] flex items-center justify-center select-none touch-none ${viewportCursor}`}
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
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <canvas
            ref={canvasRef}
            id="canvas"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="shadow-2xl rounded border border-[#20202a]"
            style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          />
        </div>

        {/* Floating Highlight Banner (When a block is highlighted) */}
        {highlightBlockId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#12121c]/95 border border-emerald-500/60 backdrop-blur-md rounded-2xl px-4 py-2 shadow-2xl flex items-center space-x-3 z-20">
            {(() => {
              const blk = art.blockPalette.find((b) => b.id === highlightBlockId);
              if (!blk) return null;
              return (
                <>
                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-emerald-400 bg-[#0c0c10] flex-shrink-0">
                    <img
                      src={getBlockSwatchUrl(blk)}
                      alt={blk.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">Highlighting: {blk.name}</span>
                    <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                      ×{art.counts[blk.id] || 0}
                    </span>
                  </div>
                  <button
                    onClick={() => setHighlightBlockId(null)}
                    className="ml-2 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                    title="Deselect block highlight (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Deselect (Esc)</span>
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* Hover Inspector Pill Floating at Bottom Left */}
        {hoveredCell ? (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-[#121217]/95 border border-[#282838] backdrop-blur-md rounded-2xl p-3 shadow-2xl flex items-center space-x-3 pointer-events-none z-10 max-w-[calc(100%-24px)] sm:max-w-sm">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#2a2a3a] bg-[#0c0c0e] flex-shrink-0 relative shadow-inner">
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
                <span className="text-[10px] font-mono text-[#4ade80] bg-[#14261c] px-1.5 py-0.2 rounded border border-emerald-500/30 flex-shrink-0">
                  {hoveredCell.block.category}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                Pos: X: <strong className="text-slate-200">{hoveredCell.x}</strong>, Y:{' '}
                <strong className="text-slate-200">{hoveredCell.y}</strong> &bull; Total in build:{' '}
                <strong className="text-[#4ade80]">
                  {art.counts[hoveredCell.block.id] || 0}
                </strong>
              </p>
              {isEditMode ? (
                <p className="text-[10px] text-emerald-400 font-semibold truncate mt-0.5">
                  {editTool === 'pencil' && `Click or drag to paint with ${activeBrushBlock.name}`}
                  {editTool === 'bucket' && `Click to replace ALL ${hoveredCell.block.name} with ${activeBrushBlock.name}`}
                  {editTool === 'eyedropper' && `Click to sample ${hoveredCell.block.name}`}
                  {editTool === 'pan' && 'Click & drag to move view'}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 truncate font-mono">{hoveredCell.block.commandName}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-[#121217]/85 backdrop-blur border border-[#242434] rounded-xl px-3 py-1.5 text-[11px] sm:text-xs text-slate-400 pointer-events-none flex items-center space-x-2 max-w-[calc(100%-24px)]">
            <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">
              {isEditMode
                ? `Edit Mode Active (${editTool.toUpperCase()}) • Click/Drag to modify • Ctrl+Z to undo`
                : 'Left-click & drag to move • Scroll to zoom at cursor • Click to inspect block'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Footer Bar: Quick action buttons & Prominent Download Button */}
      <div className="bg-[#0e0e13] border-t border-[#20202a] px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Download Button */}
          <button
            id="canvas-bottom-download-btn"
            onClick={onDownloadHd}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/60 transition-all cursor-pointer hover:scale-[1.02]"
            title="Download high-resolution pixel art blueprint with grid and coordinates"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Download Blueprint</span>
          </button>

          {/* Quick Edit Blocks Button */}
          <button
            id="canvas-bottom-edit-btn"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              isEditMode
                ? 'bg-[#14261c] border-emerald-500/60 text-[#4ade80]'
                : 'bg-[#181824] hover:bg-[#222230] text-slate-200 border-[#262636]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>{isEditMode ? 'Exit Edit Mode' : 'Edit / Replace Blocks'}</span>
          </button>

          <button
            id="canvas-bottom-layer-guide-btn"
            onClick={onOpenLayerGuide}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 font-medium text-xs border border-[#262636] transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Layer Guide</span>
          </button>

          <button
            id="canvas-bottom-commands-btn"
            onClick={onOpenCommands}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 font-medium text-xs border border-[#262636] transition-colors cursor-pointer"
          >
            <span>/setblock Commands</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-slate-400 border-t sm:border-t-0 border-[#1c1c26] pt-2 sm:pt-0">
          <span className="font-mono bg-[#181824] px-2.5 py-1 rounded-lg border border-[#262636]">
            {art.width}×{art.height}
          </span>
          <span className="text-slate-400">
            Total: <span className="font-mono font-semibold text-slate-200">{art.totalBlocks.toLocaleString()}</span> blocks
          </span>
        </div>
      </div>
    </div>
  );
};
