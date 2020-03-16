//
//  IOSErrorHandler.h
//  RNReanimated
//
//  Created by Karol Bisztyga on 3/16/20.
//

#ifndef IOSErrorHandler_h
#define IOSErrorHandler_h

#include "ErrorHandler.h"
#include "Scheduler.h"

class IOSErrorHandler : public ErrorHandler {
    std::shared_ptr<Scheduler> scheduler;
    void raiseSpec(const char *message) override;
    public:
      IOSErrorHandler(std::shared_ptr<Scheduler> scheduler);
      std::shared_ptr<Scheduler> getScheduler() override;
      virtual ~IOSErrorHandler() {}
};

#endif /* IOSErrorHandler_h */
