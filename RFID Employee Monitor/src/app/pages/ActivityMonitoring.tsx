import { useEffect, useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { MapPin, Users, Loader2 } from 'lucide-react';

const API = 'http://127.0.0.1:8000/api';
const CAPACITY_MAX = 10;

type AreaActivity = {
  area: string;
  count: number;
  employees: string[];
};

export function ActivityMonitoring() {
  const [areas, setAreas] = useState<AreaActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = async () => {
    try {
      const res = await fetch(`${API}/activity/areas`);
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();
      setAreas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Activity fetch error:', err);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    const interval = setInterval(fetchAreas, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 pb-14 sm:px-8">
      <header className="mb-8 rounded-2xl border border-[#2E3192]/10 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2E3192]">
          Activity & Presence Monitoring
        </h1>
        <p className="mt-1.5 text-sm text-[#5A5FB8]">
          On-duty headcount by last scan area
        </p>
      </header>

      <Card className="mb-6 overflow-hidden rounded-2xl border-[#0099DD]/25 bg-gradient-to-r from-[#E8F4FB] via-white to-[#F0F5FB] shadow-sm">
        <div className="flex flex-wrap items-start gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0099DD] text-white shadow-md shadow-[#0099DD]/30">
            <MapPin className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[#2E3192]">
              Real-time area monitoring
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#5A5FB8]">
              On-duty employees today, grouped by last RFID scan area from your database.
            </p>
          </div>
        </div>
      </Card>

      {loading && areas.length === 0 ? (
        <div className="flex items-center gap-2 py-16 text-[#5A5FB8]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading activity…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Card
              key={area.area}
              className="group overflow-hidden rounded-2xl border-[#2E3192]/10 bg-gradient-to-br from-white to-[#f4f8fc] shadow-sm transition-all hover:border-[#0099DD]/25 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#2E3192]/8 bg-white/50 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[#2E3192]">{area.area}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#5A5FB8]">
                    <Users className="h-4 w-4 shrink-0 text-[#0099DD]" />
                    <span>
                      {area.count} {area.count === 1 ? 'worker' : 'workers'}
                    </span>
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0099DD]/15 text-lg font-semibold text-[#0099DD] ring-2 ring-[#0099DD]/20 transition-transform group-hover:scale-105">
                  {area.count}
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                  Active employees
                </p>
                {area.employees.length === 0 ? (
                  <p className="text-sm italic text-[#5A5FB8]/80">
                    No one on duty in this area.
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {area.employees.map((employee) => (
                      <li
                        key={employee}
                        className="flex items-center gap-2 rounded-lg border border-[#2E3192]/6 bg-white/80 px-3 py-2 text-sm text-[#334155] shadow-sm"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                        <span>{employee}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
          <div className="border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2E3192]">Area capacity overview</h2>
            <p className="text-xs text-[#5A5FB8]">Versus nominal capacity of {CAPACITY_MAX} per area</p>
          </div>
          <div className="space-y-5 p-6">
            {areas.map((area) => (
              <div key={area.area}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#2E3192]">{area.area}</span>
                  <span className="tabular-nums text-[#5A5FB8]">
                    {area.count} / {CAPACITY_MAX}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2E3192]/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0099DD] to-[#2E3192] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (area.count / CAPACITY_MAX) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
