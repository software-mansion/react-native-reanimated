#include <android/log.h>

#include <worklets/Tools/PlatformLogger.h>

#include <string>

constexpr const auto tag = "Worklets";

namespace worklets {

void PlatformLogger::log(const char *str) {
  __android_log_print(ANDROID_LOG_VERBOSE, tag, "%s", str);
}

void PlatformLogger::log(const std::string &str) {
  log(str.c_str());
}

void PlatformLogger::log(const double d) {
  __android_log_print(ANDROID_LOG_VERBOSE, tag, "%f", d);
}

void PlatformLogger::log(const int i) {
  __android_log_print(ANDROID_LOG_VERBOSE, tag, "%d", i);
}

void PlatformLogger::log(const bool b) {
  log(b ? "true" : "false");
}

} // namespace worklets
