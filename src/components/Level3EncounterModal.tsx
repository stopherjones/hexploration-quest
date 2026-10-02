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
import { TarotModifierArt } from './TarotModifierArt';
import { ShieldAlert, Sparkles, Swords, Skull, Trophy, KeyRound, AlertTriangle, RotateCcw, Zap } from 'lucide-react';

interface Level3EncounterModalProps {
  tile: FlowerTile;
  energy: number;
  maxEnergy: number;
  outerDoorsUnlocked?: boolean;
  innerDoorsUnlocked?: boolean;
  outerCodeFragments?: number;
  innerCodeFragments?: number;
  playerHand?: ExplorationCard[];
  onConsumeHandCards?: (consumedCardIds: string[]) => void;
  onModifyEnergy: (delta: number) => void;
  onOuterDoorResult: (success: 'unlocked' | 'fail') => void;
  onInnerDoorResult: (success: 'unlocked' | 'fail') => void;
  onTrapDisarmed: (permanent: boolean) => void;
  onTrapFailed?: () => void;
  onMonsterSneaked?: () => void;
  onMonsterDefeated?: () => void;
  onTreasureClaimed?: () => void;
  onBossDefeated: () => void;
  onGameOver: (reason: string) => void;
  onClose: () => void;
}

export const Level3EncounterModal: React.FC<Level3EncounterModalProps> = ({
  tile,
  energy,
  maxEnergy,
  outerDoorsUnlocked = false,
  innerDoorsUnlocked = false,
  outerCodeFragments = 0,
  innerCodeFragments = 0,
  playerHand = [],
  onConsumeHandCards,
  onModifyEnergy,
  onOuterDoorResult,
  onInnerDoorResult,
  onTrapDisarmed,
  onTrapFailed,
  onMonsterSneaked,
  onMonsterDefeated,
  onTreasureClaimed,
  onBossDefeated,
  onGameOver,
  onClose,
}) => {
  // If center boss, start directly in combat phase!
  const isDirectBoss = tile.type === 'center_boss';

  const [phase, setPhase] = useState<'grid' | 'calculated' | 'reward' | 'combat' | 'cleared' | 'trap_failed'>(
    isDirectBoss ? 'combat' : 'grid'
  );
  const [clearedMessage, setClearedMessage] = useState<string>('');
  const [showEnergySpendOptions, setShowEnergySpendOptions] = useState(false);

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
  const [selectedHandCardSigns, setSelectedHandCardSigns] = useState<Record<string, 1 | -1>>({});
  const [hasTarotDiceModifiers] = useState(() =>
    playerHand.some((card) => card.level3DiceModifier)
  );

  // Calculate signed card modifiers
  const baseDiff = difference ?? 0;
  const selectedCards = playerHand.filter((c) => selectedHandCardIds.includes(c.id));
  const selectedMagicCard = selectedCards.find((card) => card.level3SetScore !== undefined);
  const selectedModifierCards = selectedCards
    .filter((card) => card.level3SetScore === undefined && !card.level3DiceModifier)
  const getCardSign = (cardId: string): 1 | -1 =>
    selectedHandCardSigns[cardId] ?? (baseDiff > 0 ? -1 : 1);
  const totalCardModifier = selectedModifierCards
    .reduce((sum, card) => sum + getCardSign(card.id) * card.value, 0);
  const cardModifierLabel = selectedModifierCards
    .map((card) => `${getCardSign(card.id) > 0 ? '+' : '-'}${card.value}`)
    .join(' ');

  let effectiveDifference = baseDiff + totalCardModifier;
  if (selectedMagicCard?.level3SetScore !== undefined) {
    effectiveDifference = selectedMagicCard.level3SetScore;
  }

  const toggleSelectCard = (id: string) => {
    sounds.playClick();
    const selectedCard = playerHand.find((card) => card.id === id);
    if (!selectedCard || selectedCard.level3DiceModifier) return;
    if (selectedHandCardIds.includes(id)) {
      setSelectedHandCardIds((prev) => prev.filter((cardId) => cardId !== id));
      setSelectedHandCardSigns((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    if (selectedCard.level3SetScore !== undefined) {
      setSelectedHandCardIds([id]);
      setSelectedHandCardSigns({});
      return;
    }

    const nextSelectedIds = [
      ...selectedHandCardIds.filter((cardId) => {
        const card = playerHand.find((handCard) => handCard.id === cardId);
        return card?.level3SetScore === undefined;
      }),
      id,
    ];
    setSelectedHandCardIds(nextSelectedIds);
    setSelectedHandCardSigns((prev) => ({
      ...Object.fromEntries(Object.entries(prev).filter(([cardId]) => nextSelectedIds.includes(cardId))),
      [id]: baseDiff > 0 ? -1 : 1,
    }));
  };

  const spendCardForEnergy = (card: ExplorationCard) => {
    const energyGained = Math.min(card.value, maxEnergy - energy);
    if (energyGained <= 0 || !onConsumeHandCards) return;
    onConsumeHandCards([card.id]);
    setSelectedHandCardIds((prev) => prev.filter((cardId) => cardId !== card.id));
    setSelectedHandCardSigns((prev) => {
      const next = { ...prev };
      delete next[card.id];
      return next;
    });
    onModifyEnergy(energyGained);
    setShowEnergySpendOptions(false);
    sounds.playBonus();
  };

  const applyDiceModifier = (card: ExplorationCard, dieIndex: 0 | 1, value: number) => {
    if (!currentPair || placedSlots[dieIndex] !== -1) return;
    const nextPair: [number, number] = [...currentPair];
    nextPair[dieIndex] = value;
    setCurrentPair(nextPair);
    onConsumeHandCards?.([card.id]);
    sounds.playBonus();
  };

  // Reset currently placed dice back to unplaced pair
  const handleResetCurrentPlacement = () => {
    if (!currentPair) return;
    sounds.playClick();
    const nextCells = [...cells];
    if (placedSlots[0] !== -1) nextCells[placedSlots[0]] = null;
    if (placedSlots[1] !== -1) nextCells[placedSlots[1]] = null;
    setCells(nextCells);
    setPlacedSlots([-1, -1]);
    setSelectedDieIdx(0);
  };

  // Reset entire challenge dice placement from Round 1
  const handleResetAllRounds = () => {
    sounds.playClick();
    setCells([null, null, null, null, null, null]);
    setCellLocked([false, false, false, false, false, false]);
    setRound(1);
    setCurrentPair(null);
    setPlacedSlots([-1, -1]);
    setSelectedDieIdx(0);
    setTopNumber(null);
    setBottomNumber(null);
    setDifference(null);
    setSelectedHandCardIds([]);
    setSelectedHandCardSigns({});
    setPhase('grid');
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
  const [combatRollPending, setCombatRollPending] = useState<boolean>(false);
  const [combatLogs, setCombatLogs] = useState<string[]>(() => {
    if (isDirectBoss) return ['The Utopia Engine Core Construct awakens! Engage in battle to save Utopia!'];
    return [];
  });
  const [combatRound, setCombatRound] = useState<number>(0);
  const [monsterDefeated, setMonsterDefeated] = useState<boolean>(false);

  // Collapsible Help & Rules Concertina State
  const [showHelp, setShowHelp] = useState<boolean>(false);

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
      if (diff >= 0 && diff <= 10) {
        return { label: `Portal Unlocked (Score ${diff}): Unlocks passage into the Inner Ring!`, type: 'success' };
      }
      return { label: `Unlock Failed (Score ${diff}): Must score 0–10! Door will be permanently locked.`, type: 'fail' };
    }
    if (tile.type === 'inner_door') {
      if (diff === 0) {
        return { label: 'Core Gate Decrypted (Score 0): Opens access to the Utopia Engine Core!', type: 'success' };
      }
      return { label: `Decryption Failed (Score ${diff}): Requires EXACTLY 0! Gate will be permanently locked.`, type: 'fail' };
    }
    if (tile.type === 'trap') {
      if (tile.ring === 'outer') {
        if (diff >= 0 && diff <= 10) {
          return { label: `Permanently Deactivated (Score ${diff}): Trap safely neutralized for the delve!`, type: 'success' };
        }
        if (diff >= 11 && diff <= 99) {
          return { label: `Temporarily Deactivated (Score ${diff}): Safe to pass now (reactivates if you return)!`, type: 'code' };
        }
        return { label: `Trap Sprung (Score ${diff}): Lose 5⚡ Energy and retreat to previous hex!`, type: 'fail' };
      } else {
        // Inner ring trap
        if (diff === 0) {
          return { label: 'Permanently Disabled (Score 0): Inner trap neutralized for the delve!', type: 'success' };
        }
        if (diff >= 1 && diff <= 10) {
          return { label: `Temporarily Deactivated (Score ${diff}): Safe to pass once (reactivates if you return)!`, type: 'code' };
        }
        return { label: `Trap Sprung (Score ${diff}): Lose 5⚡ Energy and retreat to previous hex!`, type: 'fail' };
      }
    }
    if (tile.type === 'monster') {
      if (tile.ring === 'outer') {
        if (diff >= 0 && diff <= 10) {
          return { label: `Stealth Success (Score ${diff}): Sneak past the monster unnoticed!`, type: 'success' };
        }
        const mLvl = getSpawnedMonsterLevel(diff, 'outer');
        const mDef = LEVEL3_MONSTERS[mLvl];
        return { label: `Detected (Score ${diff})! Awakens ${mDef.name} (${mDef.maxHp} HP)!`, type: 'monster', monsterLevel: mLvl };
      } else {
        // Inner ring monster
        if (diff === 0) {
          return { label: 'Perfect Stealth (Score 0): Slip past the elite beast completely undetected!', type: 'success' };
        }
        const mLvl = getSpawnedMonsterLevel(diff, 'inner');
        const mDef = LEVEL3_MONSTERS[mLvl];
        return { label: `Detected (Score ${diff})! Awakens ${mDef.name} (${mDef.maxHp} HP)!`, type: 'monster', monsterLevel: mLvl };
      }
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
      setSelectedHandCardSigns({});
    }

    const finalScore = effectiveDifference;

    if (tile.type === 'outer_door') {
      if (finalScore >= 0 && finalScore <= 10) {
        sounds.playVictory();
        onOuterDoorResult('unlocked');
        setClearedMessage(`Portal Door Unlocked (Score: ${finalScore})! Inner Ring passage is now open.`);
        setPhase('cleared');
      } else {
        sounds.playHazard();
        onOuterDoorResult('fail');
        setClearedMessage(`Door test failed (Score: ${finalScore}). This portal door is permanently locked.`);
        setPhase('cleared');
      }
      return;
    }

    if (tile.type === 'inner_door') {
      if (finalScore === 0) {
        sounds.playVictory();
        onInnerDoorResult('unlocked');
        setClearedMessage('Core Gate Unlocked (Score: 0)! Access to the Utopia Engine Core is now open.');
        setPhase('cleared');
      } else {
        sounds.playHazard();
        onInnerDoorResult('fail');
        setClearedMessage(`Core gate decryption failed (Score: ${finalScore}). This gate is permanently locked.`);
        setPhase('cleared');
      }
      return;
    }

    if (tile.type === 'trap') {
      const isOuter = tile.ring === 'outer';
      const isPermanent = isOuter ? (finalScore >= 0 && finalScore <= 10) : (finalScore === 0);
      const isTemporary = isOuter ? (finalScore >= 11 && finalScore <= 99) : (finalScore >= 1 && finalScore <= 10);

      if (isPermanent) {
        sounds.playVictory();
        onTrapDisarmed(true);
        setClearedMessage(`Trap permanently deactivated (Score: ${finalScore})! Safe for the rest of the delve.`);
        setPhase('cleared');
      } else if (isTemporary) {
        sounds.playBonus();
        onTrapDisarmed(false);
        setClearedMessage(`Trap temporarily deactivated (Score: ${finalScore})! Safe to continue, but will reactivate if you return.`);
        setPhase('cleared');
      } else {
        sounds.playHazard();
        setPhase('trap_failed');
      }
      return;
    }

    if (tile.type === 'monster') {
      const isOuter = tile.ring === 'outer';
      const sneaked = isOuter ? (finalScore >= 0 && finalScore <= 10) : (finalScore === 0);

      if (sneaked) {
        sounds.playVictory();
        if (onMonsterSneaked) onMonsterSneaked();
        setClearedMessage(`Stealth success (Score: ${finalScore})! You sneaked past the beast without fighting.`);
        setPhase('cleared');
      } else {
        sounds.playHazard();
        const monsterLevel = getSpawnedMonsterLevel(finalScore, tile.ring);
        const spawned = LEVEL3_MONSTERS[monsterLevel];
        setMonster(spawned);
        setMonsterHp(spawned.maxHp);
        setCombatLogs([
          `Detection! Score ${finalScore}${cardModifierLabel ? ` (cards ${cardModifierLabel})` : ''} awakened ${spawned.name}! (${spawned.maxHp} HP, ${spawned.description})`,
        ]);
        setPhase('combat');
      }
      return;
    }
  };

  const resolveCombatRoll = (dice: [number, number]) => {
    if (!monster) return;
    const [d1, d2] = dice;
    const nextRound = combatRound + 1;
    setCombatRound(nextRound);
    setCombatRollPending(false);

    let damageToPlayer = 0;
    if (monster.playerDamageValues.includes(d1)) damageToPlayer += 1;
    if (monster.playerDamageValues.includes(d2)) damageToPlayer += 1;

    let damageToMonster = 0;
    if (monster.monsterDamageValues.includes(d1)) damageToMonster += 1;
    if (monster.monsterDamageValues.includes(d2)) damageToMonster += 1;

    let roundMsg = `Round ${nextRound}: Rolled [${d1}, ${d2}]. `;
    if (damageToPlayer > 0) {
      roundMsg += `Took -${damageToPlayer} ⚡ harm! `;
      onModifyEnergy(-damageToPlayer);
    } else {
      roundMsg += 'Evaded harm! ';
    }
    if (damageToMonster > 0) roundMsg += `Dealt ${damageToMonster} damage to monster! `;

    const nextMonsterHp = Math.max(0, monsterHp - damageToMonster);
    setMonsterHp(nextMonsterHp);
    const projectedEnergy = energy - damageToPlayer;
    if (projectedEnergy <= 0) {
      roundMsg += 'Energy exhausted! Slain in combat.';
      setCombatLogs((prev) => [roundMsg, ...prev]);
      onGameOver(`Defeated by ${monster.name}!`);
      return;
    }

    if (nextMonsterHp <= 0) {
      sounds.playVictory();
      setMonsterDefeated(true);
      roundMsg += `The ${monster.name} is vanquished!`;
      if (monster.level === 5) {
        onBossDefeated();
      } else if (tile.type === 'monster') {
        onMonsterDefeated?.();
      } else if (tile.type === 'treasure') {
        onTreasureClaimed?.();
      } else if (tile.type === 'trap') {
        onTrapDisarmed(false);
      }
    } else if (damageToPlayer > 0) {
      sounds.playHazard();
    } else {
      sounds.playClick();
    }
    setCombatLogs((prev) => [roundMsg, ...prev]);
  };

  const handleRollCombat = () => {
    if (!monster || monsterDefeated || isCombatRolling || combatRollPending) return;

    setIsCombatRolling(true);
    sounds.playDiceRoll();
    setTimeout(() => {
      const dice: [number, number] = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
      setCombatDice(dice);
      setIsCombatRolling(false);
      if (playerHand.some((card) => card.level3DiceModifier)) {
        setCombatRollPending(true);
      } else {
        resolveCombatRoll(dice);
      }
    }, 400);
  };

  const applyCombatDiceModifier = (
    card: ExplorationCard,
    dieIndex: 0 | 1,
    value: number
  ) => {
    if (!combatDice || !combatRollPending) return;
    const nextDice: [number, number] = [...combatDice];
    nextDice[dieIndex] = value;
    setCombatDice(nextDice);
    onConsumeHandCards?.([card.id]);
    sounds.playBonus();
  };

  const absDiff = difference !== null ? Math.abs(difference) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm max-h-[96dvh] bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl p-2.5 sm:p-3 flex flex-col gap-2 font-mono text-[#2b261f] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2b261f]/20 pb-1.5">
          <div className="flex items-center gap-2">
            {tile.type === 'outer_door' && <KeyRound className="w-4 h-4 text-amber-700" />}
            {tile.type === 'inner_door' && <KeyRound className="w-4 h-4 text-amber-900" />}
            {tile.type === 'trap' && <ShieldAlert className="w-4 h-4 text-red-700" />}
            {tile.type === 'monster' && <Swords className="w-4 h-4 text-red-700" />}
            {tile.type === 'treasure' && <Sparkles className="w-4 h-4 text-amber-600" />}
            {tile.type === 'center_boss' && <Skull className="w-4 h-4 text-red-800" />}
            <div>
              <h3 className="font-black text-xs sm:text-sm text-[#2b261f] leading-tight">{tile.title}</h3>
              <span className="text-[9px] text-[#786e5e] uppercase tracking-wider font-bold">
                {tile.ring.toUpperCase()} RING — {tile.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-xs font-black bg-[#e8deca] px-2 py-0.5 rounded border border-[#2b261f]/30">
              {energy}/{maxEnergy}⚡
            </span>
            {energy < maxEnergy && playerHand.some((card) => card.value > 0) && (
              <button
                type="button"
                onClick={() => setShowEnergySpendOptions((open) => !open)}
                aria-expanded={showEnergySpendOptions}
                title="Spend a hand card to restore energy"
                className="flex items-center gap-1 rounded border border-emerald-800/40 bg-emerald-50 px-1.5 py-1 text-[9px] font-black uppercase text-emerald-900 hover:bg-emerald-100"
              >
                <Zap className="h-3 w-3" /> Spend
              </button>
            )}
          </div>
        </div>

        {showEnergySpendOptions && energy < maxEnergy && playerHand.some((card) => card.value > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-emerald-800/25 bg-emerald-50 px-2 py-1.5">
            <span className="mr-1 flex items-center gap-1 text-[9.5px] font-black uppercase text-emerald-900">
              Choose a card
            </span>
            {playerHand.filter((card) => card.value > 0).map((card) => {
              const energyGained = Math.min(card.value, maxEnergy - energy);
              return (
                <button
                  key={`energy-${card.id}`}
                  type="button"
                  title={`Spend ${card.rank}${card.suit} to restore ${energyGained} energy`}
                  disabled={energyGained <= 0 || !onConsumeHandCards}
                  onClick={() => spendCardForEnergy(card)}
                  className="flex items-center gap-1 rounded border border-emerald-800/40 bg-white px-1.5 py-1 text-[9.5px] font-bold text-emerald-950 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>{card.rank}{card.suit}</span>
                  <span className="flex items-center gap-0.5 text-emerald-700">
                    +{energyGained}<Zap className="h-2.5 w-2.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Phase 1 & 2: Utopia Engine Dice Grid & Calculation */}
        {phase !== 'combat' && (
          <div className="flex flex-col gap-2">
            {/* Help & Rules Concertina (Collapsible behind little triangle icon) */}
            <div className="w-full">
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-1 bg-[#ede4d3] hover:bg-[#e2d6c1] text-[#2b261f] border border-[#2b261f]/20 rounded text-[10.5px] font-mono font-bold cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] text-[#786e5e] font-sans inline-block">
                    {showHelp ? '▼' : '▶'}
                  </span>
                  <span>
                    {tile.type === 'outer_door'
                      ? 'Outer Portal Test'
                      : tile.type === 'inner_door'
                      ? 'Inner Gate Decryption'
                      : tile.type === 'trap'
                      ? 'Trap Disarm Mechanism'
                      : tile.type === 'monster'
                      ? 'Beast Lair Stealth'
                      : tile.type === 'treasure'
                      ? 'Mana Vault Alignment'
                      : 'Core Construct Battle'}
                  </span>
                </span>
                <span className="text-[9px] text-[#786e5e] font-normal underline">
                  {showHelp ? 'Hide' : 'Rules'}
                </span>
              </button>
              {showHelp && (
                <div className="text-[10px] text-[#5c5346] leading-snug bg-[#fcfaf5] p-2 rounded-b border-x border-b border-[#2b261f]/20 -mt-px animate-in fade-in duration-150">
                  {tile.type === 'outer_door' && (
                    <>
                      Roll 3 pairs of dice. Outer Portal Door unlocks on score 0–10. Any other score permanently locks it!
                    </>
                  )}
                  {tile.type === 'inner_door' && (
                    <>
                      Requires an EXACT score of 0 to decrypt the Inner Core Gate! Any other score permanently locks it.
                    </>
                  )}
                  {tile.type === 'trap' && (
                    <>
                      {tile.ring === 'outer'
                        ? 'Outer Trap: Score 0–10 permanently deactivates. Score 11–99 deactivates temporarily (reactivates if you return). Any other score springs the trap (-5⚡ and forced retreat)!'
                        : 'Inner Trap: Score 0 permanently disables. Score 1–10 deactivates once (reactivates if you return). Any other score springs the trap (-5⚡ and forced retreat)!'}
                    </>
                  )}
                  {tile.type === 'monster' && (
                    <>
                      {tile.ring === 'outer'
                        ? 'Outer Beast: Sneak past on score 0–10! Any other score awakens the monster (HP equal to monster level: 1–3 HP) for combat.'
                        : 'Inner Guardian: Sneak past on score 0! Any other score awakens the elite monster (HP equal to monster level: 2–4 HP) for combat.'}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Dice Placement Grid */}
            <div className="flex flex-col items-center gap-1.5 bg-[#ded4bf] p-2 rounded-lg border border-[#2b261f]/30 shadow-inner">
              <span className="text-[9.5px] uppercase font-bold text-[#786e5e] tracking-wider">
                {phase === 'grid' ? `Round ${round} of 3 — Place Dice` : 'Calculation Complete'}
              </span>

              {/* Top Row (Hundreds, Tens, Ones) */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black w-3.5 text-center text-[#2b261f]">+</span>
                {[0, 1, 2].map((slotIdx) => (
                  <button
                    key={`slot-${slotIdx}`}
                    onClick={() => handleSlotClick(slotIdx)}
                    disabled={phase !== 'grid' || cellLocked[slotIdx]}
                    className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-md border-2 border-[#2b261f] flex items-center justify-center font-black text-base transition-transform ${
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black w-3.5 text-center text-[#b91c1c]">-</span>
                {[3, 4, 5].map((slotIdx) => (
                  <button
                    key={`slot-${slotIdx}`}
                    onClick={() => handleSlotClick(slotIdx)}
                    disabled={phase !== 'grid' || cellLocked[slotIdx]}
                    className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-md border-2 border-[#2b261f] flex items-center justify-center font-black text-base transition-transform ${
                      cells[slotIdx] !== null
                        ? 'bg-[#fffdf8] text-[#2b261f] shadow-xs'
                        : 'bg-[#ede4d3] border-dashed border-[#2b261f]/50'
                    } ${cellLocked[slotIdx] ? 'opacity-85' : 'hover:scale-105 cursor-pointer'}`}
                  >
                    {cells[slotIdx] !== null ? cells[slotIdx] : ''}
                  </button>
                ))}
              </div>

              {/* Hand Cards Available (Visible during dice placement so player can plan strategically!) */}
              {phase === 'grid' && (
                <div className="w-full mt-1.5 pt-1.5 border-t border-[#2b261f]/20 flex flex-col items-center gap-1">
                  <div className="w-full flex items-center justify-between text-[9.5px] font-bold text-[#5c5244]">
                    <span className="flex items-center gap-1">
                      <span>🎒</span>
                      <span>Hand Cards Available:</span>
                    </span>
                    <span className="bg-[#ede4d3] px-1.5 py-0.2 rounded border border-[#2b261f]/20 font-mono text-[#2b261f]">
                      {playerHand.length} card{playerHand.length === 1 ? '' : 's'} (±{playerHand.reduce((s, c) => s + c.value, 0)} pts)
                    </span>
                  </div>

                  {playerHand.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center py-0.5">
                      {playerHand.map((card) => {
                        const isRed = card.suit === '♥' || card.suit === '♦';
                        return (
                          <div
                            key={`dice-hand-${card.id}`}
                            className="px-1.5 py-0.5 rounded border border-[#2b261f]/30 bg-white font-mono flex items-center gap-1 text-[10px] shadow-2xs"
                          >
                            <span className={`font-black ${isRed ? 'text-red-700' : 'text-slate-900'}`}>
                              {card.rank}{card.suit}
                            </span>
                            <span className="text-[9px] font-bold text-[#15803d] bg-emerald-50 px-1 rounded">
                              ±{card.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[9px] text-[#786e5e] italic">
                      (No hand cards — target difference must be reached with dice only)
                    </span>
                  )}
                  {tile.type === 'outer_door' && (
                    <div className="text-[8.5px] text-[#b45309] font-bold text-center">
                      Outer Door unlocks on score 0–10. Any other score permanently locks it!
                    </div>
                  )}
                  {tile.type === 'inner_door' && (
                    <div className="text-[8.5px] text-[#b45309] font-bold text-center">
                      Inner Gate unlocks on EXACTLY 0. Any other score permanently locks it!
                    </div>
                  )}
                  {tile.type === 'trap' && (
                    <div className="text-[8.5px] text-[#b45309] font-bold text-center">
                      {tile.ring === 'outer'
                        ? '0–10: Permanent disarm | 11–99: Temporary disarm | Else: Springs trap (-5⚡ & retreat)'
                        : '0: Permanent disarm | 1–10: Temporary disarm | Else: Springs trap (-5⚡ & retreat)'}
                    </div>
                  )}
                  {tile.type === 'monster' && (
                    <div className="text-[8.5px] text-[#b45309] font-bold text-center">
                      {tile.ring === 'outer'
                        ? '0–10: Sneak past undetected | Other scores: Awakens monster (HP = level)!'
                        : '0: Sneak past undetected | Other scores: Awakens elite guardian (HP = level)!'}
                    </div>
                  )}
                </div>
              )}

              {/* Math Result Row */}
              {phase === 'calculated' && difference !== null && (
                <div className="w-full mt-1 pt-1.5 border-t border-[#2b261f]/20 flex flex-col items-center gap-1.5">
                  <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm font-black">
                    <span>{topNumber}</span>
                    <span>-</span>
                    <span>{bottomNumber}</span>
                    <span>=</span>
                    <span className="text-sm text-[#b91c1c] bg-[#fae19c] px-2 py-0.2 rounded border border-[#b45309]">
                      {difference}
                    </span>
                  </div>

                  {/* Banked Hand Cards Score Reduction Section */}
                  <div className="w-full bg-[#fdfbf7] p-2 rounded-lg border border-[#2b261f]/25 flex flex-col gap-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#2b261f] flex items-center gap-1">
                        <span>🎒</span>
                        <span>Banked Hand from Level 2</span>
                        {playerHand.length > 0 && (
                          <span className="text-[9px] bg-[#e8deca] text-[#5c5244] px-1 py-0.2 rounded font-mono font-bold">
                            {playerHand.length} card{playerHand.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                      {selectedHandCardIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHandCardIds([]);
                            setSelectedHandCardSigns({});
                          }}
                          className="text-[9.5px] text-amber-900 underline hover:text-amber-700 cursor-pointer font-bold"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {playerHand.length === 0 ? (
                      <p className="text-[9.5px] text-[#786e5e] italic text-center py-0.5">
                        No banked cards in hand. (Bank cards in Level 2 to reduce dice scores here!)
                      </p>
                    ) : (
                      <>
                        <p className="text-[9.5px] text-[#5c5346] leading-none">
                          Select cards, then choose + or − for each card; magic cards set the score:
                        </p>

                        <div className="flex flex-wrap gap-1 justify-center py-0.5">
                          {playerHand.map((card) => {
                            const isSelected = selectedHandCardIds.includes(card.id);
                            const isRed = card.suit === '♦';
                            const canModifyScore = card.level3SetScore === undefined && !card.level3DiceModifier;
                            const sign = getCardSign(card.id);

                            return (
                              <div key={card.id} className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectCard(card.id)}
                                  disabled={Boolean(card.level3DiceModifier)}
                                  className={`px-1.5 py-1 rounded-md border font-mono flex flex-col items-center gap-0.2 cursor-pointer transition-all select-none shadow-2xs ${
                                    isSelected
                                      ? 'bg-[#dcfce7] border-[#16a34a] ring-2 ring-[#16a34a] scale-105'
                                      : 'bg-white hover:bg-[#fff9ed] border-[#2b261f]/30'
                                  }`}
                                >
                                  {card.tarotCard ? (
                                    <TarotModifierArt card={card} className="h-8 w-7 object-contain" />
                                  ) : (
                                    <div className={`text-xs font-black leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                                      {card.rank}{card.suit}
                                    </div>
                                  )}
                                  <div className="text-[8.5px] font-bold text-[#5c5244] leading-none">
                                    {card.tarotCard
                                      ? card.tarotCard === 'judgement' ? 'SET SCORE 1' :
                                        card.tarotCard === 'world' ? 'SET SCORE 0' :
                                          card.tarotCard.toUpperCase()
                                      : `${isSelected ? sign > 0 ? '+' : '-' : '±'}${card.value}`}
                                  </div>
                                  {isSelected && (
                                    <span className="text-[7px] font-black bg-[#16a34a] text-white px-0.5 rounded leading-tight">
                                      {card.level3SetScore !== undefined ? 'SET' : 'SPEND'}
                                    </span>
                                  )}
                                </button>
                                {isSelected && canModifyScore && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHandCardSigns((prev) => ({
                                      ...prev,
                                      [card.id]: sign === 1 ? -1 : 1,
                                    }))}
                                    title={`Switch to ${sign === 1 ? 'subtracting' : 'adding'} this card`}
                                    aria-label={`Switch ${card.rank}${card.suit} to ${sign === 1 ? 'subtract' : 'add'}`}
                                    className="rounded border border-[#2b261f]/30 bg-[#ede4d3] px-1.5 py-1 text-[10px] font-black hover:bg-[#dfd3bc]"
                                  >
                                    {sign === 1 ? '−' : '+'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {selectedHandCardIds.length > 0 && (
                          <div className="bg-[#ede4d3] px-2 py-0.5 rounded text-[9.5px] font-mono flex items-center justify-between border border-[#2b261f]/20">
                            <span className="text-[#5c5244]">
                              Selected ({selectedHandCardIds.length}):
                            </span>
                            <span className="font-black text-[#15803d]">
                              {selectedMagicCard
                                ? `Magic card sets score to ${selectedMagicCard.level3SetScore}`
                                : `${cardModifierLabel} modifier (${baseDiff} → ${effectiveDifference})`}
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
                      <div className={`w-full text-center text-[10px] p-1.5 rounded border ${badgeClass} leading-tight`}>
                        <div className="font-mono text-[11px] mb-0.5">
                          Effective Score: <span className="font-black text-xs">{effectiveDifference}</span>
                          {cardModifierLabel && (
                            <span className="ml-1 text-[9.5px] opacity-80">
                              (Original: {baseDiff}, cards {cardModifierLabel})
                            </span>
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
              <div className={`flex flex-col items-center gap-1.5 ${
                hasTarotDiceModifiers ? 'min-h-[186px]' : 'min-h-[148px]'
              }`}>
                {!currentPair ? (
                  <button
                    onClick={handleRollRoundDice}
                    className="w-full py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-0.5"
                  >
                    🎲 Roll Round {round} Dice
                  </button>
                ) : (
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-[#786e5e] font-bold">
                      Select die to place into an open slot:
                    </span>
                    <div className="flex items-center gap-3">
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
                    {playerHand.some((card) => card.level3DiceModifier) && (
                      <div className="w-full space-y-1 rounded-md border border-amber-700/40 bg-amber-50 p-1.5">
                        <span className="block text-center text-[9px] font-black uppercase text-amber-900">
                          One-time Tarot dice modifiers
                        </span>
                        {playerHand.filter((card) => card.level3DiceModifier).map((card) => (
                          <div key={card.id} className="flex flex-wrap items-center justify-center gap-1">
                            <span className="mr-1 text-[9px] font-bold text-amber-900">
                              {card.tarotCard && <TarotModifierArt card={card} className="inline-block h-7 w-5 object-contain align-middle mr-1" />}
                              {card.level3DiceModifier === 'adjust'
                                ? 'Star'
                                : card.level3DiceModifier === 'flip'
                                  ? 'Moon'
                                  : 'Sun'}
                            </span>
                            {currentPair.map((value, dieIndex) => {
                              const die = dieIndex as 0 | 1;
                              const locked = placedSlots[die] !== -1;
                              if (card.level3DiceModifier === 'adjust') {
                                return (
                                  <React.Fragment key={`${card.id}-${die}`}>
                                    <button
                                      type="button"
                                      disabled={locked || value <= 1}
                                      onClick={() => applyDiceModifier(card, die, value - 1)}
                                      className="rounded border border-amber-800/40 bg-white px-1.5 py-0.5 text-[9px] font-bold disabled:opacity-40"
                                    >
                                      Die {dieIndex + 1} −1
                                    </button>
                                    <button
                                      type="button"
                                      disabled={locked || value >= 6}
                                      onClick={() => applyDiceModifier(card, die, value + 1)}
                                      className="rounded border border-amber-800/40 bg-white px-1.5 py-0.5 text-[9px] font-bold disabled:opacity-40"
                                    >
                                      +1
                                    </button>
                                  </React.Fragment>
                                );
                              }
                              if (card.level3DiceModifier === 'flip') {
                                return (
                                  <button
                                    key={`${card.id}-${die}`}
                                    type="button"
                                    disabled={locked}
                                    onClick={() => applyDiceModifier(card, die, 7 - value)}
                                    className="rounded border border-amber-800/40 bg-white px-1.5 py-0.5 text-[9px] font-bold disabled:opacity-40"
                                  >
                                    Flip die {dieIndex + 1} ({7 - value})
                                  </button>
                                );
                              }
                              return (
                                <label key={`${card.id}-${die}`} className="flex items-center gap-1 text-[9px] font-bold text-amber-900">
                                  Die {dieIndex + 1}
                                  <select
                                    disabled={locked}
                                    defaultValue=""
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (nextValue >= 1 && nextValue <= 6) applyDiceModifier(card, die, nextValue);
                                    }}
                                    className="rounded border border-amber-800/40 bg-white px-1 py-0.5 disabled:opacity-40"
                                  >
                                    <option value="" disabled>Set</option>
                                    {[1, 2, 3, 4, 5, 6].map((face) => (
                                      <option key={face} value={face}>{face}</option>
                                    ))}
                                  </select>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Action buttons: Reset & Lock */}
                    <div className="flex items-center justify-center gap-2 w-full mt-1">
                      {(placedSlots[0] !== -1 || placedSlots[1] !== -1) && (
                        <button
                          type="button"
                          onClick={handleResetCurrentPlacement}
                          className="py-1.5 px-3 bg-[#ede4d3] hover:bg-[#dfd3bc] active:bg-[#d0c2a8] text-[#5c5244] border-2 border-[#2b261f]/40 rounded-lg font-black text-xs uppercase cursor-pointer flex items-center justify-center gap-1 shadow-xs transition-transform active:translate-y-px"
                          title="Clear placed dice for this round to choose different slots"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#786e5e]" />
                          <span>Reset Placement</span>
                        </button>
                      )}

                      {placedSlots[0] !== -1 && placedSlots[1] !== -1 && (
                        <button
                          type="button"
                          onClick={handleConfirmRound}
                          className="flex-1 py-1.5 bg-[#b45309] hover:bg-[#92400e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-px"
                        >
                          ✓ Lock Round {round} Placement
                        </button>
                      )}
                    </div>

                    {round > 1 && (
                      <button
                        type="button"
                        onClick={handleResetAllRounds}
                        className="text-[9.5px] text-[#786e5e] hover:text-[#2b261f] underline cursor-pointer mt-0.5"
                      >
                        Reset & restart from Round 1
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
                className="w-full py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer transition-transform active:translate-y-0.5"
              >
                {selectedHandCardIds.length > 0
                  ? `Spend ${selectedHandCardIds.length} Card${selectedHandCardIds.length > 1 ? 's' : ''} & Resolve (${effectiveDifference})`
                  : `Resolve Chamber Event (${effectiveDifference})`}
              </button>
            )}

            {/* Cleared Success State */}
            {phase === 'cleared' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded border border-emerald-300 w-full text-center">
                  {clearedMessage || 'Chamber event resolved! Proceed deeper into the flower machine.'}
                </span>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] cursor-pointer shadow-md transition-transform active:translate-y-0.5"
                >
                  Continue Delve
                </button>
              </div>
            )}

            {/* Trap Failed / Sprung State: lose 5 energy and return to previous hex */}
            {phase === 'trap_failed' && (
              <div className="flex flex-col gap-2 p-2.5 bg-[#fef2f2] border-2 border-[#ef4444] rounded-lg text-center animate-in fade-in">
                <div className="flex items-center justify-center gap-1.5 text-red-700 font-black text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Trap Mechanism Sprung!</span>
                </div>
                <p className="text-[11px] text-[#7f1d1d] leading-snug">
                  Lethal blades and crushing rollers snapped shut! You lost <strong>5⚡ Energy</strong> and were forced to retreat back to your previous hex.
                </p>
                <p className="text-[10px] text-[#991b1b] italic">
                  No monster encountered. The trap remains active — if you return to this hex, you must attempt to deactivate it again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onTrapFailed) onTrapFailed();
                    onClose();
                  }}
                  className="w-full py-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] cursor-pointer shadow-md transition-transform active:translate-y-0.5"
                >
                  Retreat to Previous Hex (-5⚡)
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

            {combatRollPending && combatDice && (
              <div className="flex flex-col gap-2">
                {playerHand.some((card) => card.level3DiceModifier) && (
                  <div className="w-full space-y-1 rounded-md border border-amber-700/40 bg-amber-50 p-2">
                    <span className="block text-center text-[10px] font-black uppercase text-amber-900">
                      Use a Tarot modifier before resolving this round
                    </span>
                    {playerHand.filter((card) => card.level3DiceModifier).map((card) => (
                      <div key={card.id} className="flex flex-wrap items-center justify-center gap-1">
                        <span className="mr-1 text-[9px] font-bold text-amber-900">
                          {card.tarotCard && (
                            <TarotModifierArt
                              card={card}
                              className="inline-block h-7 w-5 object-contain align-middle mr-1"
                            />
                          )}
                          {card.level3DiceModifier === 'adjust'
                            ? 'Star'
                            : card.level3DiceModifier === 'flip'
                              ? 'Moon'
                              : 'Sun'}
                        </span>
                        {combatDice.map((value, dieIndex) => {
                          const die = dieIndex as 0 | 1;
                          if (card.level3DiceModifier === 'adjust') {
                            return (
                              <React.Fragment key={`${card.id}-${die}`}>
                                <button
                                  type="button"
                                  disabled={value <= 1}
                                  onClick={() => applyCombatDiceModifier(card, die, value - 1)}
                                  className="rounded border border-amber-800/40 bg-white px-1.5 py-0.5 text-[9px] font-bold disabled:opacity-40"
                                >
                                  Die {dieIndex + 1} −1
                                </button>
                                <button
                                  type="button"
                                  disabled={value >= 6}
                                  onClick={() => applyCombatDiceModifier(card, die, value + 1)}
                                  className="rounded border border-amber-800/40 bg-white px-1.5 py-0.5 text-[9px] font-bold disabled:opacity-40"
                                >
                                  +1
                                </button>
                              </React.Fragment>
                            );
                          }
                          if (card.level3DiceModifier === 'flip') {
                            return (
                              <button
                                key={`${card.id}-${die}`}
                                type="button"
                                onClick={() => applyCombatDiceModifier(card, die, 7 - value)}
                                className="rounded border border-amber-800/40 bg-white px-1.5 py-0.5 text-[9px] font-bold"
                              >
                                Flip die {dieIndex + 1} ({7 - value})
                              </button>
                            );
                          }
                          return (
                            <label
                              key={`${card.id}-${die}`}
                              className="flex items-center gap-1 text-[9px] font-bold text-amber-900"
                            >
                              Die {dieIndex + 1}
                              <select
                                defaultValue=""
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (nextValue >= 1 && nextValue <= 6) {
                                    applyCombatDiceModifier(card, die, nextValue);
                                  }
                                }}
                                className="rounded border border-amber-800/40 bg-white px-1 py-0.5"
                              >
                                <option value="" disabled>Set</option>
                                {[1, 2, 3, 4, 5, 6].map((face) => (
                                  <option key={face} value={face}>{face}</option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => resolveCombatRoll(combatDice)}
                  className="w-full py-2.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white rounded-lg font-black text-xs uppercase tracking-wider border-2 border-[#2b261f] shadow-md cursor-pointer"
                >
                  Resolve Combat Round ({combatDice[0]}, {combatDice[1]})
                </button>
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
                disabled={isCombatRolling || combatRollPending}
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
