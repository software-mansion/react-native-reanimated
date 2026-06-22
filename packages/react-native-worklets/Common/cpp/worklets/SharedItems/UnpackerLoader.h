#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/ScriptBuffer.h>

#include <array>
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <variant>
#include <vector>

namespace worklets {

struct Unpacker {
  std::variant<std::string, std::vector<uint8_t>> source;
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
    unpackers_ = {
        prepare(unpackers.valueUnpacker),
        prepare(unpackers.synchronizableUnpacker),
        prepare(unpackers.customSerializableUnpacker),
        prepare(unpackers.shareableHostUnpacker),
        prepare(unpackers.shareableGuestUnpacker),
        prepare(unpackers.remoteFunctionUnpacker),
    };
    loaded_ = true;
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    if (!loaded_) [[unlikely]] {
      throw std::runtime_error("[Worklets] UnpackerLoader tried to install unpackers but they were not loaded.");
    }

    for (const auto &unpacker : unpackers_) {
      installUnpacker(rt, unpacker);
    }
  }

 private:
  static void installUnpacker(facebook::jsi::Runtime &rt, const Unpacker &unpacker) {
    if (const auto *bytecode = std::get_if<std::vector<uint8_t>>(&unpacker.source)) {
      auto buffer = std::make_shared<BytecodeBuffer>(*bytecode);
      rt.evaluateJavaScript(buffer, unpacker.location).getObject(rt).getFunction(rt).call(rt);
    } else {

      const auto &code = std::get<std::string>(unpacker.source);
#ifndef NDEBUG
      if (!unpacker.sourceMap.empty()) {
        rt.global()
            .getPropertyAsFunction(rt, "evalWithSourceMap")
            .call(rt, code, unpacker.location, unpacker.sourceMap);
        return;
      }
#endif // NDEBUG
      rt.evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(code), unpacker.location);
    }
  }

  static Unpacker prepare(Unpacker unpacker) {
    if (auto *code = std::get_if<std::string>(&unpacker.source)) {
      unpacker.source = "(" + *code + ")();";
    }
    return unpacker;
  }

  std::array<Unpacker, 6> unpackers_;
  bool loaded_ = false;
};

} // namespace worklets
