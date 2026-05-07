import { V2Resource } from './_base';

/** Single audit event. */
export interface AuditEvent {
  id: string;
  workspaceId?: string;
  actorId?: string;
  actorType?: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Filter params for listing events. */
export interface ListAuditEventsParams {
  fromDate?: string;
  toDate?: string;
  actorId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  page?: number;
  size?: number;
}

/** Page envelope. */
export interface AuditEventPage {
  events: AuditEvent[];
  total?: number;
  page?: number;
  size?: number;
  hasMore?: boolean;
}

/** Export params. */
export interface AuditExportParams {
  format?: 'CSV' | 'JSON';
  fromDate?: string;
  toDate?: string;
  actorId?: string;
  actionType?: string;
}

/**
 * Audit — query, filter, and export the workspace audit log.
 */
export class Audit extends V2Resource {
  listEvents(params?: ListAuditEventsParams): Promise<AuditEventPage> {
    return this.request('GET', '/v2/audit/events', undefined, params as Record<string, unknown>);
  }

  resourceEvents(
    resourceType: string,
    resourceId: string,
    params?: { page?: number; size?: number }
  ): Promise<AuditEventPage> {
    return this.request(
      'GET',
      `/v2/audit/events/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`,
      undefined,
      params as Record<string, unknown>
    );
  }

  myEvents(params?: { days?: number; page?: number; size?: number }): Promise<AuditEventPage> {
    return this.request('GET', '/v2/audit/events/me', undefined, params as Record<string, unknown>);
  }

  export(params: AuditExportParams): Promise<ArrayBuffer | string> {
    return this.request<ArrayBuffer | string>(
      'GET',
      '/v2/audit/export',
      undefined,
      params as Record<string, unknown>
    );
  }
}
