import React from 'react';
import { X, Dices, Zap, Eye, Castle, ShieldAlert, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
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

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs font-mono text-[#2b261f] leading-relaxed">
          {/* Objective */}
          <div className="bg-[#ede4d3] p-2.5 rounded-lg border border-[#2b261f]/30">
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
                <strong>Supply Caches:</strong> Abundant food & water caches (+1, +2, or +3 Energy) scattered through the wilderness.
              </div>
              <div className="p-1.5 bg-[#dbc5ea]/40 rounded border border-[#2b261f]/20 sm:col-span-2">
                <strong>Fortune Shrines:</strong> Roll Fate D6: 1 Pip = Free Move 1 Hex (step into any adjacent hex for 0 ⚡), 2 Pips = Brass Telescope (Towers reveal all 6 rays), 3 Pips = Dice Modifier (±1 to either die each turn), 4 = Free Move 1 Hex & +2 Energy, 5 = Telescope & +2 Energy, 6 = Dice Modifier & +2 Energy.
              </div>
              <div className="p-1.5 bg-[#d9d0c1] rounded border border-[#2b261f]/20 sm:col-span-2">
                <strong>Clue Cairns (1 per column):</strong> When revealed, each cairn activates and signposts the bearing to the Secret Tunnel Entrance based on coordinate proportions:
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

          {/* Level 2: The Underground Tunnels */}
          <div className="space-y-1.5 bg-[#ede4d3] text-[#2b261f] p-2.5 rounded-lg border-2 border-[#2b261f]">
            <div className="font-black uppercase text-[#991b1b] flex items-center gap-1.5 border-b border-[#2b261f]/20 pb-1 text-xs">
              <span className="text-sm leading-none">♠ ♣ ♦</span>
              <span>Level 2: Underground Tunnels & Higher/Lower Exploration</span>
            </div>
            <p className="text-[11px] text-[#443d33]">
              Carry forward remaining Energy from Level 1 into the subterranean labyrinth. When entering chambers, predict whether the next exploration card will be <strong>Higher or Lower</strong>:
            </p>
            <div className="space-y-1 text-[10.5px]">
              <div className="pl-2 border-l-2 border-[#991b1b]/40 space-y-0.5 text-[#443d33]">
                <div>• <strong>Exploration Deck (♠, ♣, ♦):</strong> 39 cards. Starts on an initial numbered baseline (2 to 10).</div>
                <div>• <strong>Higher / Lower Call:</strong> Correct call gives +Energy; incorrect call drains -Energy. Streaks are cumulative! (+1, +2, +3... or -1, -2, -3...). Breaking a streak resets it; pairs push with no energy change.</div>
                <div>• <strong>Honor Cards (J, Q, K, A) & Hand Banking:</strong> Drawing an honor card does <em>not</em> affect your streak or Higher/Lower call! Instead of replacing or drawing cards, you get the option to <strong>bank your current base card</strong> into your Hand (drawing a fresh base for future surveys), or <strong>draw a new card from the deck into your Hand</strong> (keeping your base active). You can also bank the drawn honor card itself. All banked cards are carried forward into Level 3!</div>
                <div>• <strong>Ace of Spades (A♠):</strong> Shuffled anywhere in the 39-card deck. Drawing it (or drawing it into hand) opens the gateway to Level 3!</div>
                <div>• <strong>Hearts Delve Deck:</strong> Carves corridor exits (Fork, Chamber, Dead End, Trap, or Vaults). Ace of Hearts now acts as an Ancient Vault.</div>
                <div>• <strong>Unexplored Exits & Overlaps:</strong> The map tracks live unexplored exits with glowing beacons. When multiple corridors converge onto the same chamber, an <strong>Overlap (✦)</strong> badge marks the convergent junction!</div>
                <div>• <strong>Phase 2 Re-Exploration (Map Fully Drawn):</strong> If you chart the entire map without discovering the Ace of Spades (A♠), you are prompted to explore the map again. In Phase 2, moving costs <strong>2 ⚡ Energy</strong> per chamber, and stepping into any chamber prompts the Higher/Lower survey to win back energy while hunting for A♠!</div>
                <div>• <strong>Navigation:</strong> Step forward through carved exits (-1 ⚡ in Phase 1, -2 ⚡ in Phase 2) or use the retrace direction button to backtrack.</div>
              </div>
            </div>
          </div>

          {/* Level 3: The 19-Hex Flower Engine Core */}
          <div className="space-y-1.5 bg-[#dcfce7]/60 text-[#2b261f] p-2.5 rounded-lg border-2 border-[#2b261f]">
            <div className="font-black uppercase text-[#15803d] flex items-center gap-1.5 border-b border-[#2b261f]/20 pb-1 text-xs">
              <span className="text-sm leading-none">⚙️</span>
              <span>Level 3: The 19-Hex Flower Engine Core</span>
            </div>
            <p className="text-[11px] text-[#443d33]">
              A single 19-hex concentric flower grid: 12-hex Outer Ring, 6-hex Inner Ring, and 1-hex Core Boss. All tiles start face-down and cost 1⚡ to flip (either by stepping in, or peeking from an adjacent hex).
            </p>
            <div className="space-y-1 text-[10.5px] pl-2 border-l-2 border-[#15803d]/40 text-[#443d33]">
              <div>• <strong>Outer Ring (12 Hexes):</strong> 1 Safe Start, 4 Locked Portals, 3 Traps, 4 Mana Vaults.</div>
              <div>• <strong>Outer Portals:</strong> Test via Utopia Engine dice: Difference 0 = Master Unlock (all 4 portals open)! 1–10 = grants 1 code fragment (need 3 fragments total). Fail twice and you need a 0 on remaining doors; fail 3 times = Game Over!</div>
              <div>• <strong>Spending Hand Cards from Level 2:</strong> In any room test, you can click individual cards from your banked hand to reduce your calculated dice score towards 0! Spent cards reduce difference directly, turning potential failures into Code Fragments, or achieving Master 0 Unlocks!</div>
              <div>• <strong>Inner Ring (6 Hexes):</strong> 1 Safe, 2 Inner Gates, 2 Traps, 1 Mana Vault. Decrypt both gates (scores 1–10) or get a 0 on either to open the way to the Core.</div>
              <div>• <strong>Traps & Vaults:</strong> Score 0 = Permanent Disarm / Full 30⚡ Restore. 1–10 = Temporary Disarm / +10⚡. 11–99 = +1⚡ refund / +5⚡. Larger differences spawn level 1–4 monsters!</div>
              <div>• <strong>Combat & Boss:</strong> Level 1, 2, 3 monsters have 1 HP. Level 4 has 2 HP and receives damage on 1, 2, 3. The Level 5 Core Boss has 3 HP and receives damage on 1, 2, 3! Defeat the Boss to save Utopia!</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#e2d5bd] border-t-2 border-[#2b261f] flex justify-end">
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
