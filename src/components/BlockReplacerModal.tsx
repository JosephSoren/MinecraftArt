import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowRight,
  Search,
  Check,
  Sparkles,
  RefreshCw,
  Layers,
  Filter,
  Info,
} from 'lucide-react';
import { ConvertedArt, MinecraftBlock, BlockCategory } from '../types';
import { MINECRAFT_BLOCKS } from '../data/minecraftBlocks';
import { getBlockSwatchUrl } from '../utils/textureRenderer';

interface BlockReplacerModalProps {
  isOpen: boolean;
  onClose: () => void;
  art: ConvertedArt;
  onReplaceBlock: (sourceBlockId: string, targetBlock: MinecraftBlock) => void;
  initialSourceBlockId?: string | null;
}

const CATEGORIES: { id: BlockCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'concrete', label: 'Concrete' },
  { id: 'wool', label: 'Wool' },
  { id: 'terracotta', label: 'Terracotta' },
  { id: 'wood', label: 'Wood' },
  { id: 'stone', label: 'Stone' },
  { id: 'deepslate', label: 'Deepslate' },
  { id: 'minerals', label: 'Minerals' },
  { id: 'nature', label: 'Nature' },
  { id: 'glass', label: 'Glass' },
];

export const BlockReplacerModal: React.FC<BlockReplacerModalProps> = ({
  isOpen,
  onClose,
  art,
  onReplaceBlock,
  initialSourceBlockId,
}) => {
  // Get all blocks currently used in the art
  const usedBlocks = useMemo(() => {
    return Object.entries(art.counts)
      .map(([id, rawCount]) => {
        const count = typeof rawCount === 'number' ? rawCount : Number(rawCount) || 0;
        const block = art.blockPalette.find((b) => b.id === id) || MINECRAFT_BLOCKS.find((b) => b.id === id);
        return {
          id,
          count,
          block: block || {
            id,
            name: id.replace(/_/g, ' '),
            category: 'other' as BlockCategory,
            rgb: [128, 128, 128] as [number, number, number],
            hex: '#808080',
            isSurvivalFriendly: true,
            textureStyle: 'concrete' as const,
            commandName: `minecraft:${id}`,
          },
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [art.counts, art.blockPalette]);

  // Selected source block to be replaced
  const [selectedSourceId, setSelectedSourceId] = useState<string>(() => {
    if (initialSourceBlockId && usedBlocks.some((b) => b.id === initialSourceBlockId)) {
      return initialSourceBlockId;
    }
    return usedBlocks[0]?.id || '';
  });

  // Target replacement block search & filter
  const [targetSearch, setTargetSearch] = useState<string>('');
  const [targetCategory, setTargetCategory] = useState<BlockCategory | 'all'>('all');
  const [selectedTargetBlock, setSelectedTargetBlock] = useState<MinecraftBlock | null>(null);

  // Survival only filter
  const [survivalOnly, setSurvivalOnly] = useState<boolean>(false);

  // Update selected source block if initialSourceBlockId changes when opening
  React.useEffect(() => {
    if (initialSourceBlockId && usedBlocks.some((b) => b.id === initialSourceBlockId)) {
      setSelectedSourceId(initialSourceBlockId);
    } else if (usedBlocks.length > 0 && !usedBlocks.some((b) => b.id === selectedSourceId)) {
      setSelectedSourceId(usedBlocks[0].id);
    }
  }, [initialSourceBlockId, usedBlocks, isOpen]);

  // Filtered available target blocks
  const filteredTargetBlocks = useMemo(() => {
    return MINECRAFT_BLOCKS.filter((block) => {
      // Don't list the exact same block
      if (block.id === selectedSourceId) return false;
      if (survivalOnly && !block.isSurvivalFriendly) return false;
      if (targetCategory !== 'all' && block.category !== targetCategory) return false;
      if (targetSearch.trim()) {
        const q = targetSearch.toLowerCase();
        return (
          block.name.toLowerCase().includes(q) ||
          block.id.toLowerCase().includes(q) ||
          block.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedSourceId, targetCategory, targetSearch, survivalOnly]);

  // Current source item data
  const currentSourceItem = usedBlocks.find((b) => b.id === selectedSourceId);

  // Auto-select first target block if none selected
  React.useEffect(() => {
    if (filteredTargetBlocks.length > 0 && (!selectedTargetBlock || selectedTargetBlock.id === selectedSourceId)) {
      setSelectedTargetBlock(filteredTargetBlocks[0]);
    }
  }, [filteredTargetBlocks, selectedSourceId]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!selectedSourceId || !selectedTargetBlock) return;
    onReplaceBlock(selectedSourceId, selectedTargetBlock);
    onClose();
  };

  return (
    <div
      id="block-replacer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#121218] border border-[#242436] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222232] flex items-center justify-between bg-[#161620]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>Replace Blocks</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-normal">
                  Bulk Edit
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Swap any block used in your blueprint with your desired Minecraft block.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#242436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Select Block to Replace (Source) */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                1. Select Block in Blueprint
              </label>
              <span className="text-[11px] text-slate-500">
                {usedBlocks.length} types used
              </span>
            </div>

            <div className="bg-[#0b0b10] border border-[#1f1f2e] rounded-xl p-2 max-h-[380px] overflow-y-auto space-y-1.5 scrollbar-thin">
              {usedBlocks.map((item) => {
                const isSelected = item.id === selectedSourceId;
                const swatch = getBlockSwatchUrl(item.block);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSourceId(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1e2c] border-emerald-500/60 shadow-sm text-white'
                        : 'bg-[#14141d]/80 border-transparent hover:bg-[#191924] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={swatch}
                        alt={item.block.name}
                        className="w-7 h-7 rounded object-cover flex-shrink-0 border border-black/40 shadow-inner"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">
                          {item.block.name}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {item.block.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {item.count}
                      </span>
                      <span className="text-[10px] text-slate-400 block">blocks</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center / Right Column: Choose Desired Replacement Block (Target) */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                2. Choose Replacement Block
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={survivalOnly}
                  onChange={(e) => setSurvivalOnly(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-[#161620]"
                />
                <span>Survival only</span>
              </label>
            </div>

            {/* Target Search & Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Minecraft blocks (e.g., Concrete, Wool, Terracotta)..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0e0e14] border border-[#222232] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/70"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTargetCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                      targetCategory === cat.id
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-semibold'
                        : 'bg-[#14141e] border-[#222230] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Block Grid Picker */}
            <div className="bg-[#0b0b10] border border-[#1f1f2e] rounded-xl p-2.5 max-h-[300px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 scrollbar-thin">
              {filteredTargetBlocks.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500">
                  No matching blocks found. Try clearing your search.
                </div>
              ) : (
                filteredTargetBlocks.map((block) => {
                  const isSelected = selectedTargetBlock?.id === block.id;
                  const swatch = getBlockSwatchUrl(block);
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setSelectedTargetBlock(block)}
                      className={`flex items-center space-x-2 p-2 rounded-lg text-left transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-[#1f2824] border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400'
                          : 'bg-[#14141e] border-[#20202e] hover:bg-[#1a1a27] text-slate-300'
                      }`}
                    >
                      <img
                        src={swatch}
                        alt={block.name}
                        className="w-6 h-6 rounded object-cover flex-shrink-0 border border-black/40"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <span className="text-[11px] font-medium truncate leading-tight">
                        {block.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer: Live Preview & Action */}
        <div className="p-4 sm:p-5 bg-[#161620] border-t border-[#222232] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Comparison summary */}
          <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
            {currentSourceItem && selectedTargetBlock ? (
              <div className="flex items-center space-x-2 bg-[#0e0e14] px-3 py-2 rounded-xl border border-[#222232] w-full sm:w-auto">
                <div className="flex items-center space-x-1.5">
                  <img
                    src={getBlockSwatchUrl(currentSourceItem.block)}
                    alt=""
                    className="w-5 h-5 rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="font-semibold text-slate-300 truncate max-w-[100px] sm:max-w-[130px]">
                    {currentSourceItem.block.name}
                  </span>
                  <span className="text-slate-500 font-mono">({currentSourceItem.count})</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="flex items-center space-x-1.5">
                  <img
                    src={getBlockSwatchUrl(selectedTargetBlock)}
                    alt=""
                    className="w-5 h-5 rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="font-bold text-emerald-300 truncate max-w-[100px] sm:max-w-[130px]">
                    {selectedTargetBlock.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs flex items-center space-x-1">
                <Info className="w-3.5 h-3.5" />
                <span>Select a source and target block to replace</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#20202e] hover:bg-[#28283a] text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!selectedSourceId || !selectedTargetBlock}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                Replace All ({currentSourceItem?.count || 0} blocks)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
