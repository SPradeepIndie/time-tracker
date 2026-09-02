// Track model - source of truth for the entire app
export interface Track {
  id: string;           // UUID (local primary key)
  remoteId?: number;    // backend integer ID, set only when synced
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// Predefined tags the user can pick from; they can also add custom ones
export const PREDEFINED_TAGS: string[] = [
  'work',
  'personal',
  'urgent',
  'bug',
  'feature',
  'meeting',
  'research',
  'review',
  'blocked',
  'follow-up',
];

export type RootStackParamList = {
  Auth: undefined;
  PinSetup: undefined;
  MainTabs: undefined;
  TrackDetails: { id: string };
  CreateEdit: { id?: string };
  Info: undefined;
};
