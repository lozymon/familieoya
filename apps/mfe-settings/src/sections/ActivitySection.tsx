import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PlusCircle,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  AlertTriangle,
  FileDown,
  Download,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@familieoya/ui';
import { getActivityLog, AuthContext } from '@familieoya/api-client';
import type { ActivityLogEntry } from '@familieoya/api-client';

const ACTION_MAP: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  'transaction.created': { label: 'added a transaction', Icon: PlusCircle },
  'transaction.updated': { label: 'updated a transaction', Icon: Edit2 },
  'transaction.deleted': { label: 'deleted a transaction', Icon: Trash2 },
  'household.member.joined': { label: 'joined the household', Icon: UserPlus },
  'household.member.removed': {
    label: 'was removed from the household',
    Icon: UserMinus,
  },
  'budget.threshold.exceeded': {
    label: 'Budget exceeded',
    Icon: AlertTriangle,
  },
  'report.exported': { label: 'exported a report', Icon: FileDown },
  'user.data.exported': { label: 'downloaded their data', Icon: Download },
};

function ActionEntry({ entry }: { entry: ActivityLogEntry }) {
  const mapping = ACTION_MAP[entry.action];
  const Icon = mapping?.Icon ?? Activity;
  const label = mapping?.label ?? entry.action;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-medium">{entry.actorName}</span> {label}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {new Date(entry.createdAt).toLocaleString('nb-NO')}
        </p>
      </div>
    </div>
  );
}

export default function ActivitySection() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;

  const { data: log = [], isLoading } = useQuery({
    queryKey: ['audit', 'activity', householdId],
    queryFn: getActivityLog,
    enabled: !!householdId,
  });

  if (!householdId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-slate-500">No household selected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <p className="px-4 py-8 text-center text-slate-500">Loading…</p>
        )}
        {!isLoading && log.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">
            No activity yet.
          </p>
        )}
        {log.length > 0 && (
          <div className="divide-y divide-slate-100 px-4">
            {log.map((entry) => (
              <ActionEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
