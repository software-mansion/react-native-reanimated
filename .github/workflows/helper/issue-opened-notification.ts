import { postToSlack } from './slack.ts';

async function main(): Promise<void> {
  const number = process.env.ISSUE_NUMBER;
  const url = process.env.ISSUE_URL;
  const title = process.env.ISSUE_TITLE;
  const author = process.env.ISSUE_AUTHOR;

  if (!number || !url) {
    throw new Error(
      'ISSUE_NUMBER and ISSUE_URL are required to post a new-issue notification.'
    );
  }

  const heading = title
    ? `🆕 New issue opened: #${number} — ${title}`
    : `🆕 New issue opened: #${number}`;

  const lines = [heading];
  if (author) lines.push(`Opened by ${author}`);
  lines.push(url);

  await postToSlack({ text: lines.join('\n') });
}

main().catch((err: unknown) => {
  console.error('Error posting new issue notification to Slack:', err);
  process.exitCode = 1;
});
