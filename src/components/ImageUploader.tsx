import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  Link,
  Unlink,
  Sliders,
  Maximize2,
  RefreshCw,
  Compass,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { PixelArtSettings } from '../types';
import { getSampleImages, SampleImage } from '../data/sampleImages';

interface ImageUploaderProps {
  settings: PixelArtSettings;
  setSettings: React.Dispatch<React.SetStateAction<PixelArtSettings>>;
  onImageLoaded: (img: HTMLImageElement, name: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasLoadedImage: boolean;
  activeBlockCount: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  settings,
  setSettings,
  onImageLoaded,
  onGenerate,
  isGenerating,
  hasLoadedImage,
  activeBlockCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [originalAspect, setOriginalAspect] = useState<number>(1);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const sampleImages = getSampleImages();

  // Load default sample image on start if none loaded
  useEffect(() => {
    if (!hasLoadedImage && sampleImages.length > 0) {
      handleSelectSample(sampleImages[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreviewUrl(result);
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        setOriginalAspect(aspect);
        setOriginalDimensions({ width: img.width, height: img.height });

        // Intelligently calculate target dimensions default (defaulting to clean readable size)
        let w = Math.min(128, Math.max(16, img.width));
        let h = Math.round(w / aspect);
        if (h > 128) {
          h = 128;
          w = Math.round(h * aspect);
        }

        setSettings((prev) => ({
          ...prev,
          width: w,
          height: h,
        }));

        onImageLoaded(img, file.name.replace(/\.[^/.]+$/, ''));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: SampleImage) => {
    setImagePreviewUrl(sample.dataUrl);
    const img = new Image();
    img.onload = () => {
      const aspect = img.width / img.height;
      setOriginalAspect(aspect);
      setOriginalDimensions({ width: img.width, height: img.height });
      setSettings((prev) => ({
        ...prev,
        width: sample.recommendedWidth,
        height: sample.recommendedHeight,
      }));
      onImageLoaded(img, sample.name);
    };
    img.src = sample.dataUrl;
  };

  const handleWidthChange = (val: number) => {
    const w = Math.max(4, Math.min(2048, val));
    if (settings.lockAspectRatio) {
      const h = Math.max(4, Math.min(2048, Math.round(w / originalAspect)));
      setSettings((prev) => ({ ...prev, width: w, height: h }));
    } else {
      setSettings((prev) => ({ ...prev, width: w }));
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(4, Math.min(2048, val));
    if (settings.lockAspectRatio) {
      const w = Math.max(4, Math.min(2048, Math.round(h * originalAspect)));
      setSettings((prev) => ({ ...prev, width: w, height: h }));
    } else {
      setSettings((prev) => ({ ...prev, height: h }));
    }
  };

  const handlePresetSize = (size: number) => {
    if (settings.lockAspectRatio) {
      if (originalAspect >= 1) {
        const w = size;
        const h = Math.max(4, Math.round(size / originalAspect));
        setSettings((prev) => ({ ...prev, width: w, height: h }));
      } else {
        const h = size;
        const w = Math.max(4, Math.round(size * originalAspect));
        setSettings((prev) => ({ ...prev, width: w, height: h }));
      }
    } else {
      setSettings((prev) => ({ ...prev, width: size, height: size }));
    }
  };

  const handleFullOriginalResolution = () => {
    if (!originalDimensions) return;
    setSettings((prev) => ({
      ...prev,
      width: originalDimensions.width,
      height: originalDimensions.height,
    }));
  };

  return (
    <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl space-y-6 text-slate-200">
      {/* Upload Zone */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          1. Upload Image or Choose Template
        </label>

        <div
          id="dropzone-area"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-emerald-400 bg-[#16291e]/50'
              : 'border-[#262634] hover:border-emerald-500/50 bg-[#0c0c0e]/70 hover:bg-[#121218]'
          }`}
        >
          <input
            ref={fileInputRef}
            id="mainImageInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />

          {imagePreviewUrl ? (
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#2a2a3a] bg-[#181822] flex-shrink-0 relative shadow-inner">
                <img
                  src={imagePreviewUrl}
                  alt="Source preview"
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Image Loaded
                </p>
                <p className="text-xs text-slate-400">Click or drag a new file to replace</p>
              </div>
            </div>
          ) : (
            <div className="py-3">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">
                Drag & drop your picture here or <span className="text-[#4ade80] font-semibold">browse</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WebP, GIF</p>
            </div>
          )}
        </div>

        {/* Sample Images Carousel */}
        <div className="mt-3">
          <span className="text-xs text-slate-400 block mb-1.5 font-medium">Quick Templates:</span>
          <div className="flex flex-wrap gap-2">
            {sampleImages.map((sample) => (
              <button
                key={sample.id}
                id={`sample-btn-${sample.id}`}
                onClick={() => handleSelectSample(sample)}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#181824] hover:bg-[#222230] border border-[#262636] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <img
                  src={sample.dataUrl}
                  alt={sample.name}
                  className="w-4 h-4 rounded object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span>{sample.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Size in Blocks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            2. Build Size (In Minecraft Blocks)
          </label>
          <span className="text-xs font-medium text-[#4ade80] bg-[#14261c] px-2 py-0.5 rounded-md border border-emerald-500/30 font-mono">
            {(settings.width * settings.height).toLocaleString()} Blocks Total
          </span>
        </div>

        {/* Continuous Dimension Slider */}
        <div className="bg-[#0e0e13] border border-[#222232] rounded-xl p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Canvas Scale & Resolution:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {settings.width} × {settings.height} blocks
            </span>
          </div>
          <input
            id="dimension-slider"
            type="range"
            min="8"
            max={originalDimensions ? Math.max(512, Math.max(originalDimensions.width, originalDimensions.height)) : 512}
            step="1"
            value={settings.width}
            onChange={(e) => handleWidthChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#202030] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>8 blocks</span>
            <span>64</span>
            <span>128</span>
            <span>256</span>
            <span>512+ (Large Canvas)</span>
          </div>
        </div>

        {/* Width x Height Numerical Inputs */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Width (X)</span>
              <span className="font-mono text-slate-300">{settings.width} blocks</span>
            </div>
            <input
              id="tileSizeInput"
              type="number"
              min="4"
              max="2048"
              value={settings.width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 16)}
              className="w-full bg-[#0c0c0e] border border-[#282838] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 font-mono transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Height (Y/Z)</span>
              <span className="font-mono text-slate-300">{settings.height} blocks</span>
            </div>
            <input
              id="heightInput"
              type="number"
              min="4"
              max="2048"
              value={settings.height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value) || 16)}
              className="w-full bg-[#0c0c0e] border border-[#282838] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 font-mono transition-all"
            />
          </div>
        </div>

        {/* Aspect Ratio Lock & Quick Size Presets */}
        <div className="space-y-2 mt-2.5">
          <div className="flex items-center justify-between">
            <button
              id="aspect-lock-btn"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  lockAspectRatio: !prev.lockAspectRatio,
                }))
              }
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                settings.lockAspectRatio
                  ? 'bg-[#14261c] text-emerald-300 border-emerald-600/50 font-medium'
                  : 'bg-[#181824] text-slate-400 border-[#262636]'
              }`}
            >
              {settings.lockAspectRatio ? <Link className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
              <span>Lock Aspect Ratio</span>
            </button>

            {/* 1:1 Full Original Image Resolution Preset */}
            {originalDimensions && (
              <button
                id="original-dimension-btn"
                onClick={handleFullOriginalResolution}
                className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer border flex items-center space-x-1.5 ${
                  settings.width === originalDimensions.width && settings.height === originalDimensions.height
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                    : 'bg-[#151522] text-[#4ade80] hover:bg-[#1e1e30] border-emerald-500/40'
                }`}
                title="Use 100% full original uploaded image resolution with 1 block per pixel"
              >
                <span>Full Image ({originalDimensions.width}×{originalDimensions.height})</span>
              </button>
            )}
          </div>

          {/* Quick presets row */}
          <div className="flex flex-wrap gap-1">
            {[16, 32, 64, 128, 256, 512].map((size) => (
              <button
                key={size}
                id={`preset-size-${size}`}
                onClick={() => handlePresetSize(size)}
                className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer border flex-1 text-center ${
                  settings.width === size
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-[#181824] text-slate-400 hover:text-white border-[#262636]'
                }`}
                title={size === 128 ? '128x128 standard in-game Minecraft Map Art dimension' : `${size} blocks width`}
              >
                {size === 128 ? '128 (Map)' : `${size}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Builder Orientation */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          3. Build Orientation
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            id="orientation-vertical"
            onClick={() => setSettings((prev) => ({ ...prev, orientation: 'vertical' }))}
            className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
              settings.orientation === 'vertical'
                ? 'bg-[#14261c] border-emerald-500/70 text-white shadow-sm'
                : 'bg-[#0c0c0e]/70 border-[#22222c] text-slate-400 hover:border-[#323242]'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#181824] flex items-center justify-center text-[#4ade80] font-bold border border-[#282838] font-mono">
              Y↑
            </div>
            <div>
              <div className="font-semibold text-slate-200">Vertical Wall</div>
              <div className="text-[11px] text-slate-400">Upright billboard (X & Y)</div>
            </div>
          </button>

          <button
            id="orientation-horizontal"
            onClick={() => setSettings((prev) => ({ ...prev, orientation: 'horizontal' }))}
            className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
              settings.orientation === 'horizontal'
                ? 'bg-[#14261c] border-emerald-500/70 text-white shadow-sm'
                : 'bg-[#0c0c0e]/70 border-[#22222c] text-slate-400 hover:border-[#323242]'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#181824] flex items-center justify-center text-[#4ade80] font-bold border border-[#282838] font-mono">
              XZ
            </div>
            <div>
              <div className="font-semibold text-slate-200">Horizontal Floor</div>
              <div className="text-[11px] text-slate-400">Flat Map Art (X & Z)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Advanced Quality Options: Dithering, Color Space, Tone */}
      <div className="border-t border-[#22222c] pt-3">
        <button
          id="toggle-advanced-settings"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Sliders className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Color Matching & Dithering Controls</span>
          </span>
          <span className="text-[11px] text-slate-500">{showAdvanced ? 'Hide ▲' : 'Show ▼'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 bg-[#0c0c0e]/80 p-3.5 rounded-xl border border-[#22222c]">
            {/* Dithering */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span className="font-medium">Dithering Algorithm</span>
                <span className="text-slate-400">
                  {settings.dithering === 'floyd-steinberg' ? 'Floyd-Steinberg (Smooth)' : 'None (Sharp Pixels)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="dither-fs"
                  onClick={() => setSettings((prev) => ({ ...prev, dithering: 'floyd-steinberg' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                    settings.dithering === 'floyd-steinberg'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-[#181824] text-slate-300 hover:bg-[#20202e] border-[#262636]'
                  }`}
                >
                  Floyd-Steinberg (Gradients)
                </button>
                <button
                  id="dither-none"
                  onClick={() => setSettings((prev) => ({ ...prev, dithering: 'none' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                    settings.dithering === 'none'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-[#181824] text-slate-300 hover:bg-[#20202e] border-[#262636]'
                  }`}
                >
                  None (Flat Sprite)
                </button>
              </div>
            </div>

            {/* Color Matching Mode */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span className="font-medium">Color Matching Space</span>
                <span className="text-slate-400">
                  {settings.colorMatching === 'lab' ? 'CIE-Lab (Perceptual)' : 'sRGB (Standard)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="colormatch-lab"
                  onClick={() => setSettings((prev) => ({ ...prev, colorMatching: 'lab' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                    settings.colorMatching === 'lab'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-[#181824] text-slate-300 hover:bg-[#20202e] border-[#262636]'
                  }`}
                >
                  CIE-Lab (Human Eye)
                </button>
                <button
                  id="colormatch-rgb"
                  onClick={() => setSettings((prev) => ({ ...prev, colorMatching: 'rgb' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                    settings.colorMatching === 'rgb'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-[#181824] text-slate-300 hover:bg-[#20202e] border-[#262636]'
                  }`}
                >
                  Weighted RGB
                </button>
              </div>
            </div>

            {/* Sliders: Brightness, Contrast, Saturation */}
            <div className="space-y-2.5 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Brightness</span>
                  <span className="font-mono text-slate-300">{settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={settings.brightness}
                  onChange={(e) => setSettings((p) => ({ ...p, brightness: parseInt(e.target.value) }))}
                  className="w-full accent-[#4ade80] cursor-pointer h-1.5 bg-[#222230] rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-slate-300">{settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={settings.contrast}
                  onChange={(e) => setSettings((p) => ({ ...p, contrast: parseInt(e.target.value) }))}
                  className="w-full accent-[#4ade80] cursor-pointer h-1.5 bg-[#222230] rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Color Saturation</span>
                  <span className="font-mono text-slate-300">{settings.saturation > 0 ? `+${settings.saturation}` : settings.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={settings.saturation}
                  onChange={(e) => setSettings((p) => ({ ...p, saturation: parseInt(e.target.value) }))}
                  className="w-full accent-[#4ade80] cursor-pointer h-1.5 bg-[#222230] rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Action Button */}
      <button
        id="generateBtn"
        onClick={onGenerate}
        disabled={isGenerating || !hasLoadedImage || activeBlockCount === 0}
        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-md ${
          isGenerating || !hasLoadedImage || activeBlockCount === 0
            ? 'bg-[#181822] text-slate-600 border border-[#242432] cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/60 cursor-pointer hover:shadow-xl'
        }`}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            <span>Matching Blocks...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Generate Minecraft Pixel Art</span>
          </>
        )}
      </button>

      {activeBlockCount === 0 && (
        <p className="text-xs text-rose-400 text-center font-medium">
          No blocks selected in the palette. Please enable at least 1 block.
        </p>
      )}
    </div>
  );
};
