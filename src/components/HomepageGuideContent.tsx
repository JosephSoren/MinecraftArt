import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Box,
  Compass,
  Cpu,
  ShieldCheck,
  Grid,
  Download,
  Terminal,
  Zap,
  ChevronDown,
  ChevronUp,
  MapPin,
  Palette,
  PackageCheck,
  Flame,
  Lightbulb,
  FileCode,
  ArrowRight,
} from 'lucide-react';

interface HomepageGuideContentProps {
  onSelectSampleImage?: (url: string, name: string) => void;
  onNavigateTab?: (tab: 'generator' | 'commandConverter' | 'palette' | 'layerGuide' | 'commands' | 'materials') => void;
}

export const HomepageGuideContent: React.FC<HomepageGuideContentProps> = ({
  onSelectSampleImage,
  onNavigateTab,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: 'What is the optimal image resolution for Minecraft pixel art?',
      a: 'For vertical wall art, resolutions between 32×32 and 64×64 provide crisp character sprites and logos while requiring manageable block counts (1,024 to 4,096 blocks). For in-game Minecraft Map Art, standard maps in Item Frames measure exactly 128×128 blocks. When building in Survival mode, starting with 24×24 or 32×32 allows you to finish projects in a single play session without gathering dozens of shulker boxes.',
    },
    {
      q: 'How does the CIEDE2000 color matching algorithm work?',
      a: 'Standard Euclidean RGB distance calculates color differences mathematically, which often misjudges human eye sensitivity to greens and yellows. Our CIEDE2000 Delta-E color-difference algorithm accounts for human perceptual non-uniformity, lightness compensation, and chroma weighting, resulting in far more lifelike skin tones, vibrant gradients, and natural shading across Minecraft wool, concrete, and terracotta blocks.',
    },
    {
      q: 'What is the difference between Concrete, Wool, and Terracotta palettes?',
      a: 'Concrete blocks offer clean, saturated, high-contrast solid colors without distracting surface grain—ideal for modern logos, anime characters, and retro 8-bit sprites. Wool blocks feature subtle textile grid textures and classic hues. Terracotta (formerly hardened clay) provides warm, muted, earthy pastels and realistic skintones that blend smoothly in portraits and landscape paintings.',
    },
    {
      q: 'How do I build pixel art in Minecraft Survival mode without making mistakes?',
      a: 'Use our interactive "Layer Guide" tab. It isolates the build layer-by-layer from the ground up (Y=1 to Y=N). Each row highlights the exact sequence of blocks and coordinates, accompanied by checkboxes to mark completed rows. The "Materials List" calculates exact stacks and shulker box requirements before you leave your storage warehouse.',
    },
    {
      q: 'Can I generate commands to instantly spawn the pixel art in Creative mode?',
      a: 'Yes! Navigate to the "Export Commands" tab. You can copy single-command blocks, batch /setblock lines, or download a compiled .mcfunction datapack file. Place the function inside your Minecraft world folder (under datapacks/your_pack/data/pixelart/functions/) and run /function pixelart:build in-game.',
    },
    {
      q: 'How does the new "Commands to Art" reverse parser work?',
      a: 'If you have existing Minecraft /setblock or /fill command scripts or a .mcfunction file, switch to the "Commands to Art" tab. Paste the lines or upload the script, and our parser will reconstruct the 3D/2D coordinates, automatically identify the projection plane (wall vs floor), and render an interactive block blueprint ready for editing.',
    },
  ];

  return (
    <section className="mt-12 space-y-12 border-t border-[#20202c] pt-12 text-slate-300">
      {/* Visual Thumbnail Showcase & Feature Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Thumbnail Card 1: Accurate Texture Rendering */}
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 shadow-xl hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
          <div className="space-y-4">
            {/* Visual Thumbnail Header */}
            <div className="relative h-44 rounded-2xl bg-[#0a0a0f] border border-[#1e1e2c] overflow-hidden flex items-center justify-center p-3">
              {/* Decorative Minecraft Block Mosaic Illustration */}
              <div className="grid grid-cols-6 gap-1 w-full max-w-[200px]">
                {['red_concrete', 'lime_concrete', 'light_blue_concrete', 'yellow_concrete', 'pink_concrete', 'purple_concrete',
                  'white_wool', 'oak_planks', 'stone_bricks', 'gold_block', 'diamond_block', 'emerald_block',
                  'obsidian', 'crying_obsidian', 'lapis_block', 'sea_lantern', 'glowstone', 'magma_block',
                  'terracotta', 'cyan_terracotta', 'orange_terracotta', 'brown_concrete', 'black_concrete', 'tinted_glass'
                ].map((blockName, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md overflow-hidden border border-white/10 shadow-sm relative group-hover:scale-105 transition-transform"
                    style={{
                      backgroundImage: `url(https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2/blocks/${blockName}.png)`,
                      backgroundSize: 'cover',
                      imageRendering: 'pixelated',
                    }}
                  />
                ))}
              </div>
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                160+ Blocks
              </div>
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-400 font-mono mb-1">
                <Palette className="w-3.5 h-3.5" />
                <span>AUTHENTIC 16×16 TEXTURES</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Authentic Minecraft Block Textures & Palettes
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Preview your art with genuine in-game 16×16 pixel block textures. Toggle between survival-friendly concrete, wool, terracotta, glass, and specialty ores with customizable palette filters.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2a] flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>CIEDE2000 Perceptual Color Matching</span>
            <span className="text-emerald-400 font-bold">100% Accurate</span>
          </div>
        </div>

        {/* Thumbnail Card 2: Layer-by-Layer Survival Blueprint Guide */}
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 shadow-xl hover:border-teal-500/40 transition-all group flex flex-col justify-between">
          <div className="space-y-4">
            {/* Visual Thumbnail Header */}
            <div className="relative h-44 rounded-2xl bg-[#0a0a0f] border border-[#1e1e2c] overflow-hidden p-3 flex flex-col justify-center">
              {/* Simulated Layer Guide Stack */}
              <div className="space-y-1.5 font-mono text-[10px]">
                <div className="flex items-center justify-between p-2 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                    Layer Y=14 (Oak & Cyan)
                  </span>
                  <span className="bg-black/50 px-1.5 py-0.5 rounded text-[9px] text-teal-300">16/16 Placed</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#161622] border border-[#262638] text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center text-[8px]">13</span>
                    Layer Y=13 (Diamond & Black)
                  </span>
                  <span className="bg-black/50 px-1.5 py-0.5 rounded text-[9px] text-slate-400">Current</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0e0e16] border border-[#1c1c28] text-slate-500 opacity-60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[8px]">12</span>
                    Layer Y=12 (Terracotta)
                  </span>
                  <span className="text-[9px]">Pending</span>
                </div>
              </div>

              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 border border-teal-500/40 text-[10px] font-mono font-bold text-teal-300">
                Survival Guide
              </div>
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-400 font-mono mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>STEP-BY-STEP BUILDER</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                Interactive Layer-by-Layer Construction Mode
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Build massive pixel art in Survival Minecraft without losing your place. Isolate individual vertical or horizontal slices, track placed blocks, and check off completed rows.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2a] flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Material Shopping & Shulker Lists</span>
            <span className="text-teal-400 font-bold">Stack Breakdown</span>
          </div>
        </div>

        {/* Thumbnail Card 3: In-Game Commands & Datapack Export */}
        <div className="bg-[#121218] border border-[#222230] rounded-3xl p-5 shadow-xl hover:border-cyan-500/40 transition-all group flex flex-col justify-between">
          <div className="space-y-4">
            {/* Visual Thumbnail Header */}
            <div className="relative h-44 rounded-2xl bg-[#0a0a0f] border border-[#1e1e2c] overflow-hidden p-3 font-mono text-[10px] text-cyan-300 flex flex-col justify-center space-y-1">
              <div className="text-slate-500">// Minecraft In-Game Command Generator</div>
              <div className="bg-[#10151c] p-2 rounded-xl border border-cyan-500/30 text-emerald-400 leading-tight truncate">
                /fill ~0 ~0 ~0 ~15 ~15 ~0 white_concrete
              </div>
              <div className="bg-[#10151c] p-2 rounded-xl border border-cyan-500/30 text-cyan-300 leading-tight truncate">
                /setblock ~5 ~8 ~0 minecraft:red_concrete
              </div>
              <div className="bg-[#10151c] p-2 rounded-xl border border-cyan-500/30 text-cyan-300 leading-tight truncate">
                /setblock ~6 ~8 ~0 minecraft:diamond_block
              </div>

              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300">
                Instant Spawn
              </div>
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-cyan-400 font-mono mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>COMMANDS & MC FUNCTION</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                1-Click Command Blocks & Datapack Generator
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Export optimized Minecraft command scripts utilizing smart <code className="text-cyan-300 bg-black/40 px-1 rounded">/fill</code> optimizations to compress block placements, or download full <code className="text-cyan-300 bg-black/40 px-1 rounded">.mcfunction</code> files.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e1e2a] flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Vanilla Java & Bedrock Compatible</span>
            <span className="text-cyan-400 font-bold">1.12 - 1.21+</span>
          </div>
        </div>
      </div>

      {/* Deep Comprehensive Editorial Guide Section (800+ Words) */}
      <div className="bg-[#101015] border border-[#20202c] rounded-3xl p-6 sm:p-10 shadow-2xl space-y-10">
        {/* Article Main Header */}
        <div className="space-y-3 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>COMPREHENSIVE BUILDER'S HANDBOOK</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            How to Convert Any Image into Minecraft Pixel Art and Map Art
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to the definitive guide for crafting breathtaking pixel art, character sprites, anime portraits, company logos, and 128×128 map items in Minecraft. Whether you play in hardcore Survival mode or creative server sandboxes, converting digital 2D artwork into three-dimensional voxel blocks requires an understanding of color spaces, block textures, material gathering logistics, and spatial alignment.
          </p>
        </div>

        {/* Section 1: Understanding Pixel Art & Color Theory in Minecraft */}
        <div className="space-y-4 border-t border-[#1c1c28] pt-8">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center">
              01
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Color Matching Algorithms: Why CIEDE2000 Delta-E Outperforms Standard RGB
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                In standard computer graphics, color images are stored as 24-bit TrueColor RGB values (over 16.7 million unique color shades). However, in Minecraft, the building block palette consists of a discrete set of roughly 160 solid, full-cube building blocks. When an image is resized down to grid dimensions such as 32×32 or 64×64 pixels, each individual pixel must be mapped to the closest corresponding Minecraft block.
              </p>
              <p>
                Elementary conversion tools use simple Euclidean distance calculations (&radic;(&Delta;R&sup2; + &Delta;G&sup2; + &Delta;B&sup2;)). While fast, Euclidean distance suffers from a severe flaw: the human retina is substantially more sensitive to green wavelengths and subtle luminance variations than to blue hues. Euclidean distance frequently assigns muddy, mismatched blocks to human skin tones and vibrant landscape foliage.
              </p>
              <p>
                Our generator implements the standardized <strong>CIEDE2000 (&Delta;E)</strong> perceptual color metric alongside human eye luminance weighting (0.299R + 0.587G + 0.114B). By converting RGB color vectors into the CIELAB (L*a*b*) spherical color model, our engine accounts for hue rotation, chroma non-linearities, and lightness perception. This ensures that delicate highlights, soft shadows, and vibrant saturated accents are mapped to the most authentic Minecraft blocks available.
              </p>
            </div>

            {/* Sidebar Infobox */}
            <div className="lg:col-span-4 bg-[#151520] border border-[#262638] rounded-2xl p-4 space-y-3 text-xs">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                <span>Color Space Science</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>RGB Space:</strong> Fast but perceptually distorted for pastel skin tones.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>CIEDE2000:</strong> Highest visual fidelity; preserves high dynamic range contrast.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Dithering:</strong> Floyd-Steinberg diffusion creates smooth illusions of gradients using limited block palettes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Selecting Block Palettes and Materials */}
        <div className="space-y-4 border-t border-[#1c1c28] pt-8">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-xl bg-teal-500/10 border border-teal-500/40 text-teal-400 text-xs font-mono font-bold flex items-center justify-center">
              02
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Choosing the Right Block Material Categories for Your Project
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#14141d] border border-[#222232] rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-white">
                <div className="w-3 h-3 rounded-full bg-cyan-400" />
                <span>Concrete & Concrete Powder</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The gold standard for modern pixel art, 8-bit sprites, and digital logos. Concrete provides 16 flat, vibrant, high-contrast colors without distracting grain or borders.
              </p>
            </div>

            <div className="bg-[#14141d] border border-[#222232] rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-white">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span>Terracotta & Hardened Clay</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Essential for realistic human portraits, anime characters, and warm landscapes. Terracotta blocks feature warm, muted, desaturated tones that bridge smooth transitions.
              </p>
            </div>

            <div className="bg-[#14141d] border border-[#222232] rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-white">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span>Wool & Carpets</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Classic renewable building material easily farmable via automated sheep shearing pens in Survival. Offers vintage retro texture suitable for cartoon characters.
              </p>
            </div>

            <div className="bg-[#14141d] border border-[#222232] rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-white">
                <div className="w-3 h-3 rounded-full bg-purple-400" />
                <span>Natural Wood & Stones</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Oak, Birch, Spruce, Dark Oak, Mangrove, Cherry, and Bamboo planks add organic wood grains and rich earth tones for historical and fantasy builds.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Vertical Wall Art vs 128x128 Map Art */}
        <div className="space-y-4 border-t border-[#1c1c28] pt-8">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold flex items-center justify-center">
              03
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Vertical Wall Art vs. 128×128 In-Game Map Art: Key Differences
            </h3>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              When planning your construction in Minecraft, you must decide between two fundamental formats:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#13131c] border border-[#242436] rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <Grid className="w-4 h-4" />
                  <span>Vertical Wall Art (Facing North/South or East/West)</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Built vertically standing up like a billboard or facade in your world. Visible directly to players walking on the terrain. Best scaled from 16×16 up to 64×64. You can use any solid or transparent block including stained glass, glowstone, and sea lanterns for night illumination.
                </p>
              </div>

              <div className="bg-[#13131c] border border-[#242436] rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>Horizontal Map Art (128×128 Flat or Staircased Floor)</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Built horizontally on the ground or over ocean biomes to be rendered onto an in-game Minecraft Map item (which spans exactly 128×128 blocks per map level 0). When placed in an Item Frame inside your survival base, it functions as custom decorative wall posters or paintings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Survival Building Workflow & Shulker Logistics */}
        <div className="space-y-4 border-t border-[#1c1c28] pt-8">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold flex items-center justify-center">
              04
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Survival Building Workflow: Step-by-Step Blueprint Execution
            </h3>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Building large pixel art in Survival mode can easily lead to misplaced blocks and frustrating tears-downs if not structured methodically. Follow this four-step survival protocol:
            </p>
            <ol className="list-decimal list-inside space-y-2.5 text-xs sm:text-sm text-slate-300 pl-2">
              <li>
                <strong className="text-white">Material Procurement:</strong> Check the <strong>Materials List</strong> tab in our generator. Note the exact counts of full stacks (64 items) and Shulker Boxes (27 stacks = 1,728 items). Prepare your supplies in labeled chests or shulkers beforehand.
              </li>
              <li>
                <strong className="text-white">Foundation & Scaffolding:</strong> Establish your build baseline. Lay a foundation of dirt or cobblestone with coordinate markers every 10 blocks (marked with redstone torches or colored wool) to prevent off-by-one alignment errors.
              </li>
              <li>
                <strong className="text-white">Layer-by-Layer Assembly:</strong> Open the <strong>Layer Guide</strong> mode on your second monitor, tablet, or phone. Start at Layer Y=1 (bottom row) and place blocks left to right. Mark each row as complete in the UI as you advance.
              </li>
              <li>
                <strong className="text-white">Mob Proofing & Lighting:</strong> Install hidden lighting (such as Glowstone or Sea Lanterns covered by carpets) across horizontal surfaces to prevent hostile mob spawning on top of your artwork.
              </li>
            </ol>
          </div>
        </div>

        {/* Section 5: Reversing Minecraft Commands into Art */}
        <div className="space-y-4 border-t border-[#1c1c28] pt-8">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center">
              05
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Reverse Engineering: Converting Minecraft Commands to Visual Art
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Have you ever discovered a Minecraft command script or <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">.mcfunction</code> file on GitHub, Planet Minecraft, or YouTube and wondered what image it creates before pasting it into your server? Our built-in <strong>Commands to Art Converter</strong> parses standard <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">/setblock</code> and <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">/fill</code> command lines, calculates 3D bounding geometry, projects the coordinates onto the appropriate viewing plane, and outputs an editable blueprint complete with texture swatches.
          </p>
        </div>

        {/* Interactive FAQ Accordion Section */}
        <div className="space-y-4 border-t border-[#1c1c28] pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Frequently Asked Questions</h3>
            </div>
            <span className="text-xs text-slate-400">Everything you need to know</span>
          </div>

          <div className="space-y-2 pt-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#14141e] border border-[#222232] rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-[#1c1c2a] animate-in fade-in slide-in-from-top-1">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
