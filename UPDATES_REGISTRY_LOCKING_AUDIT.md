# UpdatesRegistry locking audit

Audit of mutex usage across `UpdatesRegistry`, its subclasses (`AnimatedPropsRegistry`, `CSSAnimationsRegistry`, `CSSTransitionsRegistry`), and their callers.

## Two independent mutexes

The codebase has two unrelated mutexes that are easy to confuse:

- `UpdatesRegistryManager::mutex_` — protects manager-level state (`registries_`, `removableShadowNodes_`, etc.).
- `UpdatesRegistry::mutex_` — one instance per concrete registry; protects that registry's `updatesRegistry_`, `updatesBatch_`, `propsToRevertMap_`, plus subclass-specific state.

**Locking the manager does not lock the registries.** Multiple bugs below stem from code that holds the manager mutex and assumes that protects per-registry state.

## Existing locking convention

Mixed and undocumented:

- A few public methods on `UpdatesRegistry` self-lock (`get`, `getPendingUpdates`, `collectProps`, `collectPropsToRevert`).
- Other public methods rely on the caller having taken `UpdatesRegistry::lock()` externally (`flushUpdates`, the protected setters used through subclass overrides).
- `UpdatesRegistry::lock()` is exposed publicly and returns a `std::lock_guard` so callers can opt into the caller-locks path.
- Protected helpers (`addUpdatesToBatch`, `setInUpdatesRegistry`, `removeFromUpdatesRegistry`, `getUpdatesFromRegistry`) all expect the caller to hold the lock.

The result is that some call sites correctly grab `<registry>_->lock()` before mutating state, and others don't — with no compile-time hint about which is required.

## Confirmed bugs

### 1. `AnimatedPropsRegistry::remove()` and `CSSAnimationsRegistry::remove()` race against JS-thread updates

- `AnimatedPropsRegistry::remove` (`AnimatedPropsRegistry.cpp:32-35`) erases from `updatesRegistry_` and `timestampMap_` with no internal lock.
- `CSSAnimationsRegistry::remove` (`CSSAnimationsRegistry.cpp:59-63`) modifies its own `registry_` and calls `removeFromUpdatesRegistry()` (a caller-locks helper) with no internal lock.
- `CSSTransitionsRegistry::remove` (`CSSTransitionsRegistry.cpp:45-50`) — same shape.

These overrides are called from `UpdatesRegistryManager::handleNodeRemovals` (`UpdatesRegistryManager.cpp:67-69`), itself called from `ReanimatedMountHook.cpp:39-40`. The mount hook holds **the manager's** mutex, not the registries'. Meanwhile JS-thread paths like `AnimatedPropsRegistry::update` (correctly) take the registry's own lock at `ReanimatedModuleProxy.cpp:176`.

So the mount-thread `remove` runs concurrently with the JS-thread `update`, racing on `updatesRegistry_`, `updatesBatch_`, and `timestampMap_`. **High-impact bug** — every node removal path is affected.

### 2. `UpdatesRegistry::hasPropsToRevert()` (Android)

`UpdatesRegistry.cpp:115-117` reads `propsToRevertMap_` with no lock. Caller path `ReanimatedModuleProxy.cpp:638` → `UpdatesRegistryManager.cpp:89-96` → unlocked registry method. Meanwhile `propsToRevertMap_` is written inside `updatePropsToRevert` (called from `setInUpdatesRegistry` / `removeFromUpdatesRegistry`) and cleared by `collectPropsToRevert`. Race confirmed; consequence is a stale boolean read.

### 3. `UpdatesRegistry::isEmpty()` and `CSSAnimationsRegistry::isEmpty()` / `CSSTransitionsRegistry::isEmpty()`

Read `updatesRegistry_` (and subclass-specific state) without locking. Only caller in code today is the debug status string at `ReanimatedModuleProxy.cpp:1378-1381`, so impact is low — but still a data race per the C++ memory model.

## Methods that look unlocked but are actually safe (caller-locking convention)

- `UpdatesRegistry::flushUpdates` — every call site takes the registry lock externally before calling: `ReanimatedModuleProxy.cpp:698`, `:705`, `:711`.
- `AnimatedPropsRegistry::update` — caller takes `animatedPropsRegistry_->lock()` at `ReanimatedModuleProxy.cpp:176` (with a comment referencing issue #9303).
- `AnimatedPropsRegistry::getUpdatesOlderThanTimestamp` / `removeUpdatesOlderThanTimestamp` — caller takes the registry lock at `ReanimatedModuleProxy.cpp:538`.
- `CSSAnimationsRegistry::apply` / `update` — caller takes `cssAnimationsRegistry_->lock()` at `ReanimatedModuleProxy.cpp:497`, `:506`, `:711`.
- `CSSTransitionsRegistry::run` / `update` — caller takes `cssTransitionsRegistry_->lock()` at `ReanimatedModuleProxy.cpp:518`, `:526`, `:698`.

These are not bugs today, but the contract is implicit. A future caller forgetting to lock would silently introduce a race. The mixed convention also makes code review harder — half of the public surface self-locks, half doesn't.

## Deadlock check

No call site invokes `get()` (which self-locks) while already holding the same registry's `lock()`. No deadlock risk found in the current code.

## Recommendation

Encapsulate locking inside each registry. Make every public method self-lock; remove the public `lock()` API entirely. Protected helpers (`addUpdatesToBatch`, `setInUpdatesRegistry`, `removeFromUpdatesRegistry`, `getUpdatesFromRegistry`) remain non-locking, since they are called from subclass public methods that already hold the lock. This:

- Closes the race in `remove` overrides (the highest-impact bug).
- Closes the unlocked reads in `isEmpty` and `hasPropsToRevert`.
- Makes the contract uniform and self-documenting — there is no longer a "caller must lock" public method.
- Eliminates the footgun where forgetting to call `<registry>_->lock()` silently produces a data race.
