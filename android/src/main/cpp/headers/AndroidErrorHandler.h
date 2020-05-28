#pragma once

#include "ErrorHandler.h"
#include "AndroidScheduler.h"
#include "JNIRegistry.h"
#include <jni.h>
#include <memory>

class AndroidErrorHandler : ErrorHandler {
  JNIEnv* env;
  std::shared_ptr<ErrorWrapper> error;
  std::shared_ptr<Scheduler> scheduler;
  std::shared_ptr<JNIRegistry> jniRegistry;
  void raiseSpec(const char *message) override;
  public:
    AndroidErrorHandler(
        JNIEnv* env,
        std::shared_ptr<Scheduler> scheduler,
        std::shared_ptr<JNIRegistry> jniRegistry);
    std::shared_ptr<Scheduler> getScheduler() override;
    std::shared_ptr<ErrorWrapper> getError() override;
    void handleError() override;
    virtual ~AndroidErrorHandler() {}
};
