import { NextResponse } from 'next/server';
import { readStyleInsights, saveStyleInsights } from '@/lib/storage/style-memory-files';

export async function GET() {
  const insights = await readStyleInsights();
  return NextResponse.json(insights);
}

export async function POST(request: Request) {
  try {
    const { insights } = await request.json();
    if (!Array.isArray(insights)) {
      return NextResponse.json({ error: 'insights 必须是数组' }, { status: 400 });
    }
    await saveStyleInsights(insights);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
