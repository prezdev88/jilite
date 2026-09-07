type ColumnStatusProps = { column: { name: string; order: number } | null | undefined };

const colors = ['#91b4f5', '#dfb66d', '#b69aeb', '#de93b1', '#dca082', '#a4a9bd'];

export function ColumnStatus({ column }: ColumnStatusProps) {
  const color = column ? colors[Math.abs(column.order) % colors.length] : '#a4a9bd';
  return (
    <span className="column-status" style={{ color }}>
      <span className="column-status-dot" aria-hidden="true" />
      {column?.name || 'Sin lista'}
    </span>
  );
}
