#include <worklets/Tools/VersionUtils.h>

#include <iostream>
#include <regex>

using namespace facebook;

namespace worklets {

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
    jsi::Runtime &runtime,
    jsi::Value &jsVersionValue,
    const std::shared_ptr<worklets::JSLogger> &jsLogger,
    const std::string &cppVersion,
    const std::string &libraryName,
    const std::string &docsBaseUrl) {
  const auto libraryPrefix = std::string("[" + libraryName + "] ");

  if (jsVersionValue.isUndefined()) {
    jsLogger->warnOnJS(
        std::string(
            libraryPrefix +
            "C++ side failed to resolve JavaScript code "
            "version\n") +
        "See " + docsBaseUrl +
        "/guides/"
        "troubleshooting#c-side-failed-to-resolve-javascript-code-version` for "
        "more details.");
    return;
  }

  const auto jsVersion = jsVersionValue.asString(runtime).utf8(runtime);

  if (!matchVersion(cppVersion, jsVersion)) {
    jsLogger->warnOnJS(
        std::string(
            libraryPrefix +
            "Mismatch between C++ code version and "
            "JavaScript code version (") +
        cppVersion + " vs. " + jsVersion + " respectively).\n" + "See " +
        docsBaseUrl +
        "/guides/"
        "troubleshooting#mismatch-between-c-code-version-and-javascript-code-"
        "version` for more details.");
    return;
  }
}

}; // namespace worklets
