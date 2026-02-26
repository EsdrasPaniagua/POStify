import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ products: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('POST received:', body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}

export async function PUT(request: Request) {
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  return NextResponse.json({ success: true });
}