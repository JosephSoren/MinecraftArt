import React from 'react';
import {
  Box,
  Layers,
  Terminal,
  SlidersHorizontal,
  Image as ImageIcon,
  Download,
  ArrowUp,
  Sparkles,
  Compass,
  FileText,
  ShieldCheck,
  Hammer,
} from 'lucide-react';
import { ConvertedArt } from '../types';

interface FooterProps {
  activeTab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials';
  setActiveTab: (tab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials') => void;
  art: ConvertedArt | null;
  onOpenExportModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  activeTab,
  setActiveTab,
  art,
  onOpenExportModal,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="app-footer" className="border-t border-[#1e1e28] bg-[#09090d] text-slate-400 mt-12 transition-colors">
      {/* Top Banner with Quick Stats if art is loaded */}
      {art && (
        <div className="border-b border-[#181822] bg-[#0e0e14]/60 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300">Active Build:</span>
              <span className="font-mono text-[#4ade80] font-bold">
                {art.width}×{art.height}
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="font-mono text-slate-300">
                {art.totalBlocks.toLocaleString()} total blocks
              </span>
              <span className="text-slate-600 hidden sm:inline">&bull;</span>
              <span className="text-slate-400 hidden sm:inline">
                ~{Math.ceil(art.totalBlocks / 64)} stacks ({art.blockPalette.length} unique blocks)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setActiveTab('generator');
                  scrollToTop();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#14261c] hover:bg-[#1b3627] text-[#4ade80] border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                View Canvas
              </button>
              {onOpenExportModal && (
                <button
                  onClick={onOpenExportModal}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#222232] text-slate-200 border border-[#2a2a3c] text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Export Blueprint
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Links & Information Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Column 1: Brand & Overview */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#14261c] flex items-center justify-center border border-emerald-500/40 shadow-inner">
                <div className="w-4 h-4 grid grid-cols-2 grid-rows-2 gap-0.5 rounded overflow-hidden">
                  <div className="bg-emerald-400" />
                  <div className="bg-emerald-500" />
                  <div className="bg-amber-800" />
                  <div className="bg-amber-900" />
                </div>
              </div>
              <span className="font-bold text-base text-white tracking-tight">
                Minecraft<span className="text-[#4ade80]">PixelArt</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Professional pixel art blueprint generator for Minecraft Java & Bedrock. Converts images into authentic 16×16 texture patterns, layer-by-layer build guides, and /setblock commands.
            </p>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-400/90 bg-[#102218] px-2.5 py-1.5 rounded-lg border border-emerald-500/25 w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Minecraft 1.21+ (Tricky Trials)</span>
            </div>
          </div>

          {/* Column 2: Navigation & Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Studio Navigation</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    setActiveTab('generator');
                    scrollToTop();
                  }}
                  className={`flex items-center space-x-2 hover:text-[#4ade80] transition-colors cursor-pointer ${
                    activeTab === 'generator' ? 'text-[#4ade80] font-semibold' : 'text-slate-400'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Pixel Art Canvas & Studio</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('palette');
                    scrollToTop();
                  }}
                  className={`flex items-center space-x-2 hover:text-[#4ade80] transition-colors cursor-pointer ${
                    activeTab === 'palette' ? 'text-[#4ade80] font-semibold' : 'text-slate-400'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Block Palette Manager</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (art) {
                      setActiveTab('layerGuide');
                      scrollToTop();
                    }
                  }}
                  disabled={!art}
                  className={`flex items-center space-x-2 transition-colors ${
                    !art
                      ? 'opacity-40 cursor-not-allowed text-slate-600'
                      : activeTab === 'layerGuide'
                      ? 'text-[#4ade80] font-semibold cursor-pointer'
                      : 'hover:text-[#4ade80] text-slate-400 cursor-pointer'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Layer-by-Layer Build Guide</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (art) {
                      setActiveTab('materials');
                      scrollToTop();
                    }
                  }}
                  disabled={!art}
                  className={`flex items-center space-x-2 transition-colors ${
                    !art
                      ? 'opacity-40 cursor-not-allowed text-slate-600'
                      : activeTab === 'materials'
                      ? 'text-[#4ade80] font-semibold cursor-pointer'
                      : 'hover:text-[#4ade80] text-slate-400 cursor-pointer'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Materials Shopping List</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (art) {
                      setActiveTab('commands');
                      scrollToTop();
                    }
                  }}
                  disabled={!art}
                  className={`flex items-center space-x-2 transition-colors ${
                    !art
                      ? 'opacity-40 cursor-not-allowed text-slate-600'
                      : activeTab === 'commands'
                      ? 'text-[#4ade80] font-semibold cursor-pointer'
                      : 'hover:text-[#4ade80] text-slate-400 cursor-pointer'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>In-Game /setblock Commands</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: In-Game Building Tips */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <Hammer className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Survival Building Tips</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 leading-normal">
              <li className="flex items-start space-x-2">
                <span className="text-[#4ade80] font-bold">&bull;</span>
                <span>
                  <strong className="text-slate-300">Chunk Alignment:</strong> Build inside 16×16 chunk boundaries (F3+G in Java) for optimal map rendering.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#4ade80] font-bold">&bull;</span>
                <span>
                  <strong className="text-slate-300">Map Art Scale:</strong> Standard 1:1 Minecraft map item requires exactly 128×128 horizontal blocks.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#4ade80] font-bold">&bull;</span>
                <span>
                  <strong className="text-slate-300">Lighting:</strong> Place sea lanterns or glowstone behind non-solid blocks to prevent mob spawning on art.
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Supported Formats & Exporting */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Export Capabilities</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#12121a] border border-[#202030] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-semibold">HD Blueprint Image</span>
                  <span className="text-[10px] font-mono bg-[#14261c] text-[#4ade80] px-1.5 py-0.2 rounded border border-emerald-500/30">PNG</span>
                </div>
                <p className="text-[11px] text-slate-400">Up to 16× scale with block coordinate rulers & chunk grids</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#12121a] border border-[#202030] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-semibold">In-Game Functions</span>
                  <span className="text-[10px] font-mono bg-[#181824] text-slate-300 px-1.5 py-0.2 rounded border border-[#2c2c3e]">.mcfunction</span>
                </div>
                <p className="text-[11px] text-slate-400">Execute in Minecraft command blocks or datapack functions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Copyright, Legal Disclaimer & Scroll to Top */}
        <div className="border-t border-[#181824] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-slate-400">
              Minecraft Pixel Art Generator &bull; Designed for builders, redstoners, and map artists
            </p>
            <p className="text-[11px] text-slate-600">
              NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-slate-500">v2.4.0</span>
            <button
              onClick={scrollToTop}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#14141d] hover:bg-[#1e1e2c] text-slate-300 hover:text-white border border-[#242436] transition-colors cursor-pointer text-xs"
              title="Back to Top"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5 text-[#4ade80]" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
