#pragma once

#include <vector>
#include "app_state.h"
#include "data_structures.h"

namespace data {

void recordProfilerEvent(app::AppState &state, const reanimated::ProfilerEvent &event);
void registerProfilerString(app::AppState &state, uint32_t id, const std::string &name);
void recordThreadMetadata(app::AppState &state, uint32_t threadId, const std::string &threadName);
int findSnapshotForTimestamp(app::AppState &state, uint64_t timestampNs);

} // namespace data
