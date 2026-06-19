#pragma once

#include <jsi/jsi.h>

#include <cstddef>
#include <cstdint>

using namespace facebook;

namespace worklets {

// Decodes the raw GCCell address backing `arrayBuffer`. The result is a plain
// number, NOT runtime- or thread-bound, so it can be stored and later poked from
// any thread (that is what makes cross-runtime detach possible).
//
// !!! UNSAFE !!! Hermes-only. Decodes a NaN-boxed pointer via VM-internal
// layout mirrors; pinned to Hermes' value encoding.
void *decodeArrayBufferCell(const jsi::ArrayBuffer &arrayBuffer);

// Writes the detached invariant (`data=null, size=0, attached=false`) into the
// JSArrayBuffer cell at `cell`, but ONLY if its current `{data, size, attached}`
// match the expected values - so a stale / GC'd / reused address is rejected
// instead of corrupted. Returns whether a match was found and written.
//
// Needs nothing runtime-bound: the cell may live in another runtime's heap, and
// the write lands there directly with no thread hop. Capture `expectedData` /
// `expectedSize` from the store BEFORE moving its bytes out.
//
// !!! UNSAFE !!! Hermes-only; cross-thread write races if the owning runtime is
// concurrently touching the cell. Not for production.
bool detachCellInPlace(void *cell, const uint8_t *expectedData, size_t expectedSize);

// Convenience: decode + detach the given ArrayBuffer (in its own runtime).
// Throws if the cell layout did not match.
void detachArrayBufferInPlace(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &arrayBuffer,
    const uint8_t *expectedData,
    size_t expectedSize);

} // namespace worklets
