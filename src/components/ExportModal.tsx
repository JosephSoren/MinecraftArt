import React, { useState } from 'react';
import { Download, X, Image as ImageIcon, Check } from 'lucide-react';
import { ConvertedArt, MinecraftBlock } from '../types';
import { drawBlockTexture } from '../utils/textureRenderer';

interface ExportModalProps {
  art: ConvertedArt;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ art, isOpen, onClose }) => {
  const [scale, setScale] = useState<number>(4);
  const [withGrid, setWithGrid] = useState<boolean>(true);
  const [withChunkGrid, setWithChunkGrid] = useState<boolean>(true);
  const [withCoordinates, setWithCoordinates] = useState<boolean>(true);
  const [withTextures, setWithTextures] = useState<boolean>(true);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);

    setTimeout(() => {
      try {
        const { width, height, grid, blockPalette } = art;
        const blockSize = 8 * scale; // pixels per block
        const margin = withCoordinates ? 36 : 0; // margin for coordinate numbers

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width * blockSize + margin;
        exportCanvas.height = height * blockSize + margin;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // Set pixelated nearest neighbor interpolation for sharp 16x16 Minecraft textures
        ctx.imageSmoothingEnabled = false;
        (ctx as any).webkitImageSmoothingEnabled = false;
        (ctx as any).mozImageSmoothingEnabled = false;

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw blocks
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const blockIdx = grid[y][x];
            const block = blockPalette[blockIdx];
            if (!block) continue;

            const posX = margin + x * blockSize;
            const posY = margin + y * blockSize;
            drawBlockTexture(ctx, block, posX, posY, blockSize, withTextures ? 'texture' : 'flat');
          }
        }

        // Draw Grid
        if (withGrid && blockSize >= 4) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = Math.max(1, Math.round(blockSize * 0.05));
          ctx.beginPath();
          for (let x = 0; x <= width; x++) {
            const px = margin + x * blockSize;
            ctx.moveTo(px, margin);
            ctx.lineTo(px, margin + height * blockSize);
          }
          for (let y = 0; y <= height; y++) {
            const py = margin + y * blockSize;
            ctx.moveTo(margin, py);
            ctx.lineTo(margin + width * blockSize, py);
          }
          ctx.stroke();
        }

        // Draw Chunk Boundaries (every 16 blocks)
        if (withChunkGrid && (width > 16 || height > 16)) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = Math.max(2, Math.round(blockSize * 0.1));
          ctx.beginPath();
          for (let x = 0; x <= width; x += 16) {
            const px = margin + x * blockSize;
            ctx.moveTo(px, margin);
            ctx.lineTo(px, margin + height * blockSize);
          }
          for (let y = 0; y <= height; y += 16) {
            const py = margin + y * blockSize;
            ctx.moveTo(margin, py);
            ctx.lineTo(margin + width * blockSize, py);
          }
          ctx.stroke();
        }

        // Draw Coordinate Numbers in Margin
        if (withCoordinates) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${Math.max(10, Math.min(14, blockSize * 0.4))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Top coordinates X
          for (let x = 0; x < width; x++) {
            // Label every 4 or 8 blocks to avoid crowding
            const step = width > 48 ? 8 : 4;
            if (x % step === 0 || x === width - 1) {
              const px = margin + x * blockSize + blockSize / 2;
              ctx.fillText(x.toString(), px, margin / 2);
            }
          }

          // Left coordinates Y
          ctx.textAlign = 'right';
          for (let y = 0; y < height; y++) {
            const step = height > 48 ? 8 : 4;
            if (y % step === 0 || y === height - 1) {
              const py = margin + y * blockSize + blockSize / 2;
              ctx.fillText(y.toString(), margin - 6, py);
            }
          }
        }

        // Export as file
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        exportCanvas.toBlob(
          (blob) => {
            if (!blob) return;
            const a = document.createElement('a');
            a.download = `minecraft_pixel_art_${art.width}x${art.height}_${scale}x.${format}`;
            a.href = URL.createObjectURL(blob);
            a.click();
            setIsExporting(false);
            onClose();
          },
          mimeType,
          0.95
        );
      } catch (err) {
        console.error(err);
        setIsExporting(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121217] border border-[#22222c] rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#20202a] pb-3">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-[#4ade80]" />
            <h3 className="font-bold text-base text-white">Export HD Blueprint Image</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#181824] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4 text-xs">
          {/* Resolution Multiplier */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">Resolution Scale</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`py-2 rounded-xl font-mono font-bold transition-colors cursor-pointer ${
                    scale === s
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-[#181824] text-slate-300 hover:bg-[#222230] border border-[#262636]'
                  }`}
                >
                  {s}x {s === 4 ? '(HD)' : s === 8 ? '(Ultra)' : ''}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Final image size:{' '}
              <strong className="text-[#4ade80] font-mono">
                {art.width * 8 * scale + (withCoordinates ? 36 : 0)} ×{' '}
                {art.height * 8 * scale + (withCoordinates ? 36 : 0)} px
              </strong>
            </p>
          </div>

          {/* Blueprint Overlays */}
          <div className="space-y-2 pt-1 border-t border-[#20202a]">
            <label className="font-semibold text-slate-300 block">Appearance & Overlays</label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withTextures}
                onChange={(e) => setWithTextures(e.target.checked)}
                className="rounded accent-[#4ade80]"
              />
              <span className="font-medium text-white">Render Authentic 16×16 Minecraft Textures</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withGrid}
                onChange={(e) => setWithGrid(e.target.checked)}
                className="rounded accent-[#4ade80]"
              />
              <span>Include 1×1 Block Grid Lines</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withChunkGrid}
                onChange={(e) => setWithChunkGrid(e.target.checked)}
                className="rounded accent-[#4ade80]"
              />
              <span>Include 16×16 Chunk / Stack Boundary Lines</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withCoordinates}
                onChange={(e) => setWithCoordinates(e.target.checked)}
                className="rounded accent-[#4ade80]"
              />
              <span>Include Coordinate Labels (X & Y Rulers)</span>
            </label>
          </div>

          {/* Image Format */}
          <div className="pt-1 border-t border-[#20202a]">
            <label className="font-semibold text-slate-300 block mb-1.5">File Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('png')}
                className={`py-2 rounded-xl font-mono font-semibold transition-colors cursor-pointer ${
                  format === 'png'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-[#181824] text-slate-300 hover:bg-[#222230] border border-[#262636]'
                }`}
              >
                PNG (Lossless & Sharp)
              </button>
              <button
                onClick={() => setFormat('jpeg')}
                className={`py-2 rounded-xl font-mono font-semibold transition-colors cursor-pointer ${
                  format === 'jpeg'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-[#181824] text-slate-300 hover:bg-[#222230] border border-[#262636]'
                }`}
              >
                JPEG (Smaller file size)
              </button>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          id="confirmDownloadHdBtn"
          onClick={handleDownload}
          disabled={isExporting}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Generating HD Image...' : 'Download Blueprint File'}</span>
        </button>
      </div>
    </div>
  );
};
