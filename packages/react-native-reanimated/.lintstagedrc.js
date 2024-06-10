const REANIMATED_PATH = 'packages/react-native-reanimated';
module.exports = {
  '*.(js|ts|tsx)': [
    `cd ${REANIMATED_PATH} && yarn eslint `,
    `cd ${REANIMATED_PATH} && yarn eslint --quiet --ext '.js,.ts,.tsx' src/`,
    `cd ${REANIMATED_PATH} && yarn prettier --write`,
  ],
  'plugin/**/*.{js,ts,tsx}': `cd ${REANIMATED_PATH} && yarn lint:plugin`,
  '**/*.{h,cpp}': `cd ${REANIMATED_PATH} && yarn lint:cpp`,
  'android/src/**/*.java': `cd ${REANIMATED_PATH} && yarn format:java`,
  'android/src/**/*.{h,cpp}': `cd ${REANIMATED_PATH} && yarn format:android`,
  'apple/**/*.{h,m,mm,cpp}': `cd ${REANIMATED_PATH} && yarn format:ios`,
  'Common/**/*.{h,cpp}': `cd ${REANIMATED_PATH} && yarn format:common`,
};
