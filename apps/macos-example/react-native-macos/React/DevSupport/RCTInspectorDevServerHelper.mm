/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTInspectorDevServerHelper.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <React/RCTLog.h>
#import <React/RCTUIKit.h> // [macOS]

#import <React/RCTDefines.h>
#import <React/RCTInspectorPackagerConnection.h>

#import <CommonCrypto/CommonCrypto.h>

static const CFStringRef kCFZeroUUID = CFSTR("00000000-0000-0000-0000-000000000000"); // [macOS]

static NSString *const kDebuggerMsgDisable = @"{ \"id\":1,\"method\":\"Debugger.disable\" }";

static NSString *getServerHost(NSURL *bundleURL)
{
  NSNumber *port = @8081;
  NSString *portStr = [[[NSProcessInfo processInfo] environment] objectForKey:@"RCT_METRO_PORT"];
  if (portStr && [portStr length] > 0) {
    port = [NSNumber numberWithInt:[portStr intValue]];
  }
  if ([bundleURL port]) {
    port = [bundleURL port];
  }
  NSString *host = [bundleURL host];
  if (!host) {
    host = @"localhost";
  }

  // this is consistent with the Android implementation, where http:// is the
  // hardcoded implicit scheme for the debug server. Note, packagerURL
  // technically looks like it could handle schemes/protocols other than HTTP,
  // so rather than force HTTP, leave it be for now, in case someone is relying
  // on that ability when developing against iOS.
  return [NSString stringWithFormat:@"%@:%@", host, port];
}

static NSString *getSHA256(NSString *string)
{
  const char *str = string.UTF8String;
  unsigned char result[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(str, (CC_LONG)strlen(str), result);

  return [NSString stringWithFormat:@"%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x",
                                    result[0],
                                    result[1],
                                    result[2],
                                    result[3],
                                    result[4],
                                    result[5],
                                    result[6],
                                    result[7],
                                    result[8],
                                    result[9],
                                    result[10],
                                    result[11],
                                    result[12],
                                    result[13],
                                    result[14],
                                    result[15],
                                    result[16],
                                    result[17],
                                    result[18],
                                    result[19]];
}

// Returns an opaque ID which is stable for the current combination of device and app, stable across installs,
// and unique across devices.
static NSString *getInspectorDeviceId()
{
  // A bundle ID uniquely identifies a single app throughout the system. [Source: Apple docs]
  NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];

#if !TARGET_OS_OSX // [macOS]
  // An alphanumeric string that uniquely identifies a device to the app's vendor. [Source: Apple docs]
  NSString *identifierForVendor = [[UIDevice currentDevice] identifierForVendor].UUIDString;
#else // [macOS
  uuid_t uuidBytes;
  CFUUIDRef deviceId = nil;
  int result = 0;

  const struct timespec spec = {1, 0};
  result = gethostuuid(uuidBytes, &spec);
  
  //If we got good bits, create the UUID, else create a blank UUID to indicate failure
  if(result == 0)
  {
      deviceId = CFUUIDCreateFromUUIDBytes(kCFAllocatorDefault, *(CFUUIDBytes*)uuidBytes);
  }
  else
  {
      deviceId = CFUUIDCreateFromString(kCFAllocatorDefault, kCFZeroUUID);
  }
  
  NSString *identifierForVendor = (__bridge NSString *)CFUUIDCreateString(kCFAllocatorDefault, deviceId);
#endif // macOS]

  NSString *rawDeviceId = [NSString stringWithFormat:@"apple-%@-%@", identifierForVendor, bundleId];

  return getSHA256(rawDeviceId);
}

static NSURL *getInspectorDeviceUrl(NSURL *bundleURL)
{
#if !TARGET_OS_OSX // [macOS]
  NSString *escapedDeviceName = [[[UIDevice currentDevice] name]
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];
#else // [macOS
  NSString *escapedDeviceName = @"";
#endif // macOS]
  NSString *escapedAppName = [[[NSBundle mainBundle] bundleIdentifier]
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  NSString *escapedInspectorDeviceId = [getInspectorDeviceId()
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  return [NSURL URLWithString:[NSString stringWithFormat:@"http://%@/inspector/device?name=%@&app=%@&device=%@",
                                                         getServerHost(bundleURL),
                                                         escapedDeviceName,
                                                         escapedAppName,
                                                         escapedInspectorDeviceId]];
}

@implementation RCTInspectorDevServerHelper

RCT_NOT_IMPLEMENTED(-(instancetype)init)

static NSMutableDictionary<NSString *, RCTInspectorPackagerConnection *> *socketConnections = nil;
static NSLock *connectionsLock = [NSLock new];

static void sendEventToAllConnections(NSString *event)
{
  [connectionsLock lock]; // [macOS]
  for (NSString *socketId in socketConnections) {
    [socketConnections[socketId] sendEventToAllConnections:event];
  }
  [connectionsLock unlock]; // [macOS]
}

+ (void)openDebugger:(NSURL *)bundleURL withErrorMessage:(NSString *)errorMessage
{
  NSString *appId = [[[NSBundle mainBundle] bundleIdentifier]
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  NSString *escapedInspectorDeviceId = [getInspectorDeviceId()
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"http://%@/open-debugger?appId=%@&device=%@",
                                                               getServerHost(bundleURL),
                                                               appId,
                                                               escapedInspectorDeviceId]];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  [request setHTTPMethod:@"POST"];

  [[[NSURLSession sharedSession]
      dataTaskWithRequest:request
        completionHandler:^(
            __unused NSData *_Nullable data, __unused NSURLResponse *_Nullable response, NSError *_Nullable error) {
          if (error != nullptr) {
            RCTLogWarn(@"%@", errorMessage);
          }
        }] resume];
}

+ (void)disableDebugger
{
  sendEventToAllConnections(kDebuggerMsgDisable);
}

+ (RCTInspectorPackagerConnection *)connectWithBundleURL:(NSURL *)bundleURL
{
  NSURL *inspectorURL = getInspectorDeviceUrl(bundleURL);

  // Note, using a static dictionary isn't really the greatest design, but
  // the packager connection does the same thing, so it's at least consistent.
  // This is a static map that holds different inspector clients per the inspectorURL
  [connectionsLock lock]; // [macOS]
  if (socketConnections == nil) {
    socketConnections = [NSMutableDictionary new];
  }
  [connectionsLock unlock]; // [macOS]

  NSString *key = [inspectorURL absoluteString];
  // [macOS safety check to avoid a crash
  if (key == nil) {
    RCTLogError(@"failed to get inspector URL");
    return nil;
  }
  // macOS]

  RCTInspectorPackagerConnection *connection;

  [connectionsLock lock]; // [macOS]
  connection = socketConnections[key];
  if (!connection || !connection.isConnected) {
    connection = [[RCTInspectorPackagerConnection alloc] initWithURL:inspectorURL];
    // [macOS safety check to avoid a crash
    if (connection != nil) {
      socketConnections[key] = connection;
      [connection connect];
    } else {
      RCTLogError(@"failed to initialize RCTInspectorPackagerConnection");
    }
    // macOS]
  }
  [connectionsLock unlock]; // [macOS]

  return connection;
}

@end

#endif
