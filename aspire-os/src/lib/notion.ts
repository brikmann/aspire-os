import { Client } from '@notionhq/client';
import { supabase } from './supabase';
import { encryptToken, decryptToken } from './crypto';

// ── OAuth ─────────────────────────────────────────────────────────────────

export function getNotionAuthUrl(sessionId: string): string {
  const clientId = process.env.NOTION_CLIENT_ID!;
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const redirectUri = encodeURIComponent(`${base}/api/auth/notion/callback`);
  return (
    `https://api.notion.com/v1/oauth/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&owner=user` +
    `&redirect_uri=${redirectUri}` +
    `&state=${sessionId}`
  );
}

type NotionTokenResponse = {
  access_token: string;
  bot_id: string;
  workspace_id: string;
  workspace_name: string;
  owner: unknown;
};

export async function exchangeNotionCode(code: string): Promise<NotionTokenResponse> {
  const clientId = process.env.NOTION_CLIENT_ID!;
  const clientSecret = process.env.NOTION_CLIENT_SECRET!;
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const redirectUri = `${base}/api/auth/notion/callback`;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Notion token exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<NotionTokenResponse>;
}

// Notion tokens don't expire — no refresh logic needed.
export async function storeNotionTokens(
  sessionId: string,
  tokens: NotionTokenResponse,
  parentPageId: string | null,
): Promise<void> {
  await supabase.from('user_oauth').upsert(
    {
      session_id: sessionId,
      provider: 'notion',
      access_token: encryptToken(tokens.access_token),
      refresh_token: null,
      expires_at: null,
      metadata: {
        bot_id: tokens.bot_id,
        workspace_id: tokens.workspace_id,
        workspace_name: tokens.workspace_name,
        parent_page_id: parentPageId,
        notion_database_id: null,
      },
    },
    { onConflict: 'session_id,provider' },
  );
}

// ── Session client ─────────────────────────────────────────────────────────

export type NotionMeta = {
  bot_id: string;
  workspace_id: string;
  workspace_name: string;
  parent_page_id: string | null;
  notion_database_id: string | null;
};

export type NotionSession = {
  client: Client;
  meta: NotionMeta;
};

export async function getNotionClientForSession(sessionId: string): Promise<NotionSession | null> {
  const { data, error } = await supabase
    .from('user_oauth')
    .select('access_token, metadata')
    .eq('session_id', sessionId)
    .eq('provider', 'notion')
    .single();

  if (error || !data) return null;

  const client = new Client({ auth: decryptToken(data.access_token) });
  const meta = (data.metadata ?? {}) as NotionMeta;
  return { client, meta };
}

export async function saveNotionDatabaseId(sessionId: string, meta: NotionMeta, databaseId: string): Promise<void> {
  await supabase
    .from('user_oauth')
    .update({ metadata: { ...meta, notion_database_id: databaseId } })
    .eq('session_id', sessionId)
    .eq('provider', 'notion');
}

// ── Database helpers ───────────────────────────────────────────────────────

export async function findOrCreateCadenceDatabase(
  notionClient: Client,
  parentPageId: string,
): Promise<string> {
  // Search for an existing "Cadence Protocol" database under this parent page
  const search = await notionClient.search({
    query: 'Cadence Protocol',
    filter: { property: 'object', value: 'database' },
  });

  const existing = search.results.find((r) => {
    if (r.object !== 'database') return false;
    const parent = (r as { parent?: { type?: string; page_id?: string } }).parent;
    return parent?.type === 'page_id' && parent.page_id?.replace(/-/g, '') === parentPageId.replace(/-/g, '');
  });

  if (existing) return existing.id;

  // Create new database
  const created = await notionClient.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: 'Cadence Protocol' } }],
    properties: {
      Action: { title: {} },
      'Scheduled For': { date: {} },
      Category: {
        select: {
          options: [
            { name: 'work', color: 'blue' },
            { name: 'recovery', color: 'green' },
            { name: 'meeting', color: 'purple' },
            { name: 'meal', color: 'orange' },
            { name: 'sleep', color: 'gray' },
          ],
        },
      },
      Done: { checkbox: {} },
      Rationale: { rich_text: {} },
      'Duration (min)': { number: { format: 'number' } },
      Source: {
        select: {
          options: [{ name: 'Cadence', color: 'default' }],
        },
      },
      'From Calendar': { checkbox: {} },
    },
  });

  return created.id;
}

// ── Push protocol ──────────────────────────────────────────────────────────

type ProtocolItem = {
  time: string;
  action: string;
  rationale: string;
  category: string;
  duration_min: number | null;
  is_from_calendar: boolean;
};

type PushResult = {
  success: boolean;
  count: number;
  database_url: string;
  errors: string[];
};

// Converts "2026-06-02" + "9:00 AM" → "2026-06-02T09:00:00"
// Returns a local datetime string without timezone so Notion uses the workspace timezone.
function combineDateAndTime(dateStr: string, timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return `${dateStr}T00:00:00`;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pushProtocolToNotion(
  notionClient: Client,
  databaseId: string,
  protocol: ProtocolItem[],
  date: string,
): Promise<PushResult> {
  const errors: string[] = [];
  let count = 0;

  for (const item of protocol) {
    try {
      await notionClient.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Action: {
            title: [{ type: 'text', text: { content: item.action } }],
          },
          'Scheduled For': {
            date: { start: combineDateAndTime(date, item.time) },
          },
          Category: {
            select: { name: item.category },
          },
          Done: { checkbox: false },
          Rationale: {
            rich_text: [{ type: 'text', text: { content: item.rationale } }],
          },
          'Duration (min)': {
            number: item.duration_min ?? null,
          },
          Source: {
            select: { name: 'Cadence' },
          },
          'From Calendar': { checkbox: item.is_from_calendar },
        },
      });
      count++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
    await delay(200);
  }

  return {
    success: errors.length === 0,
    count,
    database_url: `https://www.notion.so/${databaseId.replace(/-/g, '')}`,
    errors,
  };
}

// ── Disconnect ─────────────────────────────────────────────────────────────

export async function disconnectNotion(sessionId: string): Promise<void> {
  await supabase
    .from('user_oauth')
    .delete()
    .eq('session_id', sessionId)
    .eq('provider', 'notion');
}
