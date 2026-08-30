import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Terminal,
  Play,
  Upload,
  Clipboard,
  Trash2,
  Download,
  Sparkles,
  Layers,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  AlertCircle,
  Info,
  Box,
  Sliders,
  Grid,
  FileCode,
  ArrowRight,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { ConvertedArt, MinecraftBlock } from '../types';
import {
  parseMinecraftCommandsText,
  SAMPLE_COMMAND_SNIPPETS,
  ProjectionPlane,
  CommandParseResult,
} from '../utils/commandParser';
import { drawBlockTexture } from '../utils/textureRenderer';
import { downloadArtImagePng } from '../utils/exportHelpers';

interface CommandToArtViewProps {
  onApplyArtToWorkspace: (art: ConvertedArt, name?: string) => void;
  onOpenFullscreenEditor?: (art: ConvertedArt) => void;
}

export const CommandToArtView: React.FC<CommandToArtViewProps> = ({
  onApplyArtToWorkspace,
  onOpenFullscreenEditor,
}) => {
  // Raw input commands
  const [inputText, setInputText] = useState<string>(SAMPLE_COMMAND_SNIPPETS[0].commands);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_COMMAND_SNIPPETS[0].id);

  // Settings
  const [projectionPlane, setProjectionPlane] = useState<ProjectionPlane>('auto');
  const [renderMode, setRenderMode] = useState<'texture' | 'flat'>('texture');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showCoords, setShowCoords] = useState<boolean>(true);

  // Parse state & result
  const [parseResult, setParseResult] = useState<CommandParseResult>(() =>
    parseMinecraftCommandsText(SAMPLE_COMMAND_SNIPPETS[0].commands, 'auto')
  );

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Canvas viewport state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    block: MinecraftBlock;
  } | null>(null);
  const [highlightBlockId, setHighlightBlockId] = useState<string | null>(null);

  // Drag & drop file highlight state
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Execution trigger
  const handleParse = useCallback(() => {
    const res = parseMinecraftCommandsText(inputText, projectionPlane);
    setParseResult(res);
    if (res.success && res.convertedArt) {
      showToast(
        `Generated art: ${res.convertedArt.width}×${res.convertedArt.height} (${res.validCommands.toLocaleString()} commands parsed)`
      );
    } else if (res.errorMessage) {
      showToast(`Error: ${res.errorMessage}`);
    }
  }, [inputText, projectionPlane, showToast]);

  // Load sample snippet
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_COMMAND_SNIPPETS.find((s) => s.id === sampleId);
    if (sample) {
      setSelectedSampleId(sample.id);
      setInputText(sample.commands);
      const res = parseMinecraftCommandsText(sample.commands, projectionPlane);
      setParseResult(res);
      showToast(`Loaded sample: "${sample.title}"`);
    }
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        const res = parseMinecraftCommandsText(text, projectionPlane);
        setParseResult(res);
        showToast('Pasted and parsed commands from clipboard');
      }
    } catch {
      showToast('Could not read clipboard. Please paste directly into text box.');
    }
  };

  // File Upload (.mcfunction or .txt)
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setInputText(text);
        const res = parseMinecraftCommandsText(text, projectionPlane);
        setParseResult(res);
        showToast(`Loaded file "${file.name}" (${file.size.toLocaleString()} bytes)`);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop onto textarea/card
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Auto-fit canvas to container on parse
  useEffect(() => {
    if (!parseResult.convertedArt || !containerRef.current) return;
    const { width, height } = parseResult.convertedArt;
    const container = containerRef.current;
    const availW = container.clientWidth - 40;
    const availH = container.clientHeight - 40;
    const baseBlockSize = 24;

    const naturalW = width * baseBlockSize;
    const naturalH = height * baseBlockSize;

    if (naturalW <= 0 || naturalH <= 0) return;

    const scaleX = availW / naturalW;
    const scaleY = availH / naturalH;
    const fitScale = Math.min(scaleX, scaleY, 2.0);
    const clamped = Math.max(0.2, Math.min(4.0, fitScale));

    setZoom(clamped);
    setPan({ x: 0, y: 0 });
  }, [parseResult.convertedArt?.width, parseResult.convertedArt?.height]);

  // Render Canvas
  useEffect(() => {
    if (!canvasRef.current || !parseResult.convertedArt) return;
    const art = parseResult.convertedArt;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blockSize = 24;
    canvas.width = art.width * blockSize;
    canvas.height = art.height * blockSize;

    ctx.imageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;

    // Dark canvas background
    ctx.fillStyle = '#0e0e15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render blocks
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) {
        const blockIdx = art.grid[y][x];
        const block = art.blockPalette[blockIdx];
        if (!block) continue;

        const posX = x * blockSize;
        const posY = y * blockSize;

        const isDimmed = highlightBlockId && block.id !== highlightBlockId;

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.25;
        }

        drawBlockTexture(ctx, block, posX, posY, blockSize, renderMode);
        ctx.restore();

        // Highlight stroke
        if (highlightBlockId && block.id === highlightBlockId) {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.strokeRect(posX + 1, posY + 1, blockSize - 2, blockSize - 2);
        }
      }
    }

    // Draw Grid
    if (showGrid && blockSize * zoom >= 6) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;

      // Verticals
      for (let x = 0; x <= art.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * blockSize, 0);
        ctx.lineTo(x * blockSize, art.height * blockSize);
        ctx.stroke();
      }

      // Horizontals
      for (let y = 0; y <= art.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * blockSize);
        ctx.lineTo(art.width * blockSize, y * blockSize);
        ctx.stroke();
      }
    }
  }, [parseResult.convertedArt, renderMode, showGrid, zoom, highlightBlockId]);

  // Pointer interactions on Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Inspect hovered cell
    if (!canvasRef.current || !parseResult.convertedArt) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const art = parseResult.convertedArt;
    const blockSize = 24;

    const relX = (e.clientX - rect.left) / zoom;
    const relY = (e.clientY - rect.top) / zoom;

    const gridX = Math.floor(relX / blockSize);
    const gridY = Math.floor(relY / blockSize);

    if (gridX >= 0 && gridX < art.width && gridY >= 0 && gridY < art.height) {
      const bIdx = art.grid[gridY][gridX];
      const block = art.blockPalette[bIdx];
      if (block) {
        setHoveredCell({ x: gridX, y: gridY, block });
      } else {
        setHoveredCell(null);
      }
    } else {
      setHoveredCell(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.15;
    setZoom((z) => Math.max(0.15, Math.min(8.0, z * delta)));
  };

  // Click on block inside preview to toggle highlight
  const handleCanvasClick = () => {
    if (hoveredCell) {
      if (highlightBlockId === hoveredCell.block.id) {
        setHighlightBlockId(null);
      } else {
        setHighlightBlockId(hoveredCell.block.id);
        showToast(`Highlighting ${hoveredCell.block.name} (Click again to clear)`);
      }
    }
  };

  // Swatch URL helper
  const getBlockSwatchUrl = (block: MinecraftBlock) => {
    return `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2/blocks/${block.id}.png`;
  };

  const art = parseResult.convertedArt;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#162a1c] border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Feature Header Banner */}
      <div className="bg-gradient-to-br from-[#121218] via-[#101518] to-[#0d1c14] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 text-slate-200 shadow-xl relative overflow-hidden">
        {/* Background glow & decorative Minecraft grid */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#14261c] border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>COMMANDS TO PIXEL ART CONVERTER</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Convert Minecraft Commands into Visual Block Blueprints
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Paste in-game <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">/setblock</code> or <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">/fill</code> command lines, or drop a <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">.mcfunction</code> file. The parser reconstructs your 3D/2D block coordinates into an editable pixel art image with authentic block textures.
            </p>
          </div>

          {/* Quick Preset Samples Dropdown / Buttons */}
          <div className="bg-[#14141e]/90 border border-[#262638] rounded-2xl p-3.5 flex flex-col gap-2.5 sm:min-w-[280px]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Try Sample Commands:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SAMPLE_COMMAND_SNIPPETS.map((sample) => (
                <button
                  key={sample.id}
                  id={`sample-btn-${sample.id}`}
                  onClick={() => handleSelectSample(sample.id)}
                  className={`px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-all cursor-pointer truncate ${
                    selectedSampleId === sample.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'bg-[#181826] text-slate-300 hover:text-white hover:bg-[#222234] border border-[#242436]'
                  }`}
                  title={sample.description}
                >
                  <span className="truncate block">{sample.title.split(' (')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Left = Input Commands & Options, Right = Visual Art Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Command Input & Parser Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`bg-[#121217] border rounded-3xl p-5 shadow-xl transition-all ${
              isDragOver ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-[#22222c]'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {/* Header & Quick Action Buttons */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Paste Minecraft Commands</h3>
              </div>

              <div className="flex items-center space-x-1.5">
                {/* Paste from clipboard */}
                <button
                  id="paste-clipboard-btn"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] border border-[#2a2a3c] text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Paste</span>
                </button>

                {/* Upload file */}
                <label
                  htmlFor="command-file-input"
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] border border-[#2a2a3c] text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Upload .mcfunction or .txt"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Upload</span>
                  <input
                    id="command-file-input"
                    type="file"
                    accept=".mcfunction,.txt,.json"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* Clear */}
                <button
                  id="clear-input-btn"
                  onClick={() => {
                    setInputText('');
                    setParseResult(parseMinecraftCommandsText('', projectionPlane));
                  }}
                  className="p-1 rounded-lg bg-[#181824] hover:bg-rose-950/40 border border-[#2a2a3c] hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Clear text"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Textarea for commands */}
            <div className="relative">
              <textarea
                id="minecraft-command-textarea"
                rows={12}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setSelectedSampleId('');
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleParse();
                  }
                }}
                placeholder="Paste /setblock ~0 ~0 ~0 minecraft:white_concrete or /fill commands here..."
                className="w-full bg-[#09090d] border border-[#222230] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-2xl p-3.5 font-mono text-xs text-[#4ade80] placeholder:text-slate-600 focus:outline-none transition-all resize-y leading-relaxed shadow-inner"
                spellCheck={false}
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 pointer-events-none bg-[#09090d]/80 px-2 py-0.5 rounded border border-[#222230]">
                {inputText.split(/\r?\n/).filter((l) => l.trim()).length} lines &bull; Ctrl+Enter
              </div>
            </div>

            {/* Parsing Settings & Projection Plane */}
            <div className="mt-4 pt-4 border-t border-[#20202c] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Projection Plane */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Projection Alignment:
                  </label>
                  <select
                    id="projection-plane-select"
                    value={projectionPlane}
                    onChange={(e) => {
                      const plane = e.target.value as ProjectionPlane;
                      setProjectionPlane(plane);
                      const res = parseMinecraftCommandsText(inputText, plane);
                      setParseResult(res);
                    }}
                    className="w-full bg-[#181824] border border-[#262638] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="auto">✨ Auto-Detect Best View</option>
                    <option value="xy">Vertical Wall (XY - North/South)</option>
                    <option value="xz">Horizontal Floor (XZ - Map Art)</option>
                    <option value="zy">Side Wall (ZY - East/West)</option>
                  </select>
                </div>

                {/* Render Texture Style */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Render Textures:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setRenderMode('texture')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        renderMode === 'texture'
                          ? 'bg-[#14261c] border-emerald-500 text-emerald-300'
                          : 'bg-[#181824] border-[#262638] text-slate-400 hover:text-white'
                      }`}
                    >
                      16×16 Blocks
                    </button>
                    <button
                      onClick={() => setRenderMode('flat')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        renderMode === 'flat'
                          ? 'bg-[#14261c] border-emerald-500 text-emerald-300'
                          : 'bg-[#181824] border-[#262638] text-slate-400 hover:text-white'
                      }`}
                    >
                      Flat Solid
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Convert Button */}
              <button
                id="convert-commands-btn"
                onClick={handleParse}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Convert Commands to Art</span>
              </button>
            </div>
          </div>

          {/* Parsing Summary & Statistics Card */}
          <div className="bg-[#121217] border border-[#22222c] rounded-3xl p-5 shadow-xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#20202c] pb-3">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" />
                Parser Statistics
              </span>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  parseResult.success
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                }`}
              >
                {parseResult.success ? 'Success' : 'Error'}
              </span>
            </div>

            {parseResult.success && art ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div className="bg-[#181824] p-2 rounded-xl border border-[#222230]">
                    <div className="text-[10px] text-slate-400 uppercase">Dimensions</div>
                    <div className="font-bold text-white text-sm">
                      {art.width} × {art.height}
                    </div>
                  </div>
                  <div className="bg-[#181824] p-2 rounded-xl border border-[#222230]">
                    <div className="text-[10px] text-slate-400 uppercase">Commands</div>
                    <div className="font-bold text-emerald-400 text-sm">
                      {parseResult.validCommands.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#181824] p-2 rounded-xl border border-[#222230]">
                    <div className="text-[10px] text-slate-400 uppercase">Unique Colors</div>
                    <div className="font-bold text-cyan-400 text-sm">
                      {art.blockPalette.length}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-400 pt-1">
                  <span>Detected Plane:</span>
                  <strong className="text-white font-mono uppercase">
                    {parseResult.detectedPlane === 'xy'
                      ? 'Vertical Wall (XY)'
                      : parseResult.detectedPlane === 'xz'
                      ? 'Horizontal Floor (XZ)'
                      : 'Side Wall (ZY)'}
                  </strong>
                </div>

                {parseResult.unrecognizedBlocks.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Fallback color mapped for {parseResult.unrecognizedBlocks.length} block(s):
                    </div>
                    <p className="font-mono text-[10px] text-amber-200/80 truncate">
                      {parseResult.unrecognizedBlocks.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {parseResult.errorMessage || 'No commands parsed yet.'}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Visual Art Canvas & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121217] border border-[#22222c] rounded-3xl p-5 shadow-xl space-y-4">
            {/* Canvas Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#20202c] pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-emerald-400" />
                  <span>Generated Pixel Art Image</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Interactive blueprint converted directly from commands
                </p>
              </div>

              {/* Viewport Toggles */}
              <div className="flex items-center space-x-2">
                <button
                  id="canvas-grid-toggle"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                    showGrid
                      ? 'bg-[#14261c] border-emerald-500/50 text-emerald-300'
                      : 'bg-[#181824] border-[#262638] text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Grid Overlay"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>

                <div className="flex items-center bg-[#181824] border border-[#262638] rounded-xl p-0.5 text-xs">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.15, z * 0.8))}
                    className="p-1.5 hover:text-white text-slate-400 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[42px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(8.0, z * 1.25))}
                    className="p-1.5 hover:text-white text-slate-400 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Canvas Viewport */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
              className="relative w-full h-[420px] sm:h-[480px] bg-[#09090e] border border-[#20202c] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-inner"
            >
              {art ? (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                  }}
                  className="inline-block shadow-2xl relative"
                >
                  <canvas
                    ref={canvasRef}
                    style={{ imageRendering: 'pixelated' }}
                    className="block rounded shadow-2xl"
                  />
                </div>
              ) : (
                <div className="text-center p-6 text-slate-500 space-y-2">
                  <Terminal className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
                  <p className="text-xs">Paste commands on the left and click "Convert Commands to Art"</p>
                </div>
              )}

              {/* Hover Block Inspector Tooltip Floating Bottom-Left */}
              {hoveredCell && (
                <div className="absolute bottom-3 left-3 bg-[#121218]/95 border border-[#2c2c40] backdrop-blur-md rounded-2xl p-2.5 shadow-2xl flex items-center space-x-3 pointer-events-none z-10">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#383850] bg-[#0c0c10] flex-shrink-0">
                    <img
                      src={getBlockSwatchUrl(hoveredCell.block)}
                      alt={hoveredCell.block.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white leading-tight">
                      {hoveredCell.block.name}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      Pos: ({hoveredCell.x}, {hoveredCell.y}) &bull; {hoveredCell.block.commandName}
                    </div>
                  </div>
                </div>
              )}

              {/* Highlight active banner */}
              {highlightBlockId && art && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#14261c]/95 border border-emerald-500/60 backdrop-blur-md rounded-full px-3.5 py-1 shadow-2xl text-xs font-bold text-emerald-300 flex items-center space-x-2 z-10">
                  <span>Highlighting Block</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHighlightBlockId(null);
                    }}
                    className="text-slate-300 hover:text-white ml-1 underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Palette Breakdown / Material Chips */}
            {art && (
              <div className="space-y-2 pt-2 border-t border-[#20202c]">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Blocks in this Command Art:</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {art.totalBlocks.toLocaleString()} blocks total
                  </span>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                  {art.blockPalette.map((b) => {
                    const count = art.counts[b.id] || 0;
                    const isSelected = highlightBlockId === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          setHighlightBlockId(isSelected ? null : b.id);
                        }}
                        className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1c3325] border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                            : 'bg-[#181824] border-[#262638] text-slate-300 hover:border-slate-400 hover:bg-[#202030]'
                        }`}
                        title={`Click to highlight all ${count} × ${b.name}`}
                      >
                        <div className="w-5 h-5 rounded overflow-hidden border border-[#333348] bg-[#0c0c10] flex-shrink-0">
                          <img
                            src={getBlockSwatchUrl(b)}
                            alt={b.name}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        <span className="text-xs font-medium truncate max-w-[120px]">{b.name}</span>
                        <span className="text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded text-emerald-400">
                          ×{count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons: Export PNG, Open in Full Editor, Send to Main Workspace */}
            {art && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#20202c]">
                {/* 1. Download PNG */}
                <button
                  id="download-converted-art-png-btn"
                  onClick={() => {
                    downloadArtImagePng(art, {
                      withTextures: renderMode === 'texture',
                      withGrid: showGrid,
                      filename: `minecraft_command_art_${art.width}x${art.height}.png`,
                    });
                    showToast('Downloaded Pixel Art PNG Image');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#181824] hover:bg-[#222232] border border-[#2a2a3c] text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download PNG Image</span>
                </button>

                {/* 2. Open in Fullscreen Canvas Editor */}
                {onOpenFullscreenEditor && (
                  <button
                    id="open-converted-editor-btn"
                    onClick={() => onOpenFullscreenEditor(art)}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow"
                  >
                    <Edit3 className="w-4 h-4 text-slate-950" />
                    <span>Edit in Fullscreen</span>
                  </button>
                )}

                {/* 3. Send / Load into Main Workspace */}
                <button
                  id="apply-to-workspace-btn"
                  onClick={() => {
                    onApplyArtToWorkspace(art, 'Command Pixel Art');
                    showToast('Loaded art into Main Workspace (Layer Guide & Materials enabled)!');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#14261c] hover:bg-[#1d3829] border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow"
                  title="Send to Main Canvas to get layer guide and materials shopping list"
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Use in Layer Guide &bull;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
