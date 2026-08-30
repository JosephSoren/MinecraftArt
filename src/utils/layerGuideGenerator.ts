import { ConvertedArt, LayerData, MinecraftBlock } from '../types';
import { getBlockSwatchUrl } from './textureRenderer';

/**
 * Computes run-length encoded block segments for a single row/layer.
 * Example: [White, White, White, Red, Red] -> [{ count: 3, block: White }, { count: 2, block: Red }]
 */
export interface BlockRun {
  count: number;
  block: MinecraftBlock;
  startIndex: number;
  endIndex: number;
}

export function getLayerRuns(art: ConvertedArt, layerIndex: number): BlockRun[] {
  const { width, grid, blockPalette } = art;
  const row = grid[layerIndex];
  if (!row) return [];

  const runs: BlockRun[] = [];
  let currentBlock = blockPalette[row[0]];
  let count = 0;
  let startIndex = 0;

  for (let x = 0; x < width; x++) {
    const block = blockPalette[row[x]];
    if (block.id === currentBlock.id) {
      count++;
    } else {
      runs.push({
        count,
        block: currentBlock,
        startIndex,
        endIndex: x - 1,
      });
      currentBlock = block;
      count = 1;
      startIndex = x;
    }
  }

  if (count > 0) {
    runs.push({
      count,
      block: currentBlock,
      startIndex,
      endIndex: width - 1,
    });
  }

  return runs;
}

export function getLayerData(art: ConvertedArt, layerIndex: number): LayerData {
  const { width, grid, blockPalette, placedState } = art;
  const row = grid[layerIndex] || [];
  const placedRow = placedState[layerIndex] || [];

  const blocks: { x: number; block: MinecraftBlock; isPlaced: boolean }[] = [];
  const blockCounts: Record<string, number> = {};
  let placedInLayer = 0;

  for (let x = 0; x < width; x++) {
    const block = blockPalette[row[x]];
    const isPlaced = Boolean(placedRow[x]);
    if (isPlaced) placedInLayer++;
    blocks.push({ x, block, isPlaced });
    blockCounts[block.id] = (blockCounts[block.id] || 0) + 1;
  }

  return {
    layerIndex,
    label: `Layer / Row ${layerIndex + 1} of ${art.height}`,
    blocks,
    blockCounts,
    totalInLayer: width,
    placedInLayer,
  };
}

/**
 * Generates an exportable, printable HTML Layer-by-Layer Guide
 */
export function generatePrintableLayerGuideHtml(
  art: ConvertedArt,
  orientation: 'horizontal' | 'vertical'
): string {
  const { width, height, blockPalette } = art;

  let layersHtml = '';
  for (let y = 0; y < height; y++) {
    // For vertical, Layer 1 is usually the ground row (bottom)
    const layerIdx = orientation === 'vertical' ? height - 1 - y : y;
    const runs = getLayerRuns(art, layerIdx);
    const layerLabel = orientation === 'vertical' ? `Layer ${y + 1} (Y = ${y})` : `Row ${y + 1} (Z = ${y})`;

    const runsHtml = runs
      .map((r) => {
        const swatch = getBlockSwatchUrl(r.block);
        const swatchHtml = swatch
          ? `<img src="${swatch}" alt="${r.block.name}" style="width:18px; height:18px; image-rendering:pixelated; border-radius:3px; margin-right:6px; vertical-align:middle; border:1px solid rgba(0,0,0,0.15);" />`
          : `<span style="display:inline-block; width:16px; height:16px; background:${r.block.hex}; border-radius:3px; margin-right:6px; border:1px solid rgba(0,0,0,0.2);"></span>`;
        return `
        <div style="display:inline-flex; align-items:center; margin: 4px; padding: 4px 10px; background:#f1f5f9; border-radius: 6px; border:1px solid #cbd5e1; font-size:13px;">
          ${swatchHtml}
          <strong>${r.count}x</strong>&nbsp;${r.block.name}&nbsp;<span style="color:#64748b; font-size:11px;">(pos ${r.startIndex + 1}-${r.endIndex + 1})</span>
        </div>`;
      })
      .join('');

    layersHtml += `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; background:#ffffff;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom: 1px solid #e2e8f0; padding-bottom:8px;">
          <h3 style="margin:0; font-size: 16px; font-weight:700; color:#0f172a;">${layerLabel}</h3>
          <span style="font-size:13px; color:#64748b;">${width} blocks total</span>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${runsHtml}
        </div>
      </div>
    `;
  }

  // Material summary
  const sortedMaterials = Object.entries(art.counts).sort((a, b) => b[1] - a[1]);
  const materialsTableHtml = sortedMaterials
    .map(([id, count]) => {
      const b = blockPalette.find((item) => item.id === id);
      const stacks = Math.floor(count / 64);
      const rem = count % 64;
      const stackDesc = stacks > 0 ? `${stacks} stacks + ${rem}` : `${rem}`;
      const swatch = b ? getBlockSwatchUrl(b) : '';
      const swatchHtml = swatch
        ? `<img src="${swatch}" alt="${b?.name || id}" style="width:20px; height:20px; image-rendering:pixelated; border-radius:4px; border:1px solid rgba(0,0,0,0.15);" />`
        : `<span style="display:inline-block; width:18px; height:18px; background:${b?.hex || '#ccc'}; border-radius:4px; border:1px solid rgba(0,0,0,0.15);"></span>`;
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px; display:flex; align-items:center; gap:8px;">
            ${swatchHtml}
            <span>${b?.name || id}</span>
          </td>
          <td style="padding:8px; font-weight:600; text-align:right;">${count}</td>
          <td style="padding:8px; color:#64748b; text-align:right;">${stackDesc}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Minecraft Pixel Art - Builder's Layer Guide</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px auto; max-width: 900px; color: #1e293b; background: #f8fafc; line-height: 1.5; }
    @media print {
      body { background: #fff; margin: 15mm; }
      .no-print { display: none; }
    }
    h1, h2, h3 { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
    th { text-align: left; background: #f1f5f9; padding: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center; background:#0284c7; color:#fff; padding: 14px 20px; border-radius: 8px;">
    <div>
      <strong style="font-size:16px;">In-Game Minecraft Layer Guide</strong>
      <div style="font-size:13px; opacity:0.9;">Ready to reference on a second monitor or print.</div>
    </div>
    <button onclick="window.print()" style="background:#fff; color:#0284c7; border:none; padding:8px 18px; border-radius:6px; font-weight:600; cursor:pointer;">Print / Save as PDF</button>
  </div>

  <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; margin-bottom:30px;">
    <h1 style="margin-top:0; font-size:24px;">Minecraft Pixel Art Layer-by-Layer Guide</h1>
    <p style="color:#64748b; margin-bottom:20px;">
      Dimensions: <strong>${width} × ${height}</strong> blocks &bull; Total Blocks: <strong>${art.totalBlocks.toLocaleString()}</strong> &bull;
      Orientation: <strong>${orientation === 'vertical' ? 'Vertical Wall' : 'Horizontal Floor'}</strong>
    </p>

    <h2>Total Material Bill</h2>
    <table>
      <thead>
        <tr>
          <th>Block Type</th>
          <th style="text-align:right;">Quantity</th>
          <th style="text-align:right;">Stacks & Remaining</th>
        </tr>
      </thead>
      <tbody>
        ${materialsTableHtml}
      </tbody>
    </table>
  </div>

  <h2>Step-by-Step Layer Guide</h2>
  <p style="color:#64748b; margin-bottom:16px;">Each layer lists continuous sequences of blocks to place from left to right:</p>
  ${layersHtml}
</body>
</html>`;
}

/**
 * Generates plain text / markdown layer guide for quick copying
 */
export function generateTextLayerGuide(
  art: ConvertedArt,
  orientation: 'horizontal' | 'vertical'
): string {
  const { width, height } = art;
  const lines: string[] = [
    `MINECRAFT PIXEL ART - LAYER BUILDER GUIDE`,
    `Dimensions: ${width}x${height} blocks | Total Blocks: ${art.totalBlocks}`,
    `Orientation: ${orientation === 'vertical' ? 'Vertical Wall' : 'Horizontal Floor'}`,
    `--------------------------------------------------`,
    ``,
  ];

  for (let y = 0; y < height; y++) {
    const layerIdx = orientation === 'vertical' ? height - 1 - y : y;
    const runs = getLayerRuns(art, layerIdx);
    const label = orientation === 'vertical' ? `[Layer ${y + 1} (Y=${y})]` : `[Row ${y + 1} (Z=${y})]`;

    lines.push(label);
    const runStrs = runs.map((r) => `${r.count}x ${r.block.name} (pos ${r.startIndex + 1}-${r.endIndex + 1})`);
    lines.push(`  ` + runStrs.join(' -> '));
    lines.push(``);
  }

  return lines.join('\n');
}
