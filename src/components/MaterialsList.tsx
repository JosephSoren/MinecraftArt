import React, { useState, useMemo } from 'react';
import {
  Box,
  Search,
  Copy,
  Download,
  Check,
  Package,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { ConvertedArt, MinecraftBlock } from '../types';
import { getBlockSwatchUrl } from '../utils/textureRenderer';
import { Edit3 } from 'lucide-react';

interface MaterialsListProps {
  art: ConvertedArt;
  highlightBlockId: string | null;
  setHighlightBlockId: (id: string | null) => void;
  onSelectTab: (tab: 'generator' | 'palette' | 'layerGuide' | 'commands' | 'materials') => void;
  onOpenBlockReplacer?: (sourceBlockId?: string | null) => void;
  onOpenFullscreenEditor?: () => void;
}

export const MaterialsList: React.FC<MaterialsListProps> = ({
  art,
  highlightBlockId,
  setHighlightBlockId,
  onSelectTab,
  onOpenBlockReplacer,
  onOpenFullscreenEditor,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'count-desc' | 'count-asc' | 'name'>('count-desc');
  const [copied, setCopied] = useState(false);

  // Total blocks and statistics
  const totalBlocks = art.totalBlocks;
  const totalStacks = Math.ceil(totalBlocks / 64);
  const shulkerBoxes = (totalBlocks / (27 * 64)).toFixed(1);

  // Sort and filter entries
  const materialItems = useMemo(() => {
    const items = Object.entries(art.counts).map(([blockId, rawCount]) => {
      const count = Number(rawCount) || 0;
      const block = art.blockPalette.find((b) => b.id === blockId);
      const stacks = Math.floor(count / 64);
      const remainder = count % 64;
      const percentage = ((count / totalBlocks) * 100).toFixed(1);

      return {
        id: blockId,
        name: block ? block.name : blockId,
        category: block ? block.category : 'other',
        block,
        count,
        stacks,
        remainder,
        percentage,
      };
    });

    // Filter
    const filtered = items.filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'count-desc') return b.count - a.count;
      if (sortBy === 'count-asc') return a.count - b.count;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [art.counts, art.blockPalette, totalBlocks, search, sortBy]);

  // Copy shopping list
  const handleCopyShoppingList = () => {
    const lines = [
      `MINECRAFT PIXEL ART MATERIAL SHOPPING LIST`,
      `Total Blocks: ${totalBlocks.toLocaleString()} (~${totalStacks} stacks / ${shulkerBoxes} Shulker Boxes)`,
      `---------------------------------------------`,
    ];
    for (const item of materialItems) {
      const stackText =
        item.stacks > 0
          ? `${item.stacks} stack${item.stacks > 1 ? 's' : ''} + ${item.remainder}`
          : `${item.remainder}`;
      lines.push(`${item.name.padEnd(26)} : ${item.count} blocks (${stackText})`);
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = [['Block Name', 'Minecraft ID', 'Category', 'Quantity', 'Stacks', 'Remainder', 'Percentage']];
    for (const item of materialItems) {
      rows.push([
        `"${item.name}"`,
        `"${item.id}"`,
        `"${item.category}"`,
        item.count.toString(),
        item.stacks.toString(),
        item.remainder.toString(),
        `"${item.percentage}%"`,
      ]);
    }
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pixel_art_materials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20202a] pb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Box className="w-5 h-5 text-[#4ade80]" />
            <span>Materials & Shopping List</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Exact block count breakdown, stack counts, and shulker box requirements for survival building.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenFullscreenEditor && (
            <button
              id="materials-edit-fullscreen-btn"
              onClick={onOpenFullscreenEditor}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
              title="Open Fullscreen Blueprint Canvas & Block Library Editor"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-950" />
              <span>Edit Blueprint (Fullscreen)</span>
            </button>
          )}

          {onOpenBlockReplacer && (
            <button
              id="materials-replace-blocks-btn"
              onClick={() => onOpenBlockReplacer()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#14261c] hover:bg-[#1c3628] border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-sm transition-all cursor-pointer"
              title="Replace or swap blocks with other Minecraft blocks"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Replace Blocks</span>
            </button>
          )}

          <button
            onClick={handleCopyShoppingList}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 font-medium text-xs border border-[#262636] transition-colors cursor-pointer"
            title="Copy plain text list to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                <span className="text-[#4ade80]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy List</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 font-medium text-xs border border-[#262636] transition-colors cursor-pointer"
            title="Export spreadsheet CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Total Blocks
          </span>
          <span className="text-xl font-extrabold text-white font-mono mt-1 block">
            {totalBlocks.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            64-Item Stacks
          </span>
          <span className="text-xl font-extrabold text-[#4ade80] font-mono mt-1 block">
            ~{totalStacks.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Shulker Boxes
          </span>
          <span className="text-xl font-extrabold text-amber-400 font-mono mt-1 block">
            {shulkerBoxes} Boxes
          </span>
        </div>

        <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Unique Blocks
          </span>
          <span className="text-xl font-extrabold text-sky-400 font-mono mt-1 block">
            {Object.keys(art.counts).length} Types
          </span>
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#20202a] pt-3">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0c0c0e] border border-[#262636] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0c0c0e] border border-[#262636] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="count-desc">Most Used First</option>
            <option value="count-asc">Least Used First</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Material Table */}
      <div className="overflow-x-auto max-h-[440px] overflow-y-auto border border-[#22222c] rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0c0c0e] sticky top-0 z-10 border-b border-[#20202a] text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-4">Block Name</th>
              <th className="py-2.5 px-4 text-right">Quantity</th>
              <th className="py-2.5 px-4 text-right">Stacks + Loose</th>
              <th className="py-2.5 px-4 text-right">% of Build</th>
              <th className="py-2.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#20202a] bg-[#121217]/60 font-mono">
            {materialItems.map((item) => {
              const swatchUrl = item.block ? getBlockSwatchUrl(item.block) : '';
              const isHighlighted = highlightBlockId === item.id;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-[#181824]/70 transition-colors ${
                    isHighlighted ? 'bg-[#14261c]/50 border-l-2 border-[#4ade80]' : ''
                  }`}
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-2.5 font-sans">
                      <div className="w-6 h-6 rounded-md border border-[#262636] overflow-hidden flex-shrink-0 bg-[#0c0c0e]">
                        {swatchUrl && (
                          <img
                            src={swatchUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-right font-bold text-white">
                    {item.count.toLocaleString()}
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-300">
                    {item.stacks > 0 ? (
                      <span>
                        <strong className="text-[#4ade80]">{item.stacks}</strong> stacks +{' '}
                        {item.remainder}
                      </span>
                    ) : (
                      <span>{item.remainder} blocks</span>
                    )}
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-400 font-mono">
                    {item.percentage}%
                  </td>

                  <td className="py-2.5 px-4 text-center font-sans">
                    <div className="flex items-center justify-center space-x-1.5">
                      {onOpenBlockReplacer && (
                        <button
                          onClick={() => onOpenBlockReplacer(item.id)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-[#1c1c28] hover:bg-[#28283a] text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 transition-colors cursor-pointer flex items-center space-x-1"
                          title="Replace this specific block type with another block"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Replace</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (isHighlighted) {
                            setHighlightBlockId(null);
                          } else {
                            setHighlightBlockId(item.id);
                            onSelectTab('generator');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          isHighlighted
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-[#181824] hover:bg-[#222230] text-slate-300 hover:text-white border border-[#262636]'
                        }`}
                        title="Highlight all blocks of this type on the canvas"
                      >
                        {isHighlighted ? 'Highlighted ✓' : 'Highlight'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {materialItems.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-xs">
            No materials matched your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};
