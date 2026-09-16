import type { CoreKind } from '@site/src/simulation';

import styles from './styles.module.css';

export interface RuntimeDescriptor {
  id: string;
  label: string;
  thread: string;
  kind: CoreKind;
  hasRuntime: boolean;
  coreIndex: number;
}

const EXTRA_WORKER_CLASSES = [styles.rtGreen, styles.rtOrange, styles.rtTeal];

export function runtimeClass(runtime: RuntimeDescriptor): string {
  if (runtime.kind === 'rn') {
    return styles.rtPurple;
  }
  if (runtime.kind === 'ui') {
    return styles.rtRed;
  }
  return EXTRA_WORKER_CLASSES[
    Math.max(runtime.coreIndex - 2, 0) % EXTRA_WORKER_CLASSES.length
  ];
}

export function displayName(runtime: RuntimeDescriptor): string {
  return runtime.hasRuntime ? runtime.label : runtime.thread;
}

export function threadName(runtime: RuntimeDescriptor): string {
  return runtime.kind === 'worker'
    ? `${badgeName(runtime.id)} thread`
    : runtime.thread;
}

const FRIENDLY_NAMES: Record<string, string> = {
  applyScreen: 'draw frame',
  dispatchPress: 'press event',
  touch: 'touch event',
  tick: 'timer',
  render: 'render',
  main: 'startup',
};

export function humanize(name: string): string {
  return (
    FRIENDLY_NAMES[name] ??
    name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  );
}

const BADGE_NAMES: Record<string, string> = {
  rn: 'RN',
  ui: 'UI',
  markdown: 'MD',
  worker: 'WK',
};

export function badgeName(coreId: string): string {
  const name = shortName(coreId);
  return BADGE_NAMES[name] ?? name.slice(0, 2).toUpperCase();
}

export function shortName(coreId: string): string {
  return coreId.startsWith('worker:')
    ? coreId.slice('worker:'.length)
    : coreId.toUpperCase();
}
