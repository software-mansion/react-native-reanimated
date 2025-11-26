import type React from 'react';

import styles from './styles.module.css';

export default function SupportedTypesTable({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.svg}>{children}</div>;
}
