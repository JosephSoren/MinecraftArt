export interface SampleImage {
  id: string;
  name: string;
  category: string;
  recommendedWidth: number;
  recommendedHeight: number;
  dataUrl: string;
}

// Generate high quality pixel art canvas data URLs procedurally
function createPixelArtDataUrl(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D) => void
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawFn(ctx);
  return canvas.toDataURL('image/png');
}

export function getSampleImages(): SampleImage[] {
  // 1. Minecraft Creeper Face (16x16)
  const creeperUrl = createPixelArtDataUrl(16, 16, (ctx) => {
    // Fill green base shades
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const shade = 100 + Math.floor((Math.sin(x * 0.8) + Math.cos(y * 0.9) + 2) * 35);
        ctx.fillStyle = `rgb(30, ${shade}, 40)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Eyes
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(10, 4, 3, 3);
    // Nose & Mouth
    ctx.fillRect(6, 7, 4, 4);
    ctx.fillRect(4, 9, 2, 5);
    ctx.fillRect(10, 9, 2, 5);
  });

  // 2. Diamond Sword (16x16)
  const swordUrl = createPixelArtDataUrl(16, 16, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);

    const D = '#48e0d4'; // Diamond
    const d = '#2cb3a8'; // Dark diamond
    const W = '#7a5230'; // Wood handle
    const O = '#261b12'; // Dark wood
    const B = '#151515'; // Outline

    // Blade
    ctx.fillStyle = D;
    ctx.fillRect(13, 2, 1, 1);
    ctx.fillRect(12, 3, 2, 1);
    ctx.fillRect(11, 4, 2, 2);
    ctx.fillRect(10, 5, 2, 2);
    ctx.fillRect(9, 6, 2, 2);
    ctx.fillRect(8, 7, 2, 2);
    ctx.fillStyle = d;
    ctx.fillRect(14, 1, 1, 1);
    ctx.fillRect(13, 3, 1, 1);
    ctx.fillRect(12, 4, 1, 1);
    ctx.fillRect(11, 5, 1, 1);
    ctx.fillRect(10, 6, 1, 1);
    ctx.fillRect(9, 7, 1, 1);

    // Crossguard
    ctx.fillStyle = B;
    ctx.fillRect(6, 8, 3, 1);
    ctx.fillRect(7, 9, 3, 1);
    ctx.fillStyle = D;
    ctx.fillRect(6, 9, 1, 2);
    ctx.fillRect(8, 8, 1, 1);

    // Handle
    ctx.fillStyle = W;
    ctx.fillRect(4, 11, 2, 2);
    ctx.fillRect(3, 12, 2, 2);
    ctx.fillStyle = O;
    ctx.fillRect(2, 13, 2, 2);
  });

  // 3. 8-Bit Pixel Heart (16x16)
  const heartUrl = createPixelArtDataUrl(16, 16, (ctx) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 16, 16);

    const R = '#e11d48'; // Red
    const L = '#fb7185'; // Light Red / Highlight
    const D = '#9f1239'; // Dark Red shadow
    const B = '#1e1b4b'; // Outline

    // Heart pattern
    const pattern = [
      '................',
      '..BBBB....BBBB..',
      '.BLLRRB..BRRRRB.',
      'BLLRRRRBBRRRRRRB',
      'BLRRRRRRRRRRRRRB',
      'BLRRRRRRRRRRRRRB',
      '.BRRRRRRRRRRRRB.',
      '.BRRRRRRRRRRRRB.',
      '..BRRRRRRRRRRB..',
      '..BDDRRRRRRDB...',
      '...BDDRRRRDB....',
      '....BDDRRDB.....',
      '.....BDDDB......',
      '......BDB.......',
      '.......B........',
      '................',
    ];

    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        const char = pattern[y][x];
        if (char === 'B') ctx.fillStyle = B;
        else if (char === 'L') ctx.fillStyle = L;
        else if (char === 'R') ctx.fillStyle = R;
        else if (char === 'D') ctx.fillStyle = D;
        else continue;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 4. Sunset Mountain Landscape (32x24)
  const sunsetUrl = createPixelArtDataUrl(32, 24, (ctx) => {
    // Sky gradient
    for (let y = 0; y < 14; y++) {
      const r = Math.floor(255 - y * 4);
      const g = Math.floor(100 + y * 7);
      const b = Math.floor(40 + y * 12);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, y, 32, 1);
    }
    // Sun
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(16, 9, 4, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountain
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(8, 7);
    ctx.lineTo(17, 14);
    ctx.lineTo(24, 8);
    ctx.lineTo(32, 16);
    ctx.lineTo(32, 24);
    ctx.lineTo(0, 24);
    ctx.fill();

    // Foreground hills
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(12, 12);
    ctx.lineTo(20, 18);
    ctx.lineTo(28, 13);
    ctx.lineTo(32, 17);
    ctx.lineTo(32, 24);
    ctx.lineTo(0, 24);
    ctx.fill();

    // Pine trees
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 13, 2, 6);
    ctx.fillRect(5, 11, 1, 2);
    ctx.fillRect(19, 15, 2, 7);
    ctx.fillRect(20, 13, 1, 2);
    ctx.fillRect(25, 14, 2, 6);
  });

  return [
    {
      id: 'creeper',
      name: 'Creeper Face',
      category: 'Minecraft',
      recommendedWidth: 16,
      recommendedHeight: 16,
      dataUrl: creeperUrl,
    },
    {
      id: 'diamond_sword',
      name: 'Diamond Sword',
      category: 'Minecraft',
      recommendedWidth: 16,
      recommendedHeight: 16,
      dataUrl: swordUrl,
    },
    {
      id: 'pixel_heart',
      name: 'Retro 8-Bit Heart',
      category: 'Icons',
      recommendedWidth: 16,
      recommendedHeight: 16,
      dataUrl: heartUrl,
    },
    {
      id: 'sunset_mountains',
      name: 'Sunset Vista',
      category: 'Art',
      recommendedWidth: 32,
      recommendedHeight: 24,
      dataUrl: sunsetUrl,
    },
  ];
}
