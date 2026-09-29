import React, { useState } from 'react';
import {
  FlowerTile,
  MonsterDef,
  LEVEL3_MONSTERS,
  getSpawnedMonsterLevel,
} from '../utils/level3Engine';
import { ExplorationCard } from '../utils/explorationDeck';
import { sounds } from '../utils/sound';
import { DiePipFace } from './UtopiaEncounterModal';
import { ShieldAlert, Sparkles, Swords, Skull, Trophy, KeyRound, AlertTriangle } from 'lucide-react';

interface Level3EncounterModalProps {
  tile: FlowerTile;
  energy: number;
  maxEnergy: number;
  outerCodeFragments: number;
  innerCodeFragments: number;
  playerHand?: ExplorationCard[];
  onConsumeHandCards?: (consumedCardIds: string[]) => void;
  onModifyEnergy: (delta: number) => void;
  onOuterDoorResult: (success: 'master' | 'code' | 'fail') => void;
  onInnerDoorResult: (success: 'master' | 'code' | 'fail') => void;
  onTrapDisarmed: (permanent: boolean) => void;
  onTreasureClaimed: () => void;
  onBossDefeated: () => void;
  onGameOver: (reason: string) => void;
  onClose: () => void;
}

export const Level3EncounterModal: React.FC<Level3EncounterModalProps> = ({
  tile,
  energy,
  maxEnergy,
  outerCodeFragments,
  innerCodeFragments,
  playerHand = [],
  onConsumeHandCards,
  onModifyEnergy,
  onOuterDoorResult,
  onInnerDoorResult,
  onTrapDisarmed,
  onTreasureClaimed,
  onBossDefeated,
  onGameOver,
  onClose,
}) => {
  // If center boss, start directly in combat phase!
  const isDirectBoss = tile.type === 'center_boss';

  const [phase, setPhase] = useState<'grid' | 'calculated' | 'reward' | 'combat' | 'cleared'>(
    isDirectBoss ? 'combat' : 'grid'
  );

  // Utopia Engine Grid (Slots 0,1,2 = Top Row, Slots 3,4,5 = Bottom Row)
  const [cells, setCells] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [cellLocked, setCellLocked] = useState<boolean[]>([false, false, false, false, false, false]);
  const [round, setRound] = useState<1 | 2 | 3>(1);
  const [currentPair, setCurrentPair] = useState<[number, number] | null>(null);
  const [placedSlots, setPlacedSlots] = useState<[number, number]>([-1, -1]);
  const [selectedDieIdx, setSelectedDieIdx] = useState<0 | 1>(0);

  // Calculation Results
  const [topNumber, setTopNumber] = useState<number | null>(null);
  const [bottomNumber, setBottomNumber] = useState<number | null>(null);
  const [difference, setDifference] = useState<number | null>(null);

  // Hand card reduction selection
  const [selectedHandCardIds, setSelectedHandCardIds] = useState<string[]>([]);

  // Calculate card reductions
  const selectedCards = playerHand.filter((c) => selectedHandCardIds.includes(c.id));
  const totalCardReduction = selectedCards.reduce((sum, c) => sum + c.value, 0);

  const baseDiff = difference ?? 0;
  let effectiveDifference = baseDiff;
  if (baseDiff > 0) {
    effectiveDifference = Math.max(0, baseDiff - totalCardReduction);
  } else if (baseDiff < 0) {
    effectiveDifference = Math.min(0, baseDiff + totalCardReduction);
  }

  const toggleSelectCard = (id: string) => {
    sounds.playClick();
    setSelectedHandCardIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  // Combat State
  const [monster, setMonster] = useState<MonsterDef | null>(() => {
    if (isDirectBoss) return LEVEL3_MONSTERS[5];
    return null;
  });
  const [monsterHp, setMonsterHp] = useState<number>(() => {
    if (isDirectBoss) return LEVEL3_MONSTERS[5].maxHp;
    return 1;
  });
  const [combatDice, setCombatDice] = useState<[number, number] | null>(null);
  const [isCombatRolling, setIsCombatRolling] = useState<boolean>(false);
  const [combatLogs, setCombatLogs] = useState<string[]>(() => {
    if (isDirectBoss) return ['The Utopia Engine Core Construct awakens! Engage in battle to save Utopia!'];
    return [];
  });
  const [combatRound, setCombatRound] = useState<number>(0);
  const [monsterDefeated, setMonsterDefeated] = useState<boolean>(false);

  // Roll the dice pair for the current round
  const handleRollRoundDice = () => {
    sounds.playDiceRoll();
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setCurrentPair([d1, d2]);
    setPlacedSlots([-1, -1]);
    setSelectedDieIdx(0);
  };

  // Place selected die into an unlocked cell slot
  const handleSlotClick = (slotIndex: number) => {
    if (!currentPair || cellLocked[slotIndex]) return;

    sounds.playClick();
    const activeDieVal = currentPair[selectedDieIdx];
    const prevOccupantSlot = placedSlots[selectedDieIdx];

    const nextCells = [...cells];
    if (prevOccupantSlot !== -1) {
      nextCells[prevOccupantSlot] = null;
    }
    nextCells[slotIndex] = activeDieVal;

    const nextPlaced: [number, number] = [...placedSlots];
    if (nextPlaced[1 - selectedDieIdx] === slotIndex) {
      nextPlaced[1 - selectedDieIdx] = -1;
    }
    nextPlaced[selectedDieIdx] = slotIndex;

    setCells(nextCells);
    setPlacedSlots(nextPlaced);

    if (nextPlaced[1 - selectedDieIdx] === -1) {
      setSelectedDieIdx((1 - selectedDieIdx) as 0 | 1);
    }
  };

  // Confirm round placement (locks 2 slots and advances)
  const handleConfirmRound = () => {
    if (placedSlots[0] === -1 || placedSlots[1] === -1) return;

    sounds.playBonus();
    const nextLocked = [...cellLocked];
    nextLocked[placedSlots[0]] = true;
    nextLocked[placedSlots[1]] = true;
    setCellLocked(nextLocked);

    if (round < 3) {
      setRound((prev) => (prev + 1) as 2 | 3);
      setCurrentPair(null);
      setPlacedSlots([-1, -1]);
    } else {
      // All 3 rounds placed! Calculate Top - Bottom
      const topStr = `${cells[0]}${cells[1]}${cells[2]}`;
      const bottomStr = `${cells[3]}${cells[4]}${cells[5]}`;
      const topVal = parseInt(topStr, 10);
      const bottomVal = parseInt(bottomStr, 10);
      const diffVal = topVal - bottomVal;

      setTopNumber(topVal);
      setBottomNumber(bottomVal);
      setDifference(diffVal);
      setPhase('calculated');
      setCurrentPair(null);
    }
  };

  // Helper to preview what difference yields for the current tile
  const getOutcomePreview = (diff: number): { label: string; type: 'success' | 'code' | 'refund' | 'fail' | 'monster'; monsterLevel?: number } => {
    if (tile.type === 'outer_door') {
      if (diff === 0) return { label: 'Master Unlock (Score 0): Opens all 4 outer portal doors!', type: 'success' };
      if (diff >= 1 && diff <= 10) return { label: `Code Fragment (${diff}): 1 part of 3 acquired!`, type: 'code' };
      return { label: `Test Failed (${diff}): Must seek remaining portal doors.`, type: 'fail' };
    }
    if (tile.type === 'inner_door') {
      if (diff === 0) return { label: 'Master Unlock (Score 0): Opens the Core Gate to the Boss!', type: 'success' };
      if (diff >= 1 && diff <= 10) return { label: `Inner Code (${diff}): 1 of 2 required inner codes acquired!`, type: 'code' };
      return { label: `Decryption Failed (${diff}): Must test remaining gate or roll 0.`, type: 'fail' };
    }
    if (tile.type === 'trap') {
      if (diff === 0) return { label: 'Permanently Dismantled (Score 0): Converts room to safe corridor!', type: 'success' };
      if (diff >= 1 && diff <= 10) return { label: `Disarmed Once (${diff}): Safe for current traversal!`, type: 'code' };
      if (diff >= 11 && diff <= 99) return { label: `Mechanisms Dampened (${diff}): Energy cost refunded (+1⚡)!`, type: 'refund' };
      const mLvl = getSpawnedMonsterLevel(diff, tile.ring);
      const mDef = LEVEL3_MONSTERS[mLvl];
      return { label: `Trap Sprung (${diff})! Awakens ${mDef.name} (${mDef.maxHp} HP)!`, type: 'monster', monsterLevel: mLvl };
    }
    if (tile.type === 'treasure') {
      if (diff === 0) return { label: 'Full Resonation (Score 0): Restores Energy completely to 30⚡!', type: 'success' };
      if (diff >= 1 && diff <= 10) return { label: `Major Mana Extraction (${diff}): Grants +10⚡ Energy!`, type: 'success' };
      if (diff >= 11 && diff <= 99) return { label: `Minor Mana Extraction (${diff}): Grants +5⚡ Energy!`, type: 'refund' };
      const mLvl = getSpawnedMonsterLevel(diff, tile.ring);
      const mDef = LEVEL3_MONSTERS[mLvl];
      return { label: `Ambush (${diff})! Awakens ${mDef.name} (${mDef.maxHp} HP)!`, type: 'monster', monsterLevel: mLvl };
    }
    return { label: `Difference: ${diff}`, type: 'code' };
  };

  // Resolve calculated outcome based on tile type and ring
  const handleResolveOutcome = () => {
    if (difference === null) return;

    // Consume spent hand cards
    if (selectedHandCardIds.length > 0 && onConsumeHandCards) {
      onConsumeHandCards(selectedHandCardIds);
      setSelectedHandCardIds([]);
    }

    const finalScore = effectiveDifference;

    if (tile.type === 'outer_door') {
      if (finalScore === 0) {
        sounds.playVictory();
        onOuterDoorResult('master');
        setPhase('cleared');
      } else if (finalScore >= 1 && finalScore <= 10) {
        sounds.playBonus();
        onOuterDoorResult('code');
        setPhase('cleared');
      } else {
        sounds.playHazard();
        onOuterDoorResult('fail');
        setPhase('cleared');
      }
      return;
    }

    if (tile.type === 'inner_door') {
      if (finalScore === 0) {
        sounds.playVictory();
        onInnerDoorResult('master');
        setPhase('cleared');
      } else if (finalScore >= 1 && finalScore <= 10) {
        sounds.playBonus();
        onInnerDoorResult('code');
        setPhase('cleared');
      } else {
        sounds.playHazard();
        onInnerDoorResult('fail');
        setPhase('cleared');
      }
      return;
    }

    if (tile.type === 'trap') {
      if (finalScore === 0) {
        sounds.playVictory();
        onTrapDisarmed(true); // permanently disarmed
        setPhase('cleared');
      } else if (finalScore >= 1 && finalScore <= 10) {
        sounds.playBonus();
        onTrapDisarmed(false); // disarmed once
        setPhase('cleared');
      } else if (finalScore >= 11 && finalScore <= 99) {
        sounds.playBonus();
        onModifyEnergy(1); // refund 1 energy cost back
        setPhase('cleared');
      } else {
        // Monster spawned!
        sounds.playHazard();
        const monsterLevel = getSpawnedMonsterLevel(finalScore, tile.ring);
        const spawned = LEVEL3_MONSTERS[monsterLevel];
        setMonster(spawned);
        setMonsterHp(spawned.maxHp);
        setCombatLogs([
          `Trap triggered! Score ${finalScore}${totalCardReduction > 0 ? ` (reduced by -${totalCardReduction} from ${baseDiff} via cards)` : ''} awakened ${spawned.name}! (HP: ${spawned.maxHp}, ${spawned.description})`,
        ]);
        setPhase('combat');
      }
      return;
    }

    if (tile.type === 'treasure') {
      if (finalScore === 0) {
        sounds.playVictory();
        onModifyEnergy(maxEnergy - energy); // Full restore to 30!
        onTreasureClaimed();
        setPhase('cleared');
      } else if (finalScore >= 1 && finalScore <= 10) {
        sounds.playBonus();
        onModifyEnergy(10);
        onTreasureClaimed();
        setPhase('cleared');
      } else if (finalScore >= 11 && finalScore <= 99) {
        sounds.playBonus();
        onModifyEnergy(5);
        onTreasureClaimed();
        setPhase('cleared');
      } else {
        // Monster ambushed!
        sounds.playHazard();
        const monsterLevel = getSpawnedMonsterLevel(finalScore, tile.ring);
        const spawned = LEVEL3_MONSTERS[monsterLevel];
        setMonster(spawned);
        setMonsterHp(spawned.maxHp);
        setCombatLogs([
          `Ambush! Score ${finalScore}${totalCardReduction > 0 ? ` (reduced by -${totalCardReduction} from ${baseDiff} via cards)` : ''} awakened ${spawned.name}! (HP: ${spawned.maxHp}, ${spawned.description})`,
        ]);
        setPhase('combat');
      }
      return;
    }
  };

  // Roll 2D6 Combat
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

      // Check damage to player (-1 energy per match)
      let damageToPlayer = 0;
      if (monster.playerDamageValues.includes(d1)) damageToPlayer += 1;
      if (monster.playerDamageValues.includes(d2)) damageToPlayer += 1;

      // Check damage to monster
      let damageToMonster = 0;
      if (monster.monsterDamageValues.includes(d1)) damageToMonster += 1;
      if (monster.monsterDamageValues.includes(d2)) damageToMonster += 1;

      let roundMsg = `Round ${nextRound}: Rolled [${d1}, ${d2}]. `;

      if (damageToPlayer > 0) {
        roundMsg += `Took -${damageToPlayer} ⚡ harm! `;
        onModifyEnergy(-damageToPlayer);
      } else {
        roundMsg += `Evaded harm! `;
      }

      if (damageToMonster > 0) {
        roundMsg += `Dealt ${damageToMonster} damage to monster! `;
      }

      const nextMonsterHp = Math.max(0, monsterHp - damageToMonster);
      setMonsterHp(nextMonsterHp);

      const projectedEnergy = energy - damageToPlayer;
      if (projectedEnergy <= 0) {
        roundMsg += 'Energy exhausted! Slain in combat.';
        setCombatLogs((prev) => [roundMsg, ...prev]);
        setIsCombatRolling(false);
        onGameOver(`Defeated by ${monster.name}!`);
        return;
      }

      if (nextMonsterHp <= 0) {
        sounds.playVictory();
        setMonsterDefeated(true);
        roundMsg += `The ${monster.name} is vanquished!`;
        if (monster.level === 5) {
          onBossDefeated();
        } else if (tile.type === 'treasure') {
          onTreasureClaimed();
        } else if (tile.type === 'trap') {
          onTrapDisarmed(false);
        }
      } else {
        if (damageToPlayer > 0) sounds.playHazard();
        else sounds.playClick();
      }

      setCombatLogs((prev) => [roundMsg, ...prev]);
      setIsCombatRolling(false);
    }, 400);
  };

  const absDiff = difference !== null ? Math.abs(difference) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl p-4 flex flex-col gap-3 font-mono text-[#2b261f] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2b261f]/20 pb-2">
          <div className="flex items-center gap-2">
            {tile.type === 'outer_door' && <KeyRound className="w-5 h-5 text-amber-700" />}
            {tile.type === 'inner_door' && <KeyRound className="w-5 h-5 text-amber-900" />}
            {tile.type === 'trap' && <ShieldAlert className="w-5 h-5 text-red-700" />}
            {tile.type === 'treasure' && <Sparkles className="w-5 h-5 text-amber-600" />}
            {tile.type === 'center_boss' && <Skull className="w-5 h-5 text-red-800" />}
            <div>
              <h3 className="font-black text-sm text-[#2b261f] leading-tight">{tile.title}</h3>
              <span className="text-[10px] text-[#786e5e] uppercase tracking-wider font-bold">
                {tile.ring.toUpperCase()} RING — {tile.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          <span className="text-xs font-black bg-[#e8deca] px-2 py-0.5 rounded border border-[#2b261f]/30">
            {energy}⚡
          </span>
        </div>

        {/* Phase 1 & 2: Utopia Engine Dice Grid & Calculation */}
        {phase !== 'combat' && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-[#5c5346] leading-tight bg-[#ede4d3] p-2 rounded border border-[#2b261f]/20">
              {tile.type === 'outer_door' && (
                <>
                  <span className="font-bold block text-[#2b261f] mb-0.5">Outer Portal Test:</span>
                  Roll 3 pairs of dice. Place into Top & Bottom rows. Difference determines code fragment (1–10) or instant Master Unlock (0)! Need 3 fragments to unlock inner ring.
                </>
              )}
              {tile.type === 'inner_door' && (
                <>
                  <span className="font-bold block text-[#2b261f] mb-0.5">Inner Gate Decryption:</span>
                  Difference determines inner code (1–10) or instant Master Unlock (0)! Need 2 codes to open the way to the Core.
                </>
              )}
              {tile.type === 'trap' && (
                <>
                  <span className="font-bold block text-[#2b261f] mb-0.5">Trap Disarm Mechanism:</span>
                  Score 0 = Disarmed permanently. 1–10 = Disarmed once. 11–99 = +1⚡ refund. Higher differences awaken subterranean beasts!
                </>
              )}
              {tile.type === 'treasure' && (
                <>
                  <span className="font-bold block text-[#2b261f] mb-0.5">Mana Vault Alignment:</span>
                  Score 0 = Full 30⚡ restore! 1–10 = +10⚡. 11–99 = +5⚡. Misalignments awaken guardians!
                </>
              )}
            </p>

            {/* Dice Placement Grid */}
            <div className="flex flex-col items-center gap-2 bg-[#ded4bf] p-3 rounded-lg border-2 border-[#2b261f]/30 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-[#786e5e] tracking-wider">
                {phase === 'grid' ? `Round ${round} of 3 — Place Dice` : 'Calculation Complete'}
              </span>

              {/* Top Row (Hundreds, Tens, Ones) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black w-4 text-center text-[#2b261f]">+</span>
                {[0, 1, 2].map((slotIdx) => (
                  <button
                    key={`slot-${slotIdx}`}
                    onClick={() => handleSlotClick(slotIdx)}
                    disabled={phase !== 'grid' || cellLocked[slotIdx]}
                    className={`w-12 h-12 rounded-lg border-2 border-[#2b261f] flex items-center justify-center font-black text-lg transition-transform ${
                      cells[slotIdx] !== null
                        ? 'bg-[#fffdf8] text-[#2b261f] shadow-xs'
                        : 'bg-[#ede4d3] border-dashed border-[#2b261f]/50'
                    } ${cellLocked[slotIdx] ? 'opacity-85' : 'hover:scale-105 cursor-pointer'}`}
                  >
                    {cells[slotIdx] !== null ? cells[slotIdx] : ''}
                  </button>
                ))}
              </div>

              {/* Bottom Row */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black w-4 text-center text-[#b91c1c]">-</span>
                {[3, 4, 5].map((slotIdx) => (
                  <button
                    key={`slot-${slotIdx}`}
                    onClick={() => handleSlotClick(slotIdx)}
                    disabled={phase !== 'grid' || cellLocked[slotIdx]}
                    className={`w-12 h-12 rounded-lg border-2 border-[#2b261f] flex items-center justify-center font-black text-lg transition-transform ${
                      cells[slotIdx] !== null
                        ? 'bg-[#fffdf8] text-[#2b261f] shadow-xs'
                        : 'bg-[#ede4d3] border-dashed border-[#2b261f]/50'
                    } ${cellLocked[slotIdx] ? 'opacity-85' : 'hover:scale-105 cursor-pointer'}`}
                  >
                    {cells[slotIdx] !== null ? cells[slotIdx] : ''}
                  </button>
                ))}
              </div>

              {/* Math Result Row */}
              {phase === 'calculated' && difference !== null && (
                <div className="w-full mt-2 pt-2 border-t-2 border-[#2b261f]/20 flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-3 text-sm font-black">
                    <span>{topNumber}</span>
                    <span>-</span>
                    <span>{bottomNumber}</span>
                    <span>=</span>
                    <span className="text-base text-[#b91c1c] bg-[#fae19c] px-2 py-0.5 rounded border border-[#b45309]">
                      {difference}
                    </span>
                  </div>

                  {/* Banked Hand Cards Score Reduction Section */}
                  <div className="w-full bg-[#fdfbf7] p-2.5 rounded-lg border border-[#2b261f]/25 flex flex-col gap-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-[#2b261f] flex items-center gap-1.5">
                        <span>🎒</span>
                        <span>Banked Hand from Level 2</span>
                        {playerHand.length > 0 && (
                          <span className="text-[10px] bg-[#e8deca] text-[#5c5244] px-1.5 py-0.2 rounded font-mono font-bold">
                            {playerHand.length} card{playerHand.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                      {selectedHandCardIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedHandCardIds([])}
                          className="text-[10px] text-amber-900 underline hover:text-amber-700 cursor-pointer font-bold"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {playerHand.length === 0 ? (
                      <p className="text-[10px] text-[#786e5e] italic text-center py-1">
                        No banked cards in hand. (Bank cards in Level 2 during J, Q, K, A draws to reduce dice scores here!)
                      </p>
                    ) : (
                      <>
                        <p className="text-[10px] text-[#5c5346] leading-tight">
                          Click individual card(s) to spend their values and reduce your Utopia Engine dice score towards 0:
                        </p>

                        <div className="flex flex-wrap gap-1.5 justify-center py-1">
                          {playerHand.map((card) => {
                            const isSelected = selectedHandCardIds.includes(card.id);
                            const isRed = card.suit === '♦';

                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => toggleSelectCard(card.id)}
                                className={`px-2 py-1.5 rounded-lg border-2 font-mono flex flex-col items-center gap-0.5 cursor-pointer transition-all select-none shadow-xs ${
                                  isSelected
                                    ? 'bg-[#dcfce7] border-[#16a34a] ring-2 ring-[#16a34a] scale-105'
                                    : 'bg-white hover:bg-[#fff9ed] border-[#2b261f]/30'
                                }`}
                              >
                                <div className={`text-xs font-black leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                                  {card.rank}{card.suit}
                                </div>
                                <div className="text-[9px] font-bold text-[#5c5244]">
                                  -{card.value}
                                </div>
                                {isSelected && (
                                  <span className="text-[8px] font-black bg-[#16a34a] text-white px-1 rounded leading-tight">
                                    SPEND
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {selectedHandCardIds.length > 0 && (
                          <div className="bg-[#ede4d3] p-1.5 rounded text-[11px] font-mono flex items-center justify-between border border-[#2b261f]/20">
                            <span className="text-[#5c5244]">
                              Cards Selected ({selectedHandCardIds.length}):
                            </span>
                            <span className="font-black text-[#15803d]">
                              -{totalCardReduction} pts (Score: {baseDiff} → {effectiveDifference})
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Outcome Preview Badge */}
                  {(() => {
                    const preview = getOutcomePreview(effectiveDifference);
                    let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                    if (preview.type === 'success') badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
                    else if (preview.type === 'code' || preview.type === 'refund') badgeClass = 'bg-blue-100 text-blue-900 border-blue-300';
                    else if (preview.type === 'fail' || preview.type === 'monster') badgeClass = 'bg-red-100 text-red-900 border-red-400 font-bold';

                    return (
                      <div className={`w-full text-center text-[10.5px] p-2 rounded border ${badgeClass} leading-tight`}>
                        <div className="font-mono text-xs mb-0.5">
                          Effective Score: <span className="font-black text-sm">{effectiveDifference}</span>
                          {totalCardReduction > 0 && (
                            <span className="ml-1 text-[10px] opacity-80">(Original: {baseDiff}, -{totalCardReduction} cards)</span>
                          )}
                        </div>
                        <div>{preview.label}</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Active Dice Tray (When placing round dice) */}
            {phase === 'grid' && (
              <div className="flex flex-col items-center gap-2">
                {!currentPair ? (
                  <button
                    onClick={handleRollRoundDice}
                    className="w-full py-2.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-0.5"
                  >
                    🎲 Roll Round {round} Dice
                  </button>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2">
                    <span className="text-[10px] text-[#786e5e] font-bold">
                      Select die to place into an open slot:
                    </span>
                    <div className="flex items-center gap-4">
                      {currentPair.map((val, idx) => (
                        <div
                          key={`die-${idx}`}
                          onClick={() => setSelectedDieIdx(idx as 0 | 1)}
                          className={`cursor-pointer transition-transform ${
                            selectedDieIdx === idx ? 'scale-110' : 'opacity-80'
                          }`}
                        >
                          <DiePipFace
                            value={val}
                            size="md"
                            highlight={selectedDieIdx === idx}
                            locked={placedSlots[idx] !== -1}
                          />
                        </div>
                      ))}
                    </div>
                    {placedSlots[0] !== -1 && placedSlots[1] !== -1 && (
                      <button
                        onClick={handleConfirmRound}
                        className="w-full mt-1 py-2 bg-[#b45309] hover:bg-[#92400e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer"
                      >
                        ✓ Lock Round {round} Placement
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Calculated Outcome Button */}
            {phase === 'calculated' && (
              <button
                onClick={handleResolveOutcome}
                className="w-full py-2.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-0.5"
              >
                {selectedHandCardIds.length > 0
                  ? `Spend ${selectedHandCardIds.length} Card${selectedHandCardIds.length > 1 ? 's' : ''} & Resolve (Score: ${effectiveDifference})`
                  : `Resolve Chamber Event (Score: ${effectiveDifference})`}
              </button>
            )}

            {/* Cleared Success State */}
            {phase === 'cleared' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded border border-emerald-300 w-full text-center">
                  Room event resolved! Proceed deeper into the flower machine.
                </span>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-[#2b261f] hover:bg-[#3d362d] text-white rounded-lg font-bold text-xs uppercase tracking-wider border-2 border-[#2b261f] cursor-pointer"
                >
                  Continue Exploration
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 3: Monster Combat Arena */}
        {phase === 'combat' && monster && (
          <div className="flex flex-col gap-3">
            {/* Monster Card */}
            <div className="bg-[#fee2e2] border-2 border-[#ef4444] rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-[#991b1b]">{monster.name}</h4>
                  <span className="text-[10px] text-[#7f1d1d] font-bold">{monster.title}</span>
                </div>
                {/* Monster HP Hearts */}
                <div className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded border border-[#ef4444]/40">
                  <span className="text-[10px] font-bold text-[#991b1b] mr-1">HP:</span>
                  {Array.from({ length: monster.maxHp }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-xs ${i < monsterHp ? 'text-red-600' : 'text-gray-300'}`}
                    >
                      ♥
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#7f1d1d] leading-snug">{monster.description}</p>

              {/* Combat Rules Matrix */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold pt-1 border-t border-[#ef4444]/30">
                <div className="bg-white/60 p-1 rounded text-emerald-900 border border-emerald-400">
                  Damages Monster: Roll {monster.monsterDamageValues.join(', ')}
                </div>
                <div className="bg-white/60 p-1 rounded text-red-900 border border-red-400">
                  Deals Harm (-1⚡): Roll {monster.playerDamageValues.join(', ')}
                </div>
              </div>
            </div>

            {/* Combat Dice Rolled */}
            {combatDice && (
              <div className="flex items-center justify-center gap-4 py-1">
                <DiePipFace value={combatDice[0]} size="md" />
                <DiePipFace value={combatDice[1]} size="md" />
              </div>
            )}

            {/* Combat Logs */}
            <div className="h-16 overflow-y-auto bg-[#ede4d3] p-2 rounded border border-[#2b261f]/20 text-[10px] leading-tight flex flex-col gap-1">
              {combatLogs.map((log, i) => (
                <span key={i} className="text-[#3b342a]">
                  {log}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            {!monsterDefeated ? (
              <button
                onClick={handleRollCombat}
                disabled={isCombatRolling}
                className="w-full py-2.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                <span>Roll Combat Dice (2d6)</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded border border-emerald-300 text-center">
                  🏆 Victory! The {monster.name} has been defeated!
                </span>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] cursor-pointer"
                >
                  Continue Delve
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
