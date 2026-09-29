import { DirectionIndex, HexCoord } from '../types';

export type HeartCardRank =
  | 'A'
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
  | 'K';

export type TunnelCardEffect =
  | 'target'
  | 'fork'
  | 'chamber'
  | 'dead_end'
  | 'trap'
  | 'treasure';

export interface TunnelCard {
  id: string;
  rank: HeartCardRank;
  suit: '♥';
  effect: TunnelCardEffect;
  name: string;
  description: string;
  // Directions relative to the heading:
  // Fork: NW (1) and NE (3)
  // Chamber: N (2), NW (1), NE (3)
  // Dead End: same direction as traveler was heading
  // Trap: forward passage with hazard
  // Treasure: forward passage with fortune
  // Target: Grand Subterranean Exit
}

export const ALL_HEART_RANKS: HeartCardRank[] = [
  'A',
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
];

export const STANDARD_CHAMBER_RANKS: HeartCardRank[] = [
  '2',
  '3',
  '4',
  '6',
  '8',
  '9',
  '10',
];

export function isStandardChamber(card: TunnelCard | null | undefined): boolean {
  if (!card) return false;
  return STANDARD_CHAMBER_RANKS.includes(card.rank);
}

export function getCardDetails(rank: HeartCardRank): Omit<TunnelCard, 'id'> {
  switch (rank) {
    case 'A':
      return {
        rank,
        suit: '♥',
        effect: 'treasure',
        name: 'Ace of Hearts — Primordial Vault',
        description: 'Honor Card! Bank a card into your Hand for Level 3 to reduce Utopia Engine dice scores, then draw a card for exits.',
      };
    case '2':
    case '4':
    case '8':
    case '10':
      return {
        rank,
        suit: '♥',
        effect: 'fork',
        name: `${rank} of Hearts — Fork Passage`,
        description: 'Two carved stone tunnels branch outward into the darkness. Center path blocked by solid bedrock.',
      };
    case '3':
    case '6':
    case '9':
      return {
        rank,
        suit: '♥',
        effect: 'chamber',
        name: `${rank} of Hearts — Great Chamber`,
        description: 'An open subterranean cavern junction carving three illuminated corridor exits ahead.',
      };
    case '5':
    case '7':
      return {
        rank,
        suit: '♥',
        effect: 'dead_end',
        name: `${rank} of Hearts — Collapsed Cave-In`,
        description: 'Dead end! Tumbled boulders collapse the passage ahead. Creates no forward exits. Retrace your steps back to another live branch.',
      };
    case 'J':
      return {
        rank,
        suit: '♥',
        effect: 'trap',
        name: 'Jack of Hearts — Trapped Chamber',
        description: 'Honor Card! Bank a card into your Hand for Level 3 to reduce Utopia Engine dice scores, then draw a card for exits.',
      };
    case 'Q':
      return {
        rank,
        suit: '♥',
        effect: 'treasure',
        name: 'Queen of Hearts — Ancient Vault',
        description: 'Honor Card! Bank a card into your Hand for Level 3 to reduce Utopia Engine dice scores, then draw a card for exits.',
      };
    case 'K':
      return {
        rank,
        suit: '♥',
        effect: 'treasure',
        name: 'King of Hearts — Royal Crypt',
        description: 'Honor Card! Bank a card into your Hand for Level 3 to reduce Utopia Engine dice scores, then draw a card for exits.',
      };
  }
}

/**
 * Creates and shuffles a standard 13-card Hearts suit deck adhering to game constraints:
 * 1. Ace of Hearts must be in the second half of the deck (indices 7 to 12).
 * 2. 5 and 7 of Hearts cannot be the first card drawn (index 0).
 */
export function createShuffledHeartsDeck(): TunnelCard[] {
  // Take ranks except 'A', '5', '7'
  const poolA: HeartCardRank[] = ['2', '3', '4', '6', '8', '9', '10', 'J', 'Q', 'K'];
  // Shuffle poolA
  for (let i = poolA.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolA[i], poolA[j]] = [poolA[j], poolA[i]];
  }

  // Pick index 0 from poolA (guarantees not 5, not 7, not A)
  const firstCard = poolA.pop()!;

  // Now we have the remaining 9 cards from poolA, plus '5' and '7' (total 11 cards)
  const remaining11: HeartCardRank[] = [...poolA, '5', '7'];
  for (let i = remaining11.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining11[i], remaining11[j]] = [remaining11[j], remaining11[i]];
  }

  // Construct deck of 12 cards first (firstCard at 0, followed by remaining11)
  const deck12: HeartCardRank[] = [firstCard, ...remaining11];

  // Insert 'A' into the second half: indices 7 to 12 (inclusive)
  // Index 7 to 12 corresponds to positions 8 through 13 in a 13-card deck
  const aceInsertIndex = 7 + Math.floor(Math.random() * (deck12.length + 1 - 7));
  deck12.splice(aceInsertIndex, 0, 'A');

  return deck12.map((rank, index) => ({
    id: `heart-${rank}-${index}-${Date.now()}`,
    ...getCardDetails(rank),
  }));
}
