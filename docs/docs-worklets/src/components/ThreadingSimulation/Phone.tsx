import React from 'react';
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
  className?: string;
}

export default function Phone({ screen, redrawn, className }: PhoneProps) {
  const tree = isLayoutNode(screen.tree) ? screen.tree : null;
  const touch = typeof screen.touch === 'string' ? screen.touch : null;
  const nativeProps = (screen.nativeProps ?? {}) as NativeProps;
  return (
    <div
      className={clsx(styles.phone, redrawn && styles.phoneRedrawn, className)}
      aria-label="Phone screen">
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>
        {tree === null ? (
          <span className={styles.phoneEmpty}>nothing rendered yet</span>
        ) : (
          renderNode(tree, touch, nativeProps, 'root')
        )}
      </div>
    </div>
  );
}

function renderNode(
  node: LayoutNode | string,
  touch: string | null,
  nativeProps: NativeProps,
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
    renderNode(child, touch, nativeProps, `${key}.${index}`)
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
    const pressed = touch !== null && touch === title;
    return (
      <span
        key={key}
        className={clsx(
          styles.phoneButton,
          pressed && styles.phoneButtonPressed
        )}>
        {title || children}
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
