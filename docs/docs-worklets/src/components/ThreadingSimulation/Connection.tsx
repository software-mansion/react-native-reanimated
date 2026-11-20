import React, { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  interpolatePath,
  measurePath,
  roundedPath,
  shortenPathEnd,
} from './connectionPaths';
import type { Point } from './connectionPaths';
import { runtimeClass } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';
import styles from './styles.module.css';

interface Props {
  id: string;
  points: Point[];
  runtime: RuntimeDescriptor;
  active: boolean;
  queued?: boolean;
  exitAt?: number;
  playing: boolean;
  tick: number;
  tickMs: number;
  reducedMotion: boolean;
  followingLayout: boolean;
}

const REFLOW_MS = 240;

export default function Connection({
  id,
  points,
  runtime,
  active,
  queued,
  exitAt,
  playing,
  tick,
  tickMs,
  reducedMotion,
  followingLayout,
}: Props) {
  const trackRef = useRef<SVGPathElement>(null);
  const flowRef = useRef<SVGPathElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);
  const ghostRef = useRef<SVGPathElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const drawn = useRef<Point[]>([]);
  const fade = useRef<{ start: number; opacity: number } | null>(null);
  const pulsePath = useRef(measurePath([]));
  const suspendedAt = useRef<number | null>(null);
  const target = useRef(points);
  target.current = points;
  const path = roundedPath(points);
  const clock = useRef<{
    key: string | number;
    start: number;
    duration: number;
  } | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current!;
    const flow = flowRef.current!;
    const ghost = ghostRef.current!;
    const group = groupRef.current!;
    const from = drawn.current;
    const to = target.current;
    const morph = interpolatePath(from, to, 0) !== null;
    let frame = 0;
    const draw = (next: Point[]) => {
      drawn.current = next;
      const shortened = shortenPathEnd(next, 12);
      pulsePath.current = measurePath(shortened);
      track.setAttribute('d', roundedPath(next));
      flow.setAttribute('d', roundedPath(shortened));
      flow.setAttribute('stroke-dasharray', `20 ${pulsePath.current.length}`);
    };
    if (reducedMotion) {
      draw(to);
      group.style.opacity = '1';
      ghost.style.opacity = '0';
      fade.current = null;
      return;
    }
    const start = performance.now();
    // Follow moving ports directly, but crossfade when a breakpoint forces a
    // different route. Keep the fade clock across geometry updates so resizing
    // every frame cannot reset it or make the new route flash at full opacity.
    if (!morph) {
      const opacity = Number(group.style.opacity || 1);
      if (fade.current === null || opacity >= 0.5) {
        ghost.setAttribute('d', roundedPath(from));
        fade.current = { start, opacity: from.length > 1 ? opacity : 0 };
      }
    }
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / REFLOW_MS);
      const eased = 1 - (1 - progress) ** 3;
      draw(morph && !followingLayout ? interpolatePath(from, to, eased)! : to);
      const fading = fade.current;
      const visibility = fading
        ? 1 - (1 - Math.min(1, (now - fading.start) / REFLOW_MS)) ** 3
        : 1;
      group.style.opacity = String(visibility);
      ghost.style.opacity = String((fading?.opacity ?? 0) * (1 - visibility));
      if (visibility === 1) fade.current = null;
      if (fade.current || (morph && !followingLayout && progress < 1))
        frame = requestAnimationFrame(animate);
    };
    animate(start);
    return () => cancelAnimationFrame(frame);
  }, [path, reducedMotion, followingLayout]);

  // Geometry changes must not restart transfers. Suspend their clock while
  // panels move, then resume at the same progress on the settled route.
  const pulseKey =
    exitAt !== undefined
      ? (clock.current?.key ?? tick)
      : playing && !queued
        ? 'playing'
        : tick;
  useLayoutEffect(() => {
    const flow = flowRef.current!;
    const pulse = pulseRef.current!;
    let frame = 0;
    if (!active || reducedMotion) {
      flow.style.opacity = '0';
      pulse.style.opacity = '0';
      clock.current = null;
      suspendedAt.current = null;
      return;
    }
    if (followingLayout) {
      flow.style.opacity = '0';
      pulse.style.opacity = '0';
      suspendedAt.current ??= performance.now();
      return;
    }
    const duration = playing
      ? Math.max(queued ? 120 : 180, Math.min(tickMs * 0.8, queued ? 650 : 800))
      : 800;
    const now = performance.now();
    if (suspendedAt.current !== null) {
      if (clock.current) clock.current.start += now - suspendedAt.current;
      suspendedAt.current = null;
    }
    if (clock.current === null || clock.current.key !== pulseKey) {
      clock.current = { key: pulseKey, start: now, duration };
    } else if (clock.current.duration !== duration) {
      clock.current.start =
        now - ((now - clock.current.start) / clock.current.duration) * duration;
      clock.current.duration = duration;
    }
    const start = clock.current.start;
    const repeat = playing && !queued;
    const animate = (time: number) => {
      const elapsed = (time - start) / duration;
      const progress = repeat ? elapsed % 1 : Math.min(1, elapsed);
      const opacity = Math.min(1, progress / 0.1, (1 - progress) / 0.2);
      const { length, pointAt } = pulsePath.current;
      if (length > 0) {
        const distance = progress * length;
        const point = pointAt(distance);
        pulse.setAttribute('transform', `translate(${point.x} ${point.y})`);
        flow.setAttribute('stroke-dashoffset', String(20 - distance));
      }
      flow.style.opacity = String(length > 0 ? opacity : 0);
      pulse.style.opacity = String(length > 0 ? opacity : 0);
      if (repeat || elapsed < 1) frame = requestAnimationFrame(animate);
    };
    animate(now);
    return () => cancelAnimationFrame(frame);
  }, [
    active,
    playing,
    queued,
    pulseKey,
    tickMs,
    reducedMotion,
    exitAt,
    followingLayout,
  ]);

  return (
    <g
      className={clsx(
        styles.connection,
        runtimeClass(runtime),
        active && styles.connectionActive,
        queued && styles.connectionQueued,
        exitAt !== undefined && styles.connectionExiting
      )}
      data-connection={id}>
      <path
        ref={ghostRef}
        className={clsx(styles.connectionTrack, styles.connectionGhost)}
      />
      <g ref={groupRef}>
        <path ref={trackRef} className={styles.connectionTrack} />
        <path ref={flowRef} className={styles.connectionFlow} />
        <circle ref={pulseRef} r="3" className={styles.connectionPulse} />
      </g>
    </g>
  );
}
