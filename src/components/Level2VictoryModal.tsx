import React from 'react';
import { Sparkles, ArrowDown, Footprints, Zap } from 'lucide-react';

interface Level2VictoryModalProps {
  remainingEnergy: number;
  stepsTaken: number;
  onDescendLevel3: () => void;
}

export const Level2VictoryModal: React.FC<Level2VictoryModalProps> = ({
  remainingEnergy,
  stepsTaken,
  onDescendLevel3,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center text-[#2b261f]">
        {/* Banner */}
        <div className="py-3.5 px-4 bg-[#1e293b] text-white border-b-2 border-[#2b261f] font-mono font-black text-base uppercase tracking-wider flex items-center justify-center gap-2">
          <span className="text-xl">♠</span>
          <span>ACE OF SPADES DISCOVERED!</span>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="space-y-1">
            <h3 className="text-[#1e293b] font-black text-sm uppercase">
              The Gateway to Level 3 Opens!
            </h3>
            <p className="text-[#5c5346] leading-relaxed text-[11px]">
              You drew the legendary <strong>Ace of Spades</strong>! Deep underground, a colossal stone portal slides open, revealing the massive flower-petal gearworks of the ancient Utopia Machine.
            </p>
          </div>

          {/* Level 2 Record */}
          <div className="bg-[#ede4d3] p-3 rounded-lg border border-[#2b261f]/30 space-y-2 text-left">
            <div className="text-[11px] font-bold uppercase text-[#2b261f] border-b border-[#2b261f]/20 pb-1 flex items-center justify-between">
              <span>Subterranean Delve Record</span>
              <span className="text-[10px] text-[#786e5e]">Level 2 Cleared</span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-[#2d6a4f]" /> Steps Taken:
              </span>
              <span className="font-bold text-[#1c1917]">{stepsTaken}</span>
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

          {/* Level 3 Teaser */}
          <div className="bg-[#fdfbf7] p-2.5 rounded-lg border border-[#2b261f]/20 text-left space-y-1 text-[10.5px]">
            <span className="text-[#2d6a4f] font-bold uppercase flex items-center gap-1">
              <span>⚙️</span> Level 3: The 19-Hex Flower Engine Core
            </span>
            <p className="text-[#5c5346]">
              Descend into a single-floor 19-hex concentric flower: 12-hex Outer Ring, 6-hex Inner Ring, and the Core Guardian. Flip tiles, test doors with Utopia Engine dice, and confront the Level 5 Boss!
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onDescendLevel3}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
            >
              <ArrowDown className="w-4 h-4" />
              <span>Enter Level 3: The Flower Engine Core</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
