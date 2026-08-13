#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

#include <memory>

namespace worklets {

class SynchronizableDynamic final : public Synchronizable {
 public:
  explicit SynchronizableDynamic(const std::shared_ptr<Serializable> &value);

  jsi::Value getDirty(jsi::Runtime &rt) override;

  jsi::Value getBlocking(jsi::Runtime &rt) override;

  void setBlocking(jsi::Runtime &rt, const jsi::Value &value) override;

 private:
  std::shared_ptr<Serializable> value_;
};

}; // namespace worklets
