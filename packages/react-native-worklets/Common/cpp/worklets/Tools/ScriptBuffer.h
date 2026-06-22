#pragma once

#include <cxxreact/ReactNativeVersion.h>
#include <jsi/jsi.h>

#if REACT_NATIVE_VERSION_MINOR >= 84
#include <cxxreact/JSBigString.h>
#else
#include <jsireact/JSIExecutor.h>
#endif

#include <memory>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace facebook::react;

/**
 * Our custom copyable structure that is accepted by
 * Hermes Runtime for evaluation.
 */
class ScriptBuffer : public jsi::Buffer {
 public:
  explicit ScriptBuffer(std::shared_ptr<const Buffer> script) : script_(std::move(script)) {}

  size_t size() const override {
    return script_->size();
  }

  const uint8_t *data() const override {
    return reinterpret_cast<const uint8_t *>(script_.get());
  }

 private:
  std::shared_ptr<const Buffer> script_;
};

class BytecodeBuffer : public jsi::Buffer {
 public:
  explicit BytecodeBuffer(const std::vector<uint8_t> &bytecode) : bytecode_(bytecode) {}

  size_t size() const override {
    return bytecode_.size();
  }

  const uint8_t *data() const override {
    return bytecode_.data();
  }

 private:
  std::vector<uint8_t> bytecode_;
};

} // namespace worklets
