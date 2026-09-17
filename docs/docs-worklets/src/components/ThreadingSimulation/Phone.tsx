import React, { useEffect, useRef, useState } from 'react';
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
const WAVE_MS = 1300;

export default function Phone({
  screen,
  redrawn,
  onPress,
  className,
}: PhoneProps) {
  const tree = isLayoutNode(screen.tree) ? screen.tree : null;
  const [touched, setTouched] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const touch =
    touched?.id ?? (typeof screen.touch === 'string' ? screen.touch : null);
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
      : (id: string, event: React.MouseEvent) => {
          const bounds = screenRef.current?.getBoundingClientRect();
          if (bounds !== undefined) {
            setTouched({
              id,
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            });
          }
          onPress(id);
        };
  const pulse = tree === null ? undefined : findPulse(tree, nativeProps);
  const [waves, setWaves] = useState<number[]>([]);
  const waveIdRef = useRef(0);
  useEffect(() => {
    if (pulse === undefined) {
      return;
    }
    const waveId = ++waveIdRef.current;
    setWaves((current) => [...current, waveId]);
    const timeout = window.setTimeout(() => {
      setWaves((current) => current.filter((entry) => entry !== waveId));
    }, WAVE_MS);
    return () => window.clearTimeout(timeout);
  }, [pulse]);
  return (
    <div
      className={clsx(styles.phone, redrawn && styles.phoneRedrawn, className)}
      aria-label="Phone screen"
      data-help="The app screen. Only the UI thread draws it; other threads send patches that arrive as a draw-frame job. Pressing the button queues a job.">
      {waves.map((waveId) => (
        <span key={waveId} className={styles.phoneWaves} aria-hidden>
          <span className={styles.phoneWaveRing} />
          <span className={styles.phoneWaveRing} />
          <span className={styles.phoneWaveRing} />
        </span>
      ))}
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen} ref={screenRef}>
        {touched !== null && (
          <span
            className={styles.phoneTouch}
            style={{ left: touched.x, top: touched.y }}
          />
        )}
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
  press: ((id: string, event: React.MouseEvent) => void) | undefined,
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
      <span
        key={key}
        className={clsx(
          styles.phoneText,
          node.props.small === true && styles.phoneTextSmall,
          overrides.style === 'bold' && styles.textBold,
          overrides.style === 'italic' && styles.textItalic,
          overrides.style === 'underline' && styles.textUnderline,
          overrides.style === 'strikethrough' && styles.textStrike,
          overrides.style === 'code' && styles.textCode
        )}>
        {typeof overrides.text === 'string' ? overrides.text : children}
      </span>
    );
  }
  if (node.type === 'Feed') {
    const posts = Array.isArray(overrides.posts)
      ? (overrides.posts as unknown[]).map(Number)
      : [];
    return <Feed key={key} posts={posts} />;
  }
  if (node.type === 'Speaker') {
    return (
      <span key={key} className={styles.phoneSpeaker} aria-label="Speaker">
        <span />
        <span />
        <span />
      </span>
    );
  }
  if (node.type === 'Spinner') {
    const rotation = Number(overrides.rotation ?? node.props.rotation ?? 0);
    return (
      <span
        key={key}
        className={styles.phoneSpinner}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
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
          onClick={(event) => press(id, event)}>
          {label || children}
        </button>
      );
    }
    return (
      <span key={key} className={className}>
        {label || children}
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

const FEED_ROWS = 4;

function Feed({ posts }: { posts: number[] }) {
  const [rows, setRows] = useState<number[]>([]);
  const signature = posts.join(',');
  useEffect(() => {
    if (signature === '') {
      setRows([]);
      return;
    }
    setRows((current) => {
      const fresh = posts.filter((post) => !current.includes(post));
      return [...current, ...fresh].slice(-FEED_ROWS);
    });
  }, [signature]);
  return (
    <span className={styles.phoneFeed} aria-label="Feed">
      {rows.map((post) => (
        <span key={post} className={styles.phoneFeedRow}>
          <span className={styles.phoneFeedAvatar} />
          <span className={styles.phoneFeedText}>post #{post}</span>
        </span>
      ))}
    </span>
  );
}

function findPulse(
  node: LayoutNode | string,
  nativeProps: NativeProps
): unknown {
  if (typeof node === 'string') {
    return undefined;
  }
  if (node.type === 'Speaker' && typeof node.props.nativeID === 'string') {
    return nativeProps[node.props.nativeID]?.pulse;
  }
  for (const child of node.children) {
    const found = findPulse(child, nativeProps);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function isLayoutNode(value: unknown): value is LayoutNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LayoutNode).type === 'string' &&
    Array.isArray((value as LayoutNode).children)
  );
}
