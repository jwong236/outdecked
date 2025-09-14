import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string; field: string }> }
) {
  const { game, field } = await params;
  
  try {
    const backendUrl = `http://localhost:5000/api/filter-values/${field}?game=${encodeURIComponent(game)}`;
    
    const response = await fetch(backendUrl);
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: data.error || 'Failed to fetch metadata values' }, { status: response.status });
    }
  } catch (error: any) {
    console.error('Error proxying metadata values request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
