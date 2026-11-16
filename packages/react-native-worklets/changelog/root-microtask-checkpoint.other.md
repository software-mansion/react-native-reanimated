Only the outermost task on a Worklet Runtime decides whether to drain microtasks, so a task nested inside a running worklet no longer drains the microtask queue in the middle of the calling JS.
