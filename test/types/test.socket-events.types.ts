import { Socket } from 'socket.io-client';
import { EpicDto } from 'src/epics/dtos/epic.dto';
import { ProjectDto } from 'src/projects/dtos/project.dto';
import { TaskDto } from 'src/tasks/dtos/task.dto';
import { ProjectEvents } from 'src/shared/enums/project-events';

// ── Event payload map ──────────────────────────────────────────────
// Single source of truth: event name → payload type.
// Used in the gateway's broadcastProjectEntityChange and test helpers.

export interface ProjectEventPayloads {
  // Presence
  [ProjectEvents.JOIN_PROJECT]: { projectId: string };
  [ProjectEvents.USER_JOINED_PROJECT]: {
    userId: string;
    username: string;
    projectId: string;
  };
  [ProjectEvents.USER_ONLINE]: { userId: string; username: string };
  [ProjectEvents.USER_OFFLINE]: { userId: string };

  // Projects
  [ProjectEvents.PROJECT_UPDATED]: ProjectDto;
  [ProjectEvents.PROJECT_DELETED]: { projectId: string };

  // Epics
  [ProjectEvents.EPIC_CREATED]: EpicDto;
  [ProjectEvents.EPIC_UPDATED]: EpicDto;
  [ProjectEvents.EPIC_DELETED]: { epicId: string };

  // Tasks
  [ProjectEvents.TASK_CREATED]: TaskDto;
  [ProjectEvents.TASK_UPDATED]: TaskDto;
  [ProjectEvents.TASK_ASSIGNED]: TaskDto;
  [ProjectEvents.TASK_DELETED]: { taskId: string };

  [ProjectEvents.CONNECTION_READY]: void;
}

// ── Socket.io listener map ─────────────────────────────────────────
// Converts ProjectEventPayloads into the callback form socket.io expects.

type ServerToClientEvents = {
  [E in keyof ProjectEventPayloads]: (payload: ProjectEventPayloads[E]) => void;
};

// ── Typed client socket ────────────────────────────────────────────
// Use this instead of bare Socket in your tests.

export type TypedClientSocket = Socket<ServerToClientEvents>;
