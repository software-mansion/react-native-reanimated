#pragma once

#import <jsi/jsi.h>

using namespace facebook;

// Copied from RCTTurboModule.mm

/**
 * All static helper functions are ObjC++ specific.
 */
static jsi::Value convertNSNumberToJSIBoolean(jsi::Runtime &runtime, NSNumber *value)
{
  return jsi::Value((bool)[value boolValue]);
}

static jsi::Value convertNSNumberToJSINumber(jsi::Runtime &runtime, NSNumber *value)
{
  return jsi::Value([value doubleValue]);
}

static jsi::String convertNSStringToJSIString(jsi::Runtime &runtime, NSString *value)
{
  return jsi::String::createFromUtf8(runtime, [value UTF8String] ?: "");
}

static jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value);

static jsi::Object convertNSDictionaryToJSIObject(jsi::Runtime &runtime, NSDictionary *value)
{
  jsi::Object result = jsi::Object(runtime);
  for (NSString *k in value) {
    result.setProperty(runtime, convertNSStringToJSIString(runtime, k), convertObjCObjectToJSIValue(runtime, value[k]));
  }
  return result;
}

static jsi::Array convertNSArrayToJSIArray(jsi::Runtime &runtime, NSArray *value)
{
  jsi::Array result = jsi::Array(runtime, value.count);
  for (size_t i = 0; i < value.count; i++) {
    result.setValueAtIndex(runtime, i, convertObjCObjectToJSIValue(runtime, value[i]));
  }
  return result;
}

static jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value)
{
  if ([value isKindOfClass:[NSString class]]) {
    return convertNSStringToJSIString(runtime, (NSString *)value);
  } else if ([value isKindOfClass:[NSNumber class]]) {
    if ([value isKindOfClass:[@YES class]]) {
      return convertNSNumberToJSIBoolean(runtime, (NSNumber *)value);
    }
    return convertNSNumberToJSINumber(runtime, (NSNumber *)value);
  } else if ([value isKindOfClass:[NSDictionary class]]) {
    return convertNSDictionaryToJSIObject(runtime, (NSDictionary *)value);
  } else if ([value isKindOfClass:[NSArray class]]) {
    return convertNSArrayToJSIArray(runtime, (NSArray *)value);
  } else if (value == (id)kCFNull) {
    return jsi::Value::null();
  }
  return jsi::Value::undefined();
}
