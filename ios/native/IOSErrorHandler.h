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
    ErrorWrapper error;
    public:
      IOSErrorHandler(std::shared_ptr<Scheduler> scheduler);
      std::shared_ptr<Scheduler> getScheduler() override;
      ErrorWrapper getError() override;
      void handleError() override;
      virtual ~IOSErrorHandler() {}
};

#endif /* IOSErrorHandler_h */
