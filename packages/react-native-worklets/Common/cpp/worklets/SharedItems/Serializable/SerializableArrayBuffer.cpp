#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableArrayBuffer.h>

#include <cstring>
#include <memory>
#include <optional>
#include <utility>

using namespace facebook;

namespace worklets {

jsi::Value SerializableArrayBuffer::toJSValue(jsi::Runtime &rt) {
  auto size = static_cast<int>(data_.size());
  auto arrayBuffer =
      rt.global().getPropertyAsFunction(rt, "ArrayBuffer").callAsConstructor(rt, size).getObject(rt).getArrayBuffer(rt);
  memcpy(arrayBuffer.data(rt), data_.data(), size);
  if (!metadata_.has_value()) {
    return arrayBuffer;
  }

  auto constructor = rt.global().getPropertyAsFunction(rt, metadata_->typeName.c_str());
  return constructor.callAsConstructor(
      rt, arrayBuffer, static_cast<double>(metadata_->byteOffset), static_cast<double>(metadata_->length));
}

jsi::Value makeSerializableArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &arrayBuffer,
    std::optional<ArrayBufferMetadata> metadata) {
  auto serializable = std::make_shared<SerializableArrayBuffer>(rt, arrayBuffer, std::move(metadata));
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
