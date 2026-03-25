import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Clock, CheckCircle, XCircle, Coffee } from 'lucide-react';

const API = 'http://localhost:8000/api';

export function Attendance() {
  const [employees, setEmployees]             = useState<any[]>([]);
  const [history, setHistory]                 = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

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

  // Latest scan per employee for today
  const latestScanByEmpId: Record<string, any> = {};
  for (const entry of history) {
    if (entry.date === today) {
      latestScanByEmpId[entry.id] = entry;
    }
  }

  const rows = employees
    .filter(emp => selectedDepartment === 'all' || emp.department === selectedDepartment)
    .map(emp => {
      const scan = latestScanByEmpId[emp.id];
      return {
        employeeId:     emp.id,
        name:           emp.name,
        department:     emp.department,
        date:           scan?.date    || today,
        timeIn:         scan?.timeIn  || null,
        timeOut:        scan?.timeOut || null,
        totalWorkHours: scan?.totalWorkHours || null,
        status:         scan?.status  || 'Absent',
      };
    });

  // ================= STATS =================
  const onDutyCount  = rows.filter(r => r.status === 'On Duty').length;
  const offDutyCount = rows.filter(r => r.status === 'Off Duty').length;
  const absentCount  = rows.filter(r => r.status === 'Absent').length;
  const totalCount   = rows.length;

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
    <div className="p-8">
      <h1 className="text-3xl mb-8">Attendance Monitoring</h1>

      {/* ================= STATS CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6 border-l-4 border-[#0099DD]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Employees</p>
              <p className="text-3xl">{totalCount}</p>
            </div>
            <Clock className="w-12 h-12 text-[#0099DD]" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">On Duty</p>
              <p className="text-3xl">{onDutyCount}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Off Duty</p>
              <p className="text-3xl">{offDutyCount}</p>
            </div>
            <Coffee className="w-12 h-12 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Absent</p>
              <p className="text-3xl">{absentCount}</p>
            </div>
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
        </Card>
      </div>

      {/* ================= FILTER ================= */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-[#F0F1FA] to-[#E5F5FC]">
        <div className="max-w-xs">
          <Label htmlFor="department">Filter by Department</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger id="department" className="mt-2">
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
      <Card className="p-6">
        <h2 className="text-xl mb-4">
          Attendance Records
          <span className="text-sm text-gray-400 ml-3">{today}</span>
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Total Work Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                    No employees registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell className="font-medium">{row.employeeId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
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