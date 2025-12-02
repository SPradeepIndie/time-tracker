import { Track } from '../types/Track';
import { BackendTracker, CreateTrackerRequest, UpdateTrackerRequest } from '../services/api';

// Helper to extract metadata from task string
// Format: "TITLE | DESCRIPTION | STATUS:pending | PRIORITY:medium | TAGS:tag1,tag2"
const parseTaskMetadata = (task: string) => {
  const parts = task.split(' | ');
  const title = parts[0] || 'Untitled';
  const description = parts[1] || '';
  
  let status: 'pending' | 'in-progress' | 'completed' = 'pending';
  let priority: 'low' | 'medium' | 'high' = 'medium';
  let tags: string[] = [];

  for (let i = 2; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('STATUS:')) {
      const s = part.replace('STATUS:', '') as any;
      if (['pending', 'in-progress', 'completed'].includes(s)) {
        status = s;
      }
    } else if (part.startsWith('PRIORITY:')) {
      const p = part.replace('PRIORITY:', '') as any;
      if (['low', 'medium', 'high'].includes(p)) {
        priority = p;
      }
    } else if (part.startsWith('TAGS:')) {
      const tagString = part.replace('TAGS:', '');
      tags = tagString ? tagString.split(',').filter(t => t.length > 0) : [];
    }
  }

  return { title, description, status, priority, tags };
};

// Helper to create task string with metadata
const createTaskString = (
  title: string,
  description: string,
  status: string,
  priority: string,
  tags?: string[]
): string => {
  let taskString = `${title} | ${description} | STATUS:${status} | PRIORITY:${priority}`;
  if (tags && tags.length > 0) {
    taskString += ` | TAGS:${tags.join(',')}`;
  }
  return taskString;
};

// Convert backend tracker to frontend track
export const backendToFrontend = (tracker: BackendTracker): Track => {
  const { title, description, status, priority, tags } = parseTaskMetadata(tracker.task);
  
  return {
    id: tracker.id,
    title,
    description,
    status,
    priority,
    startTime: new Date(tracker.start_time),
    endTime: tracker.end_time ? new Date(tracker.end_time) : undefined,
    createdAt: new Date(tracker.created_at),
    updatedAt: new Date(tracker.updated_at),
    tags,
  };
};

// Convert frontend track to backend create request
export const frontendToBackendCreate = (track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): CreateTrackerRequest => {
  const taskString = createTaskString(
    track.title,
    track.description,
    track.status,
    track.priority,
    track.tags
  );

  return {
    task: taskString,
    start_time: track.startTime.toISOString(),
    end_time: track.endTime?.toISOString(),
  };
};

// Convert frontend track to backend update request
export const frontendToBackendUpdate = (track: Partial<Track>): UpdateTrackerRequest => {
  const request: UpdateTrackerRequest = {};

  // If any of these fields are present, rebuild the task string
  if (track.title !== undefined || track.description !== undefined || 
      track.status !== undefined || track.priority !== undefined || 
      track.tags !== undefined) {
    // We need all fields to rebuild task string, so this should be used carefully
    // In practice, the update should include all these fields
    const taskString = createTaskString(
      track.title || '',
      track.description || '',
      track.status || 'pending',
      track.priority || 'medium',
      track.tags
    );
    request.task = taskString;
  }

  if (track.startTime) {
    request.start_time = track.startTime.toISOString();
  }

  if (track.endTime !== undefined) {
    request.end_time = track.endTime?.toISOString();
  }

  return request;
};
