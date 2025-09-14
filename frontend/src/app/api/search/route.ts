import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Forward all query parameters to the Flask backend
    const backendUrl = new URL('http://localhost:5000/api/search');
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const response = await fetch(backendUrl.toString());
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: data.error || 'Search failed' }, { status: response.status });
    }
  } catch (error: any) {
    console.error('Error proxying search request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
