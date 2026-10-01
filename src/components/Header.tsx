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
  onChangeLevel?: (lvl: GameLevel) => void;
  level2CardsRemaining?: number;
  level2TargetFound?: boolean;
  level2Streak?: number;
  onOpenExplorationModal?: () => void;
  unexploredCount?: number;
  overlappingCount?: number;
  isReExploring?: boolean;
  onOpenReExplorePrompt?: () => void;
  playerHand?: ExplorationCard[];
  onTestLevel3?: () => void;
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
  onChangeLevel,
  level2CardsRemaining = 13,
  level2TargetFound = false,
  level2Streak = 0,
  onOpenExplorationModal,
  unexploredCount = 0,
  overlappingCount = 0,
  isReExploring = false,
  onOpenReExplorePrompt,
  playerHand = [],
  onTestLevel3,
}) => {
  const exploredPct = Math.round((revealedCount / totalHexes) * 100);
  const isLowEnergy = energy <= 5;

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

        {/* Center Level Selector & Test Button */}
        <div className="flex items-center gap-1.5 font-bold text-xs text-[#2b261f] uppercase font-mono tracking-tight">
          <div className="flex items-center gap-1">
            {/* Quick Level Switcher Pills for convenience */}
            {onChangeLevel && (
              <div className="flex items-center gap-0.5 ml-1.5 bg-[#dfd3bc] p-0.5 rounded border border-[#2b261f]/30">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={`lvl-btn-${lvl}`}
                    onClick={() => onChangeLevel(lvl)}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black cursor-pointer transition-colors ${
                      level === lvl
                        ? 'bg-[#2d6a4f] text-white shadow-2xs'
                        : 'text-[#5c5346] hover:bg-[#ece2d0]'
                    }`}
                    title={
                      lvl === 1
                        ? 'Jump to Level 1 (Wilderness Hex Crawl)'
                        : lvl === 2
                        ? 'Jump to Level 2 (Underground Catacombs)'
                        : 'Jump to Level 3 (15⚡ + 5 Cards)'
                    }
                  >
                    L{lvl}
                  </button>
                ))}
              </div>
            )}

            {/* Dedicated Test Level 3 Button (15⚡ + 5 Cards in hand) */}
            {onTestLevel3 && (
              <button
                type="button"
                id="btn-test-level3"
                onClick={onTestLevel3}
                className="flex items-center gap-1 ml-1 px-1.5 py-0.5 text-[9.5px] font-mono font-black uppercase tracking-wider bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border border-[#2b261f] rounded shadow-2xs active:translate-y-px cursor-pointer"
                title="Directly test Level 3: Starts on 15⚡ Energy with the Star, Moon, Sun, Judgement and World Tarot cards in Hand"
              >
                <span>Test L3</span>
                <span className="text-[8.5px] text-[#86efac] font-bold bg-[#14532d] px-1 rounded">15⚡+5🃏</span>
              </button>
            )}
          </div>
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

      {/* Top Banner (Energy display only; turn, seen %, goal status removed) */}
      <div className="flex items-center justify-center py-1 bg-[#ede4d3] text-center border-t border-[#2b261f]/20">
        <div className="flex items-center gap-1.5 px-3">
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
      </div>
    </header>
  );
};
