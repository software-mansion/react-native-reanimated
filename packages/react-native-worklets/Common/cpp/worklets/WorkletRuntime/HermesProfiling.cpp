#include <worklets/WorkletRuntime/HermesProfiling.h>

#include <hermes/hermes.h>

#include <chrono>
#include <filesystem>
#include <sstream>
#include <string>

namespace worklets {

static std::string generateUniqueProfilePath() {
  auto now = std::chrono::steady_clock::now().time_since_epoch().count();
  std::ostringstream oss;
  oss << "profile-" << now << ".cpuprofile";
  std::filesystem::path dir = std::filesystem::temp_directory_path();
  return (dir / oss.str()).string();
}

void startProfiling(facebook::jsi::Runtime &rt, double meanHzFreq) {
  auto *ihermes = facebook::jsi::castInterface<facebook::hermes::IHermes>(&rt);
  if (ihermes) {
    ihermes->registerForProfiling();
  }
  auto *api = facebook::jsi::castInterface<facebook::hermes::IHermesRootAPI>(facebook::hermes::makeHermesRootAPI());
  if (api) {
    api->enableSamplingProfiler(meanHzFreq);
  }
}

std::string stopProfiling(facebook::jsi::Runtime &rt) {
  std::string path = generateUniqueProfilePath();
  auto *api = facebook::jsi::castInterface<facebook::hermes::IHermesRootAPI>(facebook::hermes::makeHermesRootAPI());
  if (api) {
    api->dumpSampledTraceToFile(path);
    api->disableSamplingProfiler();
  }
  auto *ihermes = facebook::jsi::castInterface<facebook::hermes::IHermes>(&rt);
  if (ihermes) {
    ihermes->unregisterForProfiling();
  }
  return path;
}

} // namespace worklets
