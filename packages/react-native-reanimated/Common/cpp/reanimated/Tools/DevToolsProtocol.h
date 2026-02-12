#pragma once

#include <cstdint>
#include <cstring>

namespace reanimated {

// DevTools configuration - all constexpr for easy customization
struct DevToolsConfig {
  // Port range for server binding
  static constexpr uint16_t PORT_START = 8765;
  static constexpr uint16_t PORT_END = 8784;
  static constexpr uint16_t PORT_COUNT = PORT_END - PORT_START + 1; // 20 ports

  // Per-thread profiler ring buffer size (must be power of 2)
  static constexpr size_t PROFILER_BUFFER_SIZE = 2000000;

  // Thread metadata circular buffer limit
  static constexpr size_t MAX_THREAD_METADATA = 512;

  // Mutations buffer (only used until first client connects)
  static constexpr size_t MUTATIONS_BUFFER_MAX_COUNT = 10000;

  // Network thread flush interval
  static constexpr int FLUSH_INTERVAL_MS = 300;
};

// Message type discriminator
enum class DevToolsMessageType : uint8_t {
  Mutations = 0,
  ProfilerStringRegistry = 1,
  ProfilerEvents = 2,
  ThreadMetadata = 3,
  // New message types for server-in-app architecture
  DeviceInfo = 4,
  ConnectionRejected = 5,
  // Client-to-server messages
  ClientReady = 6, // Client is ready to receive data (sent after DeviceInfo)
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

enum ProfilerEventType : uint8_t {
  Begin = 0,
  End = 1,
};

// Profiler event - sent over the wire
struct ProfilerEvent {
  ProfilerEventType type;
  uint32_t stringId = UINT32_MAX;
  uint32_t threadId; // Thread ID for timeline visualization
  uint64_t timeNs;
};

// Thread metadata - sent once when a thread first appears
struct ThreadMetadata {
  uint32_t threadId; // Thread ID hash
  char threadName[64]; // Human-readable thread name (e.g., "RenderThread", "JSThread")
};

// Device info - sent immediately when client connects
struct DeviceInfoMessage {
  char deviceName[128]; // Platform-provided or "Unknown Device"
  uint16_t port; // Port the server is listening on
  uint8_t padding1[2]; // Alignment
  uint64_t appStartTimeNs; // When the app started (for uptime display)
  uint32_t bufferedProfilerEvents; // Approximate count of buffered profiler events
  uint32_t bufferedMutations; // Count of buffered mutations
  uint8_t padding2[3]; // Alignment
};

// Connection rejected - sent when another client is already connected
struct ConnectionRejectedMessage {
  char reason[256]; // Human-readable reason (e.g., "App already has an active connection")
};

// Client ready message - sent by client after DeviceInfo to indicate it wants data
struct ClientReadyMessage {
  uint8_t protocolVersion; // Client's protocol version for version negotiation
  uint8_t padding[7]; // Alignment
};
#pragma pack(pop)

// Internal profiler event - stores pointer, resolved on background thread
struct ProfilerEventInternal {
  ProfilerEventType type;
  const char *namePtr = nullptr; // const char* cast to uint64_t
  uint64_t threadId; // Thread ID
  uint64_t timeNs;
};

// Message header for the protocol
#pragma pack(push, 1)
struct DevToolsMessageHeader {
  uint32_t magic; // Magic number to identify valid messages: 0xDEADBEEF
  uint32_t version; // Protocol version
  DevToolsMessageType type; // Message type
  uint8_t padding[3]; // Alignment padding
  uint32_t payloadCount; // Number of items in payload
  uint64_t timestampNs; // Timestamp in nanoseconds (for linking profiler events to mutations)

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 9; // Server-in-app with ClientReady handshake

  DevToolsMessageHeader()
      : magic(MAGIC),
        version(VERSION),
        type(DevToolsMessageType::Mutations),
        padding{0, 0, 0},
        payloadCount(0),
        timestampNs(0) {}

  DevToolsMessageHeader(DevToolsMessageType msgType, uint32_t count, uint64_t timestamp = 0)
      : magic(MAGIC), version(VERSION), type(msgType), padding{0, 0, 0}, payloadCount(count), timestampNs(timestamp) {}
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
