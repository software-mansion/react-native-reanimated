# Changelog fragments

Each pull request that changes this package adds one file here. The release script moves the entries into `../CHANGELOG.md` and deletes the files. Do not edit `../CHANGELOG.md` by hand.

## Add a fragment

Run this in the repository root:

```sh
yarn workspace react-native-reanimated changelog:add --type fix --message 'Fix the crash of `measure` on an unmounted view.'
```

- `--type` is `breaking`, `feature`, `fix` or `other`.
- The script writes into the package of the workspace. A change to both packages needs one run for each.
- Put the message in single quotes, because the shell runs backticks inside double quotes. `--message -` reads the message from stdin.
- `--slug` sets the file name. The default is the branch name without the text before the first `/`.
- Without the flags, the script asks for the values.

## Format

- File name: `<slug>.<type>.md`. The slug has only `a-z`, `0-9` and `-`.
- Content: one sentence. Do not add the link to the pull request or the author. The release script reads them from the merge commit.
- Optional lines after the sentence: `pr: 12345` sets the pull request number, `by: @user1, @user2` sets the authors.
- A pull request with two entries adds two files.

## Read the unpublished entries

```sh
yarn workspace react-native-reanimated changelog:squash
```
