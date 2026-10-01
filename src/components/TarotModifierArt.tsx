import React from 'react';
import starArt from '../assets/colori/17-star.svg?url';
import moonArt from '../assets/colori/18-moon.svg?url';
import sunArt from '../assets/colori/19-sun.svg?url';
import judgementArt from '../assets/colori/20-judgement.svg?url';
import worldArt from '../assets/colori/21-world.svg?url';
import { ExplorationCard } from '../utils/explorationDeck';

export const tarotModifierArt: Record<NonNullable<ExplorationCard['tarotCard']>, { src: string; name: string }> = {
  star: { src: starArt, name: 'The Star' },
  moon: { src: moonArt, name: 'The Moon' },
  sun: { src: sunArt, name: 'The Sun' },
  judgement: { src: judgementArt, name: 'Judgement' },
  world: { src: worldArt, name: 'The World' },
};

interface TarotModifierArtProps {
  card: ExplorationCard;
  className?: string;
}

export const TarotModifierArt: React.FC<TarotModifierArtProps> = ({ card, className = '' }) => {
  if (!card.tarotCard) return null;
  const art = tarotModifierArt[card.tarotCard];

  return (
    <img
      src={art.src}
      alt={`${art.name} Tarot modifier`}
      title={art.name}
      className={className}
    />
  );
};
