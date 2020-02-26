//
// 
//

#include "ListenerRegistry.h"
#include <jni.h>

void ListenerRegistry::notify(std::string message) {
    auto event = events.find(message);
    if (event == events.end()) {
        return;
    }
    event->second(message);
}

/*
    map: {
        'label1': callback1,
        'label2': callback2,
        ...
        'labeln': callbackn,
    }
*/

void ListenerRegistry::addListener(std::string message, std::function<void(std::string)> callback) {
    events.insert({ message, callback });
}
