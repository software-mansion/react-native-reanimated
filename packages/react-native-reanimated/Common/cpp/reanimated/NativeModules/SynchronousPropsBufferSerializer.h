#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <vector>

namespace reanimated {

void serializeSynchronousPropsToBuffers(
    const UpdatesBatch &synchronousUpdatesBatch,
    std::vector<int> &intBuffer,
    std::vector<double> &doubleBuffer);

} // namespace reanimated
