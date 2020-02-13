//
// Created by Szymon Kapala on 2020-02-13.
//

#include "WorkletModule.h"

WorkletModule::WorkletModule(std::shared_ptr<NativeReanimatedModule> nrm) {
  this->nrm = nrm;
}

jsi::Value WorkletModule::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);

  if (propName == "startWorklet") {
    //TODO
  } else if (propName == "emit") {
    //TODO
  } else if (propName == "event") {
    //TODO
  }

  return jsi::Value::undefined();
}
