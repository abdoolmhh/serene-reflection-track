import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Search, Trash2, Edit, ArrowLeft, Save, X, ShieldAlert, Shield, Crown, UserX,
  RefreshCw, Mail, Calendar, Activity, Eye, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  user_id: string;
  display_name: string;
  mode: string;
  total_xp: number;
  sharing_enabled: boolean;
  onboarded: boolean;
  current_ramadan_day: number;
  reminder_fajr: boolean;
  reminder_quran: boolean;
  reminder_dhikr: boolean;
  reminder_tahajjud: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editXp, setEditXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, totalXp: 0, sharing: 0 });
  const [roles, setRoles] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadUsers();
    loadRoles();
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('total_xp', { ascending: false });

    if (error) {
      toast.error('Failed to load users');
    } else if (data) {
      setUsers(data as AdminUser[]);
      setStats({
        total: data.length,
        active: data.filter(u => u.onboarded).length,
        totalXp: data.reduce((s, u) => s + (u.total_xp || 0), 0),
        sharing: data.filter(u => u.sharing_enabled).length,
      });
    }
    setLoading(false);
  }

  async function loadRoles() {
    const { data } = await supabase.from('user_roles').select('*');
    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((r: any) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      setRoles(map);
    }
  }

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(userId: string) {
    if (userId === user?.id) {
      toast.error("You cannot delete yourself!");
      return;
    }
    if (!confirm("Delete this user's profile and all data?")) return;
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('User profile deleted');
      loadUsers();
    }
  }

  async function handleGrantAdmin(userId: string) {
    const { error } = await supabase.from('user_roles').insert([{ user_id: userId, role: 'admin' }]);
    if (error) {
      toast.error(error.message?.includes('duplicate') ? 'Already an admin' : 'Failed to grant admin');
    } else {
      toast.success('Admin role granted');
      loadRoles();
    }
  }

  async function handleRevokeAdmin(userId: string) {
    if (userId === user?.id) {
      toast.error("Cannot revoke your own admin!");
      return;
    }
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    if (error) {
      toast.error('Failed to revoke');
    } else {
      toast.success('Admin revoked');
      loadRoles();
    }
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.user_id);
    setEditName(u.display_name);
    setEditXp(u.total_xp);
  }

  async function handleSaveEdit() {
    if (editingId) {
      const { error } = await supabase.from('profiles').update({
        display_name: editName,
        total_xp: editXp,
      }).eq('user_id', editingId);
      if (error) {
        toast.error('Failed to update');
      } else {
        toast.success('Updated');
        setEditingId(null);
        loadUsers();
      }
    }
  }

  const getUserRole = (userId: string) => {
    const userRoles = roles[userId] || [];
    if (userRoles.includes('admin')) return 'Admin';
    if (userRoles.includes('moderator')) return 'Mod';
    return 'User';
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-20">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold gold-text">Admin Panel</h1>
          </div>
          <button onClick={() => { loadUsers(); loadRoles(); }} className="p-2 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Users, label: 'Users', value: stats.total, color: 'text-primary' },
            { icon: Activity, label: 'Active', value: stats.active, color: 'text-accent' },
            { icon: Crown, label: 'XP', value: stats.totalXp, color: 'text-primary' },
            { icon: Eye, label: 'Public', value: stats.sharing, color: 'text-accent' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass-card p-2.5 text-center">
              <Icon className={`w-3.5 h-3.5 mx-auto ${color} mb-0.5`} />
              <p className="text-sm font-bold">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {filteredUsers.length} results
          </span>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((u, i) => {
              const role = getUserRole(u.user_id);
              const isExpanded = expandedUser === u.user_id;
              return (
                <motion.div
                  key={u.user_id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`glass-card overflow-hidden ${u.user_id === user?.id ? 'ring-1 ring-primary/30' : ''}`}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {(u.display_name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === u.user_id ? (
                          <div className="space-y-1.5">
                            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-secondary/50 rounded px-2 py-1 text-xs outline-none" placeholder="Name" autoFocus />
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">XP:</span>
                              <input type="number" value={editXp} onChange={e => setEditXp(Number(e.target.value))} className="w-20 bg-secondary/50 rounded px-2 py-1 text-xs outline-none" />
                              <button onClick={handleSaveEdit} className="p-1 text-accent"><Save className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold truncate">{u.display_name || 'Anonymous'}</p>
                              {role === 'Admin' && <ShieldAlert className="w-3 h-3 text-primary flex-shrink-0" />}
                              {u.user_id === user?.id && <span className="text-[9px] text-primary">(you)</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">{u.total_xp} XP</span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground capitalize">{u.mode}</span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${role === 'Admin' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>{role}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {editingId !== u.user_id && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => setExpandedUser(isExpanded ? null : u.user_id)} className="p-1.5 text-muted-foreground hover:text-foreground">
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button onClick={() => startEdit(u)} className="p-1.5 text-muted-foreground hover:text-foreground"><Edit className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && editingId !== u.user_id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div><span className="text-muted-foreground">Joined:</span> {new Date(u.created_at).toLocaleDateString()}</div>
                            <div><span className="text-muted-foreground">Updated:</span> {new Date(u.updated_at).toLocaleDateString()}</div>
                            <div><span className="text-muted-foreground">Day:</span> R{u.current_ramadan_day}</div>
                            <div><span className="text-muted-foreground">Sharing:</span> {u.sharing_enabled ? '✅' : '❌'}</div>
                            <div><span className="text-muted-foreground">Onboarded:</span> {u.onboarded ? '✅' : '❌'}</div>
                            <div><span className="text-muted-foreground">Reminders:</span> {[u.reminder_fajr && 'F', u.reminder_quran && 'Q', u.reminder_dhikr && 'D', u.reminder_tahajjud && 'T'].filter(Boolean).join(',') || 'None'}</div>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            {role !== 'Admin' ? (
                              <button onClick={() => handleGrantAdmin(u.user_id)} className="flex-1 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-medium hover:bg-primary/20">
                                Grant Admin
                              </button>
                            ) : u.user_id !== user?.id ? (
                              <button onClick={() => handleRevokeAdmin(u.user_id)} className="flex-1 py-1.5 bg-destructive/10 text-destructive rounded-lg text-[10px] font-medium hover:bg-destructive/20">
                                Revoke Admin
                              </button>
                            ) : null}
                            {u.user_id !== user?.id && (
                              <button onClick={() => handleDelete(u.user_id)} className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-[10px] font-medium hover:bg-destructive/20">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <UserX className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
