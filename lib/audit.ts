import { db } from '@/lib/db';
import { systemAuditLog } from '@/shared/schema';

export type AuditAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'restore'
    | 'role_change'
    | 'submit'
    | 'approve'
    | 'reject'
    | 'send'
    | 'view'
    | 'profile_update';

export type AuditEntityType =
    | 'user'
    | 'timesheet'
    | 'client'
    | 'roster'
    | 'approval_batch';

export interface AuditParams {
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string | null;
    entityName?: string | null;
    changes?: Record<string, unknown> | null;
    notes?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    req?: Request;
}

/**
 * Write one entry to the system_audit_log table.
 * Errors are caught and logged to console — they never bubble up, so a
 * logging failure never breaks the main request.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
    try {
        const ipAddress =
            params.ipAddress ??
            (params.req
                ? (params.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null)
                : null);

        const userAgent =
            params.userAgent ?? (params.req ? (params.req.headers.get('user-agent') ?? null) : null);

        await db.insert(systemAuditLog).values({
            userId: params.userId,
            userEmail: params.userEmail,
            userName: params.userName,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId ?? null,
            entityName: params.entityName ?? null,
            changes: params.changes ?? null,
            ipAddress,
            userAgent,
            notes: params.notes ?? null,
        });
    } catch (err) {
        // Log but never rethrow — audit failures must not break business logic
        console.error('[audit] Failed to write audit log entry:', err);
    }
}

/**
 * Helper: extract display name for a Supabase user object.
 */
export function auditUserName(user: {
    user_metadata?: { full_name?: string; name?: string; firstName?: string; lastName?: string };
    email?: string;
} | null): string | null {
    if (!user) return null;
    return (
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        ([user.user_metadata?.firstName, user.user_metadata?.lastName].filter(Boolean).join(' ') || null) ??
        user.email ??
        null
    );
}
