#pragma once

#include <jsi/jsi.h>

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
  Unpacker remoteFunctionUnpacker;
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
    remoteFunctionUnpacker_ = {
        "(" + unpackers.remoteFunctionUnpacker.code + ")();",
        unpackers.remoteFunctionUnpacker.location,
        unpackers.remoteFunctionUnpacker.sourceMap};
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    if (valueUnpacker_.code.empty() || synchronizableUnpacker_.code.empty() ||
        customSerializableUnpacker_.code.empty() || shareableHostUnpacker_.code.empty() ||
        shareableGuestUnpacker_.code.empty() || remoteFunctionUnpacker_.code.empty()) [[unlikely]] {
      throw std::runtime_error(
          "[Worklets] UnpackerLoader tried to install unpackers but the code for unpackers was not loaded.");
    }

#ifndef NDEBUG
    installUnpacker(rt, valueUnpacker_);
    installUnpacker(rt, synchronizableUnpacker_);
    installUnpacker(rt, customSerializableUnpacker_);
    installUnpacker(rt, shareableHostUnpacker_);
    installUnpacker(rt, shareableGuestUnpacker_);
    installUnpacker(rt, remoteFunctionUnpacker_);
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
    rt.evaluateJavaScript(
        std::make_shared<facebook::jsi::StringBuffer>(remoteFunctionUnpacker_.code), remoteFunctionUnpacker_.location);
#endif // NDEBUG
  }

 private:
#ifndef NDEBUG
  static void installUnpacker(facebook::jsi::Runtime &rt, const Unpacker &unpacker) {
    if (unpacker.sourceMap.empty()) {
      rt.evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(unpacker.code), unpacker.location);
      return;
    }

    auto evalWithSourceMap = rt.global().getPropertyAsFunction(rt, "evalWithSourceMap");
    evalWithSourceMap.call(rt, unpacker.code, unpacker.location, unpacker.sourceMap);
  }
#endif // NDEBUG

  Unpacker valueUnpacker_;
  Unpacker synchronizableUnpacker_;
  Unpacker customSerializableUnpacker_;
  Unpacker shareableHostUnpacker_;
  Unpacker shareableGuestUnpacker_;
  Unpacker remoteFunctionUnpacker_;
};

} // namespace worklets
