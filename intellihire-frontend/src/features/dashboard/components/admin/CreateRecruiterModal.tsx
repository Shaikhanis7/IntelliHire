// features/dashboard/components/admin/CreateRecruiterModal.tsx
// Light frosted-glass theme — Fraunces + DM Sans

import React, { useState } from 'react';
import {
  UserPlus, X, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle,
  Mail, Lock, User,
} from 'lucide-react';
import { adminService } from '../../../admin/services/admin.service';
import { C, F } from '../shared/DashboardShared';

/* ─── Field ──────────────────────────────────────────────────────────────── */
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

const Field: React.FC<FieldProps> = ({ label, type = 'text', value, onChange, placeholder, icon, error, right, disabled }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.textMid, marginBottom: 6, fontFamily: F.body }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: focused ? C.blue : C.textFaint, display: 'flex', transition: 'color 0.15s' }}>
          {icon}
        </span>
        <input
          type={type} value={value} disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '10px 36px 10px 36px',
            borderRadius: 9, fontSize: 13.5, fontFamily: F.body,
            border: `1.5px solid ${error ? C.danger : focused ? C.borderFocus : C.border}`,
            background: disabled ? C.surface : C.bgCard,
            color: C.text, outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: focused && !error ? `0 0 0 3px ${C.blue}14` : 'none',
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
        <p style={{ fontSize: 11.5, color: C.danger, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: F.body }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
};

/* ─── Modal ──────────────────────────────────────────────────────────────── */
type Status = 'idle' | 'loading' | 'success' | 'error';

interface CreateRecruiterModalProps {
  onClose:    () => void;
  onCreated?: () => void;
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
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus('loading'); setApiError('');
    try {
      await adminService.createRecruiter({ name, email, password });
      setStatus('success');
      onCreated?.();
    } catch (err: any) {
      setApiError(err?.response?.data?.detail ?? 'Something went wrong. Please try again.');
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
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,27,62,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'dbFadeIn 0.18s ease both' }}
    >
      <div style={{ width: '100%', maxWidth: 460, background: C.bgCard, borderRadius: 20, border: `1px solid ${C.borderMid}`, boxShadow: '0 24px 64px rgba(15,30,80,0.18)', animation: 'dbSlideUp 0.22s ease both', overflow: 'hidden' }}>

        {/* Top accent */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.teal})` }} />

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueDim, border: `1px solid ${C.blue}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={16} color={C.blue} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.3px', fontFamily: F.display }}>Create Recruiter</h2>
              <p style={{ fontSize: 11.5, color: C.textMuted, margin: 0, fontFamily: F.body }}>Admin · New recruiter account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.surface; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bgCard; }}
          >
            <X size={14} color={C.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px', background: C.tealDim, border: `1.5px solid ${C.tealBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={26} color={C.teal} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 6px', fontFamily: F.display }}>Recruiter created!</h3>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 24px', lineHeight: 1.65, fontFamily: F.body }}>
                <strong style={{ color: C.textMid }}>{name}</strong> ({email}) can now log in with the recruiter role.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={handleReset} style={secondaryBtn}>Create another</button>
                <button onClick={onClose}     style={primaryBtn}>Done</button>
              </div>
            </div>
          ) : (
            <>
              <Field label="Full Name"     value={name}     onChange={setName}     placeholder="Jane Doe"         icon={<User size={14} />} error={errors.name}     disabled={busy} />
              <Field label="Email Address" type="email"     value={email}    onChange={setEmail}    placeholder="jane@company.com" icon={<Mail size={14} />} error={errors.email}    disabled={busy} />
              <Field
                label="Temporary Password" type={showPw ? 'text' : 'password'}
                value={password} onChange={setPassword} placeholder="Min. 8 characters"
                icon={<Lock size={14} />} error={errors.password} disabled={busy}
                right={
                  <button onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', padding: 0 }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              {apiError && (
                <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 16, background: C.dangerDim, border: `1px solid ${C.dangerBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} color={C.danger} />
                  <span style={{ fontSize: 12.5, color: C.danger, fontFamily: F.body }}>{apiError}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose}      disabled={busy} style={{ ...secondaryBtn, flex: 1 }}>Cancel</button>
                <button onClick={handleSubmit} disabled={busy} style={{ ...primaryBtn, flex: 2, opacity: busy ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {busy
                    ? <><Loader2 size={14} style={{ animation: 'dbSpin 1s linear infinite' }} /> Creating…</>
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

const primaryBtn: React.CSSProperties   = { padding: '10px 18px', borderRadius: 9, border: 'none', background: C.gradBlue, color: C.white, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: F.body, boxShadow: C.shadowBlue, transition: 'all 0.18s' };
const secondaryBtn: React.CSSProperties = { padding: '10px 18px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.textMid, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: F.body, transition: 'all 0.18s' };

export default CreateRecruiterModal;