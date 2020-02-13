//
// Created by Szymon Kapala on 2020-02-13.
//

#ifndef REANIMATEDEXAMPLE_WORKLETMODULE_H
#define REANIMATEDEXAMPLE_WORKLETMODULE_H

#include <memory>
#include <jsi/jsi.h>

using namespace facebook;

class WorkletModule : public jsi::HostObject {

  public:
    WorkletModule();
    //WorkletModule(std::shared_ptr<NativeReanimatedModule> nrm, Event event) add this
    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
};

#endif //REANIMATEDEXAMPLE_WORKLETMODULE_H
