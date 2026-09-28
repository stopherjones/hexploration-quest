import { HexCoord } from '../types';

export type FlowerTileType =
  | 'safe'         // Empty safe chamber
  | 'outer_door'   // Outer locked portal (access to inner ring)
  | 'inner_door'   // Inner locked gate (access to center boss)
  | 'trap'         // Trap room
  | 'treasure'     // Treasure vault
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
  doorPassed?: boolean;  // true if generated a code fragment or master 0
  disarmed?: boolean;    // trap permanently disarmed on 0
  disarmedOnce?: boolean;// trap disarmed once on 1-10
  looted?: boolean;      // treasure room claimed
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
    description: 'A chittering cave hunter with razor claws leaps from the gloom! Damaged on 4, 5, 6 (1 HP).',
    maxHp: 1,
    monsterDamageValues: [4, 5, 6],
    playerDamageValues: [1],
  },
  2: {
    level: 2,
    name: 'Ironhide Basilisk',
    title: 'Level 2 Armored Beast (1 HP)',
    description: 'A heavy subterranean reptile armored in interlocking iron plates! Damaged on 5, 6 (1 HP).',
    maxHp: 1,
    monsterDamageValues: [5, 6],
    playerDamageValues: [1, 2],
  },
  3: {
    level: 3,
    name: 'Obsidian Dread Golem',
    title: 'Level 3 Stone Sentinel (1 HP)',
    description: 'A massive basalt automaton forged to crush all trespassers! Damaged on 6 (1 HP).',
    maxHp: 1,
    monsterDamageValues: [6],
    playerDamageValues: [1, 2, 3],
  },
  4: {
    level: 4,
    name: 'Chthonic Abomination',
    title: 'Level 4 Horrific Behemoth (2 HP)',
    description: 'A towering eldritch abomination writhing with subterranean power! Receives damage on 1, 2, 3 (2 HP).',
    maxHp: 2,
    monsterDamageValues: [1, 2, 3],
    playerDamageValues: [4, 5, 6],
  },
  5: {
    level: 5,
    name: 'The Utopia Engine Core Construct',
    title: 'Level 5 Ancient Guardian (3 HP)',
    description: 'The supreme mechanical sovereign defending the subterranean core! Receives damage on 1, 2, 3 (3 HP).',
    maxHp: 3,
    monsterDamageValues: [1, 2, 3],
    playerDamageValues: [4, 5, 6],
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
 * - 1 Center: Level 5 Monster Boss
 * - 6 Inner Ring: 1 Safe, 2 Doors, 2 Traps, 1 Treasure (placed randomly)
 * - 12 Outer Ring: 1 Safe (player starts here), 4 Doors, 3 Traps, 4 Treasure (placed randomly)
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

  // Outer Ring Types (12 total):
  // 1 Safe, 4 Outer Doors, 3 Traps, 4 Treasure
  const outerTypes: FlowerTileType[] = [
    'safe',
    'outer_door',
    'outer_door',
    'outer_door',
    'outer_door',
    'trap',
    'trap',
    'trap',
    'treasure',
    'treasure',
    'treasure',
    'treasure',
  ];

  // Inner Ring Types (6 total):
  // 1 Safe, 2 Inner Doors, 2 Traps, 1 Treasure
  const innerTypes: FlowerTileType[] = [
    'safe',
    'inner_door',
    'inner_door',
    'trap',
    'trap',
    'treasure',
  ];

  const tiles = new Map<string, FlowerTile>();
  let playerStartCoord: FlowerHexCoord = outerCoords[0]; // fallback

  // 1. Assign Outer Ring Tiles
  outerCoords.forEach((coord, idx) => {
    const tType = outerTypes[idx];
    const key = `${coord.q},${coord.r}`;
    const isPlayerStart = tType === 'safe';

    if (isPlayerStart) {
      playerStartCoord = coord;
    }

    let title = 'Outer Vault Chamber';
    let description = 'A cold stone chamber on the outer perimeter.';

    if (tType === 'safe') {
      title = 'Sanctuary Landing';
      description = 'A quiet stone foyer with no traps or beasts. Safe to rest.';
    } else if (tType === 'outer_door') {
      title = `Outer Portal Door ${idx + 1}`;
      description = 'A heavy brass runic gate barring passage into the Inner Ring.';
    } else if (tType === 'trap') {
      title = 'Spike & Blade Chamber';
      description = 'Hidden pressure plates and spring-loaded counterweights.';
    } else if (tType === 'treasure') {
      title = 'Ancient Mana Vault';
      description = 'A glowing crystal basin brimming with concentrated subterranean energy.';
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
      status: isPlayerStart ? 'visited' : 'unexplored',
    });
  });

  // 2. Assign Inner Ring Tiles
  innerCoords.forEach((coord, idx) => {
    const tType = innerTypes[idx];
    const key = `${coord.q},${coord.r}`;

    let title = 'Inner Sanctum Cell';
    let description = 'An ancient chamber echoing with the hum of the core.';

    if (tType === 'safe') {
      title = 'Inner Refuge';
      description = 'A sacred alcove bathed in soft harmonic luminescence.';
    } else if (tType === 'inner_door') {
      title = `Inner Core Gate ${idx + 1}`;
      description = 'The impenetrable adamantine gate leading into the Engine Core.';
    } else if (tType === 'trap') {
      title = 'Subterranean Grinder Vault';
      description = 'Crushing basalt rollers and steam-powered scythes.';
    } else if (tType === 'treasure') {
      title = 'Grand Mana Strongbox';
      description = 'A radiant reliquary pulsating with primal energy.';
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
        reason: 'The Inner Ring is sealed! Unlock the 4 Outer Portal Doors to enter.',
      };
    }
  }

  // Inner (dist 1) -> Center (dist 0)
  if (fromDist === 1 && toDist === 0) {
    if (!state.innerDoorsUnlocked) {
      return {
        allowed: false,
        reason: 'The Core is sealed! Decrypt the 2 Inner Gates to reach the Boss.',
      };
    }
  }

  return { allowed: true };
}
