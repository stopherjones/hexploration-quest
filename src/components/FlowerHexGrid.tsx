import React from 'react';
import { FlowerTile, FlowerHexCoord, getHexDistance, areAxialAdjacent } from '../utils/level3Engine';
import { KeyRound, ShieldAlert, Sparkles, Skull, Eye, Footprints, Lock, Unlock } from 'lucide-react';

interface FlowerHexGridProps {
  tiles: Map<string, FlowerTile>;
  playerCoord: FlowerHexCoord;
  outerDoorsUnlocked: boolean;
  innerDoorsUnlocked: boolean;
  energy: number;
  onStepIn: (target: FlowerTile) => void;
  onPeek: (target: FlowerTile) => void;
  onSelectTile?: (tile: FlowerTile) => void;
}

export const FlowerHexGrid: React.FC<FlowerHexGridProps> = ({
  tiles,
  playerCoord,
  outerDoorsUnlocked,
  innerDoorsUnlocked,
  energy,
  onStepIn,
  onPeek,
  onSelectTile,
}) => {
  const [selectedCoord, setSelectedCoord] = React.useState<FlowerHexCoord | null>(null);

  // SVG Geometry parameters
  const hexSize = 44;
  const svgWidth = 420;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

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

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none font-mono">
      {/* 19-Hex SVG Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-h-[380px] drop-shadow-md"
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
            stroke="#2b261f"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.3"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={hexSize * Math.sqrt(3)}
            fill="none"
            stroke="#b45309"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            opacity="0.45"
          />

          {/* Render All 19 Hex Tiles */}
          {Array.from(tiles.values()).map((tile) => {
            const { x, y } = hexToPixel(tile.q, tile.r);
            const isPlayer = tile.q === playerCoord.q && tile.r === playerCoord.r;
            const isSelected = selectedCoord?.q === tile.q && selectedCoord?.r === tile.r;
            const isAdj = areAxialAdjacent(playerCoord, { q: tile.q, r: tile.r });

            // Crossing constraints
            const fromDist = getHexDistance(playerCoord.q, playerCoord.r);
            const toDist = getHexDistance(tile.q, tile.r);
            const isGateBlocked =
              (fromDist === 2 && toDist === 1 && !outerDoorsUnlocked) ||
              (fromDist === 1 && toDist === 0 && !innerDoorsUnlocked);

            // Tile Background Styling
            let fillColor = '#ede4d3';
            let strokeColor = '#2b261f';
            let strokeWidth = '2';

            if (!tile.revealed) {
              fillColor = '#3b342a'; // Face down dark stone slab
              strokeColor = '#1f1a15';
            } else if (tile.ring === 'center') {
              fillColor = '#fee2e2'; // Center Boss Chamber
              strokeColor = '#991b1b';
              strokeWidth = '3';
            } else if (tile.type === 'outer_door' || tile.type === 'inner_door') {
              fillColor = tile.doorPassed ? '#dcfce7' : '#fef3c7';
              strokeColor = '#b45309';
            } else if (tile.type === 'trap') {
              fillColor = tile.disarmed ? '#e2e8f0' : '#fee2e2';
              strokeColor = '#b91c1c';
            } else if (tile.type === 'treasure') {
              fillColor = tile.looted ? '#f3f4f6' : '#fef9c3';
              strokeColor = '#ca8a04';
            } else if (tile.type === 'safe') {
              fillColor = '#e0f2fe';
              strokeColor = '#0284c7';
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
                      fill="#a89d8d"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      ?
                    </text>
                  </g>
                ) : (
                  // Face-up Revealed Tile Content
                  <g pointerEvents="none" className="select-none">
                    {tile.type === 'center_boss' && (
                      <g transform={`translate(${x - 9}, ${y - 12})`}>
                        <Skull className="w-4.5 h-4.5 text-red-800" />
                        <text x={9} y={23} textAnchor="middle" fill="#991b1b" fontSize="8" fontWeight="900">
                          BOSS
                        </text>
                      </g>
                    )}
                    {tile.type === 'outer_door' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        {outerDoorsUnlocked || tile.doorPassed ? (
                          <Unlock className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-800" />
                        )}
                        <text x={8} y={22} textAnchor="middle" fill="#92400e" fontSize="7" fontWeight="bold">
                          DOOR
                        </text>
                      </g>
                    )}
                    {tile.type === 'inner_door' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        {innerDoorsUnlocked || tile.doorPassed ? (
                          <Unlock className="w-4 h-4 text-emerald-800" />
                        ) : (
                          <KeyRound className="w-4 h-4 text-amber-900" />
                        )}
                        <text x={8} y={22} textAnchor="middle" fill="#78350f" fontSize="7" fontWeight="bold">
                          GATE
                        </text>
                      </g>
                    )}
                    {tile.type === 'trap' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        <ShieldAlert className={`w-4 h-4 ${tile.disarmed ? 'text-gray-500' : 'text-red-700'}`} />
                        <text x={8} y={22} textAnchor="middle" fill={tile.disarmed ? '#6b7280' : '#b91c1c'} fontSize="7" fontWeight="bold">
                          {tile.disarmed ? 'SAFE' : 'TRAP'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'treasure' && (
                      <g transform={`translate(${x - 8}, ${y - 12})`}>
                        <Sparkles className={`w-4 h-4 ${tile.looted ? 'text-gray-400' : 'text-amber-600'}`} />
                        <text x={8} y={22} textAnchor="middle" fill={tile.looted ? '#9ca3af' : '#b45309'} fontSize="7" fontWeight="bold">
                          {tile.looted ? 'EMPTY' : 'MANA'}
                        </text>
                      </g>
                    )}
                    {tile.type === 'safe' && (
                      <g transform={`translate(${x - 8}, ${y - 10})`}>
                        <text x={8} y={12} textAnchor="middle" fill="#0369a1" fontSize="8" fontWeight="bold">
                          SAFE
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

          {/* Player Adventurer Token with Torchlight Aura */}
          <g transform={`translate(${playerPixel.x}, ${playerPixel.y})`} pointerEvents="none">
            <circle cx="0" cy="0" r="24" fill="url(#player-torch-glow)" />
            <circle cx="0" cy="0" r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black">
              ▲
            </text>
          </g>
        </svg>
      </div>

      {/* Selected Tile Action Bar / Quick Commands */}
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

            {/* Interaction Options */}
            {selectedTile.q === playerCoord.q && selectedTile.r === playerCoord.r ? (
              <span className="text-[11px] text-[#5c5346] italic">
                Current adventurer position.
              </span>
            ) : isSelectedAdjacent ? (
              <div className="flex items-center gap-2">
                {/* Step In Option */}
                <button
                  onClick={() => onStepIn(selectedTile)}
                  disabled={energy <= 0}
                  className="flex-1 py-2 bg-[#2d6a4f] hover:bg-[#23533e] text-white rounded-md font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-50"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Step In (-1⚡)</span>
                </button>

                {/* Peek Option (Only if unrevealed) */}
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
    </div>
  );
};
