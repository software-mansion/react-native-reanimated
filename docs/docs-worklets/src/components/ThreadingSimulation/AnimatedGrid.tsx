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
  children,
}: {
  className: string;
  itemSelector?: string;
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

  useLayoutEffect(() => {
    const outer = outerRef.current!;
    const grid = gridRef.current!;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let previous = new Map<string, Box>();
    let opacity = new Map<string, number>();
    let targets = new Map<string, Box>();
    let height = grid.getBoundingClientRect().height;
    let targetHeight = height;
    let width = grid.clientWidth;
    let initialized = false;
    let animations: Animation[] = [];
    let frame = 0;

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
      previous = new Map(
        elements().map(({ key, element }) => {
          const rect = element.getBoundingClientRect();
          return [
            key,
            {
              left: rect.left - origin.left,
              top: rect.top - origin.top,
              width: rect.width,
              height: rect.height,
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
      height = outer.getBoundingClientRect().height;
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
      const nextHeight = grid.getBoundingClientRect().height;
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
      const fromHeight = height;
      cancel();
      const animate =
        initialized && !preference.matches && width === grid.clientWidth;
      targets = next;
      targetHeight = nextHeight;
      width = grid.clientWidth;
      initialized = true;

      if (animate) {
        if (Math.abs(fromHeight - nextHeight) > 0.5) {
          animations.push(
            outer.animate(
              [{ height: `${fromHeight}px` }, { height: `${nextHeight}px` }],
              OPTIONS
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
                OPTIONS
              )
            );
          } else if (box.width > 0 && box.height > 0) {
            const x = old.left - box.left;
            const y = old.top - box.top;
            const sx = old.width / box.width;
            const sy = old.height / box.height;
            if (
              (fromOpacity.get(key) ?? 1) < 1 ||
              Math.abs(x) > 0.5 ||
              Math.abs(y) > 0.5 ||
              Math.abs(old.width - box.width) > 0.5 ||
              Math.abs(old.height - box.height) > 0.5
            ) {
              animations.push(
                element.animate(
                  [
                    {
                      opacity: fromOpacity.get(key) ?? 1,
                      transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})`,
                    },
                    { opacity: 1, transform: 'none' },
                  ],
                  OPTIONS
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
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    preference.addEventListener('change', reduceMotion);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', reduceMotion);
      cancel();
      updateRef.current = () => {};
    };
  }, [itemSelector]);

  useLayoutEffect(() => updateRef.current());

  return (
    <div ref={outerRef} className={styles.layoutMotion} data-sim-layout>
      <div ref={gridRef} className={clsx(styles.layoutGrid, className)}>
        {items}
      </div>
    </div>
  );
}
