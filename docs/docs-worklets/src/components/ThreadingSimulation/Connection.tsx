import React, { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  interpolatePath,
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
  markerId: string;
  playing: boolean;
  tick: number;
  tickMs: number;
  reducedMotion: boolean;
}

const REFLOW_MS = 240;

export default function Connection({
  id,
  points,
  runtime,
  active,
  queued,
  exitAt,
  markerId,
  playing,
  tick,
  tickMs,
  reducedMotion,
}: Props) {
  const trackRef = useRef<SVGPathElement>(null);
  const flowRef = useRef<SVGPathElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);
  const ghostRef = useRef<SVGPathElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const drawn = useRef<Point[]>([]);
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
      track.setAttribute('d', roundedPath(next));
      flow.setAttribute('d', roundedPath(shortenPathEnd(next, 12)));
    };
    if (reducedMotion) {
      draw(to);
      group.style.opacity = '1';
      ghost.style.opacity = '0';
      return;
    }
    // A different set of bends fades between routes instead of cutting across cards.
    ghost.setAttribute('d', morph ? '' : roundedPath(from));
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / REFLOW_MS);
      const eased = 1 - (1 - progress) ** 3;
      draw(morph ? interpolatePath(from, to, eased)! : to);
      group.style.opacity = String(morph ? 1 : eased);
      ghost.style.opacity = String(morph ? 0 : 1 - eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    animate(start);
    return () => cancelAnimationFrame(frame);
  }, [path, reducedMotion]);

  // Geometry may change many times during a transfer; its clock must keep running.
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
      return;
    }
    const duration = playing
      ? Math.max(queued ? 120 : 180, Math.min(tickMs * 0.8, queued ? 650 : 800))
      : 800;
    const now = performance.now();
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
      const length = flow.getTotalLength();
      if (length > 0) {
        const distance = progress * length;
        const point = flow.getPointAtLength(distance);
        pulse.setAttribute('transform', `translate(${point.x} ${point.y})`);
        flow.setAttribute('stroke-dasharray', `20 ${length}`);
        flow.setAttribute('stroke-dashoffset', String(20 - distance));
      }
      flow.style.opacity = String(length > 0 ? opacity : 0);
      pulse.style.opacity = String(length > 0 ? opacity : 0);
      if (repeat || elapsed < 1) frame = requestAnimationFrame(animate);
    };
    animate(now);
    return () => cancelAnimationFrame(frame);
  }, [active, playing, queued, pulseKey, tickMs, reducedMotion, exitAt]);

  return (
    <g
      className={clsx(
        runtimeClass(runtime),
        active && styles.connectionActive,
        queued && styles.connectionQueued,
        exitAt !== undefined && styles.connectionExiting
      )}
      data-connection={id}>
      <path
        ref={ghostRef}
        className={clsx(styles.connectionTrack, styles.connectionGhost)}
        markerEnd={`url(#${markerId})`}
      />
      <g ref={groupRef}>
        <path
          ref={trackRef}
          className={styles.connectionTrack}
          markerEnd={`url(#${markerId})`}
        />
        <path ref={flowRef} className={styles.connectionFlow} />
        <circle ref={pulseRef} r="3" className={styles.connectionPulse} />
      </g>
    </g>
  );
}
