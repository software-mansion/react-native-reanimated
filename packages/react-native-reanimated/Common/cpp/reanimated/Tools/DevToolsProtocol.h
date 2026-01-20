#pragma once

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

namespace reanimated {

// Mutation types matching ShadowViewMutation::Type
enum class MutationType : uint8_t { Create = 0, Delete = 1, Insert = 2, Remove = 3, Update = 4, Unknown = 255 };

// Simple mutation data structure that can be serialized as a raw blob
// This struct is shared between Reanimated and the dev tools server
// IMPORTANT: Use #pragma pack to ensure consistent layout across platforms
#pragma pack(push, 1)
struct SimpleMutation {
  int32_t tag;
  int32_t parentTag;
  int32_t index;
  MutationType type;
  uint8_t padding[3]; // Explicit padding for alignment
  char componentName[64];
  float x;
  float y;
  float width;
  float height;
  uint32_t backgroundColor; // RGBA packed into uint32

  SimpleMutation()
      : tag(0),
        parentTag(-1),
        index(-1),
        type(MutationType::Unknown),
        padding{0, 0, 0},
        x(0),
        y(0),
        width(0),
        height(0),
        backgroundColor(0) {
    componentName[0] = '\0';
  }

  SimpleMutation(
      int32_t tag,
      int32_t parentTag,
      int32_t index,
      MutationType type,
      const char *name,
      float x,
      float y,
      float width,
      float height,
      uint32_t bgColor = 0)
      : tag(tag),
        parentTag(parentTag),
        index(index),
        type(type),
        padding{0, 0, 0},
        x(x),
        y(y),
        width(width),
        height(height),
        backgroundColor(bgColor) {
    if (name) {
      strncpy(componentName, name, sizeof(componentName) - 1);
      componentName[sizeof(componentName) - 1] = '\0';
    } else {
      componentName[0] = '\0';
    }
  }
};
#pragma pack(pop)

// Message header for the protocol
struct DevToolsMessageHeader {
  uint32_t magic; // Magic number to identify valid messages: 0xDEADBEEF
  uint32_t version; // Protocol version
  uint32_t numMutations;
  uint32_t reserved;

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 2; // Bumped version for new protocol

  DevToolsMessageHeader() : magic(MAGIC), version(VERSION), numMutations(0), reserved(0) {}
  explicit DevToolsMessageHeader(uint32_t count) : magic(MAGIC), version(VERSION), numMutations(count), reserved(0) {}
};

// Complete message structure
struct DevToolsMessage {
  DevToolsMessageHeader header;
  std::vector<SimpleMutation> mutations;

  DevToolsMessage() = default;
  explicit DevToolsMessage(const std::vector<SimpleMutation> &muts)
      : header(static_cast<uint32_t>(muts.size())), mutations(muts) {}

  // Serialize the message to a byte buffer
  std::vector<uint8_t> serialize() const {
    size_t headerSize = sizeof(DevToolsMessageHeader);
    size_t mutationsSize = mutations.size() * sizeof(SimpleMutation);
    std::vector<uint8_t> buffer(headerSize + mutationsSize);

    memcpy(buffer.data(), &header, headerSize);
    if (!mutations.empty()) {
      memcpy(buffer.data() + headerSize, mutations.data(), mutationsSize);
    }
    return buffer;
  }

  // Deserialize from a byte buffer
  static bool deserialize(const uint8_t *data, size_t size, DevToolsMessage &outMessage) {
    if (size < sizeof(DevToolsMessageHeader)) {
      return false;
    }

    memcpy(&outMessage.header, data, sizeof(DevToolsMessageHeader));

    if (outMessage.header.magic != DevToolsMessageHeader::MAGIC) {
      return false;
    }

    size_t expectedSize = sizeof(DevToolsMessageHeader) + outMessage.header.numMutations * sizeof(SimpleMutation);
    if (size < expectedSize) {
      return false;
    }

    outMessage.mutations.resize(outMessage.header.numMutations);
    if (outMessage.header.numMutations > 0) {
      memcpy(
          outMessage.mutations.data(),
          data + sizeof(DevToolsMessageHeader),
          outMessage.header.numMutations * sizeof(SimpleMutation));
    }

    return true;
  }
};

inline const char *mutationTypeToString(MutationType type) {
  switch (type) {
    case MutationType::Create:
      return "CREATE";
    case MutationType::Delete:
      return "DELETE";
    case MutationType::Insert:
      return "INSERT";
    case MutationType::Remove:
      return "REMOVE";
    case MutationType::Update:
      return "UPDATE";
    default:
      return "UNKNOWN";
  }
}

} // namespace reanimated
