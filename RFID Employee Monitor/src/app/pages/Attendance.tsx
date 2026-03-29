import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Clock, CheckCircle, XCircle, Coffee, Search } from 'lucide-react';
import { Input } from '@/app/components/ui/input';

const API = 'http://localhost:8000/api';

export function Attendance() {
  const [employees, setEmployees]             = useState<any[]>([]);
  const [history, setHistory]                 = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery]           = useState('');

  const fetchEmployees = async () => {
    try {
      const res  = await fetch(`${API}/employees`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res  = await fetch(`${API}/rfid/history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchHistory();
    const interval = setInterval(() => {
      fetchEmployees();
      fetchHistory();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ================= BUILD ATTENDANCE ROWS =================
  // One row per employee. If they have a scan today, show it. Otherwise Absent.
  const today = new Date().toISOString().split('T')[0];

  // Group scans per employee for today
  const scansByEmpId: Record<string, any[]> = {};
  for (const entry of history) {
    if (entry?.date !== today) continue;
    const empId = entry?.id;
    if (!empId) continue;
    (scansByEmpId[empId] ||= []).push(entry);
  }

  const sortByTimeIn = (a: any, b: any) => String(a?.timeIn || '').localeCompare(String(b?.timeIn || ''));

  const parseTotalMinutes = (s: any): number | null => {
    if (s == null) return null;
    const raw = String(s).trim();
    if (!raw) return null;
    const hMatch = raw.match(/(\d+)\s*h/i);
    const mMatch = raw.match(/(\d+)\s*m/i);
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    if (!hMatch && !mMatch) return null;
    return h * 60 + m;
  };

  const formatMinutes = (mins: number) => {
    const total = Math.max(0, Math.floor(mins));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h ${m}m`;
  };

  const rowsAll = employees
    .filter(emp => selectedDepartment === 'all' || emp.department === selectedDepartment)
    .map(emp => {
      const scans = (scansByEmpId[emp.id] || []).slice().sort(sortByTimeIn);
      const earliest = scans[0];
      const latest = scans[scans.length - 1];

      let totalMinutes = 0;
      let hasAnyTotal = false;
      for (const s of scans) {
        const mins = parseTotalMinutes(s?.totalWorkHours);
        if (mins != null) {
          totalMinutes += mins;
          hasAnyTotal = true;
        }
      }

      const status =
        !latest ? 'Absent' : (latest?.timeOut == null ? 'On Duty' : 'Off Duty');

      return {
        employeeId:     emp.id,
        name:           emp.name,
        department:     emp.department,
        workArea:       latest?.workArea || latest?.area || null,
        date:           latest?.date    || today,
        timeIn:         earliest?.timeIn  || null,
        timeOut:        latest?.timeOut || null,
        totalWorkHours: hasAnyTotal ? formatMinutes(totalMinutes) : null,
        status,
      };
    });

  const q = searchQuery.trim().toLowerCase();
  const rows = q
    ? rowsAll.filter(
        (r) =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.employeeId && String(r.employeeId).toLowerCase().includes(q))
      )
    : rowsAll;

  // ================= STATS =================
  const onDutyCount  = rowsAll.filter(r => r.status === 'On Duty').length;
  const offDutyCount = rowsAll.filter(r => r.status === 'Off Duty').length;
  const absentCount  = rowsAll.filter(r => r.status === 'Absent').length;
  const totalCount   = rowsAll.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Duty':
        return <Badge className="bg-green-500 hover:bg-green-600">On Duty</Badge>;
      case 'Off Duty':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Off Duty</Badge>;
      case 'Absent':
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600">Absent</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 pb-14 sm:px-8">
      <header className="mb-8 rounded-2xl border border-[#2E3192]/10 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2E3192]">
          Attendance Monitoring
        </h1>
        <p className="mt-1.5 text-sm text-[#5A5FB8]">
          Today’s clock-ins and status by department
        </p>
      </header>

      {/* ================= STATS CARDS ================= */}
      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        <Card className="relative overflow-hidden rounded-2xl border-[#0099DD]/20 bg-gradient-to-br from-white to-[#E8F4FB] p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#0099DD]/10" aria-hidden />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0099DD]">
                Total (filtered)
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2E3192]">
                {totalCount}
              </p>
            </div>
            <div className="rounded-xl bg-[#0099DD]/15 p-2.5">
              <Clock className="h-7 w-7 text-[#0099DD]" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-emerald-500/15 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm">
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
                On duty
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">
                {onDutyCount}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/15 p-2.5">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-sky-500/15 bg-gradient-to-br from-white to-sky-50/50 p-6 shadow-sm">
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700/90">
                Off duty
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-sky-700">
                {offDutyCount}
              </p>
            </div>
            <div className="rounded-xl bg-sky-500/15 p-2.5">
              <Coffee className="h-7 w-7 text-sky-600" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-rose-500/15 bg-gradient-to-br from-white to-rose-50/40 p-6 shadow-sm">
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-800/80">
                Absent
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-rose-700">
                {absentCount}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/15 p-2.5">
              <XCircle className="h-7 w-7 text-rose-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* ================= FILTER ================= */}
      <Card className="mb-6 overflow-hidden rounded-2xl border-[#0099DD]/20 bg-gradient-to-r from-[#F0F5FB] via-white to-[#E5F5FC] p-6 shadow-sm">
        <div className="max-w-xs">
          <Label htmlFor="department" className="text-[#2E3192]">
            Filter by department
          </Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger
              id="department"
              className="mt-2 border-[#2E3192]/15 bg-white shadow-sm"
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Cutting">Cutting</SelectItem>
              <SelectItem value="Assembly">Assembly</SelectItem>
              <SelectItem value="Warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ================= TABLE ================= */}
      <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2E3192]">Attendance records</h2>
            <p className="text-xs text-[#5A5FB8]">
              Date: <span className="font-medium text-[#2E3192]">{today}</span>
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A5FB8]/70" />
            <Input
              className="h-10 border-[#2E3192]/12 bg-white pl-9 shadow-sm"
              placeholder="Search by name or employee ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto px-4 pb-5 pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Work Area</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Total Work Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsAll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                    No employees registered yet.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                    No results match your search.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell className="font-medium">{row.employeeId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>{row.workArea || '—'}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      {row.timeIn ? (
                        <span className="text-green-700 font-medium">{row.timeIn}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.timeOut ? (
                        <span className="text-blue-700 font-medium">{row.timeOut}</span>
                      ) : (
                        <span className="text-gray-400 italic">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.totalWorkHours ? (
                        <span className="font-semibold text-[#2E3192]">{row.totalWorkHours}</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
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