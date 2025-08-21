import { RuntimeKind, scheduleOnRN } from 'react-native-worklets';

let notificationRegistry: Record<string, boolean> = {};
function notifyJS(name: string) {
  notificationRegistry[name] = true;
}

export class NotificationRegistry {
  public notify(name: string) {
    'worklet';
    if (globalThis.__RUNTIME_KIND != RuntimeKind.ReactNative) {
      scheduleOnRN(notifyJS, name);
    } else {
      notifyJS(name);
    }
  }

  public async waitForNotify(name: string, timeout?: number) {
    return this.waitForNotifications([name], timeout);
  }

  public async waitForNotifications(names: string[], timeout?: number) {
    const beginTime = performance.now();
    const polingRate = 10;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (names.every(name => notificationRegistry[name])) {
          clearInterval(interval);
          resolve(true);
        }
        if (timeout != undefined && performance.now() - beginTime > timeout) {
          names.forEach(name => console.log(`Notification '${name}' timeout exceeded.`));
          clearInterval(interval);
          resolve(false);
        }
      }, polingRate);
    });
  }

  public resetRegistry() {
    notificationRegistry = {};
  }
}
