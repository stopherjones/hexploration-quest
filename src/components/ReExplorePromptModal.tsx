import React from 'react';
import { Compass, Zap, Sparkles, RefreshCw, X, ArrowRight, ShieldAlert } from 'lucide-react';

interface ReExplorePromptModalProps {
  isOpen: boolean;
  energy: number;
  unexploredCount: number;
  overlappingCount: number;
  onConfirmReExplore: () => void;
  onDismiss: () => void;
}

export const ReExplorePromptModal: React.FC<ReExplorePromptModalProps> = ({
  isOpen,
  energy,
  unexploredCount,
  overlappingCount,
  onConfirmReExplore,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150 text-[#2b261f]">
        
        {/* Header Bar */}
        <div className="py-2.5 px-3 border-b-2 border-[#2b261f] font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between bg-[#ede4d3]">
          <div className="flex items-center gap-1.5 text-left">
            <span className="text-sm">♠</span>
            <div>
              <div className="text-[10px] text-[#786e5e] font-normal leading-none">
                Subterranean Delve • Phase 2
              </div>
              <div className="text-xs font-black text-[#2b261f] mt-0.5">
                Map Fully Charted
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded hover:bg-[#d6c8b0] text-[#5c5244] border border-[#2b261f]/20 cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3 font-mono text-xs text-left">
          
          {/* Hero Banner */}
          <div className="text-center py-2 bg-[#fdfbf7] rounded-lg border border-[#d6c4a5] p-3 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 border-2 border-amber-600 flex items-center justify-center mb-2 shadow-xs">
              <RefreshCw className="w-6 h-6 text-amber-700 animate-spin-slow" />
            </div>
            <h3 className="text-sm font-black text-[#2b261f] uppercase tracking-wide">
              {unexploredCount === 0 ? 'All Chambers Explored!' : 'Re-Explore the Labyrinth!'}
            </h3>
            <p className="text-[11px] text-[#695d4d] leading-snug mt-1">
              {unexploredCount === 0 ? (
                <>
                  You have surveyed all available chambers in this delve cycle, but the gateway{' '}
                  <strong className="text-slate-900 font-black">Ace of Spades (A♠)</strong> is still
                  hidden in the subterranean labyrinth!
                </>
              ) : (
                <>
                  All 13 Hearts delve cards have been drawn and the entire subterranean map is charted on your parchment.
                  However, the gateway <strong className="text-slate-900 font-black">Ace of Spades (A♠)</strong> remains undiscovered!
                </>
              )}
            </p>
          </div>

          {/* Unexplored Exits summary or Reset Notice */}
          {unexploredCount > 0 ? (
            <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-2 flex items-center justify-between text-[11px] text-[#065f46]">
              <span className="font-bold flex items-center gap-1">
                <span>🔍</span> {unexploredCount} unexplored chamber{unexploredCount !== 1 ? 's' : ''} on map
              </span>
              {overlappingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-[#d1fae5] border border-[#6ee7b7] font-black text-[10px]">
                  {overlappingCount} overlapping
                </span>
              )}
            </div>
          ) : (
            <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-lg p-2.5 text-[11px] text-[#78350f] space-y-1">
              <div className="font-black flex items-center gap-1.5 text-xs text-[#92400e]">
                <span>✨</span> All Non-Dead Ends Will Be Marked Unexplored
              </div>
              <p className="text-[10.5px] leading-tight text-[#854d0e]">
                Continuing marks all non-dead-end rooms as unexplored again so you can survey each chamber anew for energy &amp; A♠ (preventing toggling between two visited rooms).
              </p>
            </div>
          )}

          {/* Second Descent Rules */}
          <div className="bg-[#ede4d3] rounded-lg border border-[#cfbe9f] p-2.5 space-y-2 text-[11px]">
            <div className="font-black text-[#2b261f] uppercase text-[10px] tracking-wider border-b border-[#2b261f]/15 pb-1">
              Re-Exploration Rules:
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded bg-amber-200 border border-amber-500 text-amber-900 font-black flex items-center justify-center shrink-0 text-xs">
                2⚡
              </span>
              <div>
                <strong className="text-[#2b261f]">Movement Cost: 2 Energy</strong>
                <p className="text-[#695d4d] leading-tight text-[10.5px]">
                  Navigating the extensive labyrinth passages now costs 2 ⚡ Energy per move.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded bg-emerald-200 border border-emerald-500 text-emerald-900 font-black flex items-center justify-center shrink-0 text-xs">
                ♠
              </span>
              <div>
                <strong className="text-[#2b261f]">Higher / Lower Chamber Survey</strong>
                <p className="text-[#695d4d] leading-tight text-[10.5px]">
                  Each unexplored chamber triggers the Higher / Lower survey. Streaks restore bonus energy (+1⚡, +2⚡, +3⚡...) to sustain your journey!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded bg-purple-200 border border-purple-500 text-purple-900 font-black flex items-center justify-center shrink-0 text-xs">
                🏆
              </span>
              <div>
                <strong className="text-[#2b261f]">Hunt for the Ace of Spades (A♠)</strong>
                <p className="text-[#695d4d] leading-tight text-[10.5px]">
                  Revealing A♠ unlocks the Gateway descending to Level 3: The Hex Core!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirmReExplore}
              className="w-full py-2.5 px-3 bg-[#2d6a4f] hover:bg-[#23533e] active:bg-[#1b4332] text-white border-2 border-[#2b261f] rounded-lg font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{unexploredCount === 0 ? 'EXPLORE MAP AGAIN (-2⚡)' : 'START RE-EXPLORATION (-2⚡)'}</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-1.5 px-2 bg-[#f4efe3] hover:bg-[#fff9ed] text-[#5c5244] border border-[#2b261f]/40 rounded-lg font-mono font-bold text-xs tracking-wide cursor-pointer transition-colors"
            >
              Review Map First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
