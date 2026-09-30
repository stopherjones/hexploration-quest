import { HexCoord } from '../types';

export type FlowerTileType =
  | 'safe'         // Safe entry camp
  | 'outer_door'   // Outer locked portal (access to inner ring)
  | 'inner_door'   // Inner locked gate (access to center boss)
  | 'trap'         // Trap room
  | 'monster'      // Subterranean beast lair
  | 'treasure'     // Kept for backward compatibility
  | 'center_boss'; // Level 5 Monster boss

export interface FlowerHexCoord {
  q: number;
  r: number;
}

export interface FlowerTile {
  id: string; // "q,r"
  q: number;
  r: number;
  ring: 'outer' | 'inner' | 'center';
  type: FlowerTileType;
  title: string;
  description: string;
  revealed: boolean;     // true if peeked or visited
  visited: boolean;      // true if player currently is or was on this tile
  status: 'unexplored' | 'peeked' | 'visited' | 'cleared';
  doorTested?: boolean;  // doors can only be tested once
  doorPassed?: boolean;  // true if unlocked (0-10 on outer, 0 on inner)
  disarmed?: boolean;    // trap permanently disarmed
  disarmedTemporarily?: boolean; // trap disarmed temporarily (reactivates if player returns)
  monsterBypassed?: boolean; // sneaked past monster
  monsterDefeated?: boolean; // defeated monster in combat
  looted?: boolean;      // claimed
}

export interface MonsterDef {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  title: string;
  description: string;
  maxHp: number;
  // Dice values (1-6) that deal damage to the monster
  monsterDamageValues: number[];
  // Dice values (1-6) that deal damage to the player (-1 energy per match)
  playerDamageValues: number[];
}

export const LEVEL3_MONSTERS: Record<number, MonsterDef> = {
  1: {
    level: 1,
    name: 'Cave Stalker',
    title: 'Level 1 Beast (1 HP)',
    description: 'A chittering cave hunter with razor claws! Damaged on 4, 5, 6 (1 HP). Player takes damage on 1 (-1⚡).',
    maxHp: 1,
    monsterDamageValues: [4, 5, 6],
    playerDamageValues: [1],
  },
  2: {
    level: 2,
    name: 'Ironhide Basilisk',
    title: 'Level 2 Armored Basilisk (2 HP)',
    description: 'A heavy subterranean reptile armored in interlocking iron plates! Damaged on 5, 6 (2 HP). Player takes damage on 1, 2 (-1⚡).',
    maxHp: 2,
    monsterDamageValues: [5, 6],
    playerDamageValues: [1, 2],
  },
  3: {
    level: 3,
    name: 'Obsidian Dread Golem',
    title: 'Level 3 Stone Sentinel (3 HP)',
    description: 'A massive basalt automaton forged to crush all trespassers! Damaged on 6 (3 HP). Player takes damage on 1, 2, 3 (-1⚡).',
    maxHp: 3,
    monsterDamageValues: [6],
    playerDamageValues: [1, 2, 3],
  },
  4: {
    level: 4,
    name: 'Chthonic Abomination',
    title: 'Level 4 Horrific Behemoth (4 HP)',
    description: 'A towering eldritch abomination writhing with subterranean power! Receives damage on 1, 2, 3 (4 HP). Player takes damage on 4, 5, 6 (-1⚡).',
    maxHp: 4,
    monsterDamageValues: [1, 2, 3],
    playerDamageValues: [4, 5, 6],
  },
  5: {
    level: 5,
    name: 'The Utopia Engine Core Construct',
    title: 'Level 5 Ancient Guardian (5 HP)',
    description: 'The supreme mechanical sovereign defending the subterranean core! Roll values reversed: Receives damage on 4, 5, 6 (5 HP). Beware rolls of 1, 2, 3 (-1⚡)!',
    maxHp: 5,
    monsterDamageValues: [4, 5, 6],
    playerDamageValues: [1, 2, 3],
  },
};

/**
 * Determines the monster level awakened by an alignment difference:
 * Outer Ring:
 * - 100 to 250 or -1 to -250 -> Level 1 (1 HP, damaged on 4, 5, 6)
 * - 251 to 400 or -251 to -400 -> Level 2 (1 HP, damaged on 5, 6)
 * - 401 to 555 or -401 to -555 -> Level 3 (1 HP, damaged on 6)
 * Inner Ring:
 * - same score differences spawn monsters of levels 2, 3, and 4 (Level 4: 2 HP, damaged on 1, 2, 3)
 */
export function getSpawnedMonsterLevel(
  difference: number,
  ring: 'outer' | 'inner' | 'center'
): 1 | 2 | 3 | 4 {
  let baseLevel: 1 | 2 | 3 = 1;
  if ((difference >= 100 && difference <= 250) || (difference >= -250 && difference <= -1)) {
    baseLevel = 1;
  } else if ((difference >= 251 && difference <= 400) || (difference >= -400 && difference <= -251)) {
    baseLevel = 2;
  } else {
    // 401 to 555, -401 to -555, or higher deviations
    baseLevel = 3;
  }

  if (ring === 'inner') {
    // Inner ring monsters are levels 2, 3 and 4
    return (baseLevel + 1) as 2 | 3 | 4;
  }
  return baseLevel;
}

export interface Level3State {
  tiles: Map<string, FlowerTile>;
  playerCoord: FlowerHexCoord;
  outerDoorsUnlocked: boolean;
  outerCodeFragments: number; // need 3 or a 0
  outerDoorFails: number;
  innerDoorsUnlocked: boolean;
  innerCodeFragments: number; // need 2 or a 0
  innerDoorFails: number;
  bossDefeated: boolean;
}

// Axial distance from center (0, 0)
export function getHexDistance(q1: number, r1: number, q2: number = 0, r2: number = 0): number {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - (q2 + r2)) + Math.abs(r1 - r2)) / 2;
}

// Axial directions: 6 neighbors
export const AXIAL_DIRECTIONS: FlowerHexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function getAxialNeighbors(q: number, r: number): FlowerHexCoord[] {
  return AXIAL_DIRECTIONS.map((dir) => ({ q: q + dir.q, r: r + dir.r }));
}

export function areAxialAdjacent(a: FlowerHexCoord, b: FlowerHexCoord): boolean {
  return getHexDistance(a.q, a.r, b.q, b.r) === 1;
}

/**
 * Generates the full 19-hex Level 3 map adhering strictly to the user brief:
 * - 1 Center: Level 5 Monster Boss (Roll values reversed)
 * - 6 Inner Ring: 2 Doors, 2 Traps, 2 Treasure (placed randomly, no safe zone)
 * - 12 Outer Ring: 4 Doors, 4 Traps, 4 Treasure (placed randomly, no safe zone)
 */
export function generateLevel3Map(): Level3State {
  // Collect 19 axial coordinates where max(|q|, |r|, |q+r|) <= 2
  const centerCoords: FlowerHexCoord[] = [{ q: 0, r: 0 }];
  const innerCoords: FlowerHexCoord[] = [];
  const outerCoords: FlowerHexCoord[] = [];

  for (let q = -2; q <= 2; q++) {
    const r1 = Math.max(-2, -q - 2);
    const r2 = Math.min(2, -q + 2);
    for (let r = r1; r <= r2; r++) {
      const dist = getHexDistance(q, r, 0, 0);
      if (dist === 0) continue; // center
      if (dist === 1) innerCoords.push({ q, r });
      if (dist === 2) outerCoords.push({ q, r });
    }
  }

  // Shuffle outer coordinates
  for (let i = outerCoords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [outerCoords[i], outerCoords[j]] = [outerCoords[j], outerCoords[i]];
  }

  // Shuffle inner coordinates
  for (let i = innerCoords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [innerCoords[i], innerCoords[j]] = [innerCoords[j], innerCoords[i]];
  }

  // Outer Ring Types:
  // 1 Safe Zone (entry at outerCoords[0]) + 11 other hexes:
  // 3 Traps, 4 Outer Doors, 4 Monsters
  const outerRemainingTypes: FlowerTileType[] = [
    'trap',
    'trap',
    'trap',
    'outer_door',
    'outer_door',
    'outer_door',
    'outer_door',
    'monster',
    'monster',
    'monster',
    'monster',
  ];

  // Shuffle the remaining 11 outer hex types
  for (let i = outerRemainingTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [outerRemainingTypes[i], outerRemainingTypes[j]] = [outerRemainingTypes[j], outerRemainingTypes[i]];
  }

  // Final outer types array with safe zone at index 0 (player entry)
  const outerTypes: FlowerTileType[] = ['safe', ...outerRemainingTypes];

  // Inner Ring Types (6 total):
  // 2 Inner Doors, 2 Traps, 2 Monsters
  const innerTypes: FlowerTileType[] = [
    'inner_door',
    'inner_door',
    'trap',
    'trap',
    'monster',
    'monster',
  ];

  // Shuffle inner types
  for (let i = innerTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [innerTypes[i], innerTypes[j]] = [innerTypes[j], innerTypes[i]];
  }

  const tiles = new Map<string, FlowerTile>();
  const playerStartCoord: FlowerHexCoord = outerCoords[0];

  // 1. Assign Outer Ring Tiles
  outerCoords.forEach((coord, idx) => {
    const tType = outerTypes[idx];
    const key = `${coord.q},${coord.r}`;
    const isPlayerStart = idx === 0;

    let title = 'Outer Vault Chamber';
    let description = 'A cold stone chamber on the outer perimeter.';

    if (tType === 'safe') {
      title = 'Subterranean Encampment (Safe Entry)';
      description = 'Threshold to the subterranean engine. Safe from traps and prowling monsters.';
    } else if (tType === 'outer_door') {
      title = `Outer Portal Door ${idx}`;
      description = 'A heavy brass runic gate barring passage into the Inner Ring. Score 0–10 unlocks.';
    } else if (tType === 'trap') {
      title = 'Spike & Pressure Chamber';
      description = 'Rhythmic mechanical traps with tripwires and crushing gears. Deactivate to proceed.';
    } else if (tType === 'monster') {
      title = 'Subterranean Beast Lair';
      description = 'A shadowed lair where an ancient beast prowls. Sneak past with 0–10 or fight!';
    }

    tiles.set(key, {
      id: key,
      q: coord.q,
      r: coord.r,
      ring: 'outer',
      type: tType,
      title,
      description,
      revealed: isPlayerStart,
      visited: isPlayerStart,
      status: isPlayerStart ? 'cleared' : 'unexplored',
    });
  });

  // 2. Assign Inner Ring Tiles
  innerCoords.forEach((coord, idx) => {
    const tType = innerTypes[idx];
    const key = `${coord.q},${coord.r}`;

    let title = 'Inner Sanctum Cell';
    let description = 'An ancient chamber echoing with the hum of the core.';

    if (tType === 'inner_door') {
      title = `Inner Core Gate ${idx + 1}`;
      description = 'The impenetrable adamantine gate leading into the Engine Core. Requires score 0 to decrypt.';
    } else if (tType === 'trap') {
      title = 'Subterranean Grinder Vault';
      description = 'Lethal grinding mechanisms. Score 0 permanently disables; 1–10 deactivates once.';
    } else if (tType === 'monster') {
      title = 'Elite Core Guardian Lair';
      description = 'A fierce apex guardian prowling the inner ring. Sneak on score 0 or face battle!';
    }

    tiles.set(key, {
      id: key,
      q: coord.q,
      r: coord.r,
      ring: 'inner',
      type: tType,
      title,
      description,
      revealed: false,
      visited: false,
      status: 'unexplored',
    });
  });

  // 3. Assign Center Hex (Level 5 Monster Boss)
  const centerKey = '0,0';
  tiles.set(centerKey, {
    id: centerKey,
    q: 0,
    r: 0,
    ring: 'center',
    type: 'center_boss',
    title: 'The Utopia Engine Core',
    description: 'The monumental heart of the machine guarded by the supreme Core Construct!',
    revealed: false,
    visited: false,
    status: 'unexplored',
  });

  return {
    tiles,
    playerCoord: playerStartCoord,
    outerDoorsUnlocked: false,
    outerCodeFragments: 0,
    outerDoorFails: 0,
    innerDoorsUnlocked: false,
    innerCodeFragments: 0,
    innerDoorFails: 0,
    bossDefeated: false,
  };
}

/**
 * Checks if a move from fromCoord to toCoord is legally permitted:
 * - Must be adjacent in axial distance (dist = 1)
 * - If crossing Outer -> Inner ring: Outer doors MUST be unlocked!
 * - If crossing Inner -> Center: Inner doors MUST be unlocked!
 */
export function canTraverseToTile(
  state: Level3State,
  fromCoord: FlowerHexCoord,
  toCoord: FlowerHexCoord
): { allowed: boolean; reason?: string } {
  if (!areAxialAdjacent(fromCoord, toCoord)) {
    return { allowed: false, reason: 'Tile is not adjacent to current position.' };
  }

  const fromDist = getHexDistance(fromCoord.q, fromCoord.r);
  const toDist = getHexDistance(toCoord.q, toCoord.r);

  // Outer (dist 2) -> Inner (dist 1)
  if (fromDist === 2 && toDist === 1) {
    if (!state.outerDoorsUnlocked) {
      return {
        allowed: false,
        reason: 'The Inner Ring is sealed! Unlock an Outer Portal Door (Score 0–10) to enter.',
      };
    }
  }

  // Inner (dist 1) -> Center (dist 0)
  if (fromDist === 1 && toDist === 0) {
    if (!state.innerDoorsUnlocked) {
      return {
        allowed: false,
        reason: 'The Core is sealed! Decrypt an Inner Gate (Score 0) to reach the Boss.',
      };
    }
  }

  return { allowed: true };
}
