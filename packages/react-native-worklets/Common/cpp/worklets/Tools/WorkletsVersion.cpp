#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/VersionUtils.h>
#include <worklets/Tools/WorkletsVersion.h>

#include <memory>
#include <string>

#ifdef WORKLETS_VERSION
#define STRINGIZE(x) #x
#define STRINGIZE2(x) STRINGIZE(x)
#define WORKLETS_VERSION_STRING STRINGIZE2(WORKLETS_VERSION)
#endif // WORKLETS_VERSION

using namespace facebook;

namespace worklets {

std::string getWorkletsCppVersion() {
  return std::string(WORKLETS_VERSION_STRING);
}

void injectWorkletsCppVersion(jsi::Runtime &rnRuntime) {
  auto version = getWorkletsCppVersion();
  rnRuntime.global().setProperty(rnRuntime, "_WORKLETS_VERSION_CPP", jsi::String::createFromUtf8(rnRuntime, version));
}

#ifndef NDEBUG
void checkJSVersion(jsi::Runtime &rnRuntime, const std::shared_ptr<worklets::JSLogger> &jsLogger) {
  auto cppVersion = getWorkletsCppVersion();
  auto jsVersionValue = rnRuntime.global().getProperty(rnRuntime, "_WORKLETS_VERSION_JS");
  worklets::checkJSVersion(
      rnRuntime,
      jsVersionValue,
      jsLogger,
      cppVersion,
      "Worklets",
      "https://docs.swmansion.com/react-native-worklets/docs");
}
#else
void checkJSVersion(jsi::Runtime &rnRuntime, const std::shared_ptr<worklets::JSLogger> &jsLogger) {
  // In release builds we don't check the version, hence
  // this function is a NOOP.
}
#endif // NDEBUG

}; // namespace worklets
