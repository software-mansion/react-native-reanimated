import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

interface Props {
  open: boolean;
  id: string;
  children: React.ReactNode;
}

export default function Disclosure({ open, id, children }: Props) {
  const [hasOpened, setHasOpened] = useState(open);
  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  return (
    <div
      id={id}
      className={clsx(styles.disclosure, open && styles.disclosureOpen)}
      inert={!open}
      aria-hidden={!open}>
      <div className={styles.disclosureClip}>
        {(open || hasOpened) && children}
      </div>
    </div>
  );
}
