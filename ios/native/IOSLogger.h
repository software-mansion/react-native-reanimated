//
//  IOSLogger.h
//  DoubleConversion
//
//  Created by Szymon Kapala on 03/03/2020.
//

#ifndef IOSLogger_h
#define IOSLogger_h

#include <stdio.h>

#include "LoggerInterface.h"

class IOSLogger : public LoggerInterface {
  public:
    void log(const char* str) override;
    void log(double d) override;
    void log(int i) override;
    void log(bool b) override;
    virtual ~IOSLogger() {}
};

#endif /* IOSLogger_h */
