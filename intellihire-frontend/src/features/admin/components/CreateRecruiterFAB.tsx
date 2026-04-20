// features/admin/components/CreateRecruiterFAB.tsx

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  UserPlus, X, Eye, EyeOff, Loader2,
  CheckCircle, AlertCircle, Mail, Lock, User,
} from 'lucide-react';

import { adminService } from '../services/admin.service';
import type { RootState } from '../../../app/store';

/* ── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  primary:      '#1a56db',
  primaryDark:  '#1e40af',
  primaryLight: '#eff6ff',
  success:      '#059669',
  successLight: '#ecfdf5',
  danger:       '#dc2626',
  dangerLight:  '#fef2f2',
  white:        '#ffffff',
  gray50:       '#f8fafc',
  gray100:      '#f1f5f9',
  gray200:      '#e2e8f0',
  gray300:      '#cbd5e1',
  gray400:      '#94a3b8',
  gray500:      '#64748b',
  gray700:      '#334155',
  gray900:      '#0f172a',
  shadow:       '0 4px 14px rgba(26,86,219,0.28)',
  shadowLg:     '0 20px 60px rgba(0,0,0,0.18)',
};

/* ── Reusable labelled input ─────────────────────────────────────────────── */
interface FieldProps {
  label:        string;
  type?:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  icon:         React.ReactNode;
  error?:       string;
  right?:       React.ReactNode;
  disabled?:    boolean;
}

const Field: React.FC<FieldProps> = ({
  label, type = 'text', value, onChange, placeholder,
  icon, error, right, disabled,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: T.gray700, marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: focused ? T.primary : T.gray400, display: 'flex', transition: 'color 0.15s',
        }}>
          {icon}
        </span>

        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%', padding: '10px 36px 10px 36px',
            borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit',
            border: `1.5px solid ${error ? T.danger : focused ? T.primary : T.gray200}`,
            background: disabled ? T.gray50 : T.white,
            color: T.gray900, outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: focused && !error ? `0 0 0 3px ${T.primary}18` : 'none',
            boxSizing: 'border-box',
          }}
        />

        {right && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            {right}
          </span>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 11.5, color: T.danger, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

/* ── Modal ───────────────────────────────────────────────────────────────── */
type Status = 'idle' | 'loading' | 'success' | 'error';

interface CreateRecruiterModalProps {
  onClose:     () => void;
  /** Called after a recruiter is successfully created. */
  onCreated?:  () => void;
}

export const CreateRecruiterModal: React.FC<CreateRecruiterModalProps> = ({ onClose, onCreated }) => {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [status,   setStatus]   = useState<Status>('idle');
  const [apiError, setApiError] = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())                                    e.name     = 'Name is required.';
    if (!email.trim())                                   e.email    = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email    = 'Enter a valid email.';
    if (!password)                                       e.password = 'Password is required.';
    else if (password.length < 8)                        e.password = 'Minimum 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus('loading');
    setApiError('');
    try {
      await adminService.createRecruiter({ name, email, password });
      setStatus('success');
      onCreated?.();
    } catch (err: any) {
      setApiError(
        err?.response?.data?.detail ?? 'Something went wrong. Please try again.',
      );
      setStatus('error');
    }
  };

  const handleReset = () => {
    setName(''); setEmail(''); setPassword('');
    setStatus('idle'); setApiError(''); setErrors({});
  };

  const busy = status === 'loading';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.18s ease both',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        background: T.white, borderRadius: 20,
        boxShadow: T.shadowLg,
        animation: 'slideUp 0.22s ease both',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${T.gray200}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: T.primaryLight, border: `1px solid ${T.primary}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={16} color={T.primary} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: T.gray900, margin: 0, letterSpacing: '-0.3px' }}>
                Create Recruiter
              </h2>
              <p style={{ fontSize: 11.5, color: T.gray500, margin: 0 }}>Admin · New recruiter account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.gray200}`,
              background: T.white, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.gray100; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.white; }}
          >
            <X size={14} color={T.gray500} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
                background: T.successLight, border: `1.5px solid ${T.success}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={26} color={T.success} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.gray900, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                Recruiter created!
              </h3>
              <p style={{ fontSize: 13, color: T.gray500, margin: '0 0 24px', lineHeight: 1.6 }}>
                <strong style={{ color: T.gray700 }}>{name}</strong> ({email}) can now log in with the recruiter role.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={handleReset} style={secondaryBtn}>Create another</button>
                <button onClick={onClose}     style={primaryBtn}>Done</button>
              </div>
            </div>
          ) : (
            <>
              <Field
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Jane Doe"
                icon={<User size={14} />}
                error={errors.name}
                disabled={busy}
              />
              <Field
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="jane@company.com"
                icon={<Mail size={14} />}
                error={errors.email}
                disabled={busy}
              />
              <Field
                label="Temporary Password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Min. 8 characters"
                icon={<Lock size={14} />}
                error={errors.password}
                disabled={busy}
                right={
                  <button
                    onClick={() => setShowPw(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.gray400, display: 'flex', padding: 0 }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {apiError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 9, marginBottom: 16,
                  background: T.dangerLight, border: `1px solid ${T.danger}25`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle size={14} color={T.danger} />
                  <span style={{ fontSize: 12.5, color: T.danger }}>{apiError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ ...secondaryBtn, flex: 1 }} disabled={busy}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={busy}
                  style={{
                    ...primaryBtn, flex: 2,
                    opacity: busy ? 0.75 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  {busy
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
                    : <><UserPlus size={14} /> Create Recruiter</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Shared button styles ────────────────────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 9, border: 'none',
  background: T.primary, color: T.white,
  fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all 0.18s',
};
const secondaryBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 9,
  border: `1.5px solid ${T.gray200}`, background: T.white,
  color: T.gray700, fontSize: 13.5, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s',
};

/* ── FAB ─────────────────────────────────────────────────────────────────── */
export const CreateRecruiterFAB: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const [open,  setOpen]  = useState(false);
  const [label, setLabel] = useState(false);

  if (user?.role !== 'admin') return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; }               to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to   { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: 'fixed', right: 28, bottom: 28, zIndex: 900 }}>
        {label && (
          <div style={{
            position: 'absolute', right: 58, top: '50%', transform: 'translateY(-50%)',
            background: T.gray900, color: T.white,
            fontSize: 12, fontWeight: 600, padding: '5px 10px',
            borderRadius: 7, whiteSpace: 'nowrap',
            pointerEvents: 'none', animation: 'fadeIn 0.15s ease',
          }}>
            Create Recruiter
            <span style={{
              position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: `5px solid ${T.gray900}`,
            }} />
          </div>
        )}

        <button
          onClick={() => setOpen(true)}
          onMouseEnter={() => setLabel(true)}
          onMouseLeave={() => setLabel(false)}
          title="Create Recruiter"
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(145deg, #1246a8 0%, #1a5ae0 55%, #2d77f7 100%)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 24px rgba(26,86,219,0.38)',
            transition: 'transform 0.18s, box-shadow 0.18s',
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)'; }}
          onMouseUp={e =>   { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          <UserPlus size={20} color={T.white} />
        </button>
      </div>

      {open && (
        <CreateRecruiterModal onClose={() => setOpen(false)} />
      )}
    </>
  );
};

export default CreateRecruiterFAB;