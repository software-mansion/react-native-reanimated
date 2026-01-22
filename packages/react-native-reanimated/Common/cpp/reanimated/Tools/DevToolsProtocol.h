#pragma once

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

namespace reanimated {

// Message type discriminator
enum class DevToolsMessageType : uint8_t {
  Mutations = 0,
  ProfilerStringRegistry = 1,
  ProfilerEvents = 2,
};

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
  int32_t backgroundColor; // RGBA packed into uint32
  float opacity; // Opacity value

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
        backgroundColor(0),
        opacity(1.0f) {
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
        backgroundColor(bgColor),
        opacity(1.0f) {
    if (name) {
      strncpy(componentName, name, sizeof(componentName) - 1);
      componentName[sizeof(componentName) - 1] = '\0';
    } else {
      componentName[0] = '\0';
    }
  }
};

// Profiler string registry entry - maps ID to name
struct ProfilerStringEntry {
  uint32_t stringId;
  char name[64];
};

// Profiler event - sent over the wire
struct ProfilerEvent {
  uint32_t stringId;
  uint32_t padding; // Align to 8 bytes
  uint64_t startTimeNs;
  uint64_t endTimeNs;
};
#pragma pack(pop)

// Internal profiler event - stores pointer, resolved on background thread
struct ProfilerEventInternal {
  uint64_t namePtr; // const char* cast to uint64_t
  uint64_t startTimeNs;
  uint64_t endTimeNs;
};

// Message header for the protocol
#pragma pack(push, 1)
struct DevToolsMessageHeader {
  uint32_t magic; // Magic number to identify valid messages: 0xDEADBEEF
  uint32_t version; // Protocol version
  DevToolsMessageType type; // Message type
  uint8_t padding[3]; // Alignment padding
  uint32_t payloadCount; // Number of items in payload
  uint32_t reserved;

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 3;

  DevToolsMessageHeader()
      : magic(MAGIC),
        version(VERSION),
        type(DevToolsMessageType::Mutations),
        padding{0, 0, 0},
        payloadCount(0),
        reserved(0) {}

  DevToolsMessageHeader(DevToolsMessageType msgType, uint32_t count)
      : magic(MAGIC), version(VERSION), type(msgType), padding{0, 0, 0}, payloadCount(count), reserved(0) {}
};
#pragma pack(pop)

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
