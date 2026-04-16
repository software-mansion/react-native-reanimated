/*
 * This script is a wrapper for gradle & spotlessApply to make
 * it work properly with lint-staged.
 */
const { exit } = require('process');
const { execSync } = require('child_process');

// spotless formatting task in android/build.gradle
const spotlessApply = './android/gradlew -p android spotlessApply';

// takes file as parameter passed by lint-staged (optional)
const fileName = process.argv[2];

// https://github.com/diffplug/spotless/blob/main/plugin-gradle/IDE_HOOK.md
// creates file argument without space between arguments
const fileArgument = `-PspotlessIdeHook=${fileName}`;

const command =
  fileName !== undefined ? `${spotlessApply} ${fileArgument}` : spotlessApply;

/** @param {string} command */
function execSyncGuarded(command) {
  try {
    execSync(command);
  } catch {
    exit(1);
  }
}

// reformat code
execSyncGuarded(command);

// file passed by lint-staged is now reformatted
if (fileName !== undefined) {
  // so stage this file again after formatting
  execSyncGuarded(`git add ${fileName}`);
}
