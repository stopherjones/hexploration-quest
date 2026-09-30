import React from 'react';
import { Compass, Zap, Flame, Footprints, ShieldAlert, ArrowDown } from 'lucide-react';

interface LevelTransitionModalProps {
  remainingEnergy: number;
  turnsTaken: number;
  onDescend: () => void;
  onAscendPyramid?: () => void;
  onReviewMap: () => void;
}

export const LevelTransitionModal: React.FC<LevelTransitionModalProps> = ({
  remainingEnergy,
  turnsTaken,
  onDescend,
  onAscendPyramid,
  onReviewMap,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center text-[#2b261f]">
        {/* Banner */}
        <div className="py-3.5 px-4 bg-[#2d6a4f] text-white border-b-2 border-[#2b261f] font-mono font-black text-base uppercase tracking-wider flex items-center justify-center gap-2">
          <Flame className="w-5 h-5 text-yellow-300" />
          <span>LEVEL 1 COMPLETE!</span>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="space-y-1">
            <h3 className="text-[#2d6a4f] font-black text-sm uppercase">
              Secret Tunnel Discovered!
            </h3>
            <p className="text-[#5c5346] leading-relaxed text-[11px]">
              You have located the ancient subterranean passage hidden beneath the wilderness. A draft of cold air beckons from the depths below.
            </p>
          </div>

          {/* Expedition Hand-Off Stats */}
          <div className="bg-[#ede4d3] p-3 rounded-lg border border-[#2b261f]/30 space-y-2 text-left">
            <div className="text-[11px] font-bold uppercase text-[#2b261f] border-b border-[#2b261f]/20 pb-1 flex items-center justify-between">
              <span>Wilderness Expedition Record</span>
              <span className="text-[10px] text-[#786e5e]">Level 1 Complete</span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-[#2d6a4f]" /> Turns Taken:
              </span>
              <span className="font-bold text-[#1c1917]">{turnsTaken}</span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" /> Energy Carried Forward:
              </span>
              <span className="font-bold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded border border-[#16a34a]">
                {remainingEnergy} ⚡
              </span>
            </div>
          </div>

          {/* Level 2 Rules Teaser */}
          <div className="bg-[#fdfbf7] p-2.5 rounded-lg border border-[#2b261f]/20 text-left space-y-1 text-[10.5px]">
            <span className="text-[#b91c1c] font-bold uppercase flex items-center gap-1">
              <span>♥</span> Level 2: The Underground Tunnels
            </span>
            <p className="text-[#5c5346]">
              Draw from the Hearts deck to illuminate corridors and carve exits. Beware traps and dead ends, and seek the Ace of Hearts to escape to the surface!
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {onAscendPyramid && (
              <button
                type="button"
                onClick={onAscendPyramid}
                className="w-full py-2.5 px-4 bg-[#b45309] hover:bg-[#92400e] active:bg-[#78350f] text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
              >
                <span>🔺 Ascend Level 1.5 (Hex Pyramid)</span>
              </button>
            )}

            <button
              onClick={onDescend}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
            >
              <ArrowDown className="w-4 h-4" />
              <span>Descend into Underground Tunnels (Level 2)</span>
            </button>

            <button
              onClick={onReviewMap}
              className="w-full py-2 px-3 bg-[#e2d5bd] hover:bg-[#d8c8ab] text-[#2b261f] font-mono font-bold text-xs uppercase rounded-lg border border-[#2b261f] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[#2d6a4f]" />
              <span>Review Level 1 Wilderness Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
