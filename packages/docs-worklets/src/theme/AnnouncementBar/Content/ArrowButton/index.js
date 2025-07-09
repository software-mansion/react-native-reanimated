import React from 'react';

function ArrowButton({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      className={className}
      viewBox="0 0 24 24">
      <g>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M7 17L17 7m0 0H7m10 0v10"></path>
      </g>
    </svg>
  );
}

export default ArrowButton;
