import { useEffect, useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/app/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Calendar } from '@/app/components/ui/calendar';
import { Users, Trash2, Pencil, UserPlus, Loader2, CalendarDays, X } from 'lucide-react';

const API = 'http://127.0.0.1:8000/api';

const DEPARTMENTS = ['Cutting', 'Assembly', 'Warehouse'];

export function Employees() {
  const [employees, setEmployees]       = useState<any[]>([]);
  const [pendingUids, setPendingUids]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  // ── Delete confirmation ──────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Edit dialog ──────────────────────────────────────────────────────────
  const [editTarget, setEditTarget]     = useState<any | null>(null);
  const [editName, setEditName]         = useState('');
  const [editDept, setEditDept]         = useState('');
  const [saving, setSaving]             = useState(false);

  // ── Register dialog ──────────────────────────────────────────────────────
  const [registerUid, setRegisterUid]   = useState<string | null>(null);
  const [regName, setRegName]           = useState('');
  const [regDept, setRegDept]           = useState('Cutting');
  const [registering, setRegistering]   = useState(false);
  const [dayOffTarget, setDayOffTarget] = useState<any | null>(null);
  const [selectedDayOffDates, setSelectedDayOffDates] = useState<Date[]>([]);
  const [dayOffs, setDayOffs]           = useState<string[]>([]);
  const [dayOffLoading, setDayOffLoading] = useState(false);
  const [dayOffSaving, setDayOffSaving]   = useState(false);

  // ── Error/success toast ──────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch helpers ────────────────────────────────────────────────────────
// Replace the fetchEmployees helper:
const fetchEmployees = async () => {
  try {
    const res  = await fetch(`${API}/employees`);
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Failed to fetch employees:', err);
  }
};

  const toIsoDate = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchPending = async () => {
    try {
      const res  = await fetch(`${API}/pending-uids`);
      const data = await res.json();
      setPendingUids(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pending UIDs:', err);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchPending()]);
      setLoading(false);
    })();

    const interval = setInterval(() => {
      fetchEmployees();
      fetchPending();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // ── DELETE ───────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/employees/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Delete failed');
      }

      // ✅ Remove from frontend state immediately — no need to wait for next poll
      setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id));
      showToast(`${deleteTarget.name} has been deleted.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete employee.', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── EDIT ─────────────────────────────────────────────────────────────────
  const openEdit = (emp: any) => {
    setEditTarget(emp);
    setEditName(emp.name);
    setEditDept(emp.department);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/employees/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), department: editDept }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Update failed');
      }

      // ✅ Update the employee in state immediately
      setEmployees(prev =>
        prev.map(e =>
          e.id === editTarget.id
            ? { ...e, name: editName.trim(), department: editDept }
            : e
        )
      );
      showToast('Employee updated successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee.', 'error');
    } finally {
      setSaving(false);
      setEditTarget(null);
    }
  };

  // ── REGISTER NEW EMPLOYEE FROM PENDING UID ───────────────────────────────
  const handleRegister = async () => {
    if (!registerUid || !regName.trim()) return;
    setRegistering(true);
    try {
      const res = await fetch(`${API}/employees/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfidUid:    registerUid,
          name:       regName.trim(),
          department: regDept,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Registration failed');
      }

      const data = await res.json();

      // ✅ Add new employee to state immediately
      setEmployees(prev => [...prev, data.employee]);
      // Remove from pending list
      setPendingUids(prev => prev.filter(p => p.rfidUid !== registerUid));
      showToast(`${regName.trim()} registered successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to register employee.', 'error');
    } finally {
      setRegistering(false);
      setRegisterUid(null);
      setRegName('');
      setRegDept('Cutting');
    }
  };

  // ── DISMISS PENDING UID ──────────────────────────────────────────────────
  const dismissPending = async (uid: string) => {
    try {
      await fetch(`${API}/pending-uids/${uid}`, { method: 'DELETE' });
      setPendingUids(prev => prev.filter(p => p.rfidUid !== uid));
    } catch (err) {
      console.error('Failed to dismiss pending UID:', err);
    }
  };

  const openDayOffDialog = async (emp: any) => {
    setDayOffTarget(emp);
    setSelectedDayOffDates([]);
    setDayOffLoading(true);
    try {
      const res = await fetch(`${API}/employees/${emp.id}/day-offs`);
      const data = await res.json();
      setDayOffs(Array.isArray(data?.dayOffs) ? data.dayOffs : []);
    } catch (err) {
      console.error('Failed to fetch day offs:', err);
      setDayOffs([]);
      showToast('Failed to load day offs.', 'error');
    } finally {
      setDayOffLoading(false);
    }
  };

  const addDayOffs = async () => {
    if (!dayOffTarget || selectedDayOffDates.length === 0) return;
    setDayOffSaving(true);
    try {
      const uniqueIsoDates = Array.from(new Set(selectedDayOffDates.map((d) => toIsoDate(d))));

      for (const date of uniqueIsoDates) {
        const res = await fetch(`${API}/employees/${dayOffTarget.id}/day-off`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `Failed to add ${date}`);
      }

      const refreshRes = await fetch(`${API}/employees/${dayOffTarget.id}/day-offs`);
      const refreshData = await refreshRes.json().catch(() => ({}));
      setDayOffs(Array.isArray(refreshData?.dayOffs) ? refreshData.dayOffs : []);
      setSelectedDayOffDates([]);
      showToast(`${uniqueIsoDates.length} day off date(s) scheduled successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to add day offs.', 'error');
    } finally {
      setDayOffSaving(false);
    }
  };

  const removeDayOff = async (date: string) => {
    if (!dayOffTarget) return;
    setDayOffSaving(true);
    try {
      const res = await fetch(`${API}/employees/${dayOffTarget.id}/day-off`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to remove day off');
      setDayOffs(Array.isArray(data?.dayOffs) ? data.dayOffs : []);
      showToast('Day off removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove day off.', 'error');
    } finally {
      setDayOffSaving(false);
    }
  };

  const todayIso = toIsoDate(new Date());
  const upcomingDayOffs = dayOffs
    .filter((d) => d >= todayIso)
    .sort((a, b) => a.localeCompare(b));
  const selectedIsoDates = Array.from(new Set(selectedDayOffDates.map((d) => toIsoDate(d))))
    .sort((a, b) => a.localeCompare(b));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Duty':  return <Badge className="bg-green-500 hover:bg-green-600">On Duty</Badge>;
      case 'Off Duty': return <Badge className="bg-blue-500 hover:bg-blue-600">Off Duty</Badge>;
      case 'Day Off':  return <Badge className="bg-amber-500 hover:bg-amber-600">Day Off</Badge>;
      default:         return <Badge className="bg-gray-500 hover:bg-gray-600">Absent</Badge>;
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 pb-14 sm:px-8">
      <header className="mb-8 rounded-2xl border border-[#2E3192]/10 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2E3192]">
          Employees
        </h1>
        <p className="mt-1.5 text-sm text-[#5A5FB8]">
          Register and manage RFID-linked staff
        </p>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Summary card ── */}
      <Card className="relative mb-6 overflow-hidden rounded-2xl border-[#2E3192]/12 bg-gradient-to-br from-white to-[#f0f4fc] p-6 shadow-sm">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#0099DD]/10" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-[#2E3192]/10 p-3">
            <Users className="h-8 w-8 text-[#2E3192]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
              Total registered
            </p>
            <p className="text-3xl font-semibold tabular-nums text-[#2E3192]">
              {employees.length}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Pending UIDs ── */}
      {pendingUids.length > 0 && (
        <Card className="mb-6 overflow-hidden rounded-2xl border-amber-400/30 bg-gradient-to-br from-amber-50/90 to-white p-6 shadow-sm ring-1 ring-amber-400/20">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/25">
              <UserPlus className="h-5 w-5 text-amber-800" />
            </span>
            Unregistered RFID tags ({pendingUids.length})
          </h2>
          <div className="space-y-2">
            {pendingUids.map((p) => (
              <div
                key={p.rfidUid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/90 px-4 py-3 shadow-sm"
              >
                <div>
                  <span className="font-mono text-sm font-medium">{p.rfidUid}</span>
                  <span className="text-xs text-gray-400 ml-3">
                    Scanned {new Date(p.scannedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[#2E3192] hover:bg-[#252A7A]"
                    onClick={() => {
                      setRegisterUid(p.rfidUid);
                      setRegName('');
                      setRegDept('Cutting');
                    }}
                  >
                    Register
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dismissPending(p.rfidUid)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Employee Table ── */}
      <Card className="overflow-hidden rounded-2xl border-[#2E3192]/10 shadow-sm">
        <div className="border-b border-[#2E3192]/8 bg-gradient-to-r from-[#fafbfd] to-[#f4f8fc] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#2E3192]">Employee list</h2>
          <p className="text-xs text-[#5A5FB8]">Edit, delete, or review RFID status</p>
        </div>
        <div className="p-6 pt-5">
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-[#5A5FB8]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading employees…
          </div>
        ) : employees.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#5A5FB8]">
            No employees registered yet.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>RFID UID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.id}</TableCell>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{emp.rfidUid || '—'}</TableCell>
                    <TableCell>{getStatusBadge(emp.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => openDayOffDialog(emp)}
                        >
                          Manage Day Offs
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(emp)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
                          onClick={() => setDeleteTarget(emp)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        </div>
      </Card>

      {/* ══════════════ DELETE CONFIRMATION DIALOG ══════════════ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-800">{deleteTarget?.name}</span>
              {' '}({deleteTarget?.id})? This action cannot be undone. Their RFID tag will
              be freed for future re-registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deleting…</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══════════════ EDIT DIALOG ══════════════ */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee — {editTarget?.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                className="mt-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="edit-dept">Department</Label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger id="edit-dept" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-[#2E3192] hover:bg-[#252A7A]"
              onClick={handleEditSave}
              disabled={saving || !editName.trim()}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ REGISTER DIALOG ══════════════ */}
      <Dialog open={!!registerUid} onOpenChange={(open) => !open && setRegisterUid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Employee</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>RFID UID</Label>
              <p className="mt-1 font-mono text-sm bg-gray-100 rounded px-3 py-2 text-gray-700">
                {registerUid}
              </p>
            </div>
            <div>
              <Label htmlFor="reg-name">Full Name</Label>
              <Input
                id="reg-name"
                className="mt-1"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
              />
            </div>
            <div>
              <Label htmlFor="reg-dept">Department</Label>
              <Select value={regDept} onValueChange={setRegDept}>
                <SelectTrigger id="reg-dept" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterUid(null)} disabled={registering}>
              Cancel
            </Button>
            <Button
              className="bg-[#2E3192] hover:bg-[#252A7A]"
              onClick={handleRegister}
              disabled={registering || !regName.trim()}
            >
              {registering ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Registering…</>
              ) : (
                'Register Employee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DAY OFF DIALOG ══════════════ */}
      <Dialog open={!!dayOffTarget} onOpenChange={(open) => !open && setDayOffTarget(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Day Offs — {dayOffTarget?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-[#2E3192]/10 bg-gradient-to-br from-white to-[#f8fbff] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#2E3192]" />
                  <Label className="text-[#2E3192]">Select day off dates</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2E3192] hover:bg-[#2E3192]">
                    {selectedIsoDates.length} selected
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setSelectedDayOffDates([])}
                    disabled={dayOffSaving || selectedIsoDates.length === 0}
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr,260px]">
                <div className="flex justify-center rounded-2xl border border-[#2E3192]/10 bg-gradient-to-b from-white to-[#f9fbff] p-4 shadow-sm">
                  <Calendar
                    mode="multiple"
                    selected={selectedDayOffDates}
                    onSelect={(dates) => setSelectedDayOffDates(dates ?? [])}
                    disabled={dayOffSaving}
                    className="rounded-xl border border-[#2E3192]/10 bg-white p-3 shadow-sm [&_.rdp-months]:justify-center [&_.rdp-month]:mx-auto [&_.rdp-caption]:justify-center [&_.rdp-caption_label]:text-base [&_.rdp-caption_label]:font-semibold [&_.rdp-head_row]:justify-center [&_.rdp-row]:justify-center [&_.rdp-table]:mx-auto [&_.rdp-nav]:gap-2 [&_.rdp-button]:rounded-lg"
                  />
                </div>
                <div className="rounded-xl border border-[#2E3192]/10 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5A5FB8]">
                    Selected dates
                  </p>
                  {selectedIsoDates.length === 0 ? (
                    <p className="text-sm text-[#5A5FB8]">Pick one or more dates on the calendar.</p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {selectedIsoDates.map((date) => (
                        <div key={date} className="flex items-center justify-between rounded-lg border border-[#2E3192]/10 bg-[#f8fbff] px-2 py-1.5">
                          <span className="font-mono text-xs text-[#2E3192]">{date}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-[#5A5FB8] hover:bg-[#eaf1ff] hover:text-[#2E3192]"
                            onClick={() => setSelectedDayOffDates((prev) => prev.filter((d) => toIsoDate(d) !== date))}
                            disabled={dayOffSaving}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                Upcoming scheduled day offs ({upcomingDayOffs.length})
              </p>
              {dayOffLoading ? (
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : upcomingDayOffs.length === 0 ? (
                <p className="text-sm text-amber-800/80">No upcoming day offs.</p>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {upcomingDayOffs.map((date) => (
                    <div key={date} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                      <span className="text-sm font-medium text-amber-900">{date}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={dayOffSaving}
                        onClick={() => removeDayOff(date)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDayOffTarget(null)} disabled={dayOffSaving}>
              Close
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600"
              onClick={addDayOffs}
              disabled={dayOffSaving || selectedIsoDates.length === 0}
            >
              {dayOffSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                `Add ${selectedIsoDates.length > 0 ? selectedIsoDates.length : ''} Selected Day Off${selectedIsoDates.length === 1 ? '' : 's'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}