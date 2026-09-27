import React from 'react';
import { ExplorationCard } from '../utils/explorationDeck';
import { HexCoord } from '../types';
import { Compass, Flame, ShieldAlert, Sparkles, Trophy, ArrowRight, RotateCcw, X } from 'lucide-react';

interface ChamberExplorationModalProps {
  isOpen: boolean;
  baseCard: ExplorationCard | null;
  drawnCard: ExplorationCard | null;
  deckCount: number;
  streak: number; // positive = win streak, negative = loss streak, 0 = neutral
  activePrediction?: 'higher' | 'lower' | null;
  pendingChoice: 'higher_lower' | 'face_gamble' | null;
  resultMessage: string | null;
  chamberCoord?: HexCoord;
  onPredict: (prediction: 'higher' | 'lower') => void;
  onFaceChoice: (choice: 'discard_redraw' | 'gamble_ace') => void;
  onDismiss: () => void;
}

export const ChamberExplorationModal: React.FC<ChamberExplorationModalProps> = ({
  isOpen,
  baseCard,
  drawnCard,
  deckCount,
  streak,
  activePrediction,
  pendingChoice,
  resultMessage,
  chamberCoord,
  onPredict,
  onFaceChoice,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const getSuitColor = (suit?: string) => {
    return suit === '♦' ? 'text-red-700' : 'text-slate-900';
  };

  const getSuitName = (suit?: string) => {
    switch (suit) {
      case '♠': return 'Spades';
      case '♦': return 'Diamonds';
      case '♣': return 'Clubs';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150 text-[#2b261f]">
        
        {/* Header Bar matching EventModal / LevelTransitionModal with Close X button */}
        <div className="py-2 px-3 border-b-2 border-[#2b261f] font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between bg-[#ede4d3]">
          <div className="flex items-center gap-1.5 text-left">
            <span className="text-sm">♠</span>
            <div>
              <div className="text-[10px] text-[#786e5e] font-normal leading-none">
                Chamber Survey {chamberCoord ? `(${chamberCoord.col}, ${chamberCoord.row})` : ''}
              </div>
              <div className="text-xs font-black text-[#2b261f] mt-0.5">
                Chamber Exploration
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-[#e0d3bc] px-2 py-0.5 rounded border border-[#cfbe9f] text-[#5c5244]">
              <span>{deckCount} cards left</span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded hover:bg-[#d6c8b0] text-[#5c5244] border border-[#2b261f]/20 cursor-pointer transition-colors"
              title="Close Survey Modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-3 font-mono text-xs">
          
          {/* Streak indicator badge */}
          <div className="flex items-center justify-between bg-[#fbf8ee] px-2.5 py-1.5 rounded-lg border border-[#d6c4a5] text-[11px]">
            <span className="text-[#5c5244] font-semibold">Current Streak:</span>
            {streak > 0 ? (
              <span className="px-2 py-0.5 bg-[#dcfce7] text-[#15803d] font-black rounded border border-[#86efac] flex items-center gap-1">
                <span>▲</span> +{streak} (next: +{streak + 1}⚡)
              </span>
            ) : streak < 0 ? (
              <span className="px-2 py-0.5 bg-[#fee2e2] text-[#b91c1c] font-black rounded border border-[#fca5a5] flex items-center gap-1">
                <span>▼</span> {streak} (next: {streak - 1}⚡)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-[#f3f4f6] text-[#4b5563] font-bold rounded border border-[#d1d5db]">
                Neutral (next: ±1⚡)
              </span>
            )}
          </div>

          {/* Cards Comparison View with Real 3D Deck Draw & Flip Animation */}
          <div className="flex items-center justify-center gap-4 py-1">
            {/* Base Comparison Card */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#7a6d59] uppercase tracking-wider mb-1">
                Base Card
              </span>
              <div
                key={baseCard ? `${baseCard.suit}-${baseCard.rank}` : 'base-none'}
                className="w-18 h-26 bg-white border-2 border-[#2b261f] rounded-lg shadow-md flex flex-col justify-between p-1.5 select-none shrink-0 relative transition-transform"
              >
                <div className={`text-xs font-bold leading-none ${getSuitColor(baseCard?.suit)}`}>
                  {baseCard?.rank}
                  <div className="text-[10px]">{baseCard?.suit}</div>
                </div>
                <div className={`text-3xl font-black text-center ${getSuitColor(baseCard?.suit)}`}>
                  {baseCard?.suit}
                </div>
                <div className={`text-xs font-bold leading-none text-right ${getSuitColor(baseCard?.suit)}`}>
                  {baseCard?.rank}
                  <div className="text-[10px]">{baseCard?.suit}</div>
                </div>
              </div>
            </div>

            {/* VS or Arrow */}
            <div className="flex flex-col items-center justify-center pt-5">
              <span className="text-xs font-black text-[#7a6d59] uppercase tracking-wider">vs</span>
              <ArrowRight className="w-4 h-4 text-[#8c7d67] mt-1" />
            </div>

            {/* Drawn Card or Exploration Deck Stack */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#7a6d59] uppercase tracking-wider mb-1">
                {drawnCard ? 'Drawn Card' : 'Survey Deck'}
              </span>
              
              <div className="relative flex-shrink-0">
                {/* 3D Stacked Deck Underneath */}
                <div className="absolute inset-0 bg-[#3b342a] rounded-lg border-2 border-[#2b261f] translate-x-1.5 translate-y-1.5 opacity-60"></div>
                <div className="absolute inset-0 bg-[#4a4235] rounded-lg border-2 border-[#2b261f] translate-x-0.5 translate-y-0.5 opacity-80"></div>

                {drawnCard ? (
                  /* Face-Up Drawn Card (Flipping in 3D from Deck) */
                  <div
                    key={`${drawnCard.suit}-${drawnCard.rank}`}
                    className={`w-18 h-26 bg-white border-2 border-[#2b261f] rounded-lg shadow-lg flex flex-col justify-between p-1.5 select-none shrink-0 relative z-10 animate-card-flip-from-deck ${
                      drawnCard.isAceOfSpades
                        ? 'ring-4 ring-amber-400 bg-amber-50 shadow-amber-300/60'
                        : drawnCard.isHonor
                        ? 'ring-2 ring-orange-400 bg-orange-50/50'
                        : ''
                    }`}
                  >
                    <div className={`text-xs font-bold leading-none ${getSuitColor(drawnCard.suit)}`}>
                      {drawnCard.rank}
                      <div className="text-[10px]">{drawnCard.suit}</div>
                    </div>
                    <div className={`text-3xl font-black text-center ${getSuitColor(drawnCard.suit)}`}>
                      {drawnCard.isAceOfSpades ? '♠' : drawnCard.suit}
                    </div>
                    <div className={`text-xs font-bold leading-none text-right ${getSuitColor(drawnCard.suit)}`}>
                      {drawnCard.rank}
                      <div className="text-[10px]">{drawnCard.suit}</div>
                    </div>
                  </div>
                ) : (
                  /* Face-Down Top of Deck Card */
                  <div className="w-18 h-26 bg-[#2b261f] border-2 border-[#f4edd9] rounded-lg shadow-md p-1 flex flex-col items-center justify-center select-none relative z-10 overflow-hidden">
                    <div className="w-full h-full border border-dashed border-[#e8deca]/60 rounded flex flex-col items-center justify-center bg-[#3b342a] p-1">
                      <div className="flex items-center gap-1 text-[#e8deca] text-[11px]">
                        <span>♠</span>
                        <span className="text-red-400">♦</span>
                        <span>♣</span>
                      </div>
                      <span className="text-base font-black text-[#f4edd9] mt-0.5">?</span>
                      <span className="text-[9px] font-mono font-bold text-[#cfbe9f]/90 mt-0.5">
                        {deckCount} cards
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result / Outcome banner if not in initial higher_lower prompt */}
          {resultMessage && pendingChoice !== 'higher_lower' && (
            <div className="p-2 bg-[#fdfbf7] rounded-lg border border-[#2b261f]/20 text-[11px] text-[#443d33] leading-relaxed">
              {resultMessage}
            </div>
          )}

          {/* ACTION BUTTONS */}
          {pendingChoice === 'higher_lower' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-[#2b261f]">
                Predict next card rank (2 to 10):
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPredict('higher')}
                  className="flex-1 py-2.5 px-3 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-mono font-black text-xs sm:text-sm rounded-lg shadow-md border-2 border-[#14532d] flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:translate-y-0.5"
                >
                  <span>▲ HIGHER</span>
                  <span className="text-[10px] bg-[#14532d] px-1.5 py-0.5 rounded text-[#86efac]">
                    {streak >= 0 ? `+${streak + 1}⚡` : '+1⚡'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onPredict('lower')}
                  className="flex-1 py-2.5 px-3 bg-[#b91c1c] hover:bg-[#991b1b] active:bg-[#7f1d1d] text-white font-mono font-black text-xs sm:text-sm rounded-lg shadow-md border-2 border-[#7f1d1d] flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:translate-y-0.5"
                >
                  <span>▼ LOWER</span>
                  <span className="text-[10px] bg-[#7f1d1d] px-1.5 py-0.5 rounded text-[#fca5a5]">
                    {streak >= 0 ? `+${streak + 1}⚡` : '+1⚡'}
                  </span>
                </button>
              </div>
              <div className="text-[10px] text-[#5c5244] leading-snug text-center pt-0.5">
                Drawing J, Q, K, A allows you to discard the current card or gamble for A♠
              </div>
            </div>
          )}

          {pendingChoice === 'face_gamble' && drawnCard && (
            <div className="space-y-2 pt-1 bg-[#fff7ed] p-2.5 rounded-lg border border-[#ea580c] text-left">
              <div className="text-xs font-bold text-[#9a3412] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>👑</span>
                  <span>Honor Card: {drawnCard.rank} of {getSuitName(drawnCard.suit)}!</span>
                </span>
                {activePrediction && (
                  <span className="text-[10px] bg-[#ffedd5] text-[#9a3412] px-1.5 py-0.5 rounded border border-[#fdba74] font-black uppercase">
                    Call: {activePrediction}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-[#7c2d12] leading-tight">
                Drawing J, Q, K, A does <strong>not</strong> affect your streak or guess. You can discard your base card ({baseCard?.rank}{baseCard?.suit}) for a fresh comparison card, OR draw again keeping your <strong>{activePrediction?.toUpperCase() || 'HIGHER/LOWER'}</strong> guess and streak against {baseCard?.rank}{baseCard?.suit} (and seeking A♠)!
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onFaceChoice('discard_redraw')}
                  className="w-full py-2 px-2 bg-[#d97706] hover:bg-[#b45309] text-white font-mono font-bold text-xs rounded border border-[#92400e] shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard Base for New Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFaceChoice('gamble_ace')}
                  className="w-full py-2 px-2 bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-mono font-bold text-xs rounded border border-[#1b4332] shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>♠ Draw Again (Keep {activePrediction?.toUpperCase() || 'Guess'})</span>
                </button>
              </div>
            </div>
          )}

          {pendingChoice === null && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onDismiss}
                className="w-full py-2 px-3 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-mono font-black text-xs uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-0.5"
              >
                Continue to Delve Exits →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
