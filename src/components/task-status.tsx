type TaskStatusProps = { status: { name: string; order: number } | null | undefined };

const colors = ['#91b4f5', '#dfb66d', '#b69aeb', '#de93b1', '#dca082', '#a4a9bd'];

export function TaskStatus({ status }: TaskStatusProps) {
  const color = status ? colors[Math.abs(status.order) % colors.length] : '#a4a9bd';
  return (
    <span className="status-badge" style={{ color }}>
      <span className="status-badge-dot" aria-hidden="true" />
      {status?.name || 'Sin lista'}
    </span>
  );
}
