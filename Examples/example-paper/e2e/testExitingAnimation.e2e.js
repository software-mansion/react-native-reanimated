import { device, element, waitFor, by } from 'detox';

describe('Layout Animations', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should remove components', async () => {
    await element(by.text('test exiting animations')).tap();
    await element(by.id('buttonB')).tap();
    await expect(element(by.id('componentB'))).not.toBeVisible();
    await element(by.id('buttonC')).tap();
    await expect(element(by.id('componentC'))).not.toBeVisible();
    await element(by.id('buttonA')).tap();
    await expect(element(by.id('componentA'))).toBeVisible();
    await waitFor(element(by.id('componentA')))
      .not.toBeVisible()
      .withTimeout(10000);
  });
});
