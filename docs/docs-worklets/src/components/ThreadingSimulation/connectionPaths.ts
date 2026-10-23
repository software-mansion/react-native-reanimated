export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface RailLayout {
  vertical: number[];
  columnGutters?: number[];
  horizontal: number[];
  panels: Rect[];
}

/** Sample the rail polyline without forcing SVG geometry/layout reads per frame. */
export function measurePath(points: Point[]) {
  const segments = points.slice(1).map((to, index) => {
    const from = points[index];
    return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
  });
  const length = segments.reduce((total, segment) => total + segment.length, 0);
  return {
    length,
    pointAt(distance: number): Point {
      let remaining = Math.max(0, Math.min(distance, length));
      for (const segment of segments) {
        if (segment.length === 0) continue;
        if (remaining <= segment.length) {
          const progress = remaining / segment.length;
          return {
            x: segment.from.x + (segment.to.x - segment.from.x) * progress,
            y: segment.from.y + (segment.to.y - segment.from.y) * progress,
          };
        }
        remaining -= segment.length;
      }
      return points.at(-1) ?? { x: 0, y: 0 };
    },
  };
}

/** Prefer outer lanes; reserve panel gutters for otherwise unreachable cards. */
export function connectionRails(
  panels: Rect[],
  bounds: Rect,
  lane: number,
  gap = 32
): RailLayout {
  const offset = ((lane % 4) - 1.5) * 5;
  if (panels.length === 0) return { vertical: [], horizontal: [], panels };
  const left = Math.min(...panels.map((panel) => panel.left));
  const right = Math.max(...panels.map((panel) => panel.right));
  return {
    columnGutters: panels.flatMap((a) =>
      panels
        .filter(
          (b) =>
            b.left - a.right >= gap &&
            b.left - a.right <= gap * 2 &&
            Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom)
        )
        .map((b) => (a.right + b.left) / 2 + offset)
    ),
    vertical: [left - gap / 2 + offset, right + gap / 2 + offset].filter(
      (x) => x >= bounds.left && x <= bounds.right
    ),
    horizontal: [
      ...new Set(
        panels.flatMap((panel) => [
          panel.top - gap / 2 + offset,
          panel.bottom + gap / 2 + offset,
        ])
      ),
    ].filter((y) => y >= bounds.top && y <= bounds.bottom),
    panels,
  };
}

export function crossesRect(a: Point, b: Point, rect: Rect): boolean {
  if (a.x === b.x) {
    return (
      a.x > rect.left &&
      a.x < rect.right &&
      Math.max(a.y, b.y) > rect.top &&
      Math.min(a.y, b.y) < rect.bottom
    );
  }
  if (a.y === b.y) {
    return (
      a.y > rect.top &&
      a.y < rect.bottom &&
      Math.max(a.x, b.x) > rect.left &&
      Math.min(a.x, b.x) < rect.right
    );
  }
  return true;
}

/** Use short gutter links and separate perimeter lanes when panels share a row. */
export function routeExpandedConnection({
  from,
  to,
  fromPanel,
  toPanel,
  fromY,
  toY,
  obstacles,
  panels,
  bounds,
  lane,
  kind,
}: {
  from: Rect;
  to: Rect;
  fromPanel: Rect;
  toPanel: Rect;
  fromY: number;
  toY: number;
  obstacles: Rect[];
  panels: Rect[];
  bounds: Rect;
  lane: number;
  kind: 'runtime' | 'output' | 'borrow' | 'queue';
}): Point[] {
  // During reflow, or on a stacked display, use the general obstacle router.
  if (
    Math.abs(fromPanel.top - toPanel.top) > 1 ||
    fromPanel.right >= toPanel.left
  )
    return [];
  const nextPanel = panels
    .filter(
      (panel) =>
        panel.left > fromPanel.right && Math.abs(panel.top - fromPanel.top) <= 1
    )
    .sort((a, b) => a.left - b.left)[0];
  if (!nextPanel) return [];
  const gutter = nextPanel.left - fromPanel.right;
  if (gutter < 28) return [];
  const slot = lane % 4;
  const output = kind === 'output';
  const variant = kind === 'queue' ? 4 : kind === 'borrow' ? 2 : 0;
  const x =
    fromPanel.right +
    (output ? 3 + slot * 1.5 : gutter - 6 - slot * 6 + variant / 2);
  const start = { x: from.right, y: fromY + (output ? -8 : variant * 2) };
  const branch = { x, y: start.y };
  const clear = (points: Point[]) => {
    const path = points.filter(
      (point, index) =>
        index === 0 ||
        point.x !== points[index - 1].x ||
        point.y !== points[index - 1].y
    );
    if (
      path.some(
        (point) =>
          point.x < bounds.left ||
          point.x > bounds.right ||
          point.y < bounds.top ||
          point.y > bounds.bottom
      )
    )
      return [];
    for (let index = 1; index < path.length; index++) {
      const a = path[index - 1],
        b = path[index];
      if (obstacles.some((rect) => crossesRect(a, b, rect))) return [];
      // Only the first/last branch may pass into its own panel. Headings,
      // other cards and native memory remain obstacles even on those branches.
      if (
        panels.some((panel) => {
          const endpoint =
            index === 1
              ? fromPanel
              : index === path.length - 1
                ? toPanel
                : undefined;
          return (
            !(
              endpoint &&
              panel.left === endpoint.left &&
              panel.top === endpoint.top &&
              panel.right === endpoint.right &&
              panel.bottom === endpoint.bottom
            ) && crossesRect(a, b, panel)
          );
        })
      )
        return [];
    }
    return path;
  };
  if (!output) {
    const direct = clear([
      start,
      branch,
      { x, y: toY + 8 + variant },
      { x: to.left, y: toY + 8 + variant },
    ]);
    if (direct.length > 1) return direct;
  }
  const top =
    Math.min(fromPanel.top, toPanel.top) -
    (output ? 24 - slot * 3 : 8 + slot * 3 + variant);
  const bottom = toPanel.bottom + 8 + slot * 3 + variant;
  // The output's top-right port clears its heading. Runtime ports sit in the
  // middle of the top/bottom edge, avoiding a trip around the far side.
  const targetX = output
    ? to.right - 24 - slot * 4
    : (to.left + to.right) / 2 + variant * 2;
  const above = [
    start,
    branch,
    { x, y: top },
    { x: targetX, y: top },
    { x: targetX, y: to.top },
  ];
  const below = [
    start,
    branch,
    { x, y: bottom },
    { x: targetX, y: bottom },
    { x: targetX, y: to.bottom },
  ];
  const upperHalf =
    (to.top + to.bottom) / 2 <= (toPanel.top + toPanel.bottom) / 2;
  for (const candidate of output || upperHalf
    ? [above, below]
    : [below, above]) {
    const path = clear(candidate);
    if (path.length > 1) return path;
  }
  return [];
}

/**
 * Use only reserved rails for vertical travel; branches leave cards
 * horizontally.
 */
export function routeConnection(
  from: Rect,
  to: Rect,
  obstacles: Rect[],
  bounds: Rect,
  rails = connectionRails(obstacles, bounds, 0),
  previous: Point[] = []
): Point[] {
  let best: Point[] = [];
  let bestCost = Infinity;
  const clear = (a: Point, b: Point, attachment = false) =>
    !obstacles.some((rect) => crossesRect(a, b, rect)) &&
    ((attachment && a.y === b.y) ||
      !rails.panels.some((rect) => crossesRect(a, b, rect)));
  const consider = (points: Point[]) => {
    const path = points.filter(
      (point, index) =>
        index === 0 ||
        point.x !== points[index - 1].x ||
        point.y !== points[index - 1].y
    );
    if (
      path.some(
        (point) =>
          point.x < bounds.left ||
          point.x > bounds.right ||
          point.y < bounds.top ||
          point.y > bounds.bottom
      )
    )
      return;
    let cost = path.length * 12;
    // Small layout changes should not flip a connection to the opposite rail.
    if (previous.length > 1 && path.length > 1) {
      if (
        Math.sign(path[1].x - path[0].x) !==
        Math.sign(previous[1].x - previous[0].x)
      )
        cost += 96;
      if (
        Math.sign(path.at(-1)!.x - path.at(-2)!.x) !==
        Math.sign(previous.at(-1)!.x - previous.at(-2)!.x)
      )
        cost += 96;
    }
    for (let index = 1; index < path.length; index++) {
      const a = path[index - 1],
        b = path[index];
      // Only the short branches into their own cards may enter a panel.
      if (!clear(a, b, index === 1 || index === path.length - 1)) return;
      cost += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    if (cost < bestCost) {
      best = path;
      bestCost = cost;
    }
  };
  const attachments = (rect: Rect) => {
    const y = (rect.top + rect.bottom) / 2;
    return [rect.left, rect.right].flatMap((x) => {
      const point = { x, y };
      return rails.vertical
        .filter((rail) => clear(point, { x: rail, y }, true))
        .map((rail) => ({ point, rail: { x: rail, y } }));
    });
  };
  for (const source of attachments(from)) {
    for (const target of attachments(to)) {
      if (source.rail.x === target.rail.x || source.rail.y === target.rail.y) {
        consider([source.point, source.rail, target.rail, target.point]);
      }
      for (const y of rails.horizontal) {
        consider([
          source.point,
          source.rail,
          { x: source.rail.x, y },
          { x: target.rail.x, y },
          target.rail,
          target.point,
        ]);
      }
    }
  }
  // CPU, Memory and the phone can sit side by side in fullscreen. A middle
  // card may have no clear branch to either outside edge, so use the gutters
  // between panels while keeping every segment clear of content.
  if (best.length === 0 && rails.columnGutters?.length) {
    return routeConnection(
      from,
      to,
      obstacles,
      bounds,
      {
        ...rails,
        vertical: [...rails.vertical, ...rails.columnGutters],
        columnGutters: [],
      },
      previous
    );
  }
  return best;
}

export function roundedPath(points: Point[]): string {
  if (points.length < 2) return '';
  const point = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  let d = `M${point(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1];
    const before = Math.hypot(b.x - a.x, b.y - a.y);
    const after = Math.hypot(c.x - b.x, c.y - b.y);
    const radius = Math.min(2, before / 2, after / 2);
    const start = {
      x: b.x + ((a.x - b.x) * radius) / before,
      y: b.y + ((a.y - b.y) * radius) / before,
    };
    const end = {
      x: b.x + ((c.x - b.x) * radius) / after,
      y: b.y + ((c.y - b.y) * radius) / after,
    };
    d += ` L${point(start)} Q${point(b)} ${point(end)}`;
  }
  return `${d} L${point(points[points.length - 1])}`;
}

/** Leave room for the arrowhead when animating a pulse along a connection. */
export function shortenPathEnd(points: Point[], clearance: number): Point[] {
  const shortened = points.slice();
  while (shortened.length > 1 && clearance > 0) {
    const end = shortened.pop()!;
    const previous = shortened[shortened.length - 1];
    const length = Math.hypot(end.x - previous.x, end.y - previous.y);
    if (length > clearance) {
      shortened.push({
        x: end.x + ((previous.x - end.x) * clearance) / length,
        y: end.y + ((previous.y - end.y) * clearance) / length,
      });
      break;
    }
    clearance -= length;
  }
  return shortened;
}

/**
 * Morph matching rail bends; other routes must crossfade to avoid diagonal
 * wires.
 */
export function interpolatePath(
  from: Point[],
  to: Point[],
  progress: number
): Point[] | null {
  if (from.length !== to.length || from.length < 2) return null;
  for (let i = 1; i < from.length; i++) {
    if (
      Math.sign(from[i].x - from[i - 1].x) !==
        Math.sign(to[i].x - to[i - 1].x) ||
      Math.sign(from[i].y - from[i - 1].y) !== Math.sign(to[i].y - to[i - 1].y)
    )
      return null;
  }
  return from.map((point, i) => ({
    x: point.x + (to[i].x - point.x) * progress,
    y: point.y + (to[i].y - point.y) * progress,
  }));
}
