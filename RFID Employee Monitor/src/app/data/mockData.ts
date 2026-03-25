// Mock data for the RFID Employee Monitoring System

export interface Employee {
  id: string;
  name: string;
  department: string;
  rfidUid: string;
  status: 'Present' | 'On Break' | 'Absent';
  currentArea?: string;
  timeIn?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  date: string;
  timeIn: string;
  timeOut: string;
  lunchOut: string;
  lunchIn: string;
  totalHours: string;
}

export interface AreaActivity {
  area: string;
  count: number;
  employees: string[];
}

// Mock data for the RFID Employee Monitoring System

export interface Employee {
  id: string;
  name: string;
  department: string;
  rfidUid: string;
  status: 'Present' | 'On Break' | 'Absent';
  currentArea?: string;
  timeIn?: string;
}

export const mockEmployees: Employee[] = [
  {
    id: "EMP001",
    name: "Juan Dela Cruz",
    department: "Assembly",
    rfidUid: "97E12149",
    status: "Present",
    currentArea: "Assembly",
    timeIn: "09:12:21"
  },
  {
    id: "EMP002",
    name: "Maria Santos",
    department: "Cutting",
    rfidUid: "D7F13A25",
    status: "Present",
    currentArea: "Cutting",
    timeIn: "09:00:00"
  },
  {
    id: "EMP003",
    name: "James Rhyan Condeno",
    department: "Wearhouse",
    rfidUid: "877B2249",
    status: "Present",
    currentArea: "Wearhouse",
    timeIn: "00:00:00"
  }
];

export const mockAttendance: AttendanceRecord[] = [
  { id: '1', employeeId: 'EMP001', name: 'John Smith', date: '2026-01-21', timeIn: '08:00', timeOut: '17:00', lunchOut: '12:00', lunchIn: '13:00', totalHours: '8:00' },
  { id: '2', employeeId: 'EMP002', name: 'Sarah Johnson', date: '2026-01-21', timeIn: '08:15', timeOut: '17:15', lunchOut: '12:30', lunchIn: '13:30', totalHours: '8:00' },
  { id: '3', employeeId: 'EMP003', name: 'Michael Brown', date: '2026-01-21', timeIn: '07:45', timeOut: '16:45', lunchOut: '12:00', lunchIn: '13:00', totalHours: '8:00' },
  { id: '4', employeeId: 'EMP005', name: 'David Wilson', date: '2026-01-21', timeIn: '08:30', timeOut: '17:30', lunchOut: '12:30', lunchIn: '13:30', totalHours: '8:00' },
  { id: '5', employeeId: 'EMP006', name: 'Lisa Anderson', date: '2026-01-21', timeIn: '08:00', timeOut: '17:00', lunchOut: '12:00', lunchIn: '13:00', totalHours: '8:00' },
  { id: '6', employeeId: 'EMP007', name: 'Robert Taylor', date: '2026-01-21', timeIn: '07:50', timeOut: '16:50', lunchOut: '12:15', lunchIn: '13:15', totalHours: '8:00' },
  { id: '7', employeeId: 'EMP008', name: 'Jennifer Martinez', date: '2026-01-21', timeIn: '08:10', timeOut: '17:10', lunchOut: '12:30', lunchIn: '13:30', totalHours: '8:00' },
];

export const mockAreaActivities: AreaActivity[] = [
  { area: 'Cutting Area', count: 2, employees: ['Lisa Anderson', 'Mark Thompson'] },
  { area: 'Welding Area', count: 1, employees: ['Michael Brown'] },
  { area: 'Assembly Area', count: 3, employees: ['John Smith', 'James Wilson', 'Mary Garcia'] },
  { area: 'Finishing Area', count: 1, employees: ['Jennifer Martinez'] },
  { area: 'Warehouse', count: 2, employees: ['David Wilson', 'Tom Anderson'] },
];