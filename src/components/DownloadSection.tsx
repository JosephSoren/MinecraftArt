import React, { useState } from 'react';
import {
  Download,
  FileText,
  Terminal,
  Sliders,
  Check,
  Grid,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ConvertedArt, GridSettings, PixelArtSettings } from '../types';
import {
  downloadArtImagePng,
  downloadMaterialsShoppingList,
  downloadMcFunctionCommands,
} from '../utils/exportHelpers';

interface DownloadSectionProps {
  art: ConvertedArt | null;
  settings: PixelArtSettings;
  gridSettings: GridSettings;
  onOpenExportModal: () => void;
  onOpenLayerGuide: () => void;
  onOpenCommands: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  art,
  settings,
  gridSettings,
  onOpenExportModal,
  onOpenLayerGuide,
  onOpenCommands,
}) => {
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingList, setDownloadingList] = useState(false);
  const [downloadingCommands, setDownloadingCommands] = useState(false);
  const [withGrid, setWithGrid] = useState(true);
  const [withTextures, setWithTextures] = useState(true);

  if (!art) return null;

  const handleQuickPngDownload = () => {
    setDownloadingPng(true);
    setTimeout(() => {
      try {
        downloadArtImagePng(art, {
          scale: 8,
          withGrid,
          withTextures,
          filename: `minecraft_art_${art.width}x${art.height}.png`,
        });
      } catch (err) {
        console.error('Download failed', err);
      } finally {
        setTimeout(() => setDownloadingPng(false), 1200);
      }
    }, 100);
  };

  const handleMaterialsDownload = () => {
    setDownloadingList(true);
    setTimeout(() => {
      try {
        downloadMaterialsShoppingList(art);
      } catch (err) {
        console.error('List download failed', err);
      } finally {
        setTimeout(() => setDownloadingList(false), 1200);
      }
    }, 100);
  };

  const handleCommandsDownload = () => {
    setDownloadingCommands(true);
    setTimeout(() => {
      try {
        downloadMcFunctionCommands(art, settings.orientation);
      } catch (err) {
        console.error('Commands download failed', err);
      } finally {
        setTimeout(() => setDownloadingCommands(false), 1200);
      }
    }, 100);
  };

  return (
    <div
      id="canvas-download-section"
      className="bg-[#121217] border border-[#242434] rounded-2xl p-4 sm:p-5 shadow-xl text-slate-200 space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20202a] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#14261c] flex items-center justify-center border border-emerald-500/40 text-[#4ade80] flex-shrink-0 shadow-sm">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
              Download & Export Blueprint
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Save your generated pixel art as a high-res image, materials list, or in-game commands
            </p>
          </div>
        </div>

        {/* Quick format toggles */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setWithGrid(!withGrid)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              withGrid
                ? 'bg-[#14261c] border-emerald-500/60 text-[#4ade80]'
                : 'bg-[#181824] border-[#262636] text-slate-400'
            }`}
            title="Toggle 1x1 block grid lines in quick download"
          >
            <Grid className="w-3 h-3" />
            <span>Grid Overlay</span>
          </button>

          <button
            onClick={() => setWithTextures(!withTextures)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              withTextures
                ? 'bg-[#14261c] border-emerald-500/60 text-[#4ade80]'
                : 'bg-[#181824] border-[#262636] text-slate-400'
            }`}
            title="Toggle authentic 16x16 textures vs flat colors"
          >
            <Box className="w-3 h-3" />
            <span>Textures</span>
          </button>
        </div>
      </div>

      {/* Main Download Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Primary Download Image (PNG) */}
        <button
          id="btn-quick-download-png"
          onClick={handleQuickPngDownload}
          disabled={downloadingPng}
          className="flex flex-col items-start justify-between p-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-950/60 transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] min-h-[76px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-slate-950" />
              <span className="font-bold text-sm sm:text-base">
                {downloadingPng ? 'Generating PNG...' : 'Download Image'}
              </span>
            </div>
            {downloadingPng ? (
              <Check className="w-4 h-4 text-slate-950 animate-bounce" />
            ) : (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950 font-bold">
                PNG
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-900/80 font-medium mt-1">
            Instant 1-click download with authentic textures
          </p>
        </button>

        {/* 2. HD Blueprint with Custom Scales & Rulers */}
        <button
          id="btn-open-hd-export-modal"
          onClick={onOpenExportModal}
          className="flex flex-col items-start justify-between p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] text-slate-200 border border-[#282838] hover:border-emerald-500/50 transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] min-h-[76px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#4ade80]" />
              <span className="font-bold text-sm text-white">HD Blueprint</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#102418] text-[#4ade80] border border-emerald-500/30">
              Custom
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Custom resolution, coordinate numbers & chunk lines
          </p>
        </button>

        {/* 3. Download Materials Shopping List */}
        <button
          id="btn-download-materials-list"
          onClick={handleMaterialsDownload}
          disabled={downloadingList}
          className="flex flex-col items-start justify-between p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] text-slate-200 border border-[#282838] hover:border-emerald-500/50 transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] min-h-[76px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#4ade80]" />
              <span className="font-bold text-sm text-white">
                {downloadingList ? 'Saving List...' : 'Materials List'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#102418] text-[#4ade80] border border-emerald-500/30">
              .TXT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Survival blocks needed, stack counts & shulker totals
          </p>
        </button>

        {/* 4. Download Minecraft Function Script */}
        <button
          id="btn-download-commands-file"
          onClick={handleCommandsDownload}
          disabled={downloadingCommands}
          className="flex flex-col items-start justify-between p-3.5 rounded-xl bg-[#181824] hover:bg-[#202030] text-slate-200 border border-[#282838] hover:border-emerald-500/50 transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] min-h-[76px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#4ade80]" />
              <span className="font-bold text-sm text-white">
                {downloadingCommands ? 'Saving...' : 'Commands Script'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#102418] text-[#4ade80] border border-emerald-500/30">
              .mcfunction
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Automated /setblock commands for instant building
          </p>
        </button>
      </div>

      {/* Helpful Quick Links Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1c1c26] text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span>Ready to build in-game?</span>
          <button
            onClick={onOpenLayerGuide}
            className="text-[#4ade80] hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Layer-by-Layer Guide</span>
          </button>
          <span className="text-slate-600">&bull;</span>
          <button
            onClick={onOpenCommands}
            className="text-slate-300 hover:text-white font-medium cursor-pointer"
          >
            Copy in-game commands
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          {art.width}×{art.height} ({art.totalBlocks.toLocaleString()} blocks &bull; {art.blockPalette.length} unique types)
        </div>
      </div>
    </div>
  );
};
