//
// Created by Karol Bisztyga on 2020-02-27.
//

#ifndef REANIMATEDEXAMPLE_LOGGER_INTERFACE_H
#define REANIMATEDEXAMPLE_LOGGER_INTERFACE_H

class LoggerInterface {
  public:
    virtual void log(const char* str) = 0;
    virtual void log(double d) = 0;
    virtual void log(int i) = 0;
    virtual void log(bool b) = 0;
    virtual ~LoggerInterface() {}
};

#endif //REANIMATEDEXAMPLE_LOGGER_INTERFACE_H
