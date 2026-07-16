import { postToSlack } from './slack.ts';

async function main(): Promise<void> {
  const number = process.env.PR_NUMBER;
  const url = process.env.PR_URL;
  const title = process.env.PR_TITLE;
  const author = process.env.PR_AUTHOR;
  const authorAssociation = process.env.PR_AUTHOR_ASSOCIATION;

  if (!number || !url) {
    throw new Error(
      'PR_NUMBER and PR_URL are required to post a new-pull-request notification.'
    );
  }

  const heading = title
    ? `🔀 New pull request from an outside contributor: #${number} — ${title}`
    : `🔀 New pull request from an outside contributor: #${number}`;

  const lines = [heading];
  if (author) {
    lines.push(
      authorAssociation
        ? `Opened by ${author} (${authorAssociation})`
        : `Opened by ${author}`
    );
  }
  lines.push(url);

  await postToSlack({ text: lines.join('\n') });
}

main().catch((err: unknown) => {
  console.error('Error posting new pull request notification to Slack:', err);
  process.exitCode = 1;
});
