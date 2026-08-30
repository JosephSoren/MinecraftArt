import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  Download,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ConvertedArt, PixelArtSettings, MinecraftBlock } from '../types';
import {
  getLayerRuns,
  getLayerData,
  generatePrintableLayerGuideHtml,
  generateTextLayerGuide,
} from '../utils/layerGuideGenerator';
import { getBlockSwatchUrl } from '../utils/textureRenderer';

interface LayerGuideViewProps {
  art: ConvertedArt;
  settings: PixelArtSettings;
  isolatedLayer: number | null;
  setIsolatedLayer: (layer: number | null) => void;
  onBlockMarkToggle?: (x: number, y: number) => void;
  onMarkEntireLayer?: (layerIndex: number, markAs: boolean) => void;
}

export const LayerGuideView: React.FC<LayerGuideViewProps> = ({
  art,
  settings,
  isolatedLayer,
  setIsolatedLayer,
  onBlockMarkToggle,
  onMarkEntireLayer,
}) => {
  // Current active layer index (0 to height-1)
  const [currentLayer, setCurrentLayer] = useState<number>(isolatedLayer ?? 0);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Sync isolated layer
  useEffect(() => {
    if (isolatedLayer !== null) {
      setCurrentLayer(isolatedLayer);
    }
  }, [isolatedLayer]);

  const height = art.height;
  const width = art.width;

  // Handle layer change
  const handleSetLayer = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(height - 1, newIdx));
    setCurrentLayer(clamped);
    setIsolatedLayer(clamped);
  };

  // Keyboard navigation for layers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        handleSetLayer(currentLayer + 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        handleSetLayer(currentLayer - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLayer, height]);

  // Layer data
  const runs = useMemo(() => getLayerRuns(art, currentLayer), [art, currentLayer]);
  const layerData = useMemo(() => getLayerData(art, currentLayer), [art, currentLayer]);

  // Overall build progress
  const totalPlaced = art.placedState
    ? art.placedState.reduce((acc, row) => acc + row.filter(Boolean).length, 0)
    : 0;
  const overallPercent = Math.round((totalPlaced / art.totalBlocks) * 100);

  // Current layer progress
  const layerPlacedCount = art.placedState[currentLayer]
    ? art.placedState[currentLayer].filter(Boolean).length
    : 0;
  const isLayerFullyPlaced = layerPlacedCount === width;

  // Export actions
  const handlePrintOrPdf = () => {
    const html = generatePrintableLayerGuideHtml(art, settings.orientation);
    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        handleDownloadHtmlFile();
      }
    } catch {
      handleDownloadHtmlFile();
    }
  };

  const handleDownloadHtmlFile = () => {
    const html = generatePrintableLayerGuideHtml(art, settings.orientation);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minecraft_pixel_art_layer_guide.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTextGuide = () => {
    const text = generateTextLayerGuide(art, settings.orientation);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Label calculation
  const isVertical = settings.orientation === 'vertical';
  // In vertical wall builds, layer 0 is top in canvas, but Y=0 in Minecraft is the bottom ground!
  const inGameY = isVertical ? height - 1 - currentLayer : currentLayer;
  const layerTitle = isVertical
    ? `Layer ${height - currentLayer} of ${height} (Elevation Y = ~${inGameY})`
    : `Row ${currentLayer + 1} of ${height} (Along Z = ~${currentLayer})`;

  return (
    <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl text-slate-200 space-y-6">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#20202a] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#4ade80]" />
            <h2 className="text-lg font-bold text-white">In-Game Layer-by-Layer Builder Guide</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#14261c] border border-emerald-500/30 text-[#4ade80] font-semibold">
              Survival Assistant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build step-by-step in Minecraft without losing your place. Mark completed rows as you go.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="print-guide-btn"
            onClick={handlePrintOrPdf}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-sm transition-colors cursor-pointer"
            title="Open printable guide in new tab to print or save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>

          <button
            id="download-html-guide-btn"
            onClick={handleDownloadHtmlFile}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 text-xs font-semibold border border-[#262636] transition-colors cursor-pointer"
            title="Download standalone offline HTML guide file"
          >
            <Download className="w-4 h-4 text-[#4ade80]" />
            <span>Export HTML Guide</span>
          </button>

          <button
            id="copy-text-guide-btn"
            onClick={handleCopyTextGuide}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 text-xs font-semibold border border-[#262636] transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedText ? 'Copied Guide!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Layer Selector & Progress Bar */}
      <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Previous / Next buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              id="prev-layer-btn"
              onClick={() => handleSetLayer(currentLayer - 1)}
              disabled={currentLayer === 0}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222230] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium text-slate-200 border border-[#262636] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Layer</span>
            </button>

            <span className="font-bold text-sm text-white sm:hidden">{layerTitle}</span>

            <button
              id="next-layer-btn"
              onClick={() => handleSetLayer(currentLayer + 1)}
              disabled={currentLayer === height - 1}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222230] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium text-slate-200 border border-[#262636] transition-colors cursor-pointer"
            >
              <span>Next Layer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current Layer Title (Desktop) */}
          <div className="hidden sm:block text-center">
            <div className="font-bold text-sm text-white">{layerTitle}</div>
            <div className="text-xs text-slate-400">
              Layer Progress: <span className="font-mono text-[#4ade80] font-semibold">{layerPlacedCount}/{width} blocks</span>
            </div>
          </div>

          {/* Mark Layer Completed Button */}
          <div className="flex items-center space-x-2">
            <button
              id="mark-layer-placed-btn"
              onClick={() => onMarkEntireLayer && onMarkEntireLayer(currentLayer, !isLayerFullyPlaced)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isLayerFullyPlaced
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                  : 'bg-[#181824] hover:bg-[#222230] text-[#4ade80] border border-[#262636]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isLayerFullyPlaced ? 'Layer Completed ✓' : 'Mark Layer as Built'}</span>
            </button>
          </div>
        </div>

        {/* Scrub Slider */}
        <div className="pt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Bottom / Start</span>
            <span className="font-mono text-[#4ade80] font-semibold">
              Layer {currentLayer + 1} of {height}
            </span>
            <span>Top / End</span>
          </div>
          <input
            id="layerSlider"
            type="range"
            min="0"
            max={height - 1}
            value={currentLayer}
            onChange={(e) => handleSetLayer(parseInt(e.target.value))}
            className="w-full accent-[#4ade80] cursor-pointer h-2 bg-[#222230] rounded-lg"
          />
        </div>
      </div>

      {/* Main Layer Content: Run-Length Breakdown + Materials for Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 spans): Run-Length Sequence */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">
              Placement Order (Left to Right)
            </h3>
            <span className="text-xs text-slate-400">
              {runs.length} block sequence{runs.length > 1 ? 's' : ''} in this row
            </span>
          </div>

          {/* Sequential Run Chips */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {runs.map((run, idx) => {
              const swatchUrl = getBlockSwatchUrl(run.block);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c0e]/80 border border-[#20202a] hover:border-[#2e2e3e] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs text-slate-500 w-5 text-right">
                      #{idx + 1}
                    </span>

                    <div className="w-8 h-8 rounded-lg border border-[#2a2a3a] overflow-hidden flex-shrink-0 bg-[#181824]">
                      {swatchUrl ? (
                        <img
                          src={swatchUrl}
                          alt={run.block.name}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <div className="w-full h-full" style={{ backgroundColor: run.block.hex }} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">
                          Place {run.count}× {run.block.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Positions: X: <strong className="text-slate-200">{run.startIndex}</strong> through X:{' '}
                        <strong className="text-slate-200">{run.endIndex}</strong> ({run.count} blocks)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-[#181824] text-xs font-mono text-[#4ade80] font-bold border border-[#262636]">
                      {run.count} Blocks
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Block-by-Block Cell Row */}
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1.5">
              Row Visual Blueprint (Click cell to mark as placed in-game):
            </span>
            <div className="flex overflow-x-auto p-2 bg-[#08080b] rounded-xl border border-[#20202a] gap-0.5">
              {layerData.blocks.map((item, xIdx) => {
                const swatchUrl = getBlockSwatchUrl(item.block);
                return (
                  <div
                    key={xIdx}
                    onClick={() => onBlockMarkToggle && onBlockMarkToggle(xIdx, currentLayer)}
                    className={`w-7 h-7 flex-shrink-0 rounded-sm relative cursor-pointer border transition-transform hover:scale-110 ${
                      item.isPlaced
                        ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                        : 'border-[#20202a] hover:border-slate-400'
                    }`}
                    title={`Pos X: ${xIdx} - ${item.block.name} (${item.isPlaced ? 'Placed' : 'Unplaced'})`}
                  >
                    <img
                      src={swatchUrl}
                      alt={item.block.name}
                      className="w-full h-full object-cover rounded-sm"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    {item.isPlaced && (
                      <div className="absolute inset-0 bg-emerald-600/60 flex items-center justify-center text-white text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Layer Materials & Build Summary */}
        <div className="space-y-4">
          <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Inventory for this Layer
            </h3>
            <p className="text-xs text-slate-400">
              Withdraw these blocks from your chests before starting this row:
            </p>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {Object.entries(layerData.blockCounts).map(([blockId, count]) => {
                const block = art.blockPalette.find((b) => b.id === blockId);
                const swatchUrl = block ? getBlockSwatchUrl(block) : '';
                return (
                  <div
                    key={blockId}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#14141c] border border-[#22222e]"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md border border-[#2a2a3a] overflow-hidden flex-shrink-0">
                        {swatchUrl && (
                          <img
                            src={swatchUrl}
                            alt={block?.name}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-slate-200 font-medium truncate max-w-[140px]">
                        {block?.name || blockId}
                      </span>
                    </div>

                    <span className="font-mono text-xs font-bold text-white bg-[#181824] px-2 py-0.5 rounded-md border border-[#262636]">
                      {count}x
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Build Progress Card */}
          <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-300">Total Build Progress</span>
              <span className="font-mono font-bold text-[#4ade80]">{overallPercent}%</span>
            </div>
            <div className="w-full bg-[#181824] rounded-full h-2.5 overflow-hidden border border-[#262636]">
              <div
                className="bg-[#4ade80] h-full transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>{totalPlaced.toLocaleString()} placed</span>
              <span>{(art.totalBlocks - totalPlaced).toLocaleString()} remaining</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
