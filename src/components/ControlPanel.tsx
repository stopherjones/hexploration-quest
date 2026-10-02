import React from 'react';
import tunnelImg from '../assets/tunnel.png';
import {
  DirectionIndex,
  DiceState,
  DeviationState,
  HexCoord,
} from '../types';
import { DIRECTION_LABELS } from '../utils/hexMath';
import { Footprints, Eye, Dices, CornerDownRight, RotateCcw, Compass, Sparkles } from 'lucide-react';

interface ControlPanelProps {
  diceState: DiceState;
  deviationState: DeviationState;
  selectedDirection: DirectionIndex;
  effectiveDistance: number;
  energy: number;
  pathPreview: HexCoord[];
  isMoveOne: boolean;
  freeMoves?: number;
  hasTelescope?: boolean;
  hasDiceModifier?: boolean;
  goalFound?: boolean;
  goalClue?: string | null;
  statusMessage: string;
  onRollDice: () => void;
  onSelectDirectionDie: (dieNum: 1 | 2) => void;
  onToggleMoveOne: () => void;
  onExecuteMove: () => void;
  onResetDeviation?: () => void;
  onModifyDie?: (dieNum: 1 | 2, delta: -1 | 1 | 0) => void;
}

// Render retro dice face with authentic pips and active highlight
const InteractiveDie: React.FC<{
  dieNum: 1 | 2;
  value: number;
  baseValue: number;
  role: 'direction' | 'distance';
  isDirectionChosen: boolean;
  onClick: () => void;
  disabled?: boolean;
  hasModifier?: boolean;
  modifierDelta?: -1 | 0 | 1;
  onModify?: (delta: -1 | 1 | 0) => void;
}> = ({
  dieNum,
  value,
  baseValue,
  role,
  isDirectionChosen,
  onClick,
  disabled,
  hasModifier,
  modifierDelta = 0,
  onModify,
}) => {
  const pipsMap: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const activePips = pipsMap[value] || [4];
  const dirInfo = role === 'direction' ? DIRECTION_LABELS[value as DirectionIndex] : null;

  return (
    <div
      onClick={onClick}
      className={`group relative flex-1 min-w-0 flex items-center gap-1.5 p-1.5 rounded-lg border-2 transition-all cursor-pointer select-none text-left h-full ${
        isDirectionChosen
          ? 'bg-[#2d6a4f] text-white border-[#1c1917] shadow-md ring-2 ring-[#15803d]'
          : 'bg-[#fdfbf7] text-[#2b261f] border-[#2b261f] hover:bg-[#fff9ed] shadow-xs'
      }`}
      title={`Die ${dieNum} is currently assigned to ${role.toUpperCase()}. Tap to toggle.`}
    >
      {/* 3x3 Pip Dice Box */}
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-md border-2 grid grid-cols-3 grid-rows-3 p-1 shrink-0 ${
          isDirectionChosen
            ? 'bg-[#fdfbf7] border-[#1c1917]'
            : 'bg-[#f4efe3] border-[#2b261f]'
        }`}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {activePips.includes(i) && (
              <div
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  isDirectionChosen ? 'bg-[#1c1917]' : 'bg-[#2b261f]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Label and assignment details */}
      <div className="flex flex-col min-w-0 flex-1 pr-0.5 justify-center">
        <span
          className={`text-[9px] font-mono uppercase font-bold tracking-wider truncate ${
            isDirectionChosen ? 'text-[#bbf7d0]' : 'text-[#786e5e]'
          }`}
        >
          {role === 'direction' ? 'DIR 🎯' : 'DIST 📏'}
        </span>
        <span className="text-xs sm:text-sm font-mono font-black leading-tight flex items-center gap-1 whitespace-nowrap">
          {role === 'direction' && dirInfo ? (
            <span>{dirInfo.short}</span>
          ) : (
            <span>{value} Spaces</span>
          )}
          {modifierDelta !== 0 && (
            <span className="text-[10px] text-purple-300 font-bold">
              ({modifierDelta > 0 ? `+${modifierDelta}` : modifierDelta})
            </span>
          )}
        </span>
        <span
          className={`text-[8px] sm:text-[8.5px] font-mono underline opacity-80 group-hover:opacity-100 whitespace-nowrap ${
            isDirectionChosen ? 'text-white' : 'text-[#2d6a4f]'
          }`}
        >
          {role === 'direction' ? 'Tap: Distance' : 'Tap: Direction'}
        </span>
      </div>

      {/* Optional +/- 1 Dice Modifier Controls */}
      {hasModifier && onModify && !disabled && (
        <div
          className="flex flex-col gap-0.5 pl-1 border-l border-current/20 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onModify(modifierDelta === 1 ? 0 : 1)}
            disabled={value >= 6 && modifierDelta !== -1}
            className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black border transition-all cursor-pointer ${
              modifierDelta === 1
                ? 'bg-[#9333ea] text-white border-[#581c87] shadow-xs'
                : 'bg-[#f4efe3] hover:bg-[#fff9ed] text-[#2b261f] border-[#2b261f]/40 disabled:opacity-30'
            }`}
            title="Adjust die by +1"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => onModify(modifierDelta === -1 ? 0 : -1)}
            disabled={value <= 1 && modifierDelta !== 1}
            className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black border transition-all cursor-pointer ${
              modifierDelta === -1
                ? 'bg-[#9333ea] text-white border-[#581c87] shadow-xs'
                : 'bg-[#f4efe3] hover:bg-[#fff9ed] text-[#2b261f] border-[#2b261f]/40 disabled:opacity-30'
            }`}
            title="Adjust die by -1"
          >
            -1
          </button>
        </div>
      )}
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  diceState,
  deviationState,
  effectiveDistance,
  energy,
  pathPreview,
  isMoveOne,
  freeMoves = 0,
  hasTelescope = false,
  hasDiceModifier = false,
  goalFound = false,
  goalClue = null,
  statusMessage,
  onRollDice,
  onSelectDirectionDie,
  onToggleMoveOne,
  onExecuteMove,
  onResetDeviation,
  onModifyDie,
}) => {
  const canMove = diceState.rolled && pathPreview.length > 0 && energy > 0;
  const moveEnergyCost = Math.min(pathPreview.length, energy);

  return (
    <footer className="shrink-0 bg-[#e8deca] border-t-2 border-[#2b261f] select-none shadow-lg z-30 h-[148px]">
      <div className="h-full p-1.5 sm:p-2 flex flex-col justify-between">
        {!diceState.rolled ? (
          /* 1. Pre-Roll State: Fixed height with Roll Button + Goal Hex Reminder + Collected Items */
          <div className="h-full flex flex-col justify-between gap-1.5">
            {/* Top: Roll 2D6 button + optional Free Move toggle */}
            <div className="flex items-center gap-2">
              <button
                id="btn-roll-dice"
                onClick={onRollDice}
                disabled={diceState.isRolling || energy <= 0}
                className="flex-1 py-2 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Dices className={`w-4 h-4 ${diceState.isRolling ? 'animate-spin' : ''}`} />
                <span>{diceState.isRolling ? 'ROLLING 2D6...' : 'ROLL 2D6 FOR MOVEMENT'}</span>
              </button>

              {/* Free Move 1 Hex button - ONLY available when granted by Fortune Shrine */}
              {freeMoves > 0 && (
                <button
                  id="btn-move-one"
                  onClick={onToggleMoveOne}
                  className={`py-1 px-3 text-[10.5px] font-mono font-bold rounded-lg border-2 flex flex-col items-center justify-center transition-colors cursor-pointer shrink-0 leading-tight shadow-xs ${
                    isMoveOne
                      ? 'bg-[#15803d] text-white ring-2 ring-[#166534] border-[#166534]'
                      : energy <= 0
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-600 animate-pulse ring-2 ring-amber-400'
                      : 'bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] border-[#16a34a]'
                  }`}
                  title={`Free Move 1 Hex: Step into any adjacent hex for 0 Energy (${freeMoves} free move${freeMoves > 1 ? 's' : ''} left)`}
                >
                  <div className="flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5" />
                    <span>{isMoveOne ? 'Cancel' : energy <= 0 ? `LAST BREATH (${freeMoves})` : `Free Move (${freeMoves})`}</span>
                  </div>
                  <span className="text-[9px] opacity-80 whitespace-nowrap font-black">
                    {isMoveOne ? 'Tap Hex' : energy <= 0 ? '0⚡ REMAINING!' : 'FREE ⚡'}
                  </span>
                </button>
              )}
            </div>

            {/* Middle: Visual reminder of the Goal Hex */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#fdfbf7] rounded-lg border border-[#2b261f]/25 text-[11px] font-mono shadow-2xs">
              {goalFound || goalClue ? (
                <div className="relative shrink-0 flex items-center justify-center w-6 h-6">
                  <img
                    src={tunnelImg}
                    alt="Secret Tunnel Entrance Hex"
                    className={`w-6 h-6 object-contain transition-transform ${
                      goalFound
                        ? 'animate-pulse scale-105 drop-shadow-sm'
                        : 'drop-shadow-xs'
                    }`}
                  />
                  {goalFound && (
                    <span className="absolute -top-1 -right-1 text-[9px] leading-none">🌟</span>
                  )}
                </div>
              ) : (
                <div className="relative shrink-0 flex items-center justify-center w-6 h-6">
                  <img
                    src={tunnelImg}
                    alt="Secret Tunnel Entrance Hex"
                    className="w-6 h-6 object-contain opacity-40 grayscale-[50%]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[8.5px] font-bold text-[#786e5e]">❓</span>
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#2b261f] text-[10px] uppercase">
                    Goal Hex: Secret Tunnel Entrance
                  </span>
                  <span
                    className={`text-[9.5px] font-black uppercase ${
                      goalFound ? 'text-[#15803d]' : goalClue ? 'text-[#b45309]' : 'text-[#786e5e]'
                    }`}
                  >
                    {goalFound ? 'Discovered!' : goalClue ? 'Clue Active' : 'Hidden'}
                  </span>
                </div>
                <span
                  className={`text-[10px] truncate ${
                    goalFound ? 'text-[#15803d] font-bold' : goalClue ? 'text-[#b45309] font-bold' : 'text-[#786e5e]'
                  }`}
                >
                  {goalFound
                    ? 'Secret Tunnel Discovered! Move onto this hex to descend to Level 2.'
                    : goalClue
                    ? `Entrance lies: ${goalClue}`
                    : 'Search ancient ruins and watchtowers to discover the entrance.'}
                </span>
              </div>
            </div>

            {/* Bottom: Visual reminder of Collected Items (Telescope, Dice Modifier, Free Move) */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
              {/* Telescope */}
              <div
                className={`p-1 rounded-md border flex items-center justify-center gap-1 transition-all ${
                  hasTelescope
                    ? 'bg-[#dcfce7] border-[#86efac] text-[#15803d] font-bold shadow-2xs'
                    : 'bg-[#ede4d3]/60 border-[#2b261f]/15 text-[#8a7f6f]'
                }`}
                title={hasTelescope ? 'Telescope Active: Range 3 Tower scouting & directional clues' : 'Telescope not yet collected'}
              >
                <span>🔭</span>
                <span className="truncate">{hasTelescope ? 'Telescope' : 'No Telescope'}</span>
              </div>

              {/* Dice Modifier */}
              <div
                className={`p-1 rounded-md border flex items-center justify-center gap-1 transition-all ${
                  hasDiceModifier
                    ? 'bg-[#f3e8ff] border-[#d8b4fe] text-[#7e22ce] font-bold shadow-2xs'
                    : 'bg-[#ede4d3]/60 border-[#2b261f]/15 text-[#8a7f6f]'
                }`}
                title={hasDiceModifier ? 'Dice Modifier Active: Alter any movement die by ±1' : 'Dice Modifier not yet collected'}
              >
                <span>🎲</span>
                <span className="truncate">{hasDiceModifier ? '±1 Modifier' : 'No Modifier'}</span>
              </div>

              {/* Free Move */}
              <div
                className={`p-1 rounded-md border flex items-center justify-center gap-1 transition-all ${
                  freeMoves > 0
                    ? 'bg-[#dbeafe] border-[#93c5fd] text-[#1d4ed8] font-bold shadow-2xs'
                    : 'bg-[#ede4d3]/60 border-[#2b261f]/15 text-[#8a7f6f]'
                }`}
                title={freeMoves > 0 ? `${freeMoves} Free 1-Hex step(s) available from Fortune Shrine` : 'No Free Moves'}
              >
                <span>👣</span>
                <span className="truncate">{freeMoves > 0 ? `${freeMoves} Free Move${freeMoves > 1 ? 's' : ''}` : '0 Free Move'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* 2. Post-Roll State: Same fixed height with Interactive Dice + Status Bar + Confirm Move */
          <div className="h-full flex flex-col justify-between gap-1.5">
            {/* Row 1: Interactive Dice Selection Bar */}
            <div className="flex items-stretch justify-between gap-1.5">
              <div className="flex items-stretch gap-1.5 flex-1 min-w-0">
                {/* Die 1 */}
                <InteractiveDie
                  dieNum={1}
                  value={diceState.die1}
                  baseValue={diceState.baseDie1}
                  role={diceState.chosenDirectionDie === 1 ? 'direction' : 'distance'}
                  isDirectionChosen={diceState.chosenDirectionDie === 1}
                  onClick={() => onSelectDirectionDie(1)}
                  disabled={diceState.isRolling}
                  hasModifier={hasDiceModifier}
                  modifierDelta={diceState.modifiedDie === 1 ? (diceState.modifierDelta || 0) : 0}
                  onModify={onModifyDie ? (delta) => onModifyDie(1, delta) : undefined}
                />

                {/* Die 2 */}
                <InteractiveDie
                  dieNum={2}
                  value={diceState.die2}
                  baseValue={diceState.baseDie2}
                  role={diceState.chosenDirectionDie === 2 ? 'direction' : 'distance'}
                  isDirectionChosen={diceState.chosenDirectionDie === 2}
                  onClick={() => onSelectDirectionDie(2)}
                  disabled={diceState.isRolling}
                  hasModifier={hasDiceModifier}
                  modifierDelta={diceState.modifiedDie === 2 ? (diceState.modifierDelta || 0) : 0}
                  onModify={onModifyDie ? (delta) => onModifyDie(2, delta) : undefined}
                />
              </div>

              {/* Action Button: Free Move 1 step option (only if granted by Shrine) */}
              {freeMoves > 0 && (
                <div className="flex items-stretch shrink-0 ml-auto">
                  <button
                    id="btn-toggle-move-one"
                    onClick={onToggleMoveOne}
                    className={`py-1 px-2.5 text-[10px] font-mono font-bold rounded-lg border-2 border-[#16a34a] flex flex-col items-center justify-center transition-all cursor-pointer shrink-0 leading-tight h-full shadow-xs ${
                      isMoveOne
                        ? 'bg-[#15803d] text-white ring-2 ring-[#166534]'
                        : 'bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d]'
                    }`}
                    title={`Free Move 1 Hex: Step into any adjacent hex for 0 Energy (${freeMoves} free move${freeMoves > 1 ? 's' : ''} left)`}
                  >
                    <div className="flex items-center gap-1">
                      <Footprints className="w-3 h-3" />
                      <span>{isMoveOne ? 'Cancel' : `Free Move (${freeMoves})`}</span>
                    </div>
                    <span className="text-[9px] opacity-80 whitespace-nowrap">
                      {isMoveOne ? 'Tap Hex' : 'FREE ⚡'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Hint / Deviation / Modifier / Path Info Bar */}
            {deviationState.active && deviationState.type === 'split_path' ? (
              <div className="flex items-center justify-between gap-2 px-2 py-0.5 bg-[#fef3c7] border border-[#d97706] rounded-md text-[10px] font-mono text-[#92400e]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
                  <span className="leading-tight truncate">
                    {deviationState.step1Distance === 0
                      ? `Deviation: ${deviationState.step2Distance} spaces. Tap branch or confirm.`
                      : `Deviation at Step ${deviationState.step1Distance}: ${deviationState.step2Distance} spaces. Tap branch or confirm.`}
                  </span>
                </div>
                {onResetDeviation && (
                  <button
                    onClick={onResetDeviation}
                    className="px-2 py-0.2 text-[9.5px] font-mono font-bold rounded border border-[#b45309] bg-[#fffbeb] hover:bg-[#fde68a] text-[#92400e] flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-2xs"
                    title="Clear deviation and reset to straight path"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            ) : hasDiceModifier && diceState.modifiedDie ? (
              <div className="flex items-center justify-between px-2 py-0.5 bg-[#f3e8ff] border border-[#9333ea] rounded text-[10px] font-mono text-[#6b21a8]">
                <span>
                  🎲 Die {diceState.modifiedDie} adjusted by {diceState.modifierDelta! > 0 ? `+${diceState.modifierDelta}` : diceState.modifierDelta}. Path updated!
                </span>
                {onModifyDie && (
                  <button
                    onClick={() => onModifyDie(diceState.modifiedDie as 1 | 2, 0)}
                    className="underline hover:text-[#581c87] cursor-pointer"
                  >
                    Undo
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between px-2 py-0.5 bg-[#ede4d3]/80 border border-[#2b261f]/20 rounded text-[10px] font-mono text-[#5c5346]">
                <span className="truncate">🎯 Tap either die above to switch Direction / Distance</span>
                <span className="text-[#2d6a4f] font-bold shrink-0">{pathPreview.length} space{pathPreview.length !== 1 ? 's' : ''} planned</span>
              </div>
            )}

            {/* Row 3: Big Execute Move Primary Action Button */}
            <button
              id="btn-execute-move"
              onClick={onExecuteMove}
              disabled={!canMove}
              className="w-full py-2 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Footprints className="w-4 h-4" />
              <span>
                {canMove
                  ? `CONFIRM MOVE (${moveEnergyCost} Hex${moveEnergyCost !== 1 ? 'es' : ''} • Costs ${moveEnergyCost}⚡)`
                  : 'OBSTRUCTED / NO PATH'}
              </span>
            </button>
          </div>
        )}
      </div>
    </footer>
  );
};

