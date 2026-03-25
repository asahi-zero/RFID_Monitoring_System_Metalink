// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Generic fetch wrapper with error handling
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ================= EMPLOYEE API =================
export const employeeApi = {
  getAll: async () => {
    return fetchApi<any[]>('/employees');
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/employees/${id}`);
  },

  create: async (employee: {
    name: string;
    department: string;
    rfidUid: string;
  }) => {
    return fetchApi<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  },

  update: async (id: string, employee: any) => {
    return fetchApi<any>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/employees/${id}`, {
      method: 'DELETE',
    });
  },
};

// ================= ATTENDANCE API =================
export const attendanceApi = {
  getAll: async (filters?: { date?: string; department?: string }) => {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.department) params.append('department', filters.department);

    const queryString = params.toString();
    return fetchApi<any[]>(`/attendance${queryString ? `?${queryString}` : ''}`);
  },

  getByEmployee: async (employeeId: string) => {
    return fetchApi<any[]>(`/attendance/employee/${employeeId}`);
  },

  create: async (record: {
    employeeId: string;
    timeIn?: string;
    timeOut?: string;
    lunchOut?: string;
    lunchIn?: string;
  }) => {
    return fetchApi<any>('/attendance', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },
};

// ================= ACTIVITY API =================
export const activityApi = {
  getAreas: async () => {
    return fetchApi<any[]>('/activity/areas');
  },

  getByArea: async (area: string) => {
    return fetchApi<any>(`/activity/areas/${encodeURIComponent(area)}`);
  },
};

// ================= REPORTS API =================
export const reportsApi = {
  getDaily: async (date: string) => {
    return fetchApi<any>(`/reports/daily?date=${date}`);
  },

  getMonthly: async (year: number, month: number) => {
    return fetchApi<any>(`/reports/monthly?year=${year}&month=${month}`);
  },

  getAttendanceSummary: async (startDate: string, endDate: string) => {
    return fetchApi<any>(`/reports/attendance-summary?start=${startDate}&end=${endDate}`);
  },

  export: async (type: 'pdf' | 'excel', reportType: string, params: any) => {
    const response = await fetch(`${API_URL}/reports/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, reportType, params }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },
};

// ================= AUTH API =================
export const authApi = {
  login: async (username: string, password: string) => {
    return fetchApi<{
      success: boolean;
      token: string;
      user: { username: string; role: string };
    }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout: async () => {
    return fetchApi<any>('/logout', {
      method: 'POST',
    });
  },

  verifyToken: async (token: string) => {
    return fetchApi<any>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
};

// ================= RFID API =================
export const rfidApi = {
  scan: async (rfidUid: string, area: string) => {
    return fetchApi<any>('/rfid/scan', {
      method: 'POST',
      body: JSON.stringify({ rfidUid, area }),
    });
  },

  getHistory: async (rfidUid?: string) => {
    return fetchApi<any[]>(`/rfid/history${rfidUid ? `?uid=${rfidUid}` : ''}`);
  },
};

// ================= EXPORT =================
export default {
  employees: employeeApi,
  attendance: attendanceApi,
  activity: activityApi,
  reports: reportsApi,
  auth: authApi,
  rfid: rfidApi,
};