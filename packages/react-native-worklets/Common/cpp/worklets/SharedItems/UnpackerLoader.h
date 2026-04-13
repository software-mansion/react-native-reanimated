#pragma once

#include <hermes/hermes.h>
#include <jsi/jsi.h>
#include <worklets/Tools/Defs.h>

#include <memory>
#include <string>

namespace worklets {

struct Unpacker {
  std::string code;
  std::string location;
  std::string sourceMap;
};

struct ShareableUnpackers {
  Unpacker valueUnpacker;
  Unpacker synchronizableUnpacker;
  Unpacker customSerializableUnpacker;
  Unpacker shareableHostUnpacker;
  Unpacker shareableGuestUnpacker;
};

class UnpackerLoader {
 public:
  void loadUnpackers(const ShareableUnpackers &unpackers) {
    valueUnpacker_ = {
        "(" + unpackers.valueUnpacker.code + ")();",
        unpackers.valueUnpacker.location,
        unpackers.valueUnpacker.sourceMap};
    synchronizableUnpacker_ = {
        "(" + unpackers.synchronizableUnpacker.code + ")();",
        unpackers.synchronizableUnpacker.location,
        unpackers.synchronizableUnpacker.sourceMap};
    customSerializableUnpacker_ = {
        "(" + unpackers.customSerializableUnpacker.code + ")();",
        unpackers.customSerializableUnpacker.location,
        unpackers.customSerializableUnpacker.sourceMap};
    shareableHostUnpacker_ = {
        "(" + unpackers.shareableHostUnpacker.code + ")();",
        unpackers.shareableHostUnpacker.location,
        unpackers.shareableHostUnpacker.sourceMap};
    shareableGuestUnpacker_ = {
        "(" + unpackers.shareableGuestUnpacker.code + ")();",
        unpackers.shareableGuestUnpacker.location,
        unpackers.shareableGuestUnpacker.sourceMap};
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    if (valueUnpacker_.code.empty() || synchronizableUnpacker_.code.empty() ||
        customSerializableUnpacker_.code.empty() || shareableHostUnpacker_.code.empty() ||
        shareableGuestUnpacker_.code.empty()) [[unlikely]] {
      throw std::runtime_error(
          "[Worklets] UnpackerLoader tried to install unpackers but the code for unpackers was not loaded.");
    }

#if defined(JS_RUNTIME_HERMES) && !defined(NDEBUG)
    auto evalWithSourceMap = rt.global().getPropertyAsFunction(rt, "evalWithSourceMap");
    evalWithSourceMap.call(rt, valueUnpacker_.code, valueUnpacker_.location, valueUnpacker_.sourceMap);
    evalWithSourceMap.call(
        rt, synchronizableUnpacker_.code, synchronizableUnpacker_.location, synchronizableUnpacker_.sourceMap);
    evalWithSourceMap.call(
        rt,
        customSerializableUnpacker_.code,
        customSerializableUnpacker_.location,
        customSerializableUnpacker_.sourceMap);
    evalWithSourceMap.call(
        rt, shareableHostUnpacker_.code, shareableHostUnpacker_.location, shareableHostUnpacker_.sourceMap);
    evalWithSourceMap.call(
        rt, shareableGuestUnpacker_.code, shareableGuestUnpacker_.location, shareableGuestUnpacker_.sourceMap);
#else
    rt.evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(valueUnpacker_.code), valueUnpacker_.location);
    rt.evaluateJavaScript(
        std::make_shared<facebook::jsi::StringBuffer>(synchronizableUnpacker_.code), synchronizableUnpacker_.location);
    rt.evaluateJavaScript(
        std::make_shared<facebook::jsi::StringBuffer>(customSerializableUnpacker_.code),
        customSerializableUnpacker_.location);
    rt.evaluateJavaScript(
        std::make_shared<facebook::jsi::StringBuffer>(shareableHostUnpacker_.code), shareableHostUnpacker_.location);
    rt.evaluateJavaScript(
        std::make_shared<facebook::jsi::StringBuffer>(shareableGuestUnpacker_.code), shareableGuestUnpacker_.location);
#endif // JS_RUNTIME_HERMES
  }

 private:
  Unpacker valueUnpacker_;
  Unpacker synchronizableUnpacker_;
  Unpacker customSerializableUnpacker_;
  Unpacker shareableHostUnpacker_;
  Unpacker shareableGuestUnpacker_;
};

} // namespace worklets
