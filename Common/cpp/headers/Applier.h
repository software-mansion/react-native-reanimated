//
// Created by Szymon Kapala on 2020-02-12.
//

#ifndef REANIMATEDEXAMPLE_APPLIER_H
#define REANIMATEDEXAMPLE_APPLIER_H

class Applier {
  public:
    std::shared_ptr<jsi::Function> worklet;
    std::vector<std::shared_ptr<SharedValue>> sharedValues;
    Applier(std::shared_ptr<jsi::Function> worklet, std::vector<std::shared_ptr<SharedValue>> sharedValues);
    virtual bool apply(jsi::Runtime &rt, jsi::Object & module);
    virtual ~Applier();
};

#endif //REANIMATEDEXAMPLE_APPLIER_H
