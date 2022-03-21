describe('Example', () => {
  beforeEach(async () => {
    await device.launchApp();
  });

  it('should have "Step One" section', async () => {
    await expect(element(by.text('Step One'))).toBeVisible();
  });

  it('should have "See Your Changes" section', async () => {
    await expect(element(by.text('See Your Changes'))).toBeVisible();
  });
});