#pragma once

#include <cstdint>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>
#include "protocol.h"

// Data structures for view tree and profiler
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
  uint64_t timestampNs = 0; // Timestamp when mutations were captured
};

// Profiler timeline data structures
struct ProfilerEventData {
  uint32_t stringId;
  uint64_t startTimeNs;
  uint64_t endTimeNs;
};

// Per-thread timeline
struct ThreadTimeline {
  int currentDepth = -1;
  uint32_t threadId;
  std::string threadName;
  std::vector<std::vector<ProfilerEventData>> eventsPerLane;
  uint64_t lastKnownTimeNs = 0;
};

// Hovered event info for tooltip
struct HoveredEventInfo {
  bool isValid = false;
  std::string name;
  std::string threadName;
  double durationUs;
  double startTimeMs;
  double endTimeMs;
};
