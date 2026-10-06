import { RequestStatus } from '../types/index';

const STATUS_STYLES: Record<RequestStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
