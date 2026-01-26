import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('system_audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase
    const transformedLogs = (logs || []).map(log => ({
      id: log.id,
      userId: log.user_id,
      userEmail: log.user_email,
      userName: log.user_name,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      changes: log.changes,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      notes: log.notes,
      timestamp: log.timestamp,
    }));

    return NextResponse.json(transformedLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
