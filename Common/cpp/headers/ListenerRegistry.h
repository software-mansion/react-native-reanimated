//
// 
//

#ifndef REANIMATEDEXAMPLE_EVENT_EMITTER_H
#define REANIMATEDEXAMPLE_EVENT_EMITTER_H

#include <string>
#include <memory>
#include <functional>
#include <unordered_map>
#include <jni.h>

namespace facebook {}

class ListenerRegistry {
  public:
    void notify(std::string message);
    void addListener(std::string message, std::function<void(std::string)>);
    virtual ~ListenerRegistry() {};
  private:
    std::unordered_map<std::string, std::function<void(std::string)>> events;
};

#endif //REANIMATEDEXAMPLE_EVENT_EMITTER_H
