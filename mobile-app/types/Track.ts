export interface Track {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startTime: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export type RootStackParamList = {
  Home: undefined;
  TrackDetails: { trackId: number };
  CreateEdit: { trackId?: number };
  Settings: undefined;
  Info: undefined;
};
