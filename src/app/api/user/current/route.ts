import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(currentUser);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ 
      error: 'Failed to get current user' 
    }, { status: 500 });
  }
}
