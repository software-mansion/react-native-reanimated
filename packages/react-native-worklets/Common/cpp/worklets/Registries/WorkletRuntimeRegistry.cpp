#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <set>

namespace worklets {

std::set<jsi::Runtime *> WorkletRuntimeRegistry::registry_{};
std::shared_mutex WorkletRuntimeRegistry::mutex_{};

} // namespace worklets
