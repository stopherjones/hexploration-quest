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
    | 'wheel';
  energyChange?: number;
  streakChange?: number;
  resetStreak?: boolean;
  isDeath?: boolean;
}

export const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 'tarot-0',
    number: '0',
    name: 'The Fool',
    arcana: 'major',
    symbol: '🃏',
    flavor: 'A leap into the unknown with an open heart and boundless hope.',
    effectDescription: 'Gain +3⚡ Energy and reset current streak to 0.',
    effectType: 'energy_bonus',
    energyChange: 3,
    resetStreak: true,
  },
  {
    id: 'tarot-1',
    number: 'I',
    name: 'The Magician',
    arcana: 'major',
    symbol: '🪄',
    flavor: 'As above, so below. Infinite skill channels destiny into reality.',
    effectDescription: 'Conjures a tactical bonus card directly into your Hand.',
    effectType: 'add_card',
    energyChange: 1,
  },
  {
    id: 'tarot-2',
    number: 'II',
    name: 'The High Priestess',
    arcana: 'major',
    symbol: '🔮',
    flavor: 'The veil of mysteries parts, revealing hidden wisdom.',
    effectDescription: 'Deep intuition restores +3⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 3,
  },
  {
    id: 'tarot-3',
    number: 'III',
    name: 'The Empress',
    arcana: 'major',
    symbol: '👑',
    flavor: 'Boundless motherly bounty nurtures the weary traveler.',
    effectDescription: 'Abundant vitality: Gain +4⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 4,
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
    effectDescription: 'Harmony: Gain +2⚡ Energy and increase Streak by +1.',
    effectType: 'streak_boost',
    energyChange: 2,
    streakChange: 1,
  },
  {
    id: 'tarot-7',
    number: 'VII',
    name: 'The Chariot',
    arcana: 'major',
    symbol: '🐎',
    flavor: 'Triumph over contradiction, driving forward at fierce velocity.',
    effectDescription: 'Unstoppable momentum: Gain +2⚡ Energy and boost Streak by +2.',
    effectType: 'streak_boost',
    energyChange: 2,
    streakChange: 2,
  },
  {
    id: 'tarot-8',
    number: 'VIII',
    name: 'Strength',
    arcana: 'major',
    symbol: '🦁',
    flavor: 'Gentle mastery over the raging beast of the depths.',
    effectDescription: 'Unyielding stamina: Gain +3⚡ Energy.',
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
    effectDescription: 'Gamble of destiny: 50% chance for +5⚡ Energy, 50% chance for -2⚡.',
    effectType: 'wheel',
  },
  {
    id: 'tarot-11',
    number: 'XI',
    name: 'Justice',
    arcana: 'major',
    symbol: '⚖️',
    flavor: 'The twin scales weigh deeds and fate with absolute precision.',
    effectDescription: 'Karmic restoration: Gain +3⚡ Energy.',
    effectType: 'energy_bonus',
    energyChange: 3,
  },
  {
    id: 'tarot-12',
    number: 'XII',
    name: 'The Hanged Man',
    arcana: 'major',
    symbol: '🪢',
    flavor: 'Surrender of pride to attain transcendent vision.',
    effectDescription: 'Sacrificial insight: Costs -2⚡ Energy, but draws 1 card into your Hand.',
    effectType: 'add_card',
    energyChange: -2,
  },
  {
    id: 'tarot-13',
    number: 'XIII',
    name: 'Death',
    arcana: 'major',
    symbol: '💀',
    flavor: 'The pale horseman sweeps across the pyramid. The end of all mortal voyages.',
    effectDescription: 'Mortality strikes! Game Over unless you sacrifice 2 cards from your Hand.',
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
    effectDescription: 'Inner equilibrium: Gain +3⚡ Energy and clear any negative streak to 0.',
    effectType: 'streak_reset',
    energyChange: 3,
    resetStreak: true,
  },
  {
    id: 'tarot-15',
    number: 'XV',
    name: 'The Devil',
    arcana: 'major',
    symbol: '😈',
    flavor: 'Chains of shadow seize what you hold dearest.',
    effectDescription: 'Malignant toll: Discards 1 random card from your Hand (or -3⚡ if hand is empty).',
    effectType: 'lose_card',
    energyChange: -3,
  },
  {
    id: 'tarot-16',
    number: 'XVI',
    name: 'The Tower',
    arcana: 'major',
    symbol: '⚡',
    flavor: 'Lightning shatters the citadel of false security.',
    effectDescription: 'Cataclysmic shockwave: Drains -3⚡ Energy and resets streak to 0.',
    effectType: 'energy_penalty',
    energyChange: -3,
    resetStreak: true,
  },
  {
    id: 'tarot-17',
    number: 'XVII',
    name: 'The Star',
    arcana: 'major',
    symbol: '🌟',
    flavor: 'Seven celestial lights illuminate the crystal waters.',
    effectDescription: 'Guiding hope: Restores +5⚡ Energy!',
    effectType: 'energy_bonus',
    energyChange: 5,
  },
  {
    id: 'tarot-18',
    number: 'XVIII',
    name: 'The Moon',
    arcana: 'major',
    symbol: '🌙',
    flavor: 'Howling beasts and shadowy delusions distort the path.',
    effectDescription: 'Perilous illusions: Drains -2⚡ Energy and resets streak to 0.',
    effectType: 'energy_penalty',
    energyChange: -2,
    resetStreak: true,
  },
  {
    id: 'tarot-19',
    number: 'XIX',
    name: 'The Sun',
    arcana: 'major',
    symbol: '☀️',
    flavor: 'Warm golden rays banish the dark and renew the soul.',
    effectDescription: 'Radiant triumph: Restores +6⚡ Energy and increases streak by +1!',
    effectType: 'energy_bonus',
    energyChange: 6,
    streakChange: 1,
  },
  {
    id: 'tarot-20',
    number: 'XX',
    name: 'Judgement',
    arcana: 'major',
    symbol: '🎺',
    flavor: 'The great horn sounds, calling forth your true potential.',
    effectDescription: 'Reckoning: Gain +3⚡ Energy and draw 1 bonus card into your Hand.',
    effectType: 'add_card',
    energyChange: 3,
  },
  {
    id: 'tarot-21',
    number: 'XXI',
    name: 'The World',
    arcana: 'major',
    symbol: '🌍',
    flavor: 'The grand ouroboros is complete. Absolute mastery of the pyramid.',
    effectDescription: 'Supreme apotheosis: Gain +4⚡ Energy and draw 1 high-value card into Hand.',
    effectType: 'add_card',
    energyChange: 4,
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
