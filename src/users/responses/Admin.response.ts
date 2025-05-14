import { Expose } from 'class-transformer';

const decorators = {
  expose: Expose as () => PropertyDecorator,
};

export class AdminResponse {
  constructor(private readonly partial?: Partial<AdminResponse>) {
    Object.assign(this, partial);
  }

  @decorators.expose()
  message?: string;
}
