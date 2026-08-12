#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

#include <memory>

using namespace facebook;

namespace worklets {

class SynchronizableDynamic final : public Synchronizable {
 public:
  explicit SynchronizableDynamic(const std::shared_ptr<Serializable> &value);

  static jsi::Function getUnpacker(jsi::Runtime &rt);

  jsi::Value getDirty(jsi::Runtime &rt) override;

  jsi::Value getBlocking(jsi::Runtime &rt) override;

  void setDirty(jsi::Runtime &rt, const jsi::Value &value) override;

  void setBlocking(jsi::Runtime &rt, const jsi::Value &value) override;

 protected:
  jsi::Function unpacker(jsi::Runtime &rt) override;

 private:
  std::shared_ptr<Serializable> value_;
};

}; // namespace worklets
