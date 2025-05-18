import { HttpException, HttpStatus } from '@nestjs/common';
import { TaskStatus } from '../task.model';

export class WrongTaskStatusException extends HttpException {
  constructor(currentStatus: TaskStatus, updateStatus: TaskStatus) {
    super(
      `Cannot change task status from ${currentStatus} to ${updateStatus}`,
      HttpStatus.CONFLICT,
    );
  }
}
