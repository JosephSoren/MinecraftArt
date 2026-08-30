import React from 'react';
import {
  Image as ImageIcon,
  SlidersHorizontal,
  Layers,
  Box,
  Terminal,
  Download,
  Sliders,
  Sparkles,
  ChevronRight,
  Info,
  Layers as LayersIcon,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { ConvertedArt, PixelArtSettings } from '../types';

interface ContentHeaderProps {
  activeTab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials';
  setActiveTab: (tab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials') => void;
  art: ConvertedArt | null;
  settings: PixelArtSettings;
  activeBlockCount: number;
  onOpenExportModal?: () => void;
  onOpenFullscreenEditor?: () => void;
  onQuickDownload?: () => void;
}

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  activeTab,
  setActiveTab,
  art,
  settings,
  activeBlockCount,
  onOpenExportModal,
  onOpenFullscreenEditor,
  onQuickDownload,
}) => {
  // Tab metadata
  const getTabInfo = () => {
    switch (activeTab) {
      case 'generator':
        return {
          title: 'Pixel Art Canvas & Studio',
          subtitle: 'Upload images, fine-tune resolution, dithering & inspect 16×16 authentic block textures',
          icon: <ImageIcon className="w-5 h-5 text-[#4ade80]" />,
          badge: art ? `${art.width}×${art.height} Blueprint` : 'Ready to Convert',
        };
      case 'commandConverter':
        return {
          title: 'Minecraft Commands to Pixel Art Converter',
          subtitle: 'Paste /setblock or /fill commands or load .mcfunction files to recreate block art visually',
          icon: <Terminal className="w-5 h-5 text-[#4ade80]" />,
          badge: 'Reverse Command Parser',
        };
      case 'palette':
        return {
          title: 'Minecraft Block Palette Manager',
          subtitle: 'Select allowed blocks from Wool, Concrete, Terracotta, Glazed, Wood, Ores & Nether minerals',
          icon: <SlidersHorizontal className="w-5 h-5 text-[#4ade80]" />,
          badge: `${activeBlockCount} Active Blocks`,
        };
      case 'layerGuide':
        return {
          title: 'Step-by-Step Layer Build Guide',
          subtitle: 'Construct your pixel art layer-by-layer in survival with progress checkboxes and print sheets',
          icon: <Layers className="w-5 h-5 text-[#4ade80]" />,
          badge: art ? `${art.height} Vertical Layers` : 'No Active Art',
        };
      case 'materials':
        return {
          title: 'Survival Materials Shopping List',
          subtitle: 'Exact block counts calculated in item stacks (64/stack) and Shulker box estimations',
          icon: <Box className="w-5 h-5 text-[#4ade80]" />,
          badge: art ? `${art.totalBlocks.toLocaleString()} Total Blocks` : 'No Active Art',
        };
      case 'commands':
        return {
          title: 'In-Game /setblock & Datapack Command Center',
          subtitle: 'Generate and copy one-click Minecraft commands and .mcfunction scripts for fast building',
          icon: <Terminal className="w-5 h-5 text-[#4ade80]" />,
          badge: 'Java & Bedrock Ready',
        };
      default:
        return {
          title: 'Minecraft Pixel Art Generator',
          subtitle: 'Convert images into in-game block patterns',
          icon: <Sparkles className="w-5 h-5 text-[#4ade80]" />,
          badge: '1.21+',
        };
    }
  };

  const tabInfo = getTabInfo();
  const totalStacks = art ? Math.ceil(art.totalBlocks / 64) : 0;
  const shulkerBoxes = art ? (art.totalBlocks / (27 * 64)).toFixed(1) : '0';

  return (
    <div
      id="contents-header-bar"
      className="bg-gradient-to-r from-[#101017] via-[#12121c] to-[#101017] border-b border-[#1f1f2e] py-3.5 px-4 sm:px-6 lg:px-8 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left Side: Breadcrumb & Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#14261c] flex items-center justify-center border border-emerald-500/40 shadow-inner flex-shrink-0">
            {tabInfo.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span
                onClick={() => setActiveTab('generator')}
                className="text-xs text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Studio
              </span>
              <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {tabInfo.title}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#14261c] text-[#4ade80] border border-emerald-500/30 flex-shrink-0 font-medium">
                {tabInfo.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block mt-0.5">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Live Stats & Action Buttons */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2 justify-between md:justify-end">
          {art ? (
            <div className="flex items-center space-x-2 text-xs">
              {/* Dimensions Pill */}
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#161622] border border-[#262638] text-slate-300">
                <span className="text-slate-500">Size:</span>
                <span className="font-mono text-[#4ade80] font-bold">
                  {art.width}×{art.height}
                </span>
              </div>

              {/* Stacks Pill */}
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#161622] border border-[#262638] text-slate-300">
                <span className="text-slate-500">Stacks:</span>
                <span className="font-mono text-slate-200 font-bold">
                  ~{totalStacks}
                </span>
                <span className="text-[10px] text-slate-500">({shulkerBoxes} Shulkers)</span>
              </div>

              {/* Quick Edit Blueprint Button */}
              {onOpenFullscreenEditor && (
                <button
                  id="header-edit-fullscreen-btn"
                  onClick={onOpenFullscreenEditor}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                  title="Open full-screen block editor & palette"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Edit Blueprint</span>
                </button>
              )}

              {/* Quick Export HD Button */}
              {onOpenExportModal && (
                <button
                  id="header-export-hd-btn"
                  onClick={onOpenExportModal}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#14261c] hover:bg-[#1b3627] text-[#4ade80] border border-emerald-500/40 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Export HD Blueprint with Rulers"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export HD</span>
                </button>
              )}

              {/* Layer Guide Quick Jump if on another tab */}
              {activeTab !== 'layerGuide' && (
                <button
                  id="header-layer-guide-btn"
                  onClick={() => setActiveTab('layerGuide')}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222234] text-slate-200 border border-[#28283c] text-xs font-medium transition-colors cursor-pointer"
                  title="Open Step-by-Step Layer Guide"
                >
                  <LayersIcon className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span className="hidden sm:inline">Layer Guide</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Select or drop an image to generate blocks</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
