import React from 'react';
import { Volume2, VolumeX, BookOpen, RotateCcw, Compass } from 'lucide-react';

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
  level?: 1 | 2 | 3;
  level2CardsRemaining?: number;
  level2TargetFound?: boolean;
  level2Streak?: number;
  onOpenExplorationModal?: () => void;
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
  level2CardsRemaining = 13,
  level2TargetFound = false,
  level2Streak = 0,
  onOpenExplorationModal,
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

        {/* Center Title + Active Boons Badges */}
        <div className="flex items-center gap-1.5 font-bold text-xs text-[#2b261f] uppercase font-mono tracking-tight">
          <div className="flex items-center gap-1">
            {level === 3 ? (
              <>
                <span className="text-emerald-700 text-sm leading-none">⚙️</span>
                <span>Level 3: Utopia Machine</span>
              </>
            ) : level === 2 ? (
              <>
                <span className="text-slate-900 text-sm leading-none">♠</span>
                <span>Level 2: Tunnels</span>
                <button
                  type="button"
                  onClick={onOpenExplorationModal}
                  className={`ml-1 px-1.5 py-0.5 rounded font-black font-mono text-[10px] border shadow-2xs cursor-pointer flex items-center gap-1 active:translate-y-px transition-colors ${
                    level2Streak > 0
                      ? 'bg-[#dcfce7] text-[#15803d] border-[#86efac] hover:bg-[#bbf7d0]'
                      : level2Streak < 0
                      ? 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5] hover:bg-[#fecaca]'
                      : 'bg-[#f5efe3] text-[#5c5244] border-[#2b261f]/40 hover:bg-[#fff9ed]'
                  }`}
                  title="View Chamber Exploration survey popup"
                >
                  <span>♠ Survey</span>
                  {level2Streak !== 0 && (
                    <span>{level2Streak > 0 ? `▲+${level2Streak}` : `▼${level2Streak}`}</span>
                  )}
                </button>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-[#2d6a4f]" />
                <span>Level 1: Hex Crawl</span>
              </>
            )}
          </div>

          {level === 1 && (freeMoves > 0 || hasTelescope || hasDiceModifier) && (
            <div className="flex items-center gap-1 ml-1 text-[10px] normal-case">
              {freeMoves > 0 && (
                <span
                  className="px-1.5 py-0.5 bg-[#dcfce7] text-[#15803d] border border-[#22c55e]/60 rounded font-black font-mono flex items-center gap-0.5 shadow-2xs"
                  title={`Free Move Active: ${freeMoves} free 1-hex step${freeMoves > 1 ? 's' : ''} available (0 ⚡)`}
                >
                  👟 {freeMoves} Free
                </span>
              )}
              {hasTelescope && (
                <span
                  className="px-1.5 py-0.5 bg-[#dbeafe] text-[#1e40af] border border-[#3b82f6]/50 rounded font-black font-mono shadow-2xs"
                  title="Telescope Active: Watchtowers reveal all 6 directions to board edge!"
                >
                  🔭 Scope
                </span>
              )}
              {hasDiceModifier && (
                <span
                  className="px-1.5 py-0.5 bg-[#f3e8ff] text-[#6b21a8] border border-[#9333ea]/50 rounded font-black font-mono shadow-2xs"
                  title="Dice Modifier Active: You can adjust either movement die by ±1 every turn!"
                >
                  🎲 ±1 Mod
                </span>
              )}
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

      {/* Ultra-compact Scorecard Stats Bar */}
      <div className="grid grid-cols-4 divide-x divide-[#2b261f]/30 py-0.5 bg-[#ede4d3] text-center">
        {/* Energy Countdown */}
        <div className="flex items-center justify-center gap-1 px-1">
          <span className="text-[9px] uppercase font-mono text-[#5c5446]">⚡</span>
          <span
            className={`text-sm font-black font-mono tracking-tight ${
              isLowEnergy ? 'text-red-700 animate-pulse' : 'text-[#2d6a4f]'
            }`}
          >
            {energy}
          </span>
          <span className="text-[10px] font-mono text-[#786e5e]">/{maxEnergy}</span>
        </div>

        {/* Turn Count */}
        <div className="flex items-center justify-center gap-1 px-1">
          <span className="text-[9px] uppercase font-mono text-[#5c5446]">Turn:</span>
          <span className="text-sm font-black font-mono text-[#2b261f]">
            {turn}
          </span>
        </div>

        {/* Explored Percentage / Deck in Level 2 */}
        <div
          className="flex items-center justify-center gap-1 px-1"
          title={level === 2 ? 'Delve cards remaining in deck' : 'Hexes explored'}
        >
          <span className="text-[9px] uppercase font-mono text-[#5c5446]">
            {level === 2 ? 'Deck:' : 'Seen:'}
          </span>
          <span className="text-sm font-black font-mono text-[#2b261f]">
            {level === 2 ? `${level2CardsRemaining}/13` : `${exploredPct}%`}
          </span>
        </div>

        {/* Beacon / Goal Status in Level 1; Target Ace in Level 2 */}
        <div
          className="flex items-center justify-center gap-1 px-1"
          title={
            level === 3
              ? 'Floor 1 / 3'
              : level === 2
              ? level2TargetFound
                ? 'Ace of Spades Exit Discovered!'
                : 'Ace of Spades lurking in Exploration Deck!'
              : goalFound
              ? 'Secret Tunnel Entrance Found!'
              : goalClue
              ? `Secret Tunnel lies: ${goalClue}`
              : 'Secret Tunnel Hidden'
          }
        >
          <span className="text-[9px] uppercase font-mono text-[#5c5446]">
            {level === 3 ? 'Floor:' : level === 2 ? 'Exit:' : 'Goal:'}
          </span>
          {level === 3 ? (
            <span className="text-[11px] font-black font-mono uppercase text-[#2d6a4f]">
              Floor 1/3
            </span>
          ) : level === 2 ? (
            <span
              className={`text-[11px] font-black font-mono uppercase truncate ${
                level2TargetFound ? 'text-[#2d6a4f]' : 'text-[#b45309]'
              }`}
            >
              {level2TargetFound ? '🌟 Exit A♠' : '♠ In Deck'}
            </span>
          ) : (
            <span
              className={`text-[11px] font-black font-mono uppercase truncate ${
                goalFound
                  ? 'text-[#2d6a4f]'
                  : goalClue
                  ? 'text-[#b45309]'
                  : 'text-[#8a7f6f]'
              }`}
              title={
                goalFound
                  ? 'Secret Tunnel Entrance Found!'
                  : goalClue
                  ? `Secret Tunnel lies: ${goalClue}`
                  : 'Secret Tunnel Hidden'
              }
            >
              {goalFound
                ? '🌟 Found'
                : goalClue
                ? `🧭 ${goalClue}`
                : '❓ Hidden'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
