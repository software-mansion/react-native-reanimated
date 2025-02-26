#include <worklets/Registries/WorkletRuntimeRegistry.h>

namespace worklets {

std::set<jsi::Runtime *> WorkletRuntimeRegistry::registry_{};
std::mutex WorkletRuntimeRegistry::mutex_{};

} // namespace worklets
