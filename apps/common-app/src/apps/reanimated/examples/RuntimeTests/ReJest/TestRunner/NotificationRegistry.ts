import { runOnJS } from 'react-native-reanimated';

let notificationRegistry: Record<string, boolean> = {};
function notifyJS(name: string) {
  notificationRegistry[name] = true;
}

export class NotificationRegistry {
  public notify(name: string) {
    'worklet';
    if (_WORKLET) {
      runOnJS(notifyJS)(name);
    } else {
      notifyJS(name);
    }
  }

  public async waitForNotify(name: string) {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (notificationRegistry[name]) {
          clearInterval(interval);
          resolve(true);
        }
      }, 10);
    });
  }

  public resetRegistry() {
    notificationRegistry = {};
  }
}
