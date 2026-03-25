import { useEffect, useState } from "react";

import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { FileText, Download, Loader2, RefreshCw } from 'lucide-react';

const API    = 'http://localhost:8000/api';
const COLORS = ['#2E3192', '#0099DD', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ================= ANIMATED PIE ACTIVE SHAPE =================
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;
  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill={fill} className="text-base font-semibold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#555" className="text-sm">
        {value} {value === 1 ? 'employee' : 'employees'}
      </text>
      <text x={cx} y={cy + 34} textAnchor="middle" fill="#999" className="text-xs">
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 10}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 14} outerRadius={outerRadius + 18}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

// ================= CUSTOM BAR LABEL =================
const CustomBarLabel = ({ x, y, width, value }: any) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 4} fill="#555" textAnchor="middle" fontSize={11}>
      {value}
    </text>
  );
};

export function Reports() {
  const [report, setReport]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // ================= FETCH REPORT =================
  const fetchReport = async (dateStr?: string) => {
    setLoading(true);
    try {
      const param = dateStr ? `?report_date=${dateStr}` : '';
      const res   = await fetch(`${API}/reports/daily${param}`);
      const data  = await res.json();
      setReport(data);
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 10000);
    return () => clearInterval(interval);
  }, []);

  // ================= CHART DATA =================
  const attendanceData: any[] = report?.attendance?.length
    ? report.attendance
    : [
        { day: 'Mon', present: 0, absent: 0 },
        { day: 'Tue', present: 0, absent: 0 },
        { day: 'Wed', present: 0, absent: 0 },
        { day: 'Thu', present: 0, absent: 0 },
        { day: 'Fri', present: 0, absent: 0 },
      ];

  const deptData: any[] = report?.areas?.length
    ? report.areas
    : [{ name: 'No Data', hours: 1 }];

  // ================= STATUS BADGE =================
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Duty':  return <Badge className="bg-green-500">On Duty</Badge>;
      case 'Off Duty': return <Badge className="bg-blue-500">Off Duty</Badge>;
      default:         return <Badge className="bg-gray-500">Absent</Badge>;
    }
  };

  // ================= PDF EXPORT =================
  const handlePdfExport = () => {
    const printContent = `
      <html>
        <head>
          <title>Daily Report — ${report?.date || 'N/A'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
            h1   { color: #2E3192; margin-bottom: 4px; }
            h2   { color: #0099DD; margin-top: 28px; margin-bottom: 8px; font-size: 16px; }
            .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
            .stats { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
            .stat-card { border: 1px solid #ddd; border-radius: 8px; padding: 16px 24px; min-width: 120px; text-align: center; }
            .stat-card .value { font-size: 32px; font-weight: bold; color: #2E3192; }
            .stat-card .label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #2E3192; color: white; padding: 8px 12px; text-align: left; }
            td { padding: 7px 12px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) td { background: #f8f8f8; }
            .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <h1>RFID Employee Monitor</h1>
          <p class="meta">Daily Report &nbsp;|&nbsp; ${report?.date || new Date().toISOString().split('T')[0]} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
          <div class="stats">
            <div class="stat-card"><div class="value">${report?.total ?? 0}</div><div class="label">Total Employees</div></div>
            <div class="stat-card" style="border-color:#10b981"><div class="value" style="color:#10b981">${report?.present ?? 0}</div><div class="label">Present</div></div>
            <div class="stat-card" style="border-color:#ef4444"><div class="value" style="color:#ef4444">${report?.absent ?? 0}</div><div class="label">Absent</div></div>
          </div>
          <h2>Attendance Details</h2>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th><th>Name</th><th>Department</th>
                <th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(report?.details || []).map((d: any) => `
                <tr>
                  <td>${d.employee_id}</td><td>${d.name}</td><td>${d.department}</td>
                  <td>${d.time_in || '—'}</td><td>${d.time_out || '—'}</td>
                  <td>${d.total_hours || '—'}</td><td>${d.status}</td>
                </tr>
              `).join('')}
              ${(!report?.details?.length) ? '<tr><td colspan="7" style="text-align:center;color:#999">No records.</td></tr>' : ''}
            </tbody>
          </table>
          <div class="footer">RFID Employee Monitor — Confidential</div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  // ================= EXCEL EXPORT =================
  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const rows = [
        ['RFID Employee Monitor — Daily Report'],
        [`Date: ${report?.date || new Date().toISOString().split('T')[0]}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Summary'],
        ['Total Employees', 'Present', 'Absent'],
        [report?.total ?? 0, report?.present ?? 0, report?.absent ?? 0],
        [],
        ['Attendance Details'],
        ['Employee ID', 'Name', 'Department', 'Time In', 'Time Out', 'Total Hours', 'Status'],
        ...(report?.details || []).map((d: any) => [
          d.employee_id, d.name, d.department,
          d.time_in || '', d.time_out || '', d.total_hours ?? '', d.status,
        ]),
        [],
        ['Department Activity'],
        ['Department', 'Employees'],
        ...(report?.areas || []).map((r: any) => [r.name, r.hours]),
      ];

      const csvContent = rows
        .map(row =>
          row.map((cell: any) =>
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"` : cell
          ).join(',')
        ).join('\r\n');

      const BOM  = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `report_${report?.date || 'today'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ================= RENDER =================
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl">Reports</h1>
        {report?.date && (
          <span className="text-sm text-gray-500 bg-gray-100 rounded px-3 py-1">
            {report.date}
          </span>
        )}
      </div>

      {/* ---- ACTION BUTTONS ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button
          className="h-auto py-4 flex-col gap-2 bg-[#2E3192] hover:bg-[#252A7A]"
          onClick={() => fetchReport()}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
          <span>Refresh Report</span>
        </Button>

        <Button
          className="h-auto py-4 flex-col gap-2 bg-[#0099DD] hover:bg-[#0088CC]"
          onClick={handlePdfExport}
          disabled={!report}
        >
          <FileText className="w-6 h-6" />
          <span>Export to PDF</span>
        </Button>

        <Button
          className="h-auto py-4 flex-col gap-2 bg-[#5A5FB8] hover:bg-[#4A4FA0]"
          onClick={handleExcelExport}
          disabled={!report || exporting}
        >
          {exporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
          <span>Export to Excel / CSV</span>
        </Button>
      </div>

      {/* ---- DAILY SUMMARY ---- */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl mb-4">Daily Summary</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-[#F0F1FA] rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Total Employees</p>
              <p className="text-4xl font-semibold text-[#2E3192]">{report?.total ?? 0}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Present Today</p>
              <p className="text-4xl font-semibold text-green-600">{report?.present ?? 0}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Absent Today</p>
              <p className="text-4xl font-semibold text-red-500">{report?.absent ?? 0}</p>
            </div>
          </div>
        )}
      </Card>

      {/* ---- CHARTS ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Bar Chart — Weekly Attendance */}
        <Card className="p-6">
          <h2 className="text-xl mb-4">Weekly Attendance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 13 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                cursor={{ fill: 'rgba(46,49,146,0.04)' }}
              />
              <Legend />
              <Bar dataKey="present" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={900}>
                <CustomBarLabel />
              </Bar>
              <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={900} animationBegin={200} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart — Department Activity Today */}
        <Card className="p-6">
          <h2 className="text-xl mb-4">Department Activity Today</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={deptData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                dataKey="hours"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={1000}
              >
                {deptData.map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [`${value} employee${value !== 1 ? 's' : ''}`, name]}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {deptData.map((dept: any, i: number) => (
              <button
                key={dept.name}
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded transition-all ${activeIndex === i ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
              >
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {dept.name}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* ---- ATTENDANCE DETAILS TABLE ---- */}
      <Card className="p-6">
        <h2 className="text-xl mb-4">Today's Attendance Log</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : !report?.details?.length ? (
          <p className="text-gray-400 text-sm py-4">No attendance records yet for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-gray-600">Employee ID</th>
                  <th className="text-left py-2 px-3 text-gray-600">Name</th>
                  <th className="text-left py-2 px-3 text-gray-600">Department</th>
                  <th className="text-left py-2 px-3 text-gray-600">Time In</th>
                  <th className="text-left py-2 px-3 text-gray-600">Time Out</th>
                  <th className="text-left py-2 px-3 text-gray-600">Total Hours</th>
                  <th className="text-left py-2 px-3 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.details.map((d: any) => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{d.employee_id}</td>
                    <td className="py-2 px-3">{d.name}</td>
                    <td className="py-2 px-3">{d.department}</td>
                    <td className="py-2 px-3 text-green-700">{d.time_in  || '—'}</td>
                    <td className="py-2 px-3 text-blue-700">{d.time_out || '—'}</td>
                    <td className="py-2 px-3 font-semibold text-[#2E3192]">{d.total_hours || '—'}</td>
                    <td className="py-2 px-3">{getStatusBadge(d.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}