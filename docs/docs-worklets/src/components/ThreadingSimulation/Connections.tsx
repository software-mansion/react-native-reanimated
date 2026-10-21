import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Snapshot } from '@site/src/simulation';
import { connectionRails, routeConnection } from './connectionPaths';
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
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const markerId = useId().replace(/:/g, '');
  const [layout, setLayout] = useState<{
    width: number;
    height: number;
    rails: number[];
    panels: Rect[];
    wires: RoutedWire[];
  }>({ width: 0, height: 0, rails: [], panels: [], wires: [] });
  const current = useRef({ snapshot, runtimes });
  current.current = { snapshot, runtimes };
  const previous = useRef({
    tick,
    width: 0,
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
    const measure = () => {
      const { snapshot, runtimes } = current.current;
      const origin = root.getBoundingClientRect();
      const rectangle = (element: Element): Rect => {
        const r = element.getBoundingClientRect();
        return {
          left: r.left - origin.left,
          right: r.right - origin.left,
          top: r.top - origin.top,
          bottom: r.bottom - origin.top,
        };
      };
      const nodes = new Map<string, Rect>();
      const ports = new Map<string, Rect>();
      root
        .querySelectorAll<HTMLElement>('[data-sim-node]')
        .forEach((element) => {
          const rect = rectangle(element);
          const port = element.querySelector('[data-sim-port]');
          const anchor = port ? rectangle(port) : rect;
          const y = (anchor.top + anchor.bottom) / 2;
          nodes.set(element.dataset.simNode!, rect);
          ports.set(element.dataset.simNode!, { ...rect, top: y, bottom: y });
        });
      const obstacles = [
        ...nodes.values(),
        ...[...root.querySelectorAll('[data-sim-header]')].map(rectangle),
      ];
      const panels = [...root.querySelectorAll('[data-sim-panel]')].map(
        rectangle
      );
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
      const routed = wires
        .map((wire) => {
          const points = routeConnection(
            ports.get(wire.from) ?? nodes.get(wire.from)!,
            ports.get(wire.to) ?? nodes.get(wire.to)!,
            obstacles,
            bounds,
            connectionRails(
              panels,
              bounds,
              wire.runtime.kind === 'rn'
                ? 0
                : wire.runtime.kind === 'ui'
                  ? 1
                  : wire.runtime.coreIndex,
              gap
            ),
            Math.abs(previous.current.width - origin.width) < 1 &&
              tick >= previous.current.tick
              ? previous.current.wires.get(wire.id)
              : undefined
          );
          return {
            ...wire,
            points,
          };
        })
        .filter((wire) => wire.points.length > 1);
      const rewinding = tick < previous.current.tick;
      previous.current = {
        tick,
        width: origin.width,
        wires: new Map(routed.map((wire) => [wire.id, wire.points])),
      };
      setLayout((current) => ({
        width: origin.width,
        height: origin.height,
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
        rails: [
          ...new Set(
            Array.from(
              { length: 4 },
              (_, lane) => connectionRails(panels, bounds, lane, gap).vertical
            ).flat()
          ),
        ],
      }));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    root
      .querySelectorAll('[data-sim-node], [data-sim-code-panel]')
      .forEach((element) => observer.observe(element));
    root.addEventListener('scroll', schedule, true);
    measure();
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', schedule, true);
      cancelAnimationFrame(frame);
    };
  }, [snapshot, tick, codeOpen, settled]);

  return (
    <svg ref={svgRef} className={styles.connections} aria-hidden="true">
      <defs>
        <mask id={`${markerId}-rails`}>
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
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse">
          <path
            d="M1 1 L7 4 L1 7"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.5"
          />
        </marker>
      </defs>
      <g mask={`url(#${markerId}-rails)`} className={styles.railGuides}>
        {layout.rails.map((x) => (
          <line key={x} x1={x} x2={x} y1={0} y2={layout.height} />
        ))}
      </g>
      {layout.wires.map((wire) => (
        <Connection
          key={wire.id}
          {...wire}
          markerId={markerId}
          playing={playing}
          tick={tick}
          tickMs={tickMs}
          reducedMotion={reducedMotion}
        />
      ))}
    </svg>
  );
}
