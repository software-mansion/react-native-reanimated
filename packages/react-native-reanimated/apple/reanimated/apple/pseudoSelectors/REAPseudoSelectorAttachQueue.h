#pragma once

#import <React/RCTSurfacePresenter.h>
#import <reanimated/PseudoStyles/PseudoSelector.h>
#import <reanimated/apple/REAUIView.h>

#import <functional>
#import <memory>

NS_ASSUME_NONNULL_BEGIN

/**
 * Manages deferred attachment of pseudo-selector observers to native views.
 *
 * Registers itself as an RCTSurfacePresenterObserver and flushes pending
 * attaches after each mounting transaction, allowing attach requests that
 * arrive before a view appears in RCTComponentViewRegistry to be retried
 * automatically.
 */
@interface REAPseudoSelectorAttachQueue : NSObject <RCTSurfacePresenterObserver>

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

- (void)attachTag:(int)tag
          selector:(reanimated::PseudoSelector)selector
    sharedCallback:(std::shared_ptr<std::function<void(bool)>>)sharedCallback;

- (void)detachTag:(int)tag selector:(reanimated::PseudoSelector)selector;

@end

NS_ASSUME_NONNULL_END
