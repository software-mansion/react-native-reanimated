import clsx from 'clsx';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import HandIcon from '../HandIcon';
import styles from './styles.module.css';

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

export default function TopPromoRotator() {
  const promos = useMemo(() => PROMOS, []);

  const [index, setIndex] = useState(0);

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
      <span className="sr-only">
        {typeof active.label === 'string' ? active.label : ''}
      </span>
    </div>
  );
}
