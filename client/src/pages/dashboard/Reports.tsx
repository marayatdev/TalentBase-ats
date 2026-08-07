import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useDashboard } from "@/hooks/useDashboard";

export default function ReportsPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Recruitment funnel and hiring trends over time." />

      {isLoading && <Skeleton className="h-96 rounded-xl" />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Applications by month</CardTitle></CardHeader>
            <CardContent className="h-72 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.applications_by_month} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(32,38,31,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1F4A3A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Applications by recruitment stage</CardTitle></CardHeader>
            <CardContent className="h-72 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.applications_by_stage} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(32,38,31,0.08)" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#E2793D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>AI match score distribution</CardTitle></CardHeader>
            <CardContent className="h-72 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ai_score_distribution} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(32,38,31,0.08)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2C6650" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
