#pragma once

#include "ErrorHandler.h"
#include "AndroidScheduler.h"
//#include "JNIRegistry.h"
#include "Scheduler.h"
#include <jni.h>
#include <memory>

class AndroidErrorHandler : public ErrorHandler {
  std::shared_ptr<ErrorWrapper> error;
  std::shared_ptr<Scheduler> scheduler;
  void raiseSpec(const char *message) override;
  public:
    AndroidErrorHandler(
        std::shared_ptr<Scheduler> scheduler);
    std::shared_ptr<Scheduler> getScheduler() override;
    std::shared_ptr<ErrorWrapper> getError() override;
    void handleError() override;
    virtual ~AndroidErrorHandler() {}
};
