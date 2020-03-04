//
// Created by Szymon Kapala on 2020-03-04.
//

#ifndef REANIMATEDEXAMPLE_WORKLET_H
#define REANIMATEDEXAMPLE_WORKLET_H

#include <memory>
#include <jsi/jsi.h>

using namespace facebook;

class Worklet {
  public:
    int workletId;
    std::shared_ptr<jsi::Function> body;
    std::shared_ptr<std::function<void()>> listener;
    virtual ~Worklet(){}
};

#endif //REANIMATEDEXAMPLE_WORKLET_H
