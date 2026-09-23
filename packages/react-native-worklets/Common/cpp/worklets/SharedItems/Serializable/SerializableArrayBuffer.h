#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

struct ArrayBufferMetadata {
  std::string typeName;
  size_t byteOffset;
  size_t length;
};

class SerializableArrayBuffer : public Serializable {
 public:
  SerializableArrayBuffer(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::ArrayBuffer &arrayBuffer,
      std::optional<ArrayBufferMetadata> metadata = std::nullopt)
      : Serializable(ValueType::ArrayBufferType),
        metadata_(std::move(metadata)),
        data_(arrayBuffer.data(rt), arrayBuffer.data(rt) + arrayBuffer.size(rt)) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  std::optional<ArrayBufferMetadata> metadata_;
  std::vector<uint8_t> data_;
};

facebook::jsi::Value makeSerializableArrayBuffer(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::ArrayBuffer &arrayBuffer,
    std::optional<ArrayBufferMetadata> metadata = std::nullopt);

} // namespace worklets
