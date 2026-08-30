import React, { useState, useEffect } from 'react';
import {
  Box,
  Layers,
  Terminal,
  Sparkles,
  SlidersHorizontal,
  Image as ImageIcon,
  Menu,
  X,
  Download,
  FileText,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Compass,
  Check,
  Edit3,
} from 'lucide-react';
import { ConvertedArt } from '../types';

interface NavbarProps {
  activeTab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials';
  setActiveTab: (tab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials') => void;
  activeBlockCount: number;
  totalBlocksCount: number;
  hasArt: boolean;
  onOpenExportModal?: () => void;
  onOpenFullscreenEditor?: () => void;
  art?: ConvertedArt | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeBlockCount,
  totalBlocksCount,
  hasArt,
  onOpenExportModal,
  onOpenFullscreenEditor,
  art,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close hamburger menu on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (tab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-[#0e0e13]/95 backdrop-blur-md border-b border-[#1e1e28] text-slate-100 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div
              className="flex items-center space-x-3 cursor-pointer select-none"
              onClick={() => handleNavClick('generator')}
            >
              <div className="w-10 h-10 rounded-xl bg-[#14261c] flex items-center justify-center shadow-inner border border-emerald-500/40 flex-shrink-0">
                {/* Stylized Minecraft Grass/Pixel Block */}
                <div className="w-5 h-5 sm:w-6 sm:h-6 grid grid-cols-2 grid-rows-2 gap-0.5 rounded overflow-hidden">
                  <div className="bg-emerald-400"></div>
                  <div className="bg-emerald-500"></div>
                  <div className="bg-amber-800"></div>
                  <div className="bg-amber-900"></div>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                    Minecraft<span className="text-[#4ade80]">PixelArt</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30 font-mono">
                    1.21+
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Convert images & commands into Minecraft block blueprints
                </p>
              </div>
            </div>

            {/* Desktop Navigation tabs (Hidden on mobile < md) */}
            <nav className="hidden md:flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <button
                id="nav-generator-tab"
                onClick={() => handleNavClick('generator')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === 'generator'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-[#181822]'
                }`}
              >
                <ImageIcon className="w-4 h-4 flex-shrink-0" />
                <span>Canvas</span>
              </button>

              <button
                id="nav-commandconverter-tab"
                onClick={() => handleNavClick('commandConverter')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === 'commandConverter'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-[#181822]'
                }`}
              >
                <Terminal className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>Commands to Art</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                  NEW
                </span>
              </button>

              <button
                id="nav-palette-tab"
                onClick={() => handleNavClick('palette')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === 'palette'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-[#181822]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
                <span>Palette</span>
                <span
                  className={`ml-0.5 text-xs px-1.5 py-0.2 rounded-full border font-mono ${
                    activeTab === 'palette'
                      ? 'bg-emerald-600/40 text-slate-950 border-emerald-600 font-bold'
                      : 'bg-[#181824] text-emerald-400 border-[#2a2a3a]'
                  }`}
                >
                  {activeBlockCount}
                </span>
              </button>

              <button
                id="nav-layerguide-tab"
                onClick={() => handleNavClick('layerGuide')}
                disabled={!hasArt}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 ${
                  !hasArt
                    ? 'opacity-35 cursor-not-allowed text-slate-600'
                    : activeTab === 'layerGuide'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer'
                    : 'text-slate-300 hover:text-white hover:bg-[#181822] cursor-pointer'
                }`}
                title={!hasArt ? 'Generate pixel art first to view layer guide' : 'Open Layer-by-Layer Guide'}
              >
                <Layers className="w-4 h-4 flex-shrink-0" />
                <span>Layer Guide</span>
              </button>

              <button
                id="nav-materials-tab"
                onClick={() => handleNavClick('materials')}
                disabled={!hasArt}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 ${
                  !hasArt
                    ? 'opacity-35 cursor-not-allowed text-slate-600'
                    : activeTab === 'materials'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer'
                    : 'text-slate-300 hover:text-white hover:bg-[#181822] cursor-pointer'
                }`}
              >
                <Box className="w-4 h-4 flex-shrink-0" />
                <span>Materials</span>
                {hasArt && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full border font-mono ${
                      activeTab === 'materials'
                        ? 'bg-emerald-600/40 text-slate-950 border-emerald-600 font-bold'
                        : 'bg-[#181824] text-slate-300 border-[#2a2a3a]'
                    }`}
                  >
                    {totalBlocksCount.toLocaleString()}
                  </span>
                )}
              </button>

              <button
                id="nav-commands-tab"
                onClick={() => handleNavClick('commands')}
                disabled={!hasArt}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 ${
                  !hasArt
                    ? 'opacity-35 cursor-not-allowed text-slate-600'
                    : activeTab === 'commands'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20 cursor-pointer'
                    : 'text-slate-300 hover:text-white hover:bg-[#181822] cursor-pointer'
                }`}
              >
                <Terminal className="w-4 h-4 flex-shrink-0" />
                <span>Export Cmds</span>
              </button>
            </nav>

            {/* Right Side: Quick Action or Hamburger Toggle Button */}
            <div className="flex items-center space-x-2">
              {/* Quick Edit Blueprint Shortcut Button (Desktop) */}
              {hasArt && onOpenFullscreenEditor && (
                <button
                  id="nav-quick-edit-btn"
                  onClick={onOpenFullscreenEditor}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                  title="Open full-screen block editor with palette sidebar"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Edit Blueprint</span>
                </button>
              )}

              {/* Quick Export Blueprint Shortcut Button (Desktop) */}
              {hasArt && onOpenExportModal && (
                <button
                  id="nav-quick-export-btn"
                  onClick={onOpenExportModal}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#14261c] hover:bg-[#1b3627] text-[#4ade80] border border-emerald-500/30 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              )}

              {/* Hamburger Menu Toggle Button */}
              <button
                id="hamburger-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-[#14141c] hover:bg-[#1e1e28] text-slate-200 hover:text-white border border-[#242434] transition-all cursor-pointer flex items-center space-x-1.5"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-200" />
                )}
                <span className="text-xs font-semibold text-slate-300 md:hidden">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Side Drawer Content Panel */}
          <div className="relative w-full max-w-sm bg-[#0f0f16] border-l border-[#242436] text-slate-200 shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#20202e] flex items-center justify-between bg-[#13131c]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#14261c] flex items-center justify-center border border-emerald-500/40">
                  <div className="w-4 h-4 grid grid-cols-2 grid-rows-2 gap-0.5 rounded overflow-hidden">
                    <div className="bg-emerald-400" />
                    <div className="bg-emerald-500" />
                    <div className="bg-amber-800" />
                    <div className="bg-amber-900" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Minecraft Pixel Art</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Navigation Menu & Tools</p>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-[#1a1a26] hover:bg-[#262638] text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 space-y-6 flex-1">
              {/* Build Status Card if Art exists */}
              {hasArt && art && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#132219] to-[#0f1713] border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Active Pixel Blueprint
                    </span>
                    <span className="font-mono text-[#4ade80] font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {art.width}×{art.height}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-500/20 font-mono">
                    <div className="bg-black/30 p-1.5 rounded-lg text-slate-300">
                      <div className="text-[10px] text-slate-400 uppercase">Blocks</div>
                      <div className="font-bold text-white">{art.totalBlocks.toLocaleString()}</div>
                    </div>
                    <div className="bg-black/30 p-1.5 rounded-lg text-slate-300">
                      <div className="text-[10px] text-slate-400 uppercase">Stacks</div>
                      <div className="font-bold text-white">~{Math.ceil(art.totalBlocks / 64)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                  Main Navigation
                </div>

                <button
                  onClick={() => handleNavClick('generator')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'generator'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'hover:bg-[#1a1a26] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Pixel Art Canvas & Studio</div>
                      <div className={`text-[10px] ${activeTab === 'generator' ? 'text-slate-900' : 'text-slate-400'}`}>
                        Upload images & preview block blueprints
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <button
                  onClick={() => handleNavClick('commandConverter')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'commandConverter'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'hover:bg-[#1a1a26] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Terminal className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <div className="text-left">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <span>Commands to Art Converter</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                          NEW
                        </span>
                      </div>
                      <div className={`text-[10px] ${activeTab === 'commandConverter' ? 'text-slate-900' : 'text-slate-400'}`}>
                        Convert /setblock or /fill to block images
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <button
                  onClick={() => handleNavClick('palette')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'palette'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'hover:bg-[#1a1a26] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Block Palette Manager</div>
                      <div className={`text-[10px] ${activeTab === 'palette' ? 'text-slate-900' : 'text-slate-400'}`}>
                        {activeBlockCount} active blocks enabled
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === 'palette' ? 'bg-slate-950/20 text-slate-950' : 'bg-[#181824] text-emerald-400 border border-[#2a2a3a]'
                  }`}>
                    {activeBlockCount}
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (hasArt) handleNavClick('layerGuide');
                  }}
                  disabled={!hasArt}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    !hasArt
                      ? 'opacity-35 cursor-not-allowed text-slate-600'
                      : activeTab === 'layerGuide'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md cursor-pointer'
                      : 'hover:bg-[#1a1a26] text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Layers className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Step-by-Step Layer Guide</div>
                      <div className={`text-[10px] ${activeTab === 'layerGuide' ? 'text-slate-900' : 'text-slate-400'}`}>
                        Layer-by-layer survival build helper
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <button
                  onClick={() => {
                    if (hasArt) handleNavClick('materials');
                  }}
                  disabled={!hasArt}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    !hasArt
                      ? 'opacity-35 cursor-not-allowed text-slate-600'
                      : activeTab === 'materials'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md cursor-pointer'
                      : 'hover:bg-[#1a1a26] text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Box className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Materials Shopping List</div>
                      <div className={`text-[10px] ${activeTab === 'materials' ? 'text-slate-900' : 'text-slate-400'}`}>
                        Total block stacks & inventory planning
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <button
                  onClick={() => {
                    if (hasArt) handleNavClick('commands');
                  }}
                  disabled={!hasArt}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    !hasArt
                      ? 'opacity-35 cursor-not-allowed text-slate-600'
                      : activeTab === 'commands'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md cursor-pointer'
                      : 'hover:bg-[#1a1a26] text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Terminal className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">In-Game Commands (/setblock)</div>
                      <div className={`text-[10px] ${activeTab === 'commands' ? 'text-slate-900' : 'text-slate-400'}`}>
                        Command blocks & .mcfunction scripts
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>
              </div>

              {/* Quick Actions & Export Shortcuts */}
              {hasArt && (
                <div className="space-y-2 pt-2 border-t border-[#20202e]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                    Actions & Exports
                  </div>

                  {onOpenFullscreenEditor && (
                    <button
                      id="drawer-edit-btn"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenFullscreenEditor();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow cursor-pointer hover:scale-[1.01]"
                    >
                      <Edit3 className="w-4 h-4 text-slate-950" />
                      <span>Edit Blueprint (Fullscreen)</span>
                    </button>
                  )}

                  {onOpenExportModal && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenExportModal();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#14261c] hover:bg-[#1c3628] border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 shadow cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Export HD Blueprint (PNG)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Version & Compatibility info */}
              <div className="pt-4 border-t border-[#20202e] space-y-2 text-xs text-slate-400">
                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#4ade80]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Minecraft 1.21+ & 1.20 Compatible</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  All 16×16 authentic block textures are rendered client-side for ultra-fast, zero-lag conversion.
                </p>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[#20202e] bg-[#0d0d12] text-center text-[11px] text-slate-400">
              Minecraft Pixel Art Generator &bull; v2.4.0
            </div>
          </div>
        </div>
      )}
    </>
  );
};
