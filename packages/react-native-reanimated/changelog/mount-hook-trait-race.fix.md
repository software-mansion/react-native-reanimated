Fix a data race in the mount hook, which cleared a trait on the mounted root while React Native cloned it on the JS thread.
