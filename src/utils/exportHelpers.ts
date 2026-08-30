import { ConvertedArt, MinecraftBlock } from '../types';
import { drawBlockTexture } from './textureRenderer';
import { generateMinecraftCommands } from './commandGenerator';

export interface QuickExportOptions {
  scale?: number;
  withGrid?: boolean;
  withTextures?: boolean;
  filename?: string;
}

/**
 * Renders and triggers an instant browser download of the converted art as a sharp PNG.
 */
export function downloadArtImagePng(
  art: ConvertedArt,
  options: QuickExportOptions = {}
): void {
  const {
    scale = 8,
    withGrid = true,
    withTextures = true,
    filename = `minecraft_pixel_art_${art.width}x${art.height}.png`,
  } = options;

  const { width, height, grid, blockPalette } = art;
  const blockSize = Math.max(8, scale * 4);

  const canvas = document.createElement('canvas');
  canvas.width = width * blockSize;
  canvas.height = height * blockSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sharp pixel rendering
  ctx.imageSmoothingEnabled = false;
  (ctx as any).webkitImageSmoothingEnabled = false;
  (ctx as any).mozImageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render blocks
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockIdx = grid[y]?.[x];
      const block = blockPalette[blockIdx];
      if (!block) continue;

      const posX = x * blockSize;
      const posY = y * blockSize;
      drawBlockTexture(ctx, block, posX, posY, blockSize, withTextures ? 'texture' : 'flat');
    }
  }

  // Draw Grid Lines if requested
  if (withGrid && blockSize >= 4) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = Math.max(1, Math.round(blockSize * 0.05));
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      ctx.moveTo(x * blockSize, 0);
      ctx.lineTo(x * blockSize, height * blockSize);
    }
    for (let y = 0; y <= height; y++) {
      ctx.moveTo(0, y * blockSize);
      ctx.lineTo(width * blockSize, y * blockSize);
    }
    ctx.stroke();
  }

  // Convert to Blob and download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

/**
 * Downloads a structured text shopping list of materials for survival building.
 */
export function downloadMaterialsShoppingList(
  art: ConvertedArt,
  filename = `minecraft_materials_${art.width}x${art.height}.txt`
): void {
  const totalBlocks = art.totalBlocks;
  const totalStacks = Math.ceil(totalBlocks / 64);
  const shulkerBoxes = (totalBlocks / (27 * 64)).toFixed(1);

  const lines: string[] = [
    `=============================================================`,
    ` MINECRAFT PIXEL ART MATERIAL SHOPPING LIST`,
    ` Dimensions: ${art.width} x ${art.height} blocks`,
    ` Total Blocks: ${totalBlocks.toLocaleString()}`,
    ` Total Stacks: ~${totalStacks} stacks (approx. ${shulkerBoxes} Shulker Boxes)`,
    ` Generated on: ${new Date().toLocaleDateString()}`,
    `=============================================================`,
    ``,
    `ITEM / BLOCK NAME            TOTAL BLOCKS     STACKS NEEDED`,
    `-------------------------------------------------------------`,
  ];

  const sortedCounts = Object.entries(art.counts).sort((a, b) => b[1] - a[1]);

  for (const [blockId, count] of sortedCounts) {
    const block = art.blockPalette.find((b) => b.id === blockId);
    const name = block ? block.name : blockId;
    const stacks = Math.floor(count / 64);
    const rem = count % 64;
    const stackDesc = stacks > 0 ? `${stacks} stacks + ${rem}` : `${rem}`;

    lines.push(
      `${name.padEnd(28)} : ${count.toString().padStart(6)} blocks   (${stackDesc})`
    );
  }

  lines.push(``);
  lines.push(`=============================================================`);
  lines.push(`Happy Building in Minecraft!`);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads an in-game Minecraft /setblock .mcfunction file ready to place the pixel art.
 */
export function downloadMcFunctionCommands(
  art: ConvertedArt,
  orientation: 'vertical' | 'horizontal' = 'vertical',
  filename = `build_${art.width}x${art.height}.mcfunction`
): void {
  const commands = generateMinecraftCommands(art, {
    coordinateType: 'relative',
    startX: 0,
    startY: 0,
    startZ: 0,
    orientation,
    replaceMode: 'replace',
  });

  const blob = new Blob([commands], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
