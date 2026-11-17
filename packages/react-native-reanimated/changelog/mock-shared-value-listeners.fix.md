Fix the Jest mocks of `useSharedValue` and `useDerivedValue` to implement `addListener`, `removeListener` and `modify`, so that libraries which subscribe to shared values no longer crash under Jest.
