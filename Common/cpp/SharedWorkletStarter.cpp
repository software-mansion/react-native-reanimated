//
// Created by Szymon Kapala on 2020-03-05.
//
#include "SharedWorkletStarter.h"

SharedWorkletStarter::SharedWorkletStarter(int svId,
                                           std::shared_ptr<Worklet> worklet,
                                           std::vector<int> args) {
  this->id = svId;
  this->worklet = worklet;
  this->args = args;
  this->shouldBeSentToJava = false;
  this->type = SharedValueType::shared_starter;
}

jsi::Value SharedWorkletStarter::asValue(jsi::Runtime &rt) const {
  return jsi::Value::undefined();
}

void SharedWorkletStarter::setNewValue(std::shared_ptr<SharedValue> sv) {
  // noop
}

SharedWorkletStarter::~SharedWorkletStarter() {
  
}

jsi::Value SharedWorkletStarter::asParameter(jsi::Runtime &rt) {
  return jsi::Value(this->id);
}

void SharedWorkletStarter::willUnregister() {
  if (this->unregisterListener != nullptr) {
    (*this->unregisterListener)();
  }
}

void SharedWorkletStarter::setUnregisterListener(const std::function<void()> & fun) {
  if (fun == nullptr) {
    this->unregisterListener = nullptr;
    return;
  }
  this->unregisterListener = std::make_shared<const std::function<void()>>(std::move(fun));
}



