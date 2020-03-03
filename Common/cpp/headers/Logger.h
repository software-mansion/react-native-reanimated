//
// Created by Karol Bisztyga on 2020-02-27.
//

#ifndef REANIMATEDEXAMPLE_LOGGER_H
#define REANIMATEDEXAMPLE_LOGGER_H

#include "LoggerInterface.h"
#include <memory>

class Logger {
  public:
  template<typename T>
    static void log(T value) {
      if (instance == nullptr) {
        throw std::runtime_error("no logger specified");
      }
      instance->log(value);
    };
  private:
    static std::unique_ptr<LoggerInterface> instance;
};

#endif //REANIMATEDEXAMPLE_LOGGER_INTERFACE_H
