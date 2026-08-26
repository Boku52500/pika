export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-8 w-48 animate-pulse rounded bg-border" />
      <div className="h-40 animate-pulse rounded-[var(--radius-md)] bg-border/70" />
    </div>
  );
}
