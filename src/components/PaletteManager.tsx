import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Pickaxe,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { MinecraftBlock, BlockCategory } from '../types';
import { MINECRAFT_BLOCKS, PALETTE_PRESETS, CATEGORY_LABELS } from '../data/minecraftBlocks';
import { getBlockSwatchUrl } from '../utils/textureRenderer';

interface PaletteManagerProps {
  activeBlockIds: Set<string>;
  setActiveBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onApplyPalette?: () => void;
}

export const PaletteManager: React.FC<PaletteManagerProps> = ({
  activeBlockIds,
  setActiveBlockIds,
  onApplyPalette,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlySurvival, setOnlySurvival] = useState(false);

  // Apply a preset
  const handleApplyPreset = (presetId: string) => {
    const preset = PALETTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const newSet = new Set<string>();
    for (const block of MINECRAFT_BLOCKS) {
      if (preset.filter(block)) {
        newSet.add(block.id);
      }
    }
    setActiveBlockIds(newSet);
  };

  const handleToggleBlock = (id: string) => {
    setActiveBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(MINECRAFT_BLOCKS.map((b) => b.id));
    setActiveBlockIds(all);
  };

  const handleDeselectAll = () => {
    setActiveBlockIds(new Set());
  };

  // Filtered blocks
  const filteredBlocks = useMemo(() => {
    return MINECRAFT_BLOCKS.filter((block) => {
      if (onlySurvival && !block.isSurvivalFriendly) return false;
      if (selectedCategory !== 'all' && block.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = block.name.toLowerCase().includes(query);
        const matchesId = block.id.toLowerCase().includes(query);
        const matchesCat = block.category.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesCat) return false;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, onlySurvival]);

  return (
    <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl text-slate-200 space-y-5">
      {/* Top Header & Presets */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#4ade80]" />
              Minecraft Block Palette Customization
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select which Minecraft blocks are permitted in your pixel art conversion.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-[#14261c] border border-emerald-500/30 text-[#4ade80]">
              16×16 Textures
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-[#181824] border border-[#262636] text-slate-200">
              {activeBlockIds.size} of {MINECRAFT_BLOCKS.length} Blocks Enabled
            </span>
          </div>
        </div>

        {/* Quick Palette Presets */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-400 block">Builder Palette Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => handleApplyPreset(preset.id)}
                className="px-2.5 py-1 rounded-xl text-xs font-medium bg-[#181824] hover:bg-[#222230] text-slate-300 hover:text-white border border-[#262636] transition-colors cursor-pointer"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-b border-[#20202a] py-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="blockSearchInput"
            type="text"
            placeholder="Search block name or color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c0c0e] border border-[#262636] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category dropdown or quick filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            id="categorySelect"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#0c0c0e] border border-[#262636] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Categories ({MINECRAFT_BLOCKS.length})</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
              <option key={cat} value={cat}>
                {info.label} ({MINECRAFT_BLOCKS.filter((b) => b.category === cat).length})
              </option>
            ))}
          </select>

          <button
            id="toggle-survival-only"
            onClick={() => setOnlySurvival(!onlySurvival)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              onlySurvival
                ? 'bg-[#281c10] border-amber-600/70 text-amber-300'
                : 'bg-[#181824] border-[#262636] text-slate-300 hover:text-white'
            }`}
          >
            <Pickaxe className="w-3.5 h-3.5" />
            <span>Survival Friendly</span>
          </button>

          <div className="flex items-center space-x-1 ml-auto">
            <button
              id="select-all-blocks"
              onClick={handleSelectAll}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-300 hover:text-white border border-[#262636] transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              id="deselect-all-blocks"
              onClick={handleDeselectAll}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-400 hover:text-rose-300 border border-[#262636] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Blocks Grid */}
      <div className="max-h-[460px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredBlocks.map((block) => {
            const isEnabled = activeBlockIds.has(block.id);
            const swatchUrl = getBlockSwatchUrl(block);

            return (
              <div
                key={block.id}
                id={`block-card-${block.id}`}
                onClick={() => handleToggleBlock(block.id)}
                className={`flex items-center space-x-2.5 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                  isEnabled
                    ? 'bg-[#181824] border-[#282838] hover:border-emerald-500/80 shadow-sm'
                    : 'bg-[#0c0c0e]/60 border-[#1a1a22] opacity-40 hover:opacity-75'
                }`}
              >
                {/* Block Texture Swatch */}
                <div className="w-8 h-8 rounded-lg border border-[#2e2e3e] overflow-hidden flex-shrink-0 relative shadow-inner bg-[#0c0c0e]">
                  {swatchUrl ? (
                    <img
                      src={swatchUrl}
                      alt={block.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: block.hex }} />
                  )}
                </div>

                {/* Block Name and Meta */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                    {block.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {block.category}
                    </span>
                    {block.isSurvivalFriendly && (
                      <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-medium">
                        Survival
                      </span>
                    )}
                  </div>
                </div>

                {/* Checkbox indicator */}
                <div className="flex-shrink-0 text-slate-400">
                  {isEnabled ? (
                    <CheckSquare className="w-4 h-4 text-[#4ade80]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredBlocks.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No blocks matched your filter query. Try clearing the search or category filter.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#20202a]">
        <span>Tip: Concrete and Wool provide the most vibrant solid color tones.</span>
        {onApplyPalette && (
          <button
            id="apply-palette-btn"
            onClick={onApplyPalette}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            Re-generate with Palette
          </button>
        )}
      </div>
    </div>
  );
};
