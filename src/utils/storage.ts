import {
  GameLevel,
  HexCoord,
  HexTile,
  DiceState,
  DeviationState,
  DirectionIndex,
} from '../types';
import { TunnelTile } from './tunnelEngine';
import { TunnelCard } from './delveDeck';
import { ExplorationCard } from './explorationDeck';
import { FlowerTile, Level3State } from './level3Engine';

const STORAGE_KEY = 'hex_expedition_save_state_v1';

export interface GameSaveData {
  version: number;
  timestamp: number;
  currentLevel: GameLevel;
  energy: number;
  turn: number;
  statusMessage: string;
  soundEnabled: boolean;
  isWon: boolean;
  isLost: boolean;
  playerHand?: ExplorationCard[];

  // Level 1 Wilderness
  level1: {
    tiles: [string, HexTile][];
    startCoord: HexCoord;
    goalCoord: HexCoord;
    towerCoords: HexCoord[];
    playerCoord: HexCoord;
    knownTowers: HexCoord[];
    visitedTowerCount: number;
    goalClue: string | null;
    freeMoves: number;
    hasTelescope: boolean;
    hasDiceModifier: boolean;
    level1Turns: number;
    diceState: DiceState;
    deviationState: DeviationState;
    selectedDirection: DirectionIndex;
    isMoveOne: boolean;
  };

  // Level 2 Subterranean Tunnels
  level2: {
    tiles: [string, TunnelTile][];
    startCoord: HexCoord;
    playerCoord: HexCoord;
    deck: TunnelCard[];
    discard: TunnelCard[];
    activeCard: TunnelCard | null;
    cardsDrawnCount: number;
    currentTunnelHeading: DirectionIndex;
    level2Steps: number;
    level2CardsDrawn: number;
    level2TargetFound: boolean;
    level2ReExploring: boolean;
    explorationDeck: ExplorationCard[];
    comparisonCard: ExplorationCard | null;
    drawnExplorationCard: ExplorationCard | null;
    explorationStreak: number;
    activePrediction: 'higher' | 'lower' | null;
    pendingExplorationChoice: 'higher_lower' | 'face_gamble' | null;
    explorationResultText: string | null;
  };

  // Level 3 Flower Core
  level3: {
    tiles: [string, FlowerTile][];
    playerCoord: { q: number; r: number };
    outerDoorsUnlocked: boolean;
    innerDoorsUnlocked: boolean;
    outerCodeFragments: number;
    outerDoorFails: number;
    innerCodeFragments: number;
    innerDoorFails: number;
    bossDefeated: boolean;
    level3Steps: number;
  };
}

export function saveGameStateLocally(data: GameSaveData): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    // Graceful fallback for storage quota or privacy mode
    console.warn('Unable to persist game state locally:', err);
  }
}

export function loadGameStateLocally(): GameSaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: GameSaveData = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (err) {
    console.warn('Unable to parse saved game state:', err);
    return null;
  }
}

export function clearGameStateLocally(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear local storage:', err);
  }
}
