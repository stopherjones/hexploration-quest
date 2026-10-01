export interface TarotCard {
  id: string;
  number: string; // Roman numeral e.g. "0", "I", "II", ..., "XXI"
  name: string;
  arcana: 'major';
  symbol: string;
  flavor: string;
  effectDescription: string;
  effectType:
    | 'energy_bonus'
    | 'energy_penalty'
    | 'streak_boost'
    | 'streak_reset'
    | 'add_card'
    | 'lose_card'
    | 'death'
    | 'wheel'
    | 'skip_columns'
    | 'choose_card'
    | 'next_success'
    | 'next_cost'
    | 'discard_hand_or_zero'
    | 'discard_random_or_energy'
    | 'dice_modifier'
    | 'magic_card';
  energyChange?: number;
  streakChange?: number;
  resetStreak?: boolean;
  isDeath?: boolean;
  skipColumns?: number;
  diceModifier?: 'adjust' | 'flip' | 'set';
  magicScore?: 0 | 1;
}

export const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 'tarot-0',
    number: '0',
    name: 'The Fool',
    arcana: 'major',
    symbol: '🃏',
    flavor: 'A leap into the unknown with an open heart and boundless hope.',
    effectDescription: 'What madness: Skip straight to the right-hand column without drawing any cards.',
    effectType: 'skip_columns',
    skipColumns: 1,
  },
  {
    id: 'tarot-1',
    number: 'I',
    name: 'The Magician',
    arcana: 'major',
    symbol: '🪄',
    flavor: 'As above, so below. Infinite skill channels destiny into reality.',
    effectDescription: 'Pick a card: draw three cards and add one to your Hand.',
    effectType: 'choose_card',
  },
  {
    id: 'tarot-2',
    number: 'II',
    name: 'The High Priestess',
    arcana: 'major',
    symbol: '🔮',
    flavor: 'The veil of mysteries parts, revealing hidden wisdom.',
    effectDescription: 'Deep intuition: Boost +1⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 1,
  },
  {
    id: 'tarot-3',
    number: 'III',
    name: 'The Empress',
    arcana: 'major',
    symbol: '👑',
    flavor: 'Boundless motherly bounty nurtures the weary traveler.',
    effectDescription: 'Abundant vitality: Gain +3⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 3,
  },
  {
    id: 'tarot-4',
    number: 'IV',
    name: 'The Emperor',
    arcana: 'major',
    symbol: '🏛️',
    flavor: 'Unyielding authority and structural order.',
    effectDescription: 'Iron discipline: Gain +2⚡ Energy and steady resolve.',
    effectType: 'energy_bonus',
    energyChange: 2,
  },
  {
    id: 'tarot-5',
    number: 'V',
    name: 'The Hierophant',
    arcana: 'major',
    symbol: '📜',
    flavor: 'Sacred doctrines of elder explorers guide the climb.',
    effectDescription: 'Spiritual guidance: Gain +3⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 3,
  },
  {
    id: 'tarot-6',
    number: 'VI',
    name: 'The Lovers',
    arcana: 'major',
    symbol: '❤️',
    flavor: 'Divine alignment of dual forces into unified strength.',
    effectDescription: 'Harmony: Boost streak by +1 (or reduce a negative streak by 1).',
    effectType: 'streak_boost',
    streakChange: 1,
  },
  {
    id: 'tarot-7',
    number: 'VII',
    name: 'The Chariot',
    arcana: 'major',
    symbol: '🐎',
    flavor: 'Triumph over contradiction, driving forward at fierce velocity.',
    effectDescription: 'Unstoppable momentum: Skip forward two columns.',
    effectType: 'skip_columns',
    skipColumns: 2,
  },
  {
    id: 'tarot-8',
    number: 'VIII',
    name: 'Strength',
    arcana: 'major',
    symbol: '🦁',
    flavor: 'Gentle mastery over the raging beast of the depths.',
    effectDescription: 'Gentle mastery: Gain +3⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 3,
  },
  {
    id: 'tarot-9',
    number: 'IX',
    name: 'The Hermit',
    arcana: 'major',
    symbol: '🕯️',
    flavor: 'The lantern in the dark shines brightest when walking in solitary contemplation.',
    effectDescription: 'Quiet respite: Gain +2⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 2,
  },
  {
    id: 'tarot-10',
    number: 'X',
    name: 'Wheel of Fortune',
    arcana: 'major',
    symbol: '🎡',
    flavor: 'The great wheel turns without mercy or malice.',
    effectDescription: 'Gamble of destiny: 50% chance for +5⚡ Energy, 50% chance for -5⚡.',
    effectType: 'wheel',
  },
  {
    id: 'tarot-11',
    number: 'XI',
    name: 'Justice',
    arcana: 'major',
    symbol: '⚖️',
    flavor: 'The twin scales weigh deeds and fate with absolute precision.',
    effectDescription: 'Karmic restoration: Treat your next card draw as successful, regardless of the card.',
    effectType: 'next_success',
  },
  {
    id: 'tarot-12',
    number: 'XII',
    name: 'The Hanged Man',
    arcana: 'major',
    symbol: '🪢',
    flavor: 'Surrender of pride to attain transcendent vision.',
    effectDescription: 'Sacrificial insight: Your next prediction costs 5⚡ Energy.',
    effectType: 'next_cost',
  },
  {
    id: 'tarot-13',
    number: 'XIII',
    name: 'Death',
    arcana: 'major',
    symbol: '💀',
    flavor: 'The pale horseman sweeps across the pyramid. The end of all mortal voyages.',
    effectDescription: 'Mortality strikes: Game over.',
    effectType: 'death',
    isDeath: true,
  },
  {
    id: 'tarot-14',
    number: 'XIV',
    name: 'Temperance',
    arcana: 'major',
    symbol: '🌊',
    flavor: 'Pouring the waters of life between silver and gold cups.',
    effectDescription: 'Inner equilibrium: Reset streak to 0.',
    effectType: 'streak_reset',
    resetStreak: true,
  },
  {
    id: 'tarot-15',
    number: 'XV',
    name: 'The Devil',
    arcana: 'major',
    symbol: '😈',
    flavor: 'Chains of shadow seize what you hold dearest.',
    effectDescription: 'Malignant toll: Discard all cards in your Hand, or set Energy to 0 if your Hand is empty. You must then make a successful prediction to continue.',
    effectType: 'discard_hand_or_zero',
  },
  {
    id: 'tarot-16',
    number: 'XVI',
    name: 'The Tower',
    arcana: 'major',
    symbol: '⚡',
    flavor: 'Lightning shatters the citadel of false security.',
    effectDescription: 'Dark foreboding: Discard 1 random card from your Hand, or lose 3⚡ Energy if your Hand is empty.',
    effectType: 'discard_random_or_energy',
  },
  {
    id: 'tarot-17',
    number: 'XVII',
    name: 'The Star',
    arcana: 'major',
    symbol: '🌟',
    flavor: 'Seven celestial lights illuminate the crystal waters.',
    effectDescription: 'Guiding hope: Gain a one-time Level 3 dice modifier to adjust one die by +1 or -1.',
    effectType: 'dice_modifier',
    diceModifier: 'adjust',
  },
  {
    id: 'tarot-18',
    number: 'XVIII',
    name: 'The Moon',
    arcana: 'major',
    symbol: '🌙',
    flavor: 'Howling beasts and shadowy delusions distort the path.',
    effectDescription: 'Perilous illusions: Gain a one-time Level 3 dice modifier to flip one die (1↔6, 2↔5, 3↔4).',
    effectType: 'dice_modifier',
    diceModifier: 'flip',
  },
  {
    id: 'tarot-19',
    number: 'XIX',
    name: 'The Sun',
    arcana: 'major',
    symbol: '☀️',
    flavor: 'Warm golden rays banish the dark and renew the soul.',
    effectDescription: 'Radiant triumph: Gain a one-time Level 3 dice modifier to set one die to any value.',
    effectType: 'dice_modifier',
    diceModifier: 'set',
  },
  {
    id: 'tarot-20',
    number: 'XX',
    name: 'Judgement',
    arcana: 'major',
    symbol: '🎺',
    flavor: 'The great horn sounds, calling forth your true potential.',
    effectDescription: 'Reckoning: Gain a magic card that sets any Level 3 sum to 1.',
    effectType: 'magic_card',
    magicScore: 1,
  },
  {
    id: 'tarot-21',
    number: 'XXI',
    name: 'The World',
    arcana: 'major',
    symbol: '🌍',
    flavor: 'The grand ouroboros is complete. Absolute mastery of the pyramid.',
    effectDescription: 'Supreme apotheosis: Gain a magic card that sets any Level 3 sum to 0.',
    effectType: 'magic_card',
    magicScore: 0,
  },
];

/** Shuffles a fresh 22-card Major Arcana Tarot deck */
export function createShuffledTarotDeck(): TarotCard[] {
  const deck = [...MAJOR_ARCANA];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
