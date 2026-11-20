import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { SIMULATION_OPEN_EVENT } from './events';

export function useFullscreen(
  controlledFullscreen?: boolean,
  onFullscreenChange?: (fullscreen: boolean) => void
) {
  const id = useId();
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const fullscreen = controlledFullscreen ?? localFullscreen;
  const [expanded, setExpanded] = useState(fullscreen);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previousFullscreen = useRef(fullscreen);
  const setFullscreen = useCallback(
    (next: boolean) => {
      setLocalFullscreen(next);
      onFullscreenChange?.(next);
    },
    [onFullscreenChange]
  );

  useLayoutEffect(() => {
    const changed = previousFullscreen.current !== fullscreen;
    previousFullscreen.current = fullscreen;
    const container = containerRef.current;
    if (!changed || container === null) return;
    const content = container.querySelector<HTMLElement>('[data-sim-content]');
    if (!content) return;
    const scene = content.parentElement!;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const duration = parseFloat(
      getComputedStyle(container).getPropertyValue('--sim-fullscreen-duration')
    );
    let phase: 'area' | 'layout' | 'done' = 'done';
    let timer = 0;
    let settleFrame = 0;
    let areaFrame = 0;
    const notify = (name: string) =>
      container.dispatchEvent(new CustomEvent(name));
    const notifyGrids = (name: string) =>
      container.querySelectorAll('[data-sim-layout]').forEach((grid) => {
        grid.dispatchEvent(new CustomEvent(name));
      });
    const resetGrids = () => {
      notifyGrids('simulationlayoutmeasure');
      notifyGrids('simulationlayoutreset');
    };
    const release = () => {
      phase = 'done';
      window.clearTimeout(timer);
      cancelAnimationFrame(settleFrame);
      cancelAnimationFrame(areaFrame);
      content.style.removeProperty('width');
      delete container.dataset.simulationFullscreenTransition;
      delete container.dataset.simulationLayoutUntil;
      delete container.dataset.simulationTransitionPhase;
      setTransitioning(false);
      notify('simulationlayout');
    };
    const settleImmediately = () => {
      setExpanded(fullscreen);
      release();
      resetGrids();
    };
    if (preference.matches || content.getBoundingClientRect().width === 0) {
      settleImmediately();
      return;
    }

    // Freeze the inner width before the shell changes. Expansion opens the
    // space first; collapse fits the cards first, then closes the space.
    content.style.width = `${content.getBoundingClientRect().width}px`;
    container.dataset.simulationFullscreenTransition = 'true';
    setTransitioning(true);

    const areaFinished = () => {
      if (phase !== 'area') return;
      window.clearTimeout(timer);
      cancelAnimationFrame(areaFrame);
      if (fullscreen) moveCards();
      else release();
    };
    const resizeArea = () => {
      phase = 'area';
      container.dataset.simulationTransitionPhase = phase;
      delete container.dataset.simulationLayoutUntil;
      setExpanded(fullscreen);
      // Connections follow the whole frozen scene as it is recentered, even
      // when the workspace's own dimensions remain unchanged.
      const follow = () => {
        notify('simulationlayout');
        areaFrame = requestAnimationFrame(follow);
      };
      areaFrame = requestAnimationFrame(follow);
      // Covers an unchanged width and interrupted CSS transitions as well.
      timer = window.setTimeout(areaFinished, duration + 50);
    };
    const afterLayout = () => {
      if (phase !== 'layout') return;
      cancelAnimationFrame(settleFrame);
      settleFrame = requestAnimationFrame(() => {
        if (container.querySelector('[data-sim-layout-moving]')) return;
        window.clearTimeout(timer);
        if (fullscreen) release();
        else resizeArea();
      });
    };
    const moveCards = () => {
      phase = 'layout';
      container.dataset.simulationTransitionPhase = phase;
      container.dataset.simulationLayoutUntil = String(performance.now() + 360);
      notifyGrids('simulationlayoutprepare');
      if (fullscreen) {
        content.style.removeProperty('width');
      } else {
        const normalWidth = parseFloat(
          container.style.getPropertyValue('--sim-collapsed-width')
        );
        const style = getComputedStyle(scene);
        const inset =
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight) +
          parseFloat(style.borderLeftWidth) +
          parseFloat(style.borderRightWidth);
        content.style.width = `${Math.max(0, normalWidth - inset)}px`;
      }
      // Read all starting positions, release old heights, then animate from
      // the outside in so nested cards account for their panel's transform.
      notifyGrids('simulationlayoutmeasure');
      notifyGrids('simulationlayoutcommit');
      // All nested grids share this deadline; late observer notifications
      // cannot add another full animation after the cards have settled.
      timer = window.setTimeout(() => {
        resetGrids();
        afterLayout();
      }, 410);
      afterLayout();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target === container && event.propertyName === 'width') {
        areaFinished();
      }
    };
    const onPreferenceChange = () => {
      if (preference.matches) settleImmediately();
    };
    const onResize = () => {
      if (phase !== 'done') settleImmediately();
    };
    container.addEventListener('transitionend', onEnd);
    container.addEventListener('simulationlayout', afterLayout);
    preference.addEventListener('change', onPreferenceChange);
    window.addEventListener('resize', onResize);
    if (fullscreen) resizeArea();
    else moveCards();
    return () => {
      phase = 'done';
      window.clearTimeout(timer);
      cancelAnimationFrame(settleFrame);
      cancelAnimationFrame(areaFrame);
      container.removeEventListener('transitionend', onEnd);
      container.removeEventListener('simulationlayout', afterLayout);
      preference.removeEventListener('change', onPreferenceChange);
      window.removeEventListener('resize', onResize);
      delete container.dataset.simulationFullscreenTransition;
      delete container.dataset.simulationLayoutUntil;
      delete container.dataset.simulationTransitionPhase;
      // Preserve the held width on a reversal. The next effect starts from
      // that visible state, rather than briefly returning to the final layout.
    };
  }, [fullscreen]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const column = container.closest<HTMLElement>('[class*="docItemCol"]');
    let pageLeft: number | undefined;
    let articleShift: number | undefined;
    let measureFrame = 0;
    const measure = () => {
      const viewportWidth = document.documentElement.clientWidth;
      const parent = container.parentElement!;
      const parentStyle = getComputedStyle(parent);
      const collapsedWidth =
        parent.getBoundingClientRect().width -
        parseFloat(parentStyle.paddingLeft) -
        parseFloat(parentStyle.paddingRight) -
        parseFloat(parentStyle.borderLeftWidth) -
        parseFloat(parentStyle.borderRightWidth);
      const currentShift = column
        ? parseFloat(getComputedStyle(column).left) || 0
        : 0;
      // Recover the normal article position while both it and the simulation
      // animate. Their targets must not chase the current visual positions.
      const left =
        container.getBoundingClientRect().left -
        parseFloat(getComputedStyle(container).marginLeft) -
        currentShift;
      // Finish all layout reads before writing any CSS variables.
      const sidebar = document.querySelector('.theme-doc-sidebar-container');
      const toc = document
        .querySelector('.theme-doc-toc-desktop')
        ?.closest('.col');
      const sidePanelsWidth =
        (sidebar?.getBoundingClientRect().width ?? 0) +
        (toc?.getBoundingClientRect().width ?? 0);
      const rect = column?.getBoundingClientRect();
      const shift = rect
        ? (viewportWidth - rect.width) / 2 - (rect.left - currentShift)
        : 0;
      // Fractional rounding during the height animation must not keep
      // restarting the margin transition with an almost identical target.
      if (pageLeft === undefined || Math.abs(left - pageLeft) > 0.5) {
        pageLeft = left;
        container.style.setProperty('--sim-page-left', `${left}px`);
      }
      container.style.setProperty('--sim-page-width', `${viewportWidth}px`);
      container.style.setProperty(
        '--sim-collapsed-width',
        `${collapsedWidth}px`
      );
      container.style.setProperty(
        '--sim-side-panels-width',
        `${sidePanelsWidth}px`
      );
      if (column) {
        if (
          articleShift === undefined ||
          Math.abs(shift - articleShift) > 0.5
        ) {
          articleShift = shift;
          column.style.setProperty('--sim-article-shift', `${shift}px`);
        }
      }
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(measureFrame);
      measureFrame = requestAnimationFrame(measure);
    };
    measure();
    const widths = new WeakMap<Element, number>();
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        if (widths.get(entry.target) !== entry.contentRect.width) {
          widths.set(entry.target, entry.contentRect.width);
          changed = true;
        }
      }
      // Playback and grid animations change height frequently, but do not
      // change the space available beside the article.
      if (changed) scheduleMeasure();
    });
    if (container.parentElement) observer.observe(container.parentElement);
    if (column) observer.observe(column);
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(measureFrame);
      window.removeEventListener('resize', scheduleMeasure);
      container.style.removeProperty('--sim-page-left');
      container.style.removeProperty('--sim-page-width');
      container.style.removeProperty('--sim-collapsed-width');
      container.style.removeProperty('--sim-side-panels-width');
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    // Only one simulation owns the expanded page layout at a time.
    window.dispatchEvent(
      new CustomEvent(SIMULATION_OPEN_EVENT, { detail: id })
    );
    buttonRef.current?.scrollIntoView({ block: 'nearest' });
    const onOpen = (event: CustomEvent<string>) => {
      if (event.detail !== id) setFullscreen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setFullscreen(false);
        buttonRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener(SIMULATION_OPEN_EVENT, onOpen as EventListener);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener(
        SIMULATION_OPEN_EVENT,
        onOpen as EventListener
      );
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fullscreen, id, setFullscreen]);

  return {
    fullscreen,
    expanded,
    setFullscreen,
    buttonRef,
    containerRef,
    transitioning,
  };
}
