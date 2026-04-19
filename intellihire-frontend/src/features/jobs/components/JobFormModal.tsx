// features/jobs/components/JobFormModal.tsx

import React, {
  useState, useEffect, useCallback,
  type KeyboardEvent,
  useRef,
} from 'react';
import {
  X, Briefcase, MapPin, Clock, Sparkles, Wand2,
  Plus, ChevronDown, ChevronUp, Loader2, AlertCircle,
  CheckCircle, Tag, ArrowRight, RefreshCw,
} from 'lucide-react';
import axiosInstance from '../../../lib/axios';
import type { Job } from '../types/job.types';

/* ─── tokens ───────────────────────────────────────────────────── */
const C = {
  bg:          '#f0f5ff',
  surface:     '#f5f8ff',
  surfaceDeep: '#e8effe',
  border:      'rgba(79,125,255,0.13)',
  borderMid:   'rgba(79,125,255,0.22)',
  borderFocus: '#4f7dff',
  blue:        '#4f7dff',
  blueLight:   '#6b93ff',
  blueDark:    '#2a4fff',
  blueDim:     'rgba(79,125,255,0.10)',
  gradBlue:    'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:        '#06d6b0',
  tealDim:     'rgba(6,214,176,0.10)',
  tealBorder:  'rgba(6,214,176,0.30)',
  indigo:      '#9b6dff',
  indigoDim:   'rgba(155,109,255,0.09)',
  amber:       '#f59e0b',
  amberDim:    'rgba(245,158,11,0.09)',
  amberBorder: 'rgba(245,158,11,0.30)',
  danger:      '#ef4444',
  dangerDim:   'rgba(239,68,68,0.08)',
  dangerBorder:'rgba(239,68,68,0.28)',
  text:        '#0d1b3e',
  textMid:     '#1e3260',
  textMuted:   '#4f6a9a',
  textFaint:   '#8fa3c8',
  white:       '#ffffff',
  shadow:      '0 1px 3px rgba(15,30,80,0.06), 0 6px 20px rgba(15,30,80,0.07)',
  shadowBlue:  '0 4px 22px rgba(79,125,255,0.28)',
};

/* ─── types ────────────────────────────────────────────────────── */
export interface JobFormData {
  title:               string;
  description:         string;
  skills_required:     string[];
  experience_required: number;
  location:            string;
}

export interface JobFormModalProps {
  isOpen:   boolean;
  mode:     'create' | 'edit';
  job?:     Job | null;
  saving:   boolean;
  onClose:  () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
}

interface GeneratedJD {
  title:            string;
  summary:          string;
  responsibilities: string[];
  requirements:     string[];
  nice_to_have:     string[];
  benefits:         string[];
  suggested_skills: string[];
  full_description: string;
}

/* ─── helpers ──────────────────────────────────────────────────── */
const parseSkills = (s: string | string[] | null | undefined): string[] => {
  if (!s) return [];
  if (Array.isArray(s)) return s.map(x => x.trim()).filter(Boolean);
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

/* ═══════════════════════════════════════════════════════════════
   SKILL TAG INPUT
═══════════════════════════════════════════════════════════════ */
interface SkillTagInputProps {
  skills:    string[];
  onChange:  (skills: string[]) => void;
  disabled?: boolean;
}

const SkillTagInput: React.FC<SkillTagInputProps> = ({ skills, onChange, disabled }) => {
  const [inputVal, setInputVal] = useState('');
  const [focused,  setFocused]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = (raw: string) => {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const toAdd = parts.filter(p => !skills.includes(p));
    if (toAdd.length) onChange([...skills, ...toAdd]);
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      addSkill(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && skills.length) {
      onChange(skills.slice(0, -1));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (inputVal.trim()) addSkill(inputVal);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    addSkill(e.clipboardData.getData('text'));
  };

  return (
    <div
      onMouseDown={e => { e.stopPropagation(); if (!disabled) inputRef.current?.focus(); }}
      onClick={e => e.stopPropagation()}
      style={{
        minHeight: 44,
        padding: '6px 10px',
        border: `1.5px solid ${focused ? C.borderFocus : C.borderMid}`,
        borderRadius: 10,
        background: disabled ? C.surfaceDeep : C.white,
        boxShadow: focused ? `0 0 0 3px rgba(79,125,255,0.10)` : 'none',
        cursor: disabled ? 'default' : 'text',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5,
        alignItems: 'center',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {skills.map((skill, idx) => (
        <span key={idx} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '3px 8px', borderRadius: 6,
          background: C.blueDim, border: `1px solid ${C.borderMid}`,
          fontSize: 12.5, fontWeight: 600, color: C.blue, lineHeight: 1.5,
          userSelect: 'none',
        }}>
          {skill}
          {!disabled && (
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onChange(skills.filter((_, i) => i !== idx)); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blueLight, display: 'flex', padding: '0 0 0 1px', lineHeight: 1, alignItems: 'center' }}
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          onPaste={handlePaste}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          placeholder={skills.length ? '' : 'Type a skill, press comma or Enter…'}
          style={{
            flex: 1, minWidth: 160, border: 'none', outline: 'none',
            background: 'transparent', fontSize: 13, color: C.text,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            padding: '3px 0', cursor: 'text',
          }}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   JD STRUCTURED PREVIEW
═══════════════════════════════════════════════════════════════ */
const JDPreview: React.FC<{ jd: GeneratedJD; onUse: () => void }> = ({ jd, onUse }) => {
  const [open, setOpen] = useState(false);

  const BulletSection: React.FC<{ label: string; items: string[]; color: string }> = ({ label, items, color }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 11 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</div>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
            <span style={{ color, fontSize: 11, marginTop: 2, flexShrink: 0 }}>▸</span>
            <span style={{ fontSize: 12.5, color: C.textMid, lineHeight: 1.5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{item}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{ border: `1px solid ${C.tealBorder}`, borderRadius: 10, overflow: 'hidden', marginTop: 10 }}
    >
      <div
        onMouseDown={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: C.tealDim, cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={12} style={{ color: C.teal, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.teal, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            JD generated · {jd.responsibilities.length} responsibilities · {jd.requirements.length} requirements
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onUse(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: C.teal, border: 'none', color: C.white, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            <ArrowRight size={10} /> Use this JD
          </button>
          {open ? <ChevronUp size={13} style={{ color: C.teal }} /> : <ChevronDown size={13} style={{ color: C.teal }} />}
        </div>
      </div>
      {open && (
        <div style={{ padding: '14px 14px', background: C.white, borderTop: `1px solid ${C.tealBorder}` }}>
          {jd.summary && <p style={{ fontSize: 12.5, color: C.textMid, marginBottom: 12, lineHeight: 1.6, fontStyle: 'italic', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{jd.summary}</p>}
          <BulletSection label="Responsibilities" items={jd.responsibilities} color={C.blue}   />
          <BulletSection label="Requirements"     items={jd.requirements}     color={C.indigo} />
          <BulletSection label="Nice to have"     items={jd.nice_to_have}     color={C.teal}   />
          <BulletSection label="Benefits"         items={jd.benefits}         color={C.amber}  />
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN MODAL
═══════════════════════════════════════════════════════════════ */
export const JobFormModal: React.FC<JobFormModalProps> = ({
  isOpen, mode, job, saving, onClose, onSubmit,
}) => {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [skills,      setSkills]      = useState<string[]>([]);
  const [experience,  setExperience]  = useState(0);
  const [location,    setLocation]    = useState('');
  const [extraCtx,    setExtraCtx]    = useState('');

  const [generating,   setGenerating]   = useState(false);
  const [enhancing,    setEnhancing]    = useState(false);
  const [extracting,   setExtracting]   = useState(false);
  const [generatedJD,  setGeneratedJD]  = useState<GeneratedJD | null>(null);
  const [aiError,      setAiError]      = useState('');
  const [showCtxInput, setShowCtxInput] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── reset on open ── */
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && job) {
      setTitle(job.title ?? '');
      setDescription(job.description ?? '');
      setSkills(parseSkills(job.skills_required));
      setExperience(job.experience_required ?? 0);
      setLocation(job.location ?? '');
    } else {
      setTitle(''); setDescription(''); setSkills([]);
      setExperience(0); setLocation(''); setExtraCtx('');
    }
    setGeneratedJD(null); setAiError(''); setErrors({});
    setShowCtxInput(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── core JD generator ── */
  const doGenerateJD = useCallback(async (
    t: string, s: string[], exp: number, loc: string, ctx: string,
  ) => {
    setGenerating(true); setAiError('');
    try {
      const res = await axiosInstance.post('/jobs/generate-jd', {
        title: t, skills: s,
        experience_years: exp,
        location: loc || undefined,
        extra_context: ctx || undefined,
      });
      setGeneratedJD(res.data);
    } catch (e: any) {
      setAiError(e?.response?.data?.detail ?? 'JD generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleGenerateJD = () => {
    doGenerateJD(title, skills, experience, location, extraCtx);
  };

  const handleEnhanceJD = async () => {
    if (!description.trim()) return;
    setEnhancing(true); setAiError('');
    try {
      const res = await axiosInstance.post('/jobs/enhance-jd', { title: title || 'Job', description, skills });
      setDescription(res.data.enhanced_description ?? description);
    } catch (e: any) {
      setAiError(e?.response?.data?.detail ?? 'Enhancement failed.');
    } finally { setEnhancing(false); }
  };

  const handleExtractSkills = async () => {
    if (!description.trim()) return;
    setExtracting(true); setAiError('');
    try {
      const res = await axiosInstance.post('/jobs/extract-skills', { description });
      const extracted: string[] = res.data.skills ?? [];
      setSkills(prev => [...prev, ...extracted.filter(s => !prev.includes(s))]);
    } catch (e: any) {
      setAiError(e?.response?.data?.detail ?? 'Skill extraction failed.');
    } finally { setExtracting(false); }
  };

  // only apply the description — never touch skills
  const applyGeneratedJD = () => {
    if (!generatedJD) return;
    setDescription(generatedJD.full_description);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim())       e.title       = 'Job title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!skills.length)      e.skills      = 'Add at least one skill';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({
      title:               title.trim(),
      description:         description.trim(),
      skills_required:     skills,
      experience_required: experience,
      location:            location.trim(),
    });
  };

  if (!isOpen) return null;

  const aiWorking = generating || enhancing || extracting;

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: `1.5px solid ${C.borderMid}`,
    borderRadius: 10, fontSize: 13.5, color: C.text,
    background: C.white, outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'border-color 0.15s, box-shadow 0.15s',
    display: 'block', boxSizing: 'border-box',
  };

  const FieldLabel: React.FC<{ text: string; required?: boolean; error?: string; hint?: string }> = ({ text, required, error, hint }) => (
    <div style={{ marginBottom: 5 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: error ? C.danger : C.textMid, fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '0.01em' }}>
        {text}{required && <span style={{ color: C.danger, fontSize: 11, marginLeft: 2 }}>*</span>}
      </span>
      {hint  && !error && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: C.danger, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}><AlertCircle size={10} />{error}</div>}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700;800&display=swap');
        .jfm-input:focus { border-color: ${C.borderFocus} !important; box-shadow: 0 0 0 3px rgba(79,125,255,0.10) !important; }
        .jfm-ta:focus    { border-color: ${C.borderFocus} !important; box-shadow: 0 0 0 3px rgba(79,125,255,0.10) !important; }
        .jfm-btn { transition: opacity 0.15s, transform 0.15s, filter 0.15s; }
        .jfm-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .jfm-btn:disabled { opacity: 0.48; cursor: not-allowed !important; pointer-events: none; }
        @keyframes jfmFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes jfmSpin   { to{transform:rotate(360deg)} }
      `}</style>

      <div
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(13,27,62,0.55)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}
      >
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            background: C.white,
            border: `1px solid ${C.borderMid}`,
            borderRadius: 22,
            width: '100%', maxWidth: 580,
            boxShadow: '0 24px 64px rgba(15,30,80,0.20)',
            animation: 'jfmFadeUp 0.25s cubic-bezier(0.22,1,0.36,1) both',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'hidden',
          }}
        >
          {/* accent bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.teal})`, flexShrink: 0 }} />

          {/* header */}
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`, boxShadow: C.shadowBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Briefcase size={18} color={C.white} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', margin: 0, fontFamily: "'Fraunces', Georgia, serif" }}>
                  {mode === 'create' ? 'Post a new job' : 'Edit job posting'}
                </h2>
                <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {mode === 'create' ? 'Fill in the details, then click Generate JD' : `Editing: ${job?.title ?? ''}`}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', padding: 4, flexShrink: 0, borderRadius: 6 }}>
              <X size={18} />
            </button>
          </div>

          {/* scrollable body */}
          <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <FieldLabel text="Job title" required error={errors.title} />
              <input
                className="jfm-input"
                value={title}
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                placeholder="e.g. Senior Backend Engineer"
                style={errors.title ? { ...inputBase, borderColor: C.danger } : inputBase}
              />
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 16 }}>
              <FieldLabel text="Required skills" required error={errors.skills} hint="Type a skill → comma / Enter / Tab to add. Paste a comma-list to bulk-add." />
              <SkillTagInput
                skills={skills}
                onChange={s => { setSkills(s); setErrors(p => ({ ...p, skills: '' })); }}
              />
            </div>

            {/* Experience + Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <FieldLabel text="Min. experience (yrs)" />
                <div style={{ position: 'relative' }}>
                  <Clock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint, pointerEvents: 'none' }} />
                  <input
                    className="jfm-input"
                    type="number" min={0} max={30}
                    value={experience}
                    onChange={e => setExperience(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ ...inputBase, paddingLeft: 30 }}
                  />
                </div>
              </div>
              <div>
                <FieldLabel text="Location" />
                <div style={{ position: 'relative' }}>
                  <MapPin size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textFaint, pointerEvents: 'none' }} />
                  <input
                    className="jfm-input"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Remote / City, Country"
                    style={{ ...inputBase, paddingLeft: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* AI panel */}
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: `linear-gradient(135deg, ${C.blueDim}, ${C.indigoDim})`, border: `1px solid ${C.borderMid}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Sparkles size={13} style={{ color: C.indigo }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.textMid, fontFamily: "'DM Sans', system-ui, sans-serif" }}>AI Job Description Generator</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button" className="jfm-btn"
                    onClick={() => setShowCtxInput(s => !s)}
                    disabled={aiWorking}
                    style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.borderMid}`, background: C.white, color: C.textMuted, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    {showCtxInput ? 'Hide context' : 'Add context'}
                  </button>
                  <button
                    type="button" className="jfm-btn"
                    onClick={handleGenerateJD}
                    disabled={aiWorking || !title.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, background: !title.trim() ? C.surfaceDeep : C.gradBlue, border: 'none', color: !title.trim() ? C.textFaint : C.white, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: !title.trim() ? 'none' : C.shadowBlue }}
                  >
                    {generating
                      ? <><Loader2 size={11} style={{ animation: 'jfmSpin 1s linear infinite' }} />Generating…</>
                      : <><Sparkles size={11} />{generatedJD ? 'Regenerate' : 'Generate JD'}</>}
                  </button>
                </div>
              </div>

              {showCtxInput && (
                <textarea
                  className="jfm-ta"
                  value={extraCtx}
                  onChange={e => setExtraCtx(e.target.value)}
                  placeholder="Optional context — e.g. 'B2B SaaS startup, Python-first, remote-friendly'"
                  rows={2}
                  style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${C.borderMid}`, borderRadius: 8, fontSize: 12.5, color: C.text, background: C.white, outline: 'none', resize: 'vertical', fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: 10, display: 'block', boxSizing: 'border-box' }}
                />
              )}

              {generatedJD && <JDPreview jd={generatedJD} onUse={applyGeneratedJD} />}

              {aiError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, padding: '8px 10px', borderRadius: 8, background: C.dangerDim, border: `1px solid ${C.dangerBorder}`, fontSize: 12, color: C.danger, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  <AlertCircle size={12} /> {aiError}
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 4 }}>
              <FieldLabel text="Job description" required error={errors.description} hint="Apply the generated JD above, or write / paste your own" />
              <div style={{ position: 'relative' }}>
                <textarea
                  className="jfm-ta"
                  value={description}
                  onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                  placeholder="Describe the role, day-to-day responsibilities, and what you're looking for…"
                  rows={7}
                  style={{
                    ...(errors.description ? { ...inputBase, borderColor: C.danger } : inputBase),
                    resize: 'vertical', lineHeight: 1.65,
                    paddingBottom: description.trim().length > 40 ? 38 : 12,
                  }}
                />
                {description.trim().length > 40 && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 5 }}>
                    <button
                      type="button" className="jfm-btn"
                      onClick={handleExtractSkills} disabled={aiWorking}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.amberBorder}`, background: C.amberDim, color: C.amber, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                      {extracting ? <Loader2 size={10} style={{ animation: 'jfmSpin 1s linear infinite' }} /> : <Tag size={10} />}
                      Extract skills
                    </button>
                    <button
                      type="button" className="jfm-btn"
                      onClick={handleEnhanceJD} disabled={aiWorking}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.tealBorder}`, background: C.tealDim, color: C.teal, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                      {enhancing ? <Loader2 size={10} style={{ animation: 'jfmSpin 1s linear infinite' }} /> : <Wand2 size={10} />}
                      Enhance
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>{/* end scrollable body */}

          {/* footer */}
          <div style={{ padding: '12px 22px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', flexShrink: 0, background: C.surface }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 13.5, fontWeight: 600, color: C.textMuted, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Cancel
            </button>
            <button
              type="button" className="jfm-btn"
              onClick={handleSubmit} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 10, background: saving ? C.surfaceDeep : C.gradBlue, border: 'none', color: saving ? C.textFaint : C.white, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: saving ? 'none' : C.shadowBlue, transition: 'all 0.15s' }}
            >
              {saving
                ? <><Loader2 size={13} style={{ animation: 'jfmSpin 1s linear infinite' }} />Saving…</>
                : <>{mode === 'create' ? <Plus size={13} /> : <RefreshCw size={13} />}{mode === 'create' ? 'Post job' : 'Save changes'}</>}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default JobFormModal;