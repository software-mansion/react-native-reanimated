#include "data/profiler_processor.h"
#include <algorithm>
#include <cstdint>
#include <iostream>
#include "app_state.h"
#include "data_structures.h"
#include "protocol.h"

namespace data {

ThreadTimeline &getOrCreateThreadTimeline(app::AppState &state, uint32_t threadId) {
  if (!state.data.threadTimelines.count(threadId)) {
    std::cout << "Creating new timeline for threadId=" << threadId << "\n";
  }
  auto &timeline = state.data.threadTimelines[threadId];
  timeline.threadId = threadId;
  if (timeline.threadName.empty()) {

    // Use stored thread name or fall back to generic name
    auto nameIt = state.data.threadNames.find(threadId);
    if (nameIt != state.data.threadNames.end()) {
      timeline.threadName = nameIt->second;
    } else {
      timeline.threadName = "Thread " + std::to_string(threadId);
    }
  }
  return timeline;
}

void recordProfilerEvent(app::AppState &state, const reanimated::ProfilerEvent &event) {
  static bool broken = false;
  if (broken) {
    return;
  }

  std::lock_guard<std::mutex> lock(state.data.profilerMutex);

  auto &timeline = getOrCreateThreadTimeline(state, event.threadId);
  auto &depth = timeline.currentDepth;
  timeline.lastKnownTimeNs = event.timeNs;

  if (event.type == reanimated::ProfilerEventType::Begin) {
    depth++;
    ProfilerEventData eventData;
    eventData.stringId = event.stringId;
    eventData.startTimeNs = event.timeNs;
    eventData.endTimeNs = UINT64_MAX; // Will be filled on End event

    if (depth >= timeline.eventsPerLane.size()) {
      timeline.eventsPerLane.push_back({eventData});
    } else {
      timeline.eventsPerLane[depth].push_back(eventData);
    }

  } else if (event.type == reanimated::ProfilerEventType::End) {
    if (depth < 0) {
      std::cerr << "Warning: Received End event without matching Begin for threadId=" << event.threadId
                << " stringId=" << event.stringId << "\n";
      for (size_t laneIdx = 0; laneIdx < timeline.eventsPerLane.size(); laneIdx++) {
        const auto &laneEvents = timeline.eventsPerLane[laneIdx];
        const auto lastEvent = laneEvents.back();
        std::cerr << "  Lane " << laneIdx << ": " << laneEvents.size() << " events\n"
                  << "last event: " << state.data.profilerStrings.at(lastEvent.stringId)
                  << "time range: " << lastEvent.startTimeNs << " -> " << lastEvent.endTimeNs << "\n";
      }
      broken = true;
      return;
    }
    timeline.eventsPerLane[depth].back().endTimeNs = event.timeNs;
    depth--;
  }
}

void registerProfilerString(app::AppState &state, uint32_t id, const std::string &name) {
  std::lock_guard<std::mutex> lock(state.data.profilerMutex);
  state.data.profilerStrings[id] = name;
}

void recordThreadMetadata(app::AppState &state, uint32_t threadId, const std::string &threadName) {
  std::lock_guard<std::mutex> lock(state.data.profilerMutex);
  state.data.threadNames[threadId] = threadName;

  // Update existing timeline if it exists
  auto it = state.data.threadTimelines.find(threadId);
  if (it != state.data.threadTimelines.end()) {
    it->second.threadName = threadName;
  }
}

int findSnapshotForTimestamp(app::AppState &state, uint64_t timestampNs) {
  std::lock_guard<std::mutex> lock(state.data.snapshotMutex);

  if (state.data.snapshots.empty()) {
    return -1;
  }

  // Find the snapshot with the closest timestamp (within a reasonable window)
  constexpr uint64_t MAX_TIMESTAMP_DIFF_NS = 100000000; // 100ms tolerance
  int bestSnapshotId = -1;
  uint64_t minDiff = UINT64_MAX;

  for (const auto &snapshot : state.data.snapshots) {
    if (snapshot.timestampNs == 0)
      continue; // Skip snapshots without timestamp

    uint64_t diff = (timestampNs > snapshot.timestampNs) ? (timestampNs - snapshot.timestampNs)
                                                         : (snapshot.timestampNs - timestampNs);

    if (diff < minDiff && diff < MAX_TIMESTAMP_DIFF_NS) {
      minDiff = diff;
      bestSnapshotId = snapshot.id;
    }
  }

  return bestSnapshotId;
}

} // namespace data
