import { Expose, Type } from 'class-transformer';
import { Task } from '../task.entity';

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
  // check on later for correct typing
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Type(() => Task)
  data!: T[];

  @decorators.expose()
  meta!: PaginationMeta;
}
