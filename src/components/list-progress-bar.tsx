type ListProgressBarProps = {
  completedItems: number;
  totalItems: number;
};

export function ListProgressBar({
  completedItems,
  totalItems,
}: ListProgressBarProps) {
  const percent =
    totalItems > 0
      ? Math.min(100, Math.round((completedItems / totalItems) * 100))
      : 0;

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] dark:bg-neutral-100"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {completedItems} / {totalItems}
      </span>
    </div>
  );
}
