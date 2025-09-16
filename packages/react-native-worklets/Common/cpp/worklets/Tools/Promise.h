#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>

using namespace facebook;

namespace worklets {

struct Promise {
  Promise(
      jsi::Runtime &rt,
      std::shared_ptr<Serializable> resolve,
      std::shared_ptr<Serializable> reject)
      : resolve_(resolve), reject_(reject), rt_(rt) {}

  void resolve(const jsi::Value &result);
  void reject(const std::string &message, const std::string &stack);

  std::shared_ptr<Serializable> resolve_;
  std::shared_ptr<Serializable> reject_;
  jsi::Runtime &rt_;
};

} // namespace worklets
