/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

const MockNativeMethods = jest.requireActual('./MockNativeMethods');
const mockComponent = jest.requireActual('./mockComponent');

jest.requireActual('@react-native/js-polyfills/Object.es8');
jest.requireActual('@react-native/js-polyfills/error-guard');

Object.defineProperties(global, {
  __DEV__: {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  },
  cancelAnimationFrame: {
    configurable: true,
    enumerable: true,
    value: id => clearTimeout(id),
    writable: true,
  },
  performance: {
    configurable: true,
    enumerable: true,
    value: {
      now: jest.fn(Date.now),
    },
    writable: true,
  },
  regeneratorRuntime: {
    configurable: true,
    enumerable: true,
    value: jest.requireActual('regenerator-runtime/runtime'),
    writable: true,
  },
  requestAnimationFrame: {
    configurable: true,
    enumerable: true,
    value: callback => setTimeout(() => callback(jest.now()), 0),
    writable: true,
  },
  window: {
    configurable: true,
    enumerable: true,
    value: global,
    writable: true,
  },
});

jest
  .mock('../Libraries/Core/InitializeCore', () => {})
  .mock('../Libraries/Core/NativeExceptionsManager')
  .mock('../Libraries/ReactNative/UIManager', () => ({
    AndroidViewPager: {
      Commands: {
        setPage: jest.fn(),
        setPageWithoutAnimation: jest.fn(),
      },
    },
    blur: jest.fn(),
    createView: jest.fn(),
    customBubblingEventTypes: {},
    customDirectEventTypes: {},
    dispatchViewManagerCommand: jest.fn(),
    focus: jest.fn(),
    getViewManagerConfig: jest.fn(name => {
      if (name === 'AndroidDrawerLayout') {
        return {
          Constants: {
            DrawerPosition: {
              Left: 10,
            },
          },
        };
      }
    }),
    hasViewManagerConfig: jest.fn(name => {
      return name === 'AndroidDrawerLayout';
    }),
    measure: jest.fn(),
    manageChildren: jest.fn(),
    removeSubviewsFromContainerWithID: jest.fn(),
    replaceExistingNonRootView: jest.fn(),
    setChildren: jest.fn(),
    updateView: jest.fn(),
    AndroidDrawerLayout: {
      Constants: {
        DrawerPosition: {
          Left: 10,
        },
      },
    },
    AndroidTextInput: {
      Commands: {},
    },
    ScrollView: {
      Constants: {},
    },
    View: {
      Constants: {},
    },
  }))
  .mock('../Libraries/Image/Image', () => {
    const Image = mockComponent('../Libraries/Image/Image');
    Image.getSize = jest.fn();
    Image.getSizeWithHeaders = jest.fn();
    Image.prefetch = jest.fn();
    Image.prefetchWithMetadata = jest.fn();
    Image.queryCache = jest.fn();
    Image.resolveAssetSource = jest.fn();

    return Image;
  })
  .mock('../Libraries/Text/Text', () =>
    mockComponent('../Libraries/Text/Text', MockNativeMethods),
  )
  .mock('../Libraries/Components/TextInput/TextInput', () =>
    mockComponent('../Libraries/Components/TextInput/TextInput', {
      ...MockNativeMethods,
      isFocused: jest.fn(),
      clear: jest.fn(),
      getNativeRef: jest.fn(),
    }),
  )
  .mock('../Libraries/Modal/Modal', () => {
    const baseComponent = mockComponent('../Libraries/Modal/Modal');
    const mockModal = jest.requireActual('./mockModal');
    return mockModal(baseComponent);
  })
  .mock('../Libraries/Components/View/View', () =>
    mockComponent('../Libraries/Components/View/View', MockNativeMethods),
  )
  .mock('../Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
    __esModule: true,
    default: {
      addEventListener: jest.fn(),
      announceForAccessibility: jest.fn(),
      isAccessibilityServiceEnabled: jest.fn(),
      isBoldTextEnabled: jest.fn(),
      isGrayscaleEnabled: jest.fn(),
      isInvertColorsEnabled: jest.fn(),
      isReduceMotionEnabled: jest.fn(),
      prefersCrossFadeTransitions: jest.fn(),
      isReduceTransparencyEnabled: jest.fn(),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      setAccessibilityFocus: jest.fn(),
      sendAccessibilityEvent: jest.fn(),
      getRecommendedTimeoutMillis: jest.fn(),
    },
  }))
  .mock('../Libraries/Components/Clipboard/Clipboard', () => ({
    getString: jest.fn(() => ''),
    setString: jest.fn(),
  }))
  .mock('../Libraries/Components/RefreshControl/RefreshControl', () =>
    jest.requireActual(
      '../Libraries/Components/RefreshControl/__mocks__/RefreshControlMock',
    ),
  )
  .mock('../Libraries/Components/ScrollView/ScrollView', () => {
    const baseComponent = mockComponent(
      '../Libraries/Components/ScrollView/ScrollView',
      {
        ...MockNativeMethods,
        getScrollResponder: jest.fn(),
        getScrollableNode: jest.fn(),
        getInnerViewNode: jest.fn(),
        getInnerViewRef: jest.fn(),
        getNativeScrollRef: jest.fn(),
        scrollTo: jest.fn(),
        scrollToEnd: jest.fn(),
        flashScrollIndicators: jest.fn(),
        scrollResponderZoomTo: jest.fn(),
        scrollResponderScrollNativeHandleToKeyboard: jest.fn(),
      },
    );
    const mockScrollView = jest.requireActual('./mockScrollView');
    return mockScrollView(baseComponent);
  })
  .mock('../Libraries/Components/ActivityIndicator/ActivityIndicator', () => ({
    __esModule: true,
    default: mockComponent(
      '../Libraries/Components/ActivityIndicator/ActivityIndicator',
      null,
      true,
    ),
  }))
  .mock('../Libraries/AppState/AppState', () => ({
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeEventListener: jest.fn(),
    currentState: jest.fn(),
  }))
  .mock('../Libraries/Linking/Linking', () => ({
    openURL: jest.fn(),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    openSettings: jest.fn(),
    addEventListener: jest.fn(),
    getInitialURL: jest.fn(() => Promise.resolve()),
    sendIntent: jest.fn(),
  }))
  // Mock modules defined by the native layer (ex: Objective-C, Java)
  .mock('../Libraries/BatchedBridge/NativeModules', () => ({
    AlertManager: {
      alertWithArgs: jest.fn(),
    },
    AsyncLocalStorage: {
      multiGet: jest.fn((keys, callback) =>
        process.nextTick(() => callback(null, [])),
      ),
      multiSet: jest.fn((entries, callback) =>
        process.nextTick(() => callback(null)),
      ),
      multiRemove: jest.fn((keys, callback) =>
        process.nextTick(() => callback(null)),
      ),
      multiMerge: jest.fn((entries, callback) =>
        process.nextTick(() => callback(null)),
      ),
      clear: jest.fn(callback => process.nextTick(() => callback(null))),
      getAllKeys: jest.fn(callback =>
        process.nextTick(() => callback(null, [])),
      ),
    },
    DeviceInfo: {
      getConstants() {
        return {
          Dimensions: {
            window: {
              fontScale: 2,
              height: 1334,
              scale: 2,
              width: 750,
            },
            screen: {
              fontScale: 2,
              height: 1334,
              scale: 2,
              width: 750,
            },
          },
        };
      },
    },
    DevSettings: {
      addMenuItem: jest.fn(),
      reload: jest.fn(),
    },
    ImageLoader: {
      getSize: jest.fn(url => Promise.resolve([320, 240])),
      prefetchImage: jest.fn(),
    },
    ImageViewManager: {
      getSize: jest.fn((uri, success) =>
        process.nextTick(() => success(320, 240)),
      ),
      prefetchImage: jest.fn(),
    },
    KeyboardObserver: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    Networking: {
      sendRequest: jest.fn(),
      abortRequest: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    PlatformConstants: {
      getConstants() {
        return {};
      },
    },
    PushNotificationManager: {
      presentLocalNotification: jest.fn(),
      scheduleLocalNotification: jest.fn(),
      cancelAllLocalNotifications: jest.fn(),
      removeAllDeliveredNotifications: jest.fn(),
      getDeliveredNotifications: jest.fn(callback =>
        process.nextTick(() => []),
      ),
      removeDeliveredNotifications: jest.fn(),
      setApplicationIconBadgeNumber: jest.fn(),
      getApplicationIconBadgeNumber: jest.fn(callback =>
        process.nextTick(() => callback(0)),
      ),
      cancelLocalNotifications: jest.fn(),
      getScheduledLocalNotifications: jest.fn(callback =>
        process.nextTick(() => callback()),
      ),
      requestPermissions: jest.fn(() =>
        Promise.resolve({alert: true, badge: true, sound: true}),
      ),
      abandonPermissions: jest.fn(),
      checkPermissions: jest.fn(callback =>
        process.nextTick(() =>
          callback({alert: true, badge: true, sound: true}),
        ),
      ),
      getInitialNotification: jest.fn(() => Promise.resolve(null)),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    SourceCode: {
      getConstants() {
        return {
          scriptURL: null,
        };
      },
    },
    StatusBarManager: {
      setColor: jest.fn(),
      setStyle: jest.fn(),
      setHidden: jest.fn(),
      setNetworkActivityIndicatorVisible: jest.fn(),
      setBackgroundColor: jest.fn(),
      setTranslucent: jest.fn(),
      getConstants: () => ({
        HEIGHT: 42,
      }),
    },
    Timing: {
      createTimer: jest.fn(),
      deleteTimer: jest.fn(),
    },
    UIManager: {},
    BlobModule: {
      getConstants: () => ({BLOB_URI_SCHEME: 'content', BLOB_URI_HOST: null}),
      addNetworkingHandler: jest.fn(),
      enableBlobSupport: jest.fn(),
      disableBlobSupport: jest.fn(),
      createFromParts: jest.fn(),
      sendBlob: jest.fn(),
      release: jest.fn(),
    },
    WebSocketModule: {
      connect: jest.fn(),
      send: jest.fn(),
      sendBinary: jest.fn(),
      ping: jest.fn(),
      close: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    I18nManager: {
      allowRTL: jest.fn(),
      forceRTL: jest.fn(),
      swapLeftAndRightInRTL: jest.fn(),
      getConstants: () => ({
        isRTL: false,
        doLeftAndRightSwapInRTL: true,
      }),
    },
  }))
  .mock('../Libraries/NativeComponent/NativeComponentRegistry', () => {
    return {
      get: jest.fn((name, viewConfigProvider) => {
        return jest.requireActual('./mockNativeComponent').default(name);
      }),
      getWithFallback_DEPRECATED: jest.fn((name, viewConfigProvider) => {
        return jest.requireActual('./mockNativeComponent').default(name);
      }),
      setRuntimeConfigProvider: jest.fn(),
    };
  })
  .mock('../Libraries/ReactNative/requireNativeComponent', () => {
    return jest.requireActual('./mockNativeComponent');
  })
  .mock(
    '../Libraries/Utilities/verifyComponentAttributeEquivalence',
    () => function () {},
  )
  .mock('../Libraries/Vibration/Vibration', () => ({
    vibrate: jest.fn(),
    cancel: jest.fn(),
  }))
  .mock('../Libraries/Components/View/ViewNativeComponent', () => {
    const React = require('react');
    const Component = class extends React.Component {
      render() {
        return React.createElement('View', this.props, this.props.children);
      }
    };

    Component.displayName = 'View';

    return {
      __esModule: true,
      default: Component,
    };
  })
  // In tests, we can use the default version instead of the one using
  // dependency injection.
  .mock('../Libraries/ReactNative/RendererProxy', () => {
    return jest.requireActual(
      '../Libraries/ReactNative/RendererImplementation',
    );
  });
