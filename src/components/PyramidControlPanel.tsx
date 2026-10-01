import React from 'react';
import { ArrowUpRight, ArrowDownRight, Flame } from 'lucide-react';
import { PYRAMID_COLS } from '../utils/pyramidEngine';

interface PyramidControlPanelProps {
  currentColumn: number;
  streak: number;
  energy: number;
  maxEnergy: number;
  isPredicting: boolean;
  onPredict: (prediction: 'higher' | 'lower') => void;
  onOpenRules?: () => void;
}

export const PyramidControlPanel: React.FC<PyramidControlPanelProps> = ({
  currentColumn,
  streak,
  energy,
  maxEnergy,
  isPredicting,
  onPredict,
  onOpenRules,
}) => {
  return (
    <footer className="h-[148px] shrink-0 bg-[#e8deca] border-t-2 border-[#2b261f] p-2.5 text-[#2b261f] font-mono select-none space-y-2">
      {/* Top summary row: Progress & Streak */}
      <div className="flex items-center justify-between text-xs border-b border-[#2b261f]/20 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-black bg-[#2b261f] text-[#fef08a] px-2 py-0.5 rounded text-[10px] uppercase">
            Col {currentColumn + 1}/{PYRAMID_COLS}
          </span>
          <span className="text-[11px] text-[#5c5346]">
            {currentColumn === PYRAMID_COLS - 1 ? 'Final Sanctum Threshold' : 'Select Next Chamber Path (-1⚡)'}
          </span>
        </div>

        {/* Streak Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold border ${
            streak > 0
              ? 'bg-[#dcfce7] text-[#15803d] border-[#16a34a]'
              : streak < 0
              ? 'bg-[#fee2e2] text-[#b91c1c] border-[#dc2626]'
              : 'bg-[#ede4d3] text-[#5c5346] border-[#2b261f]/30'
          }`}
          title="Pairs push with no energy change. Streak resets to 0."
        >
          <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'text-orange-500 fill-orange-400' : ''}`} />
          <span>
            {streak > 0
              ? `▲ Streak +${streak} (+${streak + 1}⚡)`
              : streak < 0
              ? `▼ Streak ${streak} (${streak - 1}⚡)`
              : 'Streak: 0 (Neutral)'}
          </span>
        </div>
      </div>

      {/* Action Buttons: Choose Path (Higher = NE, Lower = SE) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPredicting || currentColumn >= PYRAMID_COLS - 1 || energy <= 0}
          onClick={() => onPredict('higher')}
          className="flex-1 py-2.5 px-3 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] disabled:opacity-40 text-white font-mono font-black text-xs sm:text-sm rounded-lg shadow-md border-2 border-[#14532d] flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
          title="Predict higher and move northeast into next column (-1⚡)"
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
          <span>HIGHER</span>
          <span className="text-[10px] bg-[#14532d] px-1.5 py-0.5 rounded text-[#86efac] font-bold">
            -1⚡
          </span>
        </button>

        <button
          type="button"
          disabled={isPredicting || currentColumn >= PYRAMID_COLS - 1 || energy <= 0}
          onClick={() => onPredict('lower')}
          className="flex-1 py-2.5 px-3 bg-[#b91c1c] hover:bg-[#991b1b] active:bg-[#7f1d1d] disabled:opacity-40 text-white font-mono font-black text-xs sm:text-sm rounded-lg shadow-md border-2 border-[#7f1d1d] flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
          title="Predict lower and move southeast into next column (-1⚡)"
        >
          <ArrowDownRight className="w-4 h-4 text-red-200 stroke-[2.5]" />
          <span>LOWER</span>
          <span className="text-[10px] bg-[#7f1d1d] px-1.5 py-0.5 rounded text-[#fca5a5] font-bold">
            -1⚡
          </span>
        </button>
      </div>

      <div className="text-[10px] text-[#6b5d4d] text-center flex items-center justify-center gap-2">
        <span>Click green/red bordered hex on map or tap above</span>
        <span>•</span>
        <span>Pairs push (0⚡)</span>
      </div>
    </footer>
  );
};
