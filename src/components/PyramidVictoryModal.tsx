import React from 'react';
import { Trophy, Zap, Footprints, Flame, Sparkles, ArrowRight, Eye } from 'lucide-react';
import { ExplorationCard } from '../utils/explorationDeck';

interface PyramidVictoryModalProps {
  remainingEnergy: number;
  turnsTaken: number;
  bestStreak: number;
  playerHand: ExplorationCard[];
  onProceedToLevel3: () => void;
  onReviewMap: () => void;
}

export const PyramidVictoryModal: React.FC<PyramidVictoryModalProps> = ({
  remainingEnergy,
  turnsTaken,
  bestStreak,
  playerHand,
  onProceedToLevel3,
  onReviewMap,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center text-[#2b261f] font-mono animate-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="py-3.5 px-4 bg-[#2d6a4f] text-white border-b-2 border-[#2b261f] font-mono font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-300 animate-bounce" />
          <span>LEVEL 2 CONQUERED!</span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs">
          <div className="space-y-1">
            <h3 className="text-[#2d6a4f] font-black text-sm uppercase">
              The Underground Catacombs Conquered!
            </h3>
            <p className="text-[#5c5346] leading-relaxed text-[11px]">
              You have navigated the underground catacombs, forecasting fate card by card and mastering the ancient Tarot trials to breach the inner sanctum!
            </p>
          </div>

          {/* Stats Summary */}
          <div className="bg-[#ede4d3] p-3 rounded-lg border border-[#2b261f]/30 space-y-2 text-left">
            <div className="text-[11px] font-bold uppercase text-[#2b261f] border-b border-[#2b261f]/20 pb-1 flex items-center justify-between">
              <span>Catacombs Expedition Record</span>
              <span className="text-[10px] text-[#2d6a4f] font-black">Underground Delve Master</span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-[#2d6a4f]" /> Total Steps:
              </span>
              <span className="font-bold">{turnsTaken}</span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-600" /> Peak Streak:
              </span>
              <span className="font-bold text-orange-700">+{bestStreak}</span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" /> Energy Carried Forward:
              </span>
              <span className="font-bold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded border border-[#16a34a]">
                {remainingEnergy} ⚡
              </span>
            </div>

            <div className="flex justify-between items-center text-[#2b261f] text-xs">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Hand Cards Saved for L3:
              </span>
              <span className="font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {playerHand.length} Card(s)
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onProceedToLevel3}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-black text-xs uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
            >
              <span>Descend into Level 3 (Flower Engine Core)</span>
              <ArrowRight className="w-4 h-4 text-[#86efac]" />
            </button>

            <button
              type="button"
              onClick={onReviewMap}
              className="w-full py-2 px-3 bg-[#e2d5bd] hover:bg-[#d8c8ab] text-[#2b261f] font-mono font-bold text-xs uppercase rounded-lg border border-[#2b261f] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#2d6a4f]" />
              <span>Review Pyramid Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
