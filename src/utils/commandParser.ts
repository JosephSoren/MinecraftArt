import { MinecraftBlock, ConvertedArt } from '../types';
import { MINECRAFT_BLOCKS } from '../data/minecraftBlocks';

export interface ParsedBlockPoint {
  x: number;
  y: number;
  z: number;
  block: MinecraftBlock | null; // null for air / empty
  rawBlockName: string;
  originalCommand: string;
  lineNumber: number;
}

export type ProjectionPlane = 'auto' | 'xy' | 'xz' | 'zy';

export interface CommandParseResult {
  success: boolean;
  totalLines: number;
  validCommands: number;
  skippedLines: number;
  unrecognizedBlocks: string[];
  points: ParsedBlockPoint[];
  detectedPlane: 'xy' | 'xz' | 'zy';
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
    width: number;
    height: number;
    depth: number;
  };
  convertedArt: ConvertedArt | null;
  errorMessage?: string;
}

// Build fast block lookup dictionaries
const blockByCommandName = new Map<string, MinecraftBlock>();
const blockById = new Map<string, MinecraftBlock>();
const blockByName = new Map<string, MinecraftBlock>();

for (const block of MINECRAFT_BLOCKS) {
  blockByCommandName.set(block.commandName.toLowerCase(), block);
  blockById.set(block.id.toLowerCase(), block);
  blockByName.set(block.name.toLowerCase().replace(/[^a-z0-9]/g, ''), block);
}

// Common aliases mapping
const BLOCK_ALIASES: Record<string, string> = {
  air: 'air',
  cave_air: 'air',
  void_air: 'air',
  grass: 'grass_block',
  dirt_path: 'dirt',
  coarse_dirt: 'dirt',
  cobblestone: 'cobblestone',
  wood: 'oak_planks',
  planks: 'oak_planks',
  log: 'oak_log',
  stone_brick: 'stone_bricks',
  bricks: 'bricks',
  wool: 'white_wool',
  concrete: 'white_concrete',
  terracotta: 'terracotta',
  stained_glass: 'glass',
};

// Fallback color generator for unknown blocks
function generateFallbackBlock(rawName: string): MinecraftBlock {
  const cleanId = rawName.replace(/^minecraft:/, '').toLowerCase();
  
  // Deterministic color hash based on string
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = cleanId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const r = Math.abs((hash & 0xff0000) >> 16);
  const g = Math.abs((hash & 0x00ff00) >> 8);
  const b = Math.abs(hash & 0x0000ff);
  
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  const formattedName = cleanId
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    id: cleanId,
    name: formattedName,
    category: 'special',
    rgb: [r, g, b],
    hex,
    isSurvivalFriendly: true,
    textureStyle: 'smooth',
    commandName: rawName.startsWith('minecraft:') ? rawName : `minecraft:${rawName}`,
  };
}

/**
 * Resolves a raw block identifier (e.g., 'minecraft:red_concrete[waterlogged=false]') to a MinecraftBlock
 */
export function resolveMinecraftBlock(rawIdentifier: string): MinecraftBlock | null {
  if (!rawIdentifier) return null;

  // Clean block string: remove properties [...], NBT {...}, and namespace
  let clean = rawIdentifier.trim().toLowerCase();
  clean = clean.replace(/\[.*?\]/g, '');
  clean = clean.replace(/\{.*?\}/g, '');
  clean = clean.trim();

  // Check air
  if (
    clean === 'air' ||
    clean === 'minecraft:air' ||
    clean === 'cave_air' ||
    clean === 'minecraft:cave_air' ||
    clean === 'void_air' ||
    clean === 'minecraft:void_air' ||
    clean === 'barrier' ||
    clean === 'structure_void'
  ) {
    return null;
  }

  const withoutNamespace = clean.replace(/^minecraft:/, '');
  const withNamespace = clean.startsWith('minecraft:') ? clean : `minecraft:${clean}`;

  // 1. Direct Command Name
  if (blockByCommandName.has(withNamespace)) {
    return blockByCommandName.get(withNamespace)!;
  }

  // 2. Direct ID
  if (blockById.has(withoutNamespace)) {
    return blockById.get(withoutNamespace)!;
  }

  // 3. Alias check
  if (BLOCK_ALIASES[withoutNamespace]) {
    const aliased = BLOCK_ALIASES[withoutNamespace];
    if (aliased === 'air') return null;
    if (blockById.has(aliased)) return blockById.get(aliased)!;
  }

  // 4. Fuzzy search in MINECRAFT_BLOCKS
  for (const block of MINECRAFT_BLOCKS) {
    if (
      withoutNamespace.includes(block.id) ||
      block.id.includes(withoutNamespace) ||
      withoutNamespace.endsWith(`_${block.id}`) ||
      withoutNamespace.startsWith(`${block.id}_`)
    ) {
      return block;
    }
  }

  // 5. If unknown, create custom block with sensible color
  return generateFallbackBlock(clean);
}

/**
 * Parses coordinate tokens like "~", "~5", "~-3", "120", "-64"
 */
function parseCoordinateToken(token: string, base: number = 0): number | null {
  if (!token) return null;
  const trimmed = token.trim();
  
  if (trimmed === '~' || trimmed === '^') {
    return base;
  }

  if (trimmed.startsWith('~') || trimmed.startsWith('^')) {
    const num = parseFloat(trimmed.slice(1));
    return isNaN(num) ? base : base + num;
  }

  const directNum = parseFloat(trimmed);
  return isNaN(directNum) ? null : directNum;
}

/**
 * Parses raw command lines into a list of 3D block placements
 */
export function parseMinecraftCommandsText(
  text: string,
  projectionPlane: ProjectionPlane = 'auto'
): CommandParseResult {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      totalLines: 0,
      validCommands: 0,
      skippedLines: 0,
      unrecognizedBlocks: [],
      points: [],
      detectedPlane: 'xy',
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0 },
      convertedArt: null,
      errorMessage: 'Please enter or paste Minecraft commands.',
    };
  }

  const lines = text.split(/\r?\n/);
  const points: ParsedBlockPoint[] = [];
  const unrecognizedSet = new Set<string>();
  let validCommands = 0;
  let skippedLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
      skippedLines++;
      continue;
    }

    // Strip leading slash if present
    const cleanLine = rawLine.startsWith('/') ? rawLine.slice(1) : rawLine;
    const tokens = cleanLine.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // Support /setblock
    if (cmd === 'setblock' || cmd === 'minecraft:setblock') {
      if (tokens.length < 5) {
        skippedLines++;
        continue;
      }
      const x = parseCoordinateToken(tokens[1]);
      const y = parseCoordinateToken(tokens[2]);
      const z = parseCoordinateToken(tokens[3]);
      const rawBlock = tokens[4];

      if (x === null || y === null || z === null || !rawBlock) {
        skippedLines++;
        continue;
      }

      const resolved = resolveMinecraftBlock(rawBlock);
      if (!resolved && !rawBlock.toLowerCase().includes('air')) {
        unrecognizedSet.add(rawBlock);
      }

      points.push({
        x: Math.round(x),
        y: Math.round(y),
        z: Math.round(z),
        block: resolved,
        rawBlockName: rawBlock,
        originalCommand: rawLine,
        lineNumber: i + 1,
      });
      validCommands++;
    }
    // Support /fill x1 y1 z1 x2 y2 z2 block
    else if (cmd === 'fill' || cmd === 'minecraft:fill') {
      if (tokens.length < 8) {
        skippedLines++;
        continue;
      }
      const x1 = parseCoordinateToken(tokens[1]);
      const y1 = parseCoordinateToken(tokens[2]);
      const z1 = parseCoordinateToken(tokens[3]);
      const x2 = parseCoordinateToken(tokens[4]);
      const y2 = parseCoordinateToken(tokens[5]);
      const z2 = parseCoordinateToken(tokens[6]);
      const rawBlock = tokens[7];

      if (
        x1 === null || y1 === null || z1 === null ||
        x2 === null || y2 === null || z2 === null ||
        !rawBlock
      ) {
        skippedLines++;
        continue;
      }

      const resolved = resolveMinecraftBlock(rawBlock);
      if (!resolved && !rawBlock.toLowerCase().includes('air')) {
        unrecognizedSet.add(rawBlock);
      }

      const minX = Math.min(Math.round(x1), Math.round(x2));
      const maxX = Math.max(Math.round(x1), Math.round(x2));
      const minY = Math.min(Math.round(y1), Math.round(y2));
      const maxY = Math.max(Math.round(y1), Math.round(y2));
      const minZ = Math.min(Math.round(z1), Math.round(z2));
      const maxZ = Math.max(Math.round(z1), Math.round(z2));

      // Limit fill to prevent huge memory explosions (cap at 65536 points per fill)
      const count = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
      if (count > 65536) {
        skippedLines++;
        continue;
      }

      for (let fx = minX; fx <= maxX; fx++) {
        for (let fy = minY; fy <= maxY; fy++) {
          for (let fz = minZ; fz <= maxZ; fz++) {
            points.push({
              x: fx,
              y: fy,
              z: fz,
              block: resolved,
              rawBlockName: rawBlock,
              originalCommand: rawLine,
              lineNumber: i + 1,
            });
          }
        }
      }
      validCommands++;
    }
    // Support generic coordinate lines: "x y z block"
    else if (tokens.length >= 4 && parseCoordinateToken(tokens[0]) !== null) {
      const x = parseCoordinateToken(tokens[0]);
      const y = parseCoordinateToken(tokens[1]);
      const z = parseCoordinateToken(tokens[2]);
      const rawBlock = tokens[3];

      if (x !== null && y !== null && z !== null && rawBlock) {
        const resolved = resolveMinecraftBlock(rawBlock);
        if (!resolved && !rawBlock.toLowerCase().includes('air')) {
          unrecognizedSet.add(rawBlock);
        }
        points.push({
          x: Math.round(x),
          y: Math.round(y),
          z: Math.round(z),
          block: resolved,
          rawBlockName: rawBlock,
          originalCommand: rawLine,
          lineNumber: i + 1,
        });
        validCommands++;
      } else {
        skippedLines++;
      }
    } else {
      skippedLines++;
    }
  }

  if (points.length === 0) {
    return {
      success: false,
      totalLines: lines.length,
      validCommands: 0,
      skippedLines,
      unrecognizedBlocks: Array.from(unrecognizedSet),
      points: [],
      detectedPlane: 'xy',
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0 },
      convertedArt: null,
      errorMessage: 'No valid Minecraft /setblock or /fill commands found. Please check syntax.',
    };
  }

  // Calculate 3D bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const spanZ = maxZ - minZ + 1;

  // Determine optimal 2D projection plane
  let chosenPlane: 'xy' | 'xz' | 'zy' = 'xy';
  if (projectionPlane === 'auto') {
    if (spanY === 1 && spanX > 1 && spanZ > 1) {
      // Flat on ground -> XZ plane
      chosenPlane = 'xz';
    } else if (spanX === 1 && spanZ > 1 && spanY > 1) {
      // Facing East/West wall -> ZY plane
      chosenPlane = 'zy';
    } else if (spanZ === 1 && spanX > 1 && spanY > 1) {
      // Facing North/South wall -> XY plane
      chosenPlane = 'xy';
    } else {
      // Compare 2D areas (XY vs XZ vs ZY)
      const areaXY = spanX * spanY;
      const areaXZ = spanX * spanZ;
      const areaZY = spanZ * spanY;

      if (areaXY >= areaXZ && areaXY >= areaZY) {
        chosenPlane = 'xy';
      } else if (areaXZ >= areaXY && areaXZ >= areaZY) {
        chosenPlane = 'xz';
      } else {
        chosenPlane = 'zy';
      }
    }
  } else {
    chosenPlane = projectionPlane;
  }

  // Map points into 2D grid
  let width = 0;
  let height = 0;

  // Coordinate mapping functions
  let get2DCoords: (p: ParsedBlockPoint) => { gx: number; gy: number };

  if (chosenPlane === 'xy') {
    // Vertical wall (X is width, Y is height). In Minecraft Y increases upwards; in images Y=0 is top.
    width = spanX;
    height = spanY;
    get2DCoords = (p) => ({
      gx: p.x - minX,
      gy: maxY - p.y, // Invert Y so highest Minecraft Y is row 0
    });
  } else if (chosenPlane === 'xz') {
    // Horizontal floor (X is width, Z is height)
    width = spanX;
    height = spanZ;
    get2DCoords = (p) => ({
      gx: p.x - minX,
      gy: p.z - minZ,
    });
  } else {
    // ZY plane (Z is width, Y is height)
    width = spanZ;
    height = spanY;
    get2DCoords = (p) => ({
      gx: p.z - minZ,
      gy: maxY - p.y,
    });
  }

  // Guard against excessive size
  if (width <= 0 || height <= 0 || width > 512 || height > 512) {
    return {
      success: false,
      totalLines: lines.length,
      validCommands,
      skippedLines,
      unrecognizedBlocks: Array.from(unrecognizedSet),
      points,
      detectedPlane: chosenPlane,
      bounds: { minX, maxX, minY, maxY, minZ, maxZ, width: spanX, height: spanY, depth: spanZ },
      convertedArt: null,
      errorMessage: `Calculated dimensions (${width}×${height}) exceed the maximum supported 512×512 limit.`,
    };
  }

  // Find a fallback block for air/empty spaces
  const defaultAirBlock =
    blockById.get('white_concrete') ||
    blockById.get('glass') ||
    MINECRAFT_BLOCKS[0];

  // Palette accumulator
  const paletteMap = new Map<string, MinecraftBlock>();
  const counts: Record<string, number> = {};

  // Build 2D grid matrix
  const grid: number[][] = Array.from({ length: height }, () =>
    new Array(width).fill(-1)
  );

  // Default placed state
  const placedState: boolean[][] = Array.from({ length: height }, () =>
    new Array(width).fill(false)
  );

  // Apply points to grid in order (later commands overwrite earlier ones)
  const cellBlocks: (MinecraftBlock | null)[][] = Array.from({ length: height }, () =>
    new Array(width).fill(null)
  );

  for (const p of points) {
    const { gx, gy } = get2DCoords(p);
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      cellBlocks[gy][gx] = p.block;
    }
  }

  // Build final palette and grid indexes
  const blockList: MinecraftBlock[] = [];
  let totalBlocks = 0;

  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const block = cellBlocks[gy][gx] || defaultAirBlock;

      let paletteIdx = blockList.findIndex((b) => b.id === block.id);
      if (paletteIdx === -1) {
        paletteIdx = blockList.length;
        blockList.push(block);
      }

      grid[gy][gx] = paletteIdx;
      counts[block.id] = (counts[block.id] || 0) + 1;
      totalBlocks++;
    }
  }

  const convertedArt: ConvertedArt = {
    width,
    height,
    grid,
    blockPalette: blockList,
    totalBlocks,
    counts,
    placedState,
  };

  return {
    success: true,
    totalLines: lines.length,
    validCommands,
    skippedLines,
    unrecognizedBlocks: Array.from(unrecognizedSet),
    points,
    detectedPlane: chosenPlane,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      width: spanX,
      height: spanY,
      depth: spanZ,
    },
    convertedArt,
  };
}

/**
 * Built-in sample command snippets for instant 1-click testing
 */
export const SAMPLE_COMMAND_SNIPPETS: {
  id: string;
  title: string;
  description: string;
  commands: string;
}[] = [
  {
    id: 'mario_8bit',
    title: '8-Bit Retro Mario (Vertical Wall)',
    description: 'Classic 16×16 retro character sprite in vibrant concrete colors',
    commands: `# 8-Bit Mario Pixel Art
# Generated for Minecraft
setblock ~3 ~15 ~0 minecraft:red_concrete
setblock ~4 ~15 ~0 minecraft:red_concrete
setblock ~5 ~15 ~0 minecraft:red_concrete
setblock ~6 ~15 ~0 minecraft:red_concrete
setblock ~7 ~15 ~0 minecraft:red_concrete
setblock ~2 ~14 ~0 minecraft:red_concrete
setblock ~3 ~14 ~0 minecraft:red_concrete
setblock ~4 ~14 ~0 minecraft:red_concrete
setblock ~5 ~14 ~0 minecraft:red_concrete
setblock ~6 ~14 ~0 minecraft:red_concrete
setblock ~7 ~14 ~0 minecraft:red_concrete
setblock ~8 ~14 ~0 minecraft:red_concrete
setblock ~9 ~14 ~0 minecraft:red_concrete
setblock ~2 ~13 ~0 minecraft:brown_concrete
setblock ~3 ~13 ~0 minecraft:brown_concrete
setblock ~4 ~13 ~0 minecraft:brown_concrete
setblock ~5 ~13 ~0 minecraft:white_terracotta
setblock ~6 ~13 ~0 minecraft:white_terracotta
setblock ~7 ~13 ~0 minecraft:black_concrete
setblock ~8 ~13 ~0 minecraft:white_terracotta
setblock ~1 ~12 ~0 minecraft:brown_concrete
setblock ~2 ~12 ~0 minecraft:white_terracotta
setblock ~3 ~12 ~0 minecraft:brown_concrete
setblock ~4 ~12 ~0 minecraft:white_terracotta
setblock ~5 ~12 ~0 minecraft:white_terracotta
setblock ~6 ~12 ~0 minecraft:white_terracotta
setblock ~7 ~12 ~0 minecraft:black_concrete
setblock ~8 ~12 ~0 minecraft:white_terracotta
setblock ~9 ~12 ~0 minecraft:white_terracotta
setblock ~10 ~12 ~0 minecraft:white_terracotta
setblock ~1 ~11 ~0 minecraft:brown_concrete
setblock ~2 ~11 ~0 minecraft:white_terracotta
setblock ~3 ~11 ~0 minecraft:brown_concrete
setblock ~4 ~11 ~0 minecraft:brown_concrete
setblock ~5 ~11 ~0 minecraft:white_terracotta
setblock ~6 ~11 ~0 minecraft:white_terracotta
setblock ~7 ~11 ~0 minecraft:white_terracotta
setblock ~8 ~11 ~0 minecraft:black_concrete
setblock ~9 ~11 ~0 minecraft:white_terracotta
setblock ~10 ~11 ~0 minecraft:white_terracotta
setblock ~11 ~11 ~0 minecraft:white_terracotta
setblock ~1 ~10 ~0 minecraft:brown_concrete
setblock ~2 ~10 ~0 minecraft:brown_concrete
setblock ~3 ~10 ~0 minecraft:white_terracotta
setblock ~4 ~10 ~0 minecraft:white_terracotta
setblock ~5 ~10 ~0 minecraft:white_terracotta
setblock ~6 ~10 ~0 minecraft:white_terracotta
setblock ~7 ~10 ~0 minecraft:black_concrete
setblock ~8 ~10 ~0 minecraft:black_concrete
setblock ~9 ~10 ~0 minecraft:black_concrete
setblock ~10 ~10 ~0 minecraft:black_concrete
setblock ~3 ~9 ~0 minecraft:white_terracotta
setblock ~4 ~9 ~0 minecraft:white_terracotta
setblock ~5 ~9 ~0 minecraft:white_terracotta
setblock ~6 ~9 ~0 minecraft:white_terracotta
setblock ~7 ~9 ~0 minecraft:white_terracotta
setblock ~8 ~9 ~0 minecraft:white_terracotta
setblock ~2 ~8 ~0 minecraft:red_concrete
setblock ~3 ~8 ~0 minecraft:red_concrete
setblock ~4 ~8 ~0 minecraft:blue_concrete
setblock ~5 ~8 ~0 minecraft:red_concrete
setblock ~6 ~8 ~0 minecraft:red_concrete
setblock ~7 ~8 ~0 minecraft:red_concrete
setblock ~8 ~8 ~0 minecraft:blue_concrete
setblock ~9 ~8 ~0 minecraft:red_concrete
setblock ~10 ~8 ~0 minecraft:red_concrete
setblock ~1 ~7 ~0 minecraft:red_concrete
setblock ~2 ~7 ~0 minecraft:red_concrete
setblock ~3 ~7 ~0 minecraft:red_concrete
setblock ~4 ~7 ~0 minecraft:blue_concrete
setblock ~5 ~7 ~0 minecraft:red_concrete
setblock ~6 ~7 ~0 minecraft:red_concrete
setblock ~7 ~7 ~0 minecraft:red_concrete
setblock ~8 ~7 ~0 minecraft:blue_concrete
setblock ~9 ~7 ~0 minecraft:red_concrete
setblock ~10 ~7 ~0 minecraft:red_concrete
setblock ~11 ~7 ~0 minecraft:red_concrete
setblock ~0 ~6 ~0 minecraft:red_concrete
setblock ~1 ~6 ~0 minecraft:red_concrete
setblock ~2 ~6 ~0 minecraft:red_concrete
setblock ~3 ~6 ~0 minecraft:red_concrete
setblock ~4 ~6 ~0 minecraft:blue_concrete
setblock ~5 ~6 ~0 minecraft:blue_concrete
setblock ~6 ~6 ~0 minecraft:blue_concrete
setblock ~7 ~6 ~0 minecraft:blue_concrete
setblock ~8 ~6 ~0 minecraft:blue_concrete
setblock ~9 ~6 ~0 minecraft:red_concrete
setblock ~10 ~6 ~0 minecraft:red_concrete
setblock ~11 ~6 ~0 minecraft:red_concrete
setblock ~12 ~6 ~0 minecraft:red_concrete
setblock ~0 ~5 ~0 minecraft:white_terracotta
setblock ~1 ~5 ~0 minecraft:white_terracotta
setblock ~2 ~5 ~0 minecraft:red_concrete
setblock ~3 ~5 ~0 minecraft:blue_concrete
setblock ~4 ~5 ~0 minecraft:yellow_concrete
setblock ~5 ~5 ~0 minecraft:blue_concrete
setblock ~6 ~5 ~0 minecraft:blue_concrete
setblock ~7 ~5 ~0 minecraft:blue_concrete
setblock ~8 ~5 ~0 minecraft:yellow_concrete
setblock ~9 ~5 ~0 minecraft:blue_concrete
setblock ~10 ~5 ~0 minecraft:red_concrete
setblock ~11 ~5 ~0 minecraft:white_terracotta
setblock ~12 ~5 ~0 minecraft:white_terracotta
setblock ~0 ~4 ~0 minecraft:white_terracotta
setblock ~1 ~4 ~0 minecraft:white_terracotta
setblock ~2 ~4 ~0 minecraft:white_terracotta
setblock ~3 ~4 ~0 minecraft:blue_concrete
setblock ~4 ~4 ~0 minecraft:blue_concrete
setblock ~5 ~4 ~0 minecraft:blue_concrete
setblock ~6 ~4 ~0 minecraft:blue_concrete
setblock ~7 ~4 ~0 minecraft:blue_concrete
setblock ~8 ~4 ~0 minecraft:blue_concrete
setblock ~9 ~4 ~0 minecraft:blue_concrete
setblock ~10 ~4 ~0 minecraft:white_terracotta
setblock ~11 ~4 ~0 minecraft:white_terracotta
setblock ~12 ~4 ~0 minecraft:white_terracotta
setblock ~0 ~3 ~0 minecraft:white_terracotta
setblock ~1 ~3 ~0 minecraft:white_terracotta
setblock ~2 ~3 ~0 minecraft:blue_concrete
setblock ~3 ~3 ~0 minecraft:blue_concrete
setblock ~4 ~3 ~0 minecraft:blue_concrete
setblock ~5 ~3 ~0 minecraft:blue_concrete
setblock ~6 ~3 ~0 minecraft:blue_concrete
setblock ~7 ~3 ~0 minecraft:blue_concrete
setblock ~8 ~3 ~0 minecraft:blue_concrete
setblock ~9 ~3 ~0 minecraft:blue_concrete
setblock ~10 ~3 ~0 minecraft:blue_concrete
setblock ~11 ~3 ~0 minecraft:white_terracotta
setblock ~12 ~3 ~0 minecraft:white_terracotta
setblock ~2 ~2 ~0 minecraft:blue_concrete
setblock ~3 ~2 ~0 minecraft:blue_concrete
setblock ~4 ~2 ~0 minecraft:blue_concrete
setblock ~7 ~2 ~0 minecraft:blue_concrete
setblock ~8 ~2 ~0 minecraft:blue_concrete
setblock ~9 ~2 ~0 minecraft:blue_concrete
setblock ~1 ~1 ~0 minecraft:brown_concrete
setblock ~2 ~1 ~0 minecraft:brown_concrete
setblock ~3 ~1 ~0 minecraft:brown_concrete
setblock ~8 ~1 ~0 minecraft:brown_concrete
setblock ~9 ~1 ~0 minecraft:brown_concrete
setblock ~10 ~1 ~0 minecraft:brown_concrete
setblock ~0 ~0 ~0 minecraft:brown_concrete
setblock ~1 ~0 ~0 minecraft:brown_concrete
setblock ~2 ~0 ~0 minecraft:brown_concrete
setblock ~3 ~0 ~0 minecraft:brown_concrete
setblock ~8 ~0 ~0 minecraft:brown_concrete
setblock ~9 ~0 ~0 minecraft:brown_concrete
setblock ~10 ~0 ~0 minecraft:brown_concrete
setblock ~11 ~0 ~0 minecraft:brown_concrete`,
  },
  {
    id: 'creeper_face',
    title: 'Creeper Face (Fill & Setblock)',
    description: 'Iconic Minecraft 8×8 Creeper Face with fill background and black concrete features',
    commands: `# Creeper Face 8x8
# Background Lime Concrete Base
fill ~0 ~0 ~0 ~7 ~7 ~0 minecraft:lime_concrete
# Black Concrete Eyes & Mouth
setblock ~1 ~5 ~0 minecraft:black_concrete
setblock ~2 ~5 ~0 minecraft:black_concrete
setblock ~5 ~5 ~0 minecraft:black_concrete
setblock ~6 ~5 ~0 minecraft:black_concrete
setblock ~1 ~4 ~0 minecraft:black_concrete
setblock ~2 ~4 ~0 minecraft:black_concrete
setblock ~5 ~4 ~0 minecraft:black_concrete
setblock ~6 ~4 ~0 minecraft:black_concrete
setblock ~3 ~3 ~0 minecraft:black_concrete
setblock ~4 ~3 ~0 minecraft:black_concrete
setblock ~2 ~2 ~0 minecraft:black_concrete
setblock ~3 ~2 ~0 minecraft:black_concrete
setblock ~4 ~2 ~0 minecraft:black_concrete
setblock ~5 ~2 ~0 minecraft:black_concrete
setblock ~2 ~1 ~0 minecraft:black_concrete
setblock ~3 ~1 ~0 minecraft:black_concrete
setblock ~4 ~1 ~0 minecraft:black_concrete
setblock ~5 ~1 ~0 minecraft:black_concrete
setblock ~2 ~0 ~0 minecraft:black_concrete
setblock ~5 ~0 ~0 minecraft:black_concrete`,
  },
  {
    id: 'pixel_heart',
    title: 'Retro Pixel Heart',
    description: '10×9 Valentine Pixel Heart with red & pink concrete and glossy white highlights',
    commands: `# Pixel Art Heart (10x9)
setblock ~2 ~8 ~0 minecraft:black_concrete
setblock ~3 ~8 ~0 minecraft:black_concrete
setblock ~6 ~8 ~0 minecraft:black_concrete
setblock ~7 ~8 ~0 minecraft:black_concrete
setblock ~1 ~7 ~0 minecraft:black_concrete
setblock ~2 ~7 ~0 minecraft:red_concrete
setblock ~3 ~7 ~0 minecraft:white_concrete
setblock ~4 ~7 ~0 minecraft:black_concrete
setblock ~5 ~7 ~0 minecraft:black_concrete
setblock ~6 ~7 ~0 minecraft:red_concrete
setblock ~7 ~7 ~0 minecraft:red_concrete
setblock ~8 ~7 ~0 minecraft:black_concrete
setblock ~0 ~6 ~0 minecraft:black_concrete
setblock ~1 ~6 ~0 minecraft:red_concrete
setblock ~2 ~6 ~0 minecraft:white_concrete
setblock ~3 ~6 ~0 minecraft:red_concrete
setblock ~4 ~6 ~0 minecraft:red_concrete
setblock ~5 ~6 ~0 minecraft:red_concrete
setblock ~6 ~6 ~0 minecraft:red_concrete
setblock ~7 ~6 ~0 minecraft:red_concrete
setblock ~8 ~6 ~0 minecraft:red_concrete
setblock ~9 ~6 ~0 minecraft:black_concrete
setblock ~0 ~5 ~0 minecraft:black_concrete
setblock ~1 ~5 ~0 minecraft:red_concrete
setblock ~2 ~5 ~0 minecraft:red_concrete
setblock ~3 ~5 ~0 minecraft:red_concrete
setblock ~4 ~5 ~0 minecraft:red_concrete
setblock ~5 ~5 ~0 minecraft:red_concrete
setblock ~6 ~5 ~0 minecraft:red_concrete
setblock ~7 ~5 ~0 minecraft:pink_concrete
setblock ~8 ~5 ~0 minecraft:red_concrete
setblock ~9 ~5 ~0 minecraft:black_concrete
setblock ~0 ~4 ~0 minecraft:black_concrete
setblock ~1 ~4 ~0 minecraft:red_concrete
setblock ~2 ~4 ~0 minecraft:red_concrete
setblock ~3 ~4 ~0 minecraft:red_concrete
setblock ~4 ~4 ~0 minecraft:red_concrete
setblock ~5 ~4 ~0 minecraft:red_concrete
setblock ~6 ~4 ~0 minecraft:red_concrete
setblock ~7 ~4 ~0 minecraft:red_concrete
setblock ~8 ~4 ~0 minecraft:red_concrete
setblock ~9 ~4 ~0 minecraft:black_concrete
setblock ~1 ~3 ~0 minecraft:black_concrete
setblock ~2 ~3 ~0 minecraft:red_concrete
setblock ~3 ~3 ~0 minecraft:red_concrete
setblock ~4 ~3 ~0 minecraft:red_concrete
setblock ~5 ~3 ~0 minecraft:red_concrete
setblock ~6 ~3 ~0 minecraft:red_concrete
setblock ~7 ~3 ~0 minecraft:red_concrete
setblock ~8 ~3 ~0 minecraft:black_concrete
setblock ~2 ~2 ~0 minecraft:black_concrete
setblock ~3 ~2 ~0 minecraft:red_concrete
setblock ~4 ~2 ~0 minecraft:red_concrete
setblock ~5 ~2 ~0 minecraft:red_concrete
setblock ~6 ~2 ~0 minecraft:red_concrete
setblock ~7 ~2 ~0 minecraft:black_concrete
setblock ~3 ~1 ~0 minecraft:black_concrete
setblock ~4 ~1 ~0 minecraft:red_concrete
setblock ~5 ~1 ~0 minecraft:red_concrete
setblock ~6 ~1 ~0 minecraft:black_concrete
setblock ~4 ~0 ~0 minecraft:black_concrete
setblock ~5 ~0 ~0 minecraft:black_concrete`,
  },
  {
    id: 'diamond_sword',
    title: 'Minecraft Diamond Sword',
    description: '16×16 Diagonal Diamond Sword with cyan concrete, diamond blocks, and oak hilt',
    commands: `# Diamond Sword 16x16
setblock ~14 ~15 ~0 minecraft:black_concrete
setblock ~13 ~15 ~0 minecraft:black_concrete
setblock ~12 ~14 ~0 minecraft:black_concrete
setblock ~13 ~14 ~0 minecraft:diamond_block
setblock ~14 ~14 ~0 minecraft:cyan_concrete
setblock ~15 ~14 ~0 minecraft:black_concrete
setblock ~11 ~13 ~0 minecraft:black_concrete
setblock ~12 ~13 ~0 minecraft:diamond_block
setblock ~13 ~13 ~0 minecraft:diamond_block
setblock ~14 ~13 ~0 minecraft:black_concrete
setblock ~10 ~12 ~0 minecraft:black_concrete
setblock ~11 ~12 ~0 minecraft:diamond_block
setblock ~12 ~12 ~0 minecraft:diamond_block
setblock ~13 ~12 ~0 minecraft:black_concrete
setblock ~9 ~11 ~0 minecraft:black_concrete
setblock ~10 ~11 ~0 minecraft:diamond_block
setblock ~11 ~11 ~0 minecraft:diamond_block
setblock ~12 ~11 ~0 minecraft:black_concrete
setblock ~8 ~10 ~0 minecraft:black_concrete
setblock ~9 ~10 ~0 minecraft:diamond_block
setblock ~10 ~10 ~0 minecraft:diamond_block
setblock ~11 ~10 ~0 minecraft:black_concrete
setblock ~7 ~9 ~0 minecraft:black_concrete
setblock ~8 ~9 ~0 minecraft:diamond_block
setblock ~9 ~9 ~0 minecraft:diamond_block
setblock ~10 ~9 ~0 minecraft:black_concrete
setblock ~6 ~8 ~0 minecraft:black_concrete
setblock ~7 ~8 ~0 minecraft:diamond_block
setblock ~8 ~8 ~0 minecraft:diamond_block
setblock ~9 ~8 ~0 minecraft:black_concrete
setblock ~5 ~7 ~0 minecraft:black_concrete
setblock ~6 ~7 ~0 minecraft:cyan_terracotta
setblock ~7 ~7 ~0 minecraft:diamond_block
setblock ~8 ~7 ~0 minecraft:black_concrete
setblock ~4 ~6 ~0 minecraft:black_concrete
setblock ~5 ~6 ~0 minecraft:cyan_terracotta
setblock ~6 ~6 ~0 minecraft:cyan_terracotta
setblock ~7 ~6 ~0 minecraft:black_concrete
setblock ~9 ~6 ~0 minecraft:black_concrete
setblock ~3 ~5 ~0 minecraft:black_concrete
setblock ~4 ~5 ~0 minecraft:cyan_terracotta
setblock ~5 ~5 ~0 minecraft:black_concrete
setblock ~7 ~5 ~0 minecraft:cyan_terracotta
setblock ~8 ~5 ~0 minecraft:cyan_terracotta
setblock ~9 ~5 ~0 minecraft:black_concrete
setblock ~2 ~4 ~0 minecraft:black_concrete
setblock ~3 ~4 ~0 minecraft:black_concrete
setblock ~4 ~4 ~0 minecraft:oak_planks
setblock ~5 ~4 ~0 minecraft:black_concrete
setblock ~6 ~4 ~0 minecraft:cyan_terracotta
setblock ~7 ~4 ~0 minecraft:black_concrete
setblock ~1 ~3 ~0 minecraft:black_concrete
setblock ~2 ~3 ~0 minecraft:oak_planks
setblock ~3 ~3 ~0 minecraft:oak_planks
setblock ~4 ~3 ~0 minecraft:black_concrete
setblock ~0 ~2 ~0 minecraft:black_concrete
setblock ~1 ~2 ~0 minecraft:oak_planks
setblock ~2 ~2 ~0 minecraft:black_concrete
setblock ~0 ~1 ~0 minecraft:black_concrete
setblock ~1 ~1 ~0 minecraft:black_concrete`,
  },
];
