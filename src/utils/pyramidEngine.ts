import { ExplorationCard, CardRank, ExplorationSuit, getRankNumericValue } from './explorationDeck';
import { TarotCard, createShuffledTarotDeck } from './tarotDeck';

export interface PyramidHex {
  id: string; // e.g. "0,0" or "c,r"
  col: number; // 0 to 10 (11 columns)
  row: number; // 0 to col (col+1 rows in column)
  isEvent: boolean;
  visited: boolean;
  isStart?: boolean;
  isGoalCol?: boolean;
  drawnCard?: ExplorationCard | null;
  drawnTarot?: TarotCard | null;
  predictionMade?: 'higher' | 'lower' | 'start' | null;
}

export const PYRAMID_COLS = 11;
export const PYRAMID_TOTAL_HEXES = 66; // 11 * 12 / 2

export interface PyramidState {
  columns: number; // 11
  totalHexes: number; // 66
  tiles: Map<string, PyramidHex>;
  playerPos: { col: number; row: number };
  baseCard: ExplorationCard;
  drawnCard: ExplorationCard | null;
  deck: ExplorationCard[];
  tarotDeck: TarotCard[];
  streak: number;
  steps: number;
  visitedPath: { col: number; row: number }[];
  isCompleted: boolean;
}

export const ALL_FOUR_SUITS: ExplorationSuit[] = ['♠', '♥', '♦', '♣'];
export const ALL_RANKS: CardRank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];

/**
 * Creates a full 52-card standard deck (including Hearts, Diamonds, Clubs, Spades)
 * Shuffled using Fisher-Yates.
 */
export function createFull52Deck(): ExplorationCard[] {
  const cards: ExplorationCard[] = [];
  for (const suit of ALL_FOUR_SUITS) {
    for (const rank of ALL_RANKS) {
      const isHonor = rank === 'J' || rank === 'Q' || rank === 'K';
      cards.push({
        id: `card-${suit}-${rank}-${Math.random().toString(36).substring(2, 7)}`,
        suit,
        rank,
        value: rank === 'A' ? 1 : getRankNumericValue(rank),
        isHonor,
        isAceOfSpades: false, // In Level 2, Ace of Spades is treated as a regular Ace; victory is reaching the final column.
      });
    }
  }

  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

/**
 * Generates the 66-hex sideways pyramid (11 columns, col 0 has 1 hex, col 10 has 11 hexes).
 * Seeds 21 random event hexes across columns 1 to 10.
 */
export function generatePyramidMap(): {
  tiles: Map<string, PyramidHex>;
  baseCard: ExplorationCard;
  remainingDeck: ExplorationCard[];
  tarotDeck: TarotCard[];
} {
  const deck = createFull52Deck();
  const tarotDeck = createShuffledTarotDeck();

  // Draw an initial numbered or Ace base card for the starting hex at (0, 0)
  let initialBaseIdx = deck.findIndex((c) => !c.isHonor);
  if (initialBaseIdx === -1) initialBaseIdx = 0;
  const [baseCard] = deck.splice(initialBaseIdx, 1);

  // All eligible coords for event hexes (cols 1..10)
  const eligibleEventCoords: { col: number; row: number }[] = [];
  for (let c = 1; c < PYRAMID_COLS; c++) {
    for (let r = 0; r <= c; r++) {
      eligibleEventCoords.push({ col: c, row: r });
    }
  }

  // Shuffle eligible coords and pick 21 (one for each card in Tarot trumps deck)
  for (let i = eligibleEventCoords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligibleEventCoords[i], eligibleEventCoords[j]] = [eligibleEventCoords[j], eligibleEventCoords[i]];
  }
  const eventCoordKeys = new Set(
    eligibleEventCoords.slice(0, 21).map((pt) => `${pt.col},${pt.row}`)
  );

  const tiles = new Map<string, PyramidHex>();

  for (let col = 0; col < PYRAMID_COLS; col++) {
    for (let row = 0; row <= col; row++) {
      const id = `${col},${row}`;
      const isStart = col === 0 && row === 0;
      const isGoalCol = col === PYRAMID_COLS - 1;
      const isEvent = eventCoordKeys.has(id);

      tiles.set(id, {
        id,
        col,
        row,
        isEvent,
        visited: isStart,
        isStart,
        isGoalCol,
        drawnCard: isStart ? baseCard : null,
        predictionMade: isStart ? 'start' : null,
      });
    }
  }

  return {
    tiles,
    baseCard,
    remainingDeck: deck,
    tarotDeck,
  };
}

/**
 * Gets the two forward neighbors in column col+1 for position (col, row):
 * - Higher: (col + 1, row) - "the hex on the row above in column two"
 * - Lower:  (col + 1, row + 1) - "the hex on the row below"
 */
export function getPyramidForwardMoves(
  pos: { col: number; row: number }
): {
  higher: { col: number; row: number } | null;
  lower: { col: number; row: number } | null;
} {
  if (pos.col >= PYRAMID_COLS - 1) {
    return { higher: null, lower: null };
  }
  return {
    higher: { col: pos.col + 1, row: pos.row },
    lower: { col: pos.col + 1, row: pos.row + 1 },
  };
}
