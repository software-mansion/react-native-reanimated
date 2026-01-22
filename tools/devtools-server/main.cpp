// Reanimated DevTools Server with ImGui Frontend
// A C++ server that receives mutation data from Reanimated and visualizes it.
//
// Build: make
// Run: ./devtools-server

#include <atomic>
#include <cmath>
#include <csignal>
#include <cstdint>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <map>
#include <mutex>
#include <set>
#include <sstream>
#include <thread>
#include <unordered_map>
#include <vector>

#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <GLFW/glfw3.h>
#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"

// Protocol structs (copied from DevToolsProtocol.h)
// IMPORTANT: Must match exactly with client side!
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
  uint32_t reserved;

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 3;
};
#pragma pack(pop)

// Profiler string registry (maps ID -> name)
std::unordered_map<uint32_t, std::string> g_profilerStrings;

const char *mutationTypeToString(MutationType type) {
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

ImU32 mutationTypeToColor(MutationType type) {
  switch (type) {
    case MutationType::Create:
      return IM_COL32(100, 150, 200, 255); // Blue
    case MutationType::Delete:
      return IM_COL32(200, 100, 100, 255); // Red
    case MutationType::Insert:
      return IM_COL32(100, 200, 100, 255); // Green
    case MutationType::Remove:
      return IM_COL32(200, 150, 100, 255); // Orange
    case MutationType::Update:
      return IM_COL32(200, 200, 100, 255); // Yellow
    default:
      return IM_COL32(150, 150, 150, 255); // Gray
  }
}

} // namespace reanimated

// Tree node for visualization
struct ViewNode {
  int32_t tag;
  int32_t parentTag;
  std::string componentName;
  float x, y, width, height;
  reanimated::MutationType lastMutationType;
  std::vector<int32_t> childTags;
  int32_t indexInParent = -1;
  float opacity = 1.0f;
  int32_t backgroundColor = 0xffffffff;
};

// Snapshot of the view tree at a point in time
struct TreeSnapshot {
  int id;
  std::string label;
  std::unordered_map<int32_t, ViewNode> nodes;
  std::vector<int32_t> rootTags;
  std::vector<reanimated::SimpleMutation> mutations; // Original mutations for this snapshot
  std::set<int32_t> mutatedTags; // Tags that were mutated in this batch
};

// Global state
std::mutex g_mutex;
std::vector<TreeSnapshot> g_snapshots;
int g_currentSnapshotIndex = -1;
std::atomic<bool> g_running{true};
int g_snapshotCounter = 0;

// Current tree state (accumulated)
std::unordered_map<int32_t, ViewNode> g_currentTree;
std::vector<int32_t> g_currentRoots;

// Profiler timeline data structures
struct ProfilerEventData {
  uint32_t stringId;
  uint32_t threadId;
  uint64_t startTimeNs;
  uint64_t endTimeNs;
};

// Per-thread timeline
struct ThreadTimeline {
  uint32_t threadId;
  std::string threadName;
  std::vector<ProfilerEventData> events;
};

// Global profiler state
std::mutex g_profilerMutex;
std::unordered_map<uint32_t, ThreadTimeline> g_threadTimelines;
uint64_t g_profilerMinTimeNs = UINT64_MAX;
uint64_t g_profilerMaxTimeNs = 0;

// Profiler view state (all times are relative to g_profilerMinTimeNs)
double g_profilerViewStartNs = 0.0; // Left edge of view in nanoseconds (relative)
float g_profilerViewOffsetY = 0.0f; // Vertical scroll in pixels
double g_profilerNsPerPixel = 100000.0; // Nanoseconds per pixel (zoom level)
bool g_profilerLockToLatest = true; // Auto-scroll to latest events
constexpr float PROFILER_ROW_HEIGHT = 24.0f;
constexpr float PROFILER_ROW_SPACING = 4.0f;
constexpr float PROFILER_HEADER_WIDTH = 150.0f;

// Hovered event info for tooltip
struct HoveredEventInfo {
  bool isValid = false;
  std::string name;
  std::string threadName;
  double durationUs;
  double startTimeMs;
  double endTimeMs;
};

void applyMutations(const std::vector<reanimated::SimpleMutation> &mutations) {
  std::lock_guard<std::mutex> lock(g_mutex);

  for (const auto &mut : mutations) {
    switch (mut.type) {
      case reanimated::MutationType::Create: {
        ViewNode node;
        node.tag = mut.tag;
        node.parentTag = -1;
        node.componentName = mut.componentName;
        node.x = mut.x;
        node.y = mut.y;
        node.width = mut.width;
        node.height = mut.height;
        node.lastMutationType = mut.type;
        node.opacity = mut.opacity;
        node.backgroundColor = mut.backgroundColor;
        g_currentTree[mut.tag] = node;
        break;
      }
      case reanimated::MutationType::Delete: {
        g_currentTree.erase(mut.tag);
        break;
      }
      case reanimated::MutationType::Insert: {
        if (g_currentTree.count(mut.tag)) {
          auto &node = g_currentTree[mut.tag];
          node.parentTag = mut.parentTag;
          node.lastMutationType = mut.type;
          node.indexInParent = mut.index;
          node.backgroundColor = mut.backgroundColor;

          // Add to parent's children
          if (mut.parentTag >= 0 && g_currentTree.count(mut.parentTag)) {
            auto &parent = g_currentTree[mut.parentTag];
            // Insert at index
            if (mut.index >= 0 && mut.index <= static_cast<int>(parent.childTags.size())) {
              parent.childTags.insert(parent.childTags.begin() + mut.index, mut.tag);
            } else {
              parent.childTags.push_back(mut.tag);
            }
          } else {
            // Root node
            g_currentRoots.push_back(mut.tag);
          }
        }
        break;
      }
      case reanimated::MutationType::Remove: {
        if (g_currentTree.count(mut.tag)) {
          auto &node = g_currentTree[mut.tag];
          node.lastMutationType = mut.type;

          // Remove from parent's children
          if (node.parentTag >= 0 && g_currentTree.count(node.parentTag)) {
            auto &parent = g_currentTree[node.parentTag];
            auto it = std::find(parent.childTags.begin(), parent.childTags.end(), mut.tag);
            if (it != parent.childTags.end()) {
              parent.childTags.erase(it);
            }
          } else {
            auto it = std::find(g_currentRoots.begin(), g_currentRoots.end(), mut.tag);
            if (it != g_currentRoots.end()) {
              g_currentRoots.erase(it);
            }
          }
          node.parentTag = -1;
        }
        break;
      }
      case reanimated::MutationType::Update: {
        if (g_currentTree.count(mut.tag)) {
          auto &node = g_currentTree[mut.tag];
          node.x = mut.x;
          node.y = mut.y;
          node.width = mut.width;
          node.height = mut.height;
          node.lastMutationType = mut.type;
          node.opacity = mut.opacity;
          node.backgroundColor = mut.backgroundColor;
        }
        break;
      }
      default:
        break;
    }
  }

  // Create snapshot
  TreeSnapshot snapshot;
  snapshot.id = g_snapshotCounter++;
  snapshot.label = "Snapshot #" + std::to_string(snapshot.id) + " (" + std::to_string(mutations.size()) + " mutations)";
  snapshot.nodes = g_currentTree;
  snapshot.rootTags = g_currentRoots;
  snapshot.mutations = mutations;

  // Track which tags were mutated in this batch
  for (const auto &mut : mutations) {
    snapshot.mutatedTags.insert(mut.tag);
  }

  std::cout << "Created snapshot #" << snapshot.id << " with " << snapshot.nodes.size() << " nodes and "
            << snapshot.rootTags.size() << " roots\n";
  for (int32_t rootTag : snapshot.rootTags) {
    std::cout << "  Root: " << rootTag << "\n";
  }

  g_snapshots.push_back(snapshot);
  g_currentSnapshotIndex = static_cast<int>(g_snapshots.size()) - 1;
}

void networkThread(int port) {
  int serverSocket = socket(AF_INET, SOCK_STREAM, 0);
  if (serverSocket < 0) {
    std::cerr << "Failed to create socket\n";
    return;
  }

  int opt = 1;
  setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  struct sockaddr_in serverAddr;
  memset(&serverAddr, 0, sizeof(serverAddr));
  serverAddr.sin_family = AF_INET;
  serverAddr.sin_addr.s_addr = INADDR_ANY;
  serverAddr.sin_port = htons(port);

  if (bind(serverSocket, reinterpret_cast<struct sockaddr *>(&serverAddr), sizeof(serverAddr)) < 0) {
    std::cerr << "Failed to bind to port " << port << "\n";
    close(serverSocket);
    return;
  }

  if (listen(serverSocket, 5) < 0) {
    std::cerr << "Failed to listen\n";
    close(serverSocket);
    return;
  }

  // Set non-blocking
  fcntl(serverSocket, F_SETFL, O_NONBLOCK);

  std::cout << "Server listening on port " << port << "\n";

  constexpr size_t BUFFER_SIZE = 65536;
  std::vector<uint8_t> buffer(BUFFER_SIZE);
  std::vector<uint8_t> pendingData;
  int clientSocket = -1;

  while (g_running) {
    // Accept new connections
    if (clientSocket < 0) {
      struct sockaddr_in clientAddr;
      socklen_t clientLen = sizeof(clientAddr);
      clientSocket = accept(serverSocket, reinterpret_cast<struct sockaddr *>(&clientAddr), &clientLen);
      if (clientSocket >= 0) {
        fcntl(clientSocket, F_SETFL, O_NONBLOCK);
        std::cout << "Client connected\n";
        pendingData.clear();
      }
    }

    // Read from client
    if (clientSocket >= 0) {
      ssize_t bytesRead = recv(clientSocket, buffer.data(), buffer.size(), 0);
      if (bytesRead > 0) {
        pendingData.insert(pendingData.end(), buffer.begin(), buffer.begin() + bytesRead);

        // Process complete messages
        while (pendingData.size() >= sizeof(reanimated::DevToolsMessageHeader)) {
          reanimated::DevToolsMessageHeader header;
          memcpy(&header, pendingData.data(), sizeof(header));

          if (header.magic != reanimated::DevToolsMessageHeader::MAGIC) {
            std::cerr << "Invalid magic number, clearing pending data\n";
            pendingData.clear();
            break;
          }

          // Calculate payload size based on message type
          size_t payloadSize = 0;
          switch (header.type) {
            case reanimated::DevToolsMessageType::Mutations:
              payloadSize = header.payloadCount * sizeof(reanimated::SimpleMutation);
              break;
            case reanimated::DevToolsMessageType::ProfilerStringRegistry:
              payloadSize = header.payloadCount * sizeof(reanimated::ProfilerStringEntry);
              break;
            case reanimated::DevToolsMessageType::ProfilerEvents:
              payloadSize = header.payloadCount * sizeof(reanimated::ProfilerEvent);
              break;
            default:
              std::cerr << "Unknown message type: " << static_cast<int>(header.type) << "\n";
              pendingData.clear();
              continue;
          }

          size_t expectedSize = sizeof(reanimated::DevToolsMessageHeader) + payloadSize;

          if (pendingData.size() < expectedSize) {
            break; // Wait for more data
          }

          // Process based on message type
          const uint8_t *payloadPtr = pendingData.data() + sizeof(reanimated::DevToolsMessageHeader);

          switch (header.type) {
            case reanimated::DevToolsMessageType::Mutations: {
              std::vector<reanimated::SimpleMutation> mutations(header.payloadCount);
              memcpy(mutations.data(), payloadPtr, payloadSize);

              std::cout << "Received " << mutations.size() << " mutations:\n";
              for (const auto &mut : mutations) {
                std::cout << "  " << reanimated::mutationTypeToString(mut.type) << " tag=" << mut.tag
                          << " parent=" << mut.parentTag << " idx=" << mut.index << " " << mut.componentName << " ("
                          << mut.x << "," << mut.y << "," << mut.width << "," << mut.height << ")\n";
              }
              applyMutations(mutations);
              break;
            }

            case reanimated::DevToolsMessageType::ProfilerStringRegistry: {
              std::cout << "Received " << header.payloadCount << " profiler string entries:\n";
              for (uint32_t i = 0; i < header.payloadCount; ++i) {
                reanimated::ProfilerStringEntry entry;
                memcpy(&entry, payloadPtr + i * sizeof(reanimated::ProfilerStringEntry), sizeof(entry));
                entry.name[sizeof(entry.name) - 1] = '\0'; // Ensure null termination
                reanimated::g_profilerStrings[entry.stringId] = entry.name;
                std::cout << "  [" << entry.stringId << "] = \"" << entry.name << "\"\n";
              }
              break;
            }

            case reanimated::DevToolsMessageType::ProfilerEvents: {
              std::lock_guard<std::mutex> profilerLock(g_profilerMutex);

              std::cout << "Received " << header.payloadCount << " profiler events:\n";
              for (uint32_t i = 0; i < header.payloadCount; ++i) {
                reanimated::ProfilerEvent event;
                memcpy(&event, payloadPtr + i * sizeof(reanimated::ProfilerEvent), sizeof(event));

                // Store event in timeline
                ProfilerEventData eventData;
                eventData.stringId = event.stringId;
                eventData.threadId = event.threadId;
                eventData.startTimeNs = event.startTimeNs;
                eventData.endTimeNs = event.endTimeNs;

                // Get or create thread timeline
                auto &timeline = g_threadTimelines[event.threadId];
                timeline.threadId = event.threadId;
                if (timeline.threadName.empty()) {
                  timeline.threadName = "Thread " + std::to_string(event.threadId);
                }
                timeline.events.push_back(eventData);

                // Update global time range
                g_profilerMinTimeNs = std::min(g_profilerMinTimeNs, event.startTimeNs);
                g_profilerMaxTimeNs = std::max(g_profilerMaxTimeNs, event.endTimeNs);

                // Look up the string name for console output
                std::string name = "unknown";
                auto it = reanimated::g_profilerStrings.find(event.stringId);
                if (it != reanimated::g_profilerStrings.end()) {
                  name = it->second;
                }

                // Calculate duration in milliseconds
                double durationMs = static_cast<double>(event.endTimeNs - event.startTimeNs) / 1000000.0;
                std::cout << "  [PROFILE] Thread " << event.threadId << " - " << name << ": " << std::fixed
                          << std::setprecision(3) << durationMs << "ms\n";
              }
              break;
            }
          }

          pendingData.erase(pendingData.begin(), pendingData.begin() + expectedSize);
        }
      } else if (bytesRead == 0) {
        std::cout << "Client disconnected\n";
        close(clientSocket);
        clientSocket = -1;
      }
    }

    std::this_thread::sleep_for(std::chrono::milliseconds(10));
  }

  if (clientSocket >= 0) {
    close(clientSocket);
  }
  close(serverSocket);
}

// Structure to hold node drawing info for 3D sorting
struct DrawableNode {
  const ViewNode *node;
  float absoluteX;
  float absoluteY;
  float zDepth; // Changed from int depth to float for more flexible layering
};

// Helper to check if two rectangles overlap
// Uses a small epsilon to avoid false positives from floating-point imprecision
// when rectangles share a border
bool rectsOverlap(float x1, float y1, float w1, float h1, float x2, float y2, float w2, float h2) {
  constexpr float epsilon = 0.01f; // Small tolerance for floating-point comparison

  // Check if one rectangle is to the left of the other (with epsilon tolerance)
  if (x1 + w1 <= x2 + epsilon || x2 + w2 <= x1 + epsilon)
    return false;
  // Check if one rectangle is above the other (with epsilon tolerance)
  if (y1 + h1 <= y2 + epsilon || y2 + h2 <= y1 + epsilon)
    return false;
  return true;
}

// Calculate the maximum depth of a subtree
int getSubtreeMaxDepth(
    const TreeSnapshot &snapshot,
    const ViewNode &node,
    const std::set<int32_t> &hiddenTags,
    int currentDepth = 0) {
  if (hiddenTags.count(node.tag)) {
    return currentDepth;
  }

  int maxDepth = currentDepth;
  for (int32_t childTag : node.childTags) {
    auto it = snapshot.nodes.find(childTag);
    if (it != snapshot.nodes.end()) {
      int childMax = getSubtreeMaxDepth(snapshot, it->second, hiddenTags, currentDepth + 1);
      maxDepth = std::max(maxDepth, childMax);
    }
  }
  return maxDepth;
}

// First pass: collect all nodes with simple tree-based depth (no overlap handling)
void collectNodesSimple(
    const TreeSnapshot &snapshot,
    const ViewNode &node,
    const std::set<int32_t> &hiddenTags,
    std::vector<DrawableNode> &outNodes,
    float parentX,
    float parentY,
    float depth) {
  if (hiddenTags.count(node.tag)) {
    return;
  }

  float absoluteX = parentX + node.x;
  float absoluteY = parentY + node.y;

  outNodes.push_back({&node, absoluteX, absoluteY, depth});

  for (int32_t childTag : node.childTags) {
    auto it = snapshot.nodes.find(childTag);
    if (it != snapshot.nodes.end()) {
      collectNodesSimple(snapshot, it->second, hiddenTags, outNodes, absoluteX, absoluteY, depth + 1);
    }
  }
}

// Collect nodes and handle overlapping siblings by adjusting z-depths
// Optimized version: O(n) precomputation instead of O(n²) repeated lookups
void collectNodesWithOverlapHandling(
    const TreeSnapshot &snapshot,
    const std::set<int32_t> &hiddenTags,
    std::vector<DrawableNode> &outNodes,
    const std::vector<int32_t> &rootTags) {

  // First, collect all nodes with simple depth
  for (int32_t rootTag : rootTags) {
    auto it = snapshot.nodes.find(rootTag);
    if (it != snapshot.nodes.end()) {
      collectNodesSimple(snapshot, it->second, hiddenTags, outNodes, 0, 0, 0);
    }
  }

  if (outNodes.empty())
    return;

  size_t n = outNodes.size();

  // === O(n) Precomputation ===

  // Map tag -> index for fast lookup
  std::unordered_map<int32_t, size_t> tagToIndex;
  tagToIndex.reserve(n);
  for (size_t i = 0; i < n; ++i) {
    tagToIndex[outNodes[i].node->tag] = i;
  }

  // Build parent -> children indices map
  std::unordered_map<int32_t, std::vector<size_t>> parentToChildren;
  for (size_t i = 0; i < n; ++i) {
    parentToChildren[outNodes[i].node->parentTag].push_back(i);
  }

  // Precompute subtree indices for each node using DFS
  // subtreeIndices[i] contains all indices in the subtree rooted at node i (including i)
  std::vector<std::vector<size_t>> subtreeIndices(n);

  // Process nodes in reverse order (children before parents in typical DFS order)
  // But since collectNodesSimple does DFS, children come after parents
  // So we process in reverse to build subtrees bottom-up
  for (size_t i = n; i-- > 0;) {
    int32_t tag = outNodes[i].node->tag;
    subtreeIndices[i].push_back(i); // Include self

    // Add all children's subtrees
    auto childIt = parentToChildren.find(tag);
    if (childIt != parentToChildren.end()) {
      for (size_t childIdx : childIt->second) {
        // Append child's entire subtree
        subtreeIndices[i].insert(
            subtreeIndices[i].end(), subtreeIndices[childIdx].begin(), subtreeIndices[childIdx].end());
      }
    }
  }

  // Precompute max zDepth for each subtree (will be updated as we adjust)
  std::vector<float> subtreeMaxZ(n);
  for (size_t i = n; i-- > 0;) {
    float maxZ = outNodes[i].zDepth;
    int32_t tag = outNodes[i].node->tag;
    auto childIt = parentToChildren.find(tag);
    if (childIt != parentToChildren.end()) {
      for (size_t childIdx : childIt->second) {
        maxZ = std::max(maxZ, subtreeMaxZ[childIdx]);
      }
    }
    subtreeMaxZ[i] = maxZ;
  }

  // Get parent depths for sorting
  std::unordered_map<int32_t, float> parentDepth;
  for (auto &[parentTag, childIndices] : parentToChildren) {
    if (!childIndices.empty()) {
      parentDepth[parentTag] = outNodes[childIndices[0]].zDepth - 1;
    }
  }

  // Sort parents by depth (deepest first = bottom-up processing)
  std::vector<int32_t> sortedParents;
  sortedParents.reserve(parentToChildren.size());
  for (auto &[parentTag, _] : parentToChildren) {
    sortedParents.push_back(parentTag);
  }
  std::sort(sortedParents.begin(), sortedParents.end(), [&](int32_t a, int32_t b) {
    return parentDepth[a] > parentDepth[b];
  });

  // === Process siblings bottom-up ===
  for (int32_t parentTag : sortedParents) {
    auto &childIndices = parentToChildren[parentTag];
    if (childIndices.size() < 2)
      continue;

    for (size_t i = 1; i < childIndices.size(); ++i) {
      size_t currIdx = childIndices[i];
      DrawableNode &curr = outNodes[currIdx];

      float currMinX = curr.absoluteX;
      float currMinY = curr.absoluteY;
      float currW = curr.node->width;
      float currH = curr.node->height;

      float maxZOffset = 0;

      // Check against all previous siblings
      for (size_t j = 0; j < i; ++j) {
        size_t prevIdx = childIndices[j];
        DrawableNode &prev = outNodes[prevIdx];

        float prevMinX = prev.absoluteX;
        float prevMinY = prev.absoluteY;
        float prevW = prev.node->width;
        float prevH = prev.node->height;

        if (rectsOverlap(currMinX, currMinY, currW, currH, prevMinX, prevMinY, prevW, prevH)) {
          // Use precomputed max z-depth of previous sibling's subtree
          float maxPrevZ = subtreeMaxZ[prevIdx];
          float neededOffset = (maxPrevZ + 1) - curr.zDepth;
          maxZOffset = std::max(maxZOffset, neededOffset);
        }
      }

      // Apply offset to current sibling and all its descendants
      if (maxZOffset > 0) {
        for (size_t idx : subtreeIndices[currIdx]) {
          outNodes[idx].zDepth += maxZOffset;
        }
        // Update subtreeMaxZ for this node and propagate up
        subtreeMaxZ[currIdx] += maxZOffset;

        // Propagate max z update to ancestors
        int32_t ancestorTag = outNodes[currIdx].node->parentTag;
        while (ancestorTag >= 0) {
          auto it = tagToIndex.find(ancestorTag);
          if (it == tagToIndex.end())
            break;
          size_t ancestorIdx = it->second;
          subtreeMaxZ[ancestorIdx] = std::max(subtreeMaxZ[ancestorIdx], subtreeMaxZ[currIdx]);
          ancestorTag = outNodes[ancestorIdx].node->parentTag;
        }
      }
    }
  }
}

enum class ViewMode { Layered, True3D };

// Transform a single point in 3D space and project to 2D using orthographic projection
// (parallel lines stay parallel - no perspective distortion)
void transformPoint3D(
    float inX,
    float inY,
    float inZ,
    float rotationRad,
    float centerX,
    float centerY,
    float centerZ,
    float &outX,
    float &outY,
    float &outZ) {
  // Translate to center
  float relX = inX - centerX;
  float relY = inY - centerY;
  float relZ = inZ - centerZ;

  // Rotate around Y axis
  float cosR = cosf(rotationRad);
  float sinR = sinf(rotationRad);
  float newX = relX * cosR - relZ * sinR;
  float newZ = relX * sinR + relZ * cosR;

  // Orthographic projection - no Y offset, just X changes from rotation
  outX = centerX + newX;
  outY = centerY + relY;
  outZ = newZ;
}

// For layered mode: simple X offset based on depth only
void transformLayered(float &x, float rotationDeg, float zDepth, float depthSpacing) {
  float rotationRad = rotationDeg * 3.14159265f / 180.0f;
  float z = zDepth * depthSpacing;

  float sinR = sinf(rotationRad);

  // Offset X based on depth and rotation (layers slide left/right)
  x = x - z * sinR;
}

void drawViewTree3D(
    const TreeSnapshot &snapshot,
    ImDrawList *drawList,
    ImVec2 offset,
    float scale,
    const std::set<int32_t> &hiddenTags,
    float rotationDeg,
    float depthSpacing,
    ViewMode viewMode,
    const std::vector<int32_t> &rootTags,
    bool enableHover) {
  // Collect all nodes with overlap-aware depth layering
  std::vector<DrawableNode> nodes;
  collectNodesWithOverlapHandling(snapshot, hiddenTags, nodes, rootTags);

  if (nodes.empty()) {
    return;
  }

  float rotationRad = rotationDeg * 3.14159265f / 180.0f;

  // Find center point for rotation
  float centerX = offset.x + 200 * scale;
  float centerY = offset.y + 400 * scale;
  float centerZ = 0;

  // Structure for drawn items (for hover detection)
  struct DrawnItem {
    ImVec2 points[4]; // Quad corners for hit testing
    const ViewNode *node;
    bool wasMutated;
    float sortZ;
  };
  std::vector<DrawnItem> drawnItems;

  // Pre-calculate transformed positions and sort Z for each node
  struct TransformedNode {
    const DrawableNode *drawable;
    ImVec2 corners[4]; // Transformed corners
    float sortZ;
  };
  std::vector<TransformedNode> transformedNodes;
  transformedNodes.reserve(nodes.size());

  for (const auto &drawable : nodes) {
    const ViewNode &node = *drawable.node;

    float x = offset.x + drawable.absoluteX * scale;
    float y = offset.y + drawable.absoluteY * scale;
    float w = node.width * scale;
    float h = node.height * scale;
    float z = drawable.zDepth * depthSpacing;

    TransformedNode tn;
    tn.drawable = &drawable;

    if (viewMode == ViewMode::True3D && std::abs(rotationDeg) > 0.1f) {
      // True 3D: transform all 4 corners
      float corners3D[4][3] = {
          {x, y, z}, // top-left
          {x + w, y, z}, // top-right
          {x + w, y + h, z}, // bottom-right
          {x, y + h, z} // bottom-left
      };

      float totalZ = 0;
      for (int i = 0; i < 4; i++) {
        float outX, outY, outZ;
        transformPoint3D(
            corners3D[i][0],
            corners3D[i][1],
            corners3D[i][2],
            rotationRad,
            centerX,
            centerY,
            centerZ,
            outX,
            outY,
            outZ);
        tn.corners[i] = ImVec2(outX, outY);
        totalZ += outZ;
      }
      tn.sortZ = totalZ / 4.0f; // Average Z for sorting
    } else if (viewMode == ViewMode::Layered && std::abs(rotationDeg) > 0.1f) {
      // Layered mode: all corners stay as rectangle, just offset X by depth
      float layerX = x;
      transformLayered(layerX, rotationDeg, drawable.zDepth, depthSpacing);

      tn.corners[0] = ImVec2(layerX, y);
      tn.corners[1] = ImVec2(layerX + w, y);
      tn.corners[2] = ImVec2(layerX + w, y + h);
      tn.corners[3] = ImVec2(layerX, y + h);
      tn.sortZ = drawable.zDepth; // Higher depth = drawn later (on top)
    } else {
      // No rotation - simple rectangle
      tn.corners[0] = ImVec2(x, y);
      tn.corners[1] = ImVec2(x + w, y);
      tn.corners[2] = ImVec2(x + w, y + h);
      tn.corners[3] = ImVec2(x, y + h);
      tn.sortZ = drawable.zDepth; // Higher depth = drawn later (on top)
    }

    transformedNodes.push_back(tn);
  }

  // Sort back to front
  std::sort(transformedNodes.begin(), transformedNodes.end(), [](const TransformedNode &a, const TransformedNode &b) {
    return a.sortZ < b.sortZ;
  });

  // Draw all nodes
  for (const auto &tn : transformedNodes) {
    const ViewNode &node = *tn.drawable->node;

    bool wasMutated = snapshot.mutatedTags.count(node.tag) > 0;
    ImU32 color = wasMutated ? reanimated::mutationTypeToColor(node.lastMutationType)
                             : IM_COL32(80, 80, 80, static_cast<int>(node.opacity * 255));
    ImU32 borderColor = wasMutated ? IM_COL32(255, 255, 255, 200) : IM_COL32(120, 120, 120, 200);

    // Draw as quad
    drawList->AddQuadFilled(tn.corners[0], tn.corners[1], tn.corners[2], tn.corners[3], color);
    drawList->AddQuad(tn.corners[0], tn.corners[1], tn.corners[2], tn.corners[3], borderColor);

    // Store for hover detection
    DrawnItem item;
    for (int i = 0; i < 4; i++)
      item.points[i] = tn.corners[i];
    item.node = &node;
    item.wasMutated = wasMutated;
    item.sortZ = tn.sortZ;
    drawnItems.push_back(item);

    // Draw label at top-left corner
    ImU32 textColor = wasMutated ? IM_COL32(255, 255, 255, 255) : IM_COL32(160, 160, 160, 255);
    char label[256];
    snprintf(
        label,
        sizeof(label),
        "%s [%d]\n(%.0f,%.0f) %.0fx%.0f",
        node.componentName.c_str(),
        node.tag,
        node.x,
        node.y,
        node.width,
        node.height);
    drawList->AddText(ImVec2(tn.corners[0].x + 2, tn.corners[0].y + 2), textColor, label);
  }

  // Check for hover using point-in-quad test (iterate in reverse for topmost first)
  // Only check hover if enabled (i.e., canvas is hovered)
  if (!enableHover) {
    return;
  }

  ImVec2 mousePos = ImGui::GetMousePos();

  // Point-in-quad test using ray casting (works for any convex or concave quad)
  auto pointInQuad = [](ImVec2 p, const ImVec2 quad[4]) -> bool {
    int intersections = 0;
    for (int i = 0; i < 4; i++) {
      ImVec2 v1 = quad[i];
      ImVec2 v2 = quad[(i + 1) % 4];

      // Check if ray from p going right intersects edge v1-v2
      if ((v1.y > p.y) != (v2.y > p.y)) {
        float xIntersect = v1.x + (p.y - v1.y) / (v2.y - v1.y) * (v2.x - v1.x);
        if (p.x < xIntersect) {
          intersections++;
        }
      }
    }
    return (intersections % 2) == 1;
  };

  for (auto it = drawnItems.rbegin(); it != drawnItems.rend(); ++it) {
    const auto &item = *it;
    if (pointInQuad(mousePos, item.points)) {
      // Found hovered node - show tooltip
      ImGui::BeginTooltip();
      ImGui::Text("Component: %s", item.node->componentName.c_str());
      ImGui::Text("Tag: %d", item.node->tag);
      ImGui::Separator();
      ImGui::Text("Position: (%.1f, %.1f)", item.node->x, item.node->y);
      ImGui::Text("Size: %.1f x %.1f", item.node->width, item.node->height);
      ImGui::Text("Opacity: %.2f", item.node->opacity);
      ImGui::Text("Background Color:");
      ImGui::SameLine();
      //color is argb and should be rgba
      uint32_t argbColor = static_cast<uint32_t>(item.node->backgroundColor);
      uint32_t rgbaColor = ((argbColor & 0xFF000000) >> 24) | // A
          ((argbColor & 0x00FF0000) << 8) | // R
          ((argbColor & 0x0000FF00) << 8) | // G
          ((argbColor & 0x000000FF) << 8); // B
      ImVec4 bgColor = ImGui::ColorConvertU32ToFloat4(rgbaColor);
      ImGui::TextColored(bgColor, "%08X", rgbaColor);
      ImGui::Separator();
      ImGui::Text("Parent Tag: %d", item.node->parentTag);
      ImGui::Text("Index in Parent: %d", item.node->indexInParent);
      ImGui::Text("Children: %zu", item.node->childTags.size());
      ImGui::Separator();
      const char *mutationType = reanimated::mutationTypeToString(item.node->lastMutationType);
      if (item.wasMutated) {
        ImGui::TextColored(ImVec4(0.4f, 0.8f, 0.4f, 1.0f), "Mutated: %s", mutationType);
      } else {
        ImGui::TextColored(ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "Not mutated this batch");
        ImGui::Text("Last mutation: %s", mutationType);
      }
      ImGui::EndTooltip();

      // Highlight hovered quad
      drawList->AddQuad(
          item.points[0], item.points[1], item.points[2], item.points[3], IM_COL32(255, 255, 0, 255), 3.0f);
      break;
    }
  }
}

// Helper function to generate a color for an event based on its string ID
ImU32 getColorForStringId(uint32_t stringId) {
  // Use a deterministic color based on string ID
  uint32_t hash = stringId * 2654435761u; // Knuth's multiplicative hash
  uint8_t r = 100 + (hash & 0xFF) % 155;
  uint8_t g = 100 + ((hash >> 8) & 0xFF) % 155;
  uint8_t b = 100 + ((hash >> 16) & 0xFF) % 155;
  return IM_COL32(r, g, b, 255);
}

// Render the profiler timeline with virtualization
HoveredEventInfo renderProfilerTimeline(ImDrawList *drawList, ImVec2 windowPos, ImVec2 windowSize) {
  HoveredEventInfo hoveredEvent;
  std::lock_guard<std::mutex> lock(g_profilerMutex);

  if (g_threadTimelines.empty() || g_profilerMinTimeNs == UINT64_MAX) {
    ImGui::SetCursorPos(ImVec2(10, 30));
    ImGui::Text("No profiler data yet. Waiting for events...");
    return hoveredEvent;
  }

  // Get mouse position for hover detection
  ImVec2 mousePos = ImGui::GetMousePos();
  bool isHoveringCanvas = ImGui::IsItemHovered();

  // Timeline area (after header)
  float timelineX = windowPos.x + PROFILER_HEADER_WIDTH;
  float timelineWidth = windowSize.x - PROFILER_HEADER_WIDTH;

  if (timelineWidth <= 0)
    return hoveredEvent;

  // Calculate total time range
  uint64_t totalTimeRangeNs = g_profilerMaxTimeNs - g_profilerMinTimeNs;

  // If locked to latest, auto-scroll to show latest events
  if (g_profilerLockToLatest && totalTimeRangeNs > 0) {
    double viewWidthNs = timelineWidth * g_profilerNsPerPixel;
    g_profilerViewStartNs = static_cast<double>(totalTimeRangeNs) - viewWidthNs;
    if (g_profilerViewStartNs < 0)
      g_profilerViewStartNs = 0;
  }

  // View bounds in relative nanoseconds
  double viewStartNs = g_profilerViewStartNs;
  double viewEndNs = viewStartNs + timelineWidth * g_profilerNsPerPixel;

  // Header background
  drawList->AddRectFilled(
      windowPos, ImVec2(windowPos.x + PROFILER_HEADER_WIDTH, windowPos.y + windowSize.y), IM_COL32(40, 40, 40, 255));

  // Draw grid lines (time markers)
  double gridInterval = 1000000.0; // 1ms
  double viewRangeNs = viewEndNs - viewStartNs;
  if (viewRangeNs > 50000000)
    gridInterval = 10000000.0; // 10ms
  if (viewRangeNs > 500000000)
    gridInterval = 100000000.0; // 100ms
  if (viewRangeNs < 5000000)
    gridInterval = 100000.0; // 0.1ms
  if (viewRangeNs < 500000)
    gridInterval = 10000.0; // 0.01ms

  double firstGrid = std::floor(viewStartNs / gridInterval) * gridInterval;
  for (double t = firstGrid; t <= viewEndNs; t += gridInterval) {
    if (t < viewStartNs)
      continue;
    float x = timelineX + static_cast<float>((t - viewStartNs) / g_profilerNsPerPixel);
    if (x >= timelineX && x < timelineX + timelineWidth) {
      drawList->AddLine(ImVec2(x, windowPos.y), ImVec2(x, windowPos.y + windowSize.y), IM_COL32(60, 60, 60, 255));

      // Time label
      double timeMs = t / 1000000.0;
      char timeLabel[32];
      if (timeMs >= 1.0) {
        snprintf(timeLabel, sizeof(timeLabel), "%.1fms", timeMs);
      } else {
        snprintf(timeLabel, sizeof(timeLabel), "%.2fms", timeMs);
      }
      drawList->AddText(ImVec2(x + 2, windowPos.y + 2), IM_COL32(150, 150, 150, 255), timeLabel);
    }
  }

  // Sort threads by ID for consistent ordering
  std::vector<uint32_t> threadIds;
  for (const auto &[threadId, timeline] : g_threadTimelines) {
    threadIds.push_back(threadId);
  }
  std::sort(threadIds.begin(), threadIds.end());

  // Render each thread timeline
  float currentY = 20.0f - g_profilerViewOffsetY; // Start below time labels
  for (uint32_t threadId : threadIds) {
    const auto &timeline = g_threadTimelines[threadId];

    // Check if this row is visible
    float rowTop = windowPos.y + currentY;
    float rowBottom = rowTop + PROFILER_ROW_HEIGHT;

    if (rowBottom >= windowPos.y && rowTop < windowPos.y + windowSize.y) {
      // Draw row background (alternating colors)
      size_t threadIndex = std::find(threadIds.begin(), threadIds.end(), threadId) - threadIds.begin();
      ImU32 rowBgColor = (threadIndex % 2 == 0) ? IM_COL32(30, 30, 35, 255) : IM_COL32(35, 35, 40, 255);
      drawList->AddRectFilled(ImVec2(timelineX, rowTop), ImVec2(timelineX + timelineWidth, rowBottom), rowBgColor);

      // Draw thread label in header
      char threadLabel[128];
      snprintf(threadLabel, sizeof(threadLabel), "%s (%zu)", timeline.threadName.c_str(), timeline.events.size());
      drawList->AddText(ImVec2(windowPos.x + 5, rowTop + 4), IM_COL32(255, 255, 255, 255), threadLabel);

      // Draw events for this thread (with virtualization)
      for (const auto &event : timeline.events) {
        // Convert to relative time
        double eventStartRel = static_cast<double>(event.startTimeNs - g_profilerMinTimeNs);
        double eventEndRel = static_cast<double>(event.endTimeNs - g_profilerMinTimeNs);

        // Check if event is in visible time range
        if (eventEndRel < viewStartNs || eventStartRel > viewEndNs) {
          continue;
        }

        // Calculate pixel positions
        float startX = timelineX + static_cast<float>((eventStartRel - viewStartNs) / g_profilerNsPerPixel);
        float endX = timelineX + static_cast<float>((eventEndRel - viewStartNs) / g_profilerNsPerPixel);

        // Clamp to visible area
        startX = std::max(startX, timelineX);
        endX = std::min(endX, timelineX + timelineWidth);

        float width = endX - startX;
        if (width < 1.0f) {
          endX = startX + 1.0f; // Minimum width for visibility
          width = 1.0f;
        }

        // Draw event rectangle
        ImU32 eventColor = getColorForStringId(event.stringId);
        ImVec2 eventMin(startX, rowTop + 2);
        ImVec2 eventMax(endX, rowBottom - 2);
        drawList->AddRectFilled(eventMin, eventMax, eventColor);
        drawList->AddRect(eventMin, eventMax, IM_COL32(255, 255, 255, 100));

        // Check if mouse is hovering over this event
        if (isHoveringCanvas && mousePos.x >= eventMin.x && mousePos.x <= eventMax.x && mousePos.y >= eventMin.y &&
            mousePos.y <= eventMax.y) {
          // Highlight the hovered event
          drawList->AddRect(eventMin, eventMax, IM_COL32(255, 255, 0, 255), 0.0f, 0, 2.0f);

          // Store hover info
          hoveredEvent.isValid = true;
          auto it = reanimated::g_profilerStrings.find(event.stringId);
          hoveredEvent.name = (it != reanimated::g_profilerStrings.end()) ? it->second : "Unknown";
          hoveredEvent.threadName = timeline.threadName;
          hoveredEvent.durationUs = (eventEndRel - eventStartRel) / 1000.0;
          hoveredEvent.startTimeMs = eventStartRel / 1000000.0;
          hoveredEvent.endTimeMs = eventEndRel / 1000000.0;
        }

        // Draw event label if wide enough
        if (width > 40) {
          std::string name = "?";
          auto it = reanimated::g_profilerStrings.find(event.stringId);
          if (it != reanimated::g_profilerStrings.end()) {
            name = it->second;
          }

          // Add duration to label
          double durationUs = (eventEndRel - eventStartRel) / 1000.0;
          char label[128];
          if (width > 120) {
            snprintf(label, sizeof(label), "%s (%.1fus)", name.c_str(), durationUs);
          } else {
            snprintf(label, sizeof(label), "%s", name.c_str());
          }

          // Clip text to event bounds
          ImVec4 clipRect(eventMin.x, eventMin.y, eventMax.x, eventMax.y);
          drawList->AddText(
              nullptr,
              0.0f,
              ImVec2(startX + 2, rowTop + 4),
              IM_COL32(255, 255, 255, 255),
              label,
              nullptr,
              0.0f,
              &clipRect);
        }
      }

      // Draw horizontal separator
      drawList->AddLine(
          ImVec2(windowPos.x, rowBottom), ImVec2(windowPos.x + windowSize.x, rowBottom), IM_COL32(80, 80, 80, 255));
    }

    currentY += PROFILER_ROW_HEIGHT + PROFILER_ROW_SPACING;
  }

  // Draw vertical line at header edge
  drawList->AddLine(
      ImVec2(windowPos.x + PROFILER_HEADER_WIDTH, windowPos.y),
      ImVec2(windowPos.x + PROFILER_HEADER_WIDTH, windowPos.y + windowSize.y),
      IM_COL32(80, 80, 80, 255));

  return hoveredEvent;
}

int main(int argc, char *argv[]) {
  int port = 8765;
  if (argc > 1) {
    port = std::atoi(argv[1]);
  }

  // Start network thread
  std::thread netThread(networkThread, port);

  // Initialize GLFW
  if (!glfwInit()) {
    std::cerr << "Failed to initialize GLFW\n";
    return 1;
  }

  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);

  GLFWwindow *window = glfwCreateWindow(1280, 720, "Reanimated DevTools", nullptr, nullptr);
  if (!window) {
    std::cerr << "Failed to create window\n";
    glfwTerminate();
    return 1;
  }

  glfwMakeContextCurrent(window);
  glfwSwapInterval(1);

  // Initialize ImGui
  IMGUI_CHECKVERSION();
  ImGui::CreateContext();
  ImGuiIO &io = ImGui::GetIO();
  io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;

  ImGui::StyleColorsDark();
  ImGui_ImplGlfw_InitForOpenGL(window, true);
  ImGui_ImplOpenGL3_Init("#version 330");

  float viewScale = 0.5f;
  ImVec2 viewOffset(50, 50);
  char hiddenTagsInput[256] = "";
  std::set<int32_t> hiddenTags;
  float rotationDeg = 0.0f;
  float depthSpacing = 50.0f;
  int viewModeInt = 0; // 0 = Layered, 1 = True3D

  // Initialize profiler view
  g_profilerNsPerPixel = 100000.0; // 100 microseconds per pixel (good default)

  while (!glfwWindowShouldClose(window) && g_running) {
    glfwPollEvents();

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    // Control panel
    ImGui::Begin("Controls");

    {
      std::lock_guard<std::mutex> lock(g_mutex);

      ImGui::Text("Snapshots: %zu", g_snapshots.size());

      if (!g_snapshots.empty()) {
        ImGui::SliderInt("Snapshot", &g_currentSnapshotIndex, 0, static_cast<int>(g_snapshots.size()) - 1);

        if (ImGui::Button("< Prev") && g_currentSnapshotIndex > 0) {
          g_currentSnapshotIndex--;
        }
        ImGui::SameLine();
        if (ImGui::Button("Next >") && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size()) - 1) {
          g_currentSnapshotIndex++;
        }
        ImGui::SameLine();
        if (ImGui::Button("Latest")) {
          g_currentSnapshotIndex = static_cast<int>(g_snapshots.size()) - 1;
        }

        if (g_currentSnapshotIndex >= 0 && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size())) {
          ImGui::Text("%s", g_snapshots[g_currentSnapshotIndex].label.c_str());
        }
      }

      if (ImGui::Button("Clear All")) {
        g_snapshots.clear();
        g_currentTree.clear();
        g_currentRoots.clear();
        g_currentSnapshotIndex = -1;
        g_snapshotCounter = 0;
      }
    }

    ImGui::Separator();
    ImGui::SliderFloat("Scale", &viewScale, 0.1f, 2.0f);
    ImGui::DragFloat2("Offset", &viewOffset.x);

    ImGui::Separator();
    ImGui::Text("3D View:");
    ImGui::SliderFloat("Rotation", &rotationDeg, -90.0f, 90.0f, "%.1f deg");
    ImGui::SliderFloat("Depth Spacing", &depthSpacing, 0.0f, 200.0f);
    ImGui::Text("View Mode:");
    ImGui::RadioButton("Layered", &viewModeInt, 0);
    ImGui::SameLine();
    ImGui::RadioButton("True 3D", &viewModeInt, 1);
    if (ImGui::Button("Reset 3D")) {
      rotationDeg = 0.0f;
      depthSpacing = 50.0f;
    }

    ImGui::Separator();
    ImGui::Text("Hidden Tags (comma-separated):");
    if (ImGui::InputText("##hiddentags", hiddenTagsInput, sizeof(hiddenTagsInput))) {
      // Parse the input and update hiddenTags set
      hiddenTags.clear();
      std::stringstream ss(hiddenTagsInput);
      std::string token;
      while (std::getline(ss, token, ',')) {
        // Trim whitespace
        size_t start = token.find_first_not_of(" \t");
        size_t end = token.find_last_not_of(" \t");
        if (start != std::string::npos && end != std::string::npos) {
          token = token.substr(start, end - start + 1);
          try {
            int32_t tag = std::stoi(token);
            hiddenTags.insert(tag);
          } catch (...) {
            // Ignore invalid numbers
          }
        }
      }
    }
    if (!hiddenTags.empty()) {
      ImGui::Text("Hiding %zu tags", hiddenTags.size());
    }

    ImGui::Separator();
    ImGui::Text("Legend:");
    ImGui::TextColored(ImVec4(0.4f, 0.8f, 0.4f, 1.0f), "CREATE");
    ImGui::TextColored(ImVec4(0.8f, 0.4f, 0.4f, 1.0f), "DELETE");
    ImGui::TextColored(ImVec4(0.4f, 0.6f, 0.8f, 1.0f), "INSERT");
    ImGui::TextColored(ImVec4(0.8f, 0.6f, 0.4f, 1.0f), "REMOVE");
    ImGui::TextColored(ImVec4(0.8f, 0.8f, 0.4f, 1.0f), "UPDATE");

    ImGui::End();

    // Mutations list
    ImGui::Begin("Mutations");
    {
      std::lock_guard<std::mutex> lock(g_mutex);

      if (g_currentSnapshotIndex >= 0 && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size())) {
        const auto &snapshot = g_snapshots[g_currentSnapshotIndex];

        for (size_t i = 0; i < snapshot.mutations.size(); ++i) {
          const auto &mut = snapshot.mutations[i];
          ImU32 color = reanimated::mutationTypeToColor(mut.type);
          ImGui::PushStyleColor(ImGuiCol_Text, color);
          ImGui::Text(
              "[%zu] %s tag=%d parent=%d idx=%d %s (%.0f,%.0f,%.0f,%.0f)",
              i,
              reanimated::mutationTypeToString(mut.type),
              mut.tag,
              mut.parentTag,
              mut.index,
              mut.componentName,
              mut.x,
              mut.y,
              mut.width,
              mut.height);
          ImGui::PopStyleColor();
        }
      }
    }
    ImGui::End();

    // View tree visualization
    // Allow window movement when Alt is held, otherwise capture input for pan/zoom
    bool altHeld = ImGui::GetIO().KeyAlt;
    ImGuiWindowFlags viewTreeFlags = ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse;
    ImGui::Begin("View Tree", nullptr, viewTreeFlags);
    {
      std::lock_guard<std::mutex> lock(g_mutex);

      // Get window info for input handling
      ImVec2 windowSize = ImGui::GetWindowSize();
      ImVec2 contentPos = ImGui::GetCursorScreenPos();
      ImVec2 contentSize = ImGui::GetContentRegionAvail();
      ImVec2 mousePos = ImGui::GetMousePos();

      bool isCanvasHovered = false;
      bool isCanvasActive = false;

      // Only create invisible button when Alt is NOT held - this allows window dragging when Alt is pressed
      if (!altHeld) {
        ImGui::InvisibleButton("##viewtree_canvas", contentSize);
        isCanvasHovered = ImGui::IsItemHovered();
        isCanvasActive = ImGui::IsItemActive();

        // Handle panning with mouse drag (left or middle button)
        if (isCanvasActive && ImGui::IsMouseDragging(ImGuiMouseButton_Left)) {
          ImVec2 delta = ImGui::GetMouseDragDelta(ImGuiMouseButton_Left);
          viewOffset.x += delta.x;
          viewOffset.y += delta.y;
          ImGui::ResetMouseDragDelta(ImGuiMouseButton_Left);
        }
        if (isCanvasHovered && ImGui::IsMouseDragging(ImGuiMouseButton_Middle)) {
          ImVec2 delta = ImGui::GetMouseDragDelta(ImGuiMouseButton_Middle);
          viewOffset.x += delta.x;
          viewOffset.y += delta.y;
          ImGui::ResetMouseDragDelta(ImGuiMouseButton_Middle);
        }

        // Handle zoom with scroll wheel
        if (isCanvasHovered) {
          float scrollY = ImGui::GetIO().MouseWheel;
          if (std::abs(scrollY) > 0.0f) {
            // Zoom centered on mouse position
            float zoomFactor = 1.0f + scrollY * 0.1f;
            float newScale = viewScale * zoomFactor;
            newScale = std::max(0.05f, std::min(5.0f, newScale)); // Clamp scale

            // Adjust offset to zoom towards mouse position
            float mouseRelX = mousePos.x - contentPos.x - viewOffset.x;
            float mouseRelY = mousePos.y - contentPos.y - viewOffset.y;

            viewOffset.x -= mouseRelX * (newScale / viewScale - 1.0f);
            viewOffset.y -= mouseRelY * (newScale / viewScale - 1.0f);

            viewScale = newScale;
          }
        }
      }

      if (g_currentSnapshotIndex >= 0 && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size())) {
        const auto &snapshot = g_snapshots[g_currentSnapshotIndex];

        ImDrawList *drawList = ImGui::GetWindowDrawList();

        ImVec2 actualOffset(contentPos.x + viewOffset.x, contentPos.y + viewOffset.y);

        // Draw using 3D view
        ViewMode viewMode = (viewModeInt == 0) ? ViewMode::Layered : ViewMode::True3D;
        drawViewTree3D(
            snapshot,
            drawList,
            actualOffset,
            viewScale,
            hiddenTags,
            rotationDeg,
            depthSpacing,
            viewMode,
            snapshot.rootTags,
            isCanvasHovered);

        // Show hint text
        ImGui::SetCursorPos(ImVec2(10, windowSize.y - 25));
        ImGui::TextColored(ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "Drag to pan, scroll to zoom, hold Alt to move window");
      } else {
        ImGui::SetCursorPos(ImVec2(10, 30));
        ImGui::Text("No snapshots yet. Connect your app to see mutations.");
      }
    }
    ImGui::End();

    // Profiler Timeline window
    ImGui::Begin("Profiler Timeline", nullptr, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);
    {
      // Controls toolbar at top
      ImGui::Checkbox("Lock to latest", &g_profilerLockToLatest);
      ImGui::SameLine();
      if (ImGui::Button("Reset View")) {
        g_profilerViewStartNs = 0.0;
        g_profilerViewOffsetY = 0.0f;
        g_profilerNsPerPixel = 100000.0; // 100us per pixel
        g_profilerLockToLatest = true;
      }
      ImGui::SameLine();
      if (ImGui::Button("Clear")) {
        std::lock_guard<std::mutex> lock(g_profilerMutex);
        g_threadTimelines.clear();
        g_profilerMinTimeNs = UINT64_MAX;
        g_profilerMaxTimeNs = 0;
      }

      // Info overlay
      {
        std::lock_guard<std::mutex> lock(g_profilerMutex);
        size_t totalEvents = 0;
        for (const auto &[tid, timeline] : g_threadTimelines) {
          totalEvents += timeline.events.size();
        }

        // Format zoom level nicely
        const char *zoomUnit = "ns/px";
        double zoomValue = g_profilerNsPerPixel;
        if (zoomValue >= 1000000.0) {
          zoomValue /= 1000000.0;
          zoomUnit = "ms/px";
        } else if (zoomValue >= 1000.0) {
          zoomValue /= 1000.0;
          zoomUnit = "us/px";
        }

        ImGui::SameLine(ImGui::GetWindowWidth() - 350);
        ImGui::Text(
            "Threads: %zu | Events: %zu | Zoom: %.1f %s", g_threadTimelines.size(), totalEvents, zoomValue, zoomUnit);
      }

      ImGui::Separator();

      // Handle WASD navigation and zoom
      bool profilerFocused = ImGui::IsWindowFocused();
      if (profilerFocused) {
        constexpr double PAN_SPEED_FACTOR = 20.0; // Pixels worth of panning per frame
        constexpr float ZOOM_SPEED = 1.1f;

        // Horizontal pan: A (left) and D (right)
        if (ImGui::IsKeyDown(ImGuiKey_A)) {
          g_profilerLockToLatest = false; // User took control
          g_profilerViewStartNs -= PAN_SPEED_FACTOR * g_profilerNsPerPixel;
          if (g_profilerViewStartNs < 0)
            g_profilerViewStartNs = 0;
        }
        if (ImGui::IsKeyDown(ImGuiKey_D)) {
          g_profilerLockToLatest = false; // User took control
          g_profilerViewStartNs += PAN_SPEED_FACTOR * g_profilerNsPerPixel;
        }

        // Zoom: W (zoom in) and S (zoom out)
        if (ImGui::IsKeyDown(ImGuiKey_W)) {
          g_profilerNsPerPixel /= ZOOM_SPEED;
          if (g_profilerNsPerPixel < 10.0) // Min 10ns per pixel
            g_profilerNsPerPixel = 10.0;
        }
        if (ImGui::IsKeyDown(ImGuiKey_S)) {
          g_profilerNsPerPixel *= ZOOM_SPEED;
          if (g_profilerNsPerPixel > 1000000000.0) // Max 1s per pixel
            g_profilerNsPerPixel = 1000000000.0;
        }

        // Zoom: Q (zoom out) and E (zoom in)
        if (ImGui::IsKeyDown(ImGuiKey_Q)) {
          g_profilerNsPerPixel *= ZOOM_SPEED;
          if (g_profilerNsPerPixel > 1000000000.0) // Max 1s per pixel
            g_profilerNsPerPixel = 1000000000.0;
        }
        if (ImGui::IsKeyDown(ImGuiKey_E)) {
          g_profilerNsPerPixel /= ZOOM_SPEED;
          if (g_profilerNsPerPixel < 10.0) // Min 10ns per pixel
            g_profilerNsPerPixel = 10.0;
        }

        // Mouse wheel zoom (zoom towards mouse position)
        float scrollY = ImGui::GetIO().MouseWheel;
        if (std::abs(scrollY) > 0.0f) {
          double zoomFactor = 1.0 + scrollY * 0.1;
          g_profilerNsPerPixel /= zoomFactor;
          g_profilerNsPerPixel = std::max(10.0, std::min(1000000000.0, g_profilerNsPerPixel));
        }

        // Reset view: R
        if (ImGui::IsKeyPressed(ImGuiKey_R)) {
          g_profilerViewStartNs = 0.0;
          g_profilerViewOffsetY = 0.0f;
          g_profilerNsPerPixel = 100000.0; // 100us per pixel
          g_profilerLockToLatest = true;
        }
      }

      // Get window size for rendering (after toolbar)
      ImVec2 windowSize = ImGui::GetContentRegionAvail();
      ImVec2 windowPos = ImGui::GetCursorScreenPos();

      // Auto-scroll to latest when locked
      if (g_profilerLockToLatest && g_profilerMaxTimeNs > g_profilerMinTimeNs) {
        double timeRangeNs = static_cast<double>(g_profilerMaxTimeNs - g_profilerMinTimeNs);
        double viewWidthNs = windowSize.x * g_profilerNsPerPixel;
        // Position view so latest events are visible on the right
        g_profilerViewStartNs = std::max(0.0, timeRangeNs - viewWidthNs * 0.9);
      }

      // Only render if window has valid size
      if (windowSize.x > 0 && windowSize.y > 0) {
        // Create an invisible button to capture input
        ImGui::InvisibleButton("##profiler_canvas", windowSize);

        // Render the timeline and get hovered event
        ImDrawList *drawList = ImGui::GetWindowDrawList();
        HoveredEventInfo hoveredEvent = renderProfilerTimeline(drawList, windowPos, windowSize);

        // Show tooltip if hovering over an event
        if (hoveredEvent.isValid) {
          ImGui::BeginTooltip();
          ImGui::Text("Event: %s", hoveredEvent.name.c_str());
          ImGui::Text("Thread: %s", hoveredEvent.threadName.c_str());
          ImGui::Text("Duration: %.2f us", hoveredEvent.durationUs);
          ImGui::Text("Start: %.3f ms", hoveredEvent.startTimeMs);
          ImGui::Text("End: %.3f ms", hoveredEvent.endTimeMs);
          ImGui::EndTooltip();
        }
      }

      // Controls hint at bottom
      ImGui::SetCursorPos(ImVec2(10, ImGui::GetWindowHeight() - 25));
      ImGui::TextColored(
          ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "A/D: pan | W/S/Q/E/scroll: zoom | R: reset | hover for details");
    }
    ImGui::End();

    // Render
    ImGui::Render();
    int displayW, displayH;
    glfwGetFramebufferSize(window, &displayW, &displayH);
    glViewport(0, 0, displayW, displayH);
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    glfwSwapBuffers(window);
  }

  g_running = false;
  netThread.join();

  ImGui_ImplOpenGL3_Shutdown();
  ImGui_ImplGlfw_Shutdown();
  ImGui::DestroyContext();

  glfwDestroyWindow(window);
  glfwTerminate();

  return 0;
}
