import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DirectionIndex,
  HexCoord,
  HexTile,
  DiceState,
  DeviationState,
  EventPrompt,
  HexType,
  GameLevel,
} from './types';
import {
  GRID_COLS,
  GRID_ROWS,
  DIRECTION_LABELS,
  tracePath,
  traceSplitPath,
  getAllNeighbors,
  getNeighbor,
  getOrganicNeighbor,
  getCompassDirection,
  getAdjacentBearing,
  getTowerRevealedCoords,
  getPossibleGoalCoords,
} from './utils/hexMath';
import { generateMap, START_COORD } from './utils/gameEngine';
import { sounds } from './utils/sound';
import {
  TunnelMap,
  createTunnelMap,
  carveCorridorsForTile,
  getLiveExits,
  getDestinationThroughHallway,
  TUNNEL_START_COORD,
} from './utils/tunnelEngine';
import {
  createShuffledHeartsDeck,
  TunnelCard,
} from './utils/delveDeck';
import {
  createExplorationDeck,
  drawInitialComparisonCard,
  ExplorationCard,
} from './utils/explorationDeck';
import { ChamberExplorationModal } from './components/ChamberExplorationModal';
import { Level2VictoryModal } from './components/Level2VictoryModal';
import { FlowerHexGrid } from './components/FlowerHexGrid';
import { Header } from './components/Header';
import { HexGrid } from './components/HexGrid';
import { TunnelGrid } from './components/TunnelGrid';
import { CardDisplay } from './components/CardDisplay';
import { ControlPanel } from './components/ControlPanel';
import { RulesModal } from './components/RulesModal';
import { EventModal } from './components/EventModal';
import { GameOverModal } from './components/GameOverModal';
import { LevelTransitionModal } from './components/LevelTransitionModal';

const MAX_ENERGY = 30;

export default function App() {
  // Level State
  const [currentLevel, setCurrentLevel] = useState<GameLevel>(1);
  const [showLevelTransitionModal, setShowLevelTransitionModal] = useState<boolean>(false);
  const [level1Turns, setLevel1Turns] = useState<number>(1);

  // Level 2 Subterranean Tunnel State
  const [tunnelMap, setTunnelMap] = useState<TunnelMap>(() =>
    createTunnelMap(createShuffledHeartsDeck())
  );
  const [currentTunnelHeading, setCurrentTunnelHeading] = useState<DirectionIndex>(2);
  const [level2Steps, setLevel2Steps] = useState<number>(0);
  const [level2CardsDrawn, setLevel2CardsDrawn] = useState<number>(0);
  const [level2TargetFound, setLevel2TargetFound] = useState<boolean>(false);
  const [showLevel2VictoryModal, setShowLevel2VictoryModal] = useState<boolean>(false);

  // Level 2 Exploration Deck (♠, ♣, ♦ Higher/Lower and Ace of Spades hunt)
  const [explorationDeck, setExplorationDeck] = useState<ExplorationCard[]>(() =>
    createExplorationDeck()
  );
  const [comparisonCard, setComparisonCard] = useState<ExplorationCard | null>(null);
  const [drawnExplorationCard, setDrawnExplorationCard] = useState<ExplorationCard | null>(null);
  const [explorationStreak, setExplorationStreak] = useState<number>(0);
  const [activePrediction, setActivePrediction] = useState<'higher' | 'lower' | null>(null);
  const [pendingExplorationChoice, setPendingExplorationChoice] = useState<
    'higher_lower' | 'face_gamble' | null
  >(null);
  const [explorationResultText, setExplorationResultText] = useState<string | null>(null);
  const [showChamberExplorationModal, setShowChamberExplorationModal] = useState<boolean>(false);

  // Level 3 State
  const [level3Floor, setLevel3Floor] = useState<number>(1);

  // Game Map State (Level 1)
  const [mapData, setMapData] = useState(() => generateMap());
  const [playerCoord, setPlayerCoord] = useState<HexCoord>(START_COORD);
  const [knownTowers, setKnownTowers] = useState<HexCoord[]>([]);
  const [visitedTowerCount, setVisitedTowerCount] = useState<number>(0);

  // Stats
  const [energy, setEnergy] = useState<number>(MAX_ENERGY);
  const [turn, setTurn] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isLost, setIsLost] = useState<boolean>(false);
  const [reviewingMap, setReviewingMap] = useState<boolean>(false);

  const gameOverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPendingExhaustionRef = useRef<boolean>(false);

  // 2D6 Dice State
  const [diceState, setDiceState] = useState<DiceState>({
    die1: 2,
    die2: 6,
    baseDie1: 2,
    baseDie2: 6,
    chosenDirectionDie: 1, // die1 is direction, die2 is distance
    assignedDistance: 6,
    assignedDirection: 2, // 2 = N ↑
    rolled: false,
    isRolling: false,
    modifiedDie: null,
    modifierDelta: 0,
  });

  // Selected Direction override (active direction)
  const [selectedDirection, setSelectedDirection] = useState<DirectionIndex>(2);

  // Tactical Deviation State
  const [deviationState, setDeviationState] = useState<DeviationState>({
    active: false,
    usedThisTurn: false,
    type: 'none',
    pivotIndex: null,
    overrideDirection: 2,
    step1Distance: 2,
    step1Direction: 2,
    step2Distance: 4,
    step2Direction: 3,
  });

  // Move 1 Mode State (replaces Scout - allows stepping 1 space into any adjacent hex)
  const [isMoveOne, setIsMoveOne] = useState<boolean>(false);

  // Status message ticker
  const [statusMessage, setStatusMessage] = useState<string>(
    'Expedition Base: Roll 2D6 to determine movement distance & direction.'
  );

  // Compass clue to goal discovered from Cairns
  const [goalClue, setGoalClue] = useState<string | null>(null);

  // Free move 1-hex charges acquired from Fortune Shrines
  const [freeMoves, setFreeMoves] = useState<number>(0);

  // Brass Telescope (from Shrines): reveals all tiles in all 6 directions on future towers visited
  const [hasTelescope, setHasTelescope] = useState<boolean>(false);

  // Dice Modifier (from Shrines): allows +/- 1 adjustment to either movement die each turn
  const [hasDiceModifier, setHasDiceModifier] = useState<boolean>(false);

  // Check if goal has been revealed
  const goalTile = mapData.tiles.get(`${mapData.goalCoord.col},${mapData.goalCoord.row}`);
  const goalFound = !!goalTile?.revealed;

  // Dynamic candidate goal coordinates calculated from revealed Cairns
  const candidateGoalCoords = useMemo(() => {
    if (goalFound) {
      return [];
    }
    return getPossibleGoalCoords(mapData.tiles, START_COORD);
  }, [mapData.tiles, goalFound]);

  // Count of active revealed cairns
  const revealedCairnCount = useMemo(() => {
    let count = 0;
    for (const t of mapData.tiles.values()) {
      if (t.type === 'clue_cairn' && t.revealed) count++;
    }
    return count;
  }, [mapData.tiles]);

  // Modal Dialogs
  const [showRules, setShowRules] = useState<boolean>(false);
  const [eventPrompt, setEventPrompt] = useState<EventPrompt | null>(null);

  // Cleanup any pending game-over timer on unmount
  useEffect(() => {
    return () => {
      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
      }
    };
  }, []);

  // Trigger exhaustion sequence: reveals the goal hex on the map immediately, but DEFERS game over if free moves remain!
  const triggerExhaustionSequence = useCallback(
    (tilesMap?: Map<string, HexTile>, delayMs = 1800) => {
      if (isWon) return;

      // Reveal the goal hex on the map immediately
      setMapData((prev) => {
        const nextTiles = tilesMap ? new Map(tilesMap) : new Map(prev.tiles);
        const goalKey = `${prev.goalCoord.col},${prev.goalCoord.row}`;
        const gTile = nextTiles.get(goalKey);
        if (gTile) {
          gTile.revealed = true;
        }
        return { ...prev, tiles: nextTiles };
      });

      // If the player still has Free Moves remaining, DO NOT trigger Game Over!
      // This allows the player to use their final adrenaline burst of momentum to reach safety or the secret tunnel!
      if (freeMoves > 0) {
        sounds.playBonus();
        setStatusMessage(
          `⚠️ Energy sapped to 0⚡! But you have ${freeMoves} Free Move bonus remaining! Use your last burst of momentum to reach safety or the Secret Tunnel!`
        );
        isPendingExhaustionRef.current = false;
        return;
      }

      sounds.playHazard();
      setStatusMessage(
        `Expedition exhausted! The Secret Tunnel Entrance has been revealed at (${mapData.goalCoord.col}, ${mapData.goalCoord.row}).`
      );

      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
      }
      gameOverTimeoutRef.current = setTimeout(() => {
        setIsLost(true);
      }, delayMs);
    },
    [isWon, freeMoves, mapData.goalCoord.col, mapData.goalCoord.row]
  );

  // Reset / New Game
  const handleNewGame = useCallback(() => {
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    isPendingExhaustionRef.current = false;
    setReviewingMap(false);

    setCurrentLevel(1);
    setShowLevelTransitionModal(false);
    setLevel1Turns(1);
    setTunnelMap(createTunnelMap(createShuffledHeartsDeck()));
    setCurrentTunnelHeading(2);
    setLevel2Steps(0);
    setLevel2CardsDrawn(0);
    setLevel2TargetFound(false);
    setShowLevel2VictoryModal(false);
    const newExpDeck = createExplorationDeck();
    setExplorationDeck(newExpDeck);
    setComparisonCard(null);
    setDrawnExplorationCard(null);
    setExplorationStreak(0);
    setPendingExplorationChoice(null);
    setExplorationResultText(null);
    setShowChamberExplorationModal(false);
    setLevel3Floor(1);

    const newMap = generateMap();
    setMapData(newMap);
    setPlayerCoord(START_COORD);
    setKnownTowers([]);
    setVisitedTowerCount(0);
    setGoalClue(null);
    setFreeMoves(0);
    setHasTelescope(false);
    setHasDiceModifier(false);
    setEnergy(MAX_ENERGY);
    setTurn(1);
    setIsWon(false);
    setIsLost(false);
    setDiceState({
      die1: 2,
      die2: 6,
      baseDie1: 2,
      baseDie2: 6,
      chosenDirectionDie: 1,
      assignedDistance: 6,
      assignedDirection: 2,
      rolled: false,
      isRolling: false,
      modifiedDie: null,
      modifierDelta: 0,
    });
    setSelectedDirection(2);
    setDeviationState({
      active: false,
      usedThisTurn: false,
      type: 'none',
      pivotIndex: null,
      overrideDirection: 2,
      step1Distance: 2,
      step1Direction: 2,
      step2Distance: 4,
      step2Direction: 3,
    });
    setIsMoveOne(false);
    setStatusMessage('New Expedition started! Roll 2D6 to explore the wilderness.');
  }, []);

  // Sync sounds state
  const handleToggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Roll 2D6
  const handleRollDice = () => {
    if (energy <= 0 || diceState.isRolling) return;

    setDiceState((prev) => ({ ...prev, isRolling: true }));
    sounds.playDiceRoll();

    let count = 0;
    const interval = setInterval(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setDiceState((prev) => ({ ...prev, die1: d1, die2: d2 }));
      count++;

      if (count > 7) {
        clearInterval(interval);
        const finalD1 = Math.floor(Math.random() * 6) + 1;
        const finalD2 = Math.floor(Math.random() * 6) + 1;

        // By default: Die 1 is Direction, Die 2 is Distance
        // Or if user clicked earlier, preserve chosen direction die (default 1)
        const chosenDirDie: 1 | 2 = 1;
        const dir = (chosenDirDie === 1 ? finalD1 : finalD2) as DirectionIndex;
        const dist = chosenDirDie === 1 ? finalD2 : finalD1;

        setDiceState({
          die1: finalD1,
          die2: finalD2,
          baseDie1: finalD1,
          baseDie2: finalD2,
          chosenDirectionDie: chosenDirDie,
          assignedDistance: dist,
          assignedDirection: dir,
          rolled: true,
          isRolling: false,
          modifiedDie: null,
          modifierDelta: 0,
        });

        setSelectedDirection(dir);
        setDeviationState({
          active: false,
          usedThisTurn: false,
          type: 'none',
          pivotIndex: null,
          overrideDirection: dir,
          step1Distance: Math.max(1, Math.floor(dist / 2)),
          step1Direction: dir,
          step2Distance: Math.max(1, dist - Math.floor(dist / 2)),
          step2Direction: (dir % 6 + 1) as DirectionIndex,
        });

        const modHint = hasDiceModifier ? ' (±1 Dice Modifier Active)' : '';
        setStatusMessage(
          `Rolled [${finalD1}, ${finalD2}]! Direction: Die 1 (${DIRECTION_LABELS[dir].short}), Distance: Die 2 (${dist} spaces).${modHint} Tap either die to switch.`
        );
      }
    }, 60);
  };

  // Adjust either die by +/- 1 when Dice Modifier boon is active
  const handleModifyDie = (dieNum: 1 | 2, delta: -1 | 1 | 0) => {
    if (!hasDiceModifier || !diceState.rolled || diceState.isRolling) return;

    let newDie1 = diceState.baseDie1;
    let newDie2 = diceState.baseDie2;
    let modifiedDie: 1 | 2 | null = null;
    let modifierDelta: -1 | 0 | 1 = 0;

    if (delta !== 0) {
      if (dieNum === 1) {
        newDie1 = Math.max(1, Math.min(6, diceState.baseDie1 + delta));
        newDie2 = diceState.baseDie2;
        modifiedDie = 1;
        modifierDelta = (newDie1 - diceState.baseDie1) as -1 | 1;
      } else {
        newDie2 = Math.max(1, Math.min(6, diceState.baseDie2 + delta));
        newDie1 = diceState.baseDie1;
        modifiedDie = 2;
        modifierDelta = (newDie2 - diceState.baseDie2) as -1 | 1;
      }
    }

    const chosenDirDie = diceState.chosenDirectionDie;
    const dirVal = (chosenDirDie === 1 ? newDie1 : newDie2) as DirectionIndex;
    const distVal = chosenDirDie === 1 ? newDie2 : newDie1;

    setDiceState((prev) => ({
      ...prev,
      die1: newDie1,
      die2: newDie2,
      assignedDirection: dirVal,
      assignedDistance: distVal,
      modifiedDie,
      modifierDelta,
    }));

    setSelectedDirection(dirVal);

    // Reset or update deviation parameters
    setDeviationState({
      active: false,
      usedThisTurn: false,
      type: 'none',
      pivotIndex: null,
      overrideDirection: dirVal,
      step1Distance: Math.max(1, Math.floor(distVal / 2)),
      step1Direction: dirVal,
      step2Distance: Math.max(1, distVal - Math.floor(distVal / 2)),
      step2Direction: ((dirVal % 6) + 1) as DirectionIndex,
    });

    sounds.playClick();
    if (delta !== 0) {
      setStatusMessage(
        `Dice Modifier: Die ${dieNum} adjusted by ${delta > 0 ? `+${delta}` : delta}. Direction: ${dirVal} (${DIRECTION_LABELS[dirVal].short}), Distance: ${distVal} hexes.`
      );
    } else {
      setStatusMessage(`Dice Modifier reset to natural roll: [${newDie1}, ${newDie2}].`);
    }
  };

  // Clicking a die toggles which die represents Direction and which represents Distance
  // "You roll the dice and can click on a dice to choose direction and the other will automatically show distance in that direction"
  const handleSelectDirectionDie = (dieNum: 1 | 2) => {
    if (!diceState.rolled) return;

    const dirVal = (dieNum === 1 ? diceState.die1 : diceState.die2) as DirectionIndex;
    const distVal = dieNum === 1 ? diceState.die2 : diceState.die1;

    setDiceState((prev) => ({
      ...prev,
      chosenDirectionDie: dieNum,
      assignedDirection: dirVal,
      assignedDistance: distVal,
    }));

    setSelectedDirection(dirVal);

    // Reset deviation to straight line in newly assigned direction
    setDeviationState({
      active: false,
      usedThisTurn: false,
      type: 'none',
      pivotIndex: null,
      overrideDirection: dirVal,
      step1Distance: Math.max(1, Math.floor(distVal / 2)),
      step1Direction: dirVal,
      step2Distance: Math.max(1, distVal - Math.floor(distVal / 2)),
      step2Direction: (dirVal % 6 + 1) as DirectionIndex,
    });

    sounds.playClick();
    setStatusMessage(
      `Selected Die ${dieNum} (${dirVal} ${DIRECTION_LABELS[dirVal].short}) for DIRECTION. Distance is automatically ${distVal} hexes.`
    );
  };

  // Clicking a tile on the highlighted path triggers deviation pivot at that tile!
  // "You can press anywhere on that line to use a deviation. So in direction 2, distance 6, if you press on the 4th hex in the line, it highlights that you can use the last 2 spaces of direction in any direction"
  const handlePathTileClick = (coord: HexCoord, stepIndex: number) => {
    if (!diceState.rolled) return;

    const totalDistance = Math.min(diceState.assignedDistance, energy);
    // stepIndex === -1 means deviate right from current location (0 steps in original direction)
    const step1Dist = stepIndex === -1 ? 0 : stepIndex + 1; // 1-based distance traveled before deviation
    const remainingDistance = totalDistance - step1Dist;

    if (remainingDistance <= 0) {
      // User tapped the end of the line: confirm or show message
      setStatusMessage(
        `Final destination of move (${coord.col}, ${coord.row}). Click 'CONFIRM MOVE' to step here, or tap an earlier hex on the line to deviate.`
      );
      return;
    }

    // Default branch direction: turn clockwise from current direction
    const currentDir = diceState.assignedDirection;
    const defaultBranchDir = ((currentDir % 6) + 1) as DirectionIndex;

    setDeviationState({
      active: true,
      usedThisTurn: true,
      type: 'split_path',
      pivotIndex: stepIndex,
      overrideDirection: currentDir,
      step1Distance: step1Dist,
      step1Direction: currentDir,
      step2Distance: remainingDistance,
      step2Direction: defaultBranchDir,
    });

    sounds.playClick();
    if (stepIndex === -1) {
      setStatusMessage(
        `Deviation set from current location! You have all ${remainingDistance} spaces to turn in any direction. Tap any branch arrow on the map to choose your direction!`
      );
    } else {
      setStatusMessage(
        `Deviation set at hex ${step1Dist}! You have ${remainingDistance} space${remainingDistance !== 1 ? 's' : ''} left. Tap any branch arrow on the map to choose your new direction!`
      );
    }
  };

  // Select which direction to turn from the deviation pivot point
  const handleSelectDeviationBranch = (dir: DirectionIndex) => {
    setDeviationState((prev) => ({
      ...prev,
      active: true,
      type: 'split_path',
      step2Direction: dir,
    }));
    sounds.playClick();
    setStatusMessage(
      `Deviation turned towards ${DIRECTION_LABELS[dir].short}! Path updated. Tap 'Confirm Move' to step.`
    );
  };

  // Reset deviation back to straight path
  const handleResetDeviation = () => {
    setDeviationState((prev) => ({
      ...prev,
      active: false,
      usedThisTurn: false,
      type: 'none',
      pivotIndex: null,
    }));
    sounds.playClick();
    setStatusMessage(
      `Deviation cleared: Using straight rolled path (${diceState.assignedDistance} hexes towards ${DIRECTION_LABELS[diceState.assignedDirection].short}).`
    );
  };

  // Calculate Movement Path Preview
  const pathPreview = useMemo(() => {
    if (!diceState.rolled) return [];

    const effectiveDist = Math.min(diceState.assignedDistance, energy);
    if (effectiveDist <= 0) return [];

    if (deviationState.active && deviationState.type === 'split_path') {
      const s1 = Math.min(deviationState.step1Distance, effectiveDist);
      const s2 = Math.min(deviationState.step2Distance, effectiveDist - s1);
      return traceSplitPath(
        playerCoord,
        deviationState.step1Direction,
        s1,
        deviationState.step2Direction,
        s2
      );
    } else {
      const dir = deviationState.active ? selectedDirection : diceState.assignedDirection;
      return tracePath(playerCoord, dir, effectiveDist);
    }
  }, [
    diceState.rolled,
    diceState.assignedDistance,
    diceState.assignedDirection,
    energy,
    deviationState,
    selectedDirection,
    playerCoord,
  ]);

  // Reveal a tile and handle landmarks
  const revealTileAt = (coord: HexCoord, currentTiles: Map<string, HexTile>): HexTile | null => {
    const key = `${coord.col},${coord.row}`;
    const tile = currentTiles.get(key);
    if (!tile) return null;

    if (!tile.revealed) {
      tile.revealed = true;
      sounds.playTileReveal();
    }

    // Cairns activate when revealed or passed over, showing rough direction to the goal
    if (tile.type === 'clue_cairn') {
      tile.activated = true;
      if (!tile.cairnBearing) {
        tile.cairnBearing = getCompassDirection(coord, mapData.goalCoord);
      }
      setGoalClue(tile.cairnBearing);
    }

    return tile;
  };

  // Execute Move along a sequence of steps
  const executeMoveTo = (steps: HexCoord[], isFreeMove?: boolean) => {
    if (steps.length === 0) return;
    if (energy <= 0 && !isFreeMove) return;

    const destination = steps[steps.length - 1];
    const energyCost = isFreeMove ? 0 : steps.length;

    sounds.playStep();

    if (isFreeMove) {
      setFreeMoves((prev) => Math.max(0, prev - 1));
    }

    // Update map tiles along path and at destination
    const updatedTiles = new Map(mapData.tiles);

    // Reveal intermediate and destination tiles passed through, activate cairns, and apply bog hazard penalties
    let activatedCairnClue: string | null = null;
    let bogPenalty = 0;
    let bogsTraversedCount = 0;
    const bogCoordsTraversed: HexCoord[] = [];

    for (const step of steps) {
      const t = updatedTiles.get(`${step.col},${step.row}`);
      if (t) {
        t.revealed = true;

        // Peat Bogs apply their penalty when passed over (without having to land on them)
        if (t.type === 'bog_hazard' && !t.activated) {
          const penalty = Math.abs(t.value || 1);
          bogPenalty += penalty;
          bogsTraversedCount++;
          bogCoordsTraversed.push(step);
          t.activated = true;
        }

        // Hexes reveal, and cairns activate when revealed or passed over
        if (t.type === 'clue_cairn') {
          t.activated = true;
          if (!t.cairnBearing) {
            t.cairnBearing = getCompassDirection({ col: t.col, row: t.row }, mapData.goalCoord);
          }
          activatedCairnClue = t.cairnBearing;
          setGoalClue(t.cairnBearing);
          sounds.playBonus();
        }
      }
    }

    if (bogPenalty > 0) {
      sounds.playHazard();
    }

    // Spend energy: steps distance cost + any bog traversal penalty
    const remainingEnergy = Math.max(0, energy - energyCost - bogPenalty);
    setEnergy(remainingEnergy);

    // If exhausted, reveal the goal hex on the map immediately!
    if (remainingEnergy <= 0) {
      const goalKey = `${mapData.goalCoord.col},${mapData.goalCoord.row}`;
      const gTile = updatedTiles.get(goalKey);
      if (gTile) {
        gTile.revealed = true;
      }
      isPendingExhaustionRef.current = true;
    } else {
      isPendingExhaustionRef.current = false;
    }

    // Land on destination
    const destTile = updatedTiles.get(`${destination.col},${destination.row}`);
    if (destTile) {
      destTile.visited = true;
      destTile.revealed = true;
    }

    setPlayerCoord(destination);
    setMapData((prev) => ({ ...prev, tiles: updatedTiles }));

    // Advance turn and reset dice for next roll
    setTurn((prev) => prev + 1);
    setDiceState((prev) => ({ ...prev, rolled: false }));
    setDeviationState((prev) => ({
      ...prev,
      active: false,
      usedThisTurn: false,
      type: 'none',
    }));
    setIsMoveOne(false);

    // Check Destination interactions (hazards, shrines, caches, and towers only activate when landed on)
    if (!destTile) return;

    // 1. Goal Hex Reached - Level 1 Complete! Secret Tunnel Entrance Located
    if (destTile.type === 'goal') {
      sounds.playVictory();
      setLevel1Turns(turn);
      setShowLevelTransitionModal(true);
      isPendingExhaustionRef.current = false;
      setStatusMessage('SECRET TUNNEL LOCATED! Prepare to descend into Level 2 Underground Tunnels!');
      return;
    }

    // 2. Watchtower Reached
    if (destTile.type === 'tower') {
      sounds.playTower();
      const towerRevealed = getTowerRevealedCoords(destination, hasTelescope);
      for (const n of towerRevealed) {
        const nt = updatedTiles.get(`${n.col},${n.row}`);
        if (nt) {
          nt.revealed = true;
          if (nt.type === 'clue_cairn') {
            nt.activated = true;
            if (!nt.cairnBearing) {
              nt.cairnBearing = getCompassDirection(n, mapData.goalCoord);
            }
          }
        }
      }
      // Reveal locations of all other towers
      setKnownTowers(mapData.towerCoords);
      setVisitedTowerCount((prev) => prev + 1);
      const scopeMsg = hasTelescope
        ? 'Telescope Active: Revealed all 6 rays across the map!'
        : 'Adjacent lands & 6 directional sights revealed!';
      const bogMsg = bogPenalty > 0 ? ` (Slogged through bog: -${bogPenalty} ⚡)` : '';
      setStatusMessage(`Tower beacon activated! ${scopeMsg}${bogMsg} All towers mapped!`);
      setEventPrompt({
        title: 'Ancient Watchtower Reached!',
        category: 'Landmark',
        description: hasTelescope
          ? 'You scale the stone watchtower! Using your Brass Telescope, your line of sight pierces the fog along all 6 directions (NW, N, NE, SE, S, SW) to the edge of the realm! All watchtowers across the realm are now charted.'
          : 'You scale the ancient stone watchtower and look out over the expanse! The fog has lifted from all adjacent hexes and the 6 hexes in the NW, N, NE, SE, S, and SW directions. All watchtowers across the realm are now charted onto your map.',
        type: 'tower',
        coord: destination,
        statBadge: hasTelescope
          ? '🔭 Telescope View: All 6 Rays Revealed • All Towers Mapped'
          : 'Adjacent + 6 Sights Revealed • All Towers Mapped',
      });
      return;
    }

    // 3. Energy Cache Reached
    if (destTile.type === 'energy_cache') {
      sounds.playBonus();
      const bonus = destTile.value || 1;
      const newE = Math.min(remainingEnergy + bonus, MAX_ENERGY);
      setEnergy(newE);
      destTile.type = 'blank';
      if (newE > 0) {
        isPendingExhaustionRef.current = false;
      }
      const bogMsg = bogPenalty > 0 ? ` (Slogged through bog: -${bogPenalty} ⚡)` : '';
      setStatusMessage(`Discovered fresh spring rations! Restored +${bonus} Energy.${bogMsg}`);
      setEventPrompt({
        title: 'Energy Cache Uncovered!',
        category: 'Discovery',
        description:
          bonus >= 3
            ? 'An abundant subterranean cache overflowing with pure spring water and dried rations! Your expedition recovers +3 Energy.'
            : bonus === 2
            ? 'A supply depot tucked into the hollow of an ancient tree. Fresh spring water and rations restore +2 Energy.'
            : 'You discovered a secluded freshwater spring and rations. Your expedition draws fresh strength (+1 Energy).',
        type: 'cache',
        coord: destination,
        statBadge: `+${bonus} Energy Restored!`,
      });
      return;
    }

    // 4. Fortune Shrine Reached
    if (destTile.type === 'luck_shrine') {
      setEventPrompt({
        title: 'Fortune Shrine Discovered',
        category: 'Discovery',
        description:
          'You kneel before an ancient violet crystalline altar. Roll the Fate D6 to receive an ancient blessing:\n• 1 Pip: Free Move 1 Hex (Step into any adjacent hex for 0 ⚡)\n• 2 Pips: Brass Telescope (Future towers reveal all 6 directions to map edge)\n• 3 Pips: Dice Modifier (±1 to either die each turn)\n• 4 Pips: Free Move 1 Hex & +2 Energy\n• 5 Pips: Brass Telescope & +2 Energy\n• 6 Pips: Dice Modifier & +2 Energy',
        type: 'shrine',
        coord: destination,
        statBadge: 'Fate D6: Free Move, Telescope, Dice Modifier, +2 Energy',
      });
      destTile.type = 'blank';
      return;
    }

    // 5. Peat Bog Hazard Reached (destination was a bog)
    const destinationWasBog = bogCoordsTraversed.some(
      (c) => c.col === destination.col && c.row === destination.row
    );
    if (destinationWasBog) {
      setStatusMessage(`Trapped in muddy peat bog! Lost -${bogPenalty} Energy.`);
      setEventPrompt({
        title: 'Peat Bog Hazard!',
        category: 'Hazard',
        description:
          'Treacherous sludge and sucking mud engulf your boots! Slogging through the treacherous bog consumes precious reserves.',
        type: 'bog',
        coord: destination,
        statBadge: `-${bogPenalty} Energy Sapped!`,
      });
      return;
    }

    // 6. Arcane Rift Hazard Reached
    if (destTile.type === 'rift_hazard') {
      sounds.playHazard();
      setEventPrompt({
        title: 'Arcane Bramble Rift!',
        category: 'Hazard',
        description:
          'Thorned crystalline rifts surge from the earth! Roll the Fate Die: Odd inflicts -2 Energy penalty, Even lets you escape unharmed.',
        type: 'rift',
        coord: destination,
        statBadge: 'Fate Test: Odd = -2 Energy, Even = Safe',
      });
      destTile.type = 'blank';
      return;
    }

    // 7. Clue Cairn Reached
    if (destTile.type === 'clue_cairn') {
      sounds.playBonus();
      destTile.activated = true;
      if (!destTile.cairnBearing) {
        destTile.cairnBearing = getCompassDirection(destination, mapData.goalCoord);
      }
      setGoalClue(destTile.cairnBearing);
      const bogMsg = bogPenalty > 0 ? ` (Slogged through bog: -${bogPenalty} ⚡)` : '';
      setStatusMessage(`Ancient Cairn reached! Inscription: "The Secret Tunnel Entrance lies to the ${destTile.cairnBearing}."${bogMsg} Possible goal spaces updated!`);
      setEventPrompt({
        title: 'Ancient Stone Cairn Reached',
        category: 'Discovery',
        description: `You examine the mysterious stacked stones and decipher the ancient runic carvings: "The Secret Tunnel Entrance lies to the ${destTile.cairnBearing}."\n\nPossible secret tunnel spaces have been highlighted and narrowed down across the map!`,
        type: 'clue',
        coord: destination,
        statBadge: `Compass Bearing: ${destTile.cairnBearing}`,
      });
      return;
    }

    // 8. Base Camp Reached
    if (destTile.type === 'start') {
      const bogMsg = bogPenalty > 0 ? ` (Slogged through bog: -${bogPenalty} ⚡)` : '';
      setStatusMessage(`Expedition Base Camp. You are back at the start post.${bogMsg}`);
      setEventPrompt({
        title: 'Base Expedition Camp',
        category: 'Landmark',
        description:
          'You have returned to your expedition base camp. Sturdy wooden shelters and survey equipment remain stationed here.',
        type: 'start',
        coord: destination,
        statBadge: 'Expedition Origin',
      });
      return;
    }

    // 9. If one or more bogs were traversed along the path to an ordinary wilderness hex
    if (bogsTraversedCount > 0) {
      const cairnMsg = activatedCairnClue ? ` Activated Cairn along path: Secret Tunnel lies to the ${activatedCairnClue}!` : '';
      setStatusMessage(
        `Slogged through peat bog (-${bogPenalty} ⚡)! Energy: ${remainingEnergy}/${MAX_ENERGY}.${cairnMsg}`
      );
      setEventPrompt({
        title: bogsTraversedCount > 1 ? 'Peat Bogs Traversed!' : 'Peat Bog Traversed!',
        category: 'Hazard',
        description:
          bogsTraversedCount > 1
            ? `You slogged through ${bogsTraversedCount} treacherous peat bogs along your journey! Sucking mud and thick muck sapped an extra -${bogPenalty} Energy.`
            : 'You slogged through a treacherous peat bog along your journey! Sucking mud and thick muck sapped an extra -1 Energy.',
        type: 'bog',
        coord: bogCoordsTraversed[0],
        statBadge: `-${bogPenalty} Energy Sapped!`,
      });
      return;
    }

    // Standard move message (no bogs traversed, destination is blank wilderness)
    const cairnMsg = activatedCairnClue ? ` Activated Cairn along path: Secret Tunnel lies to the ${activatedCairnClue}!` : '';
    setStatusMessage(
      `Moved to (${destination.col}, ${destination.row}). Energy: ${remainingEnergy}/${MAX_ENERGY}.${cairnMsg} Roll for your next move.`
    );

    // Check Energy Exhaustion
    if (remainingEnergy <= 0) {
      triggerExhaustionSequence(updatedTiles);
    }
  };

  // Trigger move along current planned path
  const handleExecuteMove = () => {
    if (!diceState.rolled || pathPreview.length === 0 || energy <= 0) return;
    executeMoveTo(pathPreview);
  };

  // Resolve Fate Event Roll from Shrine or Rift
  const handleResolveEvent = (rollResult?: number) => {
    if (!eventPrompt) return;

    let riftExhausted = false;

    if (eventPrompt.type === 'shrine' && rollResult) {
      switch (rollResult) {
        case 1: {
          sounds.playBonus();
          setFreeMoves((prev) => prev + 1);
          setStatusMessage('Free Move blessing acquired! You can step into an adjacent hex for 0 Energy (FREE ⚡)!');
          break;
        }
        case 2: {
          sounds.playBonus();
          setHasTelescope(true);
          setStatusMessage('Brass Telescope acquired! Future watchtowers will reveal all tiles in all 6 directions to grid boundaries.');
          break;
        }
        case 3: {
          sounds.playBonus();
          setHasDiceModifier(true);
          setStatusMessage('Dice Modifier blessing acquired! You can now adjust either movement die by ±1 every turn.');
          break;
        }
        case 4: {
          sounds.playBonus();
          setFreeMoves((prev) => prev + 1);
          setEnergy((prev) => Math.min(prev + 2, MAX_ENERGY));
          isPendingExhaustionRef.current = false;
          setStatusMessage('Free Move blessing & +2 Energy! You can step into an adjacent hex for 0 ⚡, and restored +2 Energy!');
          break;
        }
        case 5: {
          sounds.playBonus();
          setHasTelescope(true);
          setEnergy((prev) => Math.min(prev + 2, MAX_ENERGY));
          isPendingExhaustionRef.current = false;
          setStatusMessage('Brass Telescope & +2 Energy! Future watchtowers reveal all 6 directions, and restored +2 Energy!');
          break;
        }
        case 6: {
          sounds.playBonus();
          setHasDiceModifier(true);
          setEnergy((prev) => Math.min(prev + 2, MAX_ENERGY));
          isPendingExhaustionRef.current = false;
          setStatusMessage('Dice Modifier & +2 Energy! You can now adjust either die by ±1 every turn, and restored +2 Energy!');
          break;
        }
      }
    } else if (eventPrompt.type === 'rift' && rollResult) {
      if (rollResult % 2 !== 0) {
        sounds.playHazard();
        setEnergy((prev) => {
          const next = Math.max(0, prev - 2);
          if (next <= 0) {
            riftExhausted = true;
          }
          return next;
        });
        setStatusMessage('Entangled in brambles! Lost -2 Energy.');
      } else {
        sounds.playBonus();
        setStatusMessage('Evaded the thorny rift safely without penalty!');
      }
    } else if (eventPrompt.type === 'tunnel_trap' && rollResult) {
      if (rollResult % 2 !== 0) {
        sounds.playHazard();
        setEnergy((prev) => {
          const next = Math.max(0, prev - 2);
          if (next <= 0) {
            sounds.playHazard();
            setIsLost(true);
            setStatusMessage('Trap damage exhausted your remaining energy! Underground delve lost.');
          }
          return next;
        });
        setStatusMessage(`Trap sprang! Rolled ${rollResult} (Odd) - lost -2 Energy. Chamber cleared! Draw a new Delve Card to reveal exits.`);
      } else {
        sounds.playBonus();
        setStatusMessage(`Trap evaded! Rolled ${rollResult} (Even) - sprang aside without harm! Chamber cleared! Draw a new Delve Card to reveal exits.`);
      }
    } else if (eventPrompt.type === 'tunnel_treasure' && rollResult) {
      sounds.playBonus();
      setEnergy((prev) => Math.min(prev + rollResult, MAX_ENERGY));
      setStatusMessage(`Ancient Vault opened! Rolled ${rollResult} - restored +${rollResult} Energy. Chamber cleared! Draw a new Delve Card to reveal exits.`);
    }

    const wasPending = isPendingExhaustionRef.current;
    setEventPrompt(null);

    // If expedition is exhausted, reveal the goal hex on the map and show game over popup after delay
    if (wasPending || riftExhausted) {
      triggerExhaustionSequence(undefined, 1800);
    }
  };

  // Toggle Free Move 1 Hex Mode (only available when granted by Fortune Shrine)
  const handleToggleMoveOne = () => {
    if (freeMoves <= 0) {
      setIsMoveOne(false);
      return;
    }
    setIsMoveOne((prev) => !prev);
    if (!isMoveOne) {
      setStatusMessage(
        `Free Move Active (${freeMoves} free move${freeMoves > 1 ? 's' : ''} available): Tap any directly adjacent hex to step into it for FREE (0 ⚡).`
      );
    } else {
      setStatusMessage('Free Move cancelled.');
    }
  };

  // Click on a Hex (handles Free Move 1 if active, or triggers tile info pop-up inspection)
  const handleTileClick = (coord: HexCoord) => {
    const tileKey = `${coord.col},${coord.row}`;
    const tile = mapData.tiles.get(tileKey);

    if (isMoveOne) {
      if (freeMoves <= 0) {
        setIsMoveOne(false);
        setStatusMessage('No free moves available!');
        return;
      }

      const neighbors = getAllNeighbors(playerCoord);
      const isAdjacent = neighbors.some((n) => n.col === coord.col && n.row === coord.row);

      if (!isAdjacent) {
        setStatusMessage('Can only move into a directly adjacent hex next to your pawn!');
        return;
      }

      // Exit Move 1 mode and step immediately into target hex (costs 0 energy, consumes 1 freeMove charge)
      setIsMoveOne(false);
      executeMoveTo([coord], true);
      return;
    }

    // Tile Info Pop-up when clicking a tile
    if (!tile) return;
    sounds.playClick();

    // 1. Unrevealed / Fogged tile
    if (!tile.revealed) {
      const isKnownTower = knownTowers.some((t) => t.col === coord.col && t.row === coord.row);
      if (isKnownTower) {
        setEventPrompt({
          title: 'Charted Watchtower',
          category: 'Tile Inspection',
          description:
            'A distant watchtower mapped during a wilderness survey. Shrouded in fog of war. Move to this hex to scale its high ramparts and unveil all 6 adjacent hexes.',
          type: 'tower',
          coord,
          statBadge: 'Known Watchtower (Unvisited)',
        });
      } else {
        setEventPrompt({
          title: 'Uncharted Territory',
          category: 'Tile Inspection',
          description:
            'This region is shrouded in dense fog. You can scout it using the "Scout Adjacent Hex" action (-1 ⚡) if next to your pawn, or roll and move through it to explore.',
          type: 'info',
          coord,
          statBadge: 'Fog of War',
        });
      }
      return;
    }

    // 2. Revealed tile inspection
    switch (tile.type) {
      case 'tower':
        setEventPrompt({
          title: 'Ancient Watchtower',
          category: 'Tile Inspection',
          description: hasTelescope
            ? 'A fortified stone observation post. With your Brass Telescope, landing here reveals all adjacent hexes PLUS all hexes in the NW, N, NE, SE, S, and SW directions to the edges of the map, and charts all watchtowers.'
            : 'A fortified stone observation post. Landing directly on this hex lifts the fog from all adjacent hexes and the 6 hexes in the NW, N, NE, SE, S, SW directions, and marks the locations of all 10 watchtowers across the realm.',
          type: 'tower',
          coord,
          statBadge: tile.visited
            ? 'Visited Watchtower'
            : hasTelescope
            ? 'Active Watchtower (Telescope View)'
            : 'Active Watchtower (Unvisited)',
        });
        break;

      case 'energy_cache':
        setEventPrompt({
          title: 'Energy Cache',
          category: 'Tile Inspection',
          description: `A hidden natural spring and emergency food rations. Landing directly on this hex restores +${tile.value || 1} Energy to your expedition reserves.`,
          type: 'cache',
          coord,
          statBadge: `Restores +${tile.value || 1} Energy on Landing`,
        });
        break;

      case 'bog_hazard':
        setEventPrompt({
          title: tile.activated ? 'Peat Bog (Traversed)' : 'Peat Bog Hazard',
          category: 'Tile Inspection',
          description: tile.activated
            ? 'Waterlogged peat and mud that your expedition has already slogged through. The sucking mud was crossed (-1 Energy previously paid), and it is now safe to traverse.'
            : 'Deep waterlogged peat moss and sucking mire. Passing over or landing on this hex costs an extra -1 Energy penalty to pull your boots free.',
          type: 'bog',
          coord,
          statBadge: tile.activated ? 'Traversed: Safe to Cross' : 'Hazard: -1 Energy on Crossing',
        });
        break;

      case 'rift_hazard':
        setEventPrompt({
          title: 'Arcane Bramble Rift',
          category: 'Tile Inspection',
          description:
            'A hazardous tear in the earth tangled with jagged crystal brambles. Landing here forces a Fate D6 roll (Odd = -2 Energy penalty, Even = Safe escape).',
          type: 'rift',
          coord,
          statBadge: 'Hazard: Fate D6 Roll on Landing',
        });
        break;

      case 'luck_shrine':
        setEventPrompt({
          title: 'Fortune Shrine',
          category: 'Tile Inspection',
          description:
            'A mystical shrine sculpted from resonant violet crystal. Landing directly on this hex triggers a Fate D6 roll for 1 of 6 blessings:\n• 1 Pip: Free Move 1 Hex (0 ⚡)\n• 2 Pips: Brass Telescope (Towers reveal all 6 rays)\n• 3 Pips: Dice Modifier (±1 to either die each turn)\n• 4 Pips: Free Move 1 Hex & +2 Energy\n• 5 Pips: Brass Telescope & +2 Energy\n• 6 Pips: Dice Modifier & +2 Energy',
          type: 'shrine',
          coord,
          statBadge: 'Landmark: Fate D6 Roll on Landing',
        });
        break;

      case 'clue_cairn':
        setEventPrompt({
          title: 'Ancient Clue Cairn',
          category: 'Tile Inspection',
          description: tile.cairnBearing
            ? `Stacked river stones etched with wind runes pointing to the Secret Tunnel: "The Secret Tunnel lies to the ${tile.cairnBearing}."`
            : 'Stacked stone cairn. Activates when passed over or landed on, whispering the rough compass bearing to the Secret Tunnel Entrance.',
          type: 'clue',
          coord,
          statBadge: tile.cairnBearing ? `Points: ${tile.cairnBearing}` : 'Activates when visited or traversed',
        });
        break;

      case 'start':
        setEventPrompt({
          title: 'Base Expedition Camp',
          category: 'Tile Inspection',
          description:
            'The starting headquarters for your expedition. Safe staging post where your journey into the hexagonal wilderness began.',
          type: 'start',
          coord,
          statBadge: 'Expedition Origin',
        });
        break;

      case 'goal':
        setEventPrompt({
          title: 'Secret Tunnel Entrance',
          category: 'Tile Inspection',
          description:
            'A concealed subterranean archway leading into the ancient tunnel network. Stepping onto this hex completes your expedition with a victorious escape!',
          type: 'info',
          coord,
          statBadge: 'Primary Objective: Secret Tunnel Entrance',
        });
        break;

      case 'blank':
      default:
        setEventPrompt({
          title: 'Wilderness Hex',
          category: 'Tile Inspection',
          description:
            'Open wilderness terrain. Standard travel cost is 1 Energy per hex. Free of hazards and special landmark effects.',
          type: 'info',
          coord,
          statBadge: tile.visited ? 'Already Traversed' : 'Charted Ground',
        });
        break;
    }
  };

  // --- LEVEL 2: UNDERGROUND TUNNELS LOGIC ---

  // Descend to Level 2
  const handleDescendToLevel2 = () => {
    sounds.playBonus();
    setCurrentLevel(2);
    setShowLevelTransitionModal(false);
    setShowLevel2VictoryModal(false);
    setReviewingMap(false);
    setIsWon(false);
    setIsLost(false);
    setDiceState((prev) => ({ ...prev, rolled: false }));

    const newTunnelDeck = createShuffledHeartsDeck();
    const newTunnelMap = createTunnelMap(newTunnelDeck);

    // Initialise 39-card Exploration Deck (♠, ♣, ♦) and draw non-honor starting card
    const freshExpDeck = createExplorationDeck();
    const { card: initialBaseCard, remainingDeck: afterInitDeck } =
      drawInitialComparisonCard(freshExpDeck);

    setExplorationDeck(afterInitDeck);
    setComparisonCard(initialBaseCard);
    setDrawnExplorationCard(null);
    setExplorationStreak(0);
    setPendingExplorationChoice(null);
    setExplorationResultText(
      `Starting exploration card established: ${initialBaseCard.rank} of ${initialBaseCard.suit}.`
    );

    // Initial state: Adventurer begins at starting chamber (5, 11), prompted to draw first delve card
    setTunnelMap(newTunnelMap);
    setCurrentTunnelHeading(2);
    setLevel2Steps(0);
    setLevel2CardsDrawn(0);
    setLevel2TargetFound(false);
    setStatusMessage(
      `Descended into Level 2: The Underground Tunnels! Base card is ${initialBaseCard.rank}${initialBaseCard.suit}. Draw a Hearts Delve Card to survey entry chamber and carve corridor exits.`
    );
  };

  // Check if player in Level 2 can manually draw Hearts Delve card
  const canDrawTunnelCard = useMemo(() => {
    if (
      currentLevel !== 2 ||
      isWon ||
      isLost ||
      Boolean(eventPrompt) ||
      pendingExplorationChoice !== null
    )
      return false;
    const currentKey = `${tunnelMap.playerCoord.col},${tunnelMap.playerCoord.row}`;
    const tile = tunnelMap.tiles.get(currentKey);
    return Boolean(
      tile &&
      !tile.exitsCarved &&
      !tile.isDeadEnd &&
      !tile.isTarget &&
      tunnelMap.deck.length > 0
    );
  }, [currentLevel, isWon, isLost, tunnelMap, eventPrompt, pendingExplorationChoice]);

  // Interactive exits available from current player tile in Level 2
  // When in an unsurveyed chamber or awaiting delve card draw (after enter or after JQK),
  // the ONLY action is to Draw Delve Card. Exits are inactive until card is drawn!
  const tunnelInteractiveExits = useMemo(() => {
    if (currentLevel !== 2 || isWon || isLost || canDrawTunnelCard) return [];
    const currentKey = `${tunnelMap.playerCoord.col},${tunnelMap.playerCoord.row}`;
    const currentTile = tunnelMap.tiles.get(currentKey);
    if (!currentTile) return [];

    const allExits: HexCoord[] = [];
    const visitedExitKeys = new Set<string>();

    for (const dir of currentTile.connections) {
      const neighbor = getOrganicNeighbor(tunnelMap.playerCoord, dir);
      const neighborKey = `${neighbor.col},${neighbor.row}`;
      const neighborTile = tunnelMap.tiles.get(neighborKey);
      if (!neighborTile || neighborTile.status !== 'lit') continue;

      // If neighbor is an intermediate hallway, follow it to the chamber!
      const dest = neighborTile.isHallway
        ? getDestinationThroughHallway(tunnelMap.playerCoord, neighbor, tunnelMap.tiles)
        : neighbor;

      const destKey = `${dest.col},${dest.row}`;
      const destTile = tunnelMap.tiles.get(destKey);
      if (destTile && destTile.status === 'lit' && !visitedExitKeys.has(destKey)) {
        visitedExitKeys.add(destKey);
        allExits.push(dest);
      }
    }

    // Include all forward exits and retreat exits (allow going back where you came from)
    const forwardExits: HexCoord[] = [];
    const retreatExits: HexCoord[] = [];

    for (const exit of allExits) {
      const exitKey = `${exit.col},${exit.row}`;
      const exitTile = tunnelMap.tiles.get(exitKey);
      if (exitTile && !exitTile.isDeadEnd) {
        if (!exitTile.visited || exitTile.isTarget) {
          forwardExits.push(exit);
        } else {
          // Allow retracing back into previously visited corridor/chamber
          retreatExits.push(exit);
        }
      }
    }

    // Both forward and retreat options are provided so the player can always retrace
    return [...forwardExits, ...retreatExits];
  }, [currentLevel, tunnelMap.playerCoord, tunnelMap.tiles, isWon, isLost, canDrawTunnelCard]);

  // Count of illuminated / explored tunnel tiles
  const litTunnelCount = useMemo(() => {
    let count = 0;
    for (const t of tunnelMap.tiles.values()) {
      if (t.status === 'lit') count++;
    }
    return count;
  }, [tunnelMap.tiles]);

  // Click on a tile in Level 2 (step into lit exit or dead-end retrace)
  const handleTunnelTileClick = (targetCoord: HexCoord) => {
    if (currentLevel !== 2 || isWon || isLost) return;

    if (canDrawTunnelCard) {
      setStatusMessage('Unsurveyed chamber! Tap "Draw Delve Card" below to carve corridor exits.');
      return;
    }

    // If user clicked directly on an intermediate hallway tile, resolve it to the destination chamber
    let resolvedTarget = targetCoord;
    const clickedTile = tunnelMap.tiles.get(`${targetCoord.col},${targetCoord.row}`);
    if (clickedTile && clickedTile.isHallway) {
      resolvedTarget = getDestinationThroughHallway(tunnelMap.playerCoord, targetCoord, tunnelMap.tiles);
    }

    // Check if target is one of the interactive exits
    const isExit = tunnelInteractiveExits.some(
      (e) => e.col === resolvedTarget.col && e.row === resolvedTarget.row
    );
    if (!isExit) {
      if (
        resolvedTarget.col === tunnelMap.playerCoord.col &&
        resolvedTarget.row === tunnelMap.playerCoord.row
      ) {
        setStatusMessage(
          'Current adventurer position. Step into an illuminated corridor exit (-1 ⚡).'
        );
      } else {
        setStatusMessage('That corridor is not accessible from your current chamber!');
      }
      return;
    }

    // Step costs 1 Energy
    if (energy <= 0) {
      sounds.playHazard();
      setIsLost(true);
      setStatusMessage('Energy exhausted in the subterranean dark! The underground labyrinth claims another delve.');
      return;
    }

    const nextEnergy = Math.max(0, energy - 1);
    setEnergy(nextEnergy);

    // Compute heading direction from current playerCoord to resolvedTarget and find any intermediate hallway
    let moveDir: DirectionIndex = 2;
    let intermediateCoord: HexCoord | null = null;
    for (let d = 1; d <= 6; d++) {
      const step1 = getOrganicNeighbor(tunnelMap.playerCoord, d as DirectionIndex);
      if (step1.col === resolvedTarget.col && step1.row === resolvedTarget.row) {
        moveDir = d as DirectionIndex;
        break;
      }
      const step2 = getOrganicNeighbor(step1, d as DirectionIndex);
      if (step2.col === resolvedTarget.col && step2.row === resolvedTarget.row) {
        moveDir = d as DirectionIndex;
        intermediateCoord = step1;
        break;
      }
    }
    setCurrentTunnelHeading(moveDir);

    const updatedTiles = new Map(tunnelMap.tiles);
    if (intermediateCoord) {
      const interKey = `${intermediateCoord.col},${intermediateCoord.row}`;
      const interTile = updatedTiles.get(interKey);
      if (interTile) interTile.visited = true;
    }

    const targetKey = `${resolvedTarget.col},${resolvedTarget.row}`;
    const targetTile = updatedTiles.get(targetKey);
    if (!targetTile) return;

    targetTile.visited = true;
    sounds.playStep();
    setLevel2Steps((prev) => prev + 1);

    // Check if target tile is the grand exit (Ace of Hearts)
    if (targetTile.isTarget) {
      sounds.playVictory();
      setIsWon(true);
      setStatusMessage(
        'VICTORY! You stepped into the Ace of Hearts grand exit archway and escaped to the surface!'
      );
      setTunnelMap((prev) => ({
        ...prev,
        tiles: updatedTiles,
        playerCoord: resolvedTarget,
        activeCard: targetTile.card || prev.activeCard,
      }));
      return;
    }

    // Check if target tile already has carved exits or is a dead end (revisiting / retracing steps)
    if (targetTile.exitsCarved || targetTile.isDeadEnd) {
      if (targetTile.isDeadEnd) {
        setStatusMessage(
          'Dead end reached! Cave-in blocks forward passage. Retrace steps along carved corridors.'
        );
      } else {
        setStatusMessage(
          'Retracing steps through previously surveyed corridor.'
        );
      }

      if (nextEnergy <= 0) {
        sounds.playHazard();
        setIsLost(true);
        setStatusMessage('Energy exhausted in the dark corridors! Delve lost.');
      }

      setTunnelMap((prev) => ({
        ...prev,
        tiles: updatedTiles,
        playerCoord: resolvedTarget,
        activeCard: targetTile.card || prev.activeCard,
      }));
      return;
    }

    // Target tile is an unexplored, uncarved chamber:
    // Prompt the player for the Higher / Lower chamber exploration prediction!
    setDrawnExplorationCard(null);
    setPendingExplorationChoice('higher_lower');
    setExplorationResultText('Predict if the next exploration card is HIGHER or LOWER than your base card!');
    setShowChamberExplorationModal(true);

    if (nextEnergy <= 0) {
      setStatusMessage(
        `⚠️ Entered chamber on your last breath (0⚡)! Predict Higher/Lower on base ${comparisonCard?.rank || ''}${comparisonCard?.suit || ''} to gain energy!`
      );
    } else {
      setStatusMessage(
        `Entered chamber (${resolvedTarget.col}, ${resolvedTarget.row}). Predict Higher or Lower than ${comparisonCard?.rank || ''}${comparisonCard?.suit || ''} in the chamber survey popup!`
      );
    }

    setTunnelMap((prev) => ({
      ...prev,
      tiles: updatedTiles,
      playerCoord: resolvedTarget,
      activeCard: targetTile.card || null,
    }));
  };

  // Manual draw card handler for Level 2 (when player is prompted to draw for uncarved chamber)
  const handleTunnelDrawCard = () => {
    if (
      currentLevel !== 2 ||
      isWon ||
      isLost ||
      Boolean(eventPrompt) ||
      tunnelMap.deck.length === 0
    )
      return;
    const currentKey = `${tunnelMap.playerCoord.col},${tunnelMap.playerCoord.row}`;
    const currentTile = tunnelMap.tiles.get(currentKey);
    if (!currentTile || currentTile.exitsCarved || currentTile.isDeadEnd) return;

    // Dead end rule: "Update the dead end logic so that they can only be drawn if there is more than 1 currently live exit"
    const liveExits = getLiveExits(tunnelMap.tiles);
    const canDrawDeadEnd = liveExits.length > 1;

    const updatedDeck = [...tunnelMap.deck];

    // Determine which card to draw from the deck:
    let cardIndexToDraw = 0;
    const candidateCard = updatedDeck[0];
    if ((candidateCard.rank === '5' || candidateCard.rank === '7') && !canDrawDeadEnd) {
      // Must not draw a dead end if only 1 live exit exists: swap with next non-dead-end card
      const nonDeadEndIdx = updatedDeck.findIndex((c) => c.rank !== '5' && c.rank !== '7');
      if (nonDeadEndIdx !== -1) {
        cardIndexToDraw = nonDeadEndIdx;
      }
    }

    const [nextCard] = updatedDeck.splice(cardIndexToDraw, 1);
    if (!nextCard) return;

    sounds.playCardFlip();
    setTimeout(() => {
      sounds.playBonus();
    }, 320);
    const drawnCount = level2CardsDrawn + 1;
    setLevel2CardsDrawn(drawnCount);

    const updatedTiles = new Map(tunnelMap.tiles);

    const carveResult = carveCorridorsForTile(
      updatedTiles,
      tunnelMap.playerCoord,
      nextCard,
      currentTunnelHeading
    );

    if (nextCard.effect === 'target') {
      setLevel2TargetFound(true);
      setStatusMessage(
        `THE ACE OF HEARTS! The grand subterranean exit archway is revealed at (${carveResult.targetCoord?.col ?? '?'}, ${carveResult.targetCoord?.row ?? '?'})! Move into the archway to escape and win!`
      );
    } else if (nextCard.effect === 'trap') {
      sounds.playHazard();
      setEventPrompt({
        title: 'Subterranean Trap Chamber! (J♥)',
        category: 'Hazard',
        description:
          'A pressure plate clicks! Spring-loaded scythe blades slice from the dark walls. Roll the Fate Die: Odd = -2 Energy, Even = Safe dodge! After resolving, tap Draw Delve Card to continue.',
        type: 'tunnel_trap',
        coord: tunnelMap.playerCoord,
        statBadge: 'J♥ Trap: Odd = -2 ⚡, Even = Safe',
      });
      setStatusMessage(
        'Drawn Jack of Hearts — Trap Chamber! Dodge the blades, then Draw Delve Card!'
      );
    } else if (nextCard.effect === 'treasure') {
      sounds.playBonus();
      setEventPrompt({
        title: `Ancient Treasure Vault! (${nextCard.rank}♥)`,
        category: 'Discovery',
        description:
          'You uncover an ancient stone strongbox glowing with subterranean mana! Roll the Fate Die to restore 1 to 6 Energy. After resolving, tap Draw Delve Card to continue.',
        type: 'tunnel_treasure',
        coord: tunnelMap.playerCoord,
        statBadge: `${nextCard.rank}♥ Vault: Roll D6 for +1 to +6 ⚡`,
      });
      setStatusMessage(
        `Drawn ${nextCard.name} — Treasure Vault discovered! Collect reward, then Draw Delve Card!`
      );
    } else if (nextCard.effect === 'dead_end') {
      sounds.playHazard();
      setStatusMessage(
        `Drawn ${nextCard.name} — Dead end cave-in! Rockfall blocks the passage ahead. Retrace steps back along the corridor.`
      );
      if (energy <= 0) {
        sounds.playHazard();
        setIsLost(true);
        setStatusMessage('Energy exhausted in a subterranean dead end! The delve is lost.');
      }
    } else {
      setStatusMessage(
        `Drawn ${nextCard.name}: ${carveResult.openedCoords.length} corridor exits carved!`
      );
      if (energy <= 0) {
        sounds.playHazard();
        setIsLost(true);
        setStatusMessage('Energy exhausted! With no energy left to explore the newly carved passages, the delve is lost.');
      }
    }

    setTunnelMap((prev) => ({
      ...prev,
      tiles: updatedTiles,
      deck: updatedDeck,
      discard: [...prev.discard, nextCard],
      activeCard: nextCard,
      cardsDrawnCount: drawnCount,
    }));
  };

  // Exploration Deck: Player predicts Higher or Lower when entering a chamber
  const handleExplorationPredict = (prediction: 'higher' | 'lower') => {
    sounds.playCardFlip();
    setActivePrediction(prediction);

    if (explorationDeck.length === 0) {
      // Reshuffle discard or create fresh deck if empty
      const fresh = createExplorationDeck();
      setExplorationDeck(fresh);
    }

    const currentDeck = [...explorationDeck];
    if (currentDeck.length === 0) return;

    const drawn = currentDeck.shift()!;
    setDrawnExplorationCard(drawn);
    setExplorationDeck(currentDeck);

    // If drawn card is Ace of Spades (A♠) -> INSTANT VICTORY / GATEWAY TO LEVEL 3!
    if (drawn.isAceOfSpades) {
      setTimeout(() => {
        sounds.playVictory();
        setLevel2TargetFound(true);
        setShowChamberExplorationModal(false);
        setShowLevel2VictoryModal(true);
      }, 420);
      setPendingExplorationChoice(null);
      setActivePrediction(null);
      setExplorationResultText('♠ ACE OF SPADES REVEALED! The Gateway to Level 3 is open!');
      setStatusMessage('THE ACE OF SPADES! You found the gateway descending to Level 3!');
      return;
    }

    // If drawn card is an Honor card (J, Q, K, or non-Spade Ace):
    // NOTE: Drawing JQKA does NOT affect your streak or your guess!
    if (drawn.isHonor) {
      setTimeout(() => {
        sounds.playBonus();
      }, 320);
      setPendingExplorationChoice('face_gamble');
      setExplorationResultText(
        `Honor card drawn: ${drawn.rank} of ${drawn.suit}! Your "${prediction.toUpperCase()}" call and streak are preserved. Choose: Discard base (${comparisonCard?.rank || ''}${comparisonCard?.suit || ''}) for a fresh card, OR draw again keeping your "${prediction.toUpperCase()}" guess seeking the Ace of Spades (A♠)!`
      );
      setStatusMessage(
        `Honor card ${drawn.rank}${drawn.suit} drawn! Streak & "${prediction.toUpperCase()}" guess preserved.`
      );
      return;
    }

    // Numbered card (2 to 10): Compare against comparisonCard
    const baseVal = comparisonCard ? comparisonCard.value : 7;
    const drawnVal = drawn.value;

    if (drawnVal === baseVal) {
      // Pair / Equal rank: Push, no energy change, streak resets to 0
      setTimeout(() => {
        sounds.playClick();
      }, 320);
      setExplorationStreak(0);
      setComparisonCard(drawn);
      setPendingExplorationChoice(null);
      setActivePrediction(null);
      setExplorationResultText(
        `Pair drawn (${drawn.rank}${drawn.suit} matches ${comparisonCard?.rank || baseVal})! Push — no energy change. Streak reset to 0.`
      );
      setStatusMessage(
        `Exploration: Pair drawn (${drawn.rank}${drawn.suit})! Push. No energy change. Chamber explored!`
      );
    } else {
      const isHigher = drawnVal > baseVal;
      const isCorrect =
        (prediction === 'higher' && isHigher) || (prediction === 'lower' && !isHigher);

      if (isCorrect) {
        // Correct prediction
        setTimeout(() => {
          sounds.playBonus();
        }, 320);
        const nextStreak = explorationStreak >= 0 ? explorationStreak + 1 : 1;
        setExplorationStreak(nextStreak);
        const energyReward = nextStreak;
        setEnergy((prev) => Math.min(prev + energyReward, MAX_ENERGY));
        setComparisonCard(drawn);
        setPendingExplorationChoice(null);
        setActivePrediction(null);
        setExplorationResultText(
          `Correct! ${drawn.rank}${drawn.suit} is ${isHigher ? 'Higher' : 'Lower'} than ${baseVal}. Streak: +${nextStreak} (+${energyReward} ⚡).`
        );
        setStatusMessage(
          `Correct call! Drawn ${drawn.rank}${drawn.suit}. Streak +${nextStreak}: Gained +${energyReward} Energy!`
        );
      } else {
        // Incorrect prediction
        setTimeout(() => {
          sounds.playHazard();
        }, 320);
        const nextStreak = explorationStreak <= 0 ? explorationStreak - 1 : -1;
        setExplorationStreak(nextStreak);
        const energyPenalty = Math.abs(nextStreak);
        const remainingE = Math.max(0, energy - energyPenalty);
        setEnergy(remainingE);
        setComparisonCard(drawn);
        setPendingExplorationChoice(null);
        setActivePrediction(null);
        setExplorationResultText(
          `Wrong call! ${drawn.rank}${drawn.suit} is ${isHigher ? 'Higher' : 'Lower'} than ${baseVal}. Streak: ${nextStreak} (-${energyPenalty} ⚡).`
        );
        setStatusMessage(
          `Wrong call! Drawn ${drawn.rank}${drawn.suit}. Streak ${nextStreak}: Lost -${energyPenalty} Energy!`
        );

        if (remainingE <= 0) {
          setTimeout(() => {
            sounds.playHazard();
            setIsLost(true);
            setStatusMessage('Energy exhausted in the subterranean dark! The delve is lost.');
          }, 420);
        }
      }
    }
  };

  // Honor Card Choice: Discard & Redraw Base vs. Draw Again (keeping guess & streak)
  const handleFaceChoice = (choice: 'discard_redraw' | 'gamble_ace') => {
    sounds.playCardFlip();
    if (choice === 'discard_redraw') {
      // Discard current base card and draw a fresh base comparison card from the exploration deck
      const currentDeck = [...explorationDeck];
      const { card: freshBase, remainingDeck } = drawInitialComparisonCard(currentDeck);
      setExplorationDeck(remainingDeck);
      setComparisonCard(freshBase);
      setDrawnExplorationCard(null);
      setPendingExplorationChoice(null);
      setActivePrediction(null);
      setTimeout(() => {
        sounds.playBonus();
      }, 320);
      setExplorationResultText(
        `Discarded previous base. Fresh base card established: ${freshBase.rank} of ${freshBase.suit}. Streak remains unchanged (${explorationStreak >= 0 ? `+${explorationStreak}` : explorationStreak}).`
      );
      setStatusMessage(
        `Discarded base! New base card: ${freshBase.rank} of ${freshBase.suit}. Streak preserved.`
      );
    } else {
      // Draw Again: keeping guess and streak status against current base card!
      const currentDeck = [...explorationDeck];
      if (currentDeck.length === 0) {
        setExplorationDeck(createExplorationDeck());
      }
      const gambleCard = currentDeck.shift()!;
      setExplorationDeck(currentDeck);
      setDrawnExplorationCard(gambleCard);

      // Check for Ace of Spades (Instant Level 3 Discovery!)
      if (gambleCard.isAceOfSpades) {
        setTimeout(() => {
          sounds.playVictory();
          setLevel2TargetFound(true);
          setShowChamberExplorationModal(false);
          setShowLevel2VictoryModal(true);
        }, 420);
        setPendingExplorationChoice(null);
        setActivePrediction(null);
        setExplorationResultText('♠ ACE OF SPADES DRAWN! Instant Victory and Gateway to Level 3!');
        setStatusMessage('JACKPOT! Ace of Spades drawn on the gamble! Gateway to Level 3 is open!');
        return;
      }

      // If ANOTHER honor card is drawn (e.g. Jack then King or Queen):
      if (gambleCard.isHonor) {
        setTimeout(() => {
          sounds.playBonus();
        }, 320);
        setPendingExplorationChoice('face_gamble');
        const guessLabel = (activePrediction || 'higher').toUpperCase();
        setExplorationResultText(
          `Another honor card drawn: ${gambleCard.rank} of ${gambleCard.suit}! Your "${guessLabel}" call and streak remain intact. Discard base (${comparisonCard?.rank}${comparisonCard?.suit}) or draw again for A♠!`
        );
        setStatusMessage(
          `Drew ${gambleCard.rank}${gambleCard.suit}! "${guessLabel}" guess & streak still active.`
        );
        return;
      }

      // Numbered card drawn: resolve against the base card using the existing active prediction!
      const prediction = activePrediction || 'higher';
      const baseVal = comparisonCard ? comparisonCard.value : 7;
      const drawnVal = gambleCard.value;

      if (drawnVal === baseVal) {
        setTimeout(() => {
          sounds.playClick();
        }, 320);
        setExplorationStreak(0);
        setComparisonCard(gambleCard);
        setPendingExplorationChoice(null);
        setActivePrediction(null);
        setExplorationResultText(
          `Drew ${gambleCard.rank}${gambleCard.suit} matching base ${baseVal}! Pair push — no energy change. Streak reset to 0.`
        );
        setStatusMessage(`Draw again resulted in a pair (${gambleCard.rank}${gambleCard.suit})! Push.`);
      } else {
        const isHigher = drawnVal > baseVal;
        const isCorrect =
          (prediction === 'higher' && isHigher) || (prediction === 'lower' && !isHigher);

        if (isCorrect) {
          setTimeout(() => {
            sounds.playBonus();
          }, 320);
          const nextStreak = explorationStreak >= 0 ? explorationStreak + 1 : 1;
          setExplorationStreak(nextStreak);
          const energyReward = nextStreak;
          setEnergy((prev) => Math.min(prev + energyReward, MAX_ENERGY));
          setComparisonCard(gambleCard);
          setPendingExplorationChoice(null);
          setActivePrediction(null);
          setExplorationResultText(
            `Correct "${prediction.toUpperCase()}" call! Drew ${gambleCard.rank}${gambleCard.suit} vs base ${baseVal}. Streak: +${nextStreak} (+${energyReward} ⚡).`
          );
          setStatusMessage(
            `Drew ${gambleCard.rank}${gambleCard.suit} — correct "${prediction}"! Streak +${nextStreak} (+${energyReward}⚡).`
          );
        } else {
          setTimeout(() => {
            sounds.playHazard();
          }, 320);
          const nextStreak = explorationStreak <= 0 ? explorationStreak - 1 : -1;
          setExplorationStreak(nextStreak);
          const energyPenalty = Math.abs(nextStreak);
          const remainingE = Math.max(0, energy - energyPenalty);
          setEnergy(remainingE);
          setComparisonCard(gambleCard);
          setPendingExplorationChoice(null);
          setActivePrediction(null);
          setExplorationResultText(
            `Wrong call! Drew ${gambleCard.rank}${gambleCard.suit} vs base ${baseVal} (called ${prediction.toUpperCase()}). Streak: ${nextStreak} (-${energyPenalty} ⚡).`
          );
          setStatusMessage(
            `Drew ${gambleCard.rank}${gambleCard.suit} — wrong call! Streak ${nextStreak} (-${energyPenalty}⚡).`
          );

          if (remainingE <= 0) {
            setTimeout(() => {
              sounds.playHazard();
              setIsLost(true);
              setStatusMessage('Energy exhausted in the subterranean dark! The delve is lost.');
            }, 420);
          }
        }
      }
    }
  };

  // Transition from Level 2 to Level 3 (Flower Hex Grid Floor 1)
  const handleDescendToLevel3 = () => {
    sounds.playVictory();
    setCurrentLevel(3);
    setShowLevel2VictoryModal(false);
    setLevel3Floor(1);
    setIsWon(false);
    setIsLost(false);
    setStatusMessage(
      'Descended to Level 3: Floor 1 of 3! Explore the 19-petal flower machine floor to align the Utopia Engine!'
    );
  };

  // Derived stats
  const revealedCount = useMemo(() => {
    let count = 0;
    for (const t of mapData.tiles.values()) {
      if (t.revealed) count++;
    }
    return count;
  }, [mapData.tiles]);

  const totalHexes = GRID_COLS * GRID_ROWS;

  return (
    <div className="flex flex-col h-dvh w-full max-w-lg mx-auto bg-[#ded4bf] text-[#2b261f] select-none overflow-hidden font-mono border-x-2 border-[#2b261f] shadow-2xl relative">
      {/* 1. Fixed Header (Scorecard stats bar) */}
      <Header
        energy={energy}
        maxEnergy={MAX_ENERGY}
        turn={currentLevel === 2 ? level2Steps : turn}
        revealedCount={revealedCount}
        totalHexes={totalHexes}
        goalFound={goalFound}
        goalClue={goalClue}
        freeMoves={freeMoves}
        hasTelescope={hasTelescope}
        hasDiceModifier={hasDiceModifier}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setShowRules(true)}
        onNewGame={handleNewGame}
        level={currentLevel}
        level2CardsRemaining={tunnelMap.deck.length}
        level2TargetFound={level2TargetFound}
        level2Streak={explorationStreak}
        onOpenExplorationModal={() => setShowChamberExplorationModal(true)}
      />

      {/* 2. Interactive SVG Hex Grid (Middle Map Area) */}
      <main className="flex-1 min-h-0 relative">
        {currentLevel === 1 ? (
          <HexGrid
            tiles={mapData.tiles}
            playerCoord={playerCoord}
            pathPreview={pathPreview}
            knownTowers={knownTowers}
            isMoveOne={isMoveOne}
            candidateGoalCoords={candidateGoalCoords}
            deviationState={deviationState}
            onTileClick={handleTileClick}
            onPathTileClick={handlePathTileClick}
            onSelectDeviationBranch={handleSelectDeviationBranch}
            onExecuteMove={handleExecuteMove}
            canExecuteMove={diceState.rolled && pathPreview.length > 0 && energy > 0}
          />
        ) : currentLevel === 2 ? (
          <TunnelGrid
            tiles={tunnelMap.tiles}
            playerCoord={tunnelMap.playerCoord}
            onTileClick={handleTunnelTileClick}
            interactiveExits={tunnelInteractiveExits}
            energy={energy}
          />
        ) : (
          <div className="h-full overflow-y-auto p-2 flex items-center justify-center">
            <FlowerHexGrid
              currentFloor={level3Floor}
              onAdvanceFloor={() => setLevel3Floor((prev) => Math.min(3, prev + 1))}
            />
          </div>
        )}
      </main>

      {/* 3. Fixed Footer Control Panel */}
      {currentLevel === 1 ? (
        <ControlPanel
          diceState={diceState}
          deviationState={deviationState}
          selectedDirection={selectedDirection}
          effectiveDistance={diceState.assignedDistance}
          energy={energy}
          pathPreview={pathPreview}
          isMoveOne={isMoveOne}
          freeMoves={freeMoves}
          hasDiceModifier={hasDiceModifier}
          statusMessage={statusMessage}
          onRollDice={handleRollDice}
          onSelectDirectionDie={handleSelectDirectionDie}
          onToggleMoveOne={handleToggleMoveOne}
          onExecuteMove={handleExecuteMove}
          onResetDeviation={handleResetDeviation}
          onModifyDie={handleModifyDie}
        />
      ) : currentLevel === 2 ? (
        <footer className="shrink-0 bg-[#e8deca] border-t-2 border-[#2b261f] select-none flex flex-col shadow-lg z-30">
          <div className="p-2 flex flex-col gap-2">
            {/* Card Display with Heart theme and Deck Tracker */}
            <CardDisplay
              card={tunnelMap.activeCard}
              deckCount={tunnelMap.deck.length}
              discardCards={tunnelMap.discard}
              onDrawCard={handleTunnelDrawCard}
              canDraw={canDrawTunnelCard}
              activeExitDirs={
                tunnelMap.tiles.get(
                  `${tunnelMap.playerCoord.col},${tunnelMap.playerCoord.row}`
                )?.carvedExitDirs
              }
            />

            {/* Primary Action Buttons Area: Consistent with Level 1 bottom CTA */}
            {canDrawTunnelCard ? (
              /* When in an unsurveyed chamber or awaiting next card (after entering or after JQK),
                 the ONLY action is Draw Delve Card */
              <button
                id="btn-draw-delve-card"
                onClick={handleTunnelDrawCard}
                className="w-full py-2 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
              >
                <span className="text-sm">♥</span>
                <span>DRAW DELVE CARD</span>
                <span className="text-[10px] text-[#bbf7d0] font-bold bg-[#1b4332] px-2 py-0.5 rounded border border-[#15803d] ml-1">
                  {tunnelMap.deck.length} IN DECK
                </span>
              </button>
            ) : tunnelInteractiveExits.length > 0 ? (
              /* When exits are carved, show exits as primary action buttons matching Level 1 style. */
              <div className="flex items-center gap-1.5 w-full">
                {tunnelInteractiveExits.map((exitCoord, idx) => {
                  const bearing = getAdjacentBearing(tunnelMap.playerCoord, exitCoord);
                  const exitKey = `${exitCoord.col},${exitCoord.row}`;
                  const exitTile = tunnelMap.tiles.get(exitKey);
                  const isTarget = Boolean(exitTile?.isTarget);

                  if (isTarget) {
                    return (
                      <button
                        key={`exit-${exitCoord.col}-${exitCoord.row}-${idx}`}
                        onClick={() => handleTunnelTileClick(exitCoord)}
                        className="flex-1 min-w-0 py-2 px-2 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-md flex items-center justify-between gap-1 cursor-pointer transition-transform active:translate-y-0.5"
                      >
                        <span className="truncate">🏆 {bearing}</span>
                        <span className="text-[10px] font-mono font-bold text-[#bbf7d0] bg-[#1b4332] px-1.5 py-0.5 rounded border border-[#15803d] shrink-0">
                          -1⚡
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`exit-${exitCoord.col}-${exitCoord.row}-${idx}`}
                      onClick={() => handleTunnelTileClick(exitCoord)}
                      className="flex-1 min-w-0 py-2 px-2 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-bold text-xs sm:text-sm tracking-wide shadow-md flex items-center justify-between gap-1 cursor-pointer transition-transform active:translate-y-0.5"
                    >
                      <span className="truncate font-black">{bearing}</span>
                      <span className="text-[10px] font-mono font-bold text-[#bbf7d0] bg-[#1b4332] px-1.5 py-0.5 rounded border border-[#15803d] shrink-0">
                        -1⚡
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="w-full py-2 px-3 text-center text-xs font-mono text-[#786e5e] italic">
                No exits available.
              </div>
            )}
          </div>
        </footer>
      ) : (
        /* Level 3 Footer */
        <footer className="shrink-0 bg-[#e8deca] border-t-2 border-[#2b261f] p-3 text-center select-none shadow-lg z-30">
          <div className="flex items-center justify-between font-mono text-xs text-[#2b261f]">
            <span className="font-bold flex items-center gap-1.5">
              <span>⚙️</span> Level 3 Floor {level3Floor} Active
            </span>
            <span className="bg-[#dcfce7] text-[#15803d] px-2 py-0.5 rounded font-black border border-[#86efac]">
              {energy} ⚡ Energy
            </span>
          </div>
        </footer>
      )}

      {/* Level 2 Chamber Exploration Modal (Higher / Lower on chamber entry) */}
      <ChamberExplorationModal
        isOpen={showChamberExplorationModal}
        baseCard={comparisonCard}
        drawnCard={drawnExplorationCard}
        deckCount={explorationDeck.length}
        streak={explorationStreak}
        activePrediction={activePrediction}
        pendingChoice={pendingExplorationChoice}
        resultMessage={explorationResultText}
        chamberCoord={tunnelMap.playerCoord}
        onPredict={handleExplorationPredict}
        onFaceChoice={handleFaceChoice}
        onDismiss={() => setShowChamberExplorationModal(false)}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Interactive Event Prompt Modal (Shrines, Rifts, Traps, Vaults) */}
      <EventModal prompt={eventPrompt} onResolve={handleResolveEvent} />

      {/* Level 2 Victory Modal (Ace of Spades found -> Descend to Level 3) */}
      {showLevel2VictoryModal && (
        <Level2VictoryModal
          remainingEnergy={energy}
          stepsTaken={level2Steps}
          onDescendLevel3={handleDescendToLevel3}
        />
      )}

      {/* Level Transition Modal (Level 1 Complete -> Descend to Level 2) */}
      {showLevelTransitionModal && (
        <LevelTransitionModal
          remainingEnergy={energy}
          turnsTaken={level1Turns}
          onDescend={handleDescendToLevel2}
          onReviewMap={() => {
            setShowLevelTransitionModal(false);
            setReviewingMap(true);
          }}
        />
      )}

      {/* Game Over / Win Modal */}
      {(isWon || isLost) && !reviewingMap && (
        <GameOverModal
          won={isWon}
          turns={currentLevel === 2 ? level2Steps : turn}
          energyLeft={energy}
          revealedCount={revealedCount}
          totalHexes={totalHexes}
          towersFound={visitedTowerCount}
          totalTowers={mapData.towerCoords.length}
          onRestart={handleNewGame}
          onReviewMap={() => setReviewingMap(true)}
          level={currentLevel}
          cardsDrawn={level2CardsDrawn}
          tunnelsCarved={litTunnelCount}
        />
      )}

      {/* Floating banner when reviewing map after game ends or after Level 1 */}
      {reviewingMap && (
        <div className="fixed top-14 right-4 z-40 flex items-center gap-2 bg-[#f4edd9]/95 backdrop-blur-xs border-2 border-[#2b261f] py-1.5 px-3 rounded-lg shadow-xl font-mono text-xs select-none">
          <span className="font-bold text-[#2b261f]">
            {currentLevel === 1 && !isLost ? '🏆 Secret Tunnel Reached!' : isWon ? '🏆 Delve Complete!' : '📍 Map Review'}
          </span>
          {currentLevel === 1 && !isLost && (
            <button
              onClick={handleDescendToLevel2}
              className="px-2.5 py-1 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold rounded border border-[#2b261f] cursor-pointer shadow-xs"
            >
              Descend Level 2 ⬇
            </button>
          )}
          <button
            onClick={() => setReviewingMap(false)}
            className="px-2.5 py-1 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-bold rounded border border-[#2b261f] cursor-pointer"
          >
            Ledger
          </button>
          <button
            onClick={handleNewGame}
            className="px-2.5 py-1 bg-[#e2d5bd] hover:bg-[#d8c8ab] text-[#2b261f] font-bold rounded border border-[#2b261f] cursor-pointer"
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}
