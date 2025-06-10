#include <reanimated/CSS/util/jsi.h>

namespace reanimated::css {

template <class T>
inline void append(std::string &buf, const T &v) {
  static_assert(std::is_arithmetic_v<T>);
  buf.append(reinterpret_cast<const char *>(&v), sizeof(T));
}

void encode(jsi::Runtime &rt, const jsi::Value &v, std::string &out);

void encodeArray(jsi::Runtime &rt, const jsi::Array &arr, std::string &out) {
  out.push_back('A');
  uint32_t n = static_cast<uint32_t>(arr.size(rt));
  append(out, n);
  for (uint32_t i = 0; i < n; ++i)
    encode(rt, arr.getValueAtIndex(rt, i), out);
}

void encodeObject(jsi::Runtime &rt, const jsi::Object &obj, std::string &out) {
  out.push_back('O');

  auto names = obj.getPropertyNames(rt);
  std::vector<std::string> keys;
  keys.reserve(names.size(rt));
  for (size_t i = 0; i < names.size(rt); ++i)
    keys.emplace_back(names.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  std::sort(keys.begin(), keys.end());

  uint32_t n = static_cast<uint32_t>(keys.size());
  append(out, n);

  for (auto &k : keys) {
    uint32_t len = static_cast<uint32_t>(k.size());
    append(out, len);
    out.append(k);
    encode(rt, obj.getProperty(rt, k.c_str()), out);
  }
}

void encode(jsi::Runtime &rt, const jsi::Value &v, std::string &out) {
  if (v.isNull() || v.isUndefined()) {
    out.push_back('N');
  } else if (v.isBool()) {
    out.push_back(v.getBool() ? 'T' : 'F');
  } else if (v.isNumber()) {
    out.push_back('D');
    double d = v.asNumber();
    append(out, d);
  } else if (v.isString()) {
    out.push_back('S');
    auto s = v.asString(rt).utf8(rt);
    uint32_t len = static_cast<uint32_t>(s.size());
    append(out, len);
    out.append(s);
  } else {
    auto obj = v.asObject(rt);
    if (obj.isArray(rt)) {
      encodeArray(rt, obj.asArray(rt), out);
    } else {
      encodeObject(rt, obj, out);
    }
  }
}

std::string toCanonicalForm(jsi::Runtime &rt, const jsi::Value &value) {
  std::string out;
  out.reserve(256); // avoids realloc for typical blobs
  encode(rt, value, out);
  return out;
}

} // namespace reanimated::css
