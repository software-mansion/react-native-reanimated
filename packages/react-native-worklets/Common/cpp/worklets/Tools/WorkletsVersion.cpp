#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/WorkletsVersion.h>

#include <iostream>
#include <memory>
#include <regex>
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
  rnRuntime.global().setProperty(
      rnRuntime,
      "_WORKLETS_VERSION_CPP",
      jsi::String::createFromUtf8(rnRuntime, version));
}

#ifndef NDEBUG
bool matchVersion(const std::string &version1, const std::string &version2) {
  std::regex pattern("^\\d+\\.\\d+\\.\\d+$");
  if (std::regex_match(version1, pattern) &&
      std::regex_match(version2, pattern)) {
    auto majorPattern = std::regex("^\\d+");
    std::smatch major1;
    std::smatch major2;
    std::regex_search(version1, major1, majorPattern);
    std::regex_search(version2, major2, majorPattern);
    if (major1 != major2) {
      return false;
    }
    auto minorPattern = std::regex("\\.\\d+\\.");
    std::smatch minor1;
    std::smatch minor2;
    std::regex_search(version1, minor1, minorPattern);
    std::regex_search(version2, minor2, minorPattern);
    if (minor1 != minor2) {
      return false;
    }
    return true;
  } else {
    return version1 == version2;
  }
}

void checkJSVersion(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<worklets::JSLogger> &jsLogger) {
  auto cppVersion = getWorkletsCppVersion();

  auto maybeJSVersion =
      rnRuntime.global().getProperty(rnRuntime, "_WORKLETS_VERSION_JS");

  std::cout << "maybeJSVersion: " << maybeJSVersion.isUndefined() << std::endl;
  if (maybeJSVersion.isUndefined()) {
    jsLogger->warnOnJS(
        std::string("[Worklets] C++ side failed to resolve JavaScript code "
                    "version\n") +
        "See "
        "`https://docs.swmansion.com/react-native-worklets/docs/guides/"
        "troubleshooting#c-side-failed-to-resolve-javascript-code-version` for "
        "more details.");
    return;
  }

  auto jsVersion = maybeJSVersion.asString(rnRuntime).utf8(rnRuntime);

  if (!matchVersion(cppVersion, jsVersion)) {
    jsLogger->warnOnJS(
        std::string("[Worklets] Mismatch between C++ code version and "
                    "JavaScript code version (") +
        cppVersion + " vs. " + jsVersion + " respectively).\n" +
        "See "
        "`https://docs.swmansion.com/react-native-reanimated/docs/guides/"
        "troubleshooting#mismatch-between-c-code-version-and-javascript-code-"
        "version` for more details.");
    return;
  }
}
#else
void checkJSVersion(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<worklets::JSLogger> &jsLogger) {
  // In release builds we don't check the version, hence
  // this function is a NOOP.
}

bool matchVersion(const std::string &version1, const std::string &version2) {
  // Stub implementation for release builds.
  return true;
}
#endif // NDEBUG

}; // namespace worklets
