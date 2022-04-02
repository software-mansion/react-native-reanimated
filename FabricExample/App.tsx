import React from 'react';
// import WorkletExample from './src/WorkletExample';
// import TransformExample from './src/TransformExample';
// import ColorExample from './src/ColorExample';
// import WidthExample from './src/WidthExample';
// import ChessboardExample from './src/ChessboardExample';
// import RefExample from './src/RefExample';
// import ScrollViewExample from './src/ScrollViewExample';
// import ScrollToExample from './src/ScrollToExample';
// import AnimatedSensorExample from './src/AnimatedSensorExample';
// import AnimatedTextExample from './src/AnimatedTextExample';
import MeasureExample from './src/MeasureExample';
import { initializeForFabric } from '../src/reanimated2/core';

export default function App() {
  React.useEffect(() => {
    initializeForFabric();
  }, []);

  // return <WorkletExample />;
  // return <TransformExample />;
  // return <ColorExample />;
  // return <WidthExample />;
  // return <ChessboardExample />;
  // return <RefExample />;
  // return <ScrollViewExample />;
  // return <ScrollToExample />;
  // return <AnimatedSensorExample />;
  // return <AnimatedTextExample />;
  return <MeasureExample />;
}
