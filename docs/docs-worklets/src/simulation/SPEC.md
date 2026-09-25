# Threading simulator: tick specification

The simulator drives real JavaScript snippets (generator functions, one `yield`
per visible line) on a small machine of threads. This document is the source of
truth for how one tick advances the machine. `machine.ts` follows it phase by
phase; the tests in `__tests__/` reference the numbered rules.

## Entities

### Thread

A core that executes lines. Thread 0 is the UI thread, thread 1 the JS thread,
further threads belong to Worker Runtimes and are created together with them.
Threads are visited in index order whenever order matters.

A thread holds, by default, the event loop of its default runtime and drives
it: when its stack is empty it takes the next job from that queue. To execute
that job it must also hold the runtime. The UI thread additionally has a
**native queue** for native jobs (`sendToUIThread`, button presses), which
need no runtime. Screen patches are not jobs: the UI thread applies them at
the end of the tick in which they were issued.

State: a stack of frames (the job being executed), the resources it holds,
the resource it waits for, the native queue (UI thread only), and an error
once a snippet throws.

### Resource

Anything with at most one holder per tick and a FIFO of requests. A thread
whose next step needs a resource it does not hold is **blocked, waiting for**
that resource. Kinds: runtime, event loop, Synchronizable.

State: holder, requests in order of issue.

#### Runtime

A JavaScript heap: its globals and the Shareables it hosts. A thread must
hold a runtime to execute JavaScript on it. Every runtime has a sibling event
loop that feeds it jobs.

Kinds:

- **RN Runtime**: default runtime of the JS thread. Always exists.
- **UI Runtime**: default runtime of the UI thread. Exists unless the
  simulation is configured without it, in which case the UI thread can only
  run native functions.
- **Worker Runtime**: created by `createWorkletRuntime`, together with its own
  thread, of which it is the default runtime.

A thread requests its default runtime whenever that runtime's queue has a
job to run. `runOnUISync`, `runOnRuntimeSync` and `Shareable.getSync` request
another thread's default runtime.

State (in addition to the resource state): globals, hosted Shareables, the
sibling event loop.

#### Event loop

Created together with a runtime. It owns that runtime's **queue** (a single
FIFO of jobs) and its **timers**. Its holder drives it: with an empty stack,
the holder takes the next job from the queue and then needs the runtime to
execute it. By default the holder is the runtime's default thread and never
changes. While another thread holds the runtime synchronously, the event loop
is effectively paused: its holder cannot execute the next job. There is no
separate microtask lane: jobs a runtime schedules for itself join the same
queue.

State (in addition to the resource state): queue, timers.

#### Synchronizable

A cell of shared memory that lives outside every runtime. `getDirty` and
`setDirty` read or write it without holding it. `getBlocking` and
`setBlocking` hold it for the step.

State (in addition to the resource state): value, last accessing thread.

### Shareable

A value that lives in its **host** runtime. It is not a resource of its own:
the host runtime is. `value` is readable and writable only by the thread
holding the host runtime. Every other runtime that created it or read it holds
a **guest** handle. `getSync` requests the host runtime; `getAsync` schedules an
internal job on the host runtime and returns a promise.

State: value, host, guests, last accessing thread.

### Job

A call of a snippet function with arguments. It waits in a queue, executes on
a thread as a stack of **frames**, or is **suspended** while it awaits a
promise.

Kinds, by how the job was created:

- **Entry**: `main`, queued on the RN Runtime at tick 0.
- **Scheduled**: `scheduleOnUI`, `scheduleOnRN`, `scheduleOnRuntime`,
  `runOnUIAsync`, `runOnRuntimeAsync`. Delivered to the target runtime's
  queue at the end of the tick in which the call ran. `sendToUIThread`
  delivers to the UI thread's native queue instead.
- **Timer callback**: appended by a firing timer to its runtime's queue.
- **Continuation**: a suspended job re-queued when its promise settles, or a
  `then` callback queued when the promise settles.
- **Input**: appended by an external event to the target runtime's queue, or
  to the UI thread's native queue for native functions.
- **Internal**: framework work such as reading a Shareable on its host.
  Shown in the queue but not in the code.

State: function, arguments, frames, origin.

### Frame

One activation of a snippet function inside a job. It records how many
visible lines have run and, for a frame created by a sync call, the resource
it acquired. A frame whose function is **hidden** (`'hidden'` directive)
executes for free inside the step of its caller. A frame whose function is
**native** (`'native'` directive) runs on a thread without needing a runtime
and is shown as native code.

### Timer

A pending `setTimeout` or `setInterval` in a runtime's event loop, due at a
point on the **clock**. The clock counts app time: every tick advances it by
`APP_MS_PER_TICK` (2 ms), so one 16 ms frame spans `TICKS_PER_FRAME` (8)
ticks regardless of how fast ticks are played. The viewer's tick rate only
sets the real-time pace, from `MIN_TICK_MS` (16 ms) upwards.

- **Timeout**: fires once. Its job keeps the timer's id.
- **Interval**: re-armed for `due + period` on every fire. It does not append
  a job while its previous job is still unstarted in the queue.

### Promise

The result handle of `runOnUIAsync`, `runOnRuntimeAsync` and
`Shareable.getAsync`. It settles when the scheduled job finishes, with that
job's return value, and the settlement is delivered to the requesting runtime
at the end of that tick. A job that `await`s an unsettled promise is
suspended; `then` callbacks become continuation jobs.

State: settled flag, value, waiting jobs, callbacks.

### Input

An external event (a button press) targeted at a queue and a tick. It appends
an input job to that queue in Intake.

## Tick

Tick 0 is the initial state: `main` is queued on the RN Runtime, nothing has
executed. Each later tick receives the clock value `now` and runs the phases
below in order.

### 1. Intake

1. Inputs due this tick are appended to their target queue.
1. Timers whose due time is not after `now` fire. Firing appends a job to the
   queue of the runtime that owns the timer. A `setTimeout` fires once. A
   `setInterval` is re-armed for `due + period` and does **not** append a job
   if its previous job is still waiting in the queue (unstarted). A suspended
   or running invocation does not prevent the next fire.

### 2. Arbitrate

For every resource, decide its holder for this tick:

1. A holder that is in the middle of a job on it (a frame has executed at
   least one line) keeps it.
1. Otherwise the oldest outstanding request wins. Requests are numbered when
   issued; a thread's implicit request for its default runtime is issued when
   that runtime's queue has a job to run.

The holder map is frozen for the tick, except for rule 4.4.

### 3. Dispatch

A thread with an empty stack and not in error takes the first job of its
native queue if it has one, otherwise, if it holds an event loop and the
runtime it belongs to, the first job of that event loop's queue, and pushes
its frame. A suspended job
re-entering the queue restores its whole stack.

### 4. Step

Each thread, in index order, does one of:

1. **Blocked**: the resource its next step needs is held by another thread. It
   executes nothing this tick. The snapshot reports `waitingFor` with the
   resource.
1. **Idle**: empty stack, nothing to do.
1. **Execute one line**: the top frame advances to its next `yield`. Hidden
   functions (`'hidden'` directive) and finished frames unwind for free within
   the same step. Effects of the line (scheduling, timers, memory access, logs,
   screen patches) are recorded immediately; cross-thread deliveries are
   collected in the thread's outbox.
1. **Same-tick grant**: when the executed line requests a resource whose
   holder is not mid-step, the request is granted at once. Threads visited
   later in the same tick see the resource as held (rule 4.1). A request on a
   busy resource waits for the next Arbitrate.
1. **Await**: when the line yields an `await` on an unsettled promise, the job
   is suspended after this line. On a settled promise the value is returned
   and execution continues next tick.
1. **Release**: a resource acquired by a sync call is released when the frame
   that acquired it unwinds; a Synchronizable held in blocking mode is
   released at the end of the step.

### 5. Deliver

Every thread's outbox is applied to the target queues, in thread order:

1. Scheduled jobs (`scheduleOn*`, `runOn*Async`, `scheduleOnRN` from any
   thread including the JS thread itself) are appended to the target runtime's
   queue; `sendToUIThread` jobs to the UI thread's native queue.
1. Promise resolutions settle the promise; suspended jobs awaiting it are
   appended to their runtime's queue; registered `then` callbacks are appended
   as jobs.
1. Screen patches issued by other threads are merged and applied to the
   screen by the UI thread, without a job.

Delivered jobs become visible in the queue of this tick's snapshot and can run
no earlier than the next tick's Dispatch.

### 6. Snapshot

The snapshot is derived from the committed state:

- Each thread reports the resources it holds, the resource it waits for, the
  line it executed, and its native queue if it has one.
- Each runtime reports its holder, its globals, the Shareables it hosts and
  the Shareable guests it holds.
- Each event loop reports its holder and its contents: queued jobs, pending
  timers (by due time), suspended jobs (marked `awaiting`).
- Synchronizables and Shareables report which thread accessed them this
  tick.
- Runtimes, event loops, Synchronizables and Shareables created this tick
  are not listed yet; they appear from the next tick on.
- Logs are attributed to the thread and tick in which the line ran; the
  viewer shows them one tick later.

## Invariants

- I1: a resource has at most one holder per tick.
- I2: a blocked thread emits no `exec` event in that tick.
- I3: queues change only in Intake, Dispatch and Deliver.
- I4: a job's lines execute in order, one per tick, except free unwinding of
  finished and hidden frames.
- I5: at most one unstarted job per `setInterval` timer is queued at a time.
- I6: the snapshot of tick N is a pure function of the state after Deliver of
  tick N.
