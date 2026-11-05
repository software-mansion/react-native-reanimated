Fix `useScrollOffset` unregistering and re-registering its scroll handler each time React re-attaches its animated ref to the same view, which an inline callback ref does on every render.
