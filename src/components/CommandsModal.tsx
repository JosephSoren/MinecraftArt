import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Download,
  Check,
  FileCode,
  FolderArchive,
  Info,
  Sliders,
} from 'lucide-react';
import { ConvertedArt, PixelArtSettings } from '../types';
import {
  generateMinecraftCommands,
  createDatapackZip,
  CommandOptions,
} from '../utils/commandGenerator';

interface CommandsModalProps {
  art: ConvertedArt;
  settings: PixelArtSettings;
}

export const CommandsModal: React.FC<CommandsModalProps> = ({ art, settings }) => {
  const [options, setOptions] = useState<CommandOptions>({
    coordinateType: 'relative',
    startX: 0,
    startY: 64,
    startZ: 0,
    orientation: settings.orientation,
    replaceMode: 'replace',
  });

  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Generate commands string
  const commandsText = useMemo(() => {
    return generateMinecraftCommands(art, options);
  }, [art, options]);

  const commandLines = useMemo(() => commandsText.split('\n'), [commandsText]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(commandsText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download .mcfunction
  const handleDownloadFunctionFile = () => {
    const blob = new Blob([commandsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel_art_${art.width}x${art.height}.mcfunction`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Datapack ZIP
  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zipBlob = await createDatapackZip(art, settings, commandsText);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minecraft_pixel_art_datapack.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip', err);
      alert('Error creating datapack zip');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-[#121217] border border-[#22222c] rounded-2xl p-5 shadow-xl text-slate-200 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20202a] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-[#4ade80]" />
            <h2 className="text-lg font-bold text-white">Minecraft In-Game Command Generator</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Instantly spawn this pixel art in your Minecraft world using /setblock or .mcfunction functions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="copyCommandsBtn"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Commands!' : 'Copy Commands'}</span>
          </button>

          <button
            id="downloadFunctionBtn"
            onClick={handleDownloadFunctionFile}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 text-xs font-semibold border border-[#262636] transition-colors cursor-pointer"
            title="Download standalone .mcfunction file"
          >
            <FileCode className="w-4 h-4 text-[#4ade80]" />
            <span>.mcfunction</span>
          </button>

          <button
            id="downloadZipBtn"
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#181824] hover:bg-[#222230] text-slate-200 text-xs font-semibold border border-[#262636] transition-colors cursor-pointer"
            title="Download as Datapack ZIP with instructions"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            <span>{isZipping ? 'Creating ZIP...' : 'Download ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Command Generation Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0c0c0e]/80 p-4 rounded-2xl border border-[#22222c] text-xs">
        {/* Orientation */}
        <div>
          <label className="font-semibold text-slate-300 block mb-1.5">Build Alignment</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOptions((p) => ({ ...p, orientation: 'horizontal' }))}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                options.orientation === 'horizontal'
                  ? 'bg-[#14261c] border-emerald-500/60 text-white font-medium'
                  : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold">Horizontal Floor</div>
              <div className="text-[10px] text-slate-400">Map Art (X & Z)</div>
            </button>

            <button
              onClick={() => setOptions((p) => ({ ...p, orientation: 'vertical' }))}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                options.orientation === 'vertical'
                  ? 'bg-[#14261c] border-emerald-500/60 text-white font-medium'
                  : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold">Vertical Wall</div>
              <div className="text-[10px] text-slate-400">Billboard (X & Y)</div>
            </button>
          </div>
        </div>

        {/* Coordinates mode */}
        <div>
          <label className="font-semibold text-slate-300 block mb-1.5">Coordinates Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOptions((p) => ({ ...p, coordinateType: 'relative' }))}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                options.coordinateType === 'relative'
                  ? 'bg-[#14261c] border-emerald-500/60 text-white font-medium'
                  : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold">Relative (~ ~ ~)</div>
              <div className="text-[10px] text-slate-400">Spawns near player</div>
            </button>

            <button
              onClick={() => setOptions((p) => ({ ...p, coordinateType: 'absolute' }))}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                options.coordinateType === 'absolute'
                  ? 'bg-[#14261c] border-emerald-500/60 text-white font-medium'
                  : 'bg-[#181824] border-[#262636] text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold">Absolute (X Y Z)</div>
              <div className="text-[10px] text-slate-400">Fixed coordinates</div>
            </button>
          </div>
        </div>

        {/* Starting coordinates if absolute */}
        {options.coordinateType === 'absolute' ? (
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">Origin (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={options.startX}
                onChange={(e) => setOptions((p) => ({ ...p, startX: parseInt(e.target.value) || 0 }))}
                placeholder="X"
                className="bg-[#181824] border border-[#262636] rounded-xl px-2 py-1.5 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                value={options.startY}
                onChange={(e) => setOptions((p) => ({ ...p, startY: parseInt(e.target.value) || 0 }))}
                placeholder="Y"
                className="bg-[#181824] border border-[#262636] rounded-xl px-2 py-1.5 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                value={options.startZ}
                onChange={(e) => setOptions((p) => ({ ...p, startZ: parseInt(e.target.value) || 0 }))}
                placeholder="Z"
                className="bg-[#181824] border border-[#262636] rounded-xl px-2 py-1.5 text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">Replace Rule</label>
            <select
              value={options.replaceMode}
              onChange={(e) =>
                setOptions((p) => ({ ...p, replaceMode: e.target.value as 'replace' | 'keep' | 'destroy' }))
              }
              className="w-full bg-[#181824] border border-[#262636] rounded-xl p-2 text-white font-mono focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="replace">replace (Overwrites any block)</option>
              <option value="keep">keep (Only fills air blocks)</option>
              <option value="destroy">destroy (Drops replaced blocks)</option>
            </select>
          </div>
        )}
      </div>

      {/* Code Preview Box */}
      <div>
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
          <span className="font-mono">
            {commandLines.length.toLocaleString()} command lines generated
          </span>
          <span className="text-slate-500">Previewing first 200 lines:</span>
        </div>

        <div className="relative">
          <pre
            id="commandsOutput"
            className="w-full h-72 bg-[#08080b] border border-[#22222c] rounded-2xl p-4 font-mono text-xs text-[#4ade80] overflow-auto whitespace-pre leading-relaxed shadow-inner"
          >
            {commandLines.slice(0, 200).join('\n')}
            {commandLines.length > 200 && `\n\n... and ${(commandLines.length - 200).toLocaleString()} more commands (Full file ready to copy or download)`}
          </pre>
        </div>
      </div>

      {/* How to use Guide */}
      <div className="bg-[#0c0c0e]/80 border border-[#22222c] rounded-2xl p-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold">
          <Info className="w-4 h-4 text-[#4ade80]" />
          <span>How to run this in Minecraft:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed pl-1">
          <li>
            <strong className="text-slate-300">Method 1 (Datapack / Function - Recommended):</strong> Click <em>"Download ZIP"</em> and unzip it into your world's <code className="text-[#4ade80] bg-[#181824] px-1.5 py-0.5 rounded-md border border-[#262636]">datapacks/</code> folder. In game, run <code className="text-[#4ade80] bg-[#181824] px-1.5 py-0.5 rounded-md border border-[#262636]">/reload</code>, stand at the origin, and run <code className="text-[#4ade80] bg-[#181824] px-1.5 py-0.5 rounded-md border border-[#262636]">/function pixelart:minecraft_pixel_art</code>.
          </li>
          <li>
            <strong className="text-slate-300">Method 2 (Command Block):</strong> For smaller builds under 100 blocks, copy commands into chained Command Blocks set to "Always Active".
          </li>
        </ul>
      </div>
    </div>
  );
};
