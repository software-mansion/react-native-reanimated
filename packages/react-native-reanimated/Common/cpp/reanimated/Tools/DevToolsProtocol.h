#pragma once

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

namespace reanimated {

// Simple mutation data structure that can be serialized as a raw blob
// This struct is shared between Reanimated and the dev tools server
struct SimpleMutation {
  int32_t tag;
  char componentName[64];
  float x;
  float y;
  float width;
  float height;
  uint32_t backgroundColor; // RGBA packed into uint32

  SimpleMutation() : tag(0), x(0), y(0), width(0), height(0), backgroundColor(0) {
    componentName[0] = '\0';
  }

  SimpleMutation(int32_t tag, const char *name, float x, float y, float width, float height, uint32_t bgColor = 0)
      : tag(tag), x(x), y(y), width(width), height(height), backgroundColor(bgColor) {
    if (name) {
      strncpy(componentName, name, sizeof(componentName) - 1);
      componentName[sizeof(componentName) - 1] = '\0';
    } else {
      componentName[0] = '\0';
    }
  }
};

// Message header for the protocol
struct DevToolsMessageHeader {
  uint32_t magic; // Magic number to identify valid messages: 0xDEADBEEF
  uint32_t version; // Protocol version
  uint32_t numMutations;
  uint32_t reserved;

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 1;

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

} // namespace reanimated
