import { DirectionIndex, HexCoord } from '../types';
import { getOrganicNeighbor } from './hexMath';
import { TunnelCard } from './delveDeck';

export interface TunnelTile {
  id: string;
  col: number;
  row: number;
  status: 'lit' | 'unexplored' | 'walled_off';
  isStart?: boolean;
  isTarget?: boolean;
  isDeadEnd?: boolean;
  isTrap?: boolean;
  isTreasure?: boolean;
  isHallway?: boolean; // Intermediate corridor connecting two chambers
  card?: TunnelCard;
  cardsHistory?: TunnelCard[];
  visited: boolean;
  connections: DirectionIndex[]; // Carved corridors from this hex to adjacent hexes
  headingFrom?: DirectionIndex; // Direction traveled to enter this hex
  trapResolved?: boolean;
  treasureClaimed?: boolean;
  exitsCarved?: boolean;
  carvedExitDirs?: DirectionIndex[];
}

export interface TunnelMap {
  tiles: Map<string, TunnelTile>;
  startCoord: HexCoord;
  playerCoord: HexCoord;
  deck: TunnelCard[];
  discard: TunnelCard[];
  activeCard: TunnelCard | null;
  cardsDrawnCount: number;
}

export const TUNNEL_START_COORD: HexCoord = {
  col: 0,
  row: 0,
};

export const OPPOSITE_DIRECTIONS: Record<DirectionIndex, DirectionIndex> = {
  1: 4, // NW <-> SE
  2: 5, // N  <-> S
  3: 6, // NE <-> SW
  4: 1, // SE <-> NW
  5: 2, // S  <-> N
  6: 3, // SW <-> NE
};

/**
 * Generates an organic subterranean map starting with ONLY the entry chamber
 * at (0, 0) floating on the plain parchment canvas.
 */
export function createTunnelMap(deck: TunnelCard[]): TunnelMap {
  const tiles = new Map<string, TunnelTile>();
  const startKey = `${TUNNEL_START_COORD.col},${TUNNEL_START_COORD.row}`;

  tiles.set(startKey, {
    id: startKey,
    col: TUNNEL_START_COORD.col,
    row: TUNNEL_START_COORD.row,
    status: 'lit',
    isStart: true,
    visited: true,
    connections: [],
    exitsCarved: false,
  });

  return {
    tiles,
    startCoord: { ...TUNNEL_START_COORD },
    playerCoord: { ...TUNNEL_START_COORD },
    deck: [...deck],
    discard: [],
    activeCard: null,
    cardsDrawnCount: 0,
  };
}

/**
 * Returns all currently live exits in the subterranean map.
 * A live exit is an illuminated chamber that is not a hallway,
 * not a dead end, not the exit target archway, and has not yet had its exits carved.
 */
export function getLiveExits(tiles: Map<string, TunnelTile>): HexCoord[] {
  const exits: HexCoord[] = [];
  for (const tile of tiles.values()) {
    if (
      tile.status === 'lit' &&
      !tile.isDeadEnd &&
      !tile.exitsCarved &&
      !tile.isTarget &&
      !tile.isHallway
    ) {
      exits.push({ col: tile.col, row: tile.row });
    }
  }
  return exits;
}

/**
 * Selects exit directions adhering to user guidelines:
 * - Start chamber (0, 0):
 *   - 2 exits: N (2) and S (5)
 *   - 3 exits: N (2), SE (4), SW (6) (symmetric 120° tripod)
 * - Subsequent chambers:
 *   - 2 exits: 120° divergent pair bracketing the forward heading
 *   - 3 exits: forward tripod fanning outward
 * - Joining & Anti-Closed Map:
 *   - Corridors can join up with existing chambers to form subterranean loops.
 *   - If the rest of the map has 0 other live exits, at least 1 exit is guaranteed to carve into fresh space.
 */
export function selectSmartExitDirections(
  tiles: Map<string, TunnelTile>,
  currentCoord: HexCoord,
  countNeeded: number,
  headingFrom?: DirectionIndex
): DirectionIndex[] {
  const isAtStart =
    currentCoord.col === TUNNEL_START_COORD.col && currentCoord.row === TUNNEL_START_COORD.row;

  // 1. Initial Start Hex Rules
  if (isAtStart || !headingFrom) {
    if (countNeeded === 2) {
      return [2, 5]; // N and S
    }
    if (countNeeded === 3) {
      return [2, 4, 6]; // N, SE, SW
    }
    return [2]; // Target / Ace: N
  }

  // 2. Subsequent chambers: determine candidate priorities relative to forward heading
  const backDir = OPPOSITE_DIRECTIONS[headingFrom];

  let candidateOrder: DirectionIndex[];
  if (countNeeded === 2) {
    // 120° divergence bracketing the incoming forward vector
    switch (headingFrom) {
      case 1: // Heading NW: diverge to SW (6) and N (2)
        candidateOrder = [6, 2, 1, 3, 5, 4];
        break;
      case 2: // Heading N: diverge to NW (1) and NE (3)
        candidateOrder = [1, 3, 2, 6, 4, 5];
        break;
      case 3: // Heading NE: diverge to N (2) and SE (4)
        candidateOrder = [2, 4, 3, 1, 6, 5];
        break;
      case 4: // Heading SE: diverge to NE (3) and S (5)
        candidateOrder = [3, 5, 4, 2, 6, 1];
        break;
      case 5: // Heading S: diverge to SE (4) and SW (6)
        candidateOrder = [4, 6, 5, 3, 1, 2];
        break;
      case 6: // Heading SW: diverge to S (5) and NW (1)
        candidateOrder = [5, 1, 6, 4, 2, 3];
        break;
      default:
        candidateOrder = [2, 5, 1, 3, 4, 6];
    }
  } else if (countNeeded === 3) {
    // 3-way divergent fan forward
    switch (headingFrom) {
      case 1:
        candidateOrder = [1, 6, 2, 3, 5, 4];
        break;
      case 2:
        candidateOrder = [2, 1, 3, 6, 4, 5];
        break;
      case 3:
        candidateOrder = [3, 2, 4, 1, 5, 6];
        break;
      case 4:
        candidateOrder = [4, 3, 5, 2, 6, 1];
        break;
      case 5:
        candidateOrder = [5, 4, 6, 3, 1, 2];
        break;
      case 6:
        candidateOrder = [6, 5, 1, 4, 2, 3];
        break;
      default:
        candidateOrder = [2, 4, 6, 1, 3, 5];
    }
  } else {
    // 1 exit (Target Ace)
    candidateOrder = [headingFrom, 2, 1, 3, 4, 6, 5];
  }

  // Filter out the reverse corridor direction (the way we entered)
  const forwardCandidates = candidateOrder.filter((d) => d !== backDir);

  // Check how many OTHER live exits exist elsewhere on the map
  const otherLiveExitsCount = getLiveExits(tiles).filter(
    (e) => !(e.col === currentCoord.col && e.row === currentCoord.row)
  ).length;

  // We want to avoid dead ends, and if otherLiveExitsCount === 0, at least ONE exit must lead to fresh space
  const chosen: DirectionIndex[] = [];

  // Helper to test where 2 hexes ahead lands
  const getDestinationStatus = (dir: DirectionIndex) => {
    const s1 = getOrganicNeighbor(currentCoord, dir);
    const s2 = getOrganicNeighbor(s1, dir);
    const s2Tile = tiles.get(`${s2.col},${s2.row}`);
    if (!s2Tile) return 'fresh'; // completely open, uncarved space
    if (s2Tile.isDeadEnd) return 'dead_end';
    return 'existing'; // joins an existing lit room / loop
  };

  // First pass: pick best non-dead-end directions
  for (const dir of forwardCandidates) {
    if (chosen.length >= countNeeded) break;
    const status = getDestinationStatus(dir);
    if (status !== 'dead_end') {
      chosen.push(dir);
    }
  }

  // If still need exits, allow remaining candidates
  if (chosen.length < countNeeded) {
    for (const dir of forwardCandidates) {
      if (chosen.length >= countNeeded) break;
      if (!chosen.includes(dir)) {
        chosen.push(dir);
      }
    }
  }

  // Anti-Closed Map Guarantee:
  // If otherLiveExitsCount === 0 (no other open branches on the entire map),
  // ensure at least ONE chosen exit leads to 'fresh' uncarved space!
  if (otherLiveExitsCount === 0 && chosen.length > 0) {
    const hasFreshExit = chosen.some((d) => getDestinationStatus(d) === 'fresh');
    if (!hasFreshExit) {
      // Find any forward candidate that leads to fresh space
      const freshCandidate = forwardCandidates.find(
        (d) => !chosen.includes(d) && getDestinationStatus(d) === 'fresh'
      );
      if (freshCandidate) {
        // Replace the last chosen exit with this fresh branch
        chosen[chosen.length - 1] = freshCandidate;
      }
    }
  }

  return chosen.slice(0, countNeeded);
}

export function getExitDirectionsForCard(
  tiles: Map<string, TunnelTile>,
  currentCoord: HexCoord,
  card: TunnelCard,
  headingFrom?: DirectionIndex
): DirectionIndex[] {
  if (card.effect === 'dead_end' || card.effect === 'trap' || card.effect === 'treasure') {
    return [];
  }
  let countNeeded = 2;
  if (card.effect === 'chamber') countNeeded = 3;
  if (card.effect === 'target') countNeeded = 1;

  return selectSmartExitDirections(tiles, currentCoord, countNeeded, headingFrom);
}

export function carveSingleExitDirection(
  tiles: Map<string, TunnelTile>,
  currentCoord: HexCoord,
  exitDir: DirectionIndex,
  isTarget: boolean = false
): HexCoord {
  const currentKey = `${currentCoord.col},${currentCoord.row}`;
  const currentTile = tiles.get(currentKey);
  if (!currentTile) return currentCoord;

  const step1Coord = getOrganicNeighbor(currentCoord, exitDir);
  const step2Coord = getOrganicNeighbor(step1Coord, exitDir);

  const step1Key = `${step1Coord.col},${step1Coord.row}`;
  const step2Key = `${step2Coord.col},${step2Coord.row}`;

  // 1. Setup step1 (Hallway)
  let step1Tile = tiles.get(step1Key);
  if (!step1Tile) {
    step1Tile = {
      id: step1Key,
      col: step1Coord.col,
      row: step1Coord.row,
      status: 'lit',
      isHallway: true,
      visited: true,
      connections: [],
      exitsCarved: true,
    };
    tiles.set(step1Key, step1Tile);
  } else {
    step1Tile.status = 'lit';
    step1Tile.isHallway = true;
  }

  // Connect currentCoord <-> step1Coord
  if (!currentTile.connections.includes(exitDir)) {
    currentTile.connections.push(exitDir);
  }
  const oppExit = OPPOSITE_DIRECTIONS[exitDir];
  if (!step1Tile.connections.includes(oppExit)) {
    step1Tile.connections.push(oppExit);
  }

  // Connect step1Coord <-> step2Coord
  if (!step1Tile.connections.includes(exitDir)) {
    step1Tile.connections.push(exitDir);
  }

  // 2. Setup step2 (Destination chamber or Joining existing chamber)
  let step2Tile = tiles.get(step2Key);
  if (!step2Tile) {
    // Fresh new destination chamber
    step2Tile = {
      id: step2Key,
      col: step2Coord.col,
      row: step2Coord.row,
      status: 'lit',
      isHallway: false,
      visited: false,
      connections: [oppExit],
      exitsCarved: false,
      isTarget,
    };
    tiles.set(step2Key, step2Tile);
  } else {
    // Joining up to an existing chamber / loop!
    step2Tile.status = 'lit';
    if (!step2Tile.connections.includes(oppExit)) {
      step2Tile.connections.push(oppExit);
    }
    if (isTarget) {
      step2Tile.isTarget = true;
    }
  }

  if (!currentTile.carvedExitDirs) {
    currentTile.carvedExitDirs = [];
  }
  if (!currentTile.carvedExitDirs.includes(exitDir)) {
    currentTile.carvedExitDirs.push(exitDir);
  }

  return step2Coord;
}

/**
 * Applies card effects to the current chamber:
 * - 5, 7 (Dead Ends): Do NOT create new exits. Marks current chamber as dead end.
 * - J (Trap), Q, K (Treasure): Do NOT create new exits yet. Resolves event first.
 * - 2, 4, 8, 10 (Fork: 2 exits, growing 2 hexes in each direction)
 * - 3, 6, 9 (Chamber: 3 exits, growing 2 hexes in each direction)
 * - A (Target Ace): Carves 1 exit (2 hexes forward) to the grand Exit Archway hex.
 */
export function carveCorridorsForTile(
  tiles: Map<string, TunnelTile>,
  currentCoord: HexCoord,
  card: TunnelCard,
  headingFrom?: DirectionIndex
): {
  openedCoords: HexCoord[];
  targetCoord?: HexCoord;
} {
  const currentKey = `${currentCoord.col},${currentCoord.row}`;
  const currentTile = tiles.get(currentKey);
  if (!currentTile) return { openedCoords: [] };

  currentTile.card = card;
  if (!currentTile.cardsHistory) currentTile.cardsHistory = [];
  currentTile.cardsHistory.push(card);

  // 1. Dead End (5 or 7): Does NOT carve new exits
  if (card.effect === 'dead_end') {
    currentTile.isDeadEnd = true;
    currentTile.exitsCarved = true;
    return { openedCoords: [] };
  }

  // 2. Trap (J) or Treasure (Q, K): Does NOT carve exits yet (draw another card after resolution)
  if (card.effect === 'trap') {
    currentTile.isTrap = true;
    currentTile.exitsCarved = false;
    return { openedCoords: [] };
  }

  if (card.effect === 'treasure') {
    currentTile.isTreasure = true;
    currentTile.exitsCarved = false;
    return { openedCoords: [] };
  }

  // 3. Exit Cards: Fork (2 exits), Chamber (3 exits), or Ace Target (1 exit)
  const exits = getExitDirectionsForCard(tiles, currentCoord, card, headingFrom);
  const isTarget = card.effect === 'target';

  const openedCoords: HexCoord[] = [];
  let targetCoord: HexCoord | undefined = undefined;

  for (const exitDir of exits) {
    const dest = carveSingleExitDirection(tiles, currentCoord, exitDir, isTarget);
    openedCoords.push(dest);
    if (isTarget) {
      targetCoord = dest;
    }
  }

  currentTile.exitsCarved = true;
  return { openedCoords, targetCoord };
}

/**
 * Resolves hallway traversal bidirectionally:
 * If neighborCoord is an intermediate hallway, follows the corridor through to the destination chamber.
 */
export function getDestinationThroughHallway(
  fromCoord: HexCoord,
  neighborCoord: HexCoord,
  tiles: Map<string, TunnelTile>
): HexCoord {
  const nTile = tiles.get(`${neighborCoord.col},${neighborCoord.row}`);
  if (!nTile || !nTile.isHallway) return neighborCoord;

  // Determine direction from fromCoord to neighborCoord
  let stepDir: DirectionIndex | null = null;
  for (let d = 1; d <= 6; d++) {
    const n = getOrganicNeighbor(fromCoord, d as DirectionIndex);
    if (n.col === neighborCoord.col && n.row === neighborCoord.row) {
      stepDir = d as DirectionIndex;
      break;
    }
  }

  if (!stepDir) return neighborCoord;

  // The connection coming into nTile from fromCoord is OPPOSITE_DIRECTIONS[stepDir]
  const backDir = OPPOSITE_DIRECTIONS[stepDir];
  const exitDir = nTile.connections.find((d) => d !== backDir);
  if (!exitDir) return neighborCoord;

  return getOrganicNeighbor(neighborCoord, exitDir);
}

export function getDirectionName(dir: DirectionIndex): string {
  switch (dir) {
    case 1:
      return 'NW';
    case 2:
      return 'North';
    case 3:
      return 'NE';
    case 4:
      return 'SE';
    case 5:
      return 'South';
    case 6:
      return 'SW';
    default:
      return '';
  }
}

export function formatExitsList(dirs: DirectionIndex[]): string {
  const names = dirs.map(getDirectionName).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function getCardConciseDescription(card: TunnelCard, exitDirs?: DirectionIndex[]): string {
  if (card.effect === 'dead_end') {
    return 'Dead end collapsed by rockfall. No forward exits.';
  }
  if (card.effect === 'trap') {
    return 'Spring blades sprung! Roll Fate D6 to dodge.';
  }
  if (card.effect === 'treasure') {
    return 'Ancient strongbox found! Roll Fate D6 for bonus Energy.';
  }
  if (card.effect === 'target') {
    if (exitDirs && exitDirs.length > 0) {
      return `The Grand Exit Archway revealed to the ${formatExitsList(exitDirs)}! Move onto it to win.`;
    }
    return 'The Grand Exit Archway revealed! Move onto it to win.';
  }
  if (card.effect === 'fork') {
    if (exitDirs && exitDirs.length > 0) {
      return `Fork passage with two exits to the ${formatExitsList(exitDirs)}.`;
    }
    return 'Fork passage with two exits.';
  }
  if (card.effect === 'chamber') {
    if (exitDirs && exitDirs.length > 0) {
      return `Large chamber with three exits to the ${formatExitsList(exitDirs)}.`;
    }
    return 'Large chamber with three exits.';
  }
  return card.description;
}
