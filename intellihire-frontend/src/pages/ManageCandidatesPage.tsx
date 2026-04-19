// features/admin/pages/ManageCandidatesPage.tsx
// Full-page candidate management — NOT a modal.
// Add route: <Route path="/manage-candidates" element={<ManageCandidatesPage />} />
// Add to nav in DashboardLayout (admin-only).
//
// Backend:  GET    /admin/users          → returns all users; filtered client-side to role === 'candidate'
//           DELETE /admin/users/:id      → deletes any user by id

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Trash2, Loader2, AlertCircle, CheckCircle,
  RefreshCw, UserX, Mail, Search, UserCheck,
  X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import axiosInstance from '../lib/axios';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface Candidate {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}

/* ─────────────────────────────────────────────
   Service
───────────────────────────────────────────── */
const candidateService = {
  listCandidates: async (): Promise<Candidate[]> => {
    const { data } = await axiosInstance.get<Candidate[]>('/admin/users');
    return data.filter((u) => u.role === 'candidate');
  },
  deleteCandidate: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/admin/users/${id}`);
  },
};

/* ── Design tokens — mirrors ManageRecruiters exactly ───────────────────── */
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
  shadow:       '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.05)',

  // Fonts
  body:         "'DM Sans', system-ui, sans-serif",
  display:      "'Fraunces', serif",
};

const PAGE_SIZE = 12;

/* ─────────────────────────────────────────────
   Avatar
───────────────────────────────────────────── */
const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: T.gradBlue, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: T.white,
      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
      fontFamily: T.body,
    }}>
      {initials}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Delete confirm overlay
───────────────────────────────────────────── */
const DeleteConfirm: React.FC<{
  name:      string;
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}> = ({ name, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 14,
    background: 'rgba(254,242,242,0.97)', backdropFilter: 'blur(4px)',
    border: `1.5px solid ${T.redBorder}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 14px', gap: 10, zIndex: 2,
    animation: 'fadeIn 0.15s ease both',
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
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.body,
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: loading ? 0.7 : 1,
      }}>
        {loading
          ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
          : <Trash2 size={11} />}
        Delete
      </button>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Candidate card
───────────────────────────────────────────── */
const CandidateCard: React.FC<{
  candidate: Candidate;
  onDelete:  (id: number) => Promise<void>;
  index:     number;
}> = ({ candidate, onDelete, index }) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [deleted,    setDeleted]    = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onDelete(candidate.id);
    setDeleted(true);
  };

  if (deleted) return null;

  return (
    <div
      style={{
        position: 'relative', borderRadius: 14,
        background: T.surface, border: `1px solid ${T.border}`,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'box-shadow 0.18s, border-color 0.18s',
        animationName: 'slideIn', animationDuration: '0.32s',
        animationDelay: `${index * 0.04}s`, animationFillMode: 'both',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow   = T.shadowMd;
        el.style.borderColor = 'rgba(30,58,138,0.20)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow   = 'none';
        el.style.borderColor = T.border;
      }}
    >
      <Avatar name={candidate.name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13.5, fontWeight: 700, color: T.textHi, margin: 0,
          fontFamily: T.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {candidate.name}
        </p>
        <p style={{
          fontSize: 11.5, color: T.textLow, margin: '2px 0 0',
          display: 'flex', alignItems: 'center', gap: 4, fontFamily: T.body,
        }}>
          <Mail size={10} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {candidate.email}
          </span>
        </p>
      </div>

      {/* Role badge */}
      <span style={{
        padding: '3px 9px', borderRadius: 99, flexShrink: 0,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
        textTransform: 'uppercase' as const,
        background: 'rgba(37,99,235,0.08)', color: T.blue,
        border: '1px solid rgba(37,99,235,0.20)', fontFamily: T.body,
        display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
      }}>
        <UserCheck size={9} /> Candidate
      </span>

      {!confirming && (
        <button
          onClick={() => setConfirming(true)}
          title="Remove candidate"
          style={{
            width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.redBorder}`,
            background: T.redDim, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.red, transition: 'all 0.18s',
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = T.red;
            b.style.color      = T.white;
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = T.redDim;
            b.style.color      = T.red;
          }}
        >
          <Trash2 size={13} />
        </button>
      )}

      {confirming && (
        <DeleteConfirm
          name={candidate.name}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
          loading={deleting}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Skeleton loader
───────────────────────────────────────────── */
const Skeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: 8 }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        height: 66, borderRadius: 14,
        background: 'linear-gradient(90deg, rgba(30,58,138,0.06) 25%, rgba(30,58,138,0.10) 50%, rgba(30,58,138,0.06) 75%)',
        backgroundSize: '200% 100%',
        animation: `shimmer 1.4s ease infinite ${i * 0.1}s`,
      }} />
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
const EmptyState: React.FC<{ searched: boolean }> = ({ searched }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{
      width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
      background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {searched ? <Search size={24} color={T.textFaint} /> : <UserX size={24} color={T.textFaint} />}
    </div>
    <p style={{ fontSize: 14, fontWeight: 700, color: T.textMid, margin: '0 0 5px', fontFamily: T.display }}>
      {searched ? 'No results found' : 'No candidates yet'}
    </p>
    <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0, fontFamily: T.body }}>
      {searched
        ? 'Try a different name or email.'
        : 'Candidates will appear here once they register on the platform.'}
    </p>
  </div>
);

/* ─────────────────────────────────────────────
   Pagination
───────────────────────────────────────────── */
const Pagination: React.FC<{
  page:     number;
  total:    number;
  pageSize: number;
  onChange: (p: number) => void;
}> = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    minWidth: 32, height: 32, padding: '0 10px', borderRadius: 8,
    border: `1px solid ${active ? 'rgba(37,99,235,0.28)' : '#e5e7eb'}`,
    background: active ? 'rgba(37,99,235,0.08)' : T.white,
    color: active ? T.blue : disabled ? '#d1d5db' : '#6b7280',
    fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: T.body,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: '1.25rem', flexWrap: 'wrap' }}>
      <button style={btnStyle(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: 13 }}>…</span>
        ) : (
          <button key={p} style={btnStyle(p === page)} onClick={() => onChange(p as number)}>{p}</button>
        )
      )}
      <button style={btnStyle(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
const ManageCandidatesPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [query,      setQuery]      = useState('');
  const [page,       setPage]       = useState(1);
  const [toast,      setToast]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await candidateService.listCandidates();
      setCandidates(data);
    } catch {
      setError('Failed to load candidates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await candidateService.deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setToast('Candidate removed successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setError('Failed to delete candidate. Please try again.');
    }
  };

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setPage(1); }, [query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage   = Math.min(page, Math.max(1, totalPages));
  const pageSlice  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div style={{ fontFamily: T.body, minHeight: '100%', padding: '0 0 40px', background: T.bg }}>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                              to { opacity: 1 } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes spin    { to   { transform: rotate(360deg) } }
        @keyframes shimmer { 0%   { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes pageUp  { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .cp-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 8px; }
        @media (max-width: 600px) { .cp-grid { grid-template-columns: 1fr; } }
        .cp-search::placeholder { color: rgba(255,255,255,0.5); }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20, animation: 'pageUp 0.35s ease both' }}>
        <div style={{
          background: 'linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
          borderRadius: 18, padding: '20px 22px',
          display: 'flex', alignItems: 'flex-start', flexDirection: 'column',
          gap: 14, position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(30,58,138,0.22)',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          {/* Title row */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
                <h1 style={{ fontSize: 17, fontWeight: 800, color: T.white, margin: 0, letterSpacing: '-0.4px', fontFamily: T.display }}>
                  Manage Candidates
                </h1>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', margin: 0, fontFamily: T.body }}>
                  {loading ? 'Loading…' : `${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} total`}
                </p>
              </div>
            </div>

            <button
              onClick={load}
              disabled={loading}
              title="Refresh"
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.white, transition: 'all 0.18s',
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Search bar inside header — matches ManageRecruiters exactly */}
          {!loading && candidates.length > 0 && (
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={13} style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.5)',
              }} />
              <input
                className="cp-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                style={{
                  width: '100%', padding: '9px 32px 9px 32px',
                  borderRadius: 10, border: '1px solid rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                  color: T.white, fontSize: 13, fontFamily: T.body, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', padding: 2,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stat chips ── */}
      {!loading && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, animation: 'pageUp 0.35s 0.05s ease both' }}>
          <span style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: 'rgba(37,99,235,0.08)', color: T.blue,
            border: '1px solid rgba(37,99,235,0.20)', fontFamily: T.body,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <UserCheck size={10} /> {candidates.length} Total
          </span>
          {query && (
            <span style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: 'rgba(100,116,139,0.08)', color: T.textMid,
              border: '1px solid rgba(100,116,139,0.20)', fontFamily: T.body,
            }}>
              {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: T.tealDim, border: '1px solid rgba(13,148,136,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease both',
        }}>
          <CheckCircle size={14} color={T.teal} />
          <span style={{ fontSize: 12.5, color: T.teal, fontWeight: 600, fontFamily: T.body }}>{toast}</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: T.redDim, border: `1px solid ${T.redBorder}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} color={T.red} />
          <span style={{ fontSize: 12.5, color: T.red, fontFamily: T.body }}>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, display: 'flex', alignItems: 'center' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading && <Skeleton count={PAGE_SIZE} />}
      {!loading && candidates.length === 0 && !error && <EmptyState searched={false} />}
      {!loading && candidates.length > 0 && filtered.length === 0 && <EmptyState searched={true} />}

      {!loading && filtered.length > 0 && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, flexWrap: 'wrap', gap: 6,
          }}>
            <span style={{ fontSize: 11.5, color: T.textFaint, fontFamily: T.body }}>
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
            </span>
            {totalPages > 1 && (
              <span style={{ fontSize: 11.5, color: T.textFaint, fontFamily: T.body }}>
                Page {safePage} of {totalPages}
              </span>
            )}
          </div>

          <div className="cp-grid">
            {pageSlice.map((c, i) => (
              <CandidateCard key={c.id} candidate={c} onDelete={handleDelete} index={i} />
            ))}
          </div>

          <Pagination page={safePage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default ManageCandidatesPage;