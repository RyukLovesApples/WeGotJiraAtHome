import { TaskDto } from '../dtos/task.dto';

export function buildTaskTree(tasks: TaskDto[]): TaskDto[] {
  const taskMap = new Map<string, TaskDto>();
  tasks.forEach((task) => {
    task.subtasks = []; // assign subtasks array on each DTO
    taskMap.set(task.id, task);
  });

  const roots: TaskDto[] = [];
  for (const task of taskMap.values()) {
    if (task.parentId) {
      taskMap.get(task.parentId)?.subtasks!.push(task);
    } else {
      roots.push(task);
    }
  }

  return roots;
}
