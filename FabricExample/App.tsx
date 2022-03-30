import React from 'react';
// import WorkletExample from './src/WorkletExample';
// import TransformExample from './src/TransformExample';
// import ColorExample from './src/ColorExample';
// import WidthExample from './src/WidthExample';
import ChessboardExample from './src/ChessboardExample';
// import ScrollViewExample from './src/ScrollViewExample';
// import AnimatedSensorExample from './src/AnimatedSensorExample';
import { initializeForFabric } from '../src/reanimated2/core';

export default function App() {
  React.useEffect(() => {
    initializeForFabric();
  }, []);

  // return <WorkletExample />;
  // return <TransformExample />;
  // return <ColorExample />;
  // return <WidthExample />;
  return <ChessboardExample />;
  // return <ScrollViewExample />;
  // return <AnimatedSensorExample />;
}
