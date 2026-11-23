---
name: reanimated-cherry-pick
description:
  Cherry-pick merged PRs from main onto a Reanimated release branch (e.g. 4.3-stable) in isolated worktrees, then open
  corresponding PRs and update the tracking issue. Use when asked to cherry-pick, backport, or pick a PR onto a `<X.Y>-stable`
  branch, or when preparing a Reanimated patch release.
---

# Cherry-pick PRs onto a Reanimated release branch

Backports merged upstream PRs onto a release branch using one worktree per PR so the cherry-picks don't fight over the same
working tree. Each cherry-pick becomes its own PR (open it ready-for-review — drafting is optional), and the tracking issue for
the release is updated with links.

Preferably use PR stack from GitHub.

## Inputs

Ask for or extract from the request:

- **Release branch** — e.g. `4.3-stable`
- **PR list** — one or more GitHub PR URLs / numbers in `software-mansion/react-native-reanimated`
  Use only the PR number for `<PR>` and `$pr` in branch names, paths and commands.
- **Tracking issue** — the "Reanimated X.Y.Z cherry-pick thread" issue. Some titles use the form `[Reanimated] [X.Y.Z] cherry-pick thread`.
  Ask if not provided.

## Naming conventions

| Thing          | Pattern                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Local branch   | `@<you>/<release-branch>/cherry-pick-#<PR>` (contains `#` — quote it in shell)                                |
| Worktree path  | `../rnr-cp-<PR>` (sibling of the repo, **not** inside it)                                            |
| PR title       | `cherry-pick(<release-branch>): <upstream title with conv-commit prefix stripped> (#<PR>)`                    |
| PR body        | `Cherry-picking #<PR>` — no AI preamble                                                                       |
| Commit message | Upstream message + `(cherry picked from commit <sha>)` trailer (git writes this to `MERGE_MSG` automatically) |

`<you>` is your GitHub login (`gh api user --jq .login`). `origin` must be `software-mansion/react-native-reanimated`, because
the branches are pushed to the upstream repository. Run the commands from the root of your main checkout, so `../` is
its parent directory.

Example strip: `fix(Reanimated): Babel plugin not detecting production environment` →
`Babel plugin not detecting production environment`.

## Authorship

- **Author** = original upstream PR author. Preserve their name and email.
- **Committer** = the user running this skill (their git config).
- If original author differs from user, add the user as `Co-authored-by:` trailer.
- **Never** add `Co-Authored-By: Claude` or `🤖 Generated with Claude Code` anywhere — not in commits, not in PR bodies.

## Procedure

### 1. Gather PR metadata

Step 2 creates the worktrees for all PRs. Then complete step 1 and steps 3 to 9 for one PR before you start the next PR,
and set `sha`, `title` and `author` again in step 1 for each PR.

For each PR, capture merge commit SHA + upstream title + original author. Keep the upstream values in shell variables and
pass them quoted (`"$author"`, `"$title"`). Never type them into a command: a backtick or `$(...)` in a title runs as a
command inside double quotes.

```bash
git fetch origin main
sha="$(gh pr view <PR> --repo software-mansion/react-native-reanimated --json mergeCommit --jq .mergeCommit.oid)"
git cat-file -e "$sha^{commit}"
title="$(gh pr view <PR> --repo software-mansion/react-native-reanimated --json title --jq .title | sed -E 's/^[a-z]+(\([^)]*\))?!?: //')"
author="$(git show -s --format='%an <%ae>' "$sha")"
git show -s --format='%P%n%s' "$sha"
```

`git cat-file -e` fails when the commit is not in the clone. Then fetch again and check that the PR is merged.

The last command prints the parent SHAs on the first line and the subject on the second. This repo squash-merges PRs, so
continue only when the first line has exactly one SHA and the subject ends with `(#<PR>)`. Otherwise the PR was merged in a
different way. Stop and ask the user.

### 2. Create worktrees

```bash
git fetch origin <release-branch>
for pr in <PR1> <PR2> …; do
  git worktree add -b "@<you>/<release-branch>/cherry-pick-#$pr" \
    ../rnr-cp-$pr origin/<release-branch>
done
```

### 3. Cherry-pick with `--no-commit`

```bash
cd ../rnr-cp-<PR>
git cherry-pick --no-commit -x "$sha"
```

Note: `-x` does **nothing** when combined with `--no-commit` (the `(cherry picked from commit …)` trailer is only added when
cherry-pick itself commits). Fortunately git writes the full upstream message + trailer to `MERGE_MSG` on `--no-commit`, so step
5 recovers it.

### 3a. Keep only the Reanimated part

If the upstream PR also changes Worklets, leave the Worklets part out of the cherry-pick: restore `packages/react-native-worklets/` from the
release branch. This also removes the Worklets changelog fragment. A Reanimated release branch does not release Worklets.

```bash
git restore --source=origin/<release-branch> --staged --worktree -- packages/react-native-worklets
```

### 3b. Keep the changelog fragment

On `4.7-stable` and newer, the upstream changelog fragment in `packages/react-native-reanimated/changelog/` comes with the
cherry-pick. Keep it: `changelog:squash` reads it at release time. On older branches, see the changelog item of the
"Cross-cutting change checklist" in `AGENTS.md`.

### 4. Resolve conflicts

Resolve conflicts.

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
git commit --author="$author" -F "<message-file>"
```

Otherwise, commit as in step 5, then add the trailer and set the author with an amend:

```bash
git log -1 --format=%B | \
  git interpret-trailers --trailer "Co-authored-by: <User Name> <user@email>" | \
  git commit --amend --author="$author" -F -
```

### 7. Push

```bash
git push -u origin "@<you>/<release-branch>/cherry-pick-#<PR>"
```

If a previous failed attempt left an empty branch on remote, use `--force-with-lease`.

### 8. Open the PR

Open it ready-for-review (omit `--draft`); drafting is optional. The body is just `Cherry-picking #<PR>` — no AI preamble.

```bash
gh pr create --repo software-mansion/react-native-reanimated \
  --base <release-branch> \
  --head "@<you>/<release-branch>/cherry-pick-#<PR>" \
  --title "cherry-pick(<release-branch>): $title (#<PR>)" \
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
  git worktree remove ../rnr-cp-$pr
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
