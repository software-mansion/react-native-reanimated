Fix a deadlock on Android when a worklet that `runOnUISync` runs on the JavaScript thread requests an animation frame while the UI thread runs a frame.
