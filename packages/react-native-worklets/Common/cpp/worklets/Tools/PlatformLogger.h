#pragma once

#include <string>

namespace worklets {

class PlatformLogger {
 public:
  static void log(const char *str);
  static void log(const std::string &str);
  static void log(const double d);
  static void log(const int i);
  static void log(const bool b);
};

} // namespace worklets
