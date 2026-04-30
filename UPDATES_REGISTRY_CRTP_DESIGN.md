# Design: Move `UpdatesRegistry` to CRTP

Status: proposal, not scheduled.
Prereq: locking refactor in `@matipl01/fix-animated-props-update-race` is merged.

## Goal

Eliminate runtime polymorphism from `UpdatesRegistry`. The hierarchy currently uses one virtual call site (`remove_`) and one heterogeneous container (`UpdatesRegistryManager::registries_`). Both exist for the abstract reason "registries can be added," but `addRegistry` has had exactly three call sites — all in the constructor, in fixed priority order — for the entire life of the manager. The open/closed shape pays a real cost (virtual dispatch, vtable per registry, header indirection) for a flexibility nobody is using.

CRTP keeps the base's locking template intact while moving dispatch to compile time.

## Current shape (post-locking-refactor)

```cpp
class UpdatesRegistry {
 public:
  void remove(Tag tag) {                 // non-virtual, locks
    std::lock_guard<std::mutex> lock{mutex_};
    remove_(tag);                        // virtual call
  }
 protected:
  virtual void remove_(Tag tag) = 0;     // pure virtual
  // shared helpers (caller-locks)
  // shared state: mutex_, updatesRegistry_, updatesBatch_, propsToRevertMap_
};

class AnimatedPropsRegistry : public UpdatesRegistry { ... };
class CSSAnimationsRegistry : public UpdatesRegistry { ... };
class CSSTransitionsRegistry : public UpdatesRegistry { ... };

class UpdatesRegistryManager {
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;  // heterogeneous
};
```

The manager iterates `registries_` in `handleNodeRemovals`, `collectProps`, `hasPropsToRevert`, and `collectPropsToRevertBySurface`. `remove_` is the only true override; the rest hit base methods identically.

## Proposed shape

Two changes in lockstep — CRTP alone is not enough, because a CRTP base templated on `Derived` is a different type per derived, so `registries_` would no longer compile.

### 1. CRTP base

```cpp
template <typename Derived>
class UpdatesRegistry {
 public:
  void remove(Tag tag) {
    std::lock_guard<std::mutex> lock{mutex_};
    static_cast<Derived*>(this)->remove_(tag);   // compile-time dispatch
  }

  bool isEmpty() const {
    std::lock_guard<std::mutex> lock{mutex_};
    return static_cast<const Derived*>(this)->isEmpty_();
  }

  // Non-customized public methods stay as plain non-template member fns
  // on the base — get(), flushUpdates(), getPendingUpdates(), collectProps(),
  // hasPropsToRevert(), collectPropsToRevert(). They only touch base state.

 protected:
  mutable std::mutex mutex_;
  RegistryMap updatesRegistry_;
  UpdatesBatch updatesBatch_;
  // helpers (caller-locks): addUpdatesToBatch, setInUpdatesRegistry,
  // removeFromUpdatesRegistry, getUpdatesFromRegistry
};

class AnimatedPropsRegistry : public UpdatesRegistry<AnimatedPropsRegistry> {
  friend class UpdatesRegistry<AnimatedPropsRegistry>;
 private:
  void remove_(Tag tag);
  bool isEmpty_() const { return updatesRegistry_.empty(); }
};
```

`remove_` and `isEmpty_` become private non-virtual methods on each derived class; the base reaches them via `static_cast`. The `friend` declaration lets the base see the private customization points without exposing them.

### 2. Replace `registries_` with three concrete fields

```cpp
class UpdatesRegistryManager {
  std::shared_ptr<CSSTransitionsRegistry> cssTransitions_;
  std::shared_ptr<AnimatedPropsRegistry>  animatedProps_;
  std::shared_ptr<CSSAnimationsRegistry>  cssAnimations_;
};
```

The manager's iterating methods become explicit, in priority order:

```cpp
void UpdatesRegistryManager::handleNodeRemovals(const RootShadowNode &root) {
  for (auto &[tag, family] : removableShadowNodes_) {
    if (family->getAncestors(root).empty()) {
      cssTransitions_->remove(tag);
      animatedProps_->remove(tag);
      cssAnimations_->remove(tag);
      staticPropsRegistry_->remove(tag);
    }
    // ...
  }
}

PropsMap UpdatesRegistryManager::collectProps() {
  PropsMap m;
  cssTransitions_->collectProps(m);
  animatedProps_->collectProps(m);
  cssAnimations_->collectProps(m);
  return m;
}
```

`addRegistry()` is deleted. The three registries are passed to the manager at construction.

## Migration plan

1. Convert `UpdatesRegistry` to a template; update each derived class to inherit from `UpdatesRegistry<Derived>` and `friend` the base.
2. Rename `remove_` → keep `remove_`, but make it private and non-virtual on each derived. Same for any other virtual customization point (currently only `isEmpty`, if we want to keep it customizable; otherwise drop and let each derived define `isEmpty()` directly).
3. Replace `UpdatesRegistryManager::registries_` with three concrete `shared_ptr` fields. Inject them in the constructor (the proxy already owns the only instances).
4. Inline iteration in `handleNodeRemovals`, `collectProps`, `hasPropsToRevert`, `collectPropsToRevertBySurface`. Delete `addRegistry`.
5. Run the full test matrix on iOS and Android (the `#ifdef ANDROID` paths inside the base — `propsToRevertMap_`, `updatePropsToRevert` — must still compile and link inside the template).

## Tradeoffs

**Wins**
- No virtual dispatch. `remove`, `isEmpty`, and any future customization points become inlinable.
- No vtable per registry instance (24 bytes × 3, irrelevant in isolation but a clean removal).
- The "set of registries" becomes statically visible. New developers reading the manager see three named fields instead of a vector populated by side effect from the proxy constructor.
- `addRegistry` and the implicit registration ordering disappear — order is explicit at the call sites.
- `friend` + private `remove_` makes it impossible to call the customization point from outside the class hierarchy.

**Costs**
- `UpdatesRegistryManager.h` now must include `AnimatedPropsRegistry.h`, `CSSAnimationsRegistry.h`, `CSSTransitionsRegistry.h`. Today only the proxy and commit hook include the manager; both already pull these in transitively, so the practical build-time cost is zero. Future consumers would inherit the coupling.
- `UpdatesRegistry` becomes a header-only template. All implementation moves from `UpdatesRegistry.cpp` into the header (or an `.inl`). Compile time goes up modestly for any TU touching a registry header.
- The Android-only `#ifdef` block (`hasPropsToRevert`, `collectPropsToRevert`, `updatePropsToRevert`, `propsToRevertMap_`) now lives in the template. Confirm `react_native_assert` and folly headers behave under template instantiation; this is the most likely landmine.
- Adding a fourth registry someday means editing four manager methods plus the constructor, instead of one `addRegistry()` call. Trivial in absolute terms, but the open/closed property is gone — and the TODO comment implying future extensibility should be removed at the same time so it doesn't lie.
- Tests that currently mock a registry via `class FakeRegistry : public UpdatesRegistry` would need to either become a `FakeRegistry : public UpdatesRegistry<FakeRegistry>` (still possible) or be replaced with concrete-type fakes. Worth checking whether such mocks exist before committing.

## Out of scope

- Changing what each registry *does*. This is a structural refactor only.
- Changing the locking contract. The locking refactor in `@matipl01/fix-animated-props-update-race` is the source of truth for which methods lock; CRTP preserves that exactly.
- Removing the `UpdatesRegistry` shared base entirely. The shared state (mutex, `updatesRegistry_`, `updatesBatch_`, helpers, propsToRevert bookkeeping) is real shared logic; CRTP-flavored inheritance is the right tool to share it.

## When to do this

After the locking refactor lands and has soaked for at least one release. The bug fix is the load-bearing change; this is a follow-up that improves the shape of the code without changing behavior. Doing both at once would make the locking PR harder to review and bisect.

## Recommendation

Do it, but as a deliberate separate PR with no behavioral changes. Keep the diff structural — no method body edits beyond what's required to move from `virtual void remove_` to `static_cast<Derived*>(this)->remove_`. Reviewer should be able to read the PR as "three identity-preserving renames plus deletions of the vector, virtual, and `addRegistry`."
