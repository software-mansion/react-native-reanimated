#pragma once

#import <Foundation/Foundation.h>
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

static id convertJSIValueToObjCObject(jsi::Runtime &runtime, const jsi::Value &value);

static NSArray *convertJSIArrayToNSArray(jsi::Runtime &runtime, const jsi::Array &arr)
{
  size_t n = arr.size(runtime);
  NSMutableArray *out = [NSMutableArray arrayWithCapacity:n];

  for (size_t i = 0; i < n; i++) {
    id elem = convertJSIValueToObjCObject(runtime, arr.getValueAtIndex(runtime, i));
    [out addObject:elem];
  }

  return out;
}

static NSDictionary *convertJSObjectToNSDictionary(jsi::Runtime &runtime, const jsi::Object &obj)
{
  jsi::Array names = obj.getPropertyNames(runtime);
  size_t n = names.size(runtime);
  NSMutableDictionary *out = [NSMutableDictionary dictionaryWithCapacity:n];

  for (size_t i = 0; i < n; i++) {
    jsi::Value keyVal = names.getValueAtIndex(runtime, i);
    if (!keyVal.isString()) {
      continue;
    }

    jsi::String name = keyVal.asString(runtime);
    NSString *nsKey = [NSString stringWithUTF8String:name.utf8(runtime).c_str()];
    jsi::Value prop = obj.getProperty(runtime, name);
    id val = convertJSIValueToObjCObject(runtime, prop);
    out[nsKey] = val;
  }

  return out;
}

static id convertJSIValueToObjCObject(jsi::Runtime &runtime, const jsi::Value &value)
{
  if (value.isUndefined() || value.isNull()) {
    return NSNull.null;
  }

  if (value.isBool()) {
    return @(value.asBool());
  }
  if (value.isNumber()) {
    return @(value.asNumber());
  }
  if (value.isString()) {
    return [NSString stringWithUTF8String:value.asString(runtime).utf8(runtime).c_str()];
  }

  if (!value.isObject()) {
    return NSNull.null;
  }

  jsi::Object obj = value.asObject(runtime);
  if (obj.isArray(runtime)) {
    return convertJSIArrayToNSArray(runtime, obj.asArray(runtime));
  }

  return convertJSObjectToNSDictionary(runtime, obj);
}
