---
name: worklets-cherry-pick
description:
  Cherry-pick merged PRs from main onto a Worklets release branch (e.g. worklets-0.13-stable) in isolated worktrees, then open
  corresponding PRs and update the tracking issue. Use when asked to cherry-pick, backport, or pick a PR onto a
  `worklets-<X.Y>-stable` branch, or when preparing a Worklets patch release.
---

# Cherry-pick PRs onto a Worklets release branch

Backports merged upstream PRs onto a release branch (e.g. `worklets-0.13-stable`) using one worktree per PR so the cherry-picks
don't fight over the same working tree. Each cherry-pick becomes its own PR (open it ready-for-review — drafting is optional),
and the tracking issue for the release is updated with links.

## Inputs

Ask for or extract from the request:

- **Release branch** — e.g. `worklets-0.13-stable`
- **PR list** — one or more GitHub PR URLs / numbers in `software-mansion/react-native-reanimated`
  Use only the PR number for `<PR>` and `$pr` in branch names, paths and commands.
- **Tracking issue** — the "Worklets X.Y.Z cherry-pick thread" issue. Some titles use the form `[Worklets] [X.Y.Z] cherry-pick thread`.
  Ask if not provided.

## Naming conventions

| Thing          | Pattern                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Local branch   | `@<you>/<release-branch>/cherry-pick-#<PR>` (contains `#` — quote it in shell)                                |
| Worktree path  | `../rwr-cp-<PR>` (sibling of the repo, **not** inside it)                                            |
| PR title       | `cherry-pick(<release-branch>): <upstream title with conv-commit prefix stripped> (#<PR>)`                    |
| PR body        | `Cherry-picking #<PR>` — no AI preamble                                                                       |
| Commit message | Upstream message + `(cherry picked from commit <sha>)` trailer (git writes this to `MERGE_MSG` automatically) |

`<you>` is your GitHub login (`gh api user --jq .login`). Run the commands from the root of your main checkout, so `../` is
its parent directory.

Example strip: `fix(Worklets): Babel plugin not detecting production environment` →
`Babel plugin not detecting production environment`.

## Authorship

- **Author** = original upstream PR author. Preserve their name and email.
- **Committer** = the user running this skill (their git config).
- If original author differs from user, add the user as `Co-authored-by:` trailer.
- **Never** add `Co-Authored-By: Claude` or `🤖 Generated with Claude Code` anywhere — not in commits, not in PR bodies.

## Procedure

### 1. Gather PR metadata

For each PR, capture merge commit SHA + upstream title + original author:

```bash
gh pr view <PR> --repo software-mansion/react-native-reanimated \
  --json mergeCommit,title
git log -1 --format='%an <%ae>' <sha>
git show -s --format='%P%n%s' <sha>
```

The last command prints the parent SHAs on the first line and the subject on the second. This repo squash-merges PRs, so
continue only when the first line has exactly one SHA and the subject ends with `(#<PR>)`. Otherwise the PR was merged in a
different way. Stop and ask the user.

### 2. Create worktrees

```bash
git fetch origin <release-branch>
for pr in <PR1> <PR2> …; do
  git worktree add -b "@<you>/<release-branch>/cherry-pick-#$pr" \
    ../rwr-cp-$pr origin/<release-branch>
done
```

### 3. Cherry-pick with `--no-commit`

```bash
cd ../rwr-cp-<PR>
git cherry-pick --no-commit -x <sha>
```

Note: `-x` does **nothing** when combined with `--no-commit` (the `(cherry picked from commit …)` trailer is only added when
cherry-pick itself commits). Fortunately git writes the full upstream message + trailer to `MERGE_MSG` on `--no-commit`, so step
5 recovers it.

### 3a. Keep only the Worklets part

If the upstream PR also changes Reanimated, leave the Reanimated part out of the cherry-pick: restore `packages/react-native-reanimated/` from the
release branch. This also removes the Reanimated changelog fragment. A Worklets release branch does not release Reanimated.

```bash
git restore --source=origin/<release-branch> --staged --worktree -- packages/react-native-reanimated
```

### 3b. Keep the changelog entry

On stable branches newer than `worklets-0.13-stable`, the upstream changelog fragment in
`packages/react-native-worklets/changelog/` comes with the cherry-pick. Keep it. On `worklets-0.13-stable` and older, the
branch uses the old layout: delete the fragment and add a bullet under `## Unpublished` in
`packages/react-native-worklets/CHANGELOG.md` with the PR and author links. See the changelog item of the "Cross-cutting
change checklist" in `AGENTS.md`.

### 4. Resolve conflicts

Common one on 0.9-stable: `scripts/patches/resolutions.patch` doesn't exist on the release branch (it was introduced by "enable
Bundle Mode by default" which never landed on 0.9). Drop the hunk:

```bash
git rm scripts/patches/resolutions.patch
```

General rule: files/hunks that reference infrastructure absent from the release branch should be dropped, not force-merged. When
in doubt, check `git log --all -- <path>` to see if the file was ever on the release branch.

**Not every conflict is a drop.** Stable branches often retain code that `main` has since refactored away (an inlined visitor,
an extra pass field, an import that moved), so a backport can conflict _additively_ — the incoming hunk and the branch's own
code both belong. Resolve those by keeping **both** sides, not by dropping either. Seen backporting #10032 onto
0.10/0.11-stable: the `globals.ts` import block and a `WorkletsPluginPass` field each conflicted additively (the branch still
had `autoworkletizationPlugin` + `@babel/*` type imports that `main` had moved out).

### 5. Commit

**Use the gitdir path — `.git` in a worktree is a file, not a directory. `git commit -F .git/MERGE_MSG` fails silently with
`Not a directory`.**

Conflict-free apply — commit MERGE\_MSG directly:

```bash
git commit -F "$(git rev-parse --git-dir)/MERGE_MSG"
```

**If the cherry-pick conflicted**, git appends a trailing `# Conflicts:` comment block to MERGE\_MSG. `git commit -F` uses
`whitespace` cleanup, which keeps `#` lines, so that block ends up in the commit message. You **can't** fix it with
`--cleanup=strip` — the upstream PR body legitimately contains `##`/`###` markdown headers that `strip` would delete along with
it. Cut only the `# Conflicts:` block first, then commit the cleaned file:

```bash
mm="$(git rev-parse --git-dir)/MERGE_MSG"
awk '/^# Conflicts:/{exit} {print}' "$mm" > "$mm.clean"
git commit -F "$mm.clean"
```

### 6. Fix authorship (only when original author ≠ user)

Decide this before you commit in step 5. If original author = user, skip this step.

If the upstream squash commit already has a `Co-authored-by: <you>` trailer (GitHub's squash-merge often adds it, and it
comes into MERGE\_MSG), **don't add it twice**. Add `--author` to the step 5 commit command instead:

```bash
git commit --author="<Original Author> <og@email>" -F "<message-file>"
```

Otherwise, commit as in step 5, then add the trailer and set the author with an amend:

```bash
git log -1 --format=%B | \
  git interpret-trailers --trailer "Co-authored-by: <User Name> <user@email>" | \
  git commit --amend --author="<Original Author> <og@email>" -F -
```

### 7. Push

```bash
git push -u origin "@<you>/<release-branch>/cherry-pick-#<PR>"
```

If a previous failed attempt left an empty branch on remote, use `--force-with-lease`.

### 8. Open the PR

Open it ready-for-review (omit `--draft`); drafting is optional. The body is just `Cherry-picking #<PR>` — no AI preamble.

```bash
gh pr create \
  --base <release-branch> \
  --head "@<you>/<release-branch>/cherry-pick-#<PR>" \
  --title "cherry-pick(<release-branch>): <stripped title> (#<PR>)" \
  --body "Cherry-picking #<PR>"
```

### 9. Update tracking issue

The tracking issue lists the upstream PRs. Under each upstream PR, add the cherry-pick PR as a nested item:

```
- https://github.com/software-mansion/react-native-reanimated/pull/<PR>
  - https://github.com/software-mansion/react-native-reanimated/pull/<cherry-pick PR>
```

If the upstream PR is not in the list yet, add both lines. Read the body with `gh issue view <N> --repo software-mansion/react-native-reanimated --json body --jq .body > <file>`, and write it
back with `gh api repos/software-mansion/react-native-reanimated/issues/<N> -X PATCH -F body=@<file>`. Keep the rest of the body unchanged.

### 10. Cleanup (after PRs are merged)

```bash
for pr in <PR1> <PR2> …; do
  git worktree remove ../rwr-cp-$pr
  git branch -D "@<you>/<release-branch>/cherry-pick-#$pr"
done
```

The upstream repo has "Automatically delete head branches" enabled — remote branches disappear on merge. Verify with
`git ls-remote origin "<branch>"` if unsure.

## Confirmation checkpoints

Before executing steps that create externally visible artifacts, confirm scope with the user:

- Before `gh pr create` — first run only, to verify title/body format is right.
- Before `git push --force-with-lease` — force-push is fine on private cherry-pick branches but flag it.
- Before amending a commit that changes authorship — surface the change.

Local worktree/branch operations don't need confirmation; they're reversible.

## Gotchas checklist

- [ ] `.git` in a worktree is a **file**. Use `$(git rev-parse --git-dir)/MERGE_MSG`, not `.git/MERGE_MSG`.
- [ ] `-x` on `--no-commit` cherry-pick does nothing — recover the trailer from `MERGE_MSG`.
- [ ] `--no-commit` with a conflict-free apply does **not** leave a cherry-pick in progress. `git cherry-pick --continue` will
  error with "no cherry-pick in progress". Just commit.
- [ ] Chained `git commit && git push` after a silent commit failure can push an empty branch (release-branch tip) to origin. If
  it happens, force-push over it after committing correctly.
- [ ] Branch names contain `#` — always quote in shell commands.
- [ ] Conflicted cherry-pick → MERGE\_MSG gets a trailing `# Conflicts:` block that `git commit -F` keeps (whitespace cleanup).
  Strip only that block with `awk '/^# Conflicts:/{exit} {print}'`; don't use `--cleanup=strip` — it also deletes the body's
  `##`/`###` markdown headers.
- [ ] If the upstream squash commit already carries a `Co-authored-by: <you>` trailer (GitHub usually adds it), don't re-add it
  — just commit with `--author=` directly.
- [ ] Cherry-pick PRs may be opened ready-for-review (omit `--draft`); no AI preamble in the body.
- [ ] The Claude Code auto-mode classifier may block commits mid-flow if the user earlier said "don't commit". Ask the user for
  explicit re-authorization.
