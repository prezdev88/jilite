import type { Label, Task } from '@prisma/client';

export type TaskWithLabels = Task & { labels: Label[] };
