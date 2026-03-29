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
import ExcelJS from 'exceljs';

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

  const departmentOptions = ['Cutting', 'Assembly', 'Warehouse'];

  const filteredDetails = reportDetails.filter((d: any) => {
    const matchesId = !filterId || String(d.employee_id ?? d.id ?? '').toLowerCase().includes(filterId.toLowerCase());
    const matchesName = !filterName || String(d.name ?? '').toLowerCase().includes(filterName.toLowerCase());
    const matchesDepartment = !filterDepartment || String(d.department ?? '')
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
      .includes(filterDepartment.toLowerCase());

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
    present: filteredDetails.filter((d: any) => d.status === 'On Duty' || d.status === 'Off Duty').length,
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
      case 'Day Off':  return <Badge className="bg-amber-500">Day Off</Badge>;
      default:         return <Badge className="bg-gray-500">Absent</Badge>;
    }
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const printableDate = (v: string) => {
    const parsed = new Date(v);
    if (Number.isNaN(parsed.getTime())) return v || '-';
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const attendanceRate = filteredSummary.total
    ? `${Math.round((filteredSummary.present / filteredSummary.total) * 100)}%`
    : '0%';

  const formatTotalHoursLines = (d: any): string[] => {
    const byDepartment = d?.total_hours_by_department;
    if (byDepartment && typeof byDepartment === 'object') {
      const entries = Object.entries(byDepartment as Record<string, string>)
        .filter(([dept, hours]) => String(dept).trim() && String(hours).trim())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dept, hours]) => `${dept}: ${hours}`);
      if (entries.length) return entries;
    }
    const fallback = String(d?.total_hours || '').trim();
    return [fallback || '-'];
  };

  const departmentBreakdown = (() => {
    const grouped = new Map<string, { total: number; present: number; absent: number }>();
    filteredDetails.forEach((d: any) => {
      const department = String(d.department || 'Unassigned').trim() || 'Unassigned';
      const current = grouped.get(department) ?? { total: 0, present: 0, absent: 0 };
      current.total += 1;
      if (d.status === 'Absent') current.absent += 1;
      else if (d.status === 'On Duty' || d.status === 'Off Duty') current.present += 1;
      grouped.set(department, current);
    });
    return Array.from(grouped.entries())
      .map(([department, stats]) => ({
        department,
        ...stats,
        rate: stats.total ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.department.localeCompare(b.department));
  })();

  // ================= PDF EXPORT =================
  const handlePdfExport = () => {
    const selectedDate = report?.date || reportDate || new Date().toISOString().split('T')[0];
    const generatedAt = new Date().toLocaleString();
    const rowHtml = (filteredDetails || []).map((d: any) => {
      const statusClass =
        d.status === 'On Duty'
          ? 'pill-green'
          : d.status === 'Off Duty'
            ? 'pill-blue'
            : d.status === 'Day Off'
              ? 'pill-amber'
              : 'pill-gray';
      const totalHoursLines = formatTotalHoursLines(d);
      return `
      <tr>
        <td class="mono">${escapeHtml(d.employee_id || d.id || '-')}</td>
        <td><strong>${escapeHtml(d.name || '-')}</strong></td>
        <td>${escapeHtml(d.department || '-')}</td>
        <td class="mono">${escapeHtml(d.time_in || '-')}</td>
        <td class="mono">${escapeHtml(d.time_out || '-')}</td>
        <td class="mono">${totalHoursLines.map((line) => escapeHtml(line)).join('<br/>')}</td>
        <td><span class="pill ${statusClass}">${escapeHtml(d.status || 'Absent')}</span></td>
      </tr>`;
    }).join('');

    const deptCards = departmentBreakdown.map((d) => `
      <div class="dept-card">
        <div class="dept-name">${escapeHtml(d.department)}</div>
        <div class="dept-bar-wrap"><div class="dept-bar-fill" style="width:${d.rate}%"></div></div>
        <div class="dept-stats">
          <span><strong>${d.present}</strong> Present</span>
          <span><strong>${d.absent}</strong> Absent</span>
          <span><strong>${d.rate}%</strong></span>
        </div>
      </div>
    `).join('');

    const printContent = `
      <html>
        <head>
          <title>${reportTypeLabel} Report — ${report?.date || 'N/A'}</title>
          <style>
            :root {
              --navy: #1e2260; --blue: #2E3192; --sky: #0099DD; --sky-lt: #e0f4fd;
              --green: #10b981; --red: #ef4444; --gray: #64748b; --bg: #f8fafc;
              --white: #ffffff; --border: #e2e8f0; --text: #0f172a; --muted: #94a3b8;
            }
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Arial, sans-serif; background: var(--bg); color: var(--text); font-size: 10pt; line-height: 1.5; }
            .page { width: 210mm; min-height: 297mm; background: var(--white); margin: 0 auto; }
            .header { background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 60%, var(--sky) 100%); padding: 28px 36px 22px; display:flex; justify-content:space-between; }
            .company-name { font-size: 11pt; color: rgba(255,255,255,0.75); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
            .report-title { font-size: 22pt; font-weight: 700; color: #fff; line-height:1.1; }
            .report-sub { font-size: 10pt; color: rgba(255,255,255,0.7); margin-top: 6px; }
            .header-right { text-align:right; }
            .badge { display:inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius:20px; padding:4px 14px; color:#fff; font-size:9pt; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; }
            .report-date { color:#fff; font-size:15pt; font-weight:700; margin-top:8px; }
            .report-gen { color: rgba(255,255,255,0.6); font-size:8pt; margin-top:3px; }
            .accent-bar { height:4px; background: linear-gradient(90deg, var(--sky) 0%, var(--green) 100%); }
            .body { padding: 26px 36px 28px; }
            .section-label { font-size: 8pt; font-weight:700; letter-spacing:0.12em; text-transform: uppercase; color: var(--sky); margin-bottom: 10px; }
            .kpi-row { display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
            .kpi-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
            .kpi-label { font-size: 8pt; color: var(--gray); text-transform: uppercase; margin-bottom: 6px; }
            .kpi-value { font-size: 26pt; font-weight: 700; line-height: 1; }
            .total .kpi-value { color: var(--blue); } .present .kpi-value { color: var(--green); } .absent .kpi-value { color: var(--red); } .rate .kpi-value { color: var(--sky); }
            .dept-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
            .dept-card { border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
            .dept-name { font-size: 9pt; font-weight: 700; color: var(--blue); margin-bottom: 8px; }
            .dept-bar-wrap { background: #e9edf8; border-radius: 99px; height: 6px; margin-bottom: 8px; overflow: hidden; }
            .dept-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--sky), var(--blue)); }
            .dept-stats { display: flex; gap: 10px; font-size: 8pt; color: var(--gray); }
            .table-wrap { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
            table { width:100%; border-collapse: collapse; font-size: 8.5pt; }
            thead { background: linear-gradient(to bottom, #eef2f9, #e8edf5); }
            th { padding: 9px 10px; text-align:left; font-size:7pt; text-transform: uppercase; letter-spacing:0.08em; color: var(--gray); border-bottom: 1px solid var(--border); }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
            tbody tr:nth-child(even) td { background: #fbfcfe; }
            .mono { font-family: Consolas, monospace; font-size: 8pt; }
            .pill { display:inline-block; border-radius: 99px; padding: 2px 9px; font-size: 7.5pt; font-weight:700; }
            .pill-green { background: #d1fae5; color: #065f46; }
            .pill-blue { background: #dbeafe; color: #1e40af; }
            .pill-amber { background: #fef3c7; color: #92400e; }
            .pill-gray { background: #f1f5f9; color: #475569; }
            .sig-block { display: flex; gap: 46px; margin: 10px 0 8px; }
            .sig-item { text-align: center; font-size: 8pt; color: var(--gray); }
            .sig-line { width: 110px; border-bottom: 1px solid #cbd5e1; margin-bottom: 5px; height: 24px; }
            .footer { border-top: 1px solid var(--border); padding: 14px 36px; font-size: 8pt; color: var(--muted); background: var(--bg); display:flex; justify-content:space-between; }
            @media print { body { background: white; } .page { margin: 0; } @page { size: A4; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <div class="company-name">Metalink Corporation</div>
                <div class="report-title">Attendance Report</div>
                <div class="report-sub">RFID Employee Monitoring System - ${escapeHtml(reportTypeLabel)} Summary</div>
              </div>
              <div class="header-right">
                <div class="badge">${escapeHtml(reportTypeLabel)}</div>
                <div class="report-date">${escapeHtml(printableDate(selectedDate))}</div>
                <div class="report-gen">Generated: ${escapeHtml(generatedAt)}</div>
              </div>
            </div>
            <div class="accent-bar"></div>
            <div class="body">
              <div class="section-label">Summary</div>
              <div class="kpi-row">
                <div class="kpi-card total"><div class="kpi-label">Total Employees</div><div class="kpi-value">${filteredSummary.total}</div></div>
                <div class="kpi-card present"><div class="kpi-label">Present</div><div class="kpi-value">${filteredSummary.present}</div></div>
                <div class="kpi-card absent"><div class="kpi-label">Absent</div><div class="kpi-value">${filteredSummary.absent}</div></div>
                <div class="kpi-card rate"><div class="kpi-label">Attendance Rate</div><div class="kpi-value">${attendanceRate}</div></div>
              </div>
              <div class="section-label">By Department</div>
              <div class="dept-grid">
                ${deptCards || '<div class="dept-card"><div class="dept-name">No Data</div><div class="dept-stats"><span><strong>0</strong> Present</span><span><strong>0</strong> Absent</span><span><strong>0%</strong></span></div></div>'}
              </div>
              <div class="section-label">Attendance Log</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th><th>Name</th><th>Department</th>
                      <th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowHtml || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">No records.</td></tr>'}
                  </tbody>
                </table>
              </div>
              <div class="section-label">Authorizations</div>
              <div class="sig-block">
                <div class="sig-item"><div class="sig-line"></div><div>HR Officer</div></div>
                <div class="sig-item"><div class="sig-line"></div><div>Department Head</div></div>
                <div class="sig-item"><div class="sig-line"></div><div>General Manager</div></div>
              </div>
            </div>
            <div class="footer">
              <div>RFID Employee Monitoring System - Confidential - For Internal Use Only</div>
              <div>Metalink Corporation</div>
            </div>
          </div>
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
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'RFID Employee Monitoring System';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet(`${reportTypeLabel} Report`);

      sheet.columns = [
        { key: 'a', width: 16 },
        { key: 'b', width: 26 },
        { key: 'c', width: 18 },
        { key: 'd', width: 14 },
        { key: 'e', width: 14 },
        { key: 'f', width: 15 },
        { key: 'g', width: 14 },
      ];

      const fill = (argb: string) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } }) as const;
      const thinBorder = {
        top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      };

      sheet.mergeCells('A1:G1');
      sheet.mergeCells('A2:D4');
      sheet.mergeCells('E2:G2');
      sheet.mergeCells('E3:G3');
      sheet.mergeCells('E4:G4');
      sheet.mergeCells('A5:G5');

      sheet.getCell('A2').value = 'RFID Employee Monitoring System';
      sheet.getCell('A2').font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle' };
      ['A2', 'A3', 'A4'].forEach((c) => { sheet.getCell(c).fill = fill('FF1E2260'); });

      sheet.getCell('E2').value = `${reportTypeLabel.toUpperCase()} REPORT`;
      sheet.getCell('E3').value = `Date: ${printableDate(report?.date || reportDate)}`;
      sheet.getCell('E4').value = `Generated: ${new Date().toISOString().slice(0, 10)}`;
      sheet.getCell('E2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFE0F4FD' } };
      sheet.getCell('E3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell('E4').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFE0F4FD' } };
      ['E2', 'E3', 'E4', 'F2', 'F3', 'F4', 'G2', 'G3', 'G4'].forEach((c) => { sheet.getCell(c).fill = fill('FF2E3192'); });
      sheet.getCell('E2').alignment = { horizontal: 'right', vertical: 'bottom' };
      sheet.getCell('E3').alignment = { horizontal: 'right', vertical: 'middle' };
      sheet.getCell('E4').alignment = { horizontal: 'right', vertical: 'top' };

      sheet.addRow([]);
      const summaryHeaderRow = sheet.addRow(['TOTAL', 'PRESENT', 'ABSENT', 'RATE']);
      const summaryValueRow = sheet.addRow([filteredSummary.total, filteredSummary.present, filteredSummary.absent, attendanceRate]);
      summaryHeaderRow.eachCell((cell) => {
        cell.fill = fill('FFF8FAFC');
        cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      summaryValueRow.eachCell((cell, col) => {
        cell.fill = fill('FFF8FAFC');
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        const colors = ['FF2E3192', 'FF10B981', 'FFEF4444', 'FF0099DD'];
        cell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: colors[col - 1] || 'FF2E3192' } };
      });

      sheet.addRow([]);
      sheet.mergeCells(`A${sheet.lastRow!.number + 1}:G${sheet.lastRow!.number + 1}`);
      const deptTitle = sheet.addRow(['-  DEPARTMENT BREAKDOWN']);
      const deptTitleCell = deptTitle.getCell(1);
      deptTitleCell.fill = fill('FFEEF2F9');
      deptTitleCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF2E3192' } };
      deptTitleCell.border = { bottom: { style: 'medium', color: { argb: 'FF2E3192' } } };

      const deptHeader = sheet.addRow(['Department', 'Total', 'Present', 'Absent', 'Attendance Rate']);
      deptHeader.eachCell((cell) => {
        cell.fill = fill('FF2E3192');
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
      });

      const deptRows = departmentBreakdown.length ? departmentBreakdown : [{ department: 'No Data', total: 0, present: 0, absent: 0, rate: 0 }];
      deptRows.forEach((d) => {
        const r = sheet.addRow([d.department, d.total, d.present, d.absent, `${d.rate}%`]);
        r.eachCell((cell, col) => {
          cell.border = thinBorder;
          cell.font = { name: 'Calibri', size: 9, bold: col === 1, color: { argb: col === 1 ? 'FF2E3192' : 'FF334155' } };
          cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
        });
      });

      sheet.addRow([]);
      sheet.mergeCells(`A${sheet.lastRow!.number + 1}:G${sheet.lastRow!.number + 1}`);
      const logTitle = sheet.addRow(['-  ATTENDANCE LOG']);
      const logTitleCell = logTitle.getCell(1);
      logTitleCell.fill = fill('FFEEF2F9');
      logTitleCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF2E3192' } };
      logTitleCell.border = { bottom: { style: 'medium', color: { argb: 'FF2E3192' } } };

      const logHeader = sheet.addRow(['Employee ID', 'Name', 'Department', 'Time In', 'Time Out', 'Total Hours', 'Status']);
      logHeader.eachCell((cell) => {
        cell.fill = fill('FF1E2260');
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
      });

      const detailsRows = filteredDetails.length ? filteredDetails : [{ employee_id: '-', name: 'No records', department: '-', time_in: '-', time_out: '-', total_hours: '-', status: 'Absent' }];
      detailsRows.forEach((d: any) => {
        const totalHoursCell = formatTotalHoursLines(d).join('\n');
        const r = sheet.addRow([
          d.employee_id || d.id || '-',
          d.name || '-',
          d.department || '-',
          d.time_in || '-',
          d.time_out || '-',
          totalHoursCell,
          d.status || 'Absent',
        ]);
        r.eachCell((cell, col) => {
          cell.border = thinBorder;
          cell.alignment = { horizontal: col === 2 || col === 3 ? 'left' : 'center', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' }, bold: false };
        });
        r.getCell(6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        const statusCell = r.getCell(7);
        if ((d.status || 'Absent') === 'On Duty') {
          statusCell.fill = fill('FFD1FAE5');
          statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF10B981' } };
        } else if ((d.status || 'Absent') === 'Off Duty') {
          statusCell.fill = fill('FFDBEAFE');
          statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
        } else if ((d.status || 'Absent') === 'Day Off') {
          statusCell.fill = fill('FFFEF3C7');
          statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };
        } else {
          statusCell.fill = fill('FFF1F5F9');
          statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
        }
      });

      sheet.addRow([]);
      sheet.mergeCells(`A${sheet.lastRow!.number + 1}:G${sheet.lastRow!.number + 1}`);
      const authTitle = sheet.addRow(['Authorizations']);
      authTitle.getCell(1).fill = fill('FFEEF2F9');
      authTitle.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF2E3192' } };
      authTitle.getCell(1).border = { bottom: { style: 'medium', color: { argb: 'FF2E3192' } } };
      sheet.addRow([]);
      const signRow = sheet.addRow(['HR Officer', '', 'Department Head', '', '', 'General Manager', '']);
      signRow.eachCell((cell) => {
        if (!cell.value) return;
        cell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      sheet.addRow([]);
      sheet.mergeCells(`A${sheet.lastRow!.number + 1}:G${sheet.lastRow!.number + 1}`);
      const footerRow = sheet.addRow(['RFID Employee Monitoring System - Confidential - For Internal Use Only - Metalink Corporation']);
      footerRow.getCell(1).fill = fill('FFF8FAFC');
      footerRow.getCell(1).font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } };
      footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${(report?.date || 'today').toString().replace(/\s+/g, '_')}.xlsx`;
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
          <span className="font-semibold">Export to Excel</span>
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
                    <td className="px-3 py-2.5 font-semibold text-[#2E3192]">
                      {formatTotalHoursLines(d).map((line, i) => (
                        <div key={`${d.id || d.employee_id}-${index}-hours-${i}`}>{line}</div>
                      ))}
                    </td>
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