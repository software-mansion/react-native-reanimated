#include <worklets/SharedItems/HermesArrayBufferDetach.h>

#include <atomic>
#include <cstdint>
#include <cstring>

namespace worklets {

namespace {

// Exposes the protected static `jsi::Runtime::getPointerValue`. Abstract, never
// instantiated; we only name the inherited static member.
struct PointerValueExposer : jsi::Runtime {
  using jsi::Runtime::getPointerValue;
};

// !!! UNSAFE !!! Mirror of Hermes' internal `HermesPointerValue`
// (`ManagedValue<PinnedHermesValue>`): a `PointerValue` base (one vtable pointer)
// followed by an atomic refcount and the 64-bit NaN-boxed `HermesValue`. We don't
// inherit `jsi::Runtime::PointerValue` (it is protected) - we lay out the vtable
// pointer by hand. Must match the linked Hermes ABI.
struct HermesPointerValueMirror {
  void *vtable;
  std::atomic<uint32_t> refCount;
  uint64_t hermesValue;
};

} // namespace

void *decodeArrayBufferCell(const jsi::ArrayBuffer &arrayBuffer) {
  // !!! UNSAFE !!! Decodes the GCCell pointer from the NaN-boxed value. Assumes
  // the classic Hermes encoding where a pointer lives in the low 48 bits.
  const auto *pointerValue = PointerValueExposer::getPointerValue(arrayBuffer);
  const uint64_t raw = reinterpret_cast<const HermesPointerValueMirror *>(pointerValue)->hermesValue;
  return reinterpret_cast<void *>(raw & 0x0000FFFFFFFFFFFFULL);
}

bool detachCellInPlace(void *cellPtr, const uint8_t *expectedData, size_t expectedSize) {
  auto *cell = static_cast<char *>(cellPtr);

  // `JSArrayBuffer`'s own fields are declared right after its `JSObject` base as:
  //   uint8_t *data_; uint32_t size_; bool external_; bool attached_;
  // We do NOT hardcode the offset. We scan a small window after the cell for the
  // {data_, size_} pair matching the values we know this cell holds, and only
  // write if we find an exact, currently-attached match. A miss returns false -
  // which also rejects a stale / GC'd / reused address.
  constexpr size_t kMaxScanBytes = 256;
  for (size_t offset = 0; offset + 16 <= kMaxScanBytes; offset += sizeof(void *)) {
    char *fields = cell + offset;

    const uint8_t *data;
    uint32_t size;
    std::memcpy(&data, fields, sizeof(data));
    std::memcpy(&size, fields + sizeof(void *), sizeof(size));
    const uint8_t external = static_cast<uint8_t>(fields[sizeof(void *) + sizeof(uint32_t)]);
    const uint8_t attached = static_cast<uint8_t>(fields[sizeof(void *) + sizeof(uint32_t) + 1]);

    // Our buffers are always external (backed by a MutableBuffer), so requiring
    // external_ == 1 alongside the {data_, size_} match rejects a coincidental
    // false match before we write attached_.
    if (data == expectedData && size == static_cast<uint32_t>(expectedSize) && external == 1 && attached == 1) {
      // Replicate the detached invariant: data_=nullptr, size_=0, external_=false,
      // attached_=false. The external-data context (our retained shared_ptr) is
      // left in place; it is released when the cell is garbage collected.
      const uint8_t *nullData = nullptr;
      const uint32_t zeroSize = 0;
      std::memcpy(fields, &nullData, sizeof(nullData));
      std::memcpy(fields + sizeof(void *), &zeroSize, sizeof(zeroSize));
      fields[sizeof(void *) + sizeof(uint32_t)] = 0;     // external_
      fields[sizeof(void *) + sizeof(uint32_t) + 1] = 0; // attached_
      return true;
    }
  }

  return false;
}

void detachArrayBufferInPlace(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &arrayBuffer,
    const uint8_t *expectedData,
    size_t expectedSize) {
  if (!detachCellInPlace(decodeArrayBufferCell(arrayBuffer), expectedData, expectedSize)) {
    throw jsi::JSError(
        rt,
        "[Worklets] Cannot detach ArrayBuffer: the Hermes cell layout did not match "
        "(the field-write detach is pinned to Hermes' internals).");
  }
}

} // namespace worklets
