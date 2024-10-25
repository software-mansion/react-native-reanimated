#include <worklets/Registries/WorkletRuntimeRegistry.h>

namespace worklets {

std::set<facebook::jsi::Runtime *> WorkletRuntimeRegistry::registry_{};
std::mutex WorkletRuntimeRegistry::mutex_{};

} // namespace worklets
