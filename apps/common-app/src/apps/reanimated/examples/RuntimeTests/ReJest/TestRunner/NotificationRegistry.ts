import { runOnJS } from 'react-native-worklets';

let notificationRegistry: Record<string, boolean> = {};
function notifyJS(name: string) {
  notificationRegistry[name] = true;
}

export class NotificationRegistry {
  public notify(name: string) {
    'worklet';
    if (globalThis._WORKLET) {
      runOnJS(notifyJS)(name);
    } else {
      notifyJS(name);
    }
  }

  public async waitForNotify(name: string) {
    const defaultPollingRate = 10;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (notificationRegistry[name]) {
          clearInterval(interval);
          resolve(true);
        }
      }, defaultPollingRate);
    });
  }

  public async waitForNotifications(names: string[]) {
    const defaultPollingRate = 10;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (names.every(name => notificationRegistry[name])) {
          clearInterval(interval);
          resolve(true);
        }
      }, defaultPollingRate);
    });
  }

  public resetRegistry() {
    notificationRegistry = {};
  }
}
