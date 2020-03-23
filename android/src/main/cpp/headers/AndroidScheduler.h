//
// Created by Szymon Kapala on 2020-02-07.
//

#ifndef REANIMATEDEXAMPLE_ANDROIDSCHEDULER_H
#define REANIMATEDEXAMPLE_ANDROIDSCHEDULER_H

#include "Scheduler.h"
#include "JNIRegistry.h"
#include <jni.h>

class AndroidScheduler : public Scheduler {
  public:
    AndroidScheduler(JavaVM *vm, std::shared_ptr<JNIRegistry> jniRegistry);
    virtual void scheduleOnUI(std::function<void()> job);
    virtual void scheduleOnJS(std::function<void()> job);
    ~AndroidScheduler();
  private:
    JavaVM *vm;
    std::shared_ptr<JNIRegistry> jniRegistry;
};

#endif //REANIMATEDEXAMPLE_ANDROIDSCHEDULER_H
