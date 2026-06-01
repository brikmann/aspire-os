import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getNotionClientForSession,
  findOrCreateCadenceDatabase,
  pushProtocolToNotion,
  saveNotionDatabaseId,
} from '@/lib/notion';

const protocolItemSchema = z.object({
  time: z.string(),
  action: z.string(),
  rationale: z.string(),
  category: z.string(),
  duration_min: z.number().nullable().optional(),
  is_from_calendar: z.boolean(),
});

const bodySchema = z.object({
  protocol: z.array(protocolItemSchema).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const session = await getNotionClientForSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Notion not connected.' }, { status: 403 });
  }

  const { client, meta } = session;

  if (!meta.parent_page_id) {
    return NextResponse.json(
      {
        error:
          'No Notion page found. Open your Notion workspace, share a page with the Aspire OS integration, then reconnect.',
      },
      { status: 422 },
    );
  }

  let databaseId = meta.notion_database_id;

  // Find existing or create new "Cadence Protocol" database
  try {
    databaseId = await findOrCreateCadenceDatabase(client, meta.parent_page_id);
    // Persist the database ID back to metadata if it changed
    if (databaseId !== meta.notion_database_id) {
      await saveNotionDatabaseId(sessionId, meta, databaseId);
    }
  } catch (err) {
    console.error('Notion database setup error:', err);
    return NextResponse.json(
      { error: 'Could not access or create the Cadence Protocol database in Notion.' },
      { status: 502 },
    );
  }

  const result = await pushProtocolToNotion(
    client,
    databaseId,
    body.protocol.map((item) => ({ ...item, duration_min: item.duration_min ?? null })),
    body.date,
  );

  return NextResponse.json(result);
}
