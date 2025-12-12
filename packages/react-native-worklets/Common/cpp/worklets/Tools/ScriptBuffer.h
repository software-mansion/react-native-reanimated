#pragma once

#include <cxxreact/JSBigString.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace facebook::react;

class ScriptBuffer : public jsi::Buffer {
 public:
  ScriptBuffer(std::shared_ptr<const JSBigString> script) : script_(std::move(script)) {}

  size_t size() const override {
    return script_->size();
  }

  const uint8_t *data() const override {
    return reinterpret_cast<const uint8_t *>(script_->c_str());
  }

 private:
  std::shared_ptr<const JSBigString> script_;
};

} // namespace worklets
