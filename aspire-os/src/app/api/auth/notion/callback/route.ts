import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { exchangeNotionCode, storeNotionTokens } from '@/lib/notion';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!code || !state || !sessionId || state !== sessionId) {
    return NextResponse.redirect(new URL('/dashboard?error=notion_auth_failed', req.url));
  }

  try {
    const tokens = await exchangeNotionCode(code);

    // Find the first page the user granted access to — this becomes the parent
    // for the auto-created "Cadence Protocol" database.
    let parentPageId: string | null = null;
    try {
      const client = new Client({ auth: tokens.access_token });
      const pages = await client.search({
        filter: { property: 'object', value: 'page' },
        page_size: 1,
      });
      parentPageId = (pages.results[0] as { id?: string } | undefined)?.id ?? null;
    } catch {
      // Non-fatal: user can still connect; push will surface the missing-page error
    }

    await storeNotionTokens(sessionId, tokens, parentPageId);
  } catch (err) {
    console.error('Notion callback error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=notion_auth_failed', req.url));
  }

  return NextResponse.redirect(new URL('/dashboard?notion_connected=true', req.url));
}
