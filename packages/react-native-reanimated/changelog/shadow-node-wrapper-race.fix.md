Stop reading on the UI thread the shadow node wrapper that React Native updates on the JS thread, which could crash animations with a double free.
