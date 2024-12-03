<img src="https://github.com/user-attachments/assets/66a344b1-7110-4733-b44c-ada204e99dee" alt="Reanimated by Software Mansion" width="100%">

# Reanimated 4 – CSS Animations & Transitions

## Welcome to Reanimated 4 Private Beta ✨

Thank you for your interest in the Reanimated library! We aim to provide an easy-to-use and intuitive API that enables developers to effortlessly implement animations and transitions. Reanimated 4 adds support for well-known [CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations) and [CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions).

> [!NOTE]
> This library supports only the [New Architecture](https://reactnative.dev/architecture/landing-page).

> [!IMPORTANT]  
> The library is currently in beta and is under active development. This early access allows you to try out new features and share feedback to help shape the final product. Your feedback is greatly appreciated as we continue to improve the library.

### 🚀 Functionalities

The library provides:

- **CSS animations**: Support for declaring animations based on the specified steps and their offsets. Available animation properties include:
  - duration
  - delay
  - timing function
  - direction
  - fill mode
  - iteration count
- **CSS transitions**: Smooth animations when style properties change between re-renders, with support for properties such as:
  - duration
  - delay
  - timing function

### 📍 Installation Guide

#### Running the Example App

To familiarize yourself with the capabilities of Reanimated 4, we recommend starting with the provided example app. It features various examples to help you get started quickly.

1. **Install Node Modules**:

   ```bash
   yarn
   ```

2. **Run build**:

   ```bash
   yarn build
   ```

3. **Install iOS Pods** (iOS only):
   Navigate to `apps/css-example/ios` and run:

   ```bash
   bundle install && bundle exec pod install
   ```

4. **Start the Metro bundler and build the example app**:  
   Navigate to `apps/css-example` and run:

   ```bash
   yarn start
   ```

- Build the app:
  - **Android**: You can use `yarn android` or open the project in Android Studio and build from there.
  - **iOS**: You can use `yarn ios` or open the project in Xcode and build from there.

#### Installing the Library in Your Project

To integrate the library into your own project, follow these steps:

1. **Download the package**:

   - Download the provided archive with bundled library files (the `.tgz` file), You can find it in [Releases](https://github.com/software-mansion-labs/reanimated-4/releases).

2. **Install the package:**

   - Navigate to the root directory of your project and install the package.

     - Using **npm**:

     ```bash
     npm i /path/to/react-native-reanimated-4.0.0-beta.2.tgz
     ```

     - Using **yarn**:

     ```bash
     yarn add /path/to/react-native-reanimated-4.0.0-beta.2.tgz
     ```

> [!NOTE]  
> Make sure to replace `/path/to/react-native-reanimated-4.0.0-beta.2.tgz` with the actual path to the library archive on your computer.

3. **Additional setup** (Optional):
   - If you want to use other Reanimated features, such as worklets, continue following steps for `react-native-reanimated` installation as described in [this quick start guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/#step-2-add-reanimateds-babel-plugin).

### 💻 Usage

For a detailed guide on the library usage, see the [USAGE](./USAGE.md) documentation.

### 🛠️ Reporting Issues

If you encounter any issues, you can:

- Open an issue on our GitHub repository
- Reach out to us on our dedicated Discord channel [#reanimated-4-private-beta](https://discord.com/channels/464786597288738816/1308044483283390494) on Software Mansion Discord.

### 📝 Limitations and Known Issues

For a list of current limitations and known issues, please refer to [LIMITATIONS](./LIMITATIONS.md).

### 👨‍💻 Discord

Make sure to join [Software Mansion](https://swmansion.com) Discord channel using the invite link [here](https://discord.gg/VemJ4df8Yr) and contact us to get added to [#reanimated-4-private-beta](https://discord.com/channels/464786597288738816/1308044483283390494) channel where we discuss issues and communicate our plans and updates.

## Reanimated is created by Software Mansion

Since 2012 [Software Mansion](https://swmansion.com) is a software agency with experience in building web and mobile apps. We are Core React Native Contributors and experts in dealing with all kinds of React Native issues. We can help you build your next dream product – [Hire us](https://swmansion.com/contact/projects?utm_source=reanimated&utm_medium=readme).

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=reanimated-github 'Software Mansion')](https://swmansion.com)
