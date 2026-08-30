import { MinecraftBlock } from '../types';

export type TextureRenderMode = 'texture' | 'flat';

// In-memory caches
const textureImageCache = new Map<string, HTMLImageElement>();
const swatchCache = new Map<string, string>();
const loadListeners = new Set<() => void>();
const failedLoads = new Set<string>();

/**
 * Subscribe to texture image load events to trigger re-renders if textures finish loading.
 */
export function subscribeTextureLoaded(callback: () => void): () => void {
  loadListeners.add(callback);
  return () => {
    loadListeners.delete(callback);
  };
}

function notifyTextureLoaded(): void {
  // Clear swatch cache on texture load so swatches re-generate with real texture
  swatchCache.clear();
  for (const listener of loadListeners) {
    try {
      listener();
    } catch (e) {
      console.error('Error in texture load listener', e);
    }
  }
}

/**
 * Lazily loads authentic Minecraft 16x16 PNG texture from official asset repositories.
 */
export function getBlockTextureImage(blockId: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  if (failedLoads.has(blockId)) return null;

  let img = textureImageCache.get(blockId);
  if (img) {
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  // Initiate image fetch
  const newImg = new Image();
  newImg.crossOrigin = 'anonymous';

  newImg.onload = () => {
    notifyTextureLoaded();
  };

  newImg.onerror = () => {
    failedLoads.add(blockId);
  };

  // Use PrismarineJS raw github asset archive
  newImg.src = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2/blocks/${blockId}.png`;
  textureImageCache.set(blockId, newImg);

  return newImg.complete && newImg.naturalWidth > 0 ? newImg : null;
}

/**
 * Preload common textures
 */
export function preloadAllBlockTextures(): void {
  // Texture loading happens lazily when blocks are displayed
}

/**
 * Renders procedural Minecraft block texture for offline and zero-latency display.
 */
function drawProceduralBlock(
  ctx: CanvasRenderingContext2D,
  block: MinecraftBlock,
  x: number,
  y: number,
  size: number
): void {
  const [r, g, b] = block.rgb;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(x, y, size, size);

  if (size < 4) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();

  // Special block patterns
  if (block.id.includes('_block') && (block.category === 'minerals' || block.textureStyle === 'ore')) {
    // Metal / Gem beveled border
    const bevel = Math.max(1, Math.round(size * 0.1));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x, y, size, bevel);
    ctx.fillRect(x, y, bevel, size);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x, y + size - bevel, size, bevel);
    ctx.fillRect(x + size - bevel, y, bevel, size);

    // Inner bevel
    const inner = Math.max(1, Math.round(size * 0.06));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + bevel * 2, y + bevel * 2, size - bevel * 4, inner);
    ctx.restore();
    return;
  }

  if (block.id.includes('froglight')) {
    // Glowing froglight center
    const pad = Math.max(1, Math.round(size * 0.2));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.restore();
    return;
  }

  switch (block.textureStyle) {
    case 'wool': {
      // 16x16 authentic wool fiber weave pattern
      const step = Math.max(2, size / 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < size; i += step) {
        ctx.fillRect(x + i, y, 1, size);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let j = 0; j < size; j += step) {
        ctx.fillRect(x, y + j, size, 1);
      }
      break;
    }

    case 'planks': {
      // 4 horizontal wood planks with dark seams & nail specks
      const plankH = size / 4;
      const seam = Math.max(1, size / 16);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      for (let p = 1; p < 4; p++) {
        ctx.fillRect(x, y + p * plankH - seam, size, seam);
      }
      // Top highlight on each plank
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let p = 0; p < 4; p++) {
        ctx.fillRect(x, y + p * plankH, size, Math.max(1, size / 20));
      }
      // Nail specks
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      const dot = Math.max(1, Math.round(size / 14));
      ctx.fillRect(x + size * 0.12, y + plankH * 0.45, dot, dot);
      ctx.fillRect(x + size * 0.88 - dot, y + plankH * 1.45, dot, dot);
      ctx.fillRect(x + size * 0.15, y + plankH * 2.45, dot, dot);
      ctx.fillRect(x + size * 0.85 - dot, y + plankH * 3.45, dot, dot);
      break;
    }

    case 'bricks': {
      // Running bond brick pattern
      const rowH = size / 4;
      const mortar = Math.max(1, size / 16);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let rIdx = 1; rIdx < 4; rIdx++) {
        ctx.fillRect(x, y + rIdx * rowH, size, mortar);
      }
      const half = size / 2;
      ctx.fillRect(x + half, y, mortar, rowH);
      ctx.fillRect(x + size * 0.25, y + rowH, mortar, rowH);
      ctx.fillRect(x + size * 0.75, y + rowH, mortar, rowH);
      ctx.fillRect(x + half, y + rowH * 2, mortar, rowH);
      ctx.fillRect(x + size * 0.25, y + rowH * 3, mortar, rowH);
      ctx.fillRect(x + size * 0.75, y + rowH * 3, mortar, rowH);
      break;
    }

    case 'stone': {
      // Rocky noise specs simulating stone surface
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      const s = Math.max(1, Math.round(size / 12));
      ctx.fillRect(x + size * 0.2, y + size * 0.25, s * 2, s);
      ctx.fillRect(x + size * 0.6, y + size * 0.15, s, s * 2);
      ctx.fillRect(x + size * 0.35, y + size * 0.65, s * 2, s);
      ctx.fillRect(x + size * 0.75, y + size * 0.75, s, s);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x + size * 0.25, y + size * 0.25 + s, s, s);
      ctx.fillRect(x + size * 0.65, y + size * 0.6, s, s);
      break;
    }

    case 'bark': {
      // Vertical tree bark ridges
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      const step = Math.max(2, Math.round(size / 5));
      for (let i = 0; i < size; i += step) {
        ctx.fillRect(x + i, y, Math.max(1, size / 12), size);
      }
      break;
    }

    case 'concrete': {
      // Smooth matte with subtle edge definition
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x, y, size, 1);
      ctx.fillRect(x, y, 1, size);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(x, y + size - 1, size, 1);
      ctx.fillRect(x + size - 1, y, 1, size);
      break;
    }

    case 'terracotta': {
      // Warm clay marbling
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(x + size * 0.1, y + size * 0.3, size * 0.4, Math.max(1, size / 12));
      ctx.fillRect(x + size * 0.5, y + size * 0.7, size * 0.35, Math.max(1, size / 12));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x + size * 0.3, y + size * 0.15, size * 0.3, Math.max(1, size / 12));
      break;
    }

    default: {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x, y, size, 1);
      ctx.fillRect(x, y, 1, size);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(x, y + size - 1, size, 1);
      ctx.fillRect(x + size - 1, y, 1, size);
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws block texture onto a 2D canvas context.
 */
export function drawBlockTexture(
  ctx: CanvasRenderingContext2D,
  block: MinecraftBlock,
  x: number,
  y: number,
  size: number,
  mode: TextureRenderMode = 'texture'
): void {
  // Flat color mode: render solid block hex
  if (mode === 'flat') {
    const [r, g, b] = block.rgb;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, size, size);
    return;
  }

  // Try authentic image texture
  const img = getBlockTextureImage(block.id);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, size, size);
    return;
  }

  // Fallback to high-fidelity procedural texture
  drawProceduralBlock(ctx, block, x, y, size);
}

/**
 * Returns a cached data URL swatch for a block.
 */
export function getBlockSwatchUrl(block: MinecraftBlock): string {
  if (swatchCache.has(block.id)) {
    return swatchCache.get(block.id)!;
  }

  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    drawBlockTexture(ctx, block, 0, 0, 32, 'texture');

    // Subtle 1px crisp outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 31, 31);

    const dataUrl = canvas.toDataURL();
    swatchCache.set(block.id, dataUrl);
    return dataUrl;
  }

  return '';
}


