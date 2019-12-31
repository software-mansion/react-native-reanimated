/* eslint-env detox/detox */

describe('Example', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show text "Hello world"', async () => {
    await expect(element(by.text('Hello world'))).toBeVisible();
  });
});
