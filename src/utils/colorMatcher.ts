import { MinecraftBlock, PixelArtSettings } from '../types';

export interface PrecomputedBlock {
  block: MinecraftBlock;
  rgb: [number, number, number];
  lab: [number, number, number];
}

// Convert sRGB (0-255) to CIE-L*a*b*
export function rgbToLab(rgb: [number, number, number]): [number, number, number] {
  let [r, g, b] = rgb;
  // Pivot sRGB to linear RGB
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;

  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;

  // Convert to CIE XYZ (Observer = 2°, Illuminant = D65)
  let x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) * 100;
  let y = (lr * 0.2126 + lg * 0.7152 + lb * 0.0722) * 100;
  let z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) * 100;

  // Normalize for D65
  x /= 95.047;
  y /= 100.0;
  z /= 108.883;

  // Pivot XYZ to Lab
  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return [L, a, bVal];
}

// Distance between two colors in Lab space (Delta-E CIE76)
export function labDistance(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return dL * dL + da * da + db * db;
}

// Distance between two colors in weighted RGB space
export function rgbDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const rMean = (rgb1[0] + rgb2[0]) / 2;
  const r = rgb1[0] - rgb2[0];
  const g = rgb1[1] - rgb2[1];
  const b = rgb1[2] - rgb2[2];
  // Redmean formula weights human sensitivity
  return (2 + rMean / 256) * r * r + 4 * g * g + (2 + (255 - rMean) / 256) * b * b;
}

export function preparePalette(blocks: MinecraftBlock[]): PrecomputedBlock[] {
  return blocks.map((block) => ({
    block,
    rgb: block.rgb,
    lab: rgbToLab(block.rgb),
  }));
}

export function findBestBlockIndex(
  pixelRgb: [number, number, number],
  palette: PrecomputedBlock[],
  mode: 'lab' | 'rgb'
): number {
  let bestIdx = 0;
  let minDistance = Infinity;

  if (mode === 'lab') {
    const pixelLab = rgbToLab(pixelRgb);
    for (let i = 0; i < palette.length; i++) {
      const dist = labDistance(pixelLab, palette[i].lab);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = i;
      }
    }
  } else {
    for (let i = 0; i < palette.length; i++) {
      const dist = rgbDistance(pixelRgb, palette[i].rgb);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}

/**
 * Apply brightness, contrast, and saturation adjustments to pixel data
 */
export function adjustPixel(
  r: number,
  g: number,
  b: number,
  brightness: number,
  contrast: number,
  saturation: number
): [number, number, number] {
  // Brightness (-50 to 50) -> -128 to 128
  let adjR = r + brightness * 2.55;
  let adjG = g + brightness * 2.55;
  let adjB = b + brightness * 2.55;

  // Contrast (-50 to 50)
  if (contrast !== 0) {
    const factor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
    adjR = factor * (adjR - 128) + 128;
    adjG = factor * (adjG - 128) + 128;
    adjB = factor * (adjB - 128) + 128;
  }

  // Saturation (-50 to 50)
  if (saturation !== 0) {
    const gray = 0.2989 * adjR + 0.587 * adjG + 0.114 * adjB;
    const satFactor = 1 + saturation / 50;
    adjR = gray + (adjR - gray) * satFactor;
    adjG = gray + (adjG - gray) * satFactor;
    adjB = gray + (adjB - gray) * satFactor;
  }

  return [
    Math.max(0, Math.min(255, adjR)),
    Math.max(0, Math.min(255, adjG)),
    Math.max(0, Math.min(255, adjB)),
  ];
}

/**
 * Converts image element into a 2D matrix of block indices
 */
export function convertImageToBlocks(
  image: HTMLImageElement,
  settings: PixelArtSettings,
  activeBlocks: MinecraftBlock[]
): {
  grid: number[][];
  palette: MinecraftBlock[];
  counts: Record<string, number>;
  totalBlocks: number;
} {
  if (activeBlocks.length === 0) {
    throw new Error('At least one block must be enabled in the palette');
  }

  const { width, height, dithering, colorMatching, brightness, contrast, saturation } = settings;

  // Draw image to scale
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) {
    throw new Error('Failed to create canvas context');
  }

  // Draw scaled image smoothly
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.drawImage(image, 0, 0, width, height);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const precomputed = preparePalette(activeBlocks);
  const grid: number[][] = [];
  const counts: Record<string, number> = {};
  let totalBlocks = 0;

  // Color buffer for error diffusion dithering (width x height x 3)
  const buffer: Float32Array[] = [];
  for (let y = 0; y < height; y++) {
    const row = new Float32Array(width * 3);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [ar, ag, ab] = adjustPixel(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        brightness,
        contrast,
        saturation
      );
      row[x * 3] = ar;
      row[x * 3 + 1] = ag;
      row[x * 3 + 2] = ab;
    }
    buffer.push(row);
  }

  // Iterate row by row
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    const currentRow = buffer[y];
    const nextRow = y + 1 < height ? buffer[y + 1] : null;

    for (let x = 0; x < width; x++) {
      const pxIdx = x * 3;
      const currentR = Math.max(0, Math.min(255, currentRow[pxIdx]));
      const currentG = Math.max(0, Math.min(255, currentRow[pxIdx + 1]));
      const currentB = Math.max(0, Math.min(255, currentRow[pxIdx + 2]));

      const bestIdx = findBestBlockIndex([currentR, currentG, currentB], precomputed, colorMatching);
      grid[y][x] = bestIdx;

      const chosenBlock = activeBlocks[bestIdx];
      counts[chosenBlock.id] = (counts[chosenBlock.id] || 0) + 1;
      totalBlocks++;

      if (dithering === 'floyd-steinberg') {
        const [targetR, targetG, targetB] = chosenBlock.rgb;
        const errR = currentR - targetR;
        const errG = currentG - targetG;
        const errB = currentB - targetB;

        // Distribute error:
        // (x + 1, y): 7/16
        if (x + 1 < width) {
          currentRow[(x + 1) * 3] += (errR * 7) / 16;
          currentRow[(x + 1) * 3 + 1] += (errG * 7) / 16;
          currentRow[(x + 1) * 3 + 2] += (errB * 7) / 16;
        }
        if (nextRow) {
          // (x - 1, y + 1): 3/16
          if (x - 1 >= 0) {
            nextRow[(x - 1) * 3] += (errR * 3) / 16;
            nextRow[(x - 1) * 3 + 1] += (errG * 3) / 16;
            nextRow[(x - 1) * 3 + 2] += (errB * 3) / 16;
          }
          // (x, y + 1): 5/16
          nextRow[x * 3] += (errR * 5) / 16;
          nextRow[x * 3 + 1] += (errG * 5) / 16;
          nextRow[x * 3 + 2] += (errB * 5) / 16;
          // (x + 1, y + 1): 1/16
          if (x + 1 < width) {
            nextRow[(x + 1) * 3] += (errR * 1) / 16;
            nextRow[(x + 1) * 3 + 1] += (errG * 1) / 16;
            nextRow[(x + 1) * 3 + 2] += (errB * 1) / 16;
          }
        }
      }
    }
  }

  return {
    grid,
    palette: activeBlocks,
    counts,
    totalBlocks,
  };
}
