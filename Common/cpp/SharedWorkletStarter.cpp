//
// Created by Szymon Kapala on 2020-03-05.
//
#include "SharedWorkletStarter.h"

SharedWorkletStarter::SharedWorkletStarter(int svId, int workletId, std::vector<int> args) {
  this->id = svId;
  this->workletId = workletId;
  this->args = args;
  this->shouldBeSentToJava = false;
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
  (*this->unregisterListener)();
}

void SharedWorkletStarter::setUnregisterListener(const std::function<void()> & fun) {
  this->unregisterListener = std::make_shared<const std::function<void()>>(std::move(fun));
}



