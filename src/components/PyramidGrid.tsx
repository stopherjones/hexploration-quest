import React, { useMemo, useState } from 'react';
import { PyramidHex, getPyramidForwardMoves, PYRAMID_COLS } from '../utils/pyramidEngine';
import { ExplorationCard } from '../utils/explorationDeck';
import { X, Sparkles, ShieldAlert, Backpack } from 'lucide-react';

interface PyramidGridProps {
  tiles: Map<string, PyramidHex>;
  playerPos: { col: number; row: number };
  baseCard: ExplorationCard;
  visitedPath: { col: number; row: number }[];
  streak: number;
  energy: number;
  playerHand?: ExplorationCard[];
  onTileClick?: (col: number, row: number) => void;
  onPredict?: (prediction: 'higher' | 'lower') => void;
}

export const PyramidGrid: React.FC<PyramidGridProps> = ({
  tiles,
  playerPos,
  baseCard,
  visitedPath,
  streak,
  energy,
  playerHand = [],
  onTileClick,
  onPredict,
}) => {
  // Modal state to inspect all cards in hand
  const [showHandModal, setShowHandModal] = useState<boolean>(false);

  // SVG Dimensions & Exact Hex Honeycomb Geometry (Matching L1 styling with crisp gap)
  const SVG_WIDTH = 550;
  const SVG_HEIGHT = 500;
  const HEX_R = 21.5;
  const COL_SPACING = HEX_R * 1.5; // 32.25px
  const ROW_SPACING = Math.sqrt(3) * HEX_R; // 37.239px
  const START_X = 148;
  const CENTER_Y = 250;

  // Exact pixel center for flat-topped hexagon in column col, row row
  const getHexCoords = (col: number, row: number) => {
    const x = START_X + col * COL_SPACING;
    const y = CENTER_Y + (row - col * 0.5) * ROW_SPACING;
    return { x, y };
  };

  // Generate flat-topped hexagon SVG polygon points with slight gap (HEX_R - 1.2 matching L1)
  const getFlatHexPoints = (cx: number, cy: number, r: number) => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i);
      const px = cx + r * Math.cos(angleRad);
      const py = cy + r * Math.sin(angleRad);
      points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
    }
    return points.join(' ');
  };

  // Forward options from current player position
  const forwardMoves = useMemo(() => {
    return getPyramidForwardMoves(playerPos);
  }, [playerPos]);

  // Set of visited keys for fast lookup
  const visitedKeySet = useMemo(() => {
    return new Set(visitedPath.map((p) => `${p.col},${p.row}`));
  }, [visitedPath]);

  // All connection paths between nodes in the sideways pyramid
  const allConnections = useMemo(() => {
    const lines: {
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      type: 'higher' | 'lower';
      isActiveOption: boolean;
      isTraveled: boolean;
    }[] = [];

    for (let col = 0; col < PYRAMID_COLS - 1; col++) {
      for (let row = 0; row <= col; row++) {
        const fromPos = { col, row };
        const moves = getPyramidForwardMoves(fromPos);
        const isPlayerHere = playerPos.col === col && playerPos.row === row;

        if (moves.higher) {
          const isTraveled =
            visitedKeySet.has(`${col},${row}`) &&
            visitedKeySet.has(`${moves.higher.col},${moves.higher.row}`);
          lines.push({
            p1: getHexCoords(col, row),
            p2: getHexCoords(moves.higher.col, moves.higher.row),
            type: 'higher',
            isActiveOption: isPlayerHere,
            isTraveled,
          });
        }

        if (moves.lower) {
          const isTraveled =
            visitedKeySet.has(`${col},${row}`) &&
            visitedKeySet.has(`${moves.lower.col},${moves.lower.row}`);
          lines.push({
            p1: getHexCoords(col, row),
            p2: getHexCoords(moves.lower.col, moves.lower.row),
            type: 'lower',
            isActiveOption: isPlayerHere,
            isTraveled,
          });
        }
      }
    }
    return lines;
  }, [playerPos, visitedKeySet]);

  const isRedSuit = baseCard.suit === '♥' || baseCard.suit === '♦';

  // Hand cards calculations
  const handCount = playerHand.length;
  const cumulativeHandValue = playerHand.reduce((acc, c) => acc + c.value, 0);
  const latestCard = handCount > 0 ? playerHand[handCount - 1] : null;
  const isLatestRed = latestCard ? latestCard.suit === '♥' || latestCard.suit === '♦' : false;

  const playerPixel = getHexCoords(playerPos.col, playerPos.row);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-1 relative select-none">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full max-h-full aspect-[550/500] drop-shadow-md touch-manipulation"
      >
        <defs>
          {/* L1 Matching Subtle Paper Stipple Pattern */}
          <pattern id="l1-paper-stipple" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#bfae95" opacity="0.6" />
            <circle cx="6" cy="6" r="0.8" fill="#bfae95" opacity="0.6" />
          </pattern>

          {/* L1 Background Parchment Gradient */}
          <linearGradient id="l1BgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ede1ca" />
            <stop offset="50%" stopColor="#e4d4ba" />
            <stop offset="100%" stopColor="#d8c5a4" />
          </linearGradient>

          {/* L1 Player Adventurer Token Glow */}
          <radialGradient id="player-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#22c55e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Map Backdrop Frame */}
        <rect
          x="6"
          y="6"
          width={SVG_WIDTH - 12}
          height={SVG_HEIGHT - 12}
          rx="12"
          fill="url(#l1BgGrad)"
          stroke="#4a3e31"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* ============================================================== */}
        {/* 1. TOP-LEFT ACTIVE BASE CARD INSET (Natural Negative Space)     */}
        {/* ============================================================== */}
        <g id="persistent-base-card-inset" transform="translate(14, 16)">
          <rect
            x="0"
            y="0"
            width="122"
            height="148"
            rx="8"
            fill="#f7f1e3"
            stroke="#5c5346"
            strokeWidth="1.5"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
          />
          <rect
            x="0"
            y="0"
            width="122"
            height="22"
            rx="8"
            fill="#e2d4bd"
            stroke="#5c5346"
            strokeWidth="1.5"
          />
          <text
            x="61"
            y="14"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            fontFamily="monospace"
            fill="#3e3428"
            letterSpacing="0.5"
          >
            ACTIVE BASE CARD
          </text>

          {/* Playing Card Replica */}
          <g transform="translate(35, 29)">
            <rect
              x="0"
              y="0"
              width="52"
              height="72"
              rx="6"
              fill="#ffffff"
              stroke="#2b261f"
              strokeWidth="1.5"
              filter="drop-shadow(0 1px 3px rgba(0,0,0,0.2))"
            />
            {/* Top-Left Rank & Suit */}
            <text
              x="5"
              y="13"
              fontSize="10"
              fontWeight="900"
              fontFamily="monospace"
              fill={isRedSuit ? '#b91c1c' : '#1e1b18'}
            >
              {baseCard.rank}
            </text>
            <text
              x="5"
              y="23"
              fontSize="9"
              fontWeight="bold"
              fill={isRedSuit ? '#b91c1c' : '#1e1b18'}
            >
              {baseCard.suit}
            </text>

            {/* Center Big Suit */}
            <text
              x="26"
              y="45"
              textAnchor="middle"
              fontSize="23"
              fontWeight="bold"
              fontFamily="serif"
              fill={isRedSuit ? '#dc2626' : '#1e1b18'}
            >
              {baseCard.suit}
            </text>

            {/* Bottom-Right Value */}
            <text
              x="47"
              y="66"
              textAnchor="end"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="bold"
              fill="#786e5e"
            >
              v:{baseCard.value}
            </text>
          </g>

          {/* Streak Indicator Badge */}
          <g transform="translate(10, 107)">
            <rect
              x="0"
              y="0"
              width="102"
              height="18"
              rx="4"
              fill={streak > 0 ? '#dcfce7' : streak < 0 ? '#fee2e2' : '#ede4d3'}
              stroke={streak > 0 ? '#16a34a' : streak < 0 ? '#dc2626' : '#a89d8d'}
              strokeWidth="1"
            />
            <text
              x="51"
              y="12"
              textAnchor="middle"
              fontSize="8"
              fontWeight="900"
              fontFamily="monospace"
              fill={streak > 0 ? '#15803d' : streak < 0 ? '#b91c1c' : '#5c5244'}
            >
              {streak > 0
                ? `▲ Streak +${streak} (+${streak + 1}⚡)`
                : streak < 0
                ? `▼ Streak ${streak} (${streak - 1}⚡)`
                : 'Streak: 0 (Neutral)'}
            </text>
          </g>

          {/* Col / Energy Info */}
          <text
            x="61"
            y="138"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="bold"
            fontFamily="monospace"
            fill="#6b5d4d"
          >
            Col {playerPos.col + 1}/12 • {energy}⚡ Left
          </text>
        </g>

        {/* ============================================================== */}
        {/* 2. BOTTOM-LEFT HAND CARDS BUTTON (Mirroring Base Card)          */}
        {/* ============================================================== */}
        <g
          id="persistent-hand-cards-inset"
          transform="translate(14, 336)"
          className="cursor-pointer transition-transform hover:opacity-95"
          onClick={() => setShowHandModal(true)}
        >
          {/* Frame */}
          <rect
            x="0"
            y="0"
            width="122"
            height="148"
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
            width="122"
            height="22"
            rx="8"
            fill="#dbece2"
            stroke="#5c5346"
            strokeWidth="1.5"
          />
          <text
            x="61"
            y="14"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            fontFamily="monospace"
            fill="#166534"
            letterSpacing="0.5"
          >
            HAND CARDS
          </text>

          {/* Splayed Card Stack */}
          {handCount > 0 && latestCard ? (
            <g transform="translate(35, 29)">
              {/* Third card in stack (if 3+ cards) - splayed slightly left */}
              {handCount >= 3 && (
                <g transform="translate(-4, 2) rotate(-8 26 36)">
                  <rect
                    x="0"
                    y="0"
                    width="52"
                    height="72"
                    rx="5"
                    fill="#e8ded0"
                    stroke="#786e5e"
                    strokeWidth="1.2"
                    opacity="0.85"
                  />
                  <rect
                    x="3"
                    y="3"
                    width="46"
                    height="66"
                    rx="3"
                    fill="#d8cebf"
                    stroke="#a39684"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                </g>
              )}

              {/* Second card in stack (if 2+ cards) - splayed slightly right */}
              {handCount >= 2 && (
                <g transform="translate(4, 1) rotate(6 26 36)">
                  <rect
                    x="0"
                    y="0"
                    width="52"
                    height="72"
                    rx="5"
                    fill="#f2ebe0"
                    stroke="#5c5346"
                    strokeWidth="1.2"
                    opacity="0.92"
                  />
                  <rect
                    x="3"
                    y="3"
                    width="46"
                    height="66"
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
                  width="52"
                  height="72"
                  rx="6"
                  fill="#ffffff"
                  stroke="#2b261f"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                />
                {/* Top-Left Rank & Suit */}
                <text
                  x="5"
                  y="13"
                  fontSize="10"
                  fontWeight="900"
                  fontFamily="monospace"
                  fill={isLatestRed ? '#b91c1c' : '#1e1b18'}
                >
                  {latestCard.rank}
                </text>
                <text
                  x="5"
                  y="23"
                  fontSize="9"
                  fontWeight="bold"
                  fill={isLatestRed ? '#b91c1c' : '#1e1b18'}
                >
                  {latestCard.suit}
                </text>

                {/* Center Big Suit */}
                <text
                  x="26"
                  y="45"
                  textAnchor="middle"
                  fontSize="23"
                  fontWeight="bold"
                  fontFamily="serif"
                  fill={isLatestRed ? '#dc2626' : '#1e1b18'}
                >
                  {latestCard.suit}
                </text>

                {/* Bottom-Right Value */}
                <text
                  x="47"
                  y="66"
                  textAnchor="end"
                  fontSize="7.5"
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
            <g transform="translate(35, 29)">
              <rect
                x="0"
                y="0"
                width="52"
                height="72"
                rx="6"
                fill="#f1ebdf"
                stroke="#a89d8d"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <text
                x="26"
                y="34"
                textAnchor="middle"
                fontSize="18"
                opacity="0.5"
              >
                🃏
              </text>
              <text
                x="26"
                y="50"
                textAnchor="middle"
                fontSize="7.5"
                fontWeight="bold"
                fontFamily="monospace"
                fill="#8a7e6d"
              >
                0 Cards
              </text>
            </g>
          )}

          {/* Cumulative Hand Badge / Tap to View Button */}
          <g transform="translate(8, 107)">
            <rect
              x="0"
              y="0"
              width="106"
              height="30"
              rx="4"
              fill={handCount > 0 ? '#1b4332' : '#e5ddcc'}
              stroke={handCount > 0 ? '#15803d' : '#948775'}
              strokeWidth="1"
            />
            <text
              x="53"
              y="12"
              textAnchor="middle"
              fontSize="8"
              fontWeight="900"
              fontFamily="monospace"
              fill={handCount > 0 ? '#86efac' : '#5c5244'}
            >
              {handCount > 0
                ? `${handCount} card${handCount === 1 ? '' : 's'} • Val: -${cumulativeHandValue}`
                : 'Empty Hand (0)'}
            </text>
            <text
              x="53"
              y="23"
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fontFamily="monospace"
              fill={handCount > 0 ? '#ffffff' : '#786e5e'}
            >
              {handCount > 0 ? '👁 Tap to view hand' : 'Bank honour cards'}
            </text>
          </g>
        </g>

        {/* Traveled Route Connections */}
        <g id="pyr-traveled-lines">
          {allConnections
            .filter((c) => c.isTraveled)
            .map((conn, idx) => (
              <line
                key={`traveled-line-${idx}`}
                x1={conn.p1.x}
                y1={conn.p1.y}
                x2={conn.p2.x}
                y2={conn.p2.y}
                stroke="#b45309"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.85"
              />
            ))}
        </g>

        {/* ============================================================== */}
        {/* 3. 78 FLAT-TOPPED HEXAGON TILES (Matching L1 Styling & Gap)    */}
        {/* ============================================================== */}
        <g id="pyr-tiles">
          {Array.from(tiles.values()).map((tile) => {
            const { x, y } = getHexCoords(tile.col, tile.row);
            const isPlayer = playerPos.col === tile.col && playerPos.row === tile.row;

            const isHigherChoice =
              forwardMoves.higher &&
              forwardMoves.higher.col === tile.col &&
              forwardMoves.higher.row === tile.row;

            const isLowerChoice =
              forwardMoves.lower &&
              forwardMoves.lower.col === tile.col &&
              forwardMoves.lower.row === tile.row;

            const isInteractive = Boolean(isHigherChoice || isLowerChoice);

            // Exact L1 Palette: Default parchment '#e7ddc9', explored '#dbe7d0'
            let fillColor = '#e7ddc9';
            let strokeColor = '#2b261f';
            let strokeW = 1.2;

            if (tile.isEvent) {
              // Event spaces: subtle mystic lavender tint so event is distinct
              fillColor = '#f3e8ff';
              strokeColor = '#9333ea';
              strokeW = 1.5;
            } else if (tile.isGoalCol) {
              // Goal column: sanctum golden tint
              fillColor = '#fae19c';
              strokeColor = '#ca8a04';
              strokeW = 1.5;
            } else if (tile.visited) {
              fillColor = '#dbe7d0';
              strokeColor = '#2b261f';
              strokeW = 1.2;
            }

            // CRITICAL REQUIREMENT:
            // "Highlight the moves by bordering the hexes in thick green / red, rather than shading them - so you can still see the event hexes"
            if (isHigherChoice) {
              strokeColor = '#15803d'; // Thick Forest Green border
              strokeW = 3.8;
            } else if (isLowerChoice) {
              strokeColor = '#dc2626'; // Thick Bold Red border
              strokeW = 3.8;
            } else if (isPlayer) {
              strokeColor = '#15803d';
              strokeW = 2.4;
            }

            // HEX_R - 1.2 provides the exact slight gap between hexes matching L1
            const pointsStr = getFlatHexPoints(x, y, HEX_R - 1.2);

            const handleHexClick = () => {
              if (isHigherChoice && onPredict) {
                onPredict('higher');
              } else if (isLowerChoice && onPredict) {
                onPredict('lower');
              } else if (onTileClick) {
                onTileClick(tile.col, tile.row);
              }
            };

            return (
              <g
                key={`hex-${tile.id}`}
                className={`transition-all duration-150 ${
                  isInteractive ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
                }`}
                onClick={handleHexClick}
              >
                {/* Hexagon Body (Flat-topped with L1 gap) */}
                <polygon
                  points={pointsStr}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  strokeLinejoin="round"
                />

                {/* Fog overlay paper pattern for unvisited tiles matching L1 */}
                {!tile.visited && (
                  <polygon
                    points={pointsStr}
                    fill="url(#l1-paper-stipple)"
                    pointerEvents="none"
                  />
                )}

                {/* Event Hex Distinctive Glyph: "EVENT" (Crystal clear even with thick border!) */}
                {tile.isEvent && (
                  <g pointerEvents="none" transform={`translate(${x}, ${y - 4})`}>
                    <text
                      textAnchor="middle"
                      y="1"
                      fontSize="10"
                      fill="#7e22ce"
                      fontWeight="bold"
                    >
                      ✨
                    </text>
                    <text
                      textAnchor="middle"
                      y="11"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="900"
                      fill="#6b21a8"
                    >
                      EVENT
                    </text>
                  </g>
                )}

                {/* Goal Column Archway Marker */}
                {tile.isGoalCol && !tile.isEvent && !tile.visited && (
                  <g pointerEvents="none" transform={`translate(${x}, ${y - 3})`}>
                    <text textAnchor="middle" y="2" fontSize="9">
                      👑
                    </text>
                    <text
                      textAnchor="middle"
                      y="10"
                      fontSize="6"
                      fontFamily="monospace"
                      fontWeight="900"
                      fill="#a16207"
                    >
                      SANCTUM
                    </text>
                  </g>
                )}

                {/* Visited Card Display */}
                {!isPlayer && !tile.isEvent && tile.visited && tile.drawnCard && (
                  <g pointerEvents="none" transform={`translate(${x}, ${y})`}>
                    <text
                      textAnchor="middle"
                      y="3"
                      fontSize="9"
                      fontWeight="900"
                      fontFamily="monospace"
                      fill={
                        tile.drawnCard.suit === '♥' || tile.drawnCard.suit === '♦'
                          ? '#b91c1c'
                          : '#1e1b18'
                      }
                    >
                      {tile.drawnCard.rank}
                      {tile.drawnCard.suit}
                    </text>
                  </g>
                )}

                {/* Move Option Badges with NE (↗) and SE (↘) Arrows */}
                {isHigherChoice && (
                  <g pointerEvents="none" transform={`translate(${x}, ${y + (tile.isEvent ? 10 : 0)})`}>
                    <rect
                      x="-15"
                      y="-5"
                      width="30"
                      height="10"
                      rx="2.5"
                      fill="#15803d"
                      stroke="#ffffff"
                      strokeWidth="0.75"
                    />
                    <text
                      textAnchor="middle"
                      y="2.5"
                      fontSize="6.5"
                      fontWeight="900"
                      fontFamily="monospace"
                      fill="#ffffff"
                    >
                      ↗ HIGHER
                    </text>
                  </g>
                )}

                {isLowerChoice && (
                  <g pointerEvents="none" transform={`translate(${x}, ${y + (tile.isEvent ? 10 : 0)})`}>
                    <rect
                      x="-15"
                      y="-5"
                      width="30"
                      height="10"
                      rx="2.5"
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth="0.75"
                    />
                    <text
                      textAnchor="middle"
                      y="2.5"
                      fontSize="6.5"
                      fontWeight="900"
                      fontFamily="monospace"
                      fill="#ffffff"
                    >
                      ↘ LOWER
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* 4. PLAYER ADVENTURER PAWN TOKEN (Identical High-Contrast L1)   */}
        {/* ============================================================== */}
        <g
          transform={`translate(${playerPixel.x}, ${playerPixel.y})`}
          className="pointer-events-none transition-transform duration-300 ease-out"
        >
          {/* Broad glowing radial halo */}
          <circle cx="0" cy="0" r="32" fill="url(#player-glow)" />

          {/* Double animated pulsing radar waves */}
          <circle
            cx="0"
            cy="0"
            r="20"
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.8"
            strokeDasharray="4 4"
            className="animate-ping opacity-75"
          />
          <circle
            cx="0"
            cy="0"
            r="14"
            fill="none"
            stroke="#15803d"
            strokeWidth="1.2"
            opacity="0.8"
          />

          {/* Drop shadow */}
          <ellipse cx="1.5" cy="3.5" rx="12" ry="6" fill="#000000" opacity="0.4" />

          {/* Thick Brass Outer Compass Ring */}
          <circle cx="0" cy="0" r="12" fill="#fdfbf7" stroke="#1c1917" strokeWidth="2.5" />

          {/* Deep Forest Green Explorer Disc */}
          <circle cx="0" cy="0" r="8.5" fill="#2d6a4f" stroke="#1c1917" strokeWidth="1.2" />

          {/* Bright White Crosshairs */}
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#ffffff" strokeWidth="1.2" />

          {/* Center Golden Pip */}
          <circle cx="0" cy="0" r="2.8" fill="#f59e0b" stroke="#1c1917" strokeWidth="0.8" />
        </g>
      </svg>

      {/* ============================================================== */}
      {/* 5. MODAL: SEE ALL CARDS IN HAND (Opened via Hand cards button)  */}
      {/* ============================================================== */}
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
                    Cumulative Score Reduction: <strong>-{cumulativeHandValue} pts</strong>
                  </div>
                </div>
                <div className="text-2xl font-black bg-[#c8e6c9] px-2 py-0.5 rounded border border-[#a5d6a7]">
                  -{cumulativeHandValue}
                </div>
              </div>

              {/* Strategic Explanation */}
              <p className="text-[11px] text-[#5c5244] leading-relaxed">
                Cards banked in Level 1.5 carry forward to <strong>Level 3</strong>. Playing a card permanently reduces your challenge dice rolls towards 0 to dismantle traps and master gates without fighting beasts!
              </p>

              {/* Cards Grid */}
              {handCount === 0 ? (
                <div className="py-8 text-center bg-[#ede4d3] rounded-lg border border-[#cfbe9f] text-[#7a6d59] space-y-1">
                  <div className="text-2xl">🃏</div>
                  <div className="font-bold text-xs">Your hand is currently empty</div>
                  <div className="text-[10px]">
                    Draw honour cards (A, K, Q, J) to bank cards into your hand!
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {playerHand.map((card, idx) => {
                    const isRed = card.suit === '♥' || card.suit === '♦';
                    return (
                      <div
                        key={`hand-card-modal-${card.id || idx}`}
                        className="bg-white border-2 border-[#2b261f] rounded-lg shadow p-2 flex flex-col justify-between items-center h-28 relative"
                      >
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
                        </div>
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
                className="w-full py-2 px-4 bg-[#2b261f] hover:bg-[#3d3328] active:bg-[#1a1612] text-white font-mono font-black text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer transition-transform active:translate-y-0.5"
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
