#pragma once

#include "ErrorHandler.h"
#include "Scheduler.h"

class IOSErrorHandler : public ErrorHandler {
    std::shared_ptr<Scheduler> scheduler;
    void raiseSpec(const char *message) override;
    std::shared_ptr<ErrorWrapper> error;
    public:
      IOSErrorHandler(std::shared_ptr<Scheduler> scheduler);
      std::shared_ptr<Scheduler> getScheduler() override;
      std::shared_ptr<ErrorWrapper> getError() override;
      void handleError() override;
      virtual ~IOSErrorHandler() {}
};
