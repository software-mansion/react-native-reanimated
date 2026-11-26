Fix a data race between the UI thread reading a view and the JS thread cloning it, which could crash an app that animates a view while React re-renders it.
