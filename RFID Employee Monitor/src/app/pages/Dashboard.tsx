import { useEffect, useRef, useState } from "react";

import { Card } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Users, UserCheck, Coffee, UserX, Search } from 'lucide-react';

const API = "http://127.0.0.1:8000/api";

export function Dashboard() {

  const [logs, setLogs]               = useState<any[]>([]);
  const [employees, setEmployees]     = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Camera: keep the stream alive by reloading on error ───────────────────
  const cameraRef  = useRef<HTMLImageElement>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadCamera = () => {
    if (!cameraRef.current) return;
    cameraRef.current.src = `${API}/camera?t=${Date.now()}`;
  };

  useEffect(() => {
    reloadCamera();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  const fetchEmployees = async () => {
    try {
      const res  = await fetch(`${API}/employees`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res  = await fetch(`${API}/rfid/history`);
      const data = await res.json();
      // Reverse so most recent scan appears at the top
      setLogs(Array.isArray(data) ? [...data].reverse() : []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchLogs();
    const interval = setInterval(() => {
      fetchEmployees();
      fetchLogs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ================= STATS =================
  // Stats come from the employees list (persisted status) — accurate after fix
  const stats = {
    total:   employees.length,
    onDuty:  employees.filter((e: any) => e.status === 'On Duty').length,
    offDuty: employees.filter((e: any) => e.status === 'Off Duty').length,
    absent:  employees.filter((e: any) => e.status === 'Absent').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Duty':  return <Badge className="bg-green-500 hover:bg-green-600">On Duty</Badge>;
      case 'Off Duty': return <Badge className="bg-blue-500 hover:bg-blue-600">Off Duty</Badge>;
      case 'Day Off':  return <Badge className="bg-amber-500 hover:bg-amber-600">Day Off</Badge>;
      default:         return <Badge className="bg-gray-500 hover:bg-gray-600">Absent</Badge>;
    }
  };

  // ================= SEARCH FILTER =================
  const filteredLogs = logs.filter((log: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.name  && log.name.toLowerCase().includes(q)) ||
      (log.id    && log.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 pb-14 sm:px-8">
      <header className="mb-8 rounded-2xl border border-[#2E3192]/10 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2E3192]">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-[#5A5FB8]">
          Live camera and RFID activity
        </p>
      </header>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-4 mb-8">
        <Card className="relative overflow-hidden rounded-2xl border-[#2E3192]/12 bg-gradient-to-br from-white to-[#f0f4fc] p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#2E3192]/[0.06]" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                Total Employees
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2E3192]">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl bg-[#2E3192]/10 p-2.5">
              <Users className="h-7 w-7 text-[#2E3192]" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-emerald-500/15 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
                On Duty
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">
                {stats.onDuty}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/15 p-2.5">
              <UserCheck className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-[#2563eb]/15 bg-gradient-to-br from-white to-sky-50/50 p-6 shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/10" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700/90">
                Off Duty
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-sky-700">
                {stats.offDuty}
              </p>
            </div>
            <div className="rounded-xl bg-sky-500/15 p-2.5">
              <Coffee className="h-7 w-7 text-sky-600" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-rose-500/15 bg-gradient-to-br from-white to-rose-50/40 p-6 shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-rose-400/10" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-800/80">
                Absent
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-rose-700">
                {stats.absent}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/15 p-2.5">
              <UserX className="h-7 w-7 text-rose-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* ================= LIVE CAMERA ================= */}
      <Card className="mb-8 overflow-hidden rounded-2xl border-[#0099DD]/20 bg-gradient-to-br from-white to-[#E8F4FB] p-0 shadow-sm">
        <div className="border-b border-[#0099DD]/15 bg-white/60 px-6 py-4 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-[#2E3192]">Live Camera</h2>
          <p className="text-xs text-[#5A5FB8]">USB feed from the attendance backend</p>
        </div>
        <div className="flex justify-center p-8">
          <img
            ref={cameraRef}
            width="400"
            alt="Live Camera"
            className="rounded-xl border border-[#2E3192]/10 shadow-lg shadow-[#2E3192]/10"
            onError={() => {
              if (retryTimer.current) clearTimeout(retryTimer.current);
              retryTimer.current = setTimeout(reloadCamera, 1000);
            }}
          />
        </div>
      </Card>

      {/* ================= TABLE ================= */}
      <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2E3192]">Real-Time RFID Logs</h2>
            <p className="text-xs text-[#5A5FB8]">Session scans from the reader</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A5FB8]/70 pointer-events-none" />
            <Input
              className="h-10 border-[#2E3192]/12 bg-white pl-9 shadow-sm"
              placeholder="Search by name or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <Table className="min-w-[1280px] table-fixed border-separate border-spacing-y-2">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">ID</TableHead>
                <TableHead className="w-[120px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Name</TableHead>
                <TableHead className="w-[230px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Department</TableHead>
                <TableHead className="w-[170px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Current Work Area</TableHead>
                <TableHead className="w-[110px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Status</TableHead>
                <TableHead className="w-[120px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Date</TableHead>
                <TableHead className="w-[110px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Time In</TableHead>
                <TableHead className="w-[110px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Time Out</TableHead>
                <TableHead className="w-[150px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Total Work Hours</TableHead>
                <TableHead className="w-[95px] px-3 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">Photo</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                    {searchQuery ? 'No results match your search.' : 'No RFID logs yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any, index: number) => (
                  <TableRow key={index} className="rounded-xl bg-white shadow-sm ring-1 ring-[#2E3192]/8">
                    <TableCell className="px-3 py-3 text-center align-middle font-medium text-[#2E3192]">{log.id ?? "—"}</TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">{log.name ?? "—"}</TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      {Array.isArray(log.departments) && log.departments.length > 0
                        ? log.departments.join(', ')
                        : log.department ?? "—"}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">{log.workArea ?? log.area ?? "—"}</TableCell>

                    {/* Status comes directly from the log entry — always accurate */}
                    <TableCell className="px-3 py-3 text-center align-middle">{getStatusBadge(log.status)}</TableCell>

                    <TableCell className="px-3 py-3 text-center align-middle">{log.date ?? "—"}</TableCell>

                    <TableCell className="px-3 py-3 text-center align-middle">
                      <span className="text-green-700 font-medium">
                        {log.timeIn ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-3 text-center align-middle">
                      {log.timeOut
                        ? <span className="text-blue-700 font-medium">{log.timeOut}</span>
                        : <span className="text-gray-400 italic">Pending</span>
                      }
                    </TableCell>

                    <TableCell className="px-3 py-3 text-center align-middle">
                      {log.totalWorkHours
                        ? <span className="font-medium text-[#2E3192]">{log.totalWorkHours}</span>
                        : <span className="text-gray-400 italic">In Progress</span>
                      }
                    </TableCell>

                    <TableCell className="px-3 py-3 text-center align-middle">
                      {log.image
                        ? <img
                            src={`http://127.0.0.1:8000${log.image}`}
                            width="60"
                            alt="snapshot"
                            className="mx-auto rounded-lg border border-[#2E3192]/15 shadow-sm"
                          />
                        : <span className="text-gray-400 text-sm">No Image</span>
                      }
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
