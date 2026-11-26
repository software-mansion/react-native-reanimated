Fix `useEvent` changing native event registrations during render, so a render that React discards or repeats no longer registers the handler.
