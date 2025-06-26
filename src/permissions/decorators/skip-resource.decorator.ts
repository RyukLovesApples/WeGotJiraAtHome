import { SetMetadata } from '@nestjs/common';

export const SKIP_RESOURCE_GUARD = 'skipResourceGuard';

export const SkipResourceGuard = () => SetMetadata(SKIP_RESOURCE_GUARD, true);
