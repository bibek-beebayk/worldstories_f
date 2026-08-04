import { BookCheck, BookOpen, CalendarDays, Loader2, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfileInsightsResponse } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#6366f1"];

interface ProfileInsightsProps {
  data?: ProfileInsightsResponse;
  isLoading: boolean;
  isError: boolean;
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
};

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

function ChartEmptyState({ children }: { children: string }) {
  return <div className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-muted-foreground">{children}</div>;
}

export default function ProfileInsights({ data, isLoading, isError }: ProfileInsightsProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building your reading insights…
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">Your reading insights could not be loaded.</CardContent>
      </Card>
    );
  }

  const hasActivity = data.summary.titles_started > 0;
  const formats = data.formats.filter((item) => item.value > 0);

  const summaryItems = [
    { label: "Titles explored", value: data.summary.titles_started, icon: BookOpen, color: "text-violet-600" },
    { label: "Titles completed", value: data.summary.titles_completed, icon: BookCheck, color: "text-emerald-600" },
    { label: "Active days (30d)", value: data.summary.active_days_30, icon: CalendarDays, color: "text-sky-600" },
    { label: "Top genre", value: data.summary.favorite_genre || "—", icon: Sparkles, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
              <div className="rounded-lg bg-muted p-2"><Icon className={`h-4 w-4 ${item.color}`} /></div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reading Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Content updated while reading or listening during the last 14 days.</p>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            {!hasActivity ? (
              <ChartEmptyState>Your recent reading and listening activity will appear here.</ChartEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.activity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(value) => formatDate(String(value))} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="reading" name="Reading" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="listening" name="Listening" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Format Preference</CardTitle>
            <p className="text-xs text-muted-foreground">Titles explored in each reading or listening format.</p>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {formats.length === 0 ? (
              <ChartEmptyState>Your preferred formats will appear after you start a title.</ChartEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={formats} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={52} outerRadius={82} paddingAngle={3}>
                    {formats.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most-Read Genres</CardTitle>
            <p className="text-xs text-muted-foreground">Genres represented across the titles you have explored.</p>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-4">
            {data.genres.length === 0 ? (
              <ChartEmptyState>Your genre pattern will appear after you begin reading.</ChartEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.genres} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Titles" fill={COLORS[2]} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
