import React from 'react';
import ThemedVideo from '../components/ThemedVideo';

const App: React.FC<{ width?: number }> = () => (
  <ThemedVideo
    center
    width={300}
    sources={{
      light: '/recordings/useAnimatedKeyboard_light.mov',
      dark: '/recordings/useAnimatedKeyboard_dark.mov',
    }}
  />
);

export default App;
