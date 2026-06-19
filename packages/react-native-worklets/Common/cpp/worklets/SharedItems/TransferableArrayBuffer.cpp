#include <worklets/SharedItems/HermesArrayBufferDetach.h>
#include <worklets/SharedItems/TransferableArrayBuffer.h>

#include <memory>
#include <utility>

namespace worklets {

namespace {

// Defines `buf.detached` as an accessor whose getter reads the shared store's
// C++ flag - so it reflects the detach in EVERY runtime, not just the one that
// called transfer().
void defineDetachedGetter(jsi::Runtime &rt, const jsi::Object &object) {
  auto descriptor = jsi::Object(rt);
  descriptor.setProperty(
      rt,
      "get",
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, "detached"),
          0,
          [](jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *, size_t) -> jsi::Value {
            auto store = getTransferableArrayBufferStore(rt, thisVal.asObject(rt));
            return jsi::Value(store != nullptr && store->detached());
          }));
  descriptor.setProperty(rt, "configurable", true);

  rt.global()
      .getPropertyAsObject(rt, "Object")
      .getPropertyAsFunction(rt, "defineProperty")
      .call(rt, object, jsi::String::createFromUtf8(rt, "detached"), descriptor);
}

jsi::Value transferImpl(jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) {
  auto object = thisVal.asObject(rt);
  auto store = getTransferableArrayBufferStore(rt, object);
  if (store == nullptr) {
    throw jsi::JSError(rt, "[Worklets] transfer() called on a non-transferable ArrayBuffer.");
  }
  const auto newByteLength =
      count > 0 && !args[0].isUndefined() ? static_cast<size_t>(args[0].asNumber()) : store->size();
  const auto *expectedData = store->data();
  const auto expectedSize = store->size();
  auto fresh = store->transfer(newByteLength);
  for (void *cell : store->takeOwnerCells()) {
    detachCellInPlace(cell, expectedData, expectedSize);
  }
  if (object.getArrayBuffer(rt).size(rt) != 0) {
    throw jsi::JSError(
        rt,
        "[Worklets] ArrayBuffer detach failed: the Hermes JSArrayBuffer cell layout did not match "
        "(field-write detach is pinned to Hermes' internals).");
  }
  store->markDetached();
  return makeTransferableArrayBuffer(rt, std::move(fresh));
}

} // namespace

jsi::Value makeTransferableArrayBuffer(jsi::Runtime &rt, std::shared_ptr<TransferableArrayBuffer> buffer) {
  // Real `jsi::ArrayBuffer` over the MutableBuffer. Hermes reads `data()`/`size()`
  // once here and retains its own copy of the shared_ptr to keep the bytes alive.
  jsi::ArrayBuffer arrayBuffer(rt, buffer);
  // Record this runtime's cell address on the shared store, so a transfer() from
  // any runtime can later detach this wrapper too (cross-runtime propagation).
  buffer->registerOwnerCell(decodeArrayBufferCell(arrayBuffer));
  // Our own readable handle back to the store (no `tryGetMutableBuffer` on RN 0.85).
  arrayBuffer.setNativeState(rt, std::make_shared<TransferableArrayBufferState>(std::move(buffer)));
  // `buf.transferable === true` and the serializer's share marker.
  arrayBuffer.setProperty(rt, "transferable", true);
  arrayBuffer.setProperty(rt, "__transferable", true);
  // `buf.detached` - getter reading the shared store's flag (true in every
  // runtime once any runtime calls transfer()).
  defineDetachedGetter(rt, arrayBuffer);
  // `buf.transfer(newByteLength?)`.
  arrayBuffer.setProperty(
      rt,
      "transfer",
      jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forUtf8(rt, "transfer"), 1, transferImpl));
  return jsi::Value(rt, arrayBuffer);
}

std::shared_ptr<TransferableArrayBuffer> getTransferableArrayBufferStore(jsi::Runtime &rt, const jsi::Object &object) {
  if (!object.hasNativeState<TransferableArrayBufferState>(rt)) {
    return nullptr;
  }
  return object.getNativeState<TransferableArrayBufferState>(rt)->buffer;
}

} // namespace worklets
