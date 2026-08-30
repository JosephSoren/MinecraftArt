import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ContentHeader } from './components/ContentHeader';
import { Footer } from './components/Footer';
import { ImageUploader } from './components/ImageUploader';
import { PaletteManager } from './components/PaletteManager';
import { PixelArtCanvas } from './components/PixelArtCanvas';
import { LayerGuideView } from './components/LayerGuideView';
import { CommandsModal } from './components/CommandsModal';
import { MaterialsList } from './components/MaterialsList';
import { ExportModal } from './components/ExportModal';
import { BlockReplacerModal } from './components/BlockReplacerModal';
import { DownloadSection } from './components/DownloadSection';
import { FullscreenEditor } from './components/FullscreenEditor';
import { CommandToArtView } from './components/CommandToArtView';
import { HomepageGuideContent } from './components/HomepageGuideContent';
import { Grid, Sliders } from 'lucide-react';
import {
  MinecraftBlock,
  PixelArtSettings,
  GridSettings,
  ConvertedArt,
} from './types';
import { MINECRAFT_BLOCKS } from './data/minecraftBlocks';
import { convertImageToBlocks } from './utils/colorMatcher';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<
    'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials'
  >('generator');

  // Loaded Source Image
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceImageName, setSourceImageName] = useState<string>('pixel-art');

  // Conversion Settings
  const [settings, setSettings] = useState<PixelArtSettings>({
    width: 32,
    height: 32,
    lockAspectRatio: true,
    dithering: 'floyd-steinberg',
    colorMatching: 'lab',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    orientation: 'vertical',
  });

  // Grid Settings (16x16 chunk grid unchecked by default)
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    showGrid: true,
    showCoordinates: true,
    showChunkGrid: false,
    gridColor: 'subtle',
    gridOpacity: 0.8,
  });

  // Block Palette selection (All enabled by default)
  const [activeBlockIds, setActiveBlockIds] = useState<Set<string>>(() => {
    return new Set(MINECRAFT_BLOCKS.map((b) => b.id));
  });

  // Converted Art State
  const [art, setArt] = useState<ConvertedArt | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Undo/Redo History for Block Edits
  const [history, setHistory] = useState<ConvertedArt[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Inspector & Layer Isolation
  const [highlightBlockId, setHighlightBlockId] = useState<string | null>(null);
  const [isolatedLayer, setIsolatedLayer] = useState<number | null>(null);

  // Export Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Block Replacer Modal
  const [showReplacerModal, setShowReplacerModal] = useState<boolean>(false);
  const [replacerSourceBlockId, setReplacerSourceBlockId] = useState<string | null>(null);

  // Full-Screen Dedicated Block & Palette Canvas Editor
  const [isFullscreenEditorOpen, setIsFullscreenEditorOpen] = useState<boolean>(false);

  // Mobile layout tab switcher ('canvas' | 'controls')
  const [mobileTab, setMobileTab] = useState<'canvas' | 'controls'>('canvas');

  // Active blocks array
  const activeBlocks = useMemo(() => {
    return MINECRAFT_BLOCKS.filter((b) => activeBlockIds.has(b.id));
  }, [activeBlockIds]);

  // Primary Conversion Execution
  const handleGenerateArt = useCallback(() => {
    if (!sourceImage) return;
    if (activeBlocks.length === 0) {
      alert('Please enable at least one block in the palette manager.');
      return;
    }

    setIsGenerating(true);

    // Run slightly deferred so the loading spinner appears instantly
    setTimeout(() => {
      try {
        const result = convertImageToBlocks(sourceImage, settings, activeBlocks);

        // Initialize empty placed state
        const placedState: boolean[][] = [];
        for (let y = 0; y < settings.height; y++) {
          placedState[y] = new Array(settings.width).fill(false);
        }

        const newArt: ConvertedArt = {
          width: settings.width,
          height: settings.height,
          grid: result.grid,
          blockPalette: result.palette,
          totalBlocks: result.totalBlocks,
          counts: result.counts,
          placedState,
        };

        setArt(newArt);
        setHistory([newArt]);
        setHistoryIndex(0);

        // Reset highlight and isolation
        setHighlightBlockId(null);
        setIsolatedLayer(null);
        setMobileTab('canvas');
      } catch (err: any) {
        console.error('Conversion failed', err);
        alert(`Conversion error: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [sourceImage, settings, activeBlocks]);

  // Push new art state to history
  const pushArtState = useCallback((newArt: ConvertedArt) => {
    setArt(newArt);
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(newArt);
      // Cap history at 30 items
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  // Undo block edit
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setArt(target);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo block edit
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setArt(target);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Replace all instances of sourceBlockId with targetBlock
  const handleReplaceBlock = useCallback((sourceBlockId: string, targetBlock: MinecraftBlock) => {
    if (!art) return;

    // Check if targetBlock exists in current palette, or add it
    let targetIdx = art.blockPalette.findIndex((b) => b.id === targetBlock.id);
    const newPalette = [...art.blockPalette];
    if (targetIdx === -1) {
      newPalette.push(targetBlock);
      targetIdx = newPalette.length - 1;
    }

    const sourceIdx = art.blockPalette.findIndex((b) => b.id === sourceBlockId);
    if (sourceIdx === -1 && !art.counts[sourceBlockId]) return;

    // Create new grid with replaced values
    const newGrid: number[][] = [];
    const newCounts: Record<string, number> = {};

    for (let y = 0; y < art.height; y++) {
      newGrid[y] = [];
      for (let x = 0; x < art.width; x++) {
        const curIdx = art.grid[y][x];
        const curBlock = art.blockPalette[curIdx];

        if (curIdx === sourceIdx || (curBlock && curBlock.id === sourceBlockId)) {
          newGrid[y][x] = targetIdx;
          newCounts[targetBlock.id] = (newCounts[targetBlock.id] || 0) + 1;
        } else {
          newGrid[y][x] = curIdx;
          if (curBlock) {
            newCounts[curBlock.id] = (newCounts[curBlock.id] || 0) + 1;
          }
        }
      }
    }

    const updatedArt: ConvertedArt = {
      ...art,
      grid: newGrid,
      blockPalette: newPalette,
      counts: newCounts,
    };

    pushArtState(updatedArt);
  }, [art, pushArtState]);

  // Paint a single block or cell with a chosen Minecraft block
  const handlePaintBlock = useCallback((x: number, y: number, targetBlock: MinecraftBlock) => {
    if (!art) return;
    if (x < 0 || x >= art.width || y < 0 || y >= art.height) return;

    let targetIdx = art.blockPalette.findIndex((b) => b.id === targetBlock.id);
    const newPalette = [...art.blockPalette];
    if (targetIdx === -1) {
      newPalette.push(targetBlock);
      targetIdx = newPalette.length - 1;
    }

    if (art.grid[y][x] === targetIdx) return; // already target block

    const newGrid = art.grid.map((row, rY) => {
      if (rY !== y) return row;
      const newRow = [...row];
      newRow[x] = targetIdx;
      return newRow;
    });

    // Recompute counts
    const newCounts: Record<string, number> = {};
    for (let r = 0; r < art.height; r++) {
      for (let c = 0; c < art.width; c++) {
        const blk = newPalette[newGrid[r][c]];
        if (blk) {
          newCounts[blk.id] = (newCounts[blk.id] || 0) + 1;
        }
      }
    }

    const updatedArt: ConvertedArt = {
      ...art,
      grid: newGrid,
      blockPalette: newPalette,
      counts: newCounts,
    };

    pushArtState(updatedArt);
  }, [art, pushArtState]);

  // Open Replace modal for a specific block or general
  const handleOpenBlockReplacer = useCallback((sourceBlockId?: string | null) => {
    setReplacerSourceBlockId(sourceBlockId || null);
    setShowReplacerModal(true);
  }, []);

  // When a source image is loaded, automatically trigger art generation
  const handleImageLoaded = (img: HTMLImageElement, name: string) => {
    setSourceImage(img);
    setSourceImageName(name);
  };

  // Trigger initial generation once image is loaded
  useEffect(() => {
    if (sourceImage && !art) {
      handleGenerateArt();
    }
  }, [sourceImage, handleGenerateArt, art]);

  // Toggle placed block mark
  const handleBlockMarkToggle = (x: number, y: number) => {
    if (!art) return;
    setArt((prev) => {
      if (!prev) return null;
      const nextPlaced = prev.placedState.map((row) => [...row]);
      nextPlaced[y][x] = !nextPlaced[y][x];
      return {
        ...prev,
        placedState: nextPlaced,
      };
    });
  };

  // Mark an entire layer placed or unplaced
  const handleMarkEntireLayer = (layerIndex: number, markAs: boolean) => {
    if (!art) return;
    setArt((prev) => {
      if (!prev) return null;
      const nextPlaced = prev.placedState.map((row, y) => {
        if (y === layerIndex) {
          return new Array(prev.width).fill(markAs);
        }
        return [...row];
      });
      return {
        ...prev,
        placedState: nextPlaced,
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeBlockCount={activeBlockIds.size}
        totalBlocksCount={art?.totalBlocks || 0}
        hasArt={Boolean(art)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenFullscreenEditor={() => setIsFullscreenEditorOpen(true)}
        art={art}
      />

      {/* Dynamic Contextual Contents Header Bar */}
      <ContentHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        art={art}
        settings={settings}
        activeBlockCount={activeBlockIds.size}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenFullscreenEditor={() => setIsFullscreenEditorOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'generator' && (
          <div className="space-y-4">
            {/* Mobile View Switcher (Visible on small & medium screens < lg) */}
            <div className="lg:hidden flex items-center bg-[#121217] p-1 rounded-xl border border-[#242434] shadow-sm">
              <button
                id="mobile-tab-canvas"
                onClick={() => setMobileTab('canvas')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  mobileTab === 'canvas'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Canvas & Blueprint {art ? `(${art.width}×${art.height})` : ''}</span>
              </button>
              <button
                id="mobile-tab-controls"
                onClick={() => setMobileTab('controls')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  mobileTab === 'controls'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Image & Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Image Upload & Conversion Controls (4 columns) */}
              <div
                className={`space-y-4 lg:col-span-4 ${
                  mobileTab === 'controls' ? 'block' : 'hidden lg:block'
                }`}
              >
                <ImageUploader
                  settings={settings}
                  setSettings={setSettings}
                  onImageLoaded={handleImageLoaded}
                  onGenerate={handleGenerateArt}
                  isGenerating={isGenerating}
                  hasLoadedImage={Boolean(sourceImage)}
                  activeBlockCount={activeBlockIds.size}
                />

                {/* Mobile helper jump to canvas */}
                <div className="lg:hidden pt-2">
                  <button
                    onClick={() => setMobileTab('canvas')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow cursor-pointer"
                  >
                    <span>View Canvas & Blueprint</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Canvas & Blueprint (8 columns) */}
              <div
                className={`space-y-4 lg:col-span-8 ${
                  mobileTab === 'canvas' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* Mobile header info and quick jump to settings */}
                <div className="lg:hidden flex items-center justify-between bg-[#14141c] px-3 py-2 rounded-xl border border-[#222230]">
                  <span className="text-xs text-slate-300">
                    Blueprint:{' '}
                    <strong className="text-[#4ade80] font-mono">
                      {art ? `${art.width}×${art.height}` : 'Not generated'}
                    </strong>
                  </span>
                  <button
                    onClick={() => setMobileTab('controls')}
                    className="text-xs text-[#4ade80] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Edit Image / Size ⚙</span>
                  </button>
                </div>

                <PixelArtCanvas
                  art={art}
                  gridSettings={gridSettings}
                  setGridSettings={setGridSettings}
                  highlightBlockId={highlightBlockId}
                  setHighlightBlockId={setHighlightBlockId}
                  onBlockMarkToggle={handleBlockMarkToggle}
                  isolatedLayer={isolatedLayer}
                  setIsolatedLayer={setIsolatedLayer}
                  onOpenCommands={() => setActiveTab('commands')}
                  onOpenLayerGuide={() => setActiveTab('layerGuide')}
                  onDownloadHd={() => setShowExportModal(true)}
                  onOpenBlockReplacer={handleOpenBlockReplacer}
                  onOpenFullscreenEditor={() => setIsFullscreenEditorOpen(true)}
                  onReplaceBlock={handleReplaceBlock}
                  onPaintBlock={handlePaintBlock}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                />

                {/* Download Section directly after canvas at the bottom */}
                {art && (
                  <DownloadSection
                    art={art}
                    settings={settings}
                    gridSettings={gridSettings}
                    onOpenExportModal={() => setShowExportModal(true)}
                    onOpenLayerGuide={() => setActiveTab('layerGuide')}
                    onOpenCommands={() => setActiveTab('commands')}
                  />
                )}
              </div>
            </div>

            {/* Comprehensive SEO & Editorial Guide Content (800+ Words with Thumbnail Cards) */}
            <HomepageGuideContent
              onNavigateTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'commandConverter' && (
          <CommandToArtView
            onApplyArtToWorkspace={(newArt, name) => {
              pushArtState(newArt);
              setSettings((prev) => ({
                ...prev,
                width: newArt.width,
                height: newArt.height,
              }));
              setSourceImageName(name || 'command-art');
              setActiveTab('generator');
            }}
            onOpenFullscreenEditor={(newArt) => {
              pushArtState(newArt);
              setSettings((prev) => ({
                ...prev,
                width: newArt.width,
                height: newArt.height,
              }));
              setIsFullscreenEditorOpen(true);
            }}
          />
        )}

        {activeTab === 'palette' && (
          <PaletteManager
            activeBlockIds={activeBlockIds}
            setActiveBlockIds={setActiveBlockIds}
            onApplyPalette={() => {
              handleGenerateArt();
              setActiveTab('generator');
            }}
          />
        )}

        {activeTab === 'layerGuide' && art && (
          <LayerGuideView
            art={art}
            settings={settings}
            isolatedLayer={isolatedLayer}
            setIsolatedLayer={setIsolatedLayer}
            onBlockMarkToggle={handleBlockMarkToggle}
            onMarkEntireLayer={handleMarkEntireLayer}
          />
        )}

        {activeTab === 'materials' && art && (
          <MaterialsList
            art={art}
            highlightBlockId={highlightBlockId}
            setHighlightBlockId={setHighlightBlockId}
            onSelectTab={setActiveTab}
            onOpenBlockReplacer={handleOpenBlockReplacer}
            onOpenFullscreenEditor={() => setIsFullscreenEditorOpen(true)}
          />
        )}

        {activeTab === 'commands' && art && (
          <CommandsModal art={art} settings={settings} />
        )}
      </main>

      {/* Export HD Blueprint Image Modal */}
      {art && (
        <ExportModal
          art={art}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Block Replacer / Swap Modal */}
      {art && (
        <BlockReplacerModal
          isOpen={showReplacerModal}
          onClose={() => setShowReplacerModal(false)}
          art={art}
          onReplaceBlock={handleReplaceBlock}
          initialSourceBlockId={replacerSourceBlockId}
        />
      )}

      {/* Full-Screen Dedicated Minecraft Blueprint Canvas & Block Library Editor */}
      {art && (
        <FullscreenEditor
          isOpen={isFullscreenEditorOpen}
          onClose={() => setIsFullscreenEditorOpen(false)}
          art={art}
          onPaintBlock={handlePaintBlock}
          onReplaceBlock={handleReplaceBlock}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onOpenExportModal={() => {
            setIsFullscreenEditorOpen(false);
            setShowExportModal(true);
          }}
          gridSettings={gridSettings}
          setGridSettings={setGridSettings}
        />
      )}

      {/* Rich Footer with Navigation, Minecraft Tips & Export Formats */}
      <Footer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        art={art}
        onOpenExportModal={() => setShowExportModal(true)}
      />
    </div>
  );
}
