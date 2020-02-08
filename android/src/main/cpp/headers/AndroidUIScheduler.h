//
// Created by Szymon Kapala on 2020-02-07.
//

#ifndef REANIMATEDEXAMPLE_ANDROIDUISCHEDULER_H
#define REANIMATEDEXAMPLE_ANDROIDUISCHEDULER_H

#include "UIScheduler.h"
#include <jni.h>

class AndroidUIScheduler : public UIScheduler {
  public:
    AndroidUIScheduler(JavaVM *vm);
    virtual void schedule(std::function<void()> job);
    ~AndroidUIScheduler();
  private:
    JavaVM *vm;
};

#endif //REANIMATEDEXAMPLE_ANDROIDUISCHEDULER_H
