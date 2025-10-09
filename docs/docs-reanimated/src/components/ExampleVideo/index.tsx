import React from 'react';

interface Props {
  sources: {
    android: string;
    ios: string;
  };
}

export default function ExampleVideo({ sources }: Props) {
  return (
    <div
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: '16px',
        display: 'flex',
      }}>
      <video
        autoPlay
        muted
        loop
        style={{
          height: 'auto',
          width: '48%',
        }}>
        <source src={sources.android} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <video
        autoPlay
        muted
        loop
        style={{
          height: 'auto',
          width: '48%',
        }}>
        <source src={sources.ios} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
