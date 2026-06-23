#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/ScriptBuffer.h>

#include <array>
#include <cstdint>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

namespace worklets {

struct CodeUnpacker {
  std::string code;
  std::string location;
  std::string sourceMap;
};

struct BytecodeUnpacker {
  std::vector<uint8_t> bytecode;
};

class UnpackerLoader {
 public:
  void loadCodeUnpackers(std::array<CodeUnpacker, 6> unpackers) {
    for (auto &unpacker : unpackers) {
      unpacker.code = "(" + unpacker.code + ")();";
    }
    codeUnpackers_ = std::move(unpackers);
  }

  void loadBytecodeUnpackers(std::array<BytecodeUnpacker, 6> unpackers) {
    bytecodeUnpackers_ = std::move(unpackers);
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    if (codeUnpackers_) {
      for (const auto &unpacker : *codeUnpackers_) {
        installUnpacker(rt, unpacker);
      }
    } else if (bytecodeUnpackers_) {
      for (const auto &unpacker : *bytecodeUnpackers_) {
        installUnpacker(rt, unpacker);
      }
    } else {
      throw std::runtime_error("[Worklets] UnpackerLoader tried to install unpackers but they were not loaded.");
    }
  }

 private:
  static void installUnpacker(facebook::jsi::Runtime &rt, const CodeUnpacker &unpacker) {
#ifndef NDEBUG
    if (!unpacker.sourceMap.empty()) {
      rt.global()
          .getPropertyAsFunction(rt, "evalWithSourceMap")
          .call(rt, unpacker.code, unpacker.location, unpacker.sourceMap);
      return;
    }
#endif // NDEBUG
    rt.evaluateJavaScript(std::make_shared<facebook::jsi::StringBuffer>(unpacker.code), unpacker.location);
  }

  static void installUnpacker(facebook::jsi::Runtime &rt, const BytecodeUnpacker &unpacker) {
    auto buffer = std::make_shared<BytecodeBuffer>(unpacker.bytecode);
    rt.evaluateJavaScript(buffer, "").getObject(rt).getFunction(rt).call(rt);
  }

  std::optional<std::array<CodeUnpacker, 6>> codeUnpackers_;
  std::optional<std::array<BytecodeUnpacker, 6>> bytecodeUnpackers_;
};

} // namespace worklets
