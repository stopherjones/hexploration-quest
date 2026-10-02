import React, { useState } from 'react';
import { EventPrompt } from '../types';
import { sounds } from '../utils/sound';
import {
  Dices,
  Sparkles,
  AlertTriangle,
  Compass,
  BatteryCharging,
  Eye,
  Flag,
  MapPin,
  X,
  CheckCircle2,
} from 'lucide-react';

interface EventModalProps {
  prompt: EventPrompt | null;
  onResolve: (resultRoll?: number) => void;
}

// Authentic Pip Die Renderer (1-6 pips, no numeric digits)
const PipDie: React.FC<{ value: number | null; isRolling: boolean }> = ({ value, isRolling }) => {
  const pipsMap: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const activePips = value ? pipsMap[value] || [4] : [];

  if (value === null) {
    return (
      <div className="w-16 h-16 bg-[#fdfbf7] border-2 border-[#2b261f] rounded-xl shadow-md flex items-center justify-center">
        <Dices className="w-8 h-8 text-[#786e5e]" />
      </div>
    );
  }

  return (
    <div
      className={`w-16 h-16 bg-[#fdfbf7] border-2 border-[#2b261f] rounded-xl shadow-md p-2 grid grid-cols-3 grid-rows-3 transition-transform ${
        isRolling ? 'scale-105 animate-pulse' : 'scale-110'
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {activePips.includes(i) && (
            <div className="w-2.5 h-2.5 rounded-full bg-[#1c1917] shadow-xs" />
          )}
        </div>
      ))}
    </div>
  );
};

export const EventModal: React.FC<EventModalProps> = ({ prompt, onResolve }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [rollResult, setRollResult] = useState<number | null>(null);

  if (!prompt) return null;

  const handleFateRoll = () => {
    setIsRolling(true);
    sounds.playDiceRoll();

    let count = 0;
    const interval = setInterval(() => {
      setRollResult(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 8) {
        clearInterval(interval);
        const finalDie = Math.floor(Math.random() * 6) + 1;
        setRollResult(finalDie);
        setIsRolling(false);

        setTimeout(() => {
          onResolve(finalDie);
          setRollResult(null);
        }, 1500);
      }
    }, 80);
  };

  const isHazard = prompt.type === 'rift' || prompt.type === 'bog' || prompt.type === 'tunnel_trap';
  const isInteractiveRoll =
    prompt.type === 'shrine' ||
    prompt.type === 'rift' ||
    prompt.type === 'tunnel_trap' ||
    prompt.type === 'tunnel_treasure';

  // Choose icon based on tile type
  const renderIcon = () => {
    switch (prompt.type) {
      case 'tunnel_trap':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'tunnel_treasure':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'tower':
        return <Eye className="w-5 h-5 text-[#b45309]" />;
      case 'cache':
        return <BatteryCharging className="w-5 h-5 text-[#15803d]" />;
      case 'bog':
        return <AlertTriangle className="w-5 h-5 text-[#991b1b]" />;
      case 'rift':
        return <AlertTriangle className="w-5 h-5 text-[#991b1b]" />;
      case 'shrine':
        return <Sparkles className="w-5 h-5 text-[#7e22ce]" />;
      case 'clue':
        return <Compass className="w-5 h-5 text-[#b45309]" />;
      case 'start':
        return <Flag className="w-5 h-5 text-[#d97706]" />;
      default:
        return <MapPin className="w-5 h-5 text-[#44403c]" />;
    }
  };

  // Header background theme
  const getHeaderBg = () => {
    switch (prompt.type) {
      case 'tunnel_trap':
        return 'bg-rose-950 text-rose-200 border-rose-700';
      case 'tunnel_treasure':
        return 'bg-amber-950 text-amber-200 border-amber-600';
      case 'tower':
        return 'bg-[#fef3c7] text-[#92400e] border-[#b45309]';
      case 'cache':
        return 'bg-[#dcfce7] text-[#166534] border-[#15803d]';
      case 'bog':
      case 'rift':
        return 'bg-[#fee2e2] text-[#991b1b] border-[#b91c1c]';
      case 'shrine':
        return 'bg-[#f3e8ff] text-[#6b21a8] border-[#7e22ce]';
      case 'clue':
        return 'bg-[#ffedd5] text-[#9a3412] border-[#c2410c]';
      case 'start':
        return 'bg-[#fef9c3] text-[#854d0e] border-[#ca8a04]';
      default:
        return 'bg-[#e2d5bd] text-[#2b261f] border-[#2b261f]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div
          className={`py-3 px-4 border-b-2 font-mono font-black text-sm uppercase tracking-wider flex items-center justify-between ${getHeaderBg()}`}
        >
          <div className="flex items-center gap-2 text-left">
            {renderIcon()}
            <div>
              <div className="text-[10px] opacity-75 leading-tight">
                {prompt.category || 'Expedition Alert'}
              </div>
              <div className="text-sm font-black">{prompt.title}</div>
            </div>
          </div>

          {!isInteractiveRoll && (
            <button
              onClick={() => onResolve()}
              className="p-1 hover:bg-black/10 rounded-md transition-colors text-inherit"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 font-mono text-xs text-[#2b261f]">
          {/* Description */}
          <p className="leading-relaxed text-[#2b261f] text-xs sm:text-sm font-medium">
            {prompt.description}
          </p>

          {/* Stat Badge if applicable */}
          {prompt.statBadge && (
            <div className="p-2.5 bg-[#fdfbf7] border border-[#2b261f]/40 rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-[#2d6a4f]" />
              <span>{prompt.statBadge}</span>
            </div>
          )}

          {/* Interactive D6 dice roller for Shrine & Rift - shows pips, not numbers */}
          {isInteractiveRoll && (
            <div className="flex flex-col items-center justify-center py-2">
              <PipDie value={rollResult} isRolling={isRolling} />

              {rollResult !== null && !isRolling && (
                <div className="mt-2 text-xs font-bold font-mono">
                  {prompt.type === 'shrine' ? (
                    rollResult === 1 ? (
                      <span className="text-[#15803d]">👟 1 Pip: Free Move! Step into an adjacent hex for 0 ⚡!</span>
                    ) : rollResult === 2 ? (
                      <span className="text-[#1e40af]">🔭 2 Pips: Brass Telescope! Towers reveal all 6 directions!</span>
                    ) : rollResult === 3 ? (
                      <span className="text-[#6b21a8]">🎲 3 Pips: Dice Modifier! Adjust either die ±1 each turn!</span>
                    ) : rollResult === 4 ? (
                      <span className="text-[#15803d]">👟⚡ 4 Pips: Free Move & +2 Energy restored!</span>
                    ) : rollResult === 5 ? (
                      <span className="text-[#1e40af]">🔭⚡ 5 Pips: Brass Telescope & +2 Energy restored!</span>
                    ) : (
                      <span className="text-[#6b21a8]">🎲⚡ 6 Pips: Dice Modifier & +2 Energy restored!</span>
                    )
                  ) : prompt.type === 'rift' ? (
                    rollResult % 2 !== 0 ? (
                      <span className="text-[#b91c1c]">Odd Pips: Entangled! -2 Energy penalty! ⚠️</span>
                    ) : (
                      <span className="text-[#2d6a4f]">Even Pips: Safely navigated through the rift! ✨</span>
                    )
                  ) : prompt.type === 'tunnel_trap' ? (
                    rollResult % 2 !== 0 ? (
                      <span className="text-[#b91c1c]">
                        Odd ({rollResult} {rollResult === 1 ? 'Pip' : 'Pips'}): Trap sprang! -2 Energy penalty! ⚠️
                      </span>
                    ) : (
                      <span className="text-[#15803d]">
                        Even ({rollResult} Pips): Sprang aside safely! No damage taken! ✨
                      </span>
                    )
                  ) : prompt.type === 'tunnel_treasure' ? (
                    <span className="text-[#b45309]">
                      {rollResult} {rollResult === 1 ? 'Pip' : 'Pips'}: +{rollResult} Energy restored from ancient vault! 💎
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {isInteractiveRoll ? (
            <button
              onClick={handleFateRoll}
              disabled={isRolling || rollResult !== null}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md cursor-pointer disabled:opacity-50"
            >
              {isRolling ? 'Rolling Fate D6...' : rollResult ? 'Resolving...' : 'Roll Fate D6!'}
            </button>
          ) : (
            <button
              onClick={() => onResolve()}
              className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg border-2 border-[#2b261f] shadow-md cursor-pointer active:scale-98 transition-all"
            >
              {prompt.category === 'Tile Inspection' ? 'Close Info' : 'Continue Expedition'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

