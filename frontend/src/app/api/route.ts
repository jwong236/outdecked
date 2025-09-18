import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game');
  
  try {
    const backendUrl = `http://localhost:5000/api/filter-values/ActivationEnergy${game ? `?game=${encodeURIComponent(game)}` : ''}`;
    
    const response = await fetch(backendUrl);
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: data.error || 'Failed to fetch color values' }, { status: response.status });
    }
  } catch (error: any) {
    console.error('Error proxying color values request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
