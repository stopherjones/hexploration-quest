export type ExplorationSuit = '♠' | '♣' | '♦' | '♥';

export type CardRank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface ExplorationCard {
  id: string;
  suit: ExplorationSuit;
  rank: CardRank;
  value: number; // 2..10 for numbers, 11 for J, 12 for Q, 13 for K, 14 for A
  isHonor: boolean; // J, Q, K, A
  isAceOfSpades: boolean;
  level3DiceModifier?: 'adjust' | 'flip' | 'set';
  level3SetScore?: 0 | 1;
  tarotCard?: 'star' | 'moon' | 'sun' | 'judgement' | 'world';
}

export const ALL_SUITS: ExplorationSuit[] = ['♠', '♣', '♦'];
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

export function getRankNumericValue(rank: CardRank): number {
  switch (rank) {
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    case '10': return 10;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    case 'A': return 14;
  }
}

export function isHonorRank(rank: CardRank): boolean {
  return rank === 'J' || rank === 'Q' || rank === 'K' || rank === 'A';
}

/**
 * Creates and shuffles the 39-card Exploration Deck containing all ♠, ♣, and ♦ cards.
 * Ace of Spades can be anywhere in the 39 cards.
 */
export function createExplorationDeck(): ExplorationCard[] {
  const cards: ExplorationCard[] = [];

  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      cards.push({
        id: `exp-${suit}-${rank}-${Math.random().toString(36).substring(2, 9)}`,
        suit,
        rank,
        value: getRankNumericValue(rank),
        isHonor: isHonorRank(rank),
        isAceOfSpades: suit === '♠' && rank === 'A',
      });
    }
  }

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

/**
 * Draws cards from deck until a non-honor (2..10) is found to serve as starting card.
 * Honor cards drawn during this setup are discarded.
 */
export function drawInitialComparisonCard(deck: ExplorationCard[]): {
  card: ExplorationCard;
  remainingDeck: ExplorationCard[];
  discarded: ExplorationCard[];
} {
  const remaining = [...deck];
  const discarded: ExplorationCard[] = [];

  while (remaining.length > 0) {
    const candidate = remaining.shift()!;
    if (!candidate.isHonor) {
      return { card: candidate, remainingDeck: remaining, discarded };
    }
    discarded.push(candidate);
  }

  // Fallback (impossible with standard deck)
  const fallback: ExplorationCard = {
    id: `fallback-${Date.now()}`,
    suit: '♠',
    rank: '7',
    value: 7,
    isHonor: false,
    isAceOfSpades: false,
  };
  return { card: fallback, remainingDeck: remaining, discarded };
}

/**
 * Creates 5 distinct cards for testing Level 3:
 * 10♦ (val: 10), 8♠ (val: 8), 6♣ (val: 6), 4♦ (val: 4), 2♠ (val: 2).
 * These give 30 total reduction points and tactical coverage across values.
 */
export function createLevel3TestHand(): ExplorationCard[] {
  const seed = Date.now();
  return [
    {
      id: `test-10d-${seed}-1`,
      suit: '♦',
      rank: '10',
      value: 10,
      isHonor: false,
      isAceOfSpades: false,
    },
    {
      id: `test-8s-${seed}-2`,
      suit: '♠',
      rank: '8',
      value: 8,
      isHonor: false,
      isAceOfSpades: false,
    },
    {
      id: `test-6c-${seed}-3`,
      suit: '♣',
      rank: '6',
      value: 6,
      isHonor: false,
      isAceOfSpades: false,
    },
    {
      id: `test-4d-${seed}-4`,
      suit: '♦',
      rank: '4',
      value: 4,
      isHonor: false,
      isAceOfSpades: false,
    },
    {
      id: `test-2s-${seed}-5`,
      suit: '♠',
      rank: '2',
      value: 2,
      isHonor: false,
      isAceOfSpades: false,
    },
  ];
}
