#include <worklets/Tools/Defs.h>
#include <worklets/WorkletRuntime/HermesProfiling.h>

#include <string>

#if JS_RUNTIME_HERMES
#include <hermes/hermes.h>

#include <chrono>
#include <filesystem>
#include <sstream>
#endif

namespace worklets {

#if JS_RUNTIME_HERMES
static std::string generateUniqueProfilePath() {
  auto now = std::chrono::steady_clock::now().time_since_epoch().count();
  std::ostringstream oss;
  oss << "profile-" << now << ".cpuprofile";
  std::filesystem::path dir = std::filesystem::temp_directory_path();
  return (dir / oss.str()).string();
}
#endif

void startProfiling(facebook::jsi::Runtime &rt, double meanHzFreq) {
#if JS_RUNTIME_HERMES
#if REACT_NATIVE_MINOR_VERSION >= 81
  auto *ihermes = facebook::jsi::castInterface<facebook::hermes::IHermes>(&rt);
  if (ihermes) {
    ihermes->registerForProfiling();
  }
  auto *api = facebook::jsi::castInterface<facebook::hermes::IHermesRootAPI>(facebook::hermes::makeHermesRootAPI());
  if (api) {
    api->enableSamplingProfiler(meanHzFreq);
  }
#else
  (void)rt;
  (void)meanHzFreq;
  facebook::hermes::HermesRuntime::enableSamplingProfiler();
#endif
#else
  (void)rt;
  (void)meanHzFreq;
#endif
}

std::string stopProfiling(facebook::jsi::Runtime &rt) {
#if JS_RUNTIME_HERMES
  std::string path = generateUniqueProfilePath();
#if REACT_NATIVE_MINOR_VERSION >= 81
  auto *api = facebook::jsi::castInterface<facebook::hermes::IHermesRootAPI>(facebook::hermes::makeHermesRootAPI());
  if (api) {
    api->dumpSampledTraceToFile(path);
    api->disableSamplingProfiler();
  }
  auto *ihermes = facebook::jsi::castInterface<facebook::hermes::IHermes>(&rt);
  if (ihermes) {
    ihermes->unregisterForProfiling();
  }
#else
  (void)rt;
  facebook::hermes::HermesRuntime::dumpSampledTraceToFile(path);
  facebook::hermes::HermesRuntime::disableSamplingProfiler();
#endif
  return path;
#else
  (void)rt;
  return {};
#endif
}

} // namespace worklets
