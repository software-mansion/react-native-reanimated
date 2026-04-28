#include <worklets/Tools/VersionUtils.h>

#include <iostream>
#include <memory>
#include <regex>
#include <string>

using namespace facebook;

namespace worklets {

bool matchVersion(const std::string &version1, const std::string &version2) {
  std::regex pattern("^(\\d+)\\.(\\d+)\\.\\d+$");
  std::smatch mv1;
  std::smatch mv2;
  if (std::regex_match(version1, mv1, pattern) && std::regex_match(version2, mv2, pattern)) {
    return mv1[1].str() == mv2[1].str() && mv1[2].str() == mv2[2].str();
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
        cppVersion + " vs. " + jsVersion + " respectively).\n" + "See " + docsBaseUrl +
        "/guides/"
        "troubleshooting#mismatch-between-c-code-version-and-javascript-code-"
        "version` for more details.");
    return;
  }
}

}; // namespace worklets
