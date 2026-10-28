import React, { useEffect, useId, useRef, useState } from 'react';

import styles from './styles.module.css';

export default function PanelHelp({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;
    const dismiss = () => popoverRef.current?.hidePopover();
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.panelHelp}
        aria-label={`About ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          const popover = popoverRef.current;
          if (!popover) return;
          if (popover.matches(':popover-open')) {
            popover.hidePopover();
            return;
          }
          popover.showPopover();
          const anchor = event.currentTarget.getBoundingClientRect();
          const bounds = popover.getBoundingClientRect();
          const below = anchor.bottom + 8;
          setPosition({
            left: Math.max(
              16,
              Math.min(anchor.left, window.innerWidth - bounds.width - 16)
            ),
            top: Math.max(
              16,
              below + bounds.height <= window.innerHeight - 16
                ? below
                : anchor.top - bounds.height - 8
            ),
          });
        }}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 9v5M10 6v.5" />
        </svg>
      </button>
      <div
        ref={popoverRef}
        id={id}
        popover="auto"
        className={styles.helpPopover}
        style={position}
        onToggle={(event) => setOpen(event.newState === 'open')}>
        <div className={styles.helpHeading}>
          <strong>{title}</strong>
          <button
            type="button"
            className={styles.helpClose}
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label={`Close information about ${title}`}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <p>{children}</p>
      </div>
    </>
  );
}
