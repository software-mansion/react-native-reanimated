# Transferable ArrayBuffer — research & decisions

Context dump for the `@tshmieldev/transferableArrayBuffer` work (+ branches `API-1`,
`API-2`). Everything we figured out about making a zero-copy, JS-observable
"transferable" ArrayBuffer across the RN runtime and the UI worklet runtime on
Hermes. Environment: RN 0.85.2, Hermes, worklets is **Hermes-only** (JSC dropped).

---

## 0. The goal

A buffer you can:
- read/write from JS at **native speed** (real typed arrays, not a HostObject),
- **share across runtimes without copying** (RN ⟷ UI), and
- **`transfer()`** — move ownership so the source observably detaches
  (`byteLength === 0`, views empty).

The tension: **"real ArrayBuffer (fast)" and "JS-observable detach" fight each other
on stock Hermes.** Most of this doc is about that fight.

---

## 1. The core wall — Hermes caches `data()`/`size()` at construction

`jsi::ArrayBuffer(rt, std::shared_ptr<MutableBuffer>)` is the JSI way to wrap native
bytes in a real JS ArrayBuffer (zero-copy). But in Hermes
(`HermesRuntimeImpl::createArrayBuffer`, hermes.cpp):

```cpp
auto size = buffer->size();   // called ONCE
auto *data = buffer->data();  // called ONCE
vm::JSArrayBuffer::setExternalDataBlock(runtime_, lv.buf, data, size, buffer);
```

`data`/`size` are read out of your `MutableBuffer` **exactly once** and copied into
the VM cell's `data_`/`size_` fields. After that, every JS access (`view[i]`,
`view.length`, `byteLength`) reads the **VM cell**, never your `MutableBuffer` again.

Consequences:
- Mutating your C++ buffer (set size 0 / null) is **invisible** to JS.
- The JS-observable state (length, attached, data ptr) lives **in the VM cell**, not
  in anything we own.
- To make JS see a detach you MUST flip the VM cell's fields. Nothing else works.

This is why the original `Uint8View` HostObject was slow-but-correct: every `view[i]`
ran our C++ `get()` which re-checked a shared flag. A real typed array skips our code
entirely, so it's fast but can't honor a flag.

---

## 2. What we actually build

```
the bytes (std::vector<uint8_t>)
   ▲ owned by
TransferableArrayBuffer : jsi::MutableBuffer        <- our shared C++ store (shared_ptr)
   ▲ wrapped by                         ▲ also held by
jsi::ArrayBuffer(rt, store)        TransferableArrayBufferState : jsi::NativeState
 (real, fast, per-runtime)          (our readable handle back to the store)
```

- `TransferableArrayBuffer` (`SharedItems/TransferableArrayBuffer.{h,cpp}`): owns the
  vector, **inherits `jsi::MutableBuffer`** so it can back a real ArrayBuffer.
- Each runtime that materializes it wraps the **same** `shared_ptr` store in its **own**
  real `jsi::ArrayBuffer` → shared bytes across runtimes, no copy.
- `makeTransferableArrayBuffer()` builds the JS-facing thing (a real ArrayBuffer in
  API-1, a wrapper object in API-2), attaches the store as `NativeState`, tags it.
- Cross-runtime hop: `SerializableTransferableArrayBuffer` (in `Serializable.{h,cpp}`)
  carries the **`shared_ptr` (pointer), not the bytes**. `toJSValue` in the target
  runtime re-wraps the same store.

This is **Nitro's pattern** (see §5) plus a detach hack (§7).

---

## 3. Why `NativeState` (and not `tryGetMutableBuffer`)

We need to recover our C++ store from a JS ArrayBuffer (to serialize it, to detach it).
JSI gives no way to read the `shared_ptr<MutableBuffer>` back out of a `jsi::ArrayBuffer`
in general.

- Newer upstream JSI has `Runtime::tryGetMutableBuffer(const ArrayBuffer&)` /
  `arrayBuffer.tryGetMutableBuffer(rt)` — would let us skip NativeState.
- **NOT in RN 0.85.2** (`node_modules/react-native/ReactCommon/jsi/jsi/jsi.h` has no
  such method; it's newer upstream). Verified absent.

So we keep our own readable handle via `setNativeState` / `getNativeState` — exactly
what Nitro does. If RN ever ships `tryGetMutableBuffer`, NativeState can be dropped.

---

## 4. What we extend / inherit / mirror

| Thing | Relationship | Why |
|---|---|---|
| `jsi::MutableBuffer` | **inherit** (`TransferableArrayBuffer : public jsi::MutableBuffer`) | public JSI; lets a real ArrayBuffer wrap our bytes |
| `jsi::NativeState` | **inherit** (`TransferableArrayBufferState`) | public JSI; readable handle back to the store |
| `jsi::Runtime::getPointerValue` | **expose** via `struct PointerValueExposer : jsi::Runtime { using jsi::Runtime::getPointerValue; }` | it's `protected static`; a subclass `using`-decl republishes it. Class is abstract, never instantiated — we only name the static |
| Hermes `HermesPointerValue` | **mirror** (`struct HermesPointerValueMirror { void* vtable; std::atomic<uint32_t> refCount; uint64_t hermesValue; }`) | internal type (file-local in hermes.cpp). We lay out its fields by hand and `reinterpret_cast`. UNSAFE/ABI-pinned |
| Hermes `JSArrayBuffer` fields | **discover at runtime** (scan), don't mirror the struct | avoids needing the VM header / hardcoded offset |

Note `jsi::Runtime::PointerValue` is **protected**, so we can't inherit it externally —
that's why the mirror uses a bare `void* vtable` first member instead of
`: jsi::Runtime::PointerValue`.

---

## 5. How Nitro does it (react-native-nitro-modules) — and what it does NOT do

Source: `node_modules/react-native-nitro-modules/cpp/core/ArrayBuffer.{hpp,cpp}`,
`cpp/jsi/JSIConverter+ArrayBuffer.hpp`.

- `ArrayBuffer : public jsi::MutableBuffer`, two concrete subclasses:
  - `NativeArrayBuffer` (C++ owned/borrowed),
  - `JSArrayBuffer` (wraps a JS ref via a GC-aware `BorrowingReference`).
- `toJSI`: `jsi::ArrayBuffer(runtime, buffer)` + a `MutableBufferNativeState` holding the
  `shared_ptr` (for round-trip identity — same reason as our §3).
- `fromJSI`: if the JS object already carries the NativeState, unwrap the **same**
  `shared_ptr` (zero-copy round-trip).
- **`isOwner()` is NOT a detach flag.** It only answers "do I `free()` the bytes when my
  C++ wrapper is destroyed" (`NativeArrayBuffer::isOwner()` = has a deleteFunc;
  `JSArrayBuffer::isOwner()` = false). Easy to misread the name.
- **Nitro never detaches.** Zero `detach`/`eject`/`hermes::vm`. Lifetime is GC-driven:
  the retained `shared_ptr` keeps bytes alive as long as the JS ArrayBuffer lives.
- **Single runtime.** Nitro is JS⟷C++ on one runtime; it neither allows nor prevents
  multi-runtime use — the concept doesn't exist for it. "Owning vs non-owning" is about
  C++ free-on-destroy, not detach.

Takeaway: the mature library's answer to our hard part is **"don't detach; share."** Our
detach is the part Nitro deliberately doesn't attempt.

---

## 6. Lifetime — why the bytes don't get freed under us

C++ has no GC: a heap object dies when the last `shared_ptr` to it drops. The
`shared_ptr` you create in a factory function is a **local** — it dies when the function
returns. So something tied to the JS object must hold a `shared_ptr`:

- On Hermes, `jsi::ArrayBuffer(rt, buffer)` **already retains** the `shared_ptr`
  internally (the "external data context", per `setExternalDataBlock`'s contract: "the
  JS ArrayBuffer will share ownership ... released when GC finalizes it"). So passing to
  the ctor IS enough for lifetime.
- Our `NativeState` ALSO holds the `shared_ptr`, but **not for lifetime** — for
  recovery (§3). JSI gives no other way to read the buffer back out.

`operator=` on a `jsi::ArrayBuffer` reassigns the **C++ handle**, not the JS binding —
it can't make JS's existing reference point elsewhere. JS object identity can't be
transplanted; only mutating the existing VM cell changes what JS observes.

---

## 7. Detach — the VM internal, what's reachable, what's not

To make JS see detach we must flip the VM cell's `attached_`/`size_`/`data_`. Only
`vm::JSArrayBuffer::detach()` / `ejectBufferUnsafe()` do that officially — both live in
`hermes/VM/JSArrayBuffer.h` (private VM header).

### Reachability of each piece (from worklets, against **prebuilt** RN Hermes)

| Need | Reachable? | How |
|---|---|---|
| `vm::Runtime&` from `jsi::Runtime&` | ✅ public | `castInterface<facebook::hermes::IHermes>(&rt)->getVMRuntimeUnsafe()`. `IHermes` is in **`facebook::hermes`** (not `jsi`), declared in `jsi/hermes-interfaces.h` which **RN ships**. (We ended up NOT needing this — field-write doesn't need the runtime.) |
| `jsi::ArrayBuffer` → cell pointer | ⚠️ hack | `getPointerValue` (exposer) → mirror `HermesPointerValue` → decode NaN-boxed pointer (`raw & 0x0000FFFFFFFFFFFF`, low-48). UNSAFE, ABI/encoding-pinned |
| **`ejectBufferUnsafe` symbol** | ❌ **not exported** | Verified: `libhermesvm.so` dynsym has **zero** `JSArrayBuffer`/eject symbols (~631 curated symbols). It's a non-inline static member compiled hidden-visibility → can't link |
| VM headers (`JSArrayBuffer.h`, etc.) | ❌ not shipped | Only present in a Hermes-from-source checkout (e.g. `~/Developer/hermes`). RN prefab ships **no** VM headers |

So calling `ejectBufferUnsafe` would require **patching/rebuilding Hermes** → not
shippable. We don't.

### The workaround we shipped — header-free field-write by discovery

`SharedItems/HermesArrayBufferDetach.{h,cpp}`:

1. Decode the cell pointer from the NaN-boxed value (the only inherently-UNSAFE step).
2. We know the cell's current `data_` (pointer) and `size_` because we captured them
   from our store **before** moving the bytes out.
3. **Scan** a small window after the cell for the `{data_(8 bytes), size_(4 bytes)}`
   pair matching those known values + `attached_ == 1`. This **locates the fields with
   no hardcoded offset and no VM header**.
4. On an exact match, write the detached invariant: `data_=nullptr; size_=0;
   external_=false; attached_=false`. The external-data context (our retained
   `shared_ptr`) is left in place; released at GC.
5. No match → **throw**, don't corrupt memory. (The match requirement is the guard:
   wrong offset / wrong runtime → no match → throw.)

Why discovery instead of `sizeof(JSObject)` offset: we can't know that offset without
the VM header (JSObject has config-dependent inline slot storage). Matching known values
sidesteps it entirely and self-validates.

**Result:** compiles against **stock prebuilt Hermes** (only `jsi/jsi.h`). No VM header,
no unexported symbol, no source build.

**Still UNSAFE** (commented as such in the file): NaN-box decode + private-field write,
pinned to Hermes value-encoding + field order. A Hermes change can break it; it throws on
a missed match but a bad pointer decode could crash. Not production. Worklets is
Hermes-only so we removed the `IHermes` runtime guard (cold path, JSC unsupported).

---

## 8. `detached` flag — per-runtime, NOT shared

`transfer()` must be **runtime-specific**: detaching on RN must NOT detach on UI (and
vice versa). So the flag must NOT live in the shared C++ store (shared across runtimes).

Implementation: a plain JS **data property** `buf.detached` on the per-runtime JS object
(`false` at creation, set `true` by `transfer()` in that runtime). The JS object is
itself per-runtime, so the property is automatically per-runtime — no NativeState field,
no shared atomic. `byteLength` is likewise per-runtime (the field-write only hits the
calling runtime's cell).

---

## 9. Cross-runtime detach — NOT built, and why

Making a transfer in runtime A detach the **source cell in runtime B** (so B observes
`byteLength 0`) needs: a per-runtime registry of `jsi::WeakObject` cells + scheduling a
field-write onto **each other runtime's thread** (you can't write another runtime's cell
from this thread — Hermes has a **moving GC**; the cell can relocate). That has real
thread-safety + WeakObject-lifetime hazards and is unverifiable blind, so it's not
implemented.

What works instead: **per-runtime detach** (§8). The original spec examples assumed
cross-runtime detach (and a `runOnRNSync` that doesn't exist); the shipped examples log
actual values and use the runtime-specific semantics.

---

## 10. What's doable / not doable (summary)

Doable on stock prebuilt Hermes:
- Real `jsi::ArrayBuffer` over a `MutableBuffer` (native-speed typed arrays). ✅
- Zero-copy sharing across runtimes (same `shared_ptr` store). ✅
- Per-runtime `transfer()` + `detached` via the field-write hack (UNSAFE). ✅
- GC-correct lifetime (retained `shared_ptr`). ✅

Not doable / not done:
- Calling `ejectBufferUnsafe` (symbol not exported). ❌
- Including VM headers in a normal build (not shipped). ❌
- Cross-runtime detach propagation (hazardous, unbuilt). ❌
- JS-level `ArrayBuffer.prototype.transfer` / `resize` — **this Hermes doesn't register
  them** (only `byteLength`, `detached` getter, `slice`, static `isView`). So no pure-JS
  detach path. ❌

---

## 11. What each header gives you

- **`jsi/jsi.h`** (always shipped): `MutableBuffer`, `NativeState`, `ArrayBuffer(rt,
  buffer)` ctor, `ICast`/`castInterface`, `getPointerValue` (protected static). Enough
  for everything except the actual field flip.
- **`jsi/hermes-interfaces.h`** (shipped by RN, part of jsi): `facebook::hermes::IHermes`
  ICast interface → `getVMRuntimeUnsafe()` (returns `vm::Runtime*`), `getUniqueID`, etc.
  Lets you reach the VM runtime **without** VM headers. (We don't need it for field-write.)
- **`hermes/hermes.h`** (the public Hermes API, `API/hermes/`): `makeHermesRuntime`,
  `HermesRuntime` (public class), CDP/debugger, config. Does **not** expose
  `vm::Runtime&`, ArrayBuffer detach, or the `phv`/`vmcast` helpers — those are private,
  inside `HermesRuntimeImpl` in `hermes.cpp`.
- **`hermes/VM/JSArrayBuffer.h`** + other `hermes/VM/*` (source-only, NOT in RN prefab):
  the real `vm::JSArrayBuffer` (`detach`, `ejectBufferUnsafe`, `attached()`, `size()`,
  field layout), `vm::Runtime`, `vm::HermesValue`, `vmcast`, `Handle`. Needed for the
  "clean" eject; unavailable without building Hermes from source. The whole point of the
  §7 workaround is to avoid needing these.

Useful internals we read (in a hermes checkout, e.g. `~/Developer/hermes`):
- `API/hermes/hermes.cpp`: `phv()`, `arrayBufferHandle()`, `vmHandleFromValue()` (all
  private static in `HermesRuntimeImpl`), `createArrayBuffer` (the caching, §1),
  `getVMRuntimeUnsafe` impl (`return rt_.get();`), `tryGetMutableBuffer`,
  `serializeWithTransfer` (structured-clone transfer, `JSI_UNSTABLE`, not our model).
- `include/hermes/VM/JSArrayBuffer.h`: field order `uint8_t* data_; size_type size_(u32);
  bool external_; bool attached_;` and the `ejectBufferUnsafe` doc/warning.
- `API/jsi/jsi/hermes-interfaces.h`: `IHermes` UUID + `getVMRuntimeUnsafe`.

---

## 12. The two API shapes (branches)

Both: same shared store + same `HermesArrayBufferDetach` (byte-identical) + per-runtime
`detached` + header-free, Hermes-only. They differ only in the JS surface.

- **`API-1`** — `createTransferableArrayBuffer(n)` returns a **real `ArrayBuffer`**
  augmented with `transferable` (true), `detached`, and a `transfer(newByteLength?)`
  method. `new Uint8Array(buf)` directly. Serializer shares ArrayBuffers carrying
  `__transferable`.
- **`API-2`** — returns a **wrapper object**: `getArrayBuffer()` (lazily materializes +
  caches the real ArrayBuffer as `__buffer` so `transfer()` can detach the exact cell),
  `transfer()`, `detached`. Serializer shares objects carrying `__transferableWrapper`.
  Note: spec's `typeof buf === "TransferableArrayBuffer"` is impossible (JS `typeof`
  can't return custom strings) — we probe the `__transferableWrapper` marker instead.

Spec primitives that don't exist and how examples adapt: `runOnRNSync` (no sync UI→RN
call — use `runOnUISync` + async `scheduleOnRN`); custom `typeof` (use marker).

Branch base: `WIP` (046a57d) = shared real-ArrayBuffer + field-write detach, before the
API split.

---

## 13. Files

New (`packages/react-native-worklets/Common/cpp/worklets/SharedItems/`):
- `TransferableArrayBuffer.{h,cpp}` — store, NativeState, `make*`/`getStore`, `transfer()`
  host fn(s).
- `HermesArrayBufferDetach.{h,cpp}` — the UNSAFE field-write detach (byte-identical on
  both branches).

Touched: `Serializable.{h,cpp}` (`SerializableTransferableArrayBuffer`),
`SerializableFactory.{h,cpp}`, `NativeModules/JSIWorkletsModuleProxy.cpp` (host methods),
TS `WorkletsModule/{workletsModuleProxy,NativeWorklets.native}.ts`,
`memory/{serializable.native,serializable,types}.ts`, `index.ts`, and
`apps/common-app/.../EmptyExample.tsx` (runnable examples that log actual vs expected).

CMake + podspec glob `Common/cpp/worklets/**` recursively → new files build with no
build-list edits.

TS typechecks clean on both branches. **C++ is unverified in-agent** (no build / no VM
headers here) — needs a device build to confirm the UNSAFE detach actually lands.
