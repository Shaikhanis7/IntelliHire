// features/admin/pages/ManageRecruitersPage.tsx
// Full-page recruiter management — NOT a modal.
// Add route: <Route path="/manage-recruiters" element={<ManageRecruitersPage />} />

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Trash2, Loader2, AlertCircle, CheckCircle,
  RefreshCw, UserX, Mail, Shield, Search, X,
} from 'lucide-react';

import { adminService } from '../features/admin/services/admin.service';
import type { Recruiter } from '../features/admin/services/admin.service';
import { CreateRecruiterModal } from '../features/admin/components/CreateRecruiterFAB';

/* ── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  navy:        '#1e3a8a',
  blue:        '#2563eb',
  gradBlue:    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
  gradPanel:   'linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
  bg:          '#f0f4ff',
  surface:     '#ffffff',
  border:      'rgba(30,58,138,0.12)',
  borderMid:   'rgba(30,58,138,0.28)',
  blueDim:     'rgba(37,99,235,0.08)',
  red:         '#dc2626',
  redDim:      'rgba(220,38,38,0.06)',
  redBorder:   'rgba(220,38,38,0.22)',
  redGrad:     'linear-gradient(135deg, #991b1b, #dc2626)',
  teal:        '#0d9488',
  tealDim:     'rgba(13,148,136,0.08)',
  tealBorder:  'rgba(13,148,136,0.25)',
  text:        '#0f172a',
  textMid:     '#334155',
  textLow:     '#64748b',
  textFaint:   '#94a3b8',
  white:       '#ffffff',
  shadow:      '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.05)',
  shadowMd:    '0 4px 20px rgba(30,58,138,0.10)',
};
const F = {
  body:    "'DM Sans', system-ui, sans-serif",
  display: "'Fraunces', serif",
};

/* ── Avatar ─────────────────────────────────────────────────────────────── */
const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 40 }) => {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: C.gradBlue, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: C.white,
      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
      fontFamily: F.body,
    }}>
      {initials || '?'}
    </div>
  );
};

/* ── Delete confirm inline ──────────────────────────────────────────────── */
const DeleteConfirm: React.FC<{
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}> = ({ name, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 14,
    background: 'rgba(254,242,242,0.97)', backdropFilter: 'blur(4px)',
    border: `1.5px solid ${C.redBorder}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', gap: 10, zIndex: 2,
    animation: 'fadeIn 0.15s ease both',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <AlertCircle size={14} color={C.red} />
      <span style={{ fontSize: 13, fontWeight: 600, color: C.red, fontFamily: F.body }}>
        Remove <strong>{name.split(' ')[0]}</strong>?
      </span>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onCancel} disabled={loading} style={{
        padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.redBorder}`,
        background: C.white, color: C.textMid, fontSize: 12.5, fontWeight: 600,
        cursor: 'pointer', fontFamily: F.body,
      }}>Cancel</button>
      <button onClick={onConfirm} disabled={loading} style={{
        padding: '6px 14px', borderRadius: 8, border: 'none',
        background: C.redGrad, color: C.white, fontSize: 12.5, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F.body,
        display: 'flex', alignItems: 'center', gap: 5, opacity: loading ? 0.7 : 1,
      }}>
        {loading
          ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
          : <Trash2 size={11} />}
        Delete
      </button>
    </div>
  </div>
);

/* ── Recruiter card ─────────────────────────────────────────────────────── */
const RecruiterCard: React.FC<{
  recruiter: Recruiter; onDelete: (id: number) => Promise<void>; index: number;
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
    <div
      style={{
        position: 'relative', borderRadius: 14,
        background: C.surface, border: `1px solid ${C.border}`,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'box-shadow 0.18s, border-color 0.18s',
        animationName: 'slideIn', animationDuration: '0.32s',
        animationDelay: `${index * 0.04}s`, animationFillMode: 'both',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = C.shadowMd;
        el.style.borderColor = 'rgba(30,58,138,0.22)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'none';
        el.style.borderColor = C.border;
      }}
    >
      <Avatar name={recruiter.name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, fontFamily: F.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {recruiter.name}
        </p>
        <p style={{ fontSize: 12, color: C.textLow, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: F.body }}>
          <Mail size={10} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recruiter.email}</span>
        </p>
      </div>

      <span style={{
        padding: '3px 10px', borderRadius: 99, flexShrink: 0,
        fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' as const,
        background: C.blueDim, color: C.blue,
        border: '1px solid rgba(37,99,235,0.20)', fontFamily: F.body,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Shield size={9} /> Recruiter
      </span>

      {!confirming && (
        <button
          onClick={() => setConfirming(true)}
          title="Remove recruiter"
          style={{
            width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.redBorder}`,
            background: C.redDim, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.red, transition: 'all 0.18s',
          }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.red; b.style.color = C.white; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.redDim; b.style.color = C.red; }}
        >
          <Trash2 size={13} />
        </button>
      )}

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

/* ── Skeleton ────────────────────────────────────────────────────────────── */
const Skeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        height: 72, borderRadius: 14,
        background: 'linear-gradient(90deg, rgba(30,58,138,0.06) 25%, rgba(30,58,138,0.10) 50%, rgba(30,58,138,0.06) 75%)',
        backgroundSize: '200% 100%',
        animation: `shimmer 1.4s ease infinite ${i * 0.12}s`,
      }} />
    ))}
  </div>
);

/* ── Empty state ─────────────────────────────────────────────────────────── */
const EmptyState: React.FC<{ searched: boolean }> = ({ searched }) => (
  <div style={{ textAlign: 'center' as const, padding: '60px 20px' }}>
    <div style={{
      width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
      background: C.blueDim, border: `1px solid rgba(37,99,235,0.15)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {searched ? <Search size={26} color={C.textFaint} /> : <UserX size={26} color={C.textFaint} />}
    </div>
    <p style={{ fontSize: 15, fontWeight: 700, color: C.textMid, margin: '0 0 6px', fontFamily: F.display }}>
      {searched ? 'No results found' : 'No recruiters yet'}
    </p>
    <p style={{ fontSize: 13, color: C.textFaint, margin: 0, fontFamily: F.body }}>
      {searched
        ? 'Try a different name or email.'
        : 'Use the "Add Recruiter" button to create the first recruiter account.'}
    </p>
  </div>
);

/* ── Page ────────────────────────────────────────────────────────────────── */
const ManageRecruitersPage: React.FC = () => {
  const [recruiters,   setRecruiters]   = useState<Recruiter[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [query,        setQuery]        = useState('');
  const [toast,        setToast]        = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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
      setTimeout(() => setToast(''), 3500);
    } catch {
      setError('Failed to delete recruiter. Please try again.');
    }
  };

  /** Called by CreateRecruiterModal after a successful create. */
  const handleRecruiterCreated = useCallback(() => {
    setShowAddModal(false);
    load();
  }, [load]);

  const filtered = recruiters.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div style={{ fontFamily: F.body, minHeight: '100%' }}>
      <style>{`
        @keyframes fadeIn  { from{opacity:0}                            to{opacity:1} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pageUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .rp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(420px,1fr)); gap:10px; }
        @media(max-width:600px){ .rp-grid{grid-template-columns:1fr;} }
        .rp-search-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24, animation: 'pageUp 0.35s ease both' }}>
        <div style={{
          background: C.gradPanel, borderRadius: 18, padding: '24px 26px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 14, position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(37,99,235,0.18)',
        }}>
          {/* deco blobs */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <Users size={20} color={C.white} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.4px', fontFamily: F.display }}>
                Manage Recruiters
              </h1>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0', fontFamily: F.body }}>
                {loading ? 'Loading…' : `${recruiters.length} recruiter${recruiters.length !== 1 ? 's' : ''} total`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            <button
              onClick={load} disabled={loading}
              title="Refresh"
              style={{
                height: 38, width: 38, borderRadius: 10,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.white, transition: 'all 0.18s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                height: 38, padding: '0 16px', borderRadius: 10, border: 'none',
                background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                color: C.white, fontSize: 13, fontWeight: 700, fontFamily: F.body,
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.26)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'}
            >
              Add Recruiter
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rp-search-row" style={{ marginBottom: 18, animation: 'pageUp 0.35s 0.05s ease both' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
          <Search size={13} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: C.textFaint, pointerEvents: 'none',
          }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              width: '100%', padding: '10px 12px 10px 34px',
              borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.surface, color: C.text,
              fontSize: 13, fontFamily: F.body, outline: 'none',
              boxSizing: 'border-box', boxShadow: C.shadow,
              transition: 'border-color 0.18s',
            }}
            onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = C.borderMid}
            onBlur={e =>  (e.currentTarget as HTMLInputElement).style.borderColor = C.border}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textFaint, display: 'flex', alignItems: 'center', padding: 2,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {!loading && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            <span style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: C.blueDim, color: C.blue, border: `1px solid rgba(37,99,235,0.20)`,
              fontFamily: F.body, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Shield size={10} /> {recruiters.length} Total
            </span>
            {query && (
              <span style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: 'rgba(13,148,136,0.08)', color: C.teal, border: `1px solid ${C.tealBorder}`,
                fontFamily: F.body,
              }}>
                {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          marginBottom: 14, padding: '11px 16px', borderRadius: 10,
          background: C.tealDim, border: `1px solid ${C.tealBorder}`,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease both',
        }}>
          <CheckCircle size={14} color={C.teal} />
          <span style={{ fontSize: 13, color: C.teal, fontWeight: 600, fontFamily: F.body }}>{toast}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 14, padding: '11px 16px', borderRadius: 10,
          background: C.redDim, border: `1px solid ${C.redBorder}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} color={C.red} />
          <span style={{ fontSize: 13, color: C.red, fontFamily: F.body }}>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading && <Skeleton count={6} />}

      {!loading && recruiters.length === 0 && !error && <EmptyState searched={false} />}
      {!loading && recruiters.length > 0 && filtered.length === 0 && <EmptyState searched={true} />}

      {!loading && filtered.length > 0 && (
        <div className="rp-grid">
          {filtered.map((r, i) => (
            <RecruiterCard key={r.id} recruiter={r} onDelete={handleDelete} index={i} />
          ))}
        </div>
      )}

      {/* Create recruiter modal */}
      {showAddModal && (
        <CreateRecruiterModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleRecruiterCreated}
        />
      )}
    </div>
  );
};

export default ManageRecruitersPage;