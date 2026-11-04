import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';
import SelectionBox, { DraggableId } from './SelectionBox';
import {
  DynamicStyles,
  SelectionBounds,
  StaticStyles,
  TextScaleStyles,
  clampMovementDelta,
  computeSelectionStyles,
  computeTextStyles,
} from './utils';
import { LabelFx, createLetterFx } from './effects';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';

type Vector = { x: number; y: number };
type PointerSample = { time: number; x: number; y: number };

// Velocity is tracked in px/ms. Friction is the share of velocity kept per
// 60 Hz frame, so moving glides further than resizing.
const MOVE_FRICTION = 0.95;
const RESIZE_FRICTION = 0.88;
const EDGE_BOUNCE = 0.45;
const REST_SPEED = 0.015;
const MAX_SPEED = 4;

// Pointer velocity is the travel over the last VELOCITY_WINDOW ms, like a
// fling tracker. No pointer event for STOPPED_AFTER ms means it stopped.
const VELOCITY_WINDOW = 80;
const STOPPED_AFTER = 50;

const estimateVelocity = (samples: PointerSample[], now: number): Vector => {
  const first = samples[0];
  const last = samples[samples.length - 1];
  const span = last ? last.time - first.time : 0;
  if (span <= 0 || now - last.time > STOPPED_AFTER) return { x: 0, y: 0 };
  return { x: (last.x - first.x) / span, y: (last.y - first.y) / span };
};

const clampSpeed = (value: number) =>
  Math.max(-MAX_SPEED, Math.min(MAX_SPEED, value));

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SelectedLabel: React.FC<{
  children: React.ReactNode;
  isInteractive: boolean;
}> = ({ children, isInteractive = false }) => {
  // DOM refs
  const selectionRef = useRef<HTMLSpanElement | null>(null);
  const selectionContainerRef = useRef<HTMLDivElement | null>(null);
  const textLabelRef = useRef<HTMLSpanElement | null>(null);
  const fxLayerRef = useRef<HTMLSpanElement | null>(null);

  // Render-persistent label positioning styles
  const dynamicStyles = useRef<DynamicStyles>({
    top: 0,
    left: 0,
    width: null,
    height: null,
  });

  const staticStyles = useRef<StaticStyles>({
    initialWidth: null,
    initialHeight: null,
  });

  // Motion state, kept outside React so every frame writes straight to the DOM
  const velocity = useRef<Vector>({ x: 0, y: 0 });
  const textScale = useRef<Vector>({ x: 1, y: 1 });
  // Label travel since the grab, sampled at every pointer event.
  const travel = useRef<Vector>({ x: 0, y: 0 });
  const samples = useRef<PointerSample[]>([]);
  const activeDraggable = useRef<DraggableId | null>(null);
  const isDragging = useRef(false);
  const frame = useRef<number | null>(null);
  const fx = useRef<LabelFx | null>(null);

  const text = typeof children === 'string' ? children : '';

  const applyDynamicStyles = (newDynamicStyles: DynamicStyles) => {
    const currentDynamicStyles = dynamicStyles.current;

    // save changes
    currentDynamicStyles.top = newDynamicStyles.top;
    currentDynamicStyles.left = newDynamicStyles.left;
    currentDynamicStyles.width = newDynamicStyles.width;
    currentDynamicStyles.height = newDynamicStyles.height;

    // apply changes to refs
    selectionRef.current.style.transform = `translate(${currentDynamicStyles.left}px, ${currentDynamicStyles.top}px)`;
    selectionContainerRef.current.style.width = `${currentDynamicStyles.width}px`;
    selectionContainerRef.current.style.height = `${currentDynamicStyles.height}px`;
  };

  const applyTextScale = (scaleObject: TextScaleStyles) => {
    textScale.current = scaleObject;
    textLabelRef.current.style.transform = `translate(-50%, -50%) scale(${scaleObject.x}, ${scaleObject.y})`;
  };

  useEffect(() => {
    if (!isInteractive) return;

    let rect = selectionContainerRef.current.getBoundingClientRect();
    staticStyles.current = {
      initialWidth: rect.width,
      initialHeight: rect.height,
    };

    applyDynamicStyles({
      top: 0,
      left: 0,
      width: rect.width,
      height: rect.height,
    });

    textLabelRef.current.className = clsx(styles.interactiveHeaderText);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [isInteractive]);

  useEffect(() => {
    fx.current = createLetterFx([
      ...fxLayerRef.current.querySelectorAll<HTMLElement>('[data-letter]'),
    ]);
  }, []);

  const getSelectionBounds = (): SelectionBounds => {
    const container = selectionContainerRef.current;
    const label = textLabelRef.current;
    // Effects move the letters and the layer around; only the label box itself
    // counts towards the bounds.
    const entries = [container, ...container.querySelectorAll('*')]
      .filter((element) => element === label || !label.contains(element))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }));
    const frameEntries = entries.filter((entry) => entry.element !== label);

    return {
      left: Math.min(...entries.map((entry) => entry.rect.left)),
      top: Math.min(...frameEntries.map((entry) => entry.rect.top)),
      right: Math.max(...entries.map((entry) => entry.rect.right)),
      bottom: Math.max(...frameEntries.map((entry) => entry.rect.bottom)),
    };
  };

  // Moves or resizes the selection and returns the delta that was applied
  // after clamping it to the viewport width and the hero's height. The hero
  // scrolls together with the label, so scrolling never creates a new wall.
  const applyMovement = (
    movementDelta: Vector,
    draggableIdentifier: DraggableId
  ): Vector => {
    const bounds = getSelectionBounds();
    const hero = selectionRef.current
      .closest('section')
      ?.getBoundingClientRect();
    const top = hero?.top ?? 0;
    // The hero can be taller than the screen (min-height: 70vw); the floor is
    // the bottom of the first screen.
    const viewportHeight = document.documentElement.clientHeight;
    const firstScreen = viewportHeight - (top + window.scrollY);
    const clampedDelta = clampMovementDelta(
      movementDelta,
      draggableIdentifier,
      { ...bounds, top: bounds.top - top, bottom: bounds.bottom - top },
      {
        width: document.documentElement.clientWidth,
        height: hero ? Math.min(hero.height, firstScreen) : viewportHeight,
      }
    );

    applyDynamicStyles(
      computeSelectionStyles(
        clampedDelta,
        draggableIdentifier,
        dynamicStyles.current
      )
    );
    applyTextScale(
      computeTextStyles(dynamicStyles.current, staticStyles.current)
    );

    return clampedDelta;
  };

  const stopFrameLoop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  // One loop drives everything: the glide after release and the effect, which
  // keeps animating after the label itself has come to rest.
  const startFrameLoop = () => {
    stopFrameLoop();
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - previous, 48);
      previous = now;
      const v = velocity.current;
      const id = activeDraggable.current;

      if (isDragging.current) {
        const tracked = estimateVelocity(samples.current, now);
        v.x = clampSpeed(tracked.x);
        v.y = clampSpeed(tracked.y);
      } else if (id !== null && Math.hypot(v.x, v.y) >= REST_SPEED) {
        const friction = Math.pow(
          id === DraggableId.CENTER ? MOVE_FRICTION : RESIZE_FRICTION,
          dt / 16.67
        );
        v.x *= friction;
        v.y *= friction;

        const wanted = { x: v.x * dt, y: v.y * dt };
        const applied = applyMovement(wanted, id);

        // Hitting a viewport edge swallows part of the delta: bounce back.
        if (Math.abs(applied.x - wanted.x) > 0.5) {
          fx.current?.bounce('x', { ...v });
          v.x *= -EDGE_BOUNCE;
        }
        if (Math.abs(applied.y - wanted.y) > 0.5) {
          fx.current?.bounce('y', { ...v });
          v.y *= -EDGE_BOUNCE;
        }
      } else {
        v.x = 0;
        v.y = 0;
      }

      const box = dynamicStyles.current;
      const fxActive =
        fx.current?.frame({
          dt: dt / 1000,
          velocity: v,
          center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
          scale: textScale.current,
        }) ?? false;

      const resting = Math.hypot(v.x, v.y) < REST_SPEED;
      if (!isDragging.current && resting && !fxActive) {
        selectionRef.current?.removeAttribute('data-active');
        frame.current = null;
        return;
      }

      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
  };

  const movementPropagator = (
    movementDelta: Vector,
    draggableIdentifier: DraggableId
  ) => {
    if (!isInteractive) return;

    const applied = applyMovement(movementDelta, draggableIdentifier);

    // Only what was applied counts, so pushing against a wall throws nothing.
    const now = performance.now();
    travel.current.x += applied.x;
    travel.current.y += applied.y;
    samples.current = samples.current.filter(
      (sample) => now - sample.time <= VELOCITY_WINDOW
    );
    samples.current.push({ time: now, ...travel.current });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!isInteractive) return;
    activeDraggable.current = Number(event.active.id) as DraggableId;
    isDragging.current = true;
    velocity.current = { x: 0, y: 0 };
    travel.current = { x: 0, y: 0 };
    samples.current = [{ time: performance.now(), x: 0, y: 0 }];
    selectionRef.current.setAttribute('data-active', 'true');

    if (prefersReducedMotion()) return;
    fx.current?.grab();
    startFrameLoop();
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    isDragging.current = false;

    // A pointer that had stopped before the release throws nothing.
    const thrown = estimateVelocity(samples.current, performance.now());
    velocity.current = prefersReducedMotion()
      ? { x: 0, y: 0 }
      : { x: clampSpeed(thrown.x), y: clampSpeed(thrown.y) };

    if (prefersReducedMotion()) {
      stopFrameLoop();
      selectionRef.current.removeAttribute('data-active');
      return;
    }

    if (frame.current === null) startFrameLoop();
  };

  return (
    <span ref={selectionRef} className={styles.selection}>
      <DndContext
        autoScroll={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragEnd}>
        <div ref={selectionContainerRef} className={styles.selectionContainer}>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.TOP_LEFT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.TOP_RIGHT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.BOTTOM_LEFT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.BOTTOM_RIGHT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.CENTER}
            isInteractive={isInteractive}>
            <span ref={textLabelRef} className={styles.headerText}>
              <span ref={fxLayerRef} className={styles.fxLayer}>
                {text
                  ? [...text].map((letter, idx) => (
                      <span key={idx} data-letter className={styles.letter}>
                        {letter}
                      </span>
                    ))
                  : children}
              </span>
            </span>
          </SelectionBox>
        </div>
      </DndContext>
    </span>
  );
};

export default SelectedLabel;
