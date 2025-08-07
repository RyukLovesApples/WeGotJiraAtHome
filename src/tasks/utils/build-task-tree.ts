import { Task } from '../task.entity';

export function buildTaskTree(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>(
    tasks.map((task) => [task.id, { ...task, subtasks: [] }]),
  );
  const roots: Task[] = [];

  for (const task of taskMap.values()) {
    if (task.parentId) {
      taskMap.get(task.parentId)?.subtasks!.push(task);
    } else {
      roots.push(task);
    }
  }

  return roots;
}
