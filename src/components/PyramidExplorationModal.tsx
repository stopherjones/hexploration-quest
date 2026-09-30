import React from 'react';
import { ExplorationCard } from '../utils/explorationDeck';
import { ArrowRight, Flame, Sparkles, X, Zap } from 'lucide-react';

interface PyramidExplorationModalProps {
  isOpen: boolean;
  currentColumn: number;
  prediction: 'higher' | 'lower';
  baseCard: ExplorationCard;
  drawnCard: ExplorationCard | null;
  deckCount: number;
  streak: number;
  energy: number;
  maxEnergy: number;
  isEventHex: boolean;
  pendingHonorChoice: boolean;
  resultMessage: string | null;
  onDrawCard: () => void;
  onHonorChoice: (choice: 'bank_base' | 'draw_new_to_hand') => void;
  onContinue: () => void;
}

export const PyramidExplorationModal: React.FC<PyramidExplorationModalProps> = ({
  isOpen,
  currentColumn,
  prediction,
  baseCard,
  drawnCard,
  deckCount,
  streak,
  energy,
  maxEnergy,
  isEventHex,
  pendingHonorChoice,
  resultMessage,
  onDrawCard,
  onHonorChoice,
  onContinue,
}) => {
  if (!isOpen) return null;

  const getSuitColor = (suit?: string) => {
    return suit === '♦' || suit === '♥' ? 'text-red-700' : 'text-slate-900';
  };

  const isHigherPrediction = prediction === 'higher';
  const isHonorCard = drawnCard
    ? drawnCard.rank === 'A' || drawnCard.rank === 'K' || drawnCard.rank === 'Q' || drawnCard.rank === 'J'
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150 text-[#2b261f] font-mono">
        {/* Header Bar */}
        <div className="py-2.5 px-3 border-b-2 border-[#2b261f] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between bg-[#ede4d3]">
          <div className="flex items-center gap-1.5 text-left">
            <span className="text-amber-700">🔺</span>
            <div className="text-xs sm:text-sm font-black text-[#2b261f]">
              Card Draw
            </div>
            {isEventHex && (
              <span className="text-[9.5px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-300 font-bold ml-1">
                ✨ Event Space
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-3 text-xs">
          {/* Prediction Pill & Energy/Streak Bar */}
          <div className="flex items-center justify-between gap-1.5">
            <div
              className={`px-2 py-1 rounded-md text-[10.5px] font-black border flex items-center gap-1 ${
                isHigherPrediction
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                  : 'bg-red-100 text-red-900 border-red-500'
              }`}
            >
              <span>{isHigherPrediction ? '▲' : '▼'}</span>
              <span>{isHigherPrediction ? 'PREDICTED HIGHER' : 'PREDICTED LOWER'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#fbf8ee] px-2 py-1 rounded-md border border-[#d6c4a5] text-[10.5px]">
              <span className="font-black text-[#2b261f] bg-[#ede4d3] px-1.5 py-0.5 rounded border border-[#2b261f]/20">
                {energy}/{maxEnergy}⚡
              </span>
              {streak > 0 ? (
                <span className="text-emerald-700 font-black">+{streak}⚡</span>
              ) : streak < 0 ? (
                <span className="text-red-700 font-black">{streak}⚡</span>
              ) : (
                <span className="text-stone-600 font-bold">0</span>
              )}
            </div>
          </div>

          {/* Cards Comparison View with 3D Deck Draw & Flip Animation */}
          <div className="flex items-center justify-center gap-4 py-1">
            {/* Base Card */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#7a6d59] uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>Base Card</span>
                <span className="text-[9px] font-normal text-[#5c5244] bg-[#e8deca] px-1 rounded">
                  val: {baseCard.value}
                </span>
              </span>
              <div
                key={`base-${baseCard.suit}-${baseCard.rank}`}
                className="w-18 h-26 bg-white border-2 border-[#2b261f] rounded-lg shadow-md flex flex-col justify-between p-1.5 select-none shrink-0 relative transition-transform"
              >
                <div className={`text-xs font-bold leading-none ${getSuitColor(baseCard.suit)}`}>
                  {baseCard.rank}
                  <div className="text-[10px]">{baseCard.suit}</div>
                </div>
                <div className={`text-3xl font-black text-center ${getSuitColor(baseCard.suit)}`}>
                  {baseCard.suit}
                </div>
                <div className={`text-xs font-bold leading-none text-right ${getSuitColor(baseCard.suit)}`}>
                  {baseCard.rank}
                  <div className="text-[10px]">{baseCard.suit}</div>
                </div>
              </div>
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center justify-center pt-5">
              <span className="text-xs font-black text-[#7a6d59] uppercase tracking-wider">vs</span>
              <ArrowRight className="w-4 h-4 text-[#8c7d67] mt-1" />
            </div>

            {/* Drawn Card or Exploration Deck Stack */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#7a6d59] uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>{drawnCard ? 'Drawn Card' : 'Deck (Full 52)'}</span>
                {drawnCard && !isHonorCard && (
                  <span className="text-[9px] font-normal text-[#5c5244] bg-[#e8deca] px-1 rounded">
                    val: {drawnCard.value}
                  </span>
                )}
              </span>

              <div className="relative flex-shrink-0">
                {/* 3D Stacked Deck Underneath */}
                <div className="absolute inset-0 bg-[#3b342a] rounded-lg border-2 border-[#2b261f] translate-x-1.5 translate-y-1.5 opacity-60"></div>
                <div className="absolute inset-0 bg-[#4a4235] rounded-lg border-2 border-[#2b261f] translate-x-0.5 translate-y-0.5 opacity-80"></div>

                {drawnCard ? (
                  /* Face-Up Drawn Card */
                  <div
                    key={`drawn-${drawnCard.suit}-${drawnCard.rank}`}
                    className={`w-18 h-26 bg-white border-2 border-[#2b261f] rounded-lg shadow-lg flex flex-col justify-between p-1.5 select-none shrink-0 relative z-10 animate-card-flip-from-deck ${
                      isHonorCard ? 'ring-2 ring-orange-500 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className={`text-xs font-bold leading-none ${getSuitColor(drawnCard.suit)}`}>
                      {drawnCard.rank}
                      <div className="text-[10px]">{drawnCard.suit}</div>
                    </div>
                    <div className={`text-3xl font-black text-center ${getSuitColor(drawnCard.suit)}`}>
                      {drawnCard.suit}
                    </div>
                    <div className={`text-xs font-bold leading-none text-right ${getSuitColor(drawnCard.suit)}`}>
                      {drawnCard.rank}
                      <div className="text-[10px]">{drawnCard.suit}</div>
                    </div>
                  </div>
                ) : (
                  /* Face-Down Top of Deck Card with click to draw */
                  <button
                    type="button"
                    onClick={onDrawCard}
                    className="w-18 h-26 bg-[#2b261f] hover:bg-[#3d3328] active:bg-[#1a1612] border-2 border-[#f4edd9] rounded-lg shadow-md p-1 flex flex-col items-center justify-center select-none relative z-10 overflow-hidden cursor-pointer transition-transform hover:scale-105"
                  >
                    <div className="w-full h-full border border-dashed border-[#e8deca]/60 rounded flex flex-col items-center justify-center bg-[#3b342a] p-1">
                      <div className="flex items-center gap-0.5 text-[#e8deca] text-[10px]">
                        <span>♠</span>
                        <span className="text-red-400">♥</span>
                        <span>♣</span>
                        <span className="text-red-400">♦</span>
                      </div>
                      <span className="text-xs font-black text-amber-300 mt-1 uppercase">TAP</span>
                      <span className="text-[8.5px] font-mono text-[#cfbe9f]/90">TO DRAW</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Outcome / Result Banner */}
          {resultMessage && (
            <div className="p-2 bg-[#fdfbf7] rounded-lg border border-[#2b261f]/20 text-[11px] text-[#443d33] leading-relaxed">
              {resultMessage}
            </div>
          )}

          {/* Draw Button (when not yet drawn) */}
          {!drawnCard && (
            <button
              type="button"
              onClick={onDrawCard}
              className="w-full py-2.5 px-4 bg-[#b45309] hover:bg-[#92400e] active:bg-[#78350f] text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
            >
              <span>Draw Card</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </button>
          )}

          {/* Honour Card Banking Choice: ONLY 2 choices as requested */}
          {pendingHonorChoice && drawnCard && (
            <div className="bg-[#fff7ed] p-2.5 rounded-lg border-2 border-[#ea580c] space-y-2 text-left">
              <div className="text-xs font-black text-[#c2410c] flex items-center justify-between">
                <span>👑 HONOUR CARD DRAWN ({drawnCard.rank}{drawnCard.suit})!</span>
                <span className="text-[10px] bg-[#ffedd5] px-1.5 py-0.5 rounded border border-[#fdba74] font-bold">
                  Streak Preserved
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onHonorChoice('bank_base')}
                  className="py-2 px-2.5 bg-[#d97706] hover:bg-[#b45309] active:bg-[#92400e] text-white text-[11px] font-black uppercase rounded shadow-xs cursor-pointer active:translate-y-px text-center"
                >
                  📥 Bank Base ({baseCard.rank}{baseCard.suit}) to Hand
                  <div className="text-[9px] font-normal opacity-90 lowercase">(draw fresh base card)</div>
                </button>
                <button
                  type="button"
                  onClick={() => onHonorChoice('draw_new_to_hand')}
                  className="py-2 px-2.5 bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white text-[11px] font-black uppercase rounded shadow-xs cursor-pointer active:translate-y-px text-center"
                >
                  🃏 Draw New Card into Hand
                  <div className="text-[9px] font-normal opacity-90 lowercase">(keep base card active)</div>
                </button>
              </div>
            </div>
          )}

          {/* Return to Map Button (when card is drawn and honor choice resolved) */}
          {drawnCard && !pendingHonorChoice && (
            <button
              type="button"
              onClick={onContinue}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
            >
              <span>{isEventHex ? 'Proceed to Event' : 'Return to Pyramid Map'}</span>
              <ArrowRight className="w-4 h-4 text-emerald-200" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
