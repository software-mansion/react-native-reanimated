# Synchronizing data

In the [previous chapter](/docs/tutorials/using-event-loop) we learned some theory about event
loops, which we'll now put to use.

In this chapter, we'll more advanced patterns of synchronizing data between JavaScript Runtimes,
where asynchronous returns wouldn't be sufficient.

## Getting the result of a periodic task

Previous examples showed us how to return the result of a singular worklet function at the point of
its invocation. What if we had a long-running task, yielding results continuously, but we wanted to
poll the data only occasionally?

We'll explore how can we obtain the value of the local `result` value and pass it to the RN Runtime.

## With callbacks — anti-pattern

We could use the same pattern as
[returning results with a callback](/docs/tutorials/returning-results#with-callbacks).

**Do not do this!** This will schedule a cross-runtime call every 10ms that updates our
`polledResult` value — even if we don't need it at the given moment. **For best multi-threading
performance, it's best to minimize the amount of cross-thread (cross-runtime) operations.**

## With the global object — anti-pattern

The simplest approach would be to store our result on the global object of the Worker Runtime.

Then poll it with another function call, either synchronously or asynchronously:

However, this code doesn't scale well if we want to synchronize with multiple variables. It's
generally a bad practice to use the global object like this. It's still better than the previous
anti-pattern, but please **use it as a last resort escape hatch.**

## With a Synchronizable

A [Synchronizable](/docs/memory/synchronizable) is a memory primitive in the Worklets library, that
lives outside of any Runtime's JavaScript heap. Reading it and writing to it doesn't require making
cross-runtime call and is the cheapest option of synchronizing the data between Runtimes.

You can find detailed documentation for Synchronizable on its
[API reference](/docs/memory/synchronizable), but for the sake of this example we'll stick to its
`getDirty`
and `setBlocking` methods. `getDirty` method simply returns the value of the Synchronizable, without
waiting for any
transactions on it to complete. It's safe to use it here as we don't care about reading the value
mid-transaction.
`setBlocking` method updates the value atomically, blocking other writers from modifying it until
the transaction is complete.

Even though the Synchronizable was created on the RN Runtime, the value actually lives in the native
heap and both Runtimes (threads) can access it with little overhead and without blocking one
another.

For this simple case, we can even optimize our code further and use a
[Synchronizable with a fixed type](/docs/memory/synchronizable#synchronizable-fixed),
which exposes `setDirty` method and is generally faster than a general
[Synchronizable with a dynamic type](/docs/memory/synchronizable#synchronizable-dynamic)
that we just used.

This approach works best when you poll the data frequently or from multiple Runtimes at once.

The downside is the fact, that every call of `setDirty` or `setBlocking` have to cross the
JavaScript - native boundary and store the value there. This is particularly costly when it comes to
storing non-primitive types, like objects or arrays - which require
[serialization](/docs/memory/serializable)
on each boundary crossing.

## With a Shareable

A [Shareable](/docs/memory/shareable) is another memory primitive, but this contrary to the
Synchronizable,
it lives on a designated Runtime, called the Host Runtime. Reading it on other Runtimes, called
Guest Runtimes,
means accessing it on its Host Runtime, either synchronously or asynchronously. It's similar in
principle to the [global object approach](#with-the-global-object--anti-pattern), but with a layer
of useful
encapsulation.

To create a Shareable, we have to explicitly state the Host Runtime by its
[Runtime ID](/docs/concepts/runtimeKinds#worklet-runtime).

```js
const worker = createWorkletRuntime();
const result = createShareable(worker.runtimeId, -1);
```

Shareable is an *asymmetric* type, meaning it has a different structure on the Host Runtime and on
Guest Runtimes. On the Host Runtime, you can access the value it holds directly as its `value`
property. On Guest Runtimes you must use its synchronous or asynchronous methods.

This approach works best when the Host Runtime updates the value often and the value is not a
primitive,
and Guest Runtimes read it only ever so often.

## Mixing Shareables with Synchronizables

Shareables and Synchronizables are a powerful tool when combined. A Synchronizable can keep
information about
the state of the Shareable, i.e. whether it has been updated, so the Guest Runtime can avoid reading
it if it
hasn't changed.

This is how [Reanimated Shared Values](https://docs.swmansion.com/reanimated/docs/shared-values) are
implemented.

A Shareable hosted on the UI Runtime stores the value of the animation progression. When the RN
Runtime wants
to read the value to synchronize with the UI — i.e. for component's first render — it checks a
Synchronizable
dirtiness flag attached to the Shared Value, to see if the UI Runtime has updated the value. If not,
it returns the last
read value, which was cached locally on the RN Runtime.

If the value has been updated — the Synchronizable flag reports its dirty state — only then does the
RN Runtime
synchronously preempts the UI Runtime from the UI thread to read the value directly from the Host
Runtime. All this
flow is visualized by the simulation below.

## Future tutorials

In the future chapters we'll learn how to integrate with C++ API of the Worklets library for
use-cases that can't be covered with just JavaScript code.
