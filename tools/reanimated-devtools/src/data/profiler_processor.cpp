#include "data/profiler_processor.h"
#include <algorithm>
#include "app_state.h"
#include "protocol.h"

namespace data {

std::vector<EventWithDepth> assignEventDepths(const std::vector<ProfilerEventData> &events, uint64_t minTimeNs) {
  std::vector<EventWithDepth> eventsWithDepth;
  eventsWithDepth.reserve(events.size());

  // Convert to relative times and create EventWithDepth objects
  for (const auto &event : events) {
    EventWithDepth ewd;
    ewd.event = &event;
    ewd.startRel = static_cast<double>(event.startTimeNs - minTimeNs);
    ewd.endRel = static_cast<double>(event.endTimeNs - minTimeNs);
    ewd.depth = 0;
    eventsWithDepth.push_back(ewd);
  }

  // Sort by start time, then by duration (longer events first)
  std::sort(eventsWithDepth.begin(), eventsWithDepth.end(), [](const EventWithDepth &a, const EventWithDepth &b) {
    if (a.startRel != b.startRel)
      return a.startRel < b.startRel;
    return (b.endRel - b.startRel) < (a.endRel - a.startRel); // Longer duration first
  });

  // Assign depths using a greedy algorithm
  // Track the end time of the last event in each depth level
  std::vector<double> depthEndTimes;

  for (auto &ewd : eventsWithDepth) {
    // Find the first depth where this event doesn't overlap
    int assignedDepth = -1;
    bool foundSlot = false;

    for (size_t d = 0; d < depthEndTimes.size(); ++d) {
      if (ewd.startRel >= depthEndTimes[d]) {
        assignedDepth = static_cast<int>(d);
        depthEndTimes[d] = ewd.endRel;
        foundSlot = true;
        break;
      }
    }

    // If no slot found, create a new depth
    if (!foundSlot) {
      assignedDepth = static_cast<int>(depthEndTimes.size());
      depthEndTimes.push_back(ewd.endRel);
    }

    ewd.depth = assignedDepth;
  }

  return eventsWithDepth;
}

void recordProfilerEvent(app::AppState &state, const reanimated::ProfilerEvent &event) {
  std::lock_guard<std::mutex> lock(state.data.profilerMutex);

  // Store event in timeline
  ProfilerEventData eventData;
  eventData.stringId = event.stringId;
  eventData.threadId = event.threadId;
  eventData.startTimeNs = event.startTimeNs;
  eventData.endTimeNs = event.endTimeNs;

  // Link to snapshot by matching timestamps (use midpoint of event)
  uint64_t eventMidpointNs = (event.startTimeNs + event.endTimeNs) / 2;
  eventData.snapshotId = findSnapshotForTimestamp(state, eventMidpointNs);

  // Get or create thread timeline
  auto &timeline = state.data.threadTimelines[event.threadId];
  timeline.threadId = event.threadId;
  if (timeline.threadName.empty()) {
    // Use stored thread name or fall back to generic name
    auto nameIt = state.data.threadNames.find(event.threadId);
    if (nameIt != state.data.threadNames.end()) {
      timeline.threadName = nameIt->second;
    } else {
      timeline.threadName = "Thread " + std::to_string(event.threadId);
    }
  }
  timeline.events.push_back(eventData);

  // Update global time range
  state.data.profilerMinTimeNs = std::min(state.data.profilerMinTimeNs, event.startTimeNs);
  state.data.profilerMaxTimeNs = std::max(state.data.profilerMaxTimeNs, event.endTimeNs);
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
