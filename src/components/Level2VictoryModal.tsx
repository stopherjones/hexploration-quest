import React from 'react';
import { Sparkles, ArrowDown, Footprints, Zap } from 'lucide-react';
import { ExplorationCard } from '../utils/explorationDeck';
import { TarotModifierArt } from './TarotModifierArt';

interface Level2VictoryModalProps {
  remainingEnergy: number;
  stepsTaken: number;
  playerHand?: ExplorationCard[];
  onDescendLevel3: () => void;
}

export const Level2VictoryModal: React.FC<Level2VictoryModalProps> = ({
  remainingEnergy,
  stepsTaken,
  playerHand = [],
  onDescendLevel3,
}) => {
  const totalPower = playerHand.reduce((sum, c) => sum + c.value, 0);

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

            {/* Banked Hand Carried Forward */}
            <div className="border-t border-[#2b261f]/20 pt-1.5">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-1 font-bold text-[#2b261f]">
                  <span>🎒</span> Banked Hand Carried:
                </span>
                <span className="font-black text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded border border-[#16a34a] text-[11px]">
                  {playerHand.length} cards (-{totalPower} pts)
                </span>
              </div>
              {playerHand.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  {playerHand.map((c, i) => (
                    <span
                      key={`${c.id}-${i}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#2b261f]/30 rounded text-[10px] font-mono font-bold shadow-2xs"
                    >
                      {c.tarotCard ? (
                        <>
                          <TarotModifierArt card={c} className="h-8 w-6 object-contain" />
                          <span className="text-[8px] uppercase">{c.tarotCard}</span>
                        </>
                      ) : (
                        <>
                          <span className={c.suit === '♦' ? 'text-red-600' : 'text-slate-900'}>
                            {c.rank}{c.suit}
                          </span>
                          <span className="text-[9px] text-[#786e5e]">(-{c.value})</span>
                        </>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[#786e5e] italic">No cards banked in hand.</p>
              )}
            </div>
          </div>

          {/* Level 3 Teaser */}
          <div className="bg-[#fdfbf7] p-2.5 rounded-lg border border-[#2b261f]/20 text-left space-y-1 text-[10.5px]">
            <span className="text-[#2d6a4f] font-bold uppercase flex items-center gap-1">
              <span>⚙️</span> Level 3: The 19-Hex Flower Engine Core
            </span>
            <p className="text-[#5c5346]">
              Use your banked hand cards to reduce your Utopia Engine dice score towards 0 (unlocking doors and disarming traps without monsters)!
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
