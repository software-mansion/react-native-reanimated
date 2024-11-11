describe('Runtime tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  test.each(['babel plugin'])('Run tests of %p', async (sectionName) => {
    await element(by.id('RuntimeTestsExample')).tap();
    await element(by.id('deselect')).tap();
    await element(by.id(sectionName)).tap();
    await element(by.id('run')).tap();

    await waitFor(element(by.id('DONE')))
      .toBeVisible()
      .withTimeout(90000);

    await waitFor(element(by.id('OK')))
      .toBeVisible()
      .withTimeout(1000);
  });
});
