import {
  Children,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './MasonryGrid.css';

const DEFAULT_ESTIMATE_PX = 280;

function packIntoColumns(itemCount, heights, columnCount, gapPx, estimatePx) {
  const hAt = (i) => {
    const v = heights[i];
    return v > 0 ? v : estimatePx;
  };
  const cols = Array.from({ length: columnCount }, () => []);
  const colHeights = Array(columnCount).fill(0);

  for (let i = 0; i < itemCount; i += 1) {
    let best = 0;
    for (let c = 1; c < columnCount; c += 1) {
      if (colHeights[c] < colHeights[best]) best = c;
    }
    cols[best].push(i);
    colHeights[best] += hAt(i) + gapPx;
  }
  return cols;
}

export default function MasonryGrid({
  gap = '1rem',
  minColumnWidth = 260,
  className = '',
  style: styleProp,
  getCellClassName,
  children,
}) {
  const containerRef = useRef(null);
  const cellRefs = useRef([]);
  const [columnCount, setColumnCount] = useState(1);
  const [heights, setHeights] = useState(() => []);
  const [gapPx, setGapPx] = useState(16);

  const estimatePx = useMemo(() => {
    const known = heights.filter((h) => h > 0);
    if (known.length === 0) return DEFAULT_ESTIMATE_PX;
    return known.reduce((a, b) => a + b, 0) / known.length;
  }, [heights]);

  const items = useMemo(() => Children.toArray(children), [children]);
  const itemCount = items.length;

  const syncGapFromEl = useCallback((el) => {
    if (!el) return;
    const cs = getComputedStyle(el);
    const g = parseFloat(cs.gap) || 16;
    setGapPx(g);
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const updateCols = () => {
      const w = el.clientWidth;
      syncGapFromEl(el);
      const g = parseFloat(getComputedStyle(el).gap) || 16;
      const cols = Math.max(1, Math.floor((w + g) / (minColumnWidth + g)));
      setColumnCount(cols);
    };

    updateCols();
    const ro = new ResizeObserver(updateCols);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minColumnWidth, syncGapFromEl]);

  const attachCellRef = useCallback((index, node) => {
    cellRefs.current[index] = node ?? undefined;
  }, []);

  useLayoutEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, itemCount);
  }, [itemCount]);

  useLayoutEffect(() => {
    if (itemCount === 0) return undefined;

    const readHeights = () => {
      const next = Array.from({ length: itemCount }, (_, i) => {
        const node = cellRefs.current[i];
        return node ? node.offsetHeight : 0;
      });
      setHeights((prev) =>
        next.map((h, i) => (h > 0 ? h : prev[i] ?? 0)),
      );
    };

    const observers = [];
    cellRefs.current.forEach((node) => {
      if (!node) return;
      const ro = new ResizeObserver(readHeights);
      ro.observe(node);
      observers.push(ro);
    });

    readHeights();
    if (containerRef.current) syncGapFromEl(containerRef.current);

    return () => observers.forEach((o) => o.disconnect());
  }, [itemCount, columnCount, syncGapFromEl]);

  const paddedHeights = useMemo(() => {
    const out = [];
    for (let i = 0; i < itemCount; i += 1) out.push(heights[i] ?? 0);
    return out;
  }, [heights, itemCount]);

  const columnBuckets = useMemo(() => {
    if (itemCount === 0) return [];
    return packIntoColumns(
      itemCount,
      paddedHeights,
      columnCount,
      gapPx,
      estimatePx,
    );
  }, [itemCount, paddedHeights, columnCount, gapPx, estimatePx]);

  const mergedStyle = {
    ...styleProp,
    '--masonry-gap': typeof gap === 'number' ? `${gap}px` : gap,
    '--masonry-min-col': `${minColumnWidth}px`,
  };

  if (itemCount === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`masonry-grid${className ? ` ${className}` : ''}`}
      style={mergedStyle}
    >
      {columnBuckets.map((indices, colIdx) => (
        <div key={`col-${colIdx}`} className="masonry-grid__col">
          {indices.map((i) => {
            const child = items[i];
            const cellClass = getCellClassName ? getCellClassName(i) : '';
            return (
              <div
                key={child.key ?? `masonry-${i}`}
                ref={(el) => attachCellRef(i, el)}
                className={`masonry-grid__cell${cellClass ? ` ${cellClass}` : ''}`}
              >
                {child}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
