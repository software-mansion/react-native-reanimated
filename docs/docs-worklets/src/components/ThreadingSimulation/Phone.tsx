import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

import type { ScreenState } from '@site/src/simulation';

import styles from './styles.module.css';

interface LayoutNode {
  type: string;
  props: Record<string, string | number | boolean>;
  children: (LayoutNode | string)[];
}

type NativeProps = Record<string, Record<string, unknown>>;

interface PhoneProps {
  screen: ScreenState;
  redrawn: boolean;
  onPress?: (id: string) => void;
  className?: string;
}

const TOUCH_MS = 220;

export default function Phone({
  screen,
  redrawn,
  onPress,
  className,
}: PhoneProps) {
  const tree = isLayoutNode(screen.tree) ? screen.tree : null;
  const [touched, setTouched] = useState<string | null>(null);
  const touch =
    touched ?? (typeof screen.touch === 'string' ? screen.touch : null);
  const nativeProps = (screen.nativeProps ?? {}) as NativeProps;

  useEffect(() => {
    if (touched === null) {
      return;
    }
    const id = window.setTimeout(() => setTouched(null), TOUCH_MS);
    return () => window.clearTimeout(id);
  }, [touched]);

  const press =
    onPress === undefined
      ? undefined
      : (id: string) => {
          setTouched(id);
          onPress(id);
        };
  return (
    <div
      className={clsx(styles.phone, redrawn && styles.phoneRedrawn, className)}
      aria-label="Phone screen">
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>
        {tree === null ? (
          <span className={styles.phoneEmpty}>nothing rendered yet</span>
        ) : (
          renderNode(tree, touch, nativeProps, press, 'root')
        )}
      </div>
    </div>
  );
}

function renderNode(
  node: LayoutNode | string,
  touch: string | null,
  nativeProps: NativeProps,
  press: ((id: string) => void) | undefined,
  key: string
): React.ReactNode {
  if (typeof node === 'string') {
    return <span key={key}>{node}</span>;
  }
  const overrides =
    typeof node.props.nativeID === 'string'
      ? (nativeProps[node.props.nativeID] ?? {})
      : {};
  const children = node.children.map((child, index) =>
    renderNode(child, touch, nativeProps, press, `${key}.${index}`)
  );
  if (node.type === 'Text') {
    return (
      <span key={key} className={styles.phoneText}>
        {typeof overrides.text === 'string' ? overrides.text : children}
      </span>
    );
  }
  if (node.type === 'Button') {
    const title = typeof node.props.title === 'string' ? node.props.title : '';
    const id =
      typeof node.props.nativeID === 'string' ? node.props.nativeID : title;
    const label = typeof overrides.text === 'string' ? overrides.text : title;
    const pressed = touch !== null && (touch === id || touch === title);
    const className = clsx(
      styles.phoneButton,
      pressed && styles.phoneButtonPressed,
      press !== undefined && styles.phoneButtonLive
    );
    if (press !== undefined) {
      return (
        <button
          key={key}
          type="button"
          className={className}
          onClick={() => press(id)}>
          {label || children}
          {pressed && <span className={styles.phoneTouch} />}
        </button>
      );
    }
    return (
      <span key={key} className={className}>
        {label || children}
        {pressed && <span className={styles.phoneTouch} />}
      </span>
    );
  }
  if (node.type === 'Box') {
    const rotation = Number(overrides.rotation ?? node.props.rotation ?? 0);
    return (
      <span
        key={key}
        className={styles.phoneBox}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    );
  }
  return (
    <div key={key} className={styles.phoneView}>
      {children}
    </div>
  );
}

function isLayoutNode(value: unknown): value is LayoutNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LayoutNode).type === 'string' &&
    Array.isArray((value as LayoutNode).children)
  );
}
