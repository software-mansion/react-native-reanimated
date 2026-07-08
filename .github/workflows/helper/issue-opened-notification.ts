import { postToSlack } from './slack.ts';

async function main(): Promise<void> {
  const number = process.env.ISSUE_NUMBER ?? '';
  const title = process.env.ISSUE_TITLE ?? '';
  const url = process.env.ISSUE_URL ?? '';
  const author = process.env.ISSUE_AUTHOR ?? '';

  const heading =
    number && title
      ? `🆕 New issue opened: #${number} — ${title}`
      : '🆕 A new issue was opened.';

  const lines = [heading];
  if (author) lines.push(`Opened by ${author}`);
  if (url) lines.push(url);

  await postToSlack({ text: lines.join('\n') });
}

main().catch((err: unknown) => {
  console.error('Error posting new issue notification to Slack:', err);
  process.exitCode = 1;
});
