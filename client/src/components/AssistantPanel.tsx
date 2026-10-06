import { nextActionForRequest } from '../shared/requestRules';
import { RequestDetail } from '../types/index';

type AssistantAction = 'qualify' | 'convert' | 'edit';

interface Props {
  request: RequestDetail;
  onAction: (action: AssistantAction) => void;
}

export default function AssistantPanel({ request, onAction }: Props) {
  const recommendation = nextActionForRequest(
    request.status,
    Boolean(request.scheduled_date),
    Boolean(request.work_item)
  );

  return (
    <aside className="bg-blue-50 border border-blue-100 rounded-xl p-4" aria-label="Assistant suggestion">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
          AI
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Suggested next action</p>
          <h3 className="mt-1 text-sm font-semibold text-gray-900">{recommendation.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{recommendation.reason}</p>
          {recommendation.action && (
            <button
              type="button"
              onClick={() => onAction(recommendation.action!)}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {recommendation.title}
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 border-t border-blue-100 pt-3 text-xs text-blue-700">
        This suggestion never changes data without your confirmation.
      </p>
    </aside>
  );
}