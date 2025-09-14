import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cardUrl = searchParams.get('url');

  if (!cardUrl) {
    return NextResponse.json({ error: 'Card URL is required' }, { status: 400 });
  }

  try {
    // Make request to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/card-by-url?url=${encodeURIComponent(cardUrl)}`);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching card by URL:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch card data' 
    }, { status: 500 });
  }
}
