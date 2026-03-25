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
    <div className="p-8">
      <h1 className="text-3xl mb-8">Dashboard</h1>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

        <Card className="p-6 border-l-4 border-[#2E3192]">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl">{stats.total}</p>
            </div>
            <Users className="w-10 h-10 text-[#2E3192]" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-green-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-600">On Duty</p>
              <p className="text-3xl">{stats.onDuty}</p>
            </div>
            <UserCheck className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-600">Off Duty</p>
              <p className="text-3xl">{stats.offDuty}</p>
            </div>
            <Coffee className="w-10 h-10 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-red-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-3xl">{stats.absent}</p>
            </div>
            <UserX className="w-10 h-10 text-red-500" />
          </div>
        </Card>

      </div>

      {/* ================= LIVE CAMERA ================= */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl mb-4">Live Camera</h2>
        <div className="flex justify-center">
          <img
            ref={cameraRef}
            width="400"
            alt="Live Camera"
            className="rounded-lg shadow border"
            onError={() => {
              if (retryTimer.current) clearTimeout(retryTimer.current);
              retryTimer.current = setTimeout(reloadCamera, 1000);
            }}
          />
        </div>
      </Card>

      {/* ================= TABLE ================= */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl">Real-Time RFID Logs</h2>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search by name or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Total Work Hours</TableHead>
                <TableHead>Photo</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                    {searchQuery ? 'No results match your search.' : 'No RFID logs yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{log.id ?? "—"}</TableCell>
                    <TableCell>{log.name ?? "—"}</TableCell>
                    <TableCell>{log.department ?? "—"}</TableCell>

                    {/* Status comes directly from the log entry — always accurate */}
                    <TableCell>{getStatusBadge(log.status)}</TableCell>

                    <TableCell>{log.date ?? "—"}</TableCell>

                    <TableCell>
                      <span className="text-green-700 font-medium">
                        {log.timeIn ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      {log.timeOut
                        ? <span className="text-blue-700 font-medium">{log.timeOut}</span>
                        : <span className="text-gray-400 italic">Pending</span>
                      }
                    </TableCell>

                    <TableCell>
                      {log.totalWorkHours
                        ? <span className="font-medium text-[#2E3192]">{log.totalWorkHours}</span>
                        : <span className="text-gray-400 italic">In Progress</span>
                      }
                    </TableCell>

                    <TableCell>
                      {log.image
                        ? <img
                            src={`http://127.0.0.1:8000${log.image}`}
                            width="60"
                            alt="snapshot"
                            className="rounded border"
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
