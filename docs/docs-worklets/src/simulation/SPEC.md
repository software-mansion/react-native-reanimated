# Threading simulator: tick specification

The simulator drives real JavaScript snippets (generator functions, one `yield`
per visible line) on a small machine of cores. This document is the source of
truth for how one tick advances the machine. `machine.ts` follows it phase by
phase; the tests in `__tests__/` reference the numbered rules.

## Entities

- **Core**: a thread. Core 0 is the UI thread, core 1 the JS thread, further
  cores belong to Worker Runtimes. A core may have a **runtime** (a JavaScript
  runtime it executes by default). The UI thread can be configured without one.
- **Job**: a call of a snippet function with arguments, waiting in a core's
  **queue** (one FIFO per core) or executing on that core as a stack of
  **frames**. There is a single queue per core; there is no microtask lane.
- **Timer**: a pending `setTimeout` or `setInterval` on a core. Delays are
  converted to ticks at 16 ms per tick, minimum one tick.
- **Claim**: a synchronous acquisition of another core's runtime
  (`runOnUISync`, `runOnRuntimeSync`, `Shareable.getSync`). A claim is a frame
  tagged with the runtime it needs.
- **Promise**: the result handle of `runOnUIAsync`, `runOnRuntimeAsync` and
  `Shareable.getAsync`. A job that `await`s an unsettled promise is
  **suspended**: it leaves the core and re-enters the queue when the value
  arrives.
- **Cell**: shared memory outside every runtime. A Synchronizable has no owner;
  a Shareable has a host runtime and its `value` is accessible only while the
  stepping core holds that runtime.
- **Input**: an external event (a button press) targeted at a core and a tick.

## Tick

Tick 0 is the initial state: `main` is queued on the JS thread, nothing has
executed. Each later tick runs the phases below in order. Cores are always
visited in index order (UI thread, JS thread, workers in creation order).

### 1. Intake

1. Inputs due this tick are appended to their target core's queue.
1. Timers due this tick fire. Firing appends a job to the timer's core queue.
   A `setTimeout` fires once. A `setInterval` is re-armed for `now + period`
   and does **not** append a job if its previous job is still waiting in the
   queue (unstarted). A suspended or running invocation does not prevent the
   next fire.

### 2. Arbitrate

For every runtime, decide its **holder** for this tick:

1. If no other core has a claim on it, or the owner is in the middle of a job
   (a frame on the owner has executed at least one line), the owner holds it.
1. Otherwise, if a claimant is already executing on it, that claimant keeps it.
1. Otherwise the oldest claim wins (claims are numbered when issued).

The holder map is frozen for the tick, with one exception (rule 4.5).

### 3. Dispatch

A core whose stack is empty, whose runtime is not claimed by another core, and
which is not in error, takes the first job of its queue and pushes its frame.
A suspended job re-entering the queue restores its whole stack.

### 4. Step

Each core, in index order, does one of:

1. **Blocked (preempted)**: its runtime is held by another core. It executes
   nothing this tick; the snapshot reports `blockReason: 'preempted'` and the
   holder as `waitingFor`.
1. **Blocked (waiting)**: its top frame is a claim on a runtime it does not
   hold. It executes nothing; `blockReason: 'acquire'`, `waitingFor` is the
   runtime.
1. **Idle**: empty stack, nothing to do.
1. **Execute one line**: the top frame advances to its next `yield`. Hidden
   functions (`'hidden'` directive) and finished frames unwind for free within
   the same step. Effects of the line (scheduling, timers, memory access, logs,
   screen patches) are recorded immediately; cross-core deliveries are
   collected in the core's outbox.
1. **Same-tick claim grant**: when the executed line issues a claim on a
   runtime whose owner has no started job and which nobody else holds, the
   claim is granted at once. Cores visited later in the same tick see the
   runtime as held (rule 4.1). A claim on a busy runtime waits for the next
   Arbitrate.
1. **Await**: when the line yields an `await` on an unsettled promise, the job
   is suspended after this line. On a settled promise the value is returned
   and execution continues next tick.

### 5. Deliver

Every core's outbox is applied to the target queues, in core order:

1. Scheduled jobs (`scheduleOn*`, `runOn*Async`, `sendToUIThread`,
   `scheduleOnRN` from any core including the JS thread itself) are appended
   to the target core's queue.
1. Promise resolutions settle the promise; suspended jobs awaiting it are
   appended to their core's queue; registered `then` callbacks are appended as
   jobs.

Delivered jobs become visible in the queue of this tick's snapshot and can run
no earlier than the next tick's Dispatch.

### 6. Snapshot

The snapshot is derived from the committed state:

- `heldRuntimes` of a core is the set of runtimes whose holder it is, plus the
  runtime it executed on this tick.
- Queue contents list, in order: queued jobs, pending timers (by due tick),
  suspended jobs (marked `awaiting`).
- Runtimes and cells created this tick are not listed yet; they appear from
  the next tick on.
- Memory cells report which core accessed them this tick.
- Logs are attributed to the core and tick in which the line ran; the viewer
  shows them one tick later.

## Invariants

- I1: a runtime has exactly one holder per tick.
- I2: a blocked core emits no `exec` event in that tick.
- I3: queues change only in Intake, Dispatch and Deliver.
- I4: a job's lines execute in order, one per tick, except free unwinding of
  finished and hidden frames.
- I5: at most one unstarted job per `setInterval` timer is queued at a time.
- I6: the snapshot of tick N is a pure function of the state after Deliver of
  tick N.
