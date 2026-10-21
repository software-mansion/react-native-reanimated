# Returning results

In the [previous chapter](/docs/tutorials/your-first-worklet) we dispatched some console logs to
other Runtimes. However, logging itself is not particularly useful.

In this chapter we'll learn how to obtain execution results from dispatched worklet functions.

## Synchronously

Simplest way of returning values. [`runOnUISync`](/docs/threading/runOnUISync) and
[`runOnRuntimeSync`](/docs/threading/runOnRuntimeSync) functions return the result of a worklet
function directly to the invoking Runtime:

However, it's not particularly useful to dispatch `foo` synchronously, as we could've just run on
the same Runtime, by invoking foo:

// TODO: convert this one to a threading simulation

```js
const result = foo(); // 42
```

Therefore, we have to return it asynchronously. We'll explore when it's useful to actually return a
value synchronously in future sections.

## Asynchronously

For asynchronous returns, i.e. results of complex calculations, you can use
[`runOnUIAsync`](/docs/threading/runOnUIAsync) and
[`runOnRuntimeAsync`](/docs/threading/runOnRuntimeAsync) functions. They return an awaitable
promise.

Remember that [`scheduleOnUI`](/docs/threading/scheduleOnUI) and
[`scheduleOnRuntime`](/docs/threading/scheduleOnRuntime) functions do not return a value.

The scheduling runtime is free to keep executing JavaScript code until you await the returned
promise. In this example we dispatched the invocations on `complexTask` before awaiting - to execute
them concurrently. While the RN Runtime awaits, its thread is free to run other tasks.

## With callbacks

Often times, we'll want to return a value through a callback, i.e. update our app's React state
based on a result of a worklet function executed on another Worklet Runtime. You might be tempted to
write something like this:

// TODO: convert it to a threading simulation that actually visualizes a crash

```js
const worker = createWorkletRuntime();

// CORE CODE START
function Component() {
    const [state, setState] = useState();
    // code ...
    scheduleOnRuntime(worker, () => {
        const result = doImportantStuff();
        setState(result); // crash!
    });
    // code ...
// CORE CODE END
}
```

This is a common pitfall, and to understand why it crashes, we have to look how it looks in the
memory of our app.

Diagram: showing where `result`, `setState` lives and how threads interact here

Because `setState` is passed to the Worklet Runtime as a pointer to the callback, we can't just
invoke it. We have to dispatch it back on the RN Runtime with
[`scheduleOnRN`](/docs/threading/scheduleOnRN) function.

Alternatively, you can use a promise and `runOnRuntimeAsync` function:

Now that we know how to return the values, let's learn how to use a Worklet Runtime's event loop in
the next chapter.
