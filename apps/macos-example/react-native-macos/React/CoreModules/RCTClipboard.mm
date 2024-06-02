/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTClipboard.h"

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTUIKit.h> // [macOS]

#import "CoreModulesPlugins.h"

using namespace facebook::react;

@interface RCTClipboard () <NativeClipboardSpec>
@end

@implementation RCTClipboard

RCT_EXPORT_MODULE()

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(setString : (NSString *)content)
{
#if !TARGET_OS_OSX // [macOS]
  UIPasteboard *clipboard = [UIPasteboard generalPasteboard];
  clipboard.string = (content ?: @"");
#else // [macOS
  NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
  [pasteboard clearContents];
  [pasteboard setString:(content ? : @"") forType:NSPasteboardTypeString];
#endif // macOS]
}

RCT_EXPORT_METHOD(getString : (RCTPromiseResolveBlock)resolve reject : (__unused RCTPromiseRejectBlock)reject)
{
#if !TARGET_OS_OSX // [macOS]
  UIPasteboard *clipboard = [UIPasteboard generalPasteboard];
  resolve((clipboard.string ?: @""));
#else // [macOS
  NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
  resolve(([pasteboard stringForType:NSPasteboardTypeString] ? : @""));
#endif // macOS]
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeClipboardSpecJSI>(params);
}

@end

Class RCTClipboardCls(void)
{
  return RCTClipboard.class;
}
