import { ActivityEntry } from '../types/index';

const ACTION_ICONS: Record<string, string> = {
  CREATED: '✨',
  STATUS_CHANGED: '🔄',
  UPDATED: '✏️',
  CONVERTED: '⚡',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityTimeline({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) {
    return <p className="text-gray-500 text-sm">No activity recorded.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-6">
      {activities.map((entry) => (
        <li key={entry.id} className="ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-300 text-sm">
            {ACTION_ICONS[entry.action] ?? '📌'}
          </span>
          <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {entry.action.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400">{formatDate(entry.performed_at)}</span>
            </div>
            {entry.details && (
              <p className="text-sm text-gray-600">{entry.details}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">by {entry.performed_by_name}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
