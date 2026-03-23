import clsx from 'clsx';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import HandIcon from '../HandIcon';
import styles from './styles.module.css';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

type Promo = {
  key: string;
  href: string;
  bg: string;
  buttonLabel: string;
  label: ReactNode;
};

const PROMOS: readonly Promo[] = [
  {
    key: 'appjs',
    href: 'https://appjs.co?origin=swmansion_bar',
    bg: '#C7CEF5',
    buttonLabel: 'Get your tickets',
    label: (
      <>
        <strong>App.js Conf 2026</strong>
        <span className={styles.hiddenOnMobile}>
          {' '}
          is just around the corner!
        </span>
      </>
    ),
  },
  {
    key: 'paradise',
    href: 'https://paradise.swmansion.com?origin=swmansion_bar',
    bg: '#FFF4C0',
    buttonLabel: 'Learn more',
    label: (
      <>
        <strong>React Native Paradise</strong>
        <span className={styles.hiddenOnMobile}>
          {' '}
          - a week of advanced RN workshops in Croatia!
        </span>
      </>
    ),
  },
];

// bump when adding promos so users who dismissed banner see the new one
export const PROMO_VERSION = 1;

type Props = {
  onClose?: () => void;
};

export default function TopPromoRotator({ onClose }: Props) {
  const promos = useMemo(() => PROMOS, []);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="www.googletagmanager.com/gtm.js?id=GTM-WV2G3SQL"]'
    );

    if (existingScript) return;

    (function (w: Window, d: Document, s: string, l: string, i: string) {
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
      });
      const f = d.getElementsByTagName(s)[0] as HTMLScriptElement;
      const j = d.createElement(s) as HTMLScriptElement;
      const dl = l !== 'dataLayer' ? `&l=${l}` : '';
      j.async = true;
      j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`;
      f.parentNode?.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', 'GTM-WV2G3SQL');
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % promos.length);
    }, 5_000);

    return () => window.clearInterval(id);
  }, [promos.length]);

  const active = promos[index];

  const translateY = `translateY(-${index * 50}px)`;

  return (
    <div
      className={clsx(styles.wrapper)}
      style={{
        backgroundColor: active.bg,
        transition: 'background-color 600ms ease',
      }}>
      <div
        className={styles.slider}
        style={{
          transform: translateY,
          transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
        {promos.map((p) => (
          <a
            key={p.key}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.banner}>
            <span>{p.label}</span>
            <HandIcon aria-hidden="true" className={styles.icon} />
            <span className={styles.underline}>{p.buttonLabel}</span>
          </a>
        ))}
      </div>
      {onClose && (
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close promotion banner"
          onClick={onClose}>
          ×
        </button>
      )}
      <span className="sr-only">
        {typeof active.label === 'string' ? active.label : ''}
      </span>
    </div>
  );
}
