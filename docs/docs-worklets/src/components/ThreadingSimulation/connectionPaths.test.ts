import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  connectionRails,
  crossesRect,
  interpolatePath,
  measurePath,
  roundedPath,
  routeConnection,
  routeExpandedConnection,
  shortenPathEnd,
} from './connectionPaths';
import type { Rect } from './connectionPaths';

const bounds = { left: -8, top: -8, right: 700, bottom: 1000 };
const rect = (left: number, top: number, width = 180, height = 88): Rect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('pulse path sampling', () => {
  it('travels around bends at a constant distance and clamps to the endpoints', () => {
    const path = measurePath([
      { x: 40, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 40 },
    ]);
    assert.equal(path.length, 70);
    assert.deepEqual(path.pointAt(20), { x: 20, y: 10 });
    assert.deepEqual(path.pointAt(55), { x: 0, y: 25 });
    assert.deepEqual(path.pointAt(-10), { x: 40, y: 10 });
    assert.deepEqual(path.pointAt(100), { x: 0, y: 40 });
  });
  it('handles empty paths and duplicate vertices without invalid coordinates', () => {
    assert.equal(measurePath([]).length, 0);
    const path = measurePath([
      { x: 2, y: 3 },
      { x: 2, y: 3 },
      { x: 12, y: 3 },
    ]);
    assert.equal(path.length, 10);
    assert.deepEqual(path.pointAt(5), { x: 7, y: 3 });
    assert.deepEqual(measurePath([{ x: 2, y: 3 }]).pointAt(5), { x: 2, y: 3 });
  });
});

describe('pulse arrowhead clearance', () => {
  it('stops short of the arrowhead in either direction without changing the wire', () => {
    for (const direction of [-1, 1]) {
      const points = [
        { x: 0, y: 0 },
        { x: direction * 40, y: 0 },
      ];
      assert.deepEqual(shortenPathEnd(points, 12), [
        { x: 0, y: 0 },
        { x: direction * 28, y: 0 },
      ]);
      assert.equal(points[1].x, direction * 40);
    }
  });
  it('keeps clearance when the final branch is shorter than the pulse gap', () => {
    assert.deepEqual(
      shortenPathEnd(
        [
          { x: 0, y: 0 },
          { x: 0, y: 40 },
          { x: 5, y: 40 },
        ],
        12
      ),
      [
        { x: 0, y: 0 },
        { x: 0, y: 33 },
      ]
    );
  });
  it('omits pulses on routes too short to leave an arrowhead gap', () => {
    assert.equal(
      roundedPath(
        shortenPathEnd(
          [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
          12
        )
      ),
      ''
    );
    assert.equal(roundedPath(shortenPathEnd([], 12)), '');
  });
});
const onEdge = (p: { x: number; y: number }, r: Rect) =>
  ((p.x === r.left || p.x === r.right) && p.y >= r.top && p.y <= r.bottom) ||
  ((p.y === r.top || p.y === r.bottom) && p.x >= r.left && p.x <= r.right);

describe('responsive connection routing', () => {
  const cases = [
    {
      name: 'horizontal cards',
      from: rect(20, 20),
      to: rect(250, 20),
      extra: [],
    },
    {
      name: 'vertical cards',
      from: rect(20, 20),
      to: rect(20, 240),
      extra: [],
    },
    {
      name: 'an intervening card',
      from: rect(20, 20),
      to: rect(20, 400),
      extra: [rect(20, 180)],
    },
    {
      name: 'a dense two-column grid',
      from: rect(20, 20),
      to: rect(220, 400),
      extra: [rect(220, 20), rect(20, 180), rect(220, 180), rect(20, 400)],
    },
    {
      name: 'a full-width panel heading',
      from: rect(20, 20),
      to: rect(20, 240),
      extra: [rect(10, 180, 400, 48)],
    },
    {
      name: 'a code line port at the panel edge',
      from: rect(20, 100, 300, 0),
      to: rect(20, 700),
      extra: [rect(20, 20, 300, 576)],
    },
  ];
  for (const { name, from, to, extra } of cases) {
    it(`connects ${name} without crossing content`, () => {
      const obstacles = [from, to, ...extra];
      const rails = connectionRails(obstacles, bounds, 0);
      const path = routeConnection(from, to, obstacles, bounds, rails);
      assert.ok(path.length >= 2, 'a route exists');
      assert.ok(onEdge(path[0], from));
      assert.ok(onEdge(path.at(-1)!, to));
      for (let i = 1; i < path.length; i++) {
        if (path[i].x === path[i - 1].x)
          assert.ok(
            rails.vertical.includes(path[i].x),
            'vertical travel stays on a reserved rail'
          );
        assert.ok(path[i].x === path[i - 1].x || path[i].y === path[i - 1].y);
        assert.ok(
          obstacles.every((r) => !crossesRect(path[i - 1], path[i], r))
        );
      }
      assert.ok(!/NaN|Infinity/.test(roundedPath(path)));
    });
  }
  it('returns no connection when a target is completely enclosed', () => {
    const from = rect(20, 20),
      to = rect(300, 300);
    assert.deepEqual(
      routeConnection(from, to, [from, to, rect(290, 290, 210, 110)], bounds),
      []
    );
  });
  it('keeps every lane outside the content, including a phone beside the runtimes', () => {
    for (const width of [330, 700, 1200]) {
      const layoutBounds = { left: 0, top: 0, right: width, bottom: 1000 };
      const panels = [
        rect(28, 16, width - 56, 200),
        rect(28, 248, width - 56, 120),
        rect(28, 400, (width - 88) / 2, 400),
        rect((width + 32) / 2, 400, (width - 88) / 2, 350),
      ];
      for (let lane = 0; lane < 4; lane++) {
        const rails = connectionRails(panels, layoutBounds, lane);
        assert.equal(rails.vertical.length, 2);
        assert.ok(rails.vertical[0] > 0 && rails.vertical[0] < 28);
        assert.ok(rails.vertical[1] > width - 28 && rails.vertical[1] < width);
      }
    }
  });
  it('connects all phone-example cards using only the outer gutters', () => {
    const panels = [
      rect(28, 16, 644, 160),
      rect(28, 208, 644, 140),
      rect(28, 380, 394, 550),
      rect(454, 380, 218, 400),
    ];
    const nodes = [
      rect(44, 255, 290, 72),
      rect(366, 255, 290, 72),
      rect(44, 427, 362, 148),
      rect(44, 589, 362, 148),
      panels[3],
    ];
    const rails = connectionRails(panels, bounds, 1);
    for (const [source, target] of [
      [0, 2],
      [1, 3],
      [1, 4],
      [0, 4],
    ]) {
      const path = routeConnection(
        nodes[source],
        nodes[target],
        nodes,
        bounds,
        rails
      );
      assert.ok(path.length > 1, `route ${source} → ${target} exists`);
      for (let i = 1; i < path.length; i++) {
        if (path[i].x === path[i - 1].x) {
          assert.ok(path[i].x < 28 || path[i].x > 672);
        }
        if (i > 1 && i < path.length - 1) {
          assert.ok(
            panels.every((panel) => !crossesRect(path[i - 1], path[i], panel))
          );
        }
      }
    }
  });
  it('handles missing geometry', () => assert.equal(roundedPath([]), ''));
  it('connects middle runtime cards between CPU and phone panels in fullscreen', () => {
    const layoutBounds = { left: 0, top: 0, right: 1280, bottom: 700 };
    const panels = [
      rect(28, 16, 220, 550),
      rect(280, 16, 700, 550),
      rect(1012, 16, 218, 550),
    ];
    const cores = [0, 1, 2, 3].map((index) => rect(44, 64 + index * 110, 188));
    const runtimes = [
      rect(296, 64, 327, 180),
      rect(637, 64, 327, 180),
      rect(296, 258, 327, 180),
      rect(637, 258, 327, 180),
    ];
    const nodes = [...cores, ...runtimes, panels[2]];
    for (let lane = 0; lane < 4; lane++) {
      const rails = connectionRails(panels, layoutBounds, lane);
      for (const target of [...runtimes, panels[2]]) {
        const port = (node: Rect) => ({ ...node, bottom: node.top + 24 });
        const path = routeConnection(
          port(cores[lane]),
          port(target),
          nodes,
          layoutBounds,
          rails
        );
        assert.ok(
          path.length > 1,
          'every runtime and the phone remain reachable'
        );
        for (let i = 1; i < path.length; i++) {
          assert.ok(
            nodes.every((node) => !crossesRect(path[i - 1], path[i], node))
          );
          if (i > 1 && i < path.length - 1) {
            assert.ok(
              panels.every((panel) => !crossesRect(path[i - 1], path[i], panel))
            );
          }
        }
      }
    }
  });
  it('keeps different threads on separate reserved lanes', () => {
    const from = rect(20, 20),
      to = rect(20, 400);
    const obstacles = [from, to, rect(20, 180)];
    const first = routeConnection(
      from,
      to,
      obstacles,
      bounds,
      connectionRails(obstacles, bounds, 0)
    );
    const next = routeConnection(
      from,
      to,
      obstacles,
      bounds,
      connectionRails(obstacles, bounds, 1)
    );
    assert.ok(next.length >= 2);
    assert.notDeepEqual(first, next);
  });
  it('keeps an existing side when a small change would otherwise flip rails', () => {
    const from = rect(80, 20),
      to = rect(80, 240);
    const obstacles = [from, to];
    const rails = connectionRails(obstacles, bounds, 0);
    const previous = [
      { x: from.right, y: 64 },
      { x: rails.vertical[1], y: 64 },
      { x: rails.vertical[1], y: 284 },
      { x: to.right, y: 284 },
    ];
    const path = routeConnection(from, to, obstacles, bounds, rails, previous);
    assert.equal(path[0].x, from.right);
    assert.equal(path.at(-1)!.x, to.right);
    assert.ok(
      path.every(
        (point, i) =>
          i === 0 || obstacles.every((r) => !crossesRect(path[i - 1], point, r))
      )
    );
  });
  it('can leave an old rail when that side becomes blocked', () => {
    const from = rect(80, 20),
      to = rect(80, 240);
    const previous = [
      { x: 80, y: 64 },
      { x: 50, y: 64 },
      { x: 50, y: 284 },
      { x: 80, y: 284 },
    ];
    const obstacles = [from, to, rect(0, 0, 80, 400)];
    const path = routeConnection(
      from,
      to,
      obstacles,
      bounds,
      connectionRails([from, to], bounds, 0),
      previous
    );
    assert.ok(path.length > 1);
    assert.equal(path[0].x, from.right);
    assert.equal(path.at(-1)!.x, to.right);
  });
});

describe('expanded connection lanes', () => {
  const fixture = (width: number) => {
    const panels = [
      rect(28, 16, 220, 500),
      rect(280, 16, width - 558, 450),
      rect(width - 246, 16, 218, 500),
    ];
    const cores = [0, 1, 2, 3].map((index) =>
      rect(44, 74 + index * 105, 188, 90)
    );
    const cardWidth = (panels[1].right - panels[1].left - 50) / 2;
    const runtimes = [
      rect(296, 74, cardWidth, 174),
      rect(310 + cardWidth, 74, cardWidth, 174),
      rect(296, 262, cardWidth, 174),
      rect(310 + cardWidth, 262, cardWidth, 174),
    ];
    const output = rect(panels[2].left, 54, 218, 462);
    const obstacles = [
      ...cores,
      ...runtimes,
      output,
      ...panels.map((panel) => rect(panel.left, panel.top, 146, 38)),
    ];
    const layoutBounds = { left: -8, top: -8, right: width + 8, bottom: 540 };
    const route = (
      core: number,
      target: Rect,
      kind: 'runtime' | 'output' = 'runtime',
      blocked = obstacles
    ) =>
      routeExpandedConnection({
        from: cores[core],
        to: target,
        fromPanel: panels[0],
        toPanel: panels[kind === 'output' ? 2 : 1],
        fromY: cores[core].top + 22,
        toY: target.top + 22,
        obstacles: blocked,
        panels,
        bounds: layoutBounds,
        lane: core,
        kind,
      });
    return { panels, cores, runtimes, output, obstacles, route };
  };
  for (const width of [1200, 1600, 2000]) {
    it(`uses clear, separate lanes at ${width}px without sharing wire segments`, () => {
      const { cores, runtimes, output, obstacles, route } = fixture(width);
      const targets = [
        runtimes[1],
        runtimes[0],
        runtimes[2],
        runtimes[3],
        output,
      ];
      const paths = targets.map((target, index) =>
        route(index % 4, target, index === 4 ? 'output' : 'runtime')
      );
      paths.forEach((path, index) => {
        assert.ok(path.length > 1, `route ${index} exists`);
        assert.ok(onEdge(path[0], cores[index % 4]));
        assert.ok(onEdge(path.at(-1)!, targets[index]));
        for (let i = 1; i < path.length; i++) {
          assert.ok(
            obstacles.every(
              (obstacle) => !crossesRect(path[i - 1], path[i], obstacle)
            ),
            `route ${index} clears cards and headings`
          );
        }
      });
      assert.equal(paths[0].at(-1)!.y, runtimes[1].top, 'UI enters from above');
      assert.equal(
        paths[3].at(-1)!.y,
        runtimes[3].bottom,
        'markdown enters from below'
      );
      for (const index of [1, 2]) {
        assert.equal(
          paths[index].at(-1)!.x,
          targets[index].left,
          'nearby runtime uses its left port'
        );
        assert.equal(
          paths[index].length,
          4,
          'nearby runtime has no perimeter detour'
        );
      }
      const segments = paths.map((path) =>
        path.slice(1).map((b, i) => [path[i], b])
      );
      for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
          for (const [a, b] of segments[i]) {
            for (const [c, d] of segments[j]) {
              const horizontal =
                a.y === b.y &&
                c.y === d.y &&
                a.y === c.y &&
                Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) >
                  Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
              const vertical =
                a.x === b.x &&
                c.x === d.x &&
                a.x === c.x &&
                Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) >
                  Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
              assert.ok(
                !horizontal && !vertical,
                `routes ${i} and ${j} do not overlap`
              );
            }
          }
        }
      }
    });
  }
  it('yields to obstacle routing when neither perimeter entry is clear', () => {
    const { runtimes, obstacles, route } = fixture(1200);
    const target = runtimes[1];
    assert.deepEqual(
      route(0, target, 'runtime', [
        ...obstacles,
        rect(
          target.left - 4,
          target.top - 4,
          target.right - target.left + 8,
          target.bottom - target.top + 8
        ),
      ]),
      []
    );
  });
  it('leaves stacked panels to the responsive router', () => {
    const fromPanel = rect(28, 16, 644, 220),
      toPanel = rect(28, 268, 644, 450);
    const from = rect(44, 74),
      to = rect(44, 326);
    assert.deepEqual(
      routeExpandedConnection({
        from,
        to,
        fromPanel,
        toPanel,
        fromY: 96,
        toY: 348,
        obstacles: [from, to],
        panels: [fromPanel, toPanel],
        bounds,
        lane: 0,
        kind: 'runtime',
      }),
      []
    );
  });
});

describe('connection layout transitions', () => {
  it('keeps matching bends orthogonal throughout a resize', () => {
    const from = [
      { x: 80, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 100 },
      { x: 80, y: 100 },
    ];
    const to = [
      { x: 120, y: 30 },
      { x: 60, y: 30 },
      { x: 60, y: 200 },
      { x: 120, y: 200 },
    ];
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const points = interpolatePath(from, to, progress)!;
      assert.equal(points[0].y, points[1].y);
      assert.equal(points[1].x, points[2].x);
      assert.equal(points[2].y, points[3].y);
    }
    assert.deepEqual(interpolatePath(from, to, 0), from);
    assert.deepEqual(interpolatePath(from, to, 1), to);
  });
  it('crossfades when switching sides or adding bends', () => {
    const from = [
      { x: 80, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 100 },
      { x: 80, y: 100 },
    ];
    const opposite = [
      { x: 80, y: 20 },
      { x: 120, y: 20 },
      { x: 120, y: 100 },
      { x: 80, y: 100 },
    ];
    assert.equal(interpolatePath(from, opposite, 0.5), null);
    assert.equal(interpolatePath(from, from.slice(1), 0.5), null);
    assert.equal(interpolatePath([], from, 0.5), null);
  });
});
