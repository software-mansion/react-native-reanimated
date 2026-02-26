#include <reanimated/Tools/ReanimatedVersion.h>

#ifndef NDEBUG
#include <regex>
#endif // NDEBUG
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
  rnRuntime.global().setProperty(rnRuntime, "_REANIMATED_VERSION_CPP", jsi::String::createFromUtf8(rnRuntime, version));
}

#ifndef NDEBUG
bool matchVersion(const std::string &version1, const std::string &version2) {
  std::regex pattern("^\\d+\\.\\d+\\.\\d+$");
  if (std::regex_match(version1, pattern) && std::regex_match(version2, pattern)) {
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

void checkJSVersion(jsi::Runtime &rt) {
  const auto cppVersion = getReanimatedCppVersion();
  const auto jsVersionValue = rt.global().getProperty(rt, "_REANIMATED_VERSION_JS");
  const auto docsBaseUrl = "https://docs.swmansion.com/react-native-reanimated/";
  const auto consoleWarn = rt.global().getPropertyAsObject(rt, "console").getPropertyAsFunction(rt, "warn");
  const auto libraryPrefix = std::string("[Reanimated] ");

  if (jsVersionValue.isUndefined()) {
    consoleWarn.call(
        rt,
        std::string(
            libraryPrefix +
            "C++ side failed to resolve JavaScript code "
            "version\n") +
            "See " + docsBaseUrl +
            "guides/"
            "troubleshooting#c-side-failed-to-resolve-javascript-code-version for "
            "more details.");
    return;
  }

  const auto jsVersion = jsVersionValue.asString(rt).utf8(rt);

  if (!matchVersion(cppVersion, jsVersion)) {
    consoleWarn.call(
        rt,
        std::string(
            libraryPrefix +
            "Mismatch between C++ code version and "
            "JavaScript code version (") +
            cppVersion + " vs. " + jsVersion + " respectively).\n" + "See " + docsBaseUrl +
            "/guides/"
            "troubleshooting#mismatch-between-c-code-version-and-javascript-code-"
            "version` for more details.");
    return;
  }
}
#else
void checkJSVersion(jsi::Runtime &rt) {
  // In release builds we don't check the version, hence
  // this function is a NOOP.
}
#endif // NDEBUG

}; // namespace reanimated
