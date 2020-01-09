#ifndef REANIMATEDEXAMPLE_REANIMATEDTURBOMODULE_H
#define REANIMATEDEXAMPLE_REANIMATEDTURBOMODULE_H

#include <string>
#include <unordered_map>

#include <jsi/jsi.h>


namespace facebook {
namespace react {
  class JSI_EXPORT ReanimatedTurboModule : public facebook::jsi::HostObject {
   public:
    ReanimatedTurboModule(const std::string &name);
    virtual ~ReanimatedTurboModule();

    virtual facebook::jsi::Value get(
        facebook::jsi::Runtime &runtime,
        const facebook::jsi::PropNameID &propName) override;

    const std::string name_;

   protected:
    struct MethodMetadata {
      size_t argCount;
      facebook::jsi::Value (*invoker)(
          facebook::jsi::Runtime &rt,
          ReanimatedTurboModule &reanimatedTurboModule,
          const facebook::jsi::Value *args,
          size_t count);
    };

    std::unordered_map<std::string, MethodMetadata> methodMap_;
  };

}
}

#endif //REANIMATEDEXAMPLE_REANIMATEDTURBOMODULE_H
