import type { Label, Task, Status } from '@prisma/client';

export type TaskWithLabels = Task & { labels: Label[], status?: Status | null };
