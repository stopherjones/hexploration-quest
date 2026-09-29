export type DirectionIndex = 1 | 2 | 3 | 4 | 5 | 6;

export interface HexCoord {
  col: number; // 0 to 9
  row: number; // 0 to 11
}

export type HexType =
  | 'start'
  | 'goal'
  | 'tower'
  | 'energy_cache' // +2, +3, or +5 energy
  | 'luck_shrine'  // Roll odd/even for 0 or +2 energy
  | 'bog_hazard'   // -1 energy
  | 'rift_hazard'  // Roll odd/even for 0 or -2 energy
  | 'clue_cairn'   // Gives compass direction to goal
  | 'blank';

export interface HexTile {
  id: string;
  col: number;
  row: number;
  type: HexType;
  revealed: boolean;
  visited: boolean;
  value?: number; // e.g. +1, -1, or specific bonus
  flavorText?: string;
  cairnBearing?: string; // Rough compass direction to the goal (e.g. 'North-East')
  activated?: boolean;
}

export interface DiceState {
  die1: number; // e.g. 2
  die2: number; // e.g. 6
  baseDie1: number;
  baseDie2: number;
  chosenDirectionDie: 1 | 2; // 1 means die1 is direction, die2 is distance; 2 means die2 is direction, die1 is distance
  assignedDistance: number;
  assignedDirection: DirectionIndex;
  rolled: boolean;
  isRolling: boolean;
  modifiedDie?: 1 | 2 | null;
  modifierDelta?: -1 | 0 | 1;
}

export type DeviationType = 'none' | 'override_direction' | 'split_path';

export interface DeviationState {
  active: boolean;
  usedThisTurn: boolean;
  type: DeviationType;
  pivotIndex: number | null; // index (0-based) in pathPreview where deviation started
  overrideDirection: DirectionIndex;
  step1Distance: number;
  step1Direction: DirectionIndex;
  step2Distance: number;
  step2Direction: DirectionIndex;
}

export type GameStatus = 'ready_to_roll' | 'planning_move' | 'moving_one' | 'moving' | 'event_prompt' | 'won' | 'lost';

export type GameLevel = 1 | 2 | 3;

export interface EventPrompt {
  title: string;
  description: string;
  type: 'shrine' | 'rift' | 'clue' | 'tower' | 'cache' | 'bog' | 'start' | 'info' | 'tunnel_trap' | 'tunnel_treasure';
  category?: 'Alert' | 'Landmark' | 'Hazard' | 'Discovery' | 'Tile Inspection';
  coord?: HexCoord;
  statBadge?: string;
  flavorText?: string;
  options?: {
    label: string;
    action: () => void;
  }[];
}

export interface GameLogEntry {
  id: string;
  turn: number;
  text: string;
  type: 'info' | 'bonus' | 'hazard' | 'reveal' | 'success';
}
