import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent, type ReactNode, type WheelEvent } from 'react';
import { RotateCcw } from 'lucide-react';

interface MapPoint {
  x: number;
  y: number;
}

interface ZoomView extends MapPoint {
  scale: number;
}

interface MapGesture {
  mode: 'idle' | 'pan' | 'pinch';
  startView: ZoomView;
  startPoint: MapPoint;
  startDistance: number;
  startCenter: MapPoint;
  moved: boolean;
}

interface MapZoomViewportProps {
  children: ReactNode;
  className?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_PAN_ZOOM = 1.005;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isZoomControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-map-zoom-control]') !== null;
}

export function MapZoomViewport({ children, className = '' }: MapZoomViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, MapPoint>());
  const gestureRef = useRef<MapGesture | null>(null);
  const suppressClickRef = useRef(false);
  const [view, setView] = useState<ZoomView>({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);

  const updateView = (nextView: ZoomView) => {
    viewRef.current = nextView;
    setView(nextView);
  };

  const clampView = (scale: number, x: number, y: number): ZoomView => {
    const viewport = viewportRef.current;
    if (!viewport) return { x, y, scale };

    const maxX = (viewport.clientWidth * (scale - 1)) / 2;
    const maxY = (viewport.clientHeight * (scale - 1)) / 2;
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
      scale,
    };
  };

  const getLocalPoint = (clientX: number, clientY: number): MapPoint => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect
      ? { x: clientX - rect.left, y: clientY - rect.top }
      : { x: clientX, y: clientY };
  };

  const zoomAt = (nextScale: number, point: MapPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const current = viewRef.current;
    const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    const contentX = (point.x - centerX - current.x) / current.scale;
    const contentY = (point.y - centerY - current.y) / current.scale;
    updateView(
      clampView(
        scale,
        point.x - centerX - contentX * scale,
        point.y - centerY - contentY * scale
      )
    );
  };

  const beginPinch = () => {
    const points = Array.from(pointersRef.current.values()).slice(0, 2);
    if (points.length < 2) return;
    const viewport = viewportRef.current;
    if (viewport) {
      for (const pointerId of pointersRef.current.keys()) {
        if (!viewport.hasPointerCapture(pointerId)) viewport.setPointerCapture(pointerId);
      }
    }
    const [first, second] = points;
    const current = viewRef.current;
    gestureRef.current = {
      mode: 'pinch',
      startView: current,
      startPoint: { x: 0, y: 0 },
      startDistance: Math.hypot(second.x - first.x, second.y - first.y),
      startCenter: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      moved: gestureRef.current?.moved ?? false,
    };
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (isZoomControl(event.target)) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomAt(viewRef.current.scale * factor, getLocalPoint(event.clientX, event.clientY));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isZoomControl(event.target) || (event.pointerType === 'mouse' && event.button !== 0)) return;

    const point = getLocalPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);
    if (viewRef.current.scale > MIN_PAN_ZOOM) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (pointersRef.current.size >= 2) {
      beginPinch();
      return;
    }

    const current = viewRef.current;
    gestureRef.current = {
      mode: current.scale > MIN_PAN_ZOOM ? 'pan' : 'idle',
      startView: current,
      startPoint: point,
      startDistance: 0,
      startCenter: point,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    const point = getLocalPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointersRef.current.size >= 2 && gesture.mode === 'pinch') {
      const points = Array.from(pointersRef.current.values()).slice(0, 2);
      const [first, second] = points;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const viewport = viewportRef.current;
      if (!viewport || gesture.startDistance === 0) return;

      const scale = clamp(
        gesture.startView.scale * (distance / gesture.startDistance),
        MIN_ZOOM,
        MAX_ZOOM
      );
      const contentX =
        (gesture.startCenter.x - viewport.clientWidth / 2 - gesture.startView.x) /
        gesture.startView.scale;
      const contentY =
        (gesture.startCenter.y - viewport.clientHeight / 2 - gesture.startView.y) /
        gesture.startView.scale;
      const panX = center.x - viewport.clientWidth / 2 - contentX * scale;
      const panY = center.y - viewport.clientHeight / 2 - contentY * scale;
      const moved =
        gesture.moved ||
        Math.abs(distance - gesture.startDistance) > 3 ||
        Math.hypot(center.x - gesture.startCenter.x, center.y - gesture.startCenter.y) > 3;

      gesture.moved = moved;
      updateView(clampView(scale, panX, panY));
      return;
    }

    if (gesture.mode !== 'pan') return;
    const deltaX = point.x - gesture.startPoint.x;
    const deltaY = point.y - gesture.startPoint.y;
    const moved = gesture.moved || Math.hypot(deltaX, deltaY) > 4;
    gesture.moved = moved;
    if (moved) {
      updateView(
        clampView(
          gesture.startView.scale,
          gesture.startView.x + deltaX,
          gesture.startView.y + deltaY
        )
      );
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size >= 2) {
      beginPinch();
      return;
    }

    if (pointersRef.current.size === 1) {
      const [, point] = Array.from(pointersRef.current.entries())[0];
      const current = viewRef.current;
      gestureRef.current = {
        mode: current.scale > MIN_PAN_ZOOM ? 'pan' : 'idle',
        startView: current,
        startPoint: point,
        startDistance: 0,
        startCenter: point,
        moved: gesture?.moved ?? false,
      };
      return;
    }

    if (gesture?.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    gestureRef.current = null;
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current || isZoomControl(event.target)) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const resetView = () => updateView({ x: 0, y: 0, scale: 1 });

  return (
    <div
      ref={viewportRef}
      className={`min-h-0 min-w-0 overflow-hidden ${className}`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
      {view.scale > MIN_PAN_ZOOM && (
        <button
          type="button"
          data-map-zoom-control
          aria-label="Reset map zoom"
          title="Reset map zoom"
          onClick={resetView}
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-[#2b261f]/60 bg-[#f5efe3]/90 text-[#2b261f] shadow-sm backdrop-blur-sm transition-colors hover:bg-white active:scale-95 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}