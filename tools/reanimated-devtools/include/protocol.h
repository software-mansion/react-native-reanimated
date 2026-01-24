#pragma once

#include <imgui.h>
#include <cstdint>

// Protocol definitions for DevTools communication
namespace reanimated {

// Message type discriminator
enum class DevToolsMessageType : uint8_t {
  Mutations = 0,
  ProfilerStringRegistry = 1,
  ProfilerEvents = 2,
};

enum class MutationType : uint8_t { Create = 0, Delete = 1, Insert = 2, Remove = 3, Update = 4, Unknown = 255 };

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
  int32_t backgroundColor;
  float opacity;
};

// Profiler string registry entry
struct ProfilerStringEntry {
  uint32_t stringId;
  char name[64];
};

// Profiler event
struct ProfilerEvent {
  uint32_t stringId;
  uint32_t threadId;
  uint64_t startTimeNs;
  uint64_t endTimeNs;
};

struct DevToolsMessageHeader {
  uint32_t magic;
  uint32_t version;
  DevToolsMessageType type;
  uint8_t padding[3];
  uint32_t payloadCount;
  uint64_t timestampNs; // Timestamp in nanoseconds

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 4; // Updated version to match protocol
};
#pragma pack(pop)

const char *mutationTypeToString(MutationType type);
ImU32 mutationTypeToColor(MutationType type);

} // namespace reanimated
