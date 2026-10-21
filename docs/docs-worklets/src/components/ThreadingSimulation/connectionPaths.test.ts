import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  connectionRails,
  crossesRect,
  interpolatePath,
  roundedPath,
  routeConnection,
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
  it('handles missing geometry', () => assert.equal(roundedPath([]), ''));
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
