import React, { useState, useEffect } from 'react';
import { X, Dices, Zap, Eye, Castle, ShieldAlert, Sparkles } from 'lucide-react';
import { GameLevel } from '../types';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel?: GameLevel;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, currentLevel = 1 }) => {
  const [selectedTab, setSelectedTab] = useState<GameLevel | 'all'>('all');

  useEffect(() => {
    if (isOpen) {
      setSelectedTab(currentLevel || 'all');
    }
  }, [isOpen, currentLevel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#e2d5bd] border-b-2 border-[#2b261f]">
          <h2 className="text-sm font-black font-mono uppercase tracking-wider text-[#2b261f] flex items-center gap-2">
            <span>📜 Field Manual & Expedition Rules</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#d4c3a5] text-[#2b261f] border border-[#2b261f] rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Level Indicator Pill Bar (Styled identical to Game Header) */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#dfd3bc] border-b-2 border-[#2b261f]">
          <span className="text-[10px] font-mono font-bold text-[#6b6252] uppercase tracking-wide">
            Jump to Rules:
          </span>
          <div className="flex items-center gap-0.5 bg-[#dfd3bc] p-0.5 rounded border border-[#2b261f]/30 font-mono">
            <span className="text-[9px] text-[#6b6252] font-black uppercase tracking-wider px-1">
              LVL:
            </span>
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-black transition-colors cursor-pointer ${
                selectedTab === 'all'
                  ? 'bg-[#2d6a4f] text-white shadow-2xs'
                  : 'text-[#5c5346] hover:bg-[#ece2d0]'
              }`}
            >
              ALL
            </button>
            {([1, 2, 3] as const).map((lvl) => (
              <button
                key={`rules-pill-tab-${lvl}`}
                onClick={() => setSelectedTab(lvl)}
                className={`px-2 py-0.5 rounded text-[9.5px] font-black transition-colors cursor-pointer ${
                  selectedTab === lvl
                    ? 'bg-[#2d6a4f] text-white shadow-2xs'
                    : 'text-[#5c5346] hover:bg-[#ece2d0]'
                }`}
              >
                L{lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono text-[#2b261f] leading-relaxed">
          {/* LEVEL 1 SECTION */}
          {(selectedTab === 'all' || selectedTab === 1) && (
            <div className="space-y-3 bg-[#ede4d3]/70 p-3 rounded-xl border-2 border-[#2b261f]">
              {/* Section Header with Header Pill Styling */}
              <div className="flex items-center justify-between border-b-2 border-[#2b261f]/20 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-[#dfd3bc] p-0.5 rounded border border-[#2b261f]/30">
                    <span className="text-[9px] text-[#6b6252] font-black uppercase tracking-wider px-1">
                      LVL:
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#2d6a4f] text-white rounded text-[9.5px] font-black shadow-2xs">
                      L1
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-[#2b261f] uppercase tracking-wide">
                    The Surface Wilderness
                  </span>
                </div>
                <span className="text-[10px] text-[#6b6252] font-bold">11×12 Grid</span>
              </div>

              {/* Objective */}
              <div className="bg-[#f5efe3] p-2.5 rounded-lg border border-[#2b261f]/30">
                <div className="font-black uppercase text-[#2d6a4f] mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Objective: Find the Secret Tunnel Entrance</span>
                </div>
                <p>
                  Navigate the 11x12 uncharted wilderness from your expedition camp in the center of the realm. Reach the hidden
                  Secret Tunnel Entrance (located more than 2 hexes away from camp) before your Energy countdown runs out!
                </p>
              </div>

              {/* 2D6 Movement & Deviation */}
              <div className="space-y-1.5">
                <div className="font-black uppercase text-[#2b261f] flex items-center gap-1.5 border-b border-[#2b261f]/20 pb-0.5">
                  <Dices className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>2D6 Movement & Direction</span>
                </div>
                <p>
                  Each turn, roll two six-sided dice (2D6). You freely choose which die represents
                  <strong> Distance</strong> (1–6 hexes) and which represents <strong> Direction</strong> (1: NW, 2: N, 3: NE, 4: SE, 5: S, 6: SW).
                </p>
                <div className="bg-[#fefaf0] p-2 rounded border border-[#2b261f]/20">
                  <span className="font-bold flex items-center gap-1 text-[#b45309]">
                    <Zap className="w-3 h-3" /> One Deviation per Turn:
                  </span>
                  <p className="mt-0.5 text-[11px]">
                    You can deviate once per turn: choose any direction regardless of your roll, or split your rolled distance between two directions!
                  </p>
                </div>
              </div>

              {/* Energy & Move 1 */}
              <div className="space-y-1.5">
                <div className="font-black uppercase text-[#2b261f] flex items-center gap-1.5 border-b border-[#2b261f]/20 pb-0.5">
                  <Eye className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Energy & Fog of War</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li><strong>Moving:</strong> Costs 1 Energy per hex traveled.</li>
                  <li><strong>Boundary Bouncing:</strong> If your path reaches the edge of the map, it bounces back into the grid so you never get stuck with lost moves.</li>
                  <li><strong>Revealing vs Activating:</strong> All hexes passed over are revealed from the fog. Shrines, caches, and rifts only trigger if you land on them — but Clue Cairns activate, and Peat Bogs apply their -1 Energy penalty, whenever you pass over them (watchtowers revealing bogs from afar do not trigger the penalty)!</li>
                  <li><strong>Free Move 1 Hex & "Last Breath":</strong> When blessed by a Fortune Shrine, you can trigger a Free Move to step directly into any adjacent hex for 0 Energy (costs no ⚡). If your Energy reaches 0⚡ while you still have a Free Move, the expedition does NOT perish immediately! You may use your final burst of momentum ("Last Breath") to reach safety, an energy cache, or the Secret Tunnel Entrance.</li>
                </ul>
              </div>

              {/* Special Hexes */}
              <div className="space-y-1.5">
                <div className="font-black uppercase text-[#2b261f] flex items-center gap-1.5 border-b border-[#2b261f]/20 pb-0.5">
                  <Castle className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Special Landmarks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-1.5 bg-[#dfb87c]/30 rounded border border-[#2b261f]/20">
                    <strong>Ancient Watchtowers:</strong> Reveals all adjacent hexes, plus 6 hexes along NW, N, NE, SE, S, SW lines of sight (or all hexes in those 6 directions with Telescope), and charts all watchtowers!
                  </div>
                  <div className="p-1.5 bg-[#bce3cb]/40 rounded border border-[#2b261f]/20">
                    <strong>Supply Caches:</strong> Abundant food & water caches (+2, +3, or +5 Energy) scattered through the wilderness.
                  </div>
                  <div className="p-1.5 bg-[#dbc5ea]/40 rounded border border-[#2b261f]/20 sm:col-span-2">
                    <strong>Fortune Shrines:</strong> Roll Fate D6: 1 Pip = Free Move 1 Hex (step into any adjacent hex for 0 ⚡), 2 Pips = Brass Telescope (Towers reveal all 6 rays), 3 Pips = Dice Modifier (±1 to either die each turn), 4 = Free Move 1 Hex & +2 Energy, 5 = Telescope & +2 Energy, 6 = Dice Modifier & +2 Energy.
                  </div>
                  <div className="p-1.5 bg-[#d9d0c1] rounded border border-[#2b261f]/20 sm:col-span-2">
                    <strong>Clue Cairns:</strong> When revealed, each cairn points toward the Secret Tunnel Entrance based on its relative position:
                    <div className="mt-1 pl-2 border-l-2 border-[#2b261f]/30 space-y-0.5 text-[10.5px]">
                      <div>• <strong>North / South (↑ N / ↓ S):</strong> Secret Tunnel is predominantly north or south. All tiles north or south of the cairn are highlighted.</div>
                      <div>• <strong>East / West (→ E / ← W):</strong> Secret Tunnel is predominantly east or west. All tiles east or west of the cairn are highlighted.</div>
                      <div>• <strong>Diagonals (↗ NE, ↖ NW, ↘ SE, ↙ SW):</strong> Roughly as many spaces north/south as east/west. That entire quadrant is highlighted.</div>
                      <div>• <strong>Triangulation:</strong> As you discover multiple cairns, their overlapping regions intersect to progressively whittle down the secret tunnel's exact location!</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hazards */}
              <div className="space-y-1.5">
                <div className="font-black uppercase text-[#b91c1c] flex items-center gap-1.5 border-b border-[#2b261f]/20 pb-0.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Environmental Hazards</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li><strong>Peat Bogs:</strong> Sucking mud inflicts a -1 extra Energy penalty whenever passed over or landed on (revealing from afar via Watchtower does not inflict any penalty). Once traversed, the bog remains marked in subdued wilderness colors and can be crossed safely without further penalty.</li>
                  <li><strong>Arcane Rifts:</strong> Unstable! Roll D6 upon entry: Odd inflicts -2 Energy penalty, Even is safe.</li>
                </ul>
              </div>
            </div>
          )}

          {/* LEVEL 2 SECTION */}
          {(selectedTab === 'all' || selectedTab === 2) && (
            <div className="space-y-3 bg-[#fef3c7]/70 text-[#2b261f] p-3 rounded-xl border-2 border-[#2b261f]">
              {/* Section Header with Header Pill Styling */}
              <div className="flex items-center justify-between border-b-2 border-[#2b261f]/20 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-[#dfd3bc] p-0.5 rounded border border-[#2b261f]/30">
                    <span className="text-[9px] text-[#6b6252] font-black uppercase tracking-wider px-1">
                      LVL:
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#2d6a4f] text-white rounded text-[9.5px] font-black shadow-2xs">
                      L2
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-[#2b261f] uppercase tracking-wide">
                    The Underground Catacombs
                  </span>
                </div>
                <span className="text-[10px] text-[#6b6252] font-bold">12 Columns</span>
              </div>

              <p className="text-[11px] text-[#443d33]">
                Predict whether each drawn card is higher or lower than the base card; Aces count as 1. Picture cards (J, Q, K) preserve your call and streak and let you bank a card into your hand. Event hexes draw cards from the Tarot deck, offering both positive and negative events!
              </p>

              <div className="space-y-1 text-[10.5px]">
                <div className="pl-2 border-l-2 border-[#2d6a4f]/50 space-y-1 text-[#443d33]">
                  <div>• <strong>Predict & Advance:</strong> Start in Column 1 with a base card. To predict Higher, advance to the hex on the row above in the next column. To predict Lower, advance to the hex on the row below (-1⚡ Move).</div>
                  <div>• <strong>Modal Card Draw:</strong> Moving into a hex reveals whether your prediction was correct, a push, or a picture card!</div>
                  <div>• <strong>Full 52-Card Deck:</strong> Includes all suits (♠, ♥, ♦, ♣). Victory is reaching the 12th column!</div>
                  <div>• <strong>Streaks & Pair Pushes:</strong> Correct predictions build cumulative streaks (+1, +2, +3⚡). Incorrect predictions drain energy. Drawing a pair resets your streak but neither costs nor grants energy (Push)!</div>
                  <div>• <strong>Picture Cards (J, Q, K):</strong> Preserve your streak and call, giving you the choice to bank your current base card into your Hand (drawing a fresh base), or draw a new card from the deck into your Hand!</div>
                  <div>• <strong>Event Hexes:</strong> Stepping into an event hex triggers a draw from the Tarot deck! Rewards include energy boosts, streak boosts, and cards into your Hand; hazards include energy drain or card discard!</div>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 3 SECTION */}
          {(selectedTab === 'all' || selectedTab === 3) && (
            <div className="space-y-3 bg-[#dcfce7]/60 text-[#2b261f] p-3 rounded-xl border-2 border-[#2b261f]">
              {/* Section Header with Header Pill Styling */}
              <div className="flex items-center justify-between border-b-2 border-[#2b261f]/20 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-[#dfd3bc] p-0.5 rounded border border-[#2b261f]/30">
                    <span className="text-[9px] text-[#6b6252] font-black uppercase tracking-wider px-1">
                      LVL:
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#2d6a4f] text-white rounded text-[9.5px] font-black shadow-2xs">
                      L3
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-[#2b261f] uppercase tracking-wide">
                    The Hex Core
                  </span>
                </div>
                <span className="text-[10px] text-[#6b6252] font-bold">19-Hex Rings</span>
              </div>

              <p className="text-[11px] text-[#443d33]">
                A 19-hex concentric mechanism: Yellow Outer Ring (12 hexes), Orange Middle Ring (6 hexes), and Red Core Boss. Visible fortress walls enclose each ring, with single-colour doorways at portal hexes. Stepping in or peeking costs 1⚡.
              </p>

              <div className="space-y-1 text-[10.5px] pl-2 border-l-2 border-[#15803d]/40 text-[#443d33]">
                <div>• <strong>Outer Ring (12 Hexes):</strong> 1 Safe Zone (your entry camp), 3 Traps, 4 Portal Doors, and 4 Beast Lairs.</div>
                <div>• <strong>Inner Ring (6 Hexes):</strong> 2 Core Gates, 2 Grinder Traps, and 2 Elite Guardian Lairs.</div>
                <div>• <strong>Trap Disarming:</strong> Outer traps deactivate permanently on <strong>0–10</strong>, or temporarily on <strong>11–99</strong>. If you return to a temporarily deactivated trap, it reactivates! Any other result loses <strong>5⚡ Energy</strong> and retreats to the previous hex (no monster encounter). Inner traps permanently disable on <strong>0</strong>, or temporarily on <strong>1–10</strong> (else -5⚡ and retreat).</div>
                <div>• <strong>Door Unlocks:</strong> Outer doors unlock on <strong>0–10</strong> to access the Inner Ring (no code fragments). Inner gates unlock on <strong>0</strong> to reach the Boss. Any failed test permanently locks that door!</div>
                <div>• <strong>Monsters & Sneaking:</strong> Sneak past outer beasts on <strong>0–10</strong>; sneak past inner guardians on <strong>0</strong>. Any other score triggers combat! Monsters have <strong>HP equal to their level</strong> (L1: 1 HP, L2: 2 HP, L3: 3 HP, L4: 4 HP, L5: 5 HP).</div>
                <div>• <strong>Hand Cards:</strong> Spend a card to restore Energy equal to its value, or spend it to adjust a challenge score toward 0.</div>
                <div>• <strong>Final Boss Rolls Reversed:</strong> The Level 5 Core Construct has <strong>5 HP</strong> and <strong>reversed combat rolls</strong>: receives damage on <strong>4, 5, 6</strong> and deals harm on 1, 2, 3 (-1⚡). Defeat the Core Construct to win!</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#e2d5bd] border-t-2 border-[#2b261f] flex justify-between items-center">
          <span className="text-[10px] text-[#786e5e] font-mono">
            {selectedTab === 'all'
              ? 'Showing all 3 levels'
              : `Showing Level ${selectedTab} rules`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-mono font-bold text-xs uppercase rounded-md border-2 border-[#2b261f] shadow-xs active:translate-y-px cursor-pointer"
          >
            Understood, Let's Explore!
          </button>
        </div>
      </div>
    </div>
  );
};

