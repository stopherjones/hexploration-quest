import React from 'react';
import { RotateCcw, Trophy, Skull, Footprints, Eye, Castle, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { GameLevel } from '../types';
import { ExplorationCard } from '../utils/explorationDeck';

interface GameOverModalProps {
  won: boolean;
  turns: number;
  energyLeft: number;
  revealedCount: number;
  totalHexes: number;
  towersFound: number;
  totalTowers: number;
  onRestart: () => void;
  onReviewMap?: () => void;
  level?: GameLevel;
  cardsDrawn?: number;
  tunnelsCarved?: number;
  playerHand?: ExplorationCard[];
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  won,
  turns,
  energyLeft,
  revealedCount,
  totalHexes,
  towersFound,
  totalTowers,
  onRestart,
  onReviewMap,
  level = 1,
  cardsDrawn = 0,
  tunnelsCarved = 0,
  playerHand = [],
}) => {
  const exploredPct = Math.round((revealedCount / totalHexes) * 100);
  const isLevel2Victory = level === 2 && won;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center">
        {/* Banner */}
        <div
          className={`py-4 px-4 border-b-2 border-[#2b261f] font-mono font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 ${
            won ? 'bg-[#2d6a4f] text-white' : 'bg-[#991b1b] text-white'
          }`}
        >
          {won ? <Trophy className="w-5 h-5 text-yellow-300" /> : <Skull className="w-5 h-5" />}
          <span>
            {level === 3
              ? won
                ? 'UTOPIA ENGINE SAVED!'
                : 'FALLEN AT THE CORE'
              : level === 2
              ? won
                ? 'UNDERGROUND CATACOMBS CONQUERED!'
                : 'LOST IN THE CATACOMBS'
              : won
              ? 'SECRET TUNNEL FOUND!'
              : 'EXPEDITION EXHAUSTED'}
          </span>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4 font-mono text-xs text-[#2b261f]">
          <p className="text-xs leading-relaxed">
            {level === 3
              ? won
                ? 'Tremendous feat! You breached the Outer Portals, unlocked the Inner Core Gates, and dismantled the supreme Level 5 Core Construct! Utopia has been saved!'
                : 'Your expedition fell before the perils of the 19-Hex Flower Engine. The ancient core remains shrouded in mystery.'
              : level === 2
              ? won
                ? 'Astounding foresight! You navigated through the underground catacombs, survived the Tarot ordeals, and prepared your hand for Level 3!'
                : 'Your energy was depleted or fate caught up with you in the depths of the underground catacombs.'
              : won
              ? 'Splendid cartography! You reached the Secret Tunnel Entrance and secured your escape before your supplies ran dry.'
              : 'Your energy was completely depleted before locating the Secret Tunnel Entrance. The fog of war claims this voyage.'}
          </p>

          {/* Expedition Scorecard */}
          <div className="bg-[#ede4d3] p-3 rounded-lg border border-[#2b261f]/30 space-y-2 text-left">
            <div className="text-[11px] font-bold uppercase text-[#786e5e] border-b border-[#2b261f]/20 pb-1">
              {level === 3
                ? 'Utopia Engine Core Ledger'
                : level === 2
                ? 'Underground Catacombs Ledger'
                : 'Expedition Ledger'}
            </div>
            {!isLevel2Victory && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-[#2d6a4f]" /> Total Steps:
                </span>
                <span className="font-bold">{turns}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#b45309]" /> Remaining Energy:
              </span>
              <span className="font-bold">{energyLeft}</span>
            </div>

            {level === 3 ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    ⚙️ Machine Core:
                  </span>
                  <span className="font-bold">{won ? 'Vanquished (Victory!)' : 'Unconquered'}</span>
                </div>
              </>
            ) : level === 2 && !isLevel2Victory ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    🔺 Hex Columns:
                  </span>
                  <span className="font-bold">{won ? '12 / 12 (Ascended)' : '12 Columns'}</span>
                </div>
              </>
            ) : level === 1 ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#2d6a4f]" /> Wilderness Charted:
                  </span>
                  <span className="font-bold">
                    {revealedCount} / {totalHexes} ({exploredPct}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Castle className="w-3.5 h-3.5 text-[#78644f]" /> Watchtowers Linked:
                  </span>
                  <span className="font-bold">
                    {towersFound} / {totalTowers}
                  </span>
                </div>
              </>
            ) : null}
            {isLevel2Victory && (
              <div className="border-t border-[#2b261f]/20 pt-2">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Banked Hand for Level 3
                  </span>
                  <span className="font-black text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {playerHand.length}
                  </span>
                </div>
                {playerHand.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {playerHand.map((card, index) => (
                      <span
                        key={`${card.id}-${index}`}
                        className="px-1.5 py-0.5 bg-white border border-[#2b261f]/30 rounded text-[10px] font-bold shadow-2xs"
                      >
                        <span className={card.suit === '♦' ? 'text-red-600' : 'text-slate-900'}>
                          {card.rank}{card.suit}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[#786e5e] italic">No cards banked in hand.</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onRestart}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-black text-xs uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-px"
            >
              {isLevel2Victory ? <ArrowRight className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
              <span>{isLevel2Victory ? 'Continue to Level 3' : 'Embark On New Expedition'}</span>
            </button>

            {onReviewMap && (
              <button
                onClick={onReviewMap}
                className="w-full py-2 px-3 bg-[#e2d5bd] hover:bg-[#d8c8ab] text-[#2b261f] font-mono font-bold text-xs uppercase rounded-lg border-2 border-[#2b261f] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-[#2d6a4f]" />
                <span>{level === 2 ? 'Review Underground Map' : 'Review Map & Secret Tunnel'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
