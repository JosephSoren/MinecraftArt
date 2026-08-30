export interface MinecraftBlock {
  id: string;
  name: string;
  category: BlockCategory;
  rgb: [number, number, number];
  hex: string;
  isSurvivalFriendly: boolean;
  textureStyle: 'concrete' | 'wool' | 'planks' | 'stone' | 'ore' | 'glass' | 'bark' | 'smooth' | 'terracotta' | 'bricks' | 'coral';
  commandName: string; // e.g. "minecraft:white_concrete"
}

export type BlockCategory =
  | 'concrete'
  | 'wool'
  | 'terracotta'
  | 'wood'
  | 'stone'
  | 'deepslate'
  | 'minerals'
  | 'nature'
  | 'nether'
  | 'glass'
  | 'special';

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  filter: (block: MinecraftBlock) => boolean;
}

export interface PixelArtSettings {
  width: number;
  height: number;
  lockAspectRatio: boolean;
  dithering: 'none' | 'floyd-steinberg';
  colorMatching: 'lab' | 'rgb';
  brightness: number; // -50 to 50
  contrast: number;   // -50 to 50
  saturation: number; // -50 to 50
  orientation: 'horizontal' | 'vertical'; // Horizontal (floor/map art) or Vertical (wall/billboard)
}

export interface GridSettings {
  showGrid: boolean;
  showCoordinates: boolean;
  showChunkGrid: boolean; // 16x16 chunk or stack boundaries
  gridColor: 'subtle' | 'high-contrast' | 'dark' | 'neon';
  gridOpacity: number; // 0.1 to 1.0
  renderMode?: 'texture' | 'flat'; // 'texture' for authentic 16x16 Minecraft PNG images, 'flat' for solid colors
}

export interface ConvertedArt {
  width: number;
  height: number;
  grid: number[][]; // grid[y][x] = block index in current active blocks
  blockPalette: MinecraftBlock[];
  totalBlocks: number;
  counts: Record<string, number>; // block id -> count
  placedState: boolean[][]; // [y][x] = true if marked as built in-game
}

export interface LayerData {
  layerIndex: number; // 0 to height-1 (or rows)
  label: string;
  blocks: { x: number; block: MinecraftBlock; isPlaced: boolean }[];
  blockCounts: Record<string, number>;
  totalInLayer: number;
  placedInLayer: number;
}
