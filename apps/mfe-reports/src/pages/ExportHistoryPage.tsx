import '../styles.css';
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@familieoya/ui';
import { getExportHistory, AuthContext } from '@familieoya/api-client';

export default function ExportHistoryPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['reports', 'export-history', householdId],
    queryFn: () => getExportHistory(householdId!),
    enabled: !!householdId,
  });

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Export History</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500">No household selected.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Export History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Previous exports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Report type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Format
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && history.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileDown className="h-8 w-8 text-slate-300" />
                        <span>No exports yet.</span>
                      </div>
                    </td>
                  </tr>
                )}
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700 capitalize">
                      {item.reportType}
                    </td>
                    <td className="px-4 py-3 text-slate-700 uppercase">
                      {item.format}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(item.createdAt).toLocaleString('nb-NO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
