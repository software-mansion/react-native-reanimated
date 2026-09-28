export const View = 'View';
export const Text = 'Text';
export const Button = 'Button';
export const Box = 'Box';

export interface LayoutNode {
  type: string;
  props: Record<string, string | number | boolean>;
  children: (LayoutNode | string)[];
}

interface Element {
  type: unknown;
  props: Record<string, unknown>;
}

type Updater<T> = T | ((previous: T) => T);

let states: unknown[] = [];
let cursor = 0;
let effects: { index: number; ran: boolean; effect: () => unknown }[] = [];
let timers: (() => unknown)[] = [];
let lastTree: unknown = null;

export function createElement(
  type: unknown,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): Element {
  const merged: Record<string, unknown> = { ...(props ?? {}) };
  if (children.length === 1) {
    merged.children = children[0];
  } else if (children.length > 1) {
    merged.children = children;
  }
  return { type, props: merged };
}

export function resetHooks(): void {
  states = [];
  cursor = 0;
  effects = [];
  timers = [];
  lastTree = null;
}

export function beginRender(): void {
  cursor = 0;
}

export function useState<T>(initial: T): [T, (value: Updater<T>) => void] {
  const index = cursor++;
  if (!(index in states)) {
    states[index] = initial;
  }
  return [
    states[index] as T,
    (value: Updater<T>) => {
      states[index] =
        typeof value === 'function'
          ? (value as (previous: T) => T)(states[index] as T)
          : value;
    },
  ];
}

export function useEffect(effect: () => unknown): void {
  const index = cursor++;
  if (!effects.some((entry) => entry.index === index)) {
    effects.push({ index, ran: false, effect });
  }
}

export function runEffects(): void {
  for (const entry of effects) {
    if (!entry.ran) {
      entry.ran = true;
      entry.effect();
    }
  }
}

export function setInterval(callback: () => unknown): number {
  timers.push(callback);
  return timers.length;
}

export function clearInterval(): void {}

export function runTimer(): unknown {
  const callback = timers[0];
  return callback === undefined ? undefined : callback();
}

export function rememberTree(tree: unknown): void {
  lastTree = tree;
}

export function pressButton(title: string): unknown {
  const button = findButton(lastTree, title);
  if (button === null) {
    throw new Error(`no <Button title="${title}"> in the rendered tree`);
  }
  const onPress = button.props.onPress;
  return typeof onPress === 'function' ? onPress() : undefined;
}

export function layoutOf(node: unknown): LayoutNode | string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (!isElement(node)) {
    return '';
  }
  const { children, ...rest } = node.props;
  const props: LayoutNode['props'] = {};
  for (const [key, value] of Object.entries(rest)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      props[key] = value;
    }
  }
  return {
    type: String(node.type),
    props,
    children: childList(children).map(layoutOf),
  };
}

function childList(children: unknown): unknown[] {
  return children === undefined
    ? []
    : Array.isArray(children)
      ? children
      : [children];
}

function findButton(node: unknown, title: string): Element | null {
  if (!isElement(node)) {
    return null;
  }
  if (node.type === Button && node.props.title === title) {
    return node;
  }
  for (const child of childList(node.props.children)) {
    const found = findButton(child, title);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    'props' in node &&
    typeof (node as Element).props === 'object'
  );
}
