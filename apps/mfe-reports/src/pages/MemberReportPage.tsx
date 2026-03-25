import '../styles.css';
import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@familieoya/ui';
import { getMemberReport, AuthContext } from '@familieoya/api-client';

function formatCurrency(amountOre: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
  }).format(amountOre / 100);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function MemberReportPage() {
  const auth = useContext(AuthContext);
  const householdId = auth?.activeHouseholdId;
  const [month, setMonth] = useState(currentMonth());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'member', month, householdId],
    queryFn: () => getMemberReport(householdId!, month),
    enabled: !!householdId,
  });

  if (!householdId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Member Report</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500">No household selected.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleExpand = (userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Member Report</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members — {month}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Member
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Income
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Expense
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && (report?.members ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No member data for this month.
                    </td>
                  </tr>
                )}
                {(report?.members ?? []).map((member) => (
                  <>
                    <tr
                      key={member.userId}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleExpand(member.userId)}
                    >
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {member.userId}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {formatCurrency(member.totalIncome)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {formatCurrency(member.totalExpense)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {expanded.has(member.userId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                    </tr>
                    {expanded.has(member.userId) &&
                      member.categoryBreakdown.map((cat, i) => (
                        <tr
                          key={`${member.userId}-cat-${i}`}
                          className="bg-slate-50 border-b border-slate-100"
                        >
                          <td className="px-8 py-2 text-slate-500 text-xs">
                            {cat.categoryId}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-slate-600">
                            {cat.type === 'income'
                              ? formatCurrency(cat.total)
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-slate-600">
                            {cat.type === 'expense'
                              ? formatCurrency(cat.total)
                              : '—'}
                          </td>
                          <td />
                        </tr>
                      ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
