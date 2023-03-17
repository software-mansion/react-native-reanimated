#pragma once

struct JSCallbacksData {
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  jsi::Runtime &rt;
  const jsi::Value &type;
  const jsi::Value &configuration;
  const jsi::Value &callback;
};
