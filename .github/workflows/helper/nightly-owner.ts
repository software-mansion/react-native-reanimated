import { createHash } from 'node:crypto';

export const NIGHTLY_OWNER_ROTATION = [
  'tjzel',
  'pawicao',
  'bartlomiejbloniarz',
  'tshmieldev',
];

export const RUNTIME_TESTS_NIGHTLY_WORKFLOWS = [
  'runtime-tests-nightly.yml',
  'runtime-tests-sanitizers-nightly.yml',
];

export function formatNightlyOwnerLine(date: Date): string {
  const owner = pickNightlyOwner(date);
  return `🧑‍🔧 Runtime tests nightly owner for ${utcDay(date)}: ${formatMention(owner)}, please look into the failure.`;
}

export function pickNightlyOwner(date: Date): string {
  const digest = createHash('sha256').update(utcDay(date)).digest();
  return NIGHTLY_OWNER_ROTATION[
    digest.readUInt32BE(0) % NIGHTLY_OWNER_ROTATION.length
  ];
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMention(githubHandle: string): string {
  const slackId = readSlackIds()[githubHandle];
  return slackId ? `<@${slackId}>` : `@${githubHandle} (GitHub)`;
}

const SLACK_MEMBER_ID_REGEX = /^[UW][A-Z0-9]+$/;

function readSlackIds(): Record<string, string> {
  const raw = process.env.NIGHTLY_OWNER_SLACK_IDS;
  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('NIGHTLY_OWNER_SLACK_IDS is not valid JSON');
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error('NIGHTLY_OWNER_SLACK_IDS must be a JSON object');
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && SLACK_MEMBER_ID_REGEX.test(entry[1])
    )
  );
}
