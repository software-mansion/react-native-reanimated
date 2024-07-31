#include <android/log.h>

#include "PlatformLogger.h"

#define TAG "Reanimated"

namespace reanimated {

void PlatformLogger::log(const char *str) {
  __android_log_print(ANDROID_LOG_VERBOSE, TAG, "%s", str);
}

void PlatformLogger::log(const std::string &str) {
  log(str.c_str());
}

void PlatformLogger::log(const double d) {
  __android_log_print(ANDROID_LOG_VERBOSE, TAG, "%f", d);
}

void PlatformLogger::log(const int i) {
  __android_log_print(ANDROID_LOG_VERBOSE, TAG, "%d", i);
}

void PlatformLogger::log(const bool b) {
  log(b ? "true" : "false");
}

} // namespace reanimated
