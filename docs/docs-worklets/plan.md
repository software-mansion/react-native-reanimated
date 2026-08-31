## Why

1. Skip it and go to examples already.
1. Explanation of the React Native model - native app on UI thread, main (RN) runtime on the JS thread.
2. Bottlenecks of the model - animations, gestures, driving GPU.
3. (optionally) Worklets are focused on seamless usage - less boilerplate than Web Workers; diligent comparison to Web Workers.

## Your first worklet

1. Console.log on another runtime, RN Runtime, UI Runtime, Worklet Runtime - using `getCurrentThreadId` to show the difference.
   1. Add an interactive example with several buttons that shows how the threads are changing when you dispatch a worklet on a given runtime/thread.
2. setState on another runtime - explaining the gap and where the memory resides, fix with scheduleOnRN
3. Running heavy computation on another thread - calculating Zeta function roots.
   1. Obtain data with async.
   2. Obtain data with Shareable.
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

<!--idea: when referring to worklets as a library in the docs, always call it Worklets library, when to a number of individual worklets, as worklet functions. use it consistently across the docs and note it somewhere-->
