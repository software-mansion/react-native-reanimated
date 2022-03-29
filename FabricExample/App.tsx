import React from 'react';
// import WorkletExample from './src/WorkletExample';
// import UIPropsExample from './src/UIPropsExample';
// import ColorExample from './src/ColorExample';
// import ScrollViewExample from './src/ScrollViewExample';
// import AnimatedSensorExample from './src/AnimatedSensorExample';
// import ChessboardExample from './src/ChessboardExample';
import LayoutPropsExample from './src/LayoutPropsExample';
import { initializeForFabric } from '../src/reanimated2/core';

export default function App() {
  React.useEffect(() => {
    initializeForFabric();
  }, []);

  // return <WorkletExample />;
  // return <UIPropsExample />;
  // return <ColorExample />;
  // return <ScrollViewExample />;
  // return <AnimatedSensorExample />;
  // return <ChessboardExample />;
  return <LayoutPropsExample />;
}
