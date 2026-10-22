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
  horizontal: number[];
  panels: Rect[];
}

/** Four stable lanes on each outer edge; never create rails between columns. */
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
