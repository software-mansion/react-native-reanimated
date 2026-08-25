import { waitFor } from '../utils/waitFor';

let notificationRegistry: Record<string, boolean> = {};
function notifyJS(name: string) {
  notificationRegistry[name] = true;
}

export class NotificationRegistry {
  public notify(name: string) {
    notifyJS(name);
  }

  public async waitForNotification(name: string, timeout?: number) {
    return this.waitForNotifications([name], timeout);
  }

  public async waitForNotifications(names: string[], timeout?: number) {
    await waitFor(() => names.every((name) => notificationRegistry[name]), {
      description:
        names.length === 1
          ? `notification '${names[0]}'`
          : `notifications ${names.map((name) => `'${name}'`).join(', ')}`,
      timeout,
      describeState: () =>
        `missing ${names
          .filter((name) => !notificationRegistry[name])
          .map((name) => `'${name}'`)
          .join(', ')}`,
    });
  }

  public resetRegistry() {
    notificationRegistry = {};
  }
}
