import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Snapshot } from '@site/src/simulation';
import {
  connectionRails,
  routeConnection,
  routeExpandedConnection,
} from './connectionPaths';
import type { Point, Rect } from './connectionPaths';
import type { RuntimeDescriptor } from './runtimeColors';
import Connection from './Connection';
import styles from './styles.module.css';

interface Props {
  snapshot: Snapshot;
  runtimes: RuntimeDescriptor[];
  tick: number;
  tickMs: number;
  codeOpen: boolean;
  settled: boolean;
  playing: boolean;
  transitioning: boolean;
}
interface Wire {
  id: string;
  from: string;
  to: string;
  runtime: RuntimeDescriptor;
  active: boolean;
  queued?: boolean;
}
interface RoutedWire extends Wire {
  points: Point[];
  exitAt?: number;
}

const EXIT_MS = 220;

export default function Connections({
  snapshot,
  runtimes,
  tick,
  tickMs,
  codeOpen,
  settled,
  playing,
  transitioning,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const railsId = useId().replace(/:/g, '');
  const [layout, setLayout] = useState<{
    width: number;
    height: number;
    rails: number[];
    panels: Rect[];
    wires: RoutedWire[];
    moving: boolean;
  }>({ width: 0, height: 0, rails: [], panels: [], wires: [], moving: false });
  const current = useRef({ snapshot, runtimes, tick });
  current.current = { snapshot, runtimes, tick };
  const scheduleRef = useRef(() => {});
  const previous = useRef({
    tick,
    wires: new Map<string, Point[]>(),
  });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const exits = layout.wires.flatMap((wire) =>
      wire.exitAt === undefined ? [] : [wire.exitAt]
    );
    if (exits.length === 0) return;
    const timer = window.setTimeout(
      () => {
        setLayout((current) => ({
          ...current,
          wires: current.wires.filter(
            (wire) =>
              wire.exitAt === undefined || wire.exitAt > performance.now()
          ),
        }));
      },
      Math.max(0, Math.min(...exits) - performance.now())
    );
    return () => window.clearTimeout(timer);
  }, [layout.wires]);

  useLayoutEffect(() => {
    const root = svgRef.current?.parentElement;
    if (!root) return;
    let frame = 0;
    let geometryKey = '';
    const routeCache = new Map<string, Point[]>();
    const measure = () => {
      const { snapshot, runtimes, tick } = current.current;
      const origin = root.getBoundingClientRect();
      const rearranging =
        root.closest('[data-simulation-transition-phase="layout"]') !== null;
      const expanded =
        root.closest('[data-simulation-fullscreen="true"]') !== null;
      const rectangles = new Map<Element, Rect>();
      const rectangle = (element: Element): Rect => {
        const cached = rectangles.get(element);
        if (cached) return cached;
        const r = element.getBoundingClientRect();
        const rect = {
          left: r.left - origin.left,
          right: r.right - origin.left,
          top: r.top - origin.top,
          bottom: r.bottom - origin.top,
        };
        rectangles.set(element, rect);
        return rect;
      };
      const nodes = new Map<string, Rect>();
      const ports = new Map<string, Rect>();
      const nodePanels = new Map<string, Rect>();
      root
        .querySelectorAll<HTMLElement>('[data-sim-node]')
        .forEach((element) => {
          const rect = rectangle(element);
          const port = element.querySelector('[data-sim-port]');
          const anchor = port ? rectangle(port) : rect;
          const y = (anchor.top + anchor.bottom) / 2;
          // A new row grows into view; connect it once its port is visible.
          const clip = element.closest('[data-sim-layout]');
          if (clip && !rearranging) {
            const visible = rectangle(clip);
            if (y < visible.top || y > visible.bottom) return;
            rect.top = Math.max(rect.top, visible.top);
            rect.bottom = Math.min(rect.bottom, visible.bottom);
          }
          nodes.set(element.dataset.simNode!, rect);
          ports.set(element.dataset.simNode!, { ...rect, top: y, bottom: y });
          const panel = element.closest('[data-sim-panel]');
          if (panel) nodePanels.set(element.dataset.simNode!, rectangle(panel));
        });
      const obstacles = [
        ...nodes.values(),
        ...[
          ...root.querySelectorAll('[data-sim-header], [data-sim-obstacle]'),
        ].map(rectangle),
      ];
      const panels = [
        ...root.querySelectorAll('[data-sim-panel], [data-sim-obstacle]'),
      ].map(rectangle);
      const gap =
        parseFloat(getComputedStyle(root).getPropertyValue('--sim-rail-gap')) ||
        32;
      const code = root.querySelector('[data-sim-code-panel]');
      if (code) {
        const codeRect = rectangle(code);
        obstacles.push(codeRect);
        root
          .querySelectorAll<HTMLElement>('[data-sim-code]')
          .forEach((line) => {
            const r = rectangle(line);
            const viewport = line.closest('[aria-label="Example source code"]');
            const visible = viewport ? rectangle(viewport) : codeRect;
            if (r.bottom < visible.top || r.top > visible.bottom) return;
            // A short port at the panel edge aligns the connection with the active line.
            const y = Math.max(
              visible.top + 4,
              Math.min(visible.bottom - 4, (r.top + r.bottom) / 2)
            );
            line.dataset.simCode?.split(' ').forEach((id) =>
              nodes.set(`code:${id}`, {
                ...codeRect,
                ...(r.right - r.left < (codeRect.right - codeRect.left) * 0.75
                  ? {
                      left:
                        (r.left + r.right) / 2 <
                        (codeRect.left + codeRect.right) / 2
                          ? codeRect.left
                          : codeRect.right,
                      right:
                        (r.left + r.right) / 2 <
                        (codeRect.left + codeRect.right) / 2
                          ? codeRect.left
                          : codeRect.right,
                    }
                  : {}),
                top: y,
                bottom: y,
              })
            );
          });
      }
      const wires: Wire[] = [];
      const add = (wire: Wire) => {
        if (
          nodes.has(wire.from) &&
          nodes.has(wire.to) &&
          !wires.some((existing) => existing.id === wire.id)
        )
          wires.push(wire);
      };
      for (const runtime of runtimes) {
        const core = snapshot.cores.find((core) => core.id === runtime.id);
        if (!core) continue;
        add({
          id: `owns:${core.id}`,
          from: `thread:${core.id}`,
          to: `runtime:${core.id}`,
          runtime,
          active:
            core.status === 'running' && core.heldRuntimes.includes(core.id),
        });
        if (core.kind === 'ui') {
          add({
            id: 'screen:ui',
            from: 'thread:ui',
            to: 'output',
            runtime,
            active: snapshot.events.some(
              (event) => event.type === 'screen' && event.core === 'ui'
            ),
          });
        }
        if (core.line !== null)
          add({
            id: `code:${core.id}`,
            from: `code:${core.id}`,
            to: `thread:${core.id}`,
            runtime,
            active: true,
          });
        for (const held of core.heldRuntimes.filter((id) => id !== core.id)) {
          add({
            id: `borrow:${core.id}:${held}`,
            from: `thread:${core.id}`,
            to: `runtime:${held}`,
            runtime,
            active: true,
          });
        }
      }
      for (const event of snapshot.events) {
        const runtime = runtimes.find((runtime) => runtime.id === event.core);
        if (!runtime) continue;
        if (event.type === 'scheduled' && event.core !== event.target) {
          add({
            id: `queue:${event.core}:${event.target}`,
            from: `thread:${event.core}`,
            to: nodes.has(`runtime:${event.target}`)
              ? `runtime:${event.target}`
              : `thread:${event.target}`,
            runtime,
            active: true,
            queued: true,
          });
        }
        if (event.type === 'screen' && event.core !== 'ui')
          add({
            id: `screen:${event.core}`,
            from: `thread:${event.core}`,
            to: 'output',
            runtime,
            active: true,
          });
      }
      const bounds = {
        left: -8,
        top: -8,
        right: origin.width + 8,
        bottom: origin.height + 8,
      };
      // Running/idle colours and queue events change every tick. Reuse routes
      // until their geometry changes instead of solving the same paths again.
      const nextGeometryKey =
        JSON.stringify([nodes, ports].map((map) => [...map])) +
        JSON.stringify([obstacles, panels, bounds, gap, expanded]);
      if (nextGeometryKey !== geometryKey || tick < previous.current.tick) {
        geometryKey = nextGeometryKey;
        routeCache.clear();
      }
      const rails = Array.from({ length: 4 }, (_, lane) =>
        connectionRails(panels, bounds, lane, gap)
      );
      const routed = wires
        .map((wire) => {
          const lane =
            (wire.runtime.kind === 'rn'
              ? 0
              : wire.runtime.kind === 'ui'
                ? 1
                : wire.runtime.coreIndex) % 4;
          const key = wire.id;
          let points = routeCache.get(key);
          if (points === undefined) {
            const fromPanel = nodePanels.get(wire.from);
            const toPanel = nodePanels.get(wire.to);
            points =
              expanded && fromPanel && toPanel
                ? routeExpandedConnection({
                    from: nodes.get(wire.from)!,
                    to: nodes.get(wire.to)!,
                    fromPanel,
                    toPanel,
                    fromY: ports.get(wire.from)!.top,
                    toY: ports.get(wire.to)!.top,
                    obstacles,
                    panels,
                    bounds,
                    lane: wire.runtime.coreIndex,
                    kind:
                      wire.to === 'output'
                        ? 'output'
                        : wire.queued
                          ? 'queue'
                          : wire.id.startsWith('borrow:')
                            ? 'borrow'
                            : 'runtime',
                  })
                : [];
            if (points.length < 2)
              points = routeConnection(
                ports.get(wire.from) ?? nodes.get(wire.from)!,
                ports.get(wire.to) ?? nodes.get(wire.to)!,
                obstacles,
                bounds,
                rails[lane],
                tick >= previous.current.tick
                  ? previous.current.wires.get(wire.id)
                  : undefined
              );
            routeCache.set(key, points);
          }
          return {
            ...wire,
            points,
          };
        })
        .filter((wire) => wire.points.length > 1);
      const rewinding = tick < previous.current.tick;
      previous.current = {
        tick,
        wires: new Map(routed.map((wire) => [wire.id, wire.points])),
      };
      setLayout((current) => ({
        width: origin.width,
        height: origin.height,
        moving:
          root.closest('[data-simulation-fullscreen-transition]') !== null ||
          root.querySelector('[data-sim-layout-moving]') !== null,
        wires: [
          ...routed,
          ...current.wires
            .filter(
              (wire) =>
                !rewinding &&
                nodes.has(wire.from) &&
                nodes.has(wire.to) &&
                !routed.some((next) => next.id === wire.id) &&
                (wire.exitAt === undefined || wire.exitAt > performance.now())
            )
            .map((wire) => ({
              ...wire,
              exitAt: wire.exitAt ?? performance.now() + EXIT_MS,
            })),
        ],
        panels,
        rails: [...new Set(rails.flatMap((rail) => rail.vertical))],
      }));
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    scheduleRef.current = schedule;
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    root.addEventListener('scroll', schedule, true);
    const layoutRoot = root.closest('[data-simulation-fullscreen]') ?? root;
    layoutRoot.addEventListener('simulationlayout', schedule);
    schedule();
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', schedule, true);
      layoutRoot.removeEventListener('simulationlayout', schedule);
      cancelAnimationFrame(frame);
      scheduleRef.current = () => {};
    };
  }, []);

  // Keep observers and routing caches alive across ticks. Merge playback,
  // resizing and nested-grid notifications into one update per frame.
  useLayoutEffect(
    () => scheduleRef.current(),
    [snapshot, tick, codeOpen, settled]
  );

  return (
    <svg ref={svgRef} className={styles.connections} aria-hidden="true">
      <defs>
        <mask id={`${railsId}-rails`}>
          <rect
            x="-8"
            y="-8"
            width={layout.width + 16}
            height={layout.height + 16}
            fill="white"
          />
          {layout.panels.map((panel, index) => (
            <rect
              key={index}
              x={panel.left - 2}
              y={panel.top - 2}
              width={panel.right - panel.left + 4}
              height={panel.bottom - panel.top + 4}
              fill="black"
            />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${railsId}-rails)`} className={styles.railGuides}>
        {layout.rails.map((x) => (
          <line key={x} x1={x} x2={x} y1={0} y2={layout.height} />
        ))}
      </g>
      {layout.wires.map((wire) => (
        <Connection
          key={wire.id}
          {...wire}
          playing={playing}
          tick={tick}
          tickMs={tickMs}
          reducedMotion={reducedMotion}
          followingLayout={transitioning || layout.moving}
        />
      ))}
    </svg>
  );
}
