import React from 'react';
import { Volume2, VolumeX, BookOpen, RotateCcw } from 'lucide-react';
import { ExplorationCard } from '../utils/explorationDeck';
import { GameLevel } from '../types';

interface HeaderProps {
  energy: number;
  maxEnergy: number;
  turn: number;
  revealedCount: number;
  totalHexes: number;
  goalFound: boolean;
  goalClue?: string | null;
  freeMoves?: number;
  hasTelescope?: boolean;
  hasDiceModifier?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onNewGame: () => void;
  level?: GameLevel;
  viewingLevel?: GameLevel;
  maxLevelReached?: GameLevel;
  onSelectViewingLevel?: (lvl: GameLevel) => void;
  totalTurns?: number;
  totalEnergySpent?: number;
  level2CardsRemaining?: number;
  level2TargetFound?: boolean;
  level2Streak?: number;
  onOpenExplorationModal?: () => void;
  unexploredCount?: number;
  overlappingCount?: number;
  isReExploring?: boolean;
  onOpenReExplorePrompt?: () => void;
  playerHand?: ExplorationCard[];
}

export const Header: React.FC<HeaderProps> = ({
  energy,
  maxEnergy,
  turn,
  revealedCount,
  totalHexes,
  goalFound,
  goalClue,
  freeMoves = 0,
  hasTelescope,
  hasDiceModifier,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onNewGame,
  level = 1,
  viewingLevel = level,
  maxLevelReached = 1,
  onSelectViewingLevel,
  totalTurns,
  totalEnergySpent = 0,
  level2CardsRemaining = 13,
  level2TargetFound = false,
  level2Streak = 0,
  onOpenExplorationModal,
  unexploredCount = 0,
  overlappingCount = 0,
  isReExploring = false,
  onOpenReExplorePrompt,
  playerHand = [],
}) => {
  const exploredPct = Math.round((revealedCount / totalHexes) * 100);
  const isLowEnergy = energy <= 5;
  const isReviewingPrevious = viewingLevel < level;

  return (
    <header className="shrink-0 bg-[#e8deca] border-b-2 border-[#2b261f] shadow-xs select-none">
      {/* Compact single row top utility & game status */}
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-[#2b261f]/20">
        <button
          id="btn-new-expedition"
          onClick={onNewGame}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase bg-[#f5efe3] hover:bg-[#fff9ed] text-[#2b261f] border border-[#2b261f] rounded shadow-2xs active:translate-y-px cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>New Game</span>
        </button>

        {/* Center Static Level Viewer (shows only reached levels, allows reviewing previous progress) */}
        <div className="flex items-center gap-1 font-bold text-xs text-[#2b261f] uppercase font-mono tracking-tight">
          {maxLevelReached === 1 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#dfd3bc] border border-[#2b261f]/30 rounded text-[10px] font-black text-[#2b261f]">
              <span className="text-[#6b6252]">LEVEL</span>
              <span className="px-1.5 py-0.2 bg-[#2d6a4f] text-white rounded text-[9.5px]">1</span>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 bg-[#dfd3bc] p-0.5 rounded border border-[#2b261f]/30">
              <span className="text-[9px] text-[#6b6252] font-black uppercase tracking-wider px-1">
                LVL:
              </span>
              {([1, 2, 3] as const)
                .filter((lvl) => lvl <= maxLevelReached)
                .map((lvl) => {
                  const isCurrentViewing = viewingLevel === lvl;
                  const isPrevious = lvl < level;
                  const isActive = lvl === level;

                  return (
                    <button
                      key={`lvl-view-${lvl}`}
                      onClick={() => onSelectViewingLevel && onSelectViewingLevel(lvl)}
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-black transition-colors ${
                        isCurrentViewing
                          ? isPrevious
                            ? 'bg-[#b45309] text-white shadow-2xs'
                            : 'bg-[#2d6a4f] text-white shadow-2xs'
                          : 'text-[#5c5346] hover:bg-[#ece2d0] cursor-pointer'
                      }`}
                      title={
                        isActive
                          ? `Level ${lvl} (Current Active Expedition)`
                          : `Review Level ${lvl} Progress (Read-Only)`
                      }
                    >
                      <span>L{lvl}</span>
                      {isPrevious && isCurrentViewing && (
                        <span className="text-[7.5px] ml-0.5 opacity-90 font-normal">👁️</span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            id="btn-toggle-sound"
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            className="p-1 text-xs bg-[#f5efe3] hover:bg-[#fff9ed] text-[#2b261f] border border-[#2b261f] rounded shadow-2xs cursor-pointer"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-stone-400" />}
          </button>

          <button
            id="btn-open-rules"
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase bg-[#f5efe3] hover:bg-[#fff9ed] text-[#2b261f] border border-[#2b261f] rounded shadow-2xs cursor-pointer"
          >
            <BookOpen className="w-3 h-3" />
            <span>Rules</span>
          </button>
        </div>
      </div>

      {/* Top Banner (Energy display & review mode badge) */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#ede4d3] border-t border-[#2b261f]/20">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-mono font-bold text-[#5c5446]">⚡ Energy:</span>
          <span
            className={`text-sm font-black font-mono tracking-tight ${
              isLowEnergy ? 'text-red-700 animate-pulse' : 'text-[#2d6a4f]'
            }`}
          >
            {energy}
          </span>
          <span className="text-xs font-mono text-[#786e5e]">/{maxEnergy}</span>
        </div>

        <div className="flex items-center gap-2">
          {isReviewingPrevious && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-[#92400e] bg-[#fef3c7] border border-[#d97706]/40 px-1.5 py-0.2 rounded-full font-mono">
              <span>👁️ L{viewingLevel} Review</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#786e5e] uppercase">
            <span>TURNS {totalTurns !== undefined ? totalTurns : turn}</span>
            <span className="opacity-40">•</span>
            <span>SPENT {totalEnergySpent}⚡</span>
          </div>
        </div>
      </div>
    </header>
  );
};
