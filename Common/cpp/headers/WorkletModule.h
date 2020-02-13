//
// Created by Szymon Kapala on 2020-02-13.
//

#ifndef REANIMATEDEXAMPLE_WORKLETMODULE_H
#define REANIMATEDEXAMPLE_WORKLETMODULE_H


using namespace facebook;

class WorkletModule : public jsi::Object {
  std::shared_ptr<NativeRenimatedModule> nrm;
  public:
    WorkletModule(std::shared_ptr<NativeReanimatedModule> nrm);
    //WorkletModule(std::shared_ptr<NativeReanimatedModule> nrm, Event event) add this
    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
}

#endif //REANIMATEDEXAMPLE_WORKLETMODULE_H
