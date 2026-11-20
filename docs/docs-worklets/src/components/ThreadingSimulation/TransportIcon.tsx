import React from 'react';

export type TransportIconName =
  | 'reset'
  | 'back'
  | 'step'
  | 'play'
  | 'pause'
  | 'loop'
  | 'expand'
  | 'collapse';

const PATHS: Record<TransportIconName, React.ReactNode> = {
  expand: (
    <path
      d="M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  ),
  collapse: (
    <path
      d="M2 6h4V2m4 0v4h4M6 14v-4H2m8 4v-4h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  ),
  reset: (
    <>
      <rect x="2" y="3" width="2" height="10" />
      <path d="M13 3 5.5 8 13 13Z" />
    </>
  ),
  back: (
    <>
      <path d="M8.5 3 2 8l6.5 5Z" />
      <path d="M14.5 3 8 8l6.5 5Z" />
    </>
  ),
  step: (
    <>
      <path d="M1.5 3 8 8l-6.5 5Z" />
      <path d="M7.5 3 14 8l-6.5 5Z" />
    </>
  ),
  play: <path d="M4 2.5 13.5 8 4 13.5Z" />,
  pause: (
    <>
      <rect x="3.5" y="3" width="3" height="10" />
      <rect x="9.5" y="3" width="3" height="10" />
    </>
  ),
  loop: (
    <>
      <path
        d="M3.5 7.5a4.5 4.5 0 0 1 8-2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12.5 1.5v4h-4Z" />
      <path
        d="M12.5 8.5a4.5 4.5 0 0 1-8 2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M3.5 14.5v-4h4Z" />
    </>
  ),
};

export default function TransportIcon({ name }: { name: TransportIconName }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden="true"
      focusable="false">
      {PATHS[name]}
    </svg>
  );
}
