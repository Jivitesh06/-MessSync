export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: 'publish_menu' | 'save_draft' | 'edit_meal' | 'restore_version' | 'moderate_review' | 'update_timings';
  performedBy: string; // admin email
  timestamp: string;
  details: string;
  targetId?: string;
}
