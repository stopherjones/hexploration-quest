import React, { useMemo, useState } from 'react';
import {
  FlowerTile,
  FlowerHexCoord,
  getHexDistance,
  areAxialAdjacent,
  getAxialNeighbors,
} from '../utils/level3Engine';
import { ExplorationCard } from '../utils/explorationDeck';
import { KeyRound, ShieldAlert, Sparkles, Skull, Eye, Footprints, Lock, Unlock, Swords, Tent, Backpack, X, Zap } from 'lucide-react';
import { TarotModifierArt } from './TarotModifierArt';
import { MapZoomViewport } from './MapZoomViewport';

interface FlowerHexGridProps {
  tiles: Map<string, FlowerTile>;
  playerCoord: FlowerHexCoord;
  outerDoorsUnlocked: boolean;
  innerDoorsUnlocked: boolean;
  bossDefeated?: boolean;
  energy: number;
  maxEnergy: number;
  onStepIn: (target: FlowerTile) => void;
  onPeek: (target: FlowerTile) => void;
  onSelectTile?: (tile: FlowerTile) => void;
  playerHand?: ExplorationCard[];
  onSpendCardForEnergy?: (card: ExplorationCard) => void;
}

interface BoundaryEdge {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  isDoor: boolean;
  doorType?: 'outer_door' | 'inner_door';
  isUnlocked: boolean;
}

export const FlowerHexGrid: React.FC<FlowerHexGridProps> = ({
  tiles,
  playerCoord,
  outerDoorsUnlocked,
  innerDoorsUnlocked,
  bossDefeated = false,
  energy,
  maxEnergy,
  onStepIn,
  onPeek,
  onSelectTile,
  playerHand = [],
  onSpendCardForEnergy,
}) => {
  const [selectedCoord, setSelectedCoord] = useState<FlowerHexCoord | null>(null);
  const [showHandModal, setShowHandModal] = useState<boolean>(false);

  // Hand cards calculations (for persistent bottom-left inset)
  const handCount = playerHand.length;
  const cumulativeHandValue = playerHand.reduce((acc, c) => acc + c.value, 0);
  const latestCard = handCount > 0 ? playerHand[handCount - 1] : null;
  const isLatestRed = latestCard ? latestCard.suit === '♥' || latestCard.suit === '♦' : false;

  // SVG Geometry parameters (spaced to allow bottom-left hand card inset)
  const hexSize = 44;
  const svgWidth = 460;
  const svgHeight = 620;
  const centerX = 230;
  const centerY = 270;

  // Pointy-topped axial to pixel coords
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = hexSize * ((3 / 2) * r);
    return { x: centerX + x, y: centerY + y };
  };

  const getHexPoints = (cx: number, cy: number, size: number) => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  const selectedTile = selectedCoord ? tiles.get(`${selectedCoord.q},${selectedCoord.r}`) : null;
  const isSelectedAdjacent = selectedCoord ? areAxialAdjacent(playerCoord, selectedCoord) : false;

  const playerPixel = hexToPixel(playerCoord.q, playerCoord.r);

  // Compute all visible walls and doors along shared edges between rings (Outer <-> Middle, Middle <-> Center)
  const boundaryEdges = useMemo(() => {
    const edges: BoundaryEdge[] = [];
    const processedPairs = new Set<string>();

    for (const h1 of tiles.values()) {
      const d1 = getHexDistance(h1.q, h1.r);
      const neighbors = getAxialNeighbors(h1.q, h1.r);

      for (const nCoord of neighbors) {
        const h2 = tiles.get(`${nCoord.q},${nCoord.r}`);
        if (!h2) continue;
        const d2 = getHexDistance(h2.q, h2.r);

        // Check if this pair crosses a ring boundary (2 <-> 1 or 1 <-> 0)
        const isOuterToMiddle = (d1 === 2 && d2 === 1) || (d1 === 1 && d2 === 2);
        const isMiddleToCenter = (d1 === 1 && d2 === 0) || (d1 === 0 && d2 === 1);

        if (!isOuterToMiddle && !isMiddleToCenter) continue;

        const pairKey = [h1.id, h2.id].sort().join('--');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // The outer hex owns the doorway; only its selected inward edge opens after a successful test.
        const outerHex = d1 > d2 ? h1 : h2;
        const innerHex = d1 < d2 ? h1 : h2;
        const inwardNeighbors = getAxialNeighbors(outerHex.q, outerHex.r)
          .map((coord) => tiles.get(`${coord.q},${coord.r}`))
          .filter((neighbor): neighbor is FlowerTile =>
            Boolean(neighbor && getHexDistance(neighbor.q, neighbor.r) === Math.min(d1, d2))
          );
        const legacyDoorTarget = inwardNeighbors.length > 0
          ? inwardNeighbors
            .slice()
            .sort((a, b) => a.id.localeCompare(b.id))[
              [...outerHex.id].reduce((hash, char) => hash + char.charCodeAt(0), 0) % inwardNeighbors.length
            ]?.id
          : undefined;
        const doorwayTarget = outerHex.doorwayTo ?? legacyDoorTarget;
        const isDoor =
          (outerHex.type === 'outer_door' || outerHex.type === 'inner_door') &&
          outerHex.doorPassed === true &&
          doorwayTarget === innerHex.id;
        const doorType = isDoor ? (outerHex.type as 'outer_door' | 'inner_door') : undefined;
        const isUnlocked = isDoor;

        // Calculate exact shared edge endpoints
        const pix1 = hexToPixel(h1.q, h1.r);
        const pix2 = hexToPixel(h2.q, h2.r);
        const dx = pix2.x - pix1.x;
        const dy = pix2.y - pix1.y;
        const dist = Math.hypot(dx, dy);
        const mx = (pix1.x + pix2.x) / 2;
        const my = (pix1.y + pix2.y) / 2;
        const tx = -dy / dist;
        const ty = dx / dist;
        const halfEdge = (hexSize - 2) / 2;

        edges.push({
          id: pairKey,
          p1: { x: mx + tx * halfEdge, y: my + ty * halfEdge },
          p2: { x: mx - tx * halfEdge, y: my - ty * halfEdge },
          isDoor,
          doorType,
          isUnlocked,
        });
      }
    }

    return edges;
  }, [tiles, hexSize, outerDoorsUnlocked, innerDoorsUnlocked]);

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col items-center p-0 select-none font-mono">
      {/* 19-Hex SVG Canvas */}
      <MapZoomViewport className="relative flex-1 w-full min-h-0">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            {/* Concentric Ring Track Gradients */}
            <radialGradient id="ring-track-outer" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#2b261f" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2b261f" stopOpacity="0.25" />
            </radialGradient>
            <radialGradient id="ring-track-inner" cx="50%" cy="50%" r="50%">
              <stop offset="30%" stopColor="#b45309" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.3" />
            </radialGradient>
            {/* Torch aura */}
            <radialGradient id="player-torch-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Concentric Orbital Rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={hexSize * Math.sqrt(3) * 2}
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.25"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={hexSize * Math.sqrt(3)}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.35"
          />

          {/* Render All 19 Hex Tiles with Ring Colors (Yellow outer, Orange middle, Red inner) */}
          {Array.from(tiles.values()).map((tile) => {
            const { x, y } = hexToPixel(tile.q, tile.r);
            const dist = getHexDistance(tile.q, tile.r);
            const isSelected = selectedCoord?.q === tile.q && selectedCoord?.r === tile.r;
            const isAdj = areAxialAdjacent(playerCoord, { q: tile.q, r: tile.r });

            // Crossing constraints
            const fromDist = getHexDistance(playerCoord.q, playerCoord.r);
            const toDist = getHexDistance(tile.q, tile.r);
            const isGateBlocked =
              (fromDist === 2 && toDist === 1 && !outerDoorsUnlocked) ||
              (fromDist === 1 && toDist === 0 && !innerDoorsUnlocked);

            // Ring-Specific Color Palettes (Yellow outer, Orange middle, Red inner/center)
            let fillColor = '#fef3c7';
            let strokeColor = '#b45309';
            let strokeWidth = '1.8';

            if (!tile.revealed) {
              if (dist === 2) {
                // Outer ring mystery tiles use the bright yellow map palette.
                fillColor = '#fef3c7';
                strokeColor = '#ca8a04';
              } else if (dist === 1) {
                fillColor = '#ffedd5';
                strokeColor = '#ea580c';
              } else {
                fillColor = '#fee2e2';
                strokeColor = '#991b1b';
              }
            } else if (dist === 0) {
              // Inner Ring / Boss: Red shades
              fillColor = '#fee2e2';
              strokeColor = '#991b1b';
              strokeWidth = '3';
            } else if (dist === 1) {
              // Middle Ring: Orange shades
              if (tile.type === 'inner_door') {
                // Single door colour for door hex!
                if (tile.doorTested && !tile.doorPassed) {
                  fillColor = '#fee2e2'; // sealed locked
                  strokeColor = '#991b1b';
                } else {
                  fillColor = tile.doorPassed || innerDoorsUnlocked ? '#dcfce7' : '#fed7aa';
                  strokeColor = tile.doorPassed || innerDoorsUnlocked ? '#16a34a' : '#ea580c';
                }
                strokeWidth = '2.5';
              } else if (tile.type === 'trap') {
                fillColor = tile.disarmed ? '#f3f4f6' : '#fed7aa';
                strokeColor = tile.disarmed ? '#9ca3af' : '#c2410c';
              } else if (tile.type === 'monster') {
                const cleared = tile.monsterBypassed || tile.monsterDefeated;
                fillColor = cleared ? '#f3f4f6' : '#ffedd5';
                strokeColor = cleared ? '#9ca3af' : '#ea580c';
              } else if (tile.type === 'treasure') {
                fillColor = tile.looted ? '#fff7ed' : '#ffedd5';
                strokeColor = '#ea580c';
              } else {
                fillColor = '#ffedd5';
                strokeColor = '#ea580c';
              }
            } else {
              // Outer Ring: Yellow shades
              if (tile.type === 'safe') {
                // Safe Entry Zone!
                fillColor = '#dcfce7';
                strokeColor = '#16a34a';
                strokeWidth = '2.5';
              } else if (tile.type === 'outer_door') {
                // Single door colour for door hex!
                if (tile.doorTested && !tile.doorPassed) {
                  fillColor = '#fee2e2'; // sealed locked
                  strokeColor = '#991b1b';
                } else {
                  fillColor = tile.doorPassed || outerDoorsUnlocked ? '#dcfce7' : '#fde68a';
                  strokeColor = tile.doorPassed || outerDoorsUnlocked ? '#16a34a' : '#d97706';
                }
                strokeWidth = '2.5';
              } else if (tile.type === 'trap') {
                fillColor = tile.disarmed ? '#f3f4f6' : '#fef08a';
                strokeColor = tile.disarmed ? '#9ca3af' : '#b45309';
              } else if (tile.type === 'monster') {
                const cleared = tile.monsterBypassed || tile.monsterDefeated;
                fillColor = cleared ? '#f3f4f6' : '#fef9c3';
                strokeColor = cleared ? '#9ca3af' : '#ca8a04';
              } else if (tile.type === 'treasure') {
                fillColor = tile.looted ? '#fefce8' : '#fef9c3';
                strokeColor = '#ca8a04';
              } else {
                fillColor = '#fef3c7';
                strokeColor = '#ca8a04';
              }
            }

            if (isSelected) {
              strokeColor = '#2563eb';
              strokeWidth = '3.5';
            } else if (isAdj && !isGateBlocked) {
              strokeColor = '#16a34a';
              strokeWidth = '2.5';
            }

            return (
              <g
                key={tile.id}
                onClick={() => {
                  setSelectedCoord({ q: tile.q, r: tile.r });
                  onSelectTile?.(tile);
                }}
                className="cursor-pointer transition-transform duration-150 hover:opacity-90"
              >
                {/* Hexagon Shape */}
                <polygon
                  points={getHexPoints(x, y, hexSize - 2)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  className="transition-colors duration-200"
                />

                {/* Inner Hex Content */}
                {!tile.revealed ? (
                  // Face-down runic mystery slab
                  <g pointerEvents="none">
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill="#3f3524"
                      fontSize="14"
                      fontWeight="900"
                    >
                      ?
                    </text>
                  </g>
                ) : (
                  // Face-up Revealed Tile Content
                  <g pointerEvents="none" className="select-none">
                    {tile.type === 'safe' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        <Tent className="w-5 h-5 text-emerald-800" />
                        <text x={10} y={25} textAnchor="middle" fill="#14532d" fontSize="7" fontWeight="900">
                          CAMP: SAFE
                        </text>
                      </g>
                    )}
                    {tile.type === 'center_boss' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        <Skull className="w-5 h-5 text-red-900" />
                        <text x={10} y={25} textAnchor="middle" fill="#7f1d1d" fontSize="7.5" fontWeight="900">
                          {bossDefeated ? 'CORE: CLEAR' : 'CORE: BOSS'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'outer_door' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        {outerDoorsUnlocked || tile.doorPassed ? (
                          <Unlock className="w-5 h-5 text-emerald-800" />
                        ) : (
                          <Lock className={`w-5 h-5 ${tile.doorTested ? 'text-red-900' : 'text-amber-900'}`} />
                        )}
                        <text
                          x={10}
                          y={25}
                          textAnchor="middle"
                          fill={tile.doorTested && !tile.doorPassed ? '#7f1d1d' : '#78350f'}
                          fontSize="6.5"
                          fontWeight="900"
                        >
                          {tile.doorTested && !tile.doorPassed ? 'DOOR: SEALED' :
                            tile.doorPassed || outerDoorsUnlocked ? 'DOOR: OPEN' : 'DOOR: LOCKED'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'inner_door' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        {innerDoorsUnlocked || tile.doorPassed ? (
                          <Unlock className="w-5 h-5 text-emerald-900" />
                        ) : (
                          <KeyRound className={`w-5 h-5 ${tile.doorTested ? 'text-red-900' : 'text-amber-900'}`} />
                        )}
                        <text
                          x={10}
                          y={25}
                          textAnchor="middle"
                          fill={tile.doorTested && !tile.doorPassed ? '#7f1d1d' : '#713f12'}
                          fontSize="6.5"
                          fontWeight="900"
                        >
                          {tile.doorTested && !tile.doorPassed ? 'GATE: SEALED' :
                            tile.doorPassed || innerDoorsUnlocked ? 'GATE: OPEN' : 'GATE: LOCKED'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'trap' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        <ShieldAlert className={`w-5 h-5 ${tile.disarmed || tile.disarmedTemporarily ? 'text-emerald-800' : 'text-red-800'}`} />
                        <text
                          x={10}
                          y={25}
                          textAnchor="middle"
                          fill={tile.disarmed || tile.disarmedTemporarily ? '#14532d' : '#7f1d1d'}
                          fontSize="7"
                          fontWeight="900"
                        >
                          {tile.disarmed || tile.disarmedTemporarily ? 'TRAP: SAFE' : 'TRAP: ACTIVE'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'monster' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        <Swords
                          className={`w-5 h-5 ${
                            tile.monsterBypassed || tile.monsterDefeated ? 'text-emerald-800' : 'text-red-800'
                          }`}
                        />
                        <text
                          x={10}
                          y={25}
                          textAnchor="middle"
                          fill={tile.monsterBypassed || tile.monsterDefeated ? '#14532d' : '#7f1d1d'}
                          fontSize="6.5"
                          fontWeight="900"
                        >
                          {tile.monsterBypassed ? 'BEAST: SNEAKED' :
                            tile.monsterDefeated ? 'BEAST: CLEARED' : 'BEAST: ACTIVE'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'treasure' && (
                      <g transform={`translate(${x - 10}, ${y - 13})`}>
                        <Sparkles className={`w-5 h-5 ${tile.looted ? 'text-stone-600' : 'text-amber-800'}`} />
                        <text x={10} y={25} textAnchor="middle" fill={tile.looted ? '#57534e' : '#78350f'} fontSize="7" fontWeight="900">
                          {tile.looted ? 'MANA: EMPTY' : 'MANA: FOUND'}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Peeked Badge indicator */}
                {tile.revealed && !tile.visited && (
                  <g pointerEvents="none" transform={`translate(${x - 12}, ${y - 20})`}>
                    <rect width="24" height="8" rx="2" fill="#2563eb" />
                    <text x="12" y="6.5" fill="#fff" fontSize="6" fontWeight="bold" textAnchor="middle">
                      PEEKED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ============================================================== */}
          {/* VISIBLE WALLS & SINGLE-COLOUR DOORS BETWEEN RINGS              */}
          {/* ============================================================== */}
          <g id="ring-boundary-walls" pointerEvents="none">
            {boundaryEdges.map((edge) => {
              if (edge.isDoor) {
                // Single door colour instead of wall!
                const doorColor = edge.isUnlocked
                  ? '#10b981' // glowing emerald when open
                  : edge.doorType === 'inner_door'
                  ? '#ea580c' // rich fiery orange door color
                  : '#f59e0b'; // rich brass yellow door color

                return (
                  <g key={`door-edge-${edge.id}`}>
                    {/* Subtle outer glow */}
                    <line
                      x1={edge.p1.x}
                      y1={edge.p1.y}
                      x2={edge.p2.x}
                      y2={edge.p2.y}
                      stroke={doorColor}
                      strokeWidth="8"
                      opacity="0.35"
                      strokeLinecap="round"
                    />
                    {/* Single Door Colour Line */}
                    <line
                      x1={edge.p1.x}
                      y1={edge.p1.y}
                      x2={edge.p2.x}
                      y2={edge.p2.y}
                      stroke={doorColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    {/* Door Portal Pip */}
                    <circle
                      cx={(edge.p1.x + edge.p2.x) / 2}
                      cy={(edge.p1.y + edge.p2.y) / 2}
                      r="4.5"
                      fill={doorColor}
                      stroke="#1c1917"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              }

              // Heavy stone fortress wall along edge between rings
              return (
                <g key={`wall-edge-${edge.id}`}>
                  {/* Shadow base */}
                  <line
                    x1={edge.p1.x}
                    y1={edge.p1.y}
                    x2={edge.p2.x}
                    y2={edge.p2.y}
                    stroke="#000000"
                    strokeWidth="7"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                  {/* Heavy Dark Stone Wall */}
                  <line
                    x1={edge.p1.x}
                    y1={edge.p1.y}
                    x2={edge.p2.x}
                    y2={edge.p2.y}
                    stroke="#1c1917"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  {/* Masonry highlight */}
                  <line
                    x1={edge.p1.x}
                    y1={edge.p1.y}
                    x2={edge.p2.x}
                    y2={edge.p2.y}
                    stroke="#78716c"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Player Adventurer Token with Torchlight Aura */}
          <g transform={`translate(${playerPixel.x}, ${playerPixel.y})`} pointerEvents="none">
            <circle cx="0" cy="0" r="24" fill="url(#player-torch-glow)" />
            <circle cx="0" cy="0" r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black">
              ▲
            </text>
          </g>

          {/* ============================================================== */}
          {/* PERSISTENT HAND CARD INSET (Bottom-Left Corner from Level 1.5) */}
          {/* ============================================================== */}
          <g
            id="l3-hand-cards-inset"
            transform="translate(10, 460)"
            className="cursor-pointer transition-transform hover:opacity-95"
            onClick={() => setShowHandModal(true)}
          >
            {/* Frame */}
            <rect
              x="0"
              y="0"
              width="104"
              height="146"
              rx="8"
              fill="#f7f1e3"
              stroke="#5c5346"
              strokeWidth="1.5"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
            />
            {/* Header Bar */}
            <rect
              x="0"
              y="0"
              width="104"
              height="20"
              rx="8"
              fill="#dbece2"
              stroke="#5c5346"
              strokeWidth="1.5"
            />
            <text
              x="52"
              y="13"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="monospace"
              fill="#166534"
              letterSpacing="0.5"
            >
              HAND CARDS
            </text>

            {/* Splayed Card Stack */}
            {handCount > 0 && latestCard ? (
              <g transform="translate(27, 26)">
                {/* 3rd card in stack (if 3+ cards) */}
                {handCount >= 3 && (
                  <g transform="translate(-4, 2) rotate(-8 25 35)">
                    <rect
                      x="0"
                      y="0"
                      width="50"
                      height="70"
                      rx="5"
                      fill="#e8ded0"
                      stroke="#786e5e"
                      strokeWidth="1.2"
                      opacity="0.85"
                    />
                    <rect
                      x="3"
                      y="3"
                      width="44"
                      height="64"
                      rx="3"
                      fill="#d8cebf"
                      stroke="#a39684"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  </g>
                )}

                {/* 2nd card in stack (if 2+ cards) */}
                {handCount >= 2 && (
                  <g transform="translate(4, 1) rotate(6 25 35)">
                    <rect
                      x="0"
                      y="0"
                      width="50"
                      height="70"
                      rx="5"
                      fill="#f2ebe0"
                      stroke="#5c5346"
                      strokeWidth="1.2"
                      opacity="0.92"
                    />
                    <rect
                      x="3"
                      y="3"
                      width="44"
                      height="64"
                      rx="3"
                      fill="#e4dbcc"
                      stroke="#948573"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  </g>
                )}

                {/* Top card: latest drawn card in hand */}
                <g transform="translate(0, 0)">
                  <rect
                    x="0"
                    y="0"
                    width="50"
                    height="70"
                    rx="6"
                    fill="#ffffff"
                    stroke="#2b261f"
                    strokeWidth="1.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                  />
                  {/* Top-Left Rank & Suit */}
                  <text
                    x="4"
                    y="12"
                    fontSize="9.5"
                    fontWeight="900"
                    fontFamily="monospace"
                    fill={isLatestRed ? '#b91c1c' : '#1e1b18'}
                  >
                    {latestCard.rank}
                  </text>
                  <text
                    x="4"
                    y="22"
                    fontSize="8.5"
                    fontWeight="bold"
                    fill={isLatestRed ? '#b91c1c' : '#1e1b18'}
                  >
                    {latestCard.suit}
                  </text>

                  {/* Center Big Suit */}
                  <text
                    x="25"
                    y="43"
                    textAnchor="middle"
                    fontSize="21"
                    fontWeight="bold"
                    fontFamily="serif"
                    fill={isLatestRed ? '#dc2626' : '#1e1b18'}
                  >
                    {latestCard.suit}
                  </text>

                  {/* Bottom-Right Value */}
                  <text
                    x="46"
                    y="64"
                    textAnchor="end"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#786e5e"
                  >
                    v:{latestCard.value}
                  </text>
                </g>
              </g>
            ) : (
              /* Empty Hand Placeholder */
              <g transform="translate(27, 26)">
                <rect
                  x="0"
                  y="0"
                  width="50"
                  height="70"
                  rx="6"
                  fill="#f1ebdf"
                  stroke="#a89d8d"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <text
                  x="25"
                  y="33"
                  textAnchor="middle"
                  fontSize="17"
                  opacity="0.5"
                >
                  🃏
                </text>
                <text
                  x="25"
                  y="49"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="bold"
                  fontFamily="monospace"
                  fill="#8a7e6d"
                >
                  0 Cards
                </text>
              </g>
            )}

            {/* Cumulative Hand Badge / Tap to View Button */}
            <g transform="translate(6, 104)">
              <rect
                x="0"
                y="0"
                width="92"
                height="34"
                rx="4"
                fill={handCount > 0 ? '#1b4332' : '#e5ddcc'}
                stroke={handCount > 0 ? '#15803d' : '#948775'}
                strokeWidth="1"
              />
              <text
                x="46"
                y="13"
                textAnchor="middle"
                fontSize="7.5"
                fontWeight="900"
                fontFamily="monospace"
                fill={handCount > 0 ? '#86efac' : '#5c5244'}
              >
                {handCount > 0
                  ? `${handCount} card${handCount === 1 ? '' : 's'} • -${cumulativeHandValue}`
                  : 'Empty Hand (0)'}
              </text>
              <text
                x="46"
                y="25"
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fontFamily="monospace"
                fill={handCount > 0 ? '#bbf7d0' : '#786e5e'}
              >
                Tap to View Hand
              </text>
            </g>
          </g>
        </svg>
      </MapZoomViewport>

      {/* Selected Tile Action Bar / Quick Commands */}
      <footer className="w-full h-[148px] shrink-0 bg-[#e8deca] border-t-2 border-[#2b261f] p-2.5 shadow-lg flex flex-col justify-center select-none">
        <div className="w-full bg-[#fdfbf7] border-2 border-[#2b261f] rounded-lg p-2.5 shadow-md flex flex-col gap-2">
          {selectedTile ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#2b261f] truncate">
                  {selectedTile.revealed ? selectedTile.title : `Unrevealed Hex [${selectedTile.q}, ${selectedTile.r}]`}
                </span>
                <span className="text-[10px] uppercase font-bold text-[#786e5e] bg-[#e8deca] px-1.5 py-0.5 rounded">
                  {selectedTile.ring} Ring
                </span>
              </div>

              {selectedTile.q === playerCoord.q && selectedTile.r === playerCoord.r ? (
                <span className="text-[11px] text-[#5c5346] italic">
                  Current adventurer position.
                </span>
              ) : isSelectedAdjacent ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStepIn(selectedTile)}
                    disabled={energy <= 0}
                    className="flex-1 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-md font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-50"
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Step In (-1⚡)</span>
                  </button>

                  {!selectedTile.revealed && (
                    <button
                      onClick={() => onPeek(selectedTile)}
                      disabled={energy <= 0}
                      className="flex-1 py-2 bg-[#b45309] hover:bg-[#92400e] text-white rounded-md font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Peek (-1⚡)</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-[#786e5e]">
                  Select an adjacent hex to step into or peek.
                </span>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-[#786e5e] py-1">
              Tap an adjacent hex to Step In (-1⚡) or Peek (-1⚡).
            </div>
          )}
        </div>
      </footer>

      {/* Hand Cards Modal */}
      {showHandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-[#f4edd9] border-2 border-[#2b261f] rounded-xl shadow-2xl overflow-hidden font-mono text-[#2b261f] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="py-2.5 px-3 border-b-2 border-[#2b261f] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between bg-[#ede4d3]">
              <div className="flex items-center gap-1.5">
                <Backpack className="w-4 h-4 text-emerald-800" />
                <span>Hand Cards (Level 3 Inventory)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHandModal(false)}
                className="p-1 rounded hover:bg-[#dfd3bc] active:bg-[#d0c2a8] text-[#5c5244] cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-3 overflow-y-auto text-xs">
              {/* Summary Banner */}
              <div className="bg-[#e8f5e9] border border-[#81c784] rounded-lg p-2.5 flex items-center justify-between text-[#1b5e20]">
                <div>
                  <div className="font-black text-xs">
                    {handCount} Card{handCount === 1 ? '' : 's'} Carried
                  </div>
                  <div className="text-[10.5px] text-[#2e7d32]">
                    Cumulative Reduction: <strong>-{cumulativeHandValue} pts</strong>
                  </div>
                </div>
                <div className="text-2xl font-black bg-[#c8e6c9] px-2 py-0.5 rounded border border-[#a5d6a7]">
                  -{cumulativeHandValue}
                </div>
              </div>

              {/* Strategic Explanation */}
              <p className="text-[11px] text-[#5c5244] leading-relaxed">
                Cards banked in Level 2 carry forward into <strong>Level 3</strong>. Playing cards in encounter challenges reduces Utopia Engine dice scores towards 0, unlocking doors and disarming traps without combat!
              </p>

              {/* Cards Grid */}
              {handCount === 0 ? (
                <div className="py-8 text-center bg-[#ede4d3] rounded-lg border border-[#cfbe9f] text-[#7a6d59] space-y-1">
                  <div className="text-2xl">🃏</div>
                  <div className="font-bold text-xs">Your hand is currently empty</div>
                  <div className="text-[10px]">
                    Draw picture cards in Level 2 to bank cards into your hand!
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {playerHand.map((card, idx) => {
                    const isRed = card.suit === '♥' || card.suit === '♦';
                    return (
                      <div
                        key={`flower-hand-card-${card.id || idx}`}
                        className="bg-white border-2 border-[#2b261f] rounded-lg shadow p-2 flex flex-col justify-between items-center h-36 relative"
                      >
                        {card.tarotCard ? (
                          <>
                            <TarotModifierArt card={card} className="h-20 w-full object-contain" />
                            <span className="text-[9px] font-black text-indigo-900 uppercase">
                              {card.tarotCard === 'judgement' ? 'Judgement · Set 1' :
                                card.tarotCard === 'world' ? 'World · Set 0' :
                                  `${card.tarotCard} · Dice Modifier`}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-full flex items-center justify-between">
                              <span
                                className={`text-xs font-black ${
                                  isRed ? 'text-red-700' : 'text-slate-900'
                                }`}
                              >
                                {card.rank}
                                <span className="text-[10px] ml-0.5">{card.suit}</span>
                              </span>
                              <span className="text-[9px] bg-[#f0ebd9] px-1 py-0.2 rounded font-bold text-[#5c5244]">
                                v:{card.value}
                              </span>
                            </div>

                            <div
                              className={`text-3xl font-black ${
                                isRed ? 'text-red-700' : 'text-slate-900'
                              }`}
                            >
                              {card.suit}
                            </div>

                            <div className="w-full text-center">
                              <span className="text-[9px] font-black text-[#15803d] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                -{card.value} pts
                              </span>
                              {card.value > 0 && (
                                <button
                                  type="button"
                                  disabled={!onSpendCardForEnergy || energy >= maxEnergy}
                                  onClick={() => onSpendCardForEnergy?.(card)}
                                  title={`Spend ${card.rank}${card.suit} to restore ${Math.min(card.value, maxEnergy - energy)} energy`}
                                  className="mt-1 flex w-full items-center justify-center gap-1 rounded border border-emerald-800/40 bg-emerald-50 px-1 py-0.5 text-[9px] font-black text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <Zap className="h-3 w-3" />
                                  Spend · +{Math.min(card.value, maxEnergy - energy)}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-[#ede4d3] border-t border-[#2b261f]/20 text-center">
              <button
                type="button"
                onClick={() => setShowHandModal(false)}
                className="w-full py-2 px-4 bg-[#2d6a4f] hover:bg-[#3d3328] active:bg-[#1a1612] text-white font-mono font-black text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer transition-transform active:translate-y-0.5"
              >
                Close Hand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
