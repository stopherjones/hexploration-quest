import React, { useState } from 'react';
import { TarotCard } from '../utils/tarotDeck';
import { Sparkles, Skull, Zap, ShieldAlert, Disc3 } from 'lucide-react';
import { ExplorationCard } from '../utils/explorationDeck';

interface TarotModalProps {
  card: TarotCard;
  playerHand: ExplorationCard[];
  onConfirm: (resolution?: { sacrificeHandCards?: boolean; wheelResult?: 'win' | 'lose' }) => void;
}

export const TarotModal: React.FC<TarotModalProps> = ({
  card,
  playerHand,
  onConfirm,
}) => {
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<'win' | 'lose' | null>(null);

  const canSacrificeForDeath = card.isDeath && playerHand.length >= 2;

  const handleSpinWheel = () => {
    setWheelSpinning(true);
    setTimeout(() => {
      const isWin = Math.random() >= 0.5;
      setWheelResult(isWin ? 'win' : 'lose');
      setWheelSpinning(false);
    }, 750);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#1c1917] text-[#f5f5f4] border-2 border-[#d97706] rounded-2xl shadow-2xl overflow-hidden font-mono flex flex-col">
        {/* Header Ribbon */}
        <div className="py-2.5 px-4 bg-gradient-to-r from-[#78350f] via-[#b45309] to-[#78350f] text-amber-100 border-b-2 border-[#d97706] font-mono font-black text-xs uppercase tracking-widest flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>EVENT SPACE • {card.number}</span>
          </div>
          <span className="text-[10px] text-amber-200 bg-[#451a03] px-2 py-0.5 rounded border border-amber-500/40">
            Tarot Arcana
          </span>
        </div>

        {/* Card Face & Art Container */}
        <div className="p-4 space-y-3.5 text-center">
          <div className="mx-auto w-24 h-36 bg-gradient-to-b from-[#292524] to-[#0c0a09] border-2 border-amber-500/60 rounded-xl shadow-lg flex flex-col items-center justify-between p-2 relative overflow-hidden group">
            {/* Corner Roman Numerals */}
            <div className="w-full flex justify-between text-[10px] font-black text-amber-400">
              <span>{card.number}</span>
              <span>{card.number}</span>
            </div>

            {/* Central Mystical Symbol */}
            <div className="text-4xl my-auto drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transform group-hover:scale-110 transition-transform">
              {card.symbol}
            </div>

            {/* Bottom Card Title */}
            <div className="text-[9px] font-bold text-amber-300 tracking-wider uppercase text-center line-clamp-1">
              {card.name}
            </div>
          </div>

          {/* Title & Flavor Text */}
          <div className="space-y-1">
            <h3 className="text-amber-400 font-black text-sm uppercase tracking-wider">
              {card.number}. {card.name}
            </h3>
            <p className="text-[#a8a29e] italic text-[11px] leading-snug px-2">
              "{card.flavor}"
            </p>
          </div>

          {/* Effect Box */}
          <div
            className={`p-3 rounded-xl border text-left text-xs space-y-1.5 ${
              card.isDeath
                ? 'bg-red-950/40 border-red-600/80 text-red-200'
                : card.effectType === 'energy_penalty' || card.effectType === 'lose_card'
                ? 'bg-amber-950/40 border-amber-600/80 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-600/80 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wide">
              {card.isDeath ? (
                <Skull className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Event Effect:</span>
            </div>
            <div className="font-semibold text-xs leading-relaxed">
              {card.effectDescription}
            </div>

            {/* Wheel of Fortune Interactive State */}
            {card.effectType === 'wheel' && (
              <div className="pt-2 text-center">
                {wheelResult === null ? (
                  <button
                    type="button"
                    onClick={handleSpinWheel}
                    disabled={wheelSpinning}
                    className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-900 font-mono font-black text-xs uppercase rounded-lg shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Disc3 className={`w-4 h-4 ${wheelSpinning ? 'animate-spin' : ''}`} />
                    <span>{wheelSpinning ? 'Spinning Destiny...' : 'Spin the Wheel of Fortune!'}</span>
                  </button>
                ) : (
                  <div
                    className={`py-1.5 px-3 rounded font-black text-xs ${
                      wheelResult === 'win'
                        ? 'bg-emerald-800 text-emerald-100 border border-emerald-400'
                        : 'bg-red-900 text-red-100 border border-red-400'
                    }`}
                  >
                    {wheelResult === 'win'
                      ? '✦ FORTUNE SMILES: +5⚡ Energy Restored!'
                      : '✦ FATE BITES: -2⚡ Energy Drained!'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {card.isDeath ? (
              <>
                {canSacrificeForDeath && (
                  <button
                    type="button"
                    onClick={() => onConfirm({ sacrificeHandCards: true })}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-stone-950 font-mono font-black text-xs uppercase tracking-wider rounded-lg shadow-lg border border-amber-400 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 text-stone-900" />
                    <span>Sacrifice 2 Hand Cards to Banish Death</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onConfirm({ sacrificeHandCards: false })}
                  className="w-full py-2.5 px-4 bg-red-700 hover:bg-red-600 text-white font-mono font-black text-xs uppercase tracking-wider rounded-lg shadow-lg border border-red-500 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Skull className="w-4 h-4 text-red-200" />
                  <span>{canSacrificeForDeath ? 'Refuse Sacrifice (Game Over)' : 'Mortal Doom: Expedition Ends'}</span>
                </button>
              </>
            ) : card.effectType === 'wheel' && wheelResult === null ? (
              <div className="text-[11px] text-amber-300 italic text-center">
                Spin the wheel above to reveal your fate!
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onConfirm({
                    wheelResult: wheelResult || undefined,
                  })
                }
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono font-black text-xs uppercase tracking-wider rounded-lg shadow-lg border border-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 text-stone-900" />
                <span>Accept Destiny & Continue</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
