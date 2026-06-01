import { NextRequest, NextResponse } from 'next/server';
import { getNotionClientForSession } from '@/lib/notion';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ connected: false });
  }

  const session = await getNotionClientForSession(sessionId);

  if (!session) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    workspace_name: session.meta.workspace_name,
    database_id: session.meta.notion_database_id,
    parent_page_id: session.meta.parent_page_id,
  });
}
