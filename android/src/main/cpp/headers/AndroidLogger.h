//
// Created by Karol Bisztyga on 2020-02-27.
//

#ifndef REANIMATEDEXAMPLE_ANDROID_LOGGER_H
#define REANIMATEDEXAMPLE_ANDROID_LOGGER_H

#include "LoggerInterface.h"

class AndroidLogger : public LoggerInterface {
  public:
    void log(const char* str) override;
    void log(double d) override;
    void log(int i) override;
    void log(bool b) override;
    virtual ~AndroidLogger() {}
};

#endif //REANIMATEDEXAMPLE_ANDROID_LOGGER_H
