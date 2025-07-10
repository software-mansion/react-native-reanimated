import React from 'react';
import { Canvas, Fill, Skia, Text, useFont } from '@shopify/react-native-skia';

export default function EmptyExample() {
  const font = useFont(
    require('../../../../../web-example/assets/fonts/Poppins/Poppins-Bold.ttf'),
    24
  );

  return (
    <Canvas style={{ flex: 1, padding: 20 }}>
      <Fill color="white" />
      <Text x={0} y={32} text="Hello World" font={font} />
    </Canvas>
  );
}
