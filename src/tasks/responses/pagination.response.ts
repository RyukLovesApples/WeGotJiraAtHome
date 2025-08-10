import { Expose, Type } from 'class-transformer';
import { TaskDto } from '../dtos/task.dto';

const decorators = {
  expose: Expose as () => PropertyDecorator,
};

export class PaginationMeta {
  @decorators.expose()
  total!: number;

  @decorators.expose()
  limit!: number;

  @decorators.expose()
  offset!: number;
}

export class PaginationResponse<T> {
  @decorators.expose()
  @Type(() => TaskDto)
  data!: T[];

  @decorators.expose()
  meta!: PaginationMeta;
}
