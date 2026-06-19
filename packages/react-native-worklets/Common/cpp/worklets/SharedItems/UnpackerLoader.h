#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/ScriptBuffer.h>

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace worklets {

// An unpacker is shipped either as a source string (`code`) or as precompiled
// Hermes bytecode (`bytecode`) — never both. The other field stays empty.
struct Unpacker {
  std::string code;
  std::vector<uint8_t> bytecode;
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
    valueUnpacker_ = store(unpackers.valueUnpacker);
    synchronizableUnpacker_ = store(unpackers.synchronizableUnpacker);
    customSerializableUnpacker_ = store(unpackers.customSerializableUnpacker);
    shareableHostUnpacker_ = store(unpackers.shareableHostUnpacker);
    shareableGuestUnpacker_ = store(unpackers.shareableGuestUnpacker);
    remoteFunctionUnpacker_ = store(unpackers.remoteFunctionUnpacker);
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    installEvalBytecode(rt);

    if (isMissing(valueUnpacker_) || isMissing(synchronizableUnpacker_) || isMissing(customSerializableUnpacker_) ||
        isMissing(shareableHostUnpacker_) || isMissing(shareableGuestUnpacker_) ||
        isMissing(remoteFunctionUnpacker_)) [[unlikely]] {
      throw std::runtime_error(
          "[Worklets] UnpackerLoader tried to install unpackers but the code for unpackers was not loaded.");
    }

    installUnpacker(rt, valueUnpacker_);
    installUnpacker(rt, synchronizableUnpacker_);
    installUnpacker(rt, customSerializableUnpacker_);
    installUnpacker(rt, shareableHostUnpacker_);
    installUnpacker(rt, shareableGuestUnpacker_);
    installUnpacker(rt, remoteFunctionUnpacker_);
  }

 private:
  static bool isMissing(const Unpacker &unpacker) {
    return unpacker.code.empty() && unpacker.bytecode.empty();
  }

  // Wraps the source in a self-invoking expression so evaluating it installs
  // the unpacker. Bytecode is stored as-is; it evaluates to the installer
  // function which is invoked in `installUnpacker`.
  static Unpacker store(const Unpacker &unpacker) {
    Unpacker stored;
    stored.location = unpacker.location;
    stored.sourceMap = unpacker.sourceMap;
    if (!unpacker.bytecode.empty()) {
      stored.bytecode = unpacker.bytecode;
    } else {
      stored.code = "(" + unpacker.code + ")();";
    }
    return stored;
  }

  static std::shared_ptr<const ScriptBuffer> makeBytecodeBuffer(const uint8_t *data, size_t size) {
    auto bytes = std::string(reinterpret_cast<const char *>(data), size);
    auto bigString = std::make_shared<const facebook::react::JSBigStdString>(std::move(bytes));
    return std::make_shared<const ScriptBuffer>(std::move(bigString));
  }

  void installUnpacker(facebook::jsi::Runtime &rt, const Unpacker &unpacker) const {
    namespace jsi = facebook::jsi;
    if (!unpacker.bytecode.empty()) {
      auto buffer = makeBytecodeBuffer(unpacker.bytecode.data(), unpacker.bytecode.size());
      // The bytecode evaluates to the installer function; call it to install.
      rt.evaluateJavaScript(buffer, unpacker.location).asObject(rt).asFunction(rt).call(rt);
      return;
    }

    const auto useSourceMaps =
#ifndef NDEBUG
        !unpacker.sourceMap.empty();
#else
        false;
#endif // NDEBUG

    if (useSourceMaps) {
      rt.global()
          .getPropertyAsFunction(rt, "evalWithSourceMap")
          .call(rt, unpacker.code, unpacker.location, unpacker.sourceMap);
    } else {
      rt.evaluateJavaScript(std::make_shared<jsi::StringBuffer>(unpacker.code), unpacker.location);
    }
  }

  // Installs `globalThis.evalBytecode`, used to evaluate worklets shipped as
  // precompiled Hermes bytecode (an ArrayBuffer) instead of a source string.
  // Available in release builds, unlike `evalWithSourceMap`/`evalWithSourceUrl`.
  static void installEvalBytecode(facebook::jsi::Runtime &rt) {
    namespace jsi = facebook::jsi;
    auto evalBytecode = [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
      auto arrayBuffer = args[0].asObject(rt).getArrayBuffer(rt);
      auto buffer = makeBytecodeBuffer(arrayBuffer.data(rt), arrayBuffer.size(rt));
      std::string sourceURL;
      if (count > 1 && args[1].isString()) {
        sourceURL = args[1].asString(rt).utf8(rt);
      }
      // Hermes detects the HBC magic bytes and runs the buffer as bytecode.
      return rt.evaluateJavaScript(buffer, sourceURL);
    };
    rt.global().setProperty(
        rt,
        "evalBytecode",
        jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "evalBytecode"), 2, evalBytecode));
  }

  Unpacker valueUnpacker_;
  Unpacker synchronizableUnpacker_;
  Unpacker customSerializableUnpacker_;
  Unpacker shareableHostUnpacker_;
  Unpacker shareableGuestUnpacker_;
  Unpacker remoteFunctionUnpacker_;
};

} // namespace worklets
