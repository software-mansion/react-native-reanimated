#include <reanimated/Tools/ReanimatedVersion.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/VersionUtils.h>

#include <memory>
#include <string>

#ifdef REANIMATED_VERSION
#define STRINGIZE(x) #x
#define STRINGIZE2(x) STRINGIZE(x)
#define REANIMATED_VERSION_STRING STRINGIZE2(REANIMATED_VERSION)
#endif // REANIMATED_VERSION

using namespace facebook;

namespace reanimated {

std::string getReanimatedCppVersion() {
  return std::string(REANIMATED_VERSION_STRING);
}

void injectReanimatedCppVersion(jsi::Runtime &rnRuntime) {
  auto version = getReanimatedCppVersion();
  rnRuntime.global().setProperty(
      rnRuntime,
      "_REANIMATED_VERSION_CPP",
      jsi::String::createFromUtf8(rnRuntime, version));
}

#ifndef NDEBUG
void checkJSVersion(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<worklets::JSLogger> &jsLogger) {
  auto cppVersion = getReanimatedCppVersion();
  auto jsVersionValue =
      rnRuntime.global().getProperty(rnRuntime, "_REANIMATED_VERSION_JS");
  worklets::checkJSVersion(
      rnRuntime,
      jsVersionValue,
      jsLogger,
      cppVersion,
      "Reanimated",
      "https://docs.swmansion.com/react-native-reanimated/");
}
#else
void checkJSVersion(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<worklets::JSLogger> &jsLogger) {
  // In release builds we don't check the version, hence
  // this function is a NOOP.
}
#endif // NDEBUG

}; // namespace reanimated
