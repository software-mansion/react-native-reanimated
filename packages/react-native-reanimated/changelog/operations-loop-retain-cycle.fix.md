Fix a retain cycle that kept the Reanimated module proxy, its registries and its UIManager alive after a React Native reload or teardown.
