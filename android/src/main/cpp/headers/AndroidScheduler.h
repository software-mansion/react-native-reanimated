//
// Created by Szymon Kapala on 2020-02-07.
//

#ifndef REANIMATEDEXAMPLE_ANDROIDSCHEDULER_H
#define REANIMATEDEXAMPLE_ANDROIDSCHEDULER_H

#include "Scheduler.h"
#include <jni.h>

class AndroidScheduler : public Scheduler {
  public:
    AndroidScheduler(JavaVM *vm);
    virtual void scheduleOnUI(std::function<void()> job);
    virtual void scheduleOnJS(std::function<void()> job);
    ~AndroidScheduler();
  private:
    JavaVM *vm;
};

#endif //REANIMATEDEXAMPLE_ANDROIDSCHEDULER_H
