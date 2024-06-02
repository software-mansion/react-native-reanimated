/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#import <React/RCTBridge.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTBridgeProxy.h>
#import <React/RCTDefines.h>

#if RCT_DEV_MENU

RCT_EXTERN NSString *const RCTShowDevMenuNotification;

#endif

@class RCTDevMenuItem;

/**
 * Developer menu, useful for exposing extra functionality when debugging.
 */
@interface RCTDevMenu : NSObject

/**
 * Deprecated, use RCTDevSettings instead.
 */
@property (nonatomic, assign) BOOL shakeToShow DEPRECATED_ATTRIBUTE;

/**
 * Deprecated, use RCTDevSettings instead.
 */
@property (nonatomic, assign) BOOL profilingEnabled DEPRECATED_ATTRIBUTE;

/**
 * Deprecated, use RCTDevSettings instead.
 */
@property (nonatomic, assign) BOOL hotLoadingEnabled DEPRECATED_ATTRIBUTE;

/**
 * Whether the hotkeys that toggles the developer menu is enabled.
 */
@property (nonatomic, assign) BOOL hotkeysEnabled;

/**
 * Presented items in development menu
 */
@property (nonatomic, copy, readonly) NSArray<RCTDevMenuItem *> *presentedItems;

/**
 * Detect if actions sheet (development menu) is shown
 */
- (BOOL)isActionSheetShown;

/**
 * Manually show the dev menu (can be called from JS).
 */
- (void)show;

/**
 * Deprecated, use `RCTReloadCommand` instead.
 */
- (void)reload DEPRECATED_ATTRIBUTE;

/**
 * Deprecated. Use the `-addItem:` method instead.
 */
- (void)addItem:(NSString *)title handler:(void (^)(void))handler DEPRECATED_ATTRIBUTE;

/**
 * Add custom item to the development menu. The handler will be called
 * when user selects the item.
 */
- (void)addItem:(RCTDevMenuItem *)item;

#if TARGET_OS_OSX // [macOS
/**
 * Creates the NSMenu for macOS.
 */
- (NSMenu *)menu;
#endif // macOS]

@end

typedef NSString * (^RCTDevMenuItemTitleBlock)(void);

/**
 * Developer menu item, used to expose additional functionality via the menu.
 */
@interface RCTDevMenuItem : NSObject

/**
 * This creates an item with a simple push-button interface, used to trigger an
 * action.
 */
+ (instancetype)buttonItemWithTitle:(NSString *)title handler:(dispatch_block_t)handler;

/**
 * This creates an item with a simple push-button interface, used to trigger an
 * action. getTitleForPresentation is called each time the item is about to be
 * presented, and should return the item's title.
 */
+ (instancetype)buttonItemWithTitleBlock:(RCTDevMenuItemTitleBlock)titleBlock handler:(dispatch_block_t)handler;

@end

/**
 * This category makes the developer menu instance available via the
 * RCTBridge, which is useful for any class that needs to access the menu.
 */
@interface RCTBridge (RCTDevMenu)

@property (nonatomic, readonly) RCTDevMenu *devMenu;

@end

@interface RCTBridgeProxy (RCTDevMenu)

@property (nonatomic, readonly) RCTDevMenu *devMenu;

@end
