import { useId } from "react";
import { describeLayout, type ElevationLayout } from "@/lib/elevation-layout";
import { formatLength, UM_PER_INCH } from "@/lib/units";

/**
 * Front-elevation illustration of a design, drawn to the design's real
 * width-to-height proportion in the chosen finish colour.
 *
 * This is a 2D illustration for the catalog. It is not a photograph, not a 3D
 * view, and not a source of truth for dimensions, rules or price.
 */
interface ElevationProps {
  layout: ElevationLayout;
  widthUm: number;
  heightUm: number;
  finishHex: string;
  label: string;
  showDimensions?: boolean;
  animate?: boolean;
  /** Index of a bay to outline, e.g. the one being edited. */
  highlightBay?: number | null;
  className?: string;
}

const VIEW_W = 400;
const VIEW_H = 300;
const MAX_FLOOR_Y = 264;
const PANEL_IN = 0.75;

interface CellBox {
  kind: ElevationLayout["columns"][number]["cells"][number]["kind"];
  y: number;
  h: number;
}
interface BayBox {
  x: number;
  w: number;
  cells: CellBox[];
}

/** Pure geometry: positions of bays and cells inside the carcass. */
function layoutBays(layout: ElevationLayout, x0: number, y0: number, w: number, bodyH: number, t: number): BayBox[] {
  const totalShare = layout.columns.reduce((n, c) => n + c.widthShare, 0);
  const innerW = w - t * (layout.columns.length + 1);
  const bays: BayBox[] = [];
  let x = x0 + t;
  for (const column of layout.columns) {
    const colW = (column.widthShare / totalShare) * innerW;
    const cellShare = column.cells.reduce((n, c) => n + c.heightShare, 0);
    const innerH = bodyH - t * (column.cells.length + 1);
    const cells: CellBox[] = [];
    let y = y0 + t;
    for (const cell of column.cells) {
      const cellH = (cell.heightShare / cellShare) * innerH;
      cells.push({ kind: cell.kind, y, h: cellH });
      y += cellH + t;
    }
    bays.push({ x, w: colW, cells });
    x += colW + t;
  }
  return bays;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function Elevation({
  layout,
  widthUm,
  heightUm,
  finishHex,
  label,
  showDimensions = false,
  animate = false,
  highlightBay = null,
  className,
}: ElevationProps) {
  const widthIn = widthUm / UM_PER_INCH;
  const heightIn = heightUm / UM_PER_INCH;
  const wallGapIn = layout.base === "wall" ? 14 : 0;

  const padLeft = showDimensions ? 28 : 36;
  const padRight = showDimensions ? 58 : 36;
  const padTop = showDimensions ? 46 : 26;
  const scale = Math.min(
    (VIEW_W - padLeft - padRight) / widthIn,
    (MAX_FLOOR_Y - padTop) / (heightIn + wallGapIn),
  );
  // Low pieces are centred vertically rather than left at the bottom of the frame.
  const FLOOR_Y = Math.min(
    MAX_FLOOR_Y,
    VIEW_H / 2 + ((heightIn + wallGapIn) * scale) / 2 + (showDimensions ? 16 : 0),
  );
  const maskId = useId();

  const w = widthIn * scale;
  const h = heightIn * scale;
  const x0 = padLeft + (VIEW_W - padLeft - padRight - w) / 2;
  const yBottom = FLOOR_Y - wallGapIn * scale;
  const y0 = yBottom - h;
  const t = Math.max(PANEL_IN * scale, 1.6);

  const baseH =
    layout.base === "legs" ? Math.min(6 * scale, h * 0.22) : layout.base === "plinth" ? 3 * scale : 0;
  const bodyBottom = yBottom - baseH;
  const bodyH = bodyBottom - y0;

  const dark = luminance(finishHex) < 0.22;
  const stroke = dark ? "rgba(255,255,255,0.5)" : "rgba(27,42,43,0.62)";
  const recess = dark ? "rgba(0,0,0,0.42)" : "rgba(27,42,43,0.3)";
  const front = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.14)";
  const line = { stroke, strokeWidth: 0.9, vectorEffect: "non-scaling-stroke" as const };

  const geometry = layoutBays(layout, x0, y0, w, bodyH, t);
  const bays = geometry.map((bay, ci) => {
    const colX = bay.x;
    const colW = bay.w;
    const cells = bay.cells.map((cell, ri) => {
      const cellH = cell.h;
      const cy = cell.y;
      const key = `${ci}-${ri}`;
      const handle = Math.min(cellH * 0.28, 16);
      const inset = Math.min(colW * 0.12, 7);
      switch (cell.kind) {
        case "void":
          // Cut out of the carcass by the mask below, so the background shows through.
          return null;
        case "open":
          return <rect key={key} x={colX} y={cy} width={colW} height={cellH} fill={recess} />;
        case "hanging": {
          const railY = cy + Math.min(cellH * 0.12, 10);
          const hangers = Math.max(2, Math.floor(colW / 14));
          return (
            <g key={key}>
              <rect x={colX} y={cy} width={colW} height={cellH} fill={recess} />
              <line x1={colX} x2={colX + colW} y1={railY} y2={railY} {...line} strokeWidth={1.4} />
              {Array.from({ length: hangers }, (_, i) => {
                const hx = colX + ((i + 0.5) / hangers) * colW;
                return (
                  <line key={i} x1={hx} x2={hx} y1={railY} y2={railY + cellH * (0.45 + (i % 3) * 0.12)} {...line} />
                );
              })}
            </g>
          );
        }
        case "drawer":
          return (
            <g key={key}>
              <rect x={colX} y={cy} width={colW} height={cellH} fill={front} {...line} />
              <line
                x1={colX + colW / 2 - Math.min(colW * 0.18, 12)}
                x2={colX + colW / 2 + Math.min(colW * 0.18, 12)}
                y1={cy + Math.min(cellH * 0.3, 7)}
                y2={cy + Math.min(cellH * 0.3, 7)}
                {...line}
                strokeWidth={1.6}
              />
            </g>
          );
        case "door-pair":
          return (
            <g key={key}>
              <rect x={colX} y={cy} width={colW / 2} height={cellH} fill={front} {...line} />
              <rect x={colX + colW / 2} y={cy} width={colW / 2} height={cellH} fill={front} {...line} />
              {[-1, 1].map((side) => (
                <line
                  key={side}
                  x1={colX + colW / 2 + side * Math.min(inset, 5)}
                  x2={colX + colW / 2 + side * Math.min(inset, 5)}
                  y1={cy + cellH / 2 - handle / 2}
                  y2={cy + cellH / 2 + handle / 2}
                  {...line}
                  strokeWidth={1.6}
                />
              ))}
            </g>
          );
        default: {
          // Single door: handle on the side nearest the centre of the piece.
          const hingeLeft = ci < layout.columns.length / 2;
          const hx = hingeLeft ? colX + colW - inset : colX + inset;
          return (
            <g key={key}>
              <rect x={colX} y={cy} width={colW} height={cellH} fill={front} {...line} />
              <line
                x1={hx}
                x2={hx}
                y1={cy + cellH / 2 - handle / 2}
                y2={cy + cellH / 2 + handle / 2}
                {...line}
                strokeWidth={1.6}
              />
            </g>
          );
        }
      }
    });

    return (
      <g
        key={ci}
        className={animate ? "bay-in" : undefined}
        style={animate ? { animationDelay: `${180 + ci * 130}ms` } : undefined}
      >
        {cells}
      </g>
    );
  });

  const legInset = Math.min(w * 0.06, 14);
  const legW = Math.max(t * 1.1, 2.4);
  const dim = { stroke: "var(--color-ink-soft)", strokeWidth: 0.8, vectorEffect: "non-scaling-stroke" as const };
  const dimText = {
    fill: "var(--color-ink)",
    fontSize: 11.5,
    fontFamily: "var(--font-sans)",
    style: { fontVariantNumeric: "tabular-nums" as const },
  };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={`${label}. Front-view illustration: ${describeLayout(layout)}.`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* floor */}
      <line x1={12} x2={VIEW_W - 12} y1={FLOOR_Y} y2={FLOOR_Y} stroke="var(--color-line)" strokeWidth={1} />
      <ellipse cx={x0 + w / 2} cy={FLOOR_Y + 5} rx={w * 0.52} ry={4} fill="rgba(27,42,43,0.07)" />

      {/* carcass */}
      <mask id={maskId}>
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="white" />
        {geometry.flatMap((bay, ci) =>
          bay.cells
            .filter((cell) => cell.kind === "void")
            .map((cell, ri) => (
              <rect key={`${ci}-${ri}`} x={bay.x} y={cell.y} width={bay.w} height={cell.h + t + 2} fill="black" />
            )),
        )}
      </mask>
      <rect x={x0} y={y0} width={w} height={bodyH} fill={finishHex} {...line} rx={0.6} mask={`url(#${maskId})`} />
      {bays}

      {layout.base === "plinth" && (
        <rect x={x0 + t} y={bodyBottom} width={w - 2 * t} height={baseH} fill={finishHex} {...line} />
      )}
      {layout.base === "plinth" && (
        <rect x={x0 + t} y={bodyBottom} width={w - 2 * t} height={baseH} fill="rgba(27,42,43,0.28)" />
      )}
      {layout.base === "legs" &&
        [x0 + legInset, x0 + w - legInset - legW].map((lx) => (
          <rect key={lx} x={lx} y={bodyBottom} width={legW} height={baseH} fill="var(--color-ink)" opacity={0.78} />
        ))}

      {highlightBay !== null && geometry[highlightBay] ? (
        <rect
          x={geometry[highlightBay].x - t / 2}
          y={y0 - 3}
          width={geometry[highlightBay].w + t}
          height={bodyH + 6}
          fill="none"
          stroke="var(--color-spruce)"
          strokeWidth={2.5}
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
          rx={2}
        />
      ) : null}

      {showDimensions && (
        <g aria-hidden="true">
          <line x1={x0} x2={x0 + w} y1={y0 - 16} y2={y0 - 16} {...dim} />
          <line x1={x0} x2={x0} y1={y0 - 21} y2={y0 - 11} {...dim} />
          <line x1={x0 + w} x2={x0 + w} y1={y0 - 21} y2={y0 - 11} {...dim} />
          <text x={x0 + w / 2} y={y0 - 23} textAnchor="middle" {...dimText}>
            {formatLength(widthUm)}
          </text>
          <line x1={x0 + w + 16} x2={x0 + w + 16} y1={y0} y2={yBottom} {...dim} />
          <line x1={x0 + w + 11} x2={x0 + w + 21} y1={y0} y2={y0} {...dim} />
          <line x1={x0 + w + 11} x2={x0 + w + 21} y1={yBottom} y2={yBottom} {...dim} />
          <text x={x0 + w + 24} y={y0 + h / 2 + 4} {...dimText}>
            {formatLength(heightUm)}
          </text>
        </g>
      )}
    </svg>
  );
}
