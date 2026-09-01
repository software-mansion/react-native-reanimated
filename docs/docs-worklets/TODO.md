## Why

1. Skip it and go to examples already.
1. Explanation of the React Native model - native app on UI thread, main (RN) runtime on the JS thread.
2. Bottlenecks of the model - animations, gestures, driving GPU.
3. (optionally) Worklets are focused on seamless usage - less boilerplate than Web Workers; diligent comparison to Web Workers.

## Variations

4. Locking/unlocking the JS thread with Synchronizable and a native view.
5. Show two worklet runtimes sharing a thread.
6. Show two threads sharing a worklet runtime.

## Advanced use case

1. There are plenty of good use cases - typegpu, audio api, etc.
1. For this purpose we'll make a HTTP server that will be running natively but handled through a Worklet Runtime.
1. Linking with C++, creating a thread.
1. Linking Worklet Runtime and the server to the same thread? Maybe?

## Good practices

1. Re-use your runtimes.
2. Re-use your worklets.
3. Prefer arguments to closures.
4. Use granular objects to transfer.
5. Use Event Loop on the Worklet Runtime instead of the scheduling runtime.
6. Prefer async invocations.

## General ideas

- When referring to worklets as a library in the docs, always call it Worklets library, when to a number of individual worklets, as worklet functions. use it consistently across the docs and note it somewhere.
- Code snippets should have 2 forms 
    1. short one with only the relevant code (core code)
    2. long one with all imports and boilerplate ready for copy-pasting
    3. (optional) perhaps there should also be a separate section for outputs?-->
