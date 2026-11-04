import React, { useEffect, useRef, useState } from 'react';

import styles from './styles.module.css';

interface Link {
  id: string;
  path: string;
}

export default function GuestLinks({ active }: { active: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    if (!active) {
      return;
    }
    let frame = 0;
    let previous = '';
    let visible = true;
    const measure = () => {
      if (!visible) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(measure);
      const svg = svgRef.current;
      const root = svg?.parentElement;
      if (!svg || !root) return;
      const origin = root.getBoundingClientRect();
      const next: Link[] = [];
      root
        .querySelectorAll<HTMLElement>('[data-shareable-guest]')
        .forEach((guest) => {
          const id = guest.dataset.shareableGuest!;
          const host = root.querySelector<HTMLElement>(
            `[data-shareable-host="${id}"]`
          );
          if (!host) return;
          next.push({
            id: `${id}:${guest.closest('[data-runtime]')?.getAttribute('data-runtime')}`,
            path: linkPath(
              guest.getBoundingClientRect(),
              host.getBoundingClientRect(),
              origin
            ),
          });
        });
      const key = JSON.stringify(next);
      if (key !== previous) {
        previous = key;
        setLinks(next);
      }
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
            if (visible && frame === 0) {
              measure();
            }
          });
    const root = svgRef.current?.parentElement;
    if (observer && root) {
      observer.observe(root);
    }
    measure();
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [active]);

  return (
    <svg ref={svgRef} className={styles.guestLinks} aria-hidden="true">
      <defs>
        <marker
          id="guest-link-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse">
          <path d="M0 0L8 4L0 8z" className={styles.guestLinkHead} />
        </marker>
      </defs>
      {links.map((link) => (
        <path
          key={link.id}
          d={link.path}
          className={styles.guestLink}
          markerEnd="url(#guest-link-arrow)"
        />
      ))}
    </svg>
  );
}

function linkPath(guest: DOMRect, host: DOMRect, origin: DOMRect): string {
  const guestY = (guest.top + guest.bottom) / 2 - origin.top;
  const hostY =
    Math.min(Math.max(guestY + origin.top, host.top + 4), host.bottom - 4) -
    origin.top;
  const towardsRight = host.left >= guest.right;
  const towardsLeft = host.right <= guest.left;
  if (towardsRight || towardsLeft) {
    const startX = (towardsRight ? guest.right : guest.left) - origin.left;
    const endX = (towardsRight ? host.left : host.right) - origin.left;
    const middleX = (startX + endX) / 2;
    return `M${startX} ${guestY}H${middleX}V${hostY}H${endX}`;
  }
  const below = host.top >= guest.bottom;
  const x = (guest.left + guest.right) / 2 - origin.left;
  const hostX = (host.left + host.right) / 2 - origin.left;
  const startY = (below ? guest.bottom : guest.top) - origin.top;
  const endY = (below ? host.top : host.bottom) - origin.top;
  const middleY = (startY + endY) / 2;
  return `M${x} ${startY}V${middleY}H${hostX}V${endY}`;
}
