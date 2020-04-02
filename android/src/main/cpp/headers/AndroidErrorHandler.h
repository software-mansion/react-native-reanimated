//
// Created by Karol Bisztyga on 2020-03-13
//

#ifndef REANIMATEDEXAMPLE_ANDROID_ERROR_HANDLER_H
#define REANIMATEDEXAMPLE_ANDROID_ERROR_HANDLER_H

#include "ErrorHandler.h"
#include "AndroidScheduler.h"
#include "JNIRegistry.h"
#include <jni.h>
#include <memory>

class AndroidErrorHandler : ErrorHandler {
  JNIEnv* env;
  ErrorWrapper error;
  std::shared_ptr<Scheduler> scheduler;
  std::shared_ptr<JNIRegistry> jniRegistry;
  void raiseSpec(const char *message) override;
  public:
    AndroidErrorHandler(
        JNIEnv* env,
        std::shared_ptr<Scheduler> scheduler,
        std::shared_ptr<JNIRegistry> jniRegistry);
    std::shared_ptr<Scheduler> getScheduler() override;
    ErrorWrapper getError() override;
    void handleError() override;
    virtual ~AndroidErrorHandler() {}
};

#endif //REANIMATEDEXAMPLE_ANDROID_ERROR_HANDLER_H
