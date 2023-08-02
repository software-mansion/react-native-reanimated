#pragma once

#include <string>
#include "LoggerInterface.h"

namespace reanimated {

class AndroidLogger : public LoggerInterface {
 public:
  void log(const char *str) override;
  void log(double d) override;
  void log(int i) override;
  void log(bool b) override;
  void log(std::string str) override;
  virtual ~AndroidLogger() {}
};

} // namespace reanimated
