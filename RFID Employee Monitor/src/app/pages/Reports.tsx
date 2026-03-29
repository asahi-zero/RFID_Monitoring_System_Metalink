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

  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [filterId, setFilterId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const reportTypeLabel = reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly';

  // ================= FETCH REPORT =================
  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '';
      if (reportType === 'daily') {
        url = `${API}/reports/daily?report_date=${encodeURIComponent(reportDate)}`;
      } else if (reportType === 'weekly') {
        url = `${API}/reports/weekly?report_date=${encodeURIComponent(reportDate)}`;
      } else {
        const [y, m] = reportDate.split('-');
        url = `${API}/reports/monthly?year=${encodeURIComponent(y)}&month=${encodeURIComponent(
          parseInt(m || '1', 10).toString()
        )}`;
      }

      const res = await fetch(url);
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
    const interval = setInterval(() => fetchReport(), 10000);
    return () => clearInterval(interval);
  }, [reportType, reportDate]);

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

  const reportDetails = Array.isArray(report?.details) ? report.details : [];

  const departmentOptions = Array.from(new Set(reportDetails.map((d: any) => (d.department || '').trim()).filter((x: string) => x))).sort();

  const filteredDetails = reportDetails.filter((d: any) => {
    const matchesId = !filterId || String(d.employee_id ?? d.id ?? '').toLowerCase().includes(filterId.toLowerCase());
    const matchesName = !filterName || String(d.name ?? '').toLowerCase().includes(filterName.toLowerCase());
    const matchesDepartment = !filterDepartment || String(d.department ?? '').toLowerCase() === filterDepartment.toLowerCase();

    let matchesDate = true;
    if (filterDate) {
      const rowDateString = d.date || report?.date || '';
      const rowDate = new Date(rowDateString.slice(0, 10));
      const filterD = new Date(filterDate);
      matchesDate = rowDate.toISOString().slice(0, 10) === filterD.toISOString().slice(0, 10);
    }

    return matchesId && matchesName && matchesDepartment && matchesDate;
  });

  const filteredSummary = {
    total: filteredDetails.length,
    present: filteredDetails.filter((d: any) => d.status === 'On Duty').length,
    absent: filteredDetails.filter((d: any) => d.status === 'Absent').length,
  };

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
          <title>${reportTypeLabel} Report — ${report?.date || 'N/A'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
            h1   { color: #2E3192; margin-bottom: 8px; font-size: 30px; }
            h2   { color: #0099DD; margin-top: 18px; margin-bottom: 10px; font-size: 22px; }
            .report-meta { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 18px; }
            .report-meta span { font-size: 16px; font-weight: 700; color: #2E3192; }
            .meta { color: #555; font-size: 14px; margin-bottom: 26px; }
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
          <div class="report-meta">
            <span>Report:</span><span>${reportTypeLabel}</span>
            <span>Date:</span><span>${report?.date || new Date().toISOString().split('T')[0]}</span>
            <span>Generated:</span><span>${new Date().toLocaleString()}</span>
          </div>
          <p class="meta">Attendance snapshot with filters applied</p>
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
              ${(filteredDetails || []).map((d: any) => `
                <tr>
                  <td>${d.employee_id}</td><td>${d.name}</td><td>${d.department}</td>
                  <td>${d.time_in || '—'}</td><td>${d.time_out || '—'}</td>
                  <td>${d.total_hours || '—'}</td><td>${d.status}</td>
                </tr>
              `).join('')}
              ${(!report?.details?.length) ? '<tr><td colspan="7" style="text-align:center;color:#999">No records.</td></tr>' : ''}
            </tbody>
          </table>
          <div style="margin-top: 36px;">
            <div style="margin-top: 24px; width: 320px;">
              <div style="border-bottom: 1px solid #2E3192; height: 2px; margin-bottom: 12px;"></div>
              <div style="font-size: 13px; color: #333; margin-bottom: 4px;">Signature</div>
              <div style="font-size: 13px; font-weight: 700; color: #2E3192;">Approved by Supervisor</div>
            </div>
          </div>
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
        [`RFID Employee Monitor — ${reportTypeLabel} Report`],
        [`Date: ${report?.date || new Date().toISOString().split('T')[0]}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [`Approved by Supervisor: _____________________________`],
        [],
        ['Summary'],
        ['Total Employees', 'Present', 'Absent'],
        [filteredSummary.total, filteredSummary.present, filteredSummary.absent],
        [],
        ['Attendance Details'],
        ['Employee ID', 'Name', 'Department', 'Time In', 'Time Out', 'Total Hours', 'Status'],
        ...(filteredDetails || []).map((d: any) => [
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
    <div className="mx-auto max-w-[1600px] px-6 py-8 pb-14 sm:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#2E3192]/10 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#2E3192]">Reports</h1>
          <p className="mt-1.5 text-sm text-[#5A5FB8]">Attendance summaries and exports</p>
        </div>
        {report?.date && (
          <span className="inline-flex w-fit items-center rounded-xl border border-[#0099DD]/30 bg-[#E5F5FC] px-4 py-2 text-sm font-semibold text-[#2E3192] shadow-sm">
            {report.date}
          </span>
        )}
      </div>

      {/* ---- REPORT CONTROLS ---- */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#2E3192]">Report type</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="h-10 rounded-xl border border-[#2E3192]/20 bg-white px-3 text-sm font-semibold text-[#2E3192] shadow-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#2E3192]">Date</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="h-10 rounded-xl border border-[#2E3192]/20 bg-white px-3 text-sm font-semibold text-[#2E3192] shadow-sm"
          />
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-[#2E3192]/10 bg-[#f7fbff] p-4">
        <h3 className="mb-2 text-sm font-semibold text-[#2E3192]">Filter records</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5A5FB8]">ID</label>
            <input
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              placeholder="Employee ID"
              className="h-10 w-full rounded-xl border border-[#2E3192]/20 bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5A5FB8]">Name</label>
            <input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Name"
              className="h-10 w-full rounded-xl border border-[#2E3192]/20 bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5A5FB8]">Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#2E3192]/20 bg-white px-3 text-sm"
            >
              <option value="">All</option>
              {departmentOptions.map((dep) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5A5FB8]">Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#2E3192]/20 bg-white px-3 text-sm"
            />
          </div>
        </div>
        <div className="mt-2 text-right">
          <button
            className="rounded-xl bg-[#2E3192] px-4 py-2 text-xs font-semibold text-white hover:bg-[#252a6e]"
            onClick={() => {
              setFilterId('');
              setFilterName('');
              setFilterDepartment('');
              setFilterDate('');
            }}
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* ---- ACTION BUTTONS ---- */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Button
          className="h-auto flex-col gap-2 rounded-2xl border border-[#2E3192]/20 bg-gradient-to-br from-[#2E3192] to-[#252A7A] py-5 shadow-md shadow-[#2E3192]/25 transition-all hover:from-[#3539a0] hover:to-[#2E3192] hover:shadow-lg"
          onClick={() => fetchReport()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
          <span className="font-semibold">Refresh report</span>
        </Button>

        <Button
          className="h-auto flex-col gap-2 rounded-2xl border border-[#0099DD]/30 bg-gradient-to-br from-[#0099DD] to-[#0080c7] py-5 shadow-md shadow-[#0099DD]/25 transition-all hover:shadow-lg"
          onClick={handlePdfExport}
          disabled={!report}
        >
          <FileText className="h-6 w-6" />
          <span className="font-semibold">Export to PDF</span>
        </Button>

        <Button
          className="h-auto flex-col gap-2 rounded-2xl border border-[#5A5FB8]/25 bg-gradient-to-br from-[#5A5FB8] to-[#45499e] py-5 shadow-md shadow-[#5A5FB8]/20 transition-all hover:shadow-lg"
          onClick={handleExcelExport}
          disabled={!report || exporting}
        >
          {exporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
          <span className="font-semibold">Export Excel / CSV</span>
        </Button>
      </div>

      {/* ---- REPORT SUMMARY ---- */}
      <Card className="mb-6 overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
        <div className="border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#2E3192]">{reportTypeLabel} summary</h2>
          <p className="text-xs text-[#5A5FB8]">Headcount for the selected report range</p>
        </div>
        <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-[#5A5FB8]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-[#2E3192]/10 bg-gradient-to-br from-[#F0F4FC] to-white p-6 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                Total employees
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums text-[#2E3192]">
                {report?.total ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white p-6 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                {reportTypeLabel} present
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums text-emerald-600">
                {report?.present ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-50 to-white p-6 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-800/80">
                {reportTypeLabel} absent
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums text-rose-600">
                {report?.absent ?? 0}
              </p>
            </div>
          </div>
        )}
        </div>
      </Card>

      {/* ---- CHARTS ---- */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Bar Chart — Attendance */}
        <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
          <div className="border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2E3192]">{reportTypeLabel} attendance</h2>
            <p className="text-xs text-[#5A5FB8]">Present vs absent trend</p>
          </div>
          <div className="p-6">
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
          </div>
        </Card>

        {/* Pie Chart — Department Activity */}
        <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
          <div className="border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2E3192]">{reportTypeLabel} department activity</h2>
            <p className="text-xs text-[#5A5FB8]">Share by department</p>
          </div>
          <div className="p-6">
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
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {deptData.map((dept: any, i: number) => (
              <button
                key={dept.name}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                  activeIndex === i
                    ? 'border-[#2E3192]/25 bg-[#f0f4fc] font-semibold text-[#2E3192]'
                    : 'border-transparent hover:bg-white/80 hover:shadow-sm'
                }`}
              >
                <span className="inline-block h-3 w-3 rounded-full shadow-sm" style={{ background: COLORS[i % COLORS.length] }} />
                {dept.name}
              </button>
            ))}
          </div>
          </div>
        </Card>
      </div>

      {/* ---- ATTENDANCE DETAILS TABLE ---- */}
      <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
        <div className="border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#2E3192]">{reportTypeLabel}&apos;s attendance log</h2>
          <p className="text-xs text-[#5A5FB8]">Per-employee times and status</p>
        </div>
        <div className="p-6 pt-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[#5A5FB8]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : !report?.details?.length ? (
          <p className="py-6 text-sm text-[#5A5FB8]">
            No attendance records yet for the selected report.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#2E3192]/8">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-b from-[#eef2f9]/90 to-[#e8edf5]/80">
                <tr className="border-b border-[#2E3192]/10">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Employee ID
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Department
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Time In
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Time Out
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Total Hours
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDetails.map((d: any, index: number) => (
                  <tr key={`${d.id || d.employee_id}-${index}`} className="border-b border-[#2E3192]/6 transition-colors hover:bg-[#f8fafc]">
                    <td className="px-3 py-2.5 font-medium text-[#334155]">{d.employee_id}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.name}</td>
                    <td className="px-3 py-2.5 text-[#334155]">{d.department}</td>
                    <td className="px-3 py-2.5 font-medium text-emerald-700">{d.time_in  || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-sky-700">{d.time_out || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-[#2E3192]">{d.total_hours || '—'}</td>
                    <td className="px-3 py-2.5">{getStatusBadge(d.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
}