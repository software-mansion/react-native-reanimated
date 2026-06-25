#pragma once

#ifdef ANDROID

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/mapbuffer/MapBuffer.h>

namespace reanimated {

facebook::react::MapBuffer serializeSynchronousPropsToMapBuffer(
    const UpdatesBatch &synchronousUpdatesBatch);

} // namespace reanimated

#endif // ANDROID
