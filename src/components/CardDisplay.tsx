import React from 'react';
import { TunnelCard, ALL_HEART_RANKS } from '../utils/delveDeck';
import { ShieldAlert, Sparkles, Trophy, Ban, Sparkle } from 'lucide-react';
import { DirectionIndex } from '../types';
import { getCardConciseDescription } from '../utils/tunnelEngine';

export interface DelveExitInfo {
  current: number;
  total: number;
  dirName: string;
}

interface CardDisplayProps {
  card: TunnelCard | null;
  deckCount: number;
  discardCards?: TunnelCard[];
  canDraw?: boolean;
  onDrawCard?: () => void;
  activeExitDirs?: DirectionIndex[];
  delveStage?: 'draw' | 'ink' | null;
  delveExitInfo?: DelveExitInfo | null;
  isReExploring?: boolean;
  canReExplore?: boolean;
  onOpenReExplorePrompt?: () => void;
}

export function getDelveChartEntry(card: TunnelCard): string {
  switch (card.effect) {
    case 'fork':
      return 'Forking passage — divides outward into two branching corridors.';
    case 'chamber':
      return 'Great chamber — expansive cavern opening three illuminated exits ahead.';
    case 'dead_end':
      return 'Collapsed cave-in! Massive rockfall blocks forward passage.';
    case 'trap':
      return 'Trap chamber! Pressure plate arms spring-loaded scythe blades.';
    case 'treasure':
      return 'Ancient stone vault! Undisturbed mana strongbox discovered.';
    case 'target':
      return 'Grand subterranean exit archway! The escape gateway to the surface.';
    default:
      return card.description;
  }
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  deckCount,
  discardCards = [],
  canDraw = false,
  onDrawCard,
  activeExitDirs = [],
  delveStage = null,
  delveExitInfo = null,
  isReExploring = false,
  canReExplore = false,
  onOpenReExplorePrompt,
}) => {
  const drawnRanksSet = new Set(discardCards.map((c) => c.rank));

  // Card title formatting
  const getCardTitle = (c: TunnelCard) => {
    switch (c.effect) {
      case 'fork':
        return `${c.rank} of Hearts — Fork Passage`;
      case 'chamber':
        return `${c.rank} of Hearts — Large Chamber`;
      case 'dead_end':
        return `${c.rank} of Hearts — Dead End`;
      case 'trap':
        return `${c.rank} of Hearts — Trap Chamber`;
      case 'treasure':
        return `${c.rank} of Hearts — Ancient Vault`;
      case 'target':
        return 'Ace of Hearts — Exit Archway';
      default:
        return c.name;
    }
  };

  return (
    <div className="bg-[#f4edd9] border-2 border-[#2b261f] rounded-lg p-2 shadow-sm text-[#2b261f] flex flex-col gap-2 select-none">
      {/* Cards Tracker Row (greys out as drawn) */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 px-1 bg-[#e8deca] rounded-md border border-[#2b261f]/30">
        {ALL_HEART_RANKS.map((rank) => {
          const isDrawn = drawnRanksSet.has(rank);
          return (
            <div
              key={rank}
              className={`flex-1 min-w-[20px] py-1 px-0.5 rounded text-center text-[10px] font-mono leading-none border transition-all ${
                isDrawn
                  ? 'bg-[#ded4bf] text-[#8c8273] border-[#8c8273]/30 line-through opacity-50'
                  : rank === 'A'
                  ? 'bg-[#fae19c] text-[#78350f] border-[#b45309] font-black'
                  : rank === 'J'
                  ? 'bg-[#fee2e2] text-[#991b1b] border-[#ef4444] font-bold'
                  : rank === 'Q' || rank === 'K'
                  ? 'bg-[#fef3c7] text-[#92400e] border-[#d97706] font-bold'
                  : 'bg-[#fdfbf7] text-[#991b1b] border-[#2b261f]/20 font-bold'
              }`}
              title={`${rank}♥: ${isDrawn ? 'Drawn' : 'In Deck'}`}
            >
              <span>{rank}</span>
            </div>
          );
        })}
      </div>

      {/* Re-Exploration Active or Prompt Banner */}
      {isReExploring ? (
        <div className="bg-[#fef3c7] border border-[#f59e0b] rounded p-1.5 flex items-center justify-between text-[11px] text-[#78350f] font-mono shadow-2xs">
          <span className="font-bold flex items-center gap-1.5">
            <span className="animate-spin-slow">🔁</span>
            <span>Phase 2: Re-Exploring Map (2⚡ per chamber move)</span>
          </span>
          <span className="text-[10px] bg-[#fde68a] text-[#78350f] px-1.5 py-0.2 rounded font-black border border-[#f59e0b]/40">
            Hunt A♠
          </span>
        </div>
      ) : canReExplore && onOpenReExplorePrompt ? (
        <div
          onClick={onOpenReExplorePrompt}
          className="bg-[#fef3c7] hover:bg-[#fde68a] border-2 border-[#f59e0b] rounded p-1.5 flex items-center justify-between text-[11px] text-[#78350f] font-mono cursor-pointer transition-colors shadow-xs"
        >
          <span className="font-black flex items-center gap-1.5">
            <span>🔁</span>
            <span>Map fully drawn! Prompt to explore again?</span>
          </span>
          <span className="text-[10px] bg-[#b45309] text-white px-2 py-0.5 rounded font-black border border-[#78350f] shadow-2xs">
            Start 2⚡
          </span>
        </div>
      ) : null}

      {/* Main Status Section: Chamber Status OR Active Card Details */}
      {canDraw ? (
        <div
          onClick={onDrawCard}
          className={`p-2 bg-[#fdfbf7] rounded-md border border-[#2b261f]/30 shadow-xs flex items-center gap-3 ${
            onDrawCard ? 'cursor-pointer hover:bg-[#fff9ed] transition-colors' : ''
          }`}
          title={onDrawCard ? 'Click to Draw Delve Card' : undefined}
        >
          {/* Playing Card Back Graphic with stacked deck depth */}
          <div className="relative flex-shrink-0">
            {deckCount > 1 && (
              <div className="absolute inset-0 bg-[#3b342a] rounded-md translate-x-1 translate-y-1 border border-[#2b261f]"></div>
            )}
            <div className="w-10 h-14 bg-[#ede4d3] border-2 border-[#2b261f] rounded-md shadow-xs flex flex-col items-center justify-center p-0.5 relative z-10">
              <span className="text-base text-[#b91c1c] font-black">♥</span>
              <div className="w-5 h-5 rounded-full border border-[#2b261f]/30 flex items-center justify-center mt-0.5">
                <Sparkle className="w-3 h-3 text-[#786e5e]" />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0 font-mono">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-black text-[#2b261f] truncate">
                {card && (card.effect === 'trap' || card.effect === 'treasure')
                  ? `${card.rank}♥ Event Cleared!`
                  : 'Chamber Unsurveyed'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide bg-[#fae19c] text-[#78350f] border border-[#b45309] flex-shrink-0">
                Action Required
              </span>
            </div>
            <div className="text-[11px] text-[#5c5346] leading-snug mt-1">
              {card && (card.effect === 'trap' || card.effect === 'treasure')
                ? 'Chamber event resolved! Press "DRAW DELVE CARD" below to explore exits.'
                : 'Press "DRAW DELVE CARD" below to survey this chamber and carve corridor exits.'}
            </div>
          </div>
        </div>
      ) : card ? (
        <div className="flex items-center gap-3 px-1 py-0.5">
          {/* Card Face Graphic with Draw Flip Animation & Sequence Glow */}
          <div
            key={`${card.rank}-${card.effect}`}
            className={`relative w-11 h-15 bg-[#fffdfa] border-2 border-[#2b261f] rounded-md shadow-md select-none flex-shrink-0 overflow-hidden animate-card-flip-from-deck ${
              delveStage ? 'ring-2 ring-amber-500 shadow-amber-500/30' : ''
            }`}
          >
            {/* Top-left corner */}
            <div className="absolute top-1 left-1 flex flex-col items-center leading-none pointer-events-none">
              <span className="font-serif font-black text-xs text-[#b91c1c] leading-none">
                {card.rank}
              </span>
              <span className="text-[8px] text-[#b91c1c] leading-none mt-0.5">♥</span>
            </div>

            {/* Center Emblem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {card.effect === 'target' ? (
                <Trophy className="w-4 h-4 text-[#b45309]" />
              ) : card.effect === 'dead_end' ? (
                <Ban className="w-3.5 h-3.5 text-[#786e5e]" />
              ) : card.effect === 'trap' ? (
                <ShieldAlert className="w-3.5 h-3.5 text-[#b91c1c]" />
              ) : card.effect === 'treasure' ? (
                <Sparkles className="w-3.5 h-3.5 text-[#b45309]" />
              ) : (
                <span className="font-serif font-black text-sm text-[#b91c1c] leading-none">♥</span>
              )}
            </div>

            {/* Bottom-right corner (inverted) */}
            <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 pointer-events-none">
              <span className="font-serif font-black text-xs text-[#b91c1c] leading-none">
                {card.rank}
              </span>
              <span className="text-[8px] text-[#b91c1c] leading-none mt-0.5">♥</span>
            </div>
          </div>

          {/* Concise Card Details or Active Delve Stage Phase */}
          <div className="flex-1 min-w-0 space-y-0.5 font-mono">
            {delveStage === 'draw' ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-300 text-amber-950 border border-amber-500">
                    Stage 1 of 2: Drawn
                  </span>
                  <span className="font-black text-xs text-[#2b261f]">
                    {card.rank} of Hearts
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#451a03] leading-snug mt-1 bg-[#fef3c7] p-1 rounded border border-[#fde68a]">
                  📖 {getDelveChartEntry(card)}
                </p>
              </div>
            ) : delveStage === 'ink' ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-950 border border-emerald-500">
                    Stage 2 of 2: Inking
                  </span>
                  <span className="font-black text-xs text-[#14532d] truncate">
                    {delveExitInfo
                      ? `Exit ${delveExitInfo.current} of ${delveExitInfo.total} (${delveExitInfo.dirName})`
                      : 'Inking Corridors on Map'}
                  </span>
                </div>
                <p className="text-[11px] text-[#166534] leading-snug mt-1 animate-pulse">
                  ✏️ Drawing corridors onto the map one by one...
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-[#2b261f] truncate">
                    {getCardTitle(card)}
                  </span>
                </div>
                <p className="text-[11px] text-[#5c5346] leading-snug">
                  {getCardConciseDescription(card, activeExitDirs)}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-1 text-center text-xs font-mono text-[#786e5e]">
          Step into an illuminated corridor exit to explore deeper.
        </div>
      )}
    </div>
  );
};
