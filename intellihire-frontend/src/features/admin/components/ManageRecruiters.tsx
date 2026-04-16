// features/admin/components/ManageRecruiters.tsx
//
// Full recruiter management panel: list + delete.
// Opened from the Admin block in the sidebar or any admin surface.
// Renders nothing for non-admins.

import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Users, X, Trash2, Loader2, AlertCircle,
  CheckCircle, RefreshCw, UserX, Mail, Shield,
  Search, UserPlus,
} from 'lucide-react';

import { adminService, type Recruiter } from '../services/admin.service';
import type { RootState } from '../../../app/store';

/* ── Design tokens — mirrors DashboardLayout exactly ───────────────────── */
const T = {
  // Core palette
  navy:         '#1e3a8a',
  blue:         '#2563eb',
  blueLight:    '#3b82f6',
  gradBlue:     'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',

  // Surfaces
  bg:           '#f0f4ff',
  surface:      '#ffffff',
  surfaceHov:   '#f8faff',
  border:       'rgba(30,58,138,0.12)',
  borderMid:    'rgba(30,58,138,0.28)',

  // Danger
  red:          '#dc2626',
  redDim:       'rgba(220,38,38,0.06)',
  redBorder:    'rgba(220,38,38,0.22)',
  redGrad:      'linear-gradient(135deg, #991b1b, #dc2626)',

  // Success
  teal:         '#0d9488',
  tealDim:      'rgba(13,148,136,0.08)',

  // Text
  textHi:       '#0f172a',
  textMid:      '#334155',
  textLow:      '#64748b',
  textFaint:    '#94a3b8',
  white:        '#ffffff',

  // Shadows
  shadowLg:     '0 24px 64px rgba(15,23,42,0.20)',
  shadowMd:     '0 4px 20px rgba(30,58,138,0.10)',

  // Fonts
  body:         "'DM Sans', system-ui, sans-serif",
  display:      "'Fraunces', serif",
};

/* ── Avatar initials ────────────────────────────────────────────────────── */
const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: T.gradBlue, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: T.white,
      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
      fontFamily: T.body,
    }}>
      {initials || '?'}
    </div>
  );
};

/* ── Delete confirmation inline ─────────────────────────────────────────── */
const DeleteConfirm: React.FC<{
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ name, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 14,
    background: 'rgba(254,242,242,0.97)', backdropFilter: 'blur(4px)',
    border: `1.5px solid ${T.redBorder}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 14px', gap: 10, zIndex: 2,
    animation: 'fabFadeIn 0.15s ease both',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <AlertCircle size={14} color={T.red} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.red, fontFamily: T.body }}>
        Remove <strong>{name.split(' ')[0]}</strong>?
      </span>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onCancel} disabled={loading} style={{
        padding: '5px 12px', borderRadius: 7, border: `1px solid ${T.redBorder}`,
        background: T.white, color: T.textMid, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: T.body,
      }}>Cancel</button>
      <button onClick={onConfirm} disabled={loading} style={{
        padding: '5px 12px', borderRadius: 7, border: 'none',
        background: T.redGrad, color: T.white, fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: T.body,
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: loading ? 0.7 : 1,
      }}>
        {loading
          ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
          : <Trash2 size={11} />
        }
        Delete
      </button>
    </div>
  </div>
);

/* ── Recruiter row ──────────────────────────────────────────────────────── */
const RecruiterRow: React.FC<{
  recruiter: Recruiter;
  onDelete: (id: number) => Promise<void>;
  index: number;
}> = ({ recruiter, onDelete, index }) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [deleted,    setDeleted]    = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onDelete(recruiter.id);
    setDeleted(true);
  };

  if (deleted) return null;

  return (
    <div style={{
      position: 'relative', borderRadius: 14,
      background: T.surface, border: `1px solid ${T.border}`,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'box-shadow 0.18s, border-color 0.18s',
      animationName: 'rowSlideIn', animationDuration: '0.32s',
      animationDelay: `${index * 0.05}s`, animationFillMode: 'both',
      overflow: 'hidden',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.boxShadow = T.shadowMd;
      el.style.borderColor = 'rgba(30,58,138,0.20)';
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.boxShadow = 'none';
      el.style.borderColor = T.border;
    }}
    >
      <Avatar name={recruiter.name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: T.textHi, margin: 0, fontFamily: T.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {recruiter.name}
        </p>
        <p style={{ fontSize: 11.5, color: T.textLow, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: T.body }}>
          <Mail size={10} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recruiter.email}</span>
        </p>
      </div>

      {/* Role badge */}
      <span style={{
        padding: '3px 9px', borderRadius: 99, flexShrink: 0,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
        background: 'rgba(37,99,235,0.08)', color: T.blue,
        border: '1px solid rgba(37,99,235,0.20)', fontFamily: T.body,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Shield size={9} /> Recruiter
      </span>

      {/* Delete button */}
      {!confirming && (
        <button
          onClick={() => setConfirming(true)}
          title="Remove recruiter"
          style={{
            width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.redBorder}`,
            background: T.redDim, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.red, transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = T.red;
            b.style.color = T.white;
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = T.redDim;
            b.style.color = T.red;
          }}
        >
          <Trash2 size={13} />
        </button>
      )}

      {/* Inline confirm overlay */}
      {confirming && (
        <DeleteConfirm
          name={recruiter.name}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
          loading={deleting}
        />
      )}
    </div>
  );
};

/* ── Empty state ────────────────────────────────────────────────────────── */
const EmptyState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{
      width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
      background: 'rgba(37,99,235,0.07)', border: `1px solid rgba(37,99,235,0.15)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <UserX size={24} color={T.textFaint} />
    </div>
    <p style={{ fontSize: 14, fontWeight: 700, color: T.textMid, margin: '0 0 5px', fontFamily: T.display }}>
      No recruiters yet
    </p>
    <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0, fontFamily: T.body }}>
      Use the FAB button to create the first recruiter account.
    </p>
  </div>
);

/* ── Main modal ─────────────────────────────────────────────────────────── */
const ManageRecruitersModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [query,      setQuery]      = useState('');
  const [toast,      setToast]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.listRecruiters();
      setRecruiters(data);
    } catch {
      setError('Failed to load recruiters. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await adminService.deleteRecruiter(id);
      setRecruiters(prev => prev.filter(r => r.id !== id));
      setToast('Recruiter removed successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setError('Failed to delete recruiter. Please try again.');
    }
  };

  const filtered = recruiters.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.50)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fabFadeIn 0.18s ease both',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 520,
        background: T.bg, borderRadius: 22,
        boxShadow: T.shadowLg,
        animation: 'slideUp 0.22s ease both',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 40px)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 22px 16px',
          background: `linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)`,
          position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Deco blobs */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 13,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}>
                <Users size={18} color={T.white} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: T.white, margin: 0, letterSpacing: '-0.4px', fontFamily: T.display }}>
                  Manage Recruiters
                </h2>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', margin: 0, fontFamily: T.body }}>
                  {loading ? 'Loading…' : `${recruiters.length} recruiter${recruiters.length !== 1 ? 's' : ''} total`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Refresh */}
              <button
                onClick={load}
                disabled={loading}
                title="Refresh list"
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.white, transition: 'all 0.18s',
                }}
              >
                <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.white, transition: 'all 0.18s',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search bar inside header */}
          {!loading && recruiters.length > 0 && (
            <div style={{ position: 'relative', marginTop: 14 }}>
              <Search size={13} style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.5)',
              }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                style={{
                  width: '100%', padding: '9px 12px 9px 32px',
                  borderRadius: 10, border: '1px solid rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                  color: T.white, fontSize: 13, fontFamily: T.body, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* Toast */}
          {toast && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)',
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'fabFadeIn 0.2s ease both',
            }}>
              <CheckCircle size={14} color={T.teal} />
              <span style={{ fontSize: 12.5, color: T.teal, fontWeight: 600, fontFamily: T.body }}>{toast}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 10,
              background: T.redDim, border: `1px solid ${T.redBorder}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} color={T.red} />
              <span style={{ fontSize: 12.5, color: T.red, fontFamily: T.body }}>{error}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  height: 66, borderRadius: 14,
                  background: 'linear-gradient(90deg, rgba(30,58,138,0.06) 25%, rgba(30,58,138,0.10) 50%, rgba(30,58,138,0.06) 75%)',
                  backgroundSize: '200% 100%',
                  animation: `shimmer 1.4s ease infinite ${i * 0.15}s`,
                }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && recruiters.length === 0 && !error && <EmptyState />}

          {/* No results for search */}
          {!loading && recruiters.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <Search size={20} color={T.textFaint} style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontSize: 13.5, color: T.textMid, fontWeight: 600, margin: '0 0 4px', fontFamily: T.display }}>No results</p>
              <p style={{ fontSize: 12, color: T.textFaint, margin: 0, fontFamily: T.body }}>Try a different name or email.</p>
            </div>
          )}

          {/* List */}
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((r, i) => (
                <RecruiterRow key={r.id} recruiter={r} onDelete={handleDelete} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 16px', borderTop: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.surface, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11.5, color: T.textFaint, fontFamily: T.body }}>
            {!loading && filtered.length > 0 && `Showing ${filtered.length} of ${recruiters.length}`}
          </span>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 9,
            border: `1.5px solid ${T.border}`, background: T.surface,
            color: T.textMid, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.body, transition: 'all 0.18s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderMid; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Exported trigger button (drop into sidebar Admin block) ─────────────── */
export const ManageRecruitersButton: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const [open, setOpen] = useState(false);

  if (user?.role !== 'admin') return null;

  return (
    <>
      <style>{`
        @keyframes fabFadeIn { from { opacity:0 }               to { opacity:1 } }
        @keyframes slideUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin      { to   { transform:rotate(360deg) } }
        @keyframes rowSlideIn{ from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '7px 10px', borderRadius: 9,
          background: 'none', border: `1px dashed rgba(220,38,38,0.30)`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.18s', marginTop: 6,
          color: '#dc2626',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = 'rgba(220,38,38,0.05)';
          b.style.borderColor = 'rgba(220,38,38,0.45)';
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = 'none';
          b.style.borderColor = 'rgba(220,38,38,0.30)';
        }}
      >
        <Users size={12} />
        <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: 0.2 }}>
          Manage Recruiters
        </span>
        <UserPlus size={10} style={{ marginLeft: 'auto', opacity: 0.6 }} />
      </button>

      {open && <ManageRecruitersModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default ManageRecruitersButton;