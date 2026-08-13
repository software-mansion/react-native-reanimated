#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

#include <memory>

namespace worklets {

class SynchronizableDynamic final : public Synchronizable {
 public:
  explicit SynchronizableDynamic(const std::shared_ptr<Serializable> &value) : Synchronizable(false), value_(value) {}

  std::shared_ptr<Serializable> getDirty() override;

  jsi::Value getDirty(jsi::Runtime &rt) override;

  std::shared_ptr<Serializable> getBlocking() override;

  jsi::Value getBlocking(jsi::Runtime &rt) override;

  void setDirty(const std::shared_ptr<Serializable> &value) override;

  void setDirty(jsi::Runtime &rt, const jsi::Value &value) override;

  void setBlocking(const std::shared_ptr<Serializable> &value) override;

  void setBlocking(jsi::Runtime &rt, const jsi::Value &value) override;

 private:
  std::shared_ptr<Serializable> value_;
};

}; // namespace worklets
