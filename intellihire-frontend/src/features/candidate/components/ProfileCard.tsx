// components/candidate/ProfileCard.tsx
import React, { useState } from 'react';
import {
  User, MapPin, Pencil, CheckCircle,
  Loader2, X, Plus,
} from 'lucide-react';
import { candidateService, type CandidateProfile, type UpdateProfilePayload } from '../services/candidate.service';

/* ─── Design tokens — exact match ───────────────────────────────────────────── */
const C = {
  bg:           '#080c14',
  border:       'rgba(79,125,255,0.15)',
  borderHov:    'rgba(79,125,255,0.4)',
  borderFocus:  '#4f7dff',
  blue:         '#4f7dff',
  blueLight:    '#6b93ff',
  blueDim:      'rgba(79,125,255,0.12)',
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:         '#06d6b0',
  tealDim:      'rgba(6,214,176,0.12)',
  tealBorder:   'rgba(6,214,176,0.3)',
  danger:       '#ff5f5f',
  dangerDim:    'rgba(255,95,95,0.12)',
  dangerBorder: 'rgba(255,95,95,0.3)',
  text:         '#e8eeff',
  textMuted:    '#7a8aaa',
  textFaint:    '#3d4d6a',
  shadowBlue:   '0 4px 18px rgba(79,125,255,0.35)',
};

/* ─── Shared input style ─────────────────────────────────────────────────────── */
const inputSt = (focused: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px',
  border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
  borderRadius: 9, fontSize: 13, color: C.text,
  background: 'rgba(255,255,255,0.04)', outline: 'none',
  fontFamily: 'inherit', fontWeight: 500,
  boxShadow: focused ? `0 0 0 3px rgba(79,125,255,0.18)` : 'none',
  transition: 'all 0.18s ease',
});

/* ─── Skill chip ─────────────────────────────────────────────────────────────── */
const SkillChip: React.FC<{ label: string; onRemove?: () => void }> = ({ label, onRemove }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: C.blueDim, color: C.blueLight, border: `1px solid rgba(79,125,255,0.22)` }}>
    {label}
    {onRemove && (
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blueLight, display: 'flex', padding: 0, marginLeft: 2, opacity: 0.7, transition: 'opacity 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}>
        <X size={11}/>
      </button>
    )}
  </span>
);

const LabelText: React.CSSProperties = {
  fontSize: 10.5, color: C.textFaint, fontWeight: 700,
  letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5,
};

/* ─── Main component ─────────────────────────────────────────────────────────── */
export const ProfileCard: React.FC<{
  profile:   CandidateProfile;
  onUpdated: (p: CandidateProfile) => void;
}> = ({ profile, onUpdated }) => {
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [name, setName]             = useState(profile.name);
  const [location, setLocation]     = useState(profile.location ?? '');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills]         = useState<string[]>(candidateService.parseSkills(profile.skills));
  const [fName, setFName]           = useState(false);
  const [fLoc, setFLoc]             = useState(false);
  const [fSkill, setFSkill]         = useState(false);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const payload: UpdateProfilePayload = { name, location: location || undefined, skills: skills.join(', ') || undefined };
      const updated = await candidateService.updateProfile(payload);
      onUpdated(updated);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setEditing(false); }, 1200);
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    setName(profile.name);
    setLocation(profile.location ?? '');
    setSkills(candidateService.parseSkills(profile.skills));
    setSkillInput(''); setError(null); setEditing(false);
  };

  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  return (
    <div style={{ background: 'rgba(13,18,32,0.78)', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      {/* Gradient header stripe */}
      <div style={{ height: 72, background: 'linear-gradient(145deg, rgba(42,79,255,0.5) 0%, rgba(79,125,255,0.35) 55%, rgba(6,214,176,0.2) 100%)', position: 'relative', borderBottom: `1px solid ${C.border}` }}>
        {/* Edit button */}
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ position: 'absolute', top: 12, right: 14, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}>
            <Pencil size={11}/> Edit profile
          </button>
        )}
      </div>

      {/* Avatar — overlaps the stripe */}
      <div style={{ padding: '0 20px 22px', marginTop: -30 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: C.gradBlue, border: `3px solid rgba(13,18,32,0.9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', boxShadow: C.shadowBlue, marginBottom: 14 }}>
          {initials || <User size={22}/>}
        </div>

        {!editing ? (
          /* ── View mode ── */
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.4px', marginBottom: 4, fontFamily: "'Clash Display', sans-serif" }}>{profile.name}</div>
            {profile.location && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: C.textMuted, marginBottom: 16 }}>
                <MapPin size={12} style={{ color: C.textFaint }}/> {profile.location}
              </div>
            )}
            {skills.length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, color: C.textFaint, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {skills.map((s, i) => <SkillChip key={i} label={s}/>)}
                </div>
              </div>
            )}
            {skills.length === 0 && !profile.location && (
              <p style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>No profile details yet — click Edit to add your skills and location.</p>
            )}
          </div>
        ) : (
          /* ── Edit mode ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ padding: '9px 13px', background: C.dangerDim, border: `1px solid ${C.dangerBorder}`, borderRadius: 9, color: C.danger, fontSize: 12.5 }}>{error}</div>
            )}

            {/* Name */}
            <div>
              <label style={LabelText}>Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} onFocus={() => setFName(true)} onBlur={() => setFName(false)} style={inputSt(fName)} placeholder="Your full name"/>
            </div>

            {/* Location */}
            <div>
              <label style={LabelText}>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} onFocus={() => setFLoc(true)} onBlur={() => setFLoc(false)} style={inputSt(fLoc)} placeholder="City, Country"/>
            </div>

            {/* Skills */}
            <div>
              <label style={LabelText}>Skills</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onFocus={() => setFSkill(true)} onBlur={() => setFSkill(false)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} style={{ ...inputSt(fSkill), flex: 1 }} placeholder="Add a skill, press Enter…"/>
                <button onClick={addSkill}
                  style={{ padding: '9px 13px', borderRadius: 9, background: C.blueDim, border: `1px solid rgba(79,125,255,0.3)`, color: C.blueLight, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,125,255,0.22)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.blueDim; }}>
                  <Plus size={12}/> Add
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {skills.map((s, i) => <SkillChip key={i} label={s} onRemove={() => setSkills(prev => prev.filter((_, j) => j !== i))}/>)}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '10px', background: success ? C.teal : C.gradBlue, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', transition: 'opacity 0.2s', boxShadow: C.shadowBlue, opacity: saving ? 0.7 : 1 }}>
                {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> Saving…</> : success ? <><CheckCircle size={13}/> Saved!</> : 'Save changes'}
              </button>
              <button onClick={handleCancel}
                style={{ padding: '10px 16px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', fontSize: 12.5, fontWeight: 600, color: C.textMuted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderFocus; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;