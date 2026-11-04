import React, { Children, useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

const DURATION = 360;
const OPTIONS: KeyframeAnimationOptions = {
  duration: DURATION,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Animate the grid's occupied space as well as its cards, without remounting
 * them.
 */
export default function AnimatedGrid({
  className,
  itemSelector,
  layoutKey,
  animateResize = false,
  resizeItems = false,
  children,
}: {
  className: string;
  itemSelector?: string;
  layoutKey?: string;
  animateResize?: boolean;
  resizeItems?: boolean;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const updateRef = useRef<() => void>(() => {});
  const items = Children.toArray(children);
  const keys = useRef<string[]>([]);
  keys.current = items.map((child, index) =>
    React.isValidElement(child) ? String(child.key ?? index) : String(index)
  );
  const structure = layoutKey ?? keys.current.join('\0');

  useLayoutEffect(() => {
    const outer = outerRef.current!;
    const grid = gridRef.current!;
    const container = outer.closest<HTMLElement>(
      '[data-simulation-fullscreen]'
    );
    const nested = outer.parentElement?.closest('[data-sim-layout]') !== null;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let previous = new Map<string, Box>();
    let opacity = new Map<string, number>();
    let targets = new Map<string, Box>();
    let height = grid.offsetHeight;
    let targetHeight = height;
    let width = grid.clientWidth;
    let initialized = false;
    let animations: Animation[] = [];
    let frame = 0;
    let resizeFrame = 0;
    let prepared = false;
    let screenBoxes = new Map<string, DOMRect>();
    let screenHeight = 0;

    const elements = () =>
      Array.from(
        itemSelector ? grid.querySelectorAll(itemSelector) : grid.children,
        (child, index) => ({
          key: child.getAttribute('data-sim-layout-key') ?? keys.current[index],
          element: child as HTMLElement,
        })
      );
    const capture = () => {
      const origin = grid.getBoundingClientRect();
      // Nested grids inherit the panel's FLIP scale. Store their own local
      // coordinates so the next animation does not apply that scale twice.
      const scaleX = grid.offsetWidth > 0 ? origin.width / grid.offsetWidth : 1;
      const scaleY =
        grid.offsetHeight > 0 ? origin.height / grid.offsetHeight : 1;
      previous = new Map(
        elements().map(({ key, element }) => {
          const rect = element.getBoundingClientRect();
          return [
            key,
            {
              left: (rect.left - origin.left) / scaleX,
              top: (rect.top - origin.top) / scaleY,
              width: rect.width / scaleX,
              height: rect.height / scaleY,
            },
          ];
        })
      );
      opacity = new Map(
        elements().map(({ key, element }) => [
          key,
          Number(getComputedStyle(element).opacity),
        ])
      );
      height = outer.getBoundingClientRect().height / scaleY;
    };
    const notify = (frameTime?: number) =>
      outer.dispatchEvent(
        new CustomEvent('simulationlayout', {
          bubbles: true,
          detail: frameTime,
        })
      );
    const cancel = () => {
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      animations = [];
      delete outer.dataset.simLayoutMoving;
    };
    const update = () => {
      if (
        resizeItems &&
        initialized &&
        !prepared &&
        width === grid.clientWidth &&
        targetHeight === grid.offsetHeight &&
        elements().length === targets.size &&
        elements().every(({ key }) => targets.has(key))
      )
        return;
      // Width/height keyframes affect offset measurements. Release them before
      // measuring a new destination, retaining the last captured visual boxes
      // so a resize or reversal can continue from the current position.
      if (resizeItems) cancel();
      const origin = grid.getBoundingClientRect();
      const staged = prepared;
      prepared = false;
      const scaleX = grid.offsetWidth > 0 ? origin.width / grid.offsetWidth : 1;
      const scaleY =
        grid.offsetHeight > 0 ? origin.height / grid.offsetHeight : 1;
      const visual = staged
        ? new Map(
            elements().map(({ key, element }) => [
              key,
              element.getBoundingClientRect(),
            ])
          )
        : new Map<string, DOMRect>();
      const nextHeight = grid.offsetHeight;
      const next = new Map(
        elements().map(({ key, element }) => [
          key,
          {
            left: element.offsetLeft,
            top: element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight,
          },
        ])
      );
      const changed =
        staged ||
        next.size !== targets.size ||
        Math.abs(nextHeight - targetHeight) > 0.5 ||
        [...next].some(([key, box]) => {
          const old = targets.get(key);
          return (
            !old ||
            (Object.keys(box) as (keyof Box)[]).some(
              (property) => Math.abs(box[property] - old[property]) > 0.5
            )
          );
        });
      if (!changed && initialized) return;

      // Keep the current visual position when another runtime arrives mid-motion.
      const from = previous;
      const fromOpacity = opacity;
      const fromHeight = staged ? screenHeight / scaleY : height;
      // Nested grids already animate their occupied height. Follow that
      // motion directly instead of scaling their panels from an older size
      // when a sibling finally makes the outer grid resize as well.
      const followingChildren =
        !staged &&
        width === grid.clientWidth &&
        next.size === targets.size &&
        [...next.keys()].every((key) => targets.has(key)) &&
        !animations.some((animation) => animation.playState === 'running') &&
        elements().some(({ element }) =>
          element.querySelector('[data-sim-layout]')
        );
      cancel();
      const animate =
        initialized &&
        !followingChildren &&
        !preference.matches &&
        (animateResize || width === grid.clientWidth);
      targets = next;
      targetHeight = nextHeight;
      width = grid.clientWidth;
      initialized = true;
      const deadline = Number(container?.dataset.simulationLayoutUntil);
      const options = deadline
        ? {
            ...OPTIONS,
            duration: Math.max(
              0,
              Math.min(DURATION, deadline - performance.now())
            ),
          }
        : OPTIONS;

      // Hold the occupied height between ResizeObserver callbacks so a CSS
      // breakpoint cannot reveal the new row height before we animate to it.
      if (animateResize) outer.style.height = `${nextHeight}px`;

      if (animate) {
        if (!(staged && nested) && Math.abs(fromHeight - nextHeight) > 0.5) {
          animations.push(
            outer.animate(
              [{ height: `${fromHeight}px` }, { height: `${nextHeight}px` }],
              options
            )
          );
        }
        for (const { key, element } of elements()) {
          const old = from.get(key);
          const box = next.get(key)!;
          if (!old) {
            animations.push(
              element.animate(
                [
                  { opacity: 0, transform: 'translateY(8px)' },
                  { opacity: 1, transform: 'none' },
                ],
                options
              )
            );
          } else if (box.width > 0 && box.height > 0) {
            const before = screenBoxes.get(key);
            const now = visual.get(key);
            const x =
              before && now
                ? (before.left - now.left) / scaleX
                : old.left - box.left;
            const y =
              before && now
                ? (before.top - now.top) / scaleY
                : old.top - box.top;
            const sx =
              before && now ? before.width / now.width : old.width / box.width;
            const sy =
              before && now
                ? before.height / now.height
                : old.height / box.height;
            if (
              (fromOpacity.get(key) ?? 1) < 1 ||
              Math.abs(x) > 0.5 ||
              Math.abs(y) > 0.5 ||
              Math.abs((sx - 1) * box.width) > 0.5 ||
              Math.abs((sy - 1) * box.height) > 0.5
            ) {
              animations.push(
                element.animate(
                  [
                    {
                      opacity: fromOpacity.get(key) ?? 1,
                      // Controls resize their boxes so labels and icons stay
                      // crisp instead of stretching with a FLIP scale.
                      ...(resizeItems
                        ? {
                            width: `${box.width * sx}px`,
                            height: `${box.height * sy}px`,
                            transform: `translate(${x}px, ${y}px)`,
                          }
                        : {
                            transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})`,
                          }),
                    },
                    {
                      opacity: 1,
                      transform: 'none',
                      ...(resizeItems
                        ? { width: `${box.width}px`, height: `${box.height}px` }
                        : {}),
                    },
                  ],
                  options
                )
              );
            }
          }
        }
      }
      const follow = (frameTime?: number) => {
        const moving = animations.some(
          (animation) => animation.playState === 'running'
        );
        if (moving) outer.dataset.simLayoutMoving = 'true';
        else delete outer.dataset.simLayoutMoving;
        capture();
        notify(moving ? frameTime : undefined);
        if (moving) frame = requestAnimationFrame(follow);
        else animations = [];
      };
      follow();
    };
    const reduceMotion = () => {
      if (preference.matches) {
        cancel();
        capture();
        notify();
      }
    };
    updateRef.current = update;
    update();
    const prepare = () => {
      capture();
      screenBoxes = new Map(
        elements().map(({ key, element }) => [
          key,
          element.getBoundingClientRect(),
        ])
      );
      screenHeight = outer.getBoundingClientRect().height;
      prepared = true;
    };
    const measure = () => {
      cancelAnimationFrame(resizeFrame);
      cancel();
      if (animateResize) outer.style.removeProperty('height');
    };
    const commit = () => {
      cancelAnimationFrame(resizeFrame);
      update();
    };
    const reset = () => {
      initialized = false;
      prepared = false;
      commit();
    };
    outer.addEventListener('simulationlayoutprepare', prepare);
    outer.addEventListener('simulationlayoutmeasure', measure);
    outer.addEventListener('simulationlayoutcommit', commit);
    outer.addEventListener('simulationlayoutreset', reset);
    // A nested grid's animation changes its parent's occupied height. Apply
    // observer-driven updates in the next frame, outside observer delivery,
    // so the parent and child cannot trigger a ResizeObserver loop.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(update);
    });
    observer.observe(grid);
    preference.addEventListener('change', reduceMotion);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      preference.removeEventListener('change', reduceMotion);
      outer.removeEventListener('simulationlayoutprepare', prepare);
      outer.removeEventListener('simulationlayoutmeasure', measure);
      outer.removeEventListener('simulationlayoutcommit', commit);
      outer.removeEventListener('simulationlayoutreset', reset);
      cancel();
      if (animateResize) outer.style.removeProperty('height');
      updateRef.current = () => {};
    };
  }, [itemSelector, animateResize, resizeItems]);

  // Ordinary simulation ticks only change text and colours. ResizeObserver
  // handles size changes; measure synchronously only when cards are added or removed.
  useLayoutEffect(() => updateRef.current(), [structure]);

  return (
    <div ref={outerRef} className={styles.layoutMotion} data-sim-layout>
      <div ref={gridRef} className={clsx(styles.layoutGrid, className)}>
        {items}
      </div>
    </div>
  );
}
