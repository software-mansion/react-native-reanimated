# Reanimated release guide

Reanimated follows [semver](https://semver.org/) whenever applicable.

1. Decide on the importance of this release and then choose a version number:

   - **patch** (last number) – small adjustments, fixes, in most cases only JS code is modified.
   - **minor** (middle number) – new features, all changes that applies to a patch release and fixes in the native code that couldn't be applied in a patch.
   - **pre-release** - versions before the official release (alpha, beta, rc) should be numbered from 1 (e.g. `3.17.1-rc.1`).

2. Make sure you're up-to-date:
   When releasing a patch or minor version, you ought to do it from the respective `x.x-stable branch`.

   - For patches:
     - `git switch <current-stable>` e.g. `git switch 3.17-stable` then `git pull`.
   - For minors:
     - If latest major, create another stable branch from `main`, i.e.:
       `git switch main` then `git pull` then `git switch -c 4.20-stable`
     - If older major, create another stable branch from the last one, i.e.: `git switch 3.17-stable` then `git pull` then `git switch -c 3.18-stable`.

3. Create a new release branch:

   - `git switch -c @username/release/reanimated-x.y.z`

4. Set the new version by running the following script in the repository root:

   - `cd packages/react-native-reanimated && node ./scripts/set-reanimated-version.js x.y.z`

5. Update the **Compatibility Table** in the documentation:

   - You need to do this in a separate PR as docs are hosted on `main`,
   - Update both in Paper and Fabric section,
   - Use `&ndash;` (–) symbol instead of normal dash (-).

6. If releasing v3, run `bundle install && bundle exec pod install` in all example apps to update following files:

   - `paper-example/ios/Podfile.lock`
   - `fabric-example/ios/Podfile.lock`
   - `tvos-example/ios/Podfile.lock`
   - `macos-example/macos/Podfile.lock`

   If releasing v4, just run `yarn build` in the root directory.

7. When releasing a minor version, update the minimal supported React Native version (general and New Architecture specific)

   - Android: `build.gradle`
   - iOS: `reanimated_utils.rb`
   - By default we support the last three minor versions

8. Testing:

   - Run the examples from Reanimated app, especially those affected by release changes.
   - Test each example app on each platform (if possible, run in both **release** and **debug** mode using **Android** and **iOS**).
   - On rare cases it might be necessary to also test unusual configurations, i.e. **release** app with a **development** bundle. Please consult the team for more instructions here.

9. In case of regressions, fix it in a separate PR, merge it then repeat relevant previous steps.
10. Commit your changes:

    - `git add --all`
    - `git commit -m "Release x.y.z"`
    - `git push --set-upstream origin <branch-name>`

11. Create a PR, named "Release x.y.z" for the stable branch e.g. `3.17-stable`. Examples:

    - patch version release [PR](https://github.com/software-mansion/react-native-reanimated/pull/6879).
    - minor version release [PR](https://github.com/software-mansion/react-native-reanimated/pull/7071).

12. Run the GitHub Actions responsible for building your package:

    - [NPM Reanimated package build](https://github.com/software-mansion/react-native-reanimated/actions/workflows/npm-reanimated-package-build.yml),
    - Select your branch as the destination for the workflow:
      <img width="500" alt="upload_d3527584fe60bbd66cdd99dfbc34b118" src="https://github.com/user-attachments/assets/d25946c1-0279-430a-92b4-57a1307c1179" />

13. Wait for the workflow to finish - it should take about 2 minutes.
14. Select your workflow from the list and download artifacts.
    <img width="925" alt="upload_b4eaebea327e62c1c99d44b1984066b3" src="https://github.com/user-attachments/assets/cfd54b99-2cff-4f60-b818-f92a53e62c07" />

15. Unzip your artifacts:

    - `unzip react-native-reanimated-x.y.z.tgz.zip`
    - **Do not** double-click the file to extract it as it would extract it from both `zip` and `tgz` levels.

16. Test the package in a clean React Native app:

    - `npx @react-native-community/cli init MyApp --skip-install`
    - `cd MyApp`
    - `yarn add ~/Downloads/react-native-reanimated-x.y.z.tgz`
    - Add `plugins: ['react-native-worklets/plugin']` in `babel.config.js` - as in our [Getting Started](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) guide,
    - Copy [Bokeh Example](https://github.com/software-mansion/react-native-reanimated/blob/main/apps/common-app/src/apps/reanimated/examples/BokehExample.tsx) to `App.tsx`,
    - Open and build `ios/MyApp.xcworkspace` on iOS,
    - Run `open -a 'Android Studio'` and build on Android,
    - Start Metro using `yarn start --reset-cache`.

17. Test the package in a clean React Native Web app:

    - `npx create-expo-app my-app`
    - Set up using **Getting Started** tutorial from [Expo Docs](https://docs.expo.dev/workflow/web/),
    - `yarn add ~/Downloads/react-native-reanimated-x.y.z.tgz`
    - If you don't have `babel.config.js`, create it using [this instruction](https://docs.expo.dev/versions/latest/config/babel/),
    - Add `plugins: ['react-native-worklets/plugin']` in `babel.config.js` - as in our [Getting started](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) guide,
    - Copy [Bokeh Example](https://github.com/software-mansion/react-native-reanimated/blob/main/apps/common-app/src/apps/reanimated/examples/BokehExample.tsx) to `App.tsx` - when using **expo-router** find and copy to `index.tsx`,
    - Run dev: `npx expo start --web`,
    - Run release: `npx expo export -p web && npx serve dist --single`.
    - Run prebuild: `npx expo prebuild` to generate native code and ensure the app works correctly.

18. If something doesn't work you can fix it in this or in a separate PR (depending on the case), and repeat the steps.
19. If everything works fine you can merge the PR.
20. Upload the package to npm:

    - Check package size and file list with `npm publish --dry-run react-native-reanimated-x.y.z.tgz` - see if there is anything suspicious,
    - Publish package with `npm publish react-native-reanimated-x.y.z.tgz`,

21. Check that the npm tags are set correctly:

    - The version tag list can be found [here](https://www.npmjs.com/package/react-native-reanimated?activeTab=versions).
    - It should look like this:
      - `latest` &rarr; newest Reanimated v3,
      - `reanimated-2`,
      - `reanimated-1`,
      - `next` &rarr; Reanimated v4,
      - `nightly`,
      - `reanimated3-nightly`.
    - If you see something's wrong, run `npm dist-tag`.

22. After publishing briefly test if it works, when downloaded from npm:

    - `yarn cache clean` (to make sure it's not downloading a local copy from the cache) ,
    - `yarn add react-native-reanimated@x.y.z`,
    - And test across platforms using [Bokeh Example](https://github.com/software-mansion/react-native-reanimated/blob/main/apps/common-app/src/apps/reanimated/examples/BokehExample.tsx),
    - You can create another clean React Native app for this, or use the one you created before.

23. Create release on GitHub:

    - Go to the [Releases](https://github.com/software-mansion/react-native-reanimated/releases) tab in our repo,
    - Select **Draft a new release**,
    - Choose **tag** e.g. `3.17.2`:

      <img width="346" alt="upload_7933257ba4df136251188391ad2693f0" src="https://github.com/user-attachments/assets/383648da-ef25-4b84-83b5-1c484a702488" />

    - Choose **target** - it will a be current stable branch e.g. `3.17-stable`,
    - Choose **previous tag** - it will be from previous release e.g. `3.17.1`,
    - Attach previously downloaded artifact (`.tgz`),
    - Generate release notes,
    - When making at least a minor release or a patch release with numerous commits, please highlight the key changes beside the automatically generated notes, like [here](https://github.com/software-mansion/react-native-reanimated/releases/tag/3.17.0),
    - Make sure you've checked the right boxes:
      - **Set as pre-release** - select this when prereleasing (alpha, beta, rc),
      - **Set as the latest release** - check if releasing v3, don't check when dealing with v2.

24. Share the good news with the team.
25. Ask Kacper Kapuściak for a tweet informing the world about new Reanimated (patches don't count).

**Congratulations on releasing a new version of Reanimated!**
