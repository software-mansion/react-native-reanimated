/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<8c56a28cf2d0e0c2f8d1004e49d7f4e0>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/PushNotificationIOS/PushNotificationIOS.js
 */

export type PushNotificationPermissions = {
  alert: boolean;
  badge: boolean;
  sound: boolean;
  [key: string]: boolean | number;
};
type PresentLocalNotificationDetails = {
  alertBody: string;
  alertAction?: string;
  alertTitle?: string;
  soundName?: string;
  category?: string;
  userInfo?: Object;
  applicationIconBadgeNumber?: number;
  fireDate?: number;
  isSilent?: boolean;
};
type ScheduleLocalNotificationDetails = Omit<PresentLocalNotificationDetails, keyof {
  repeatInterval?: "year" | "month" | "week" | "day" | "hour" | "minute";
}> & {
  repeatInterval?: "year" | "month" | "week" | "day" | "hour" | "minute";
};
export type ContentAvailable = 1 | null | void;
export type FetchResult = {
  NewData: "UIBackgroundFetchResultNewData";
  NoData: "UIBackgroundFetchResultNoData";
  ResultFailed: "UIBackgroundFetchResultFailed";
};
/**
 * An event emitted by PushNotificationIOS.
 */
export type PushNotificationEventName = keyof {
  /**
   * Fired when a remote notification is received. The handler will be invoked
   * with an instance of `PushNotificationIOS`. This will handle notifications
   * that arrive in the foreground or were tapped to open the app from the
   * background.
   */
  notification: string;
  /**
   * Fired when a local notification is received. The handler will be invoked
   * with an instance of `PushNotificationIOS`. This will handle notifications
   * that arrive in the foreground or were tapped to open the app from the
   * background.
   */
  localNotification: string;
  /**
   * Fired when the user registers for remote notifications. The handler will be
   * invoked with a hex string representing the deviceToken.
   */
  register: string;
  /**
   * Fired when the user fails to register for remote notifications. Typically
   * occurs due to APNS issues or if the device is a simulator. The handler
   * will be invoked with {message: string, code: number, details: any}.
   */
  registrationError: string;
};
export interface PushNotification {
  /**
   * An alias for `getAlert` to get the notification's main message string
   */
  getMessage(): (string | undefined) | (Object | undefined);
  /**
   * Gets the sound string from the `aps` object
   */
  getSound(): string | undefined;
  /**
   * Gets the category string from the `aps` object
   */
  getCategory(): string | undefined;
  /**
   * Gets the notification's main message from the `aps` object
   */
  getAlert(): (string | undefined) | (Object | undefined);
  /**
   * Gets the content-available number from the `aps` object
   */
  getContentAvailable(): ContentAvailable;
  /**
   * Gets the badge count number from the `aps` object
   */
  getBadgeCount(): number | undefined;
  /**
   * Gets the data object on the notif
   */
  getData(): Object | undefined;
  /**
   * Gets the thread ID on the notif
   */
  getThreadID(): string | undefined;
  /**
   * iOS Only
   * Signifies remote notification handling is complete
   */
  finish(result: string): void;
}
/**
 *
 * Handle notifications for your app, including scheduling and permissions.
 *
 * See https://reactnative.dev/docs/pushnotificationios
 */
declare class PushNotificationIOS {
  static FetchResult: FetchResult;
  static presentLocalNotification(details: PresentLocalNotificationDetails): void;
  static scheduleLocalNotification(details: ScheduleLocalNotificationDetails): void;
  static cancelAllLocalNotifications(): void;
  static removeAllDeliveredNotifications(): void;
  static getDeliveredNotifications(callback: (notifications: Array<Object>) => void): void;
  static removeDeliveredNotifications(identifiers: Array<string>): void;
  static setApplicationIconBadgeNumber(number: number): void;
  static getApplicationIconBadgeNumber(callback: Function): void;
  static cancelLocalNotifications(userInfo: Object): void;
  static getScheduledLocalNotifications(callback: Function): void;
  static addEventListener(type: PushNotificationEventName, handler: Function): void;
  static removeEventListener(type: PushNotificationEventName): void;
  static requestPermissions(permissions?: PushNotificationPermissions): Promise<{
    alert: boolean;
    badge: boolean;
    sound: boolean;
  }>;
  static abandonPermissions(): void;
  static checkPermissions(callback: (permissions: PushNotificationPermissions) => void): void;
  static getInitialNotification(): Promise<null | undefined | PushNotification>;
  static getAuthorizationStatus(callback: (authorizationStatus: number) => void): void;
  constructor(nativeNotif: Object);
  finish(fetchResult: string): void;
  getMessage(): (null | undefined | string) | (null | undefined | Object);
  getSound(): null | undefined | string;
  getCategory(): null | undefined | string;
  getAlert(): (null | undefined | string) | (null | undefined | Object);
  getContentAvailable(): ContentAvailable;
  getBadgeCount(): null | undefined | number;
  getData(): null | undefined | Object;
  getThreadID(): null | undefined | string;
}
export default PushNotificationIOS;
