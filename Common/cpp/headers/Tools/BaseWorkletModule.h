//
// Created by Szymon Kapala on 2020-03-04.
//

#ifndef REANIMATEDEXAMPLE_BASEWORKLETMODULE_H
#define REANIMATEDEXAMPLE_BASEWORKLETMODULE_H

#include <jsi/jsi.h>

using namespace facebook;

class BaseWorkletModule : public jsi::HostObject {
  protected:
    int workletId;
    int applierId;
    bool justStarted;
  public:
    virtual void setWorkletId(int workletId) = 0;
    virtual void setApplierId(int applierId) = 0;
    virtual void setJustStarted(bool justStarted) = 0;
};

#endif //REANIMATEDEXAMPLE_BASEWORKLETMODULE_H
