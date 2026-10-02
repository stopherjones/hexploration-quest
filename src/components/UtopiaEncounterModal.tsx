import React, { useState, useEffect } from 'react';
import { TunnelCard } from '../utils/delveDeck';
import { DirectionIndex, HexCoord } from '../types';
import { sounds } from '../utils/sound';
import { ShieldAlert, Sparkles, Swords, Skull, CheckCircle2, RotateCcw } from 'lucide-react';

export type MonsterTier = 'low' | 'mid' | 'high';

export interface MonsterDef {
  name: string;
  tier: MonsterTier;
  title: string;
  description: string;
  damageValues: number[]; // e.g. [1] for low, [1, 2] for mid, [1, 2, 3] for high
  defeatValues: number[]; // e.g. [4, 5, 6] for low, [5, 6] for mid, [6] for high
}

export const MONSTER_TIERS: Record<MonsterTier, MonsterDef> = {
  low: {
    name: 'Cave Troglodyte',
    tier: 'low',
    title: 'Low Threat Creature',
    description: 'A screeching cave lurker armed with chipped flint leaps from the dark!',
    damageValues: [1],
    defeatValues: [4, 5, 6],
  },
  mid: {
    name: 'Iron-Borer Basilisk',
    tier: 'mid',
    title: 'Medium Threat Beast',
    description: 'An armored subterranean beast with razor mandibles emerges from the stone!',
    damageValues: [1, 2],
    defeatValues: [5, 6],
  },
  high: {
    name: 'Obsidian Golem',
    tier: 'high',
    title: 'High Threat Monstrosity',
    description: 'An ancient guardian of dark subterranean stone stirs to crush intruders!',
    damageValues: [1, 2, 3],
    defeatValues: [6],
  },
};

export interface UtopiaEncounterProps {
  card: TunnelCard;
  chamberCoord: HexCoord;
  headingFrom?: DirectionIndex;
  energy: number;
  maxEnergy: number;
  onModifyEnergy: (delta: number) => void;
  onCompleteEncounter: () => void;
  onDelveLost: (reason: string) => void;
}

// Clean retro D6 Pip Component
export const DiePipFace: React.FC<{
  value: number;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  locked?: boolean;
}> = ({ value, size = 'md', highlight = false, locked = false }) => {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  const pipDim = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  // Render authentic 3x3 pip grid
  const getPips = (val: number) => {
    // 3x3 positions: [0,1,2, 3,4,5, 6,7,8]
    switch (val) {
      case 1:
        return [4];
      case 2:
        return [2, 6];
      case 3:
        return [2, 4, 6];
      case 4:
        return [0, 2, 6, 8];
      case 5:
        return [0, 2, 4, 6, 8];
      case 6:
        return [0, 2, 3, 5, 6, 8];
      default:
        return [];
    }
  };

  const activePips = getPips(value);

  return (
    <div
      className={`${dim} rounded-md border-2 border-[#2b261f] flex flex-col items-center justify-center p-1 relative select-none shadow-xs transition-transform ${
        locked
          ? 'bg-[#ded4bf] text-[#2b261f]'
          : highlight
          ? 'bg-[#fef08a] ring-2 ring-[#2d6a4f] scale-105'
          : 'bg-[#fffdf8] text-[#2b261f]'
      }`}
    >
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-0.5 pointer-events-none">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {activePips.includes(i) && (
              <div className={`${pipDim} rounded-full bg-[#2b261f]`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const UtopiaEncounterModal: React.FC<UtopiaEncounterProps> = ({
  card,
  chamberCoord,
  energy,
  maxEnergy,
  onModifyEnergy,
  onCompleteEncounter,
  onDelveLost,
}) => {
  // --- Encounter State ---
  // Phase: 'grid' (rolling & placing pairs) | 'calculated' (difference revealed) | 'reward' | 'combat' | 'cleared'
  const [phase, setPhase] = useState<'grid' | 'calculated' | 'reward' | 'combat' | 'cleared'>('grid');

  // Grid Placement:
  // Slots 0,1,2 = Top Row (Hundreds, Tens, Ones)
  // Slots 3,4,5 = Bottom Row (Hundreds, Tens, Ones)
  const [cells, setCells] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [cellLocked, setCellLocked] = useState<boolean[]>([false, false, false, false, false, false]);

  // Current Round (1, 2, or 3)
  const [round, setRound] = useState<1 | 2 | 3>(1);
  const [currentPair, setCurrentPair] = useState<[number, number] | null>(null);
  // Which cell index each of the 2 current dice is placed in (-1 if still in hand)
  const [placedSlots, setPlacedSlots] = useState<[number, number]>([-1, -1]);
  // Currently selected die from the active pair (0 or 1)
  const [selectedDieIdx, setSelectedDieIdx] = useState<0 | 1>(0);

  // Subtraction & Difference
  const [topNumber, setTopNumber] = useState<number | null>(null);
  const [bottomNumber, setBottomNumber] = useState<number | null>(null);
  const [difference, setDifference] = useState<number | null>(null);

  // Outcome
  const [outcomeType, setOutcomeType] = useState<
    'great' | 'good' | 'ok' | 'monster_low' | 'monster_mid' | 'monster_high' | null
  >(null);

  // Reward Phase
  const [rewardRolled, setRewardRolled] = useState<boolean>(false);
  const [rewardDie, setRewardDie] = useState<number | null>(null);
  const [totalEnergyRestored, setTotalEnergyRestored] = useState<number>(0);

  // Combat Phase
  const [monster, setMonster] = useState<MonsterDef | null>(null);
  const [combatDice, setCombatDice] = useState<[number, number] | null>(null);
  const [combatRound, setCombatRound] = useState<number>(0);
  const [monsterDefeated, setMonsterDefeated] = useState<boolean>(false);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [isCombatRolling, setIsCombatRolling] = useState<boolean>(false);

  // Auto-roll the first pair on mount
  useEffect(() => {
    rollPairForRound(1);
  }, []);

  // Roll 2D6 for a round
  const rollPairForRound = (nextRound: 1 | 2 | 3) => {
    sounds.playDiceRoll();
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setCurrentPair([d1, d2]);
    setPlacedSlots([-1, -1]);
    setSelectedDieIdx(0);
    setRound(nextRound);
  };

  // Click on a die in the active hand to select it
  const handleSelectHandDie = (idx: 0 | 1) => {
    sounds.playClick();
    setSelectedDieIdx(idx);
  };

  // Click on a grid cell
  const handleCellClick = (cellIdx: number) => {
    // If cell is locked from previous rounds, it cannot be changed
    if (cellLocked[cellIdx]) return;

    // Check if this cell already has one of the CURRENT round's placed dice
    if (placedSlots[0] === cellIdx) {
      // Unplace die 0 back to hand
      sounds.playClick();
      setCells((prev) => {
        const next = [...prev];
        next[cellIdx] = null;
        return next;
      });
      setPlacedSlots((prev) => [-1, prev[1]]);
      setSelectedDieIdx(0);
      return;
    }

    if (placedSlots[1] === cellIdx) {
      // Unplace die 1 back to hand
      sounds.playClick();
      setCells((prev) => {
        const next = [...prev];
        next[cellIdx] = null;
        return next;
      });
      setPlacedSlots((prev) => [prev[0], -1]);
      setSelectedDieIdx(1);
      return;
    }

    // Cell is empty: place the currently selected die into it!
    if (!currentPair) return;

    const dieValue = currentPair[selectedDieIdx];
    sounds.playClick();

    setCells((prev) => {
      const next = [...prev];
      // If selectedDieIdx was previously placed in another cell, clear that old cell
      const oldSlot = placedSlots[selectedDieIdx];
      if (oldSlot !== -1) {
        next[oldSlot] = null;
      }
      next[cellIdx] = dieValue;
      return next;
    });

    setPlacedSlots((prev) => {
      const next: [number, number] = [...prev];
      next[selectedDieIdx] = cellIdx;
      return next;
    });

    // Auto-select the other unplaced die if available
    const otherIdx = selectedDieIdx === 0 ? 1 : 0;
    if (placedSlots[otherIdx] === -1) {
      setSelectedDieIdx(otherIdx);
    }
  };

  // Reset the current pair back to unplaced pool
  const handleClearCurrentPair = () => {
    sounds.playClick();
    setCells((prev) => {
      const next = [...prev];
      if (placedSlots[0] !== -1) next[placedSlots[0]] = null;
      if (placedSlots[1] !== -1) next[placedSlots[1]] = null;
      return next;
    });
    setPlacedSlots([-1, -1]);
    setSelectedDieIdx(0);
  };

  // Both dice from current pair placed: Lock and advance
  const canAdvancePair = placedSlots[0] !== -1 && placedSlots[1] !== -1;

  const handleLockAndAdvance = () => {
    if (!canAdvancePair) return;

    sounds.playClick();

    // Lock the two slots used this round
    const nextLocked = [...cellLocked];
    nextLocked[placedSlots[0]] = true;
    nextLocked[placedSlots[1]] = true;
    setCellLocked(nextLocked);

    if (round === 1) {
      rollPairForRound(2);
    } else if (round === 2) {
      rollPairForRound(3);
    } else {
      // Round 3 complete! Calculate difference
      calculateFinalDifference();
    }
  };

  // Calculate Subtraction & Difference
  const calculateFinalDifference = () => {
    // Top row: cells 0, 1, 2
    // Bottom row: cells 3, 4, 5
    const top = (cells[0] || 0) * 100 + (cells[1] || 0) * 10 + (cells[2] || 0);
    const bottom = (cells[3] || 0) * 100 + (cells[4] || 0) * 10 + (cells[5] || 0);
    const diff = top - bottom;

    setTopNumber(top);
    setBottomNumber(bottom);
    setDifference(diff);

    // Determine Outcome based on user rules:
    // Score of 0: great thing (D6 + 4 energy)
    // 1-10: good thing (D6 + 2 energy)
    // 11-99: OK thing (D6 energy)
    // 100-250 (or -1 to -250): Low level monster
    // 250-400 (or -250 to -400): Mid level monster
    // 400-555 (or -400 to -555): High level monster
    let outcome: 'great' | 'good' | 'ok' | 'monster_low' | 'monster_mid' | 'monster_high';

    if (diff === 0) {
      outcome = 'great';
    } else if (diff >= 1 && diff <= 10) {
      outcome = 'good';
    } else if (diff >= 11 && diff <= 99) {
      outcome = 'ok';
    } else if ((diff >= 100 && diff <= 250) || (diff <= -1 && diff >= -250)) {
      outcome = 'monster_low';
    } else if ((diff > 250 && diff <= 400) || (diff < -250 && diff >= -400)) {
      outcome = 'monster_mid';
    } else {
      outcome = 'monster_high';
    }

    setOutcomeType(outcome);
    setPhase('calculated');

    if (outcome === 'great' || outcome === 'good' || outcome === 'ok') {
      sounds.playBonus();
    } else {
      sounds.playHazard();
    }
  };

  // Transition from calculated screen to Reward or Combat
  const handleProceedFromCalculated = () => {
    if (!outcomeType) return;

    if (outcomeType === 'great' || outcomeType === 'good' || outcomeType === 'ok') {
      setPhase('reward');
    } else {
      const tier: MonsterTier =
        outcomeType === 'monster_low'
          ? 'low'
          : outcomeType === 'monster_mid'
          ? 'mid'
          : 'high';
      setMonster(MONSTER_TIERS[tier]);
      setPhase('combat');
      setCombatRound(0);
      setCombatLogs([`A ${MONSTER_TIERS[tier].name} attacks! Prepare for combat.`]);
    }
  };

  // Roll D6 Reward
  const handleRollReward = () => {
    sounds.playDiceRoll();
    const roll = Math.floor(Math.random() * 6) + 1;
    setRewardDie(roll);
    setRewardRolled(true);

    let bonus = 0;
    if (outcomeType === 'great') bonus = 4;
    else if (outcomeType === 'good') bonus = 2;

    const totalRestored = roll + bonus;
    setTotalEnergyRestored(totalRestored);

    sounds.playBonus();
    onModifyEnergy(totalRestored);
  };

  // Roll Combat Pair
  const handleRollCombat = () => {
    if (!monster || monsterDefeated || isCombatRolling) return;

    setIsCombatRolling(true);
    sounds.playDiceRoll();

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setCombatDice([d1, d2]);
      const nextRound = combatRound + 1;
      setCombatRound(nextRound);

      // Check damage:
      // Low: roll 1 (-1 energy)
      // Mid: roll 1, 2 (-1 energy)
      // High: roll 1, 2, 3 (-1 energy)
      let damageTaken = 0;
      if (monster.damageValues.includes(d1)) damageTaken += 1;
      if (monster.damageValues.includes(d2)) damageTaken += 1;

      // Check defeat:
      // Low: roll 4, 5, 6 defeats monster
      // Mid: roll 5, 6 defeats monster
      // High: roll 6 defeats monster
      const isDefeated = monster.defeatValues.includes(d1) || monster.defeatValues.includes(d2);

      let roundMsg = `Round ${nextRound}: Rolled [${d1}, ${d2}]. `;

      if (damageTaken > 0) {
        roundMsg += `Clawed for -${damageTaken} ⚡! `;
        onModifyEnergy(-damageTaken);
      } else {
        roundMsg += `Dodged harm! `;
      }

      const projectedEnergy = energy - damageTaken;

      if (projectedEnergy <= 0) {
        roundMsg += `Energy exhausted! Slain in the dark.`;
        setCombatLogs((prev) => [roundMsg, ...prev]);
        setIsCombatRolling(false);
        onDelveLost(`Defeated in battle against the ${monster.name}!`);
        return;
      }

      if (isDefeated) {
        sounds.playVictory();
        setMonsterDefeated(true);
        roundMsg += `Lethal blow! The ${monster.name} is defeated!`;
      } else {
        if (damageTaken > 0) {
          sounds.playHazard();
        } else {
          sounds.playClick();
        }
        roundMsg += `The beast is still aggressive! Roll again.`;
      }

      setCombatLogs((prev) => [roundMsg, ...prev]);
      setIsCombatRolling(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono text-[#2b261f] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-[#e8deca] border-b-2 border-[#2b261f] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base text-[#991b1b] font-black">♥</span>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-[#2b261f]">
                Chamber Encounter
              </span>
              <span className="text-[10px] text-[#5c5346]">
                {card.name}
              </span>
            </div>
          </div>
          {/* Live Energy Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#fdfbf7] rounded border border-[#2b261f]/40 text-xs font-bold">
            <span className="text-[#d97706]">⚡</span>
            <span>{energy}/{maxEnergy}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 flex flex-col gap-3">
          {/* Phase 1: Grid Placement */}
          {phase === 'grid' && (
            <>
              {/* Instructions */}
              <div className="bg-[#ede4d3] border border-[#2b261f]/30 rounded-lg p-2 text-xs leading-relaxed text-[#443d33]">
                <p className="font-bold text-[#2b261f]">
                  Roll 3 pairs of dice & place freely in the 3×2 grid.
                </p>
                <p className="text-[11px] text-[#5c5346] mt-0.5">
                  Locked once you advance to the next pair. Then subtract Bottom from Top!
                </p>
              </div>

              {/* 3x2 Alignment Grid */}
              <div className="bg-[#ede4d3]/70 border-2 border-[#2b261f] rounded-lg p-3 flex flex-col gap-2">
                {/* Column Headers */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-[#786e5e] uppercase tracking-wider">
                  <div>Hundreds (100)</div>
                  <div>Tens (10)</div>
                  <div>Ones (1)</div>
                </div>

                {/* Top Row: Slots 0, 1, 2 */}
                <div className="flex items-center gap-2">
                  <span className="w-5 text-right font-black text-xs text-[#2b261f]">Top</span>
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[0, 1, 2].map((idx) => {
                      const val = cells[idx];
                      const isLocked = cellLocked[idx];
                      const isCurrentPlacement = placedSlots[0] === idx || placedSlots[1] === idx;

                      return (
                        <div
                          key={`cell-${idx}`}
                          onClick={() => handleCellClick(idx)}
                          className={`h-14 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                            val !== null
                              ? isLocked
                                ? 'bg-[#ded4bf] border-[#2b261f]'
                                : 'bg-[#fffdf8] border-[#2d6a4f] ring-2 ring-[#2d6a4f]/30'
                              : 'border-dashed border-[#2b261f]/40 bg-[#fdfbf7]/60 hover:bg-[#fff9ed] hover:border-[#2b261f]'
                          }`}
                        >
                          {val !== null ? (
                            <DiePipFace
                              value={val}
                              size="md"
                              locked={isLocked}
                              highlight={isCurrentPlacement}
                            />
                          ) : (
                            <span className="text-[10px] text-[#8c8273] font-bold">Slot</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Minus Divider */}
                <div className="flex items-center gap-2 pl-3">
                  <span className="font-black text-sm text-[#b91c1c]">−</span>
                  <div className="flex-1 h-0.5 bg-[#2b261f]/20" />
                </div>

                {/* Bottom Row: Slots 3, 4, 5 */}
                <div className="flex items-center gap-2">
                  <span className="w-5 text-right font-black text-xs text-[#2b261f]">Btm</span>
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[3, 4, 5].map((idx) => {
                      const val = cells[idx];
                      const isLocked = cellLocked[idx];
                      const isCurrentPlacement = placedSlots[0] === idx || placedSlots[1] === idx;

                      return (
                        <div
                          key={`cell-${idx}`}
                          onClick={() => handleCellClick(idx)}
                          className={`h-14 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                            val !== null
                              ? isLocked
                                ? 'bg-[#ded4bf] border-[#2b261f]'
                                : 'bg-[#fffdf8] border-[#2d6a4f] ring-2 ring-[#2d6a4f]/30'
                              : 'border-dashed border-[#2b261f]/40 bg-[#fdfbf7]/60 hover:bg-[#fff9ed] hover:border-[#2b261f]'
                          }`}
                        >
                          {val !== null ? (
                            <DiePipFace
                              value={val}
                              size="md"
                              locked={isLocked}
                              highlight={isCurrentPlacement}
                            />
                          ) : (
                            <span className="text-[10px] text-[#8c8273] font-bold">Slot</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Pair Tray (Current Roll) */}
              <div className="bg-[#fdfbf7] border-2 border-[#2b261f] rounded-lg p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Pair Roll {round} of 3:</span>
                  <span className="text-[10px] text-[#786e5e] font-normal">
                    {canAdvancePair
                      ? 'Both dice placed! Ready to lock.'
                      : 'Tap an open grid slot to place'}
                  </span>
                </div>

                {currentPair && (
                  <div className="flex items-center justify-center gap-4 py-1">
                    {/* Die 0 */}
                    <div
                      onClick={() => handleSelectHandDie(0)}
                      className={`flex flex-col items-center gap-1 cursor-pointer p-1 rounded-md transition-all ${
                        selectedDieIdx === 0 && placedSlots[0] === -1
                          ? 'ring-2 ring-[#2d6a4f] bg-[#e8f5e9]'
                          : placedSlots[0] !== -1
                          ? 'opacity-40 line-through'
                          : 'hover:bg-[#f4edd9]'
                      }`}
                    >
                      <DiePipFace
                        value={currentPair[0]}
                        size="md"
                        highlight={selectedDieIdx === 0 && placedSlots[0] === -1}
                      />
                      <span className="text-[10px] font-bold text-[#5c5346]">
                        {placedSlots[0] !== -1 ? 'Placed' : selectedDieIdx === 0 ? 'Selected' : 'Die 1'}
                      </span>
                    </div>

                    {/* Die 1 */}
                    <div
                      onClick={() => handleSelectHandDie(1)}
                      className={`flex flex-col items-center gap-1 cursor-pointer p-1 rounded-md transition-all ${
                        selectedDieIdx === 1 && placedSlots[1] === -1
                          ? 'ring-2 ring-[#2d6a4f] bg-[#e8f5e9]'
                          : placedSlots[1] !== -1
                          ? 'opacity-40 line-through'
                          : 'hover:bg-[#f4edd9]'
                      }`}
                    >
                      <DiePipFace
                        value={currentPair[1]}
                        size="md"
                        highlight={selectedDieIdx === 1 && placedSlots[1] === -1}
                      />
                      <span className="text-[10px] font-bold text-[#5c5346]">
                        {placedSlots[1] !== -1 ? 'Placed' : selectedDieIdx === 1 ? 'Selected' : 'Die 2'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Placement Control Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {(placedSlots[0] !== -1 || placedSlots[1] !== -1) && (
                    <button
                      onClick={handleClearCurrentPair}
                      className="px-2.5 py-1.5 bg-[#e8deca] hover:bg-[#ded4bf] text-[#2b261f] border border-[#2b261f] rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Return current pair back to unplaced pool"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Pair</span>
                    </button>
                  )}

                  <button
                    disabled={!canAdvancePair}
                    onClick={handleLockAndAdvance}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 border-[#2b261f] font-mono font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      canAdvancePair
                        ? 'bg-[#2d6a4f] hover:bg-[#23533e] text-white active:translate-y-0.5'
                        : 'bg-[#ded4bf] text-[#8c8273] opacity-60 cursor-not-allowed border-[#8c8273]'
                    }`}
                  >
                    <span>
                      {round === 1
                        ? 'Lock Pair & Roll Pair 2'
                        : round === 2
                        ? 'Lock Pair & Roll Pair 3'
                        : 'Lock Final Pair & Calculate'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Phase 2: Calculated Screen */}
          {phase === 'calculated' && (
            <div className="flex flex-col gap-3 py-1">
              <div className="bg-[#ede4d3] border-2 border-[#2b261f] rounded-lg p-3 flex flex-col items-center gap-2">
                <span className="text-xs uppercase font-bold text-[#786e5e]">
                  Encounter Grid Subtraction
                </span>

                <div className="flex flex-col items-end font-mono text-base font-black text-[#2b261f] gap-0.5 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#5c5346] font-normal">Top Number:</span>
                    <span className="tracking-widest">{topNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#b91c1c] font-normal">− Bottom Number:</span>
                    <span className="tracking-widest">{bottomNumber}</span>
                  </div>
                  <div className="w-full h-0.5 bg-[#2b261f] my-1" />
                  <div className="flex items-center gap-3 text-lg">
                    <span className="text-xs text-[#2b261f] font-bold">Difference:</span>
                    <span
                      className={`tracking-widest ${
                        difference !== null && difference >= 0 && difference <= 99
                          ? 'text-[#1b4332]'
                          : 'text-[#991b1b]'
                      }`}
                    >
                      {difference !== null && difference > 0 ? `+${difference}` : difference}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outcome Banner */}
              <div
                className={`p-3 rounded-lg border-2 border-[#2b261f] flex flex-col gap-1 ${
                  outcomeType === 'great'
                    ? 'bg-[#fae19c]'
                    : outcomeType === 'good'
                    ? 'bg-[#dbe7d0]'
                    : outcomeType === 'ok'
                    ? 'bg-[#e0e7ff]'
                    : 'bg-[#fee2e2]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {outcomeType === 'great' ? (
                    <Sparkles className="w-5 h-5 text-[#b45309]" />
                  ) : outcomeType === 'good' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1b4332]" />
                  ) : outcomeType === 'ok' ? (
                    <Sparkles className="w-5 h-5 text-[#3730a3]" />
                  ) : (
                    <Skull className="w-5 h-5 text-[#991b1b]" />
                  )}
                  <span className="font-bold text-sm text-[#2b261f]">
                    {outcomeType === 'great' && 'Jackpot! Score 0 — High Level Reward'}
                    {outcomeType === 'good' && `Good Fortune! Score ${difference} — Mid Level Reward`}
                    {outcomeType === 'ok' && `Chamber Harmonized! Score ${difference} — OK Reward`}
                    {outcomeType === 'monster_low' &&
                      `Monster Awakened! Score ${difference} — Low Threat Monster`}
                    {outcomeType === 'monster_mid' &&
                      `Beast Lurking! Score ${difference} — Medium Threat Monster`}
                    {outcomeType === 'monster_high' &&
                      `Deadly Fiend! Score ${difference} — High Threat Monster`}
                  </span>
                </div>

                <p className="text-xs text-[#5c5346] pl-7">
                  {outcomeType === 'great' && 'Roll D6 + 4 bonus Energy for your expedition!'}
                  {outcomeType === 'good' && 'Roll D6 + 2 bonus Energy for your expedition!'}
                  {outcomeType === 'ok' && 'Roll D6 bonus Energy for your expedition!'}
                  {outcomeType === 'monster_low' &&
                    'Cave Troglodyte: Defeat with 4, 5, 6 | Lose 1⚡ on roll of 1.'}
                  {outcomeType === 'monster_mid' &&
                    'Iron-Borer Basilisk: Defeat with 5, 6 | Lose 1⚡ on roll of 1 or 2.'}
                  {outcomeType === 'monster_high' &&
                    'Obsidian Golem: Defeat with 6 | Lose 1⚡ on roll of 1, 2, or 3.'}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleProceedFromCalculated}
                className="w-full py-2.5 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
              >
                <span>
                  {outcomeType === 'great' || outcomeType === 'good' || outcomeType === 'ok'
                    ? 'Claim Chamber Reward'
                    : 'Engage Monster in Combat'}
                </span>
              </button>
            </div>
          )}

          {/* Phase 3: Reward Phase */}
          {phase === 'reward' && (
            <div className="flex flex-col gap-3 py-1 items-center text-center">
              <div className="bg-[#ede4d3] border-2 border-[#2b261f] rounded-lg p-3 w-full flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-[#5c5346] uppercase">
                  {outcomeType === 'great'
                    ? 'High Level Reward: Roll D6 + 4 ⚡'
                    : outcomeType === 'good'
                    ? 'Mid Level Reward: Roll D6 + 2 ⚡'
                    : 'OK Reward: Roll D6 ⚡'}
                </span>

                {rewardRolled && rewardDie !== null ? (
                  <div className="flex flex-col items-center gap-2 my-1">
                    <DiePipFace value={rewardDie} size="lg" />
                    <div className="text-sm font-black text-[#1b4332]">
                      Rolled {rewardDie}
                      {outcomeType === 'great' ? ' + 4' : outcomeType === 'good' ? ' + 2' : ''} = +
                      {totalEnergyRestored} Energy Restored!
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-xs text-[#786e5e]">
                    Roll the Fate die to restore your expedition energy reserves.
                  </div>
                )}
              </div>

              {!rewardRolled ? (
                <button
                  onClick={handleRollReward}
                  className="w-full py-2.5 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Roll Reward D6</span>
                </button>
              ) : (
                <button
                  onClick={onCompleteEncounter}
                  className="w-full py-2.5 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Carve Corridor Exits & Continue</span>
                </button>
              )}
            </div>
          )}

          {/* Phase 4: Combat Phase */}
          {phase === 'combat' && monster && (
            <div className="flex flex-col gap-3">
              {/* Monster Profile Card */}
              <div className="bg-[#ede4d3] border-2 border-[#2b261f] rounded-lg p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#991b1b] flex items-center gap-1.5">
                    <Swords className="w-4 h-4" />
                    <span>{monster.name}</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#fdfbf7] border border-[#2b261f]/40">
                    {monster.title}
                  </span>
                </div>
                <p className="text-[11px] text-[#5c5346] leading-snug">{monster.description}</p>

                {/* Rules Banner */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-bold">
                  <div className="bg-[#dbe7d0] border border-[#2b261f]/30 rounded p-1 text-center text-[#1b4332]">
                    Defeat: Roll {monster.defeatValues.join(', ')}
                  </div>
                  <div className="bg-[#fee2e2] border border-[#2b261f]/30 rounded p-1 text-center text-[#991b1b]">
                    Damage (-1⚡): Roll {monster.damageValues.join(', ')}
                  </div>
                </div>
              </div>

              {/* Combat Dice Rolled */}
              {combatDice && (
                <div className="flex flex-col items-center gap-1 bg-[#fdfbf7] border border-[#2b261f]/30 rounded-lg p-2">
                  <span className="text-[10px] text-[#786e5e] font-bold uppercase">
                    Round {combatRound} Roll:
                  </span>
                  <div className="flex items-center gap-3">
                    <DiePipFace value={combatDice[0]} size="md" />
                    <DiePipFace value={combatDice[1]} size="md" />
                  </div>
                </div>
              )}

              {/* Combat Log */}
              <div className="bg-[#fdfbf7] border border-[#2b261f]/40 rounded-lg p-2 h-20 overflow-y-auto text-[11px] flex flex-col gap-1">
                {combatLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`leading-tight ${
                      log.includes('defeated')
                        ? 'text-[#1b4332] font-bold'
                        : log.includes('Clawed')
                        ? 'text-[#991b1b] font-bold'
                        : 'text-[#5c5346]'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {monsterDefeated ? (
                <button
                  onClick={onCompleteEncounter}
                  className="w-full py-2.5 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Carve Corridor Exits & Continue</span>
                </button>
              ) : (
                <button
                  disabled={isCombatRolling || energy <= 0}
                  onClick={handleRollCombat}
                  className="w-full py-2.5 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5 disabled:opacity-50"
                >
                  <Swords className="w-4 h-4" />
                  <span>Roll Combat Pair (2D6)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
