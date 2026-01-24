#pragma once

#include <vector>
#include "app_state.h"
#include "protocol.h"

namespace data {

void applyMutations(
    app::AppState &state,
    const std::vector<reanimated::SimpleMutation> &mutations,
    uint64_t timestampNs);

} // namespace data
