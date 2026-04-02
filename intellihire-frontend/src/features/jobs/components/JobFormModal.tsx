// features/jobs/components/JobFormModal.tsx
// Create / Edit job modal — SourcingPage tokens, Fraunces + DM Sans
// 3-step wizard: Basics → Details → Skills

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X, Plus, Briefcase, MapPin, TrendingUp,
  Sparkles, Loader2, ChevronRight, CheckCircle,
} from 'lucide-react';
import type { Job, JobCreateRequest } from '../types/job.types';

/* ─── Tokens (SourcingPage match) ───────────────────────────────────────────── */
const C = {
  bg:           '#f0f5ff',
  surface:      '#f5f8ff',
  surfaceDeep:  '#e8effe',
  border:       'rgba(79,125,255,0.13)',
  borderMid:    'rgba(79,125,255,0.22)',
  borderHov:    'rgba(79,125,255,0.45)',
  borderFocus:  '#4f7dff',
  blue:         '#4f7dff',
  blueLight:    '#6b93ff',
  blueDark:     '#2a4fff',
  blueDim:      'rgba(79,125,255,0.10)',
  gradBlue:     'linear-gradient(135deg, #2a4fff 0%, #4f7dff 50%, #6b93ff 100%)',
  teal:         '#06d6b0',
  tealDim:      'rgba(6,214,176,0.10)',
  tealBorder:   'rgba(6,214,176,0.30)',
  danger:       '#ef4444',
  dangerDim:    'rgba(239,68,68,0.08)',
  text:         '#0d1b3e',
  textMuted:    '#4f6a9a',
  textFaint:    '#8fa3c8',
  white:        '#ffffff',
  shadow:       '0 1px 3px rgba(15,30,80,0.06), 0 6px 20px rgba(15,30,80,0.07)',
  shadowLg:     '0 24px 64px rgba(15,30,80,0.18), 0 8px 24px rgba(15,30,80,0.1)',
  shadowBlue:   '0 4px 22px rgba(79,125,255,0.28)',
};

/* ─── Schema ─────────────────────────────────────────────────────────────────── */
const jobSchema = z.object({
  title:               z.string().min(3, 'Title must be at least 3 characters'),
  description:         z.string().min(20, 'Description must be at least 20 characters'),
  skills_required:     z.array(z.string()).min(1, 'At least one skill is required'),
  experience_required: z.number().min(0),
  location:            z.string().optional(),
});
type JobFormValues = z.infer<typeof jobSchema>;

/* ─── Props ──────────────────────────────────────────────────────────────────── */
export interface JobFormModalProps {
  isOpen:     boolean;
  mode:       'create' | 'edit';
  job?:       Job | null;
  saving:     boolean;
  onClose:    () => void;
  onSubmit:   (data: JobCreateRequest) => void;
}

/* ─── Micro helpers ──────────────────────────────────────────────────────────── */
const STEPS = ['Basics', 'Details', 'Skills'];

const Lbl: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label style={{
    display: 'block', fontSize: 10.5, fontWeight: 700,
    color: C.textFaint, marginBottom: 7,
    letterSpacing: 0.6, textTransform: 'uppercase',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  }}>
    {children}{required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
  </label>
);

const Err: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <p style={{ fontSize: 11.5, color: C.danger, marginTop: 5, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {msg}
    </p>
  ) : null;

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean; iconLeft?: React.ReactNode }> = ({
  hasError, iconLeft, style, ...props
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {iconLeft && (
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: focused ? C.blue : C.textFaint, display: 'flex', transition: 'color 0.16s',
          pointerEvents: 'none',
        }}>
          {iconLeft}
        </span>
      )}
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: iconLeft ? '10px 14px 10px 37px' : '10px 14px',
          border: `1.5px solid ${hasError ? C.danger + '80' : focused ? C.borderFocus : C.border}`,
          borderRadius: 10, fontSize: 13.5,
          color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif",
          background: focused ? 'rgba(79,125,255,0.04)' : C.white,
          outline: 'none', fontWeight: 500,
          boxShadow: focused ? `0 0 0 3px rgba(79,125,255,0.10)` : 'none',
          transition: 'all 0.18s',
          ...style,
        }}
      />
    </div>
  );
};

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }> = ({
  hasError, style, ...props
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '10px 14px',
        border: `1.5px solid ${hasError ? C.danger + '80' : focused ? C.borderFocus : C.border}`,
        borderRadius: 10, fontSize: 13.5,
        color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif",
        background: focused ? 'rgba(79,125,255,0.04)' : C.white,
        outline: 'none', fontWeight: 500, resize: 'vertical', minHeight: 110,
        lineHeight: 1.7,
        boxShadow: focused ? `0 0 0 3px rgba(79,125,255,0.10)` : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
        ...style,
      }}
    />
  );
};

/* ─── Step indicator ─────────────────────────────────────────────────────────── */
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
    {STEPS.map((s, i) => (
      <React.Fragment key={s}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: i < current ? C.teal : i === current ? C.gradBlue : C.surfaceDeep,
            border: `2px solid ${i < current ? C.teal : i === current ? C.blue : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            color: i <= current ? C.white : C.textFaint,
            transition: 'all 0.3s',
            boxShadow: i === current ? C.shadowBlue : 'none',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            {i < current ? <CheckCircle size={14} /> : i + 1}
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: i === current ? 700 : 500,
            color: i === current ? C.blue : C.textFaint,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            whiteSpace: 'nowrap',
          }}>
            {s}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div style={{
            flex: 1, height: 2, margin: '0 8px', marginBottom: 18,
            background: i < current ? C.teal : C.border,
            transition: 'background 0.3s',
          }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN MODAL
═══════════════════════════════════════════════════════════════════════════════ */
export const JobFormModal: React.FC<JobFormModalProps> = ({
  isOpen, mode, job, saving, onClose, onSubmit,
}) => {
  const [step, setStep]       = useState(0);
  const [newSkill, setNewSkill] = useState('');
  const [mounted, setMounted] = useState(false);

  const { register, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { skills_required: [], experience_required: 0 },
  });

  const skills = watch('skills_required');

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setNewSkill('');
      if (mode === 'edit' && job) {
        const skillArr = !job.skills_required ? [] :
          Array.isArray(job.skills_required) ? job.skills_required :
          job.skills_required.split(',').map(s => s.trim()).filter(Boolean);
        reset({
          title:               job.title,
          description:         job.description ?? '',
          skills_required:     skillArr,
          experience_required: job.experience_required ?? 0,
          location:            job.location ?? '',
        });
      } else {
        reset({ skills_required: [], experience_required: 0, title: '', description: '', location: '' });
      }
      setTimeout(() => setMounted(true), 10);
    } else {
      setMounted(false);
    }
  }, [isOpen, mode, job, reset]);

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !skills.includes(s)) {
      setValue('skills_required', [...skills, s]);
      setNewSkill('');
    }
  };

  const removeSkill = (sk: string) => setValue('skills_required', skills.filter(s => s !== sk));

  const handleNext = async () => {
    let valid = false;
    if (step === 0) valid = await trigger(['title', 'description']);
    if (step === 1) valid = await trigger(['experience_required']);
    if (valid) setStep(s => s + 1);
  };

  const handleFinalSubmit = handleSubmit((data) => {
    onSubmit({
      title:               data.title,
      description:         data.description,
      skills_required:     data.skills_required,
      experience_required: Number(data.experience_required),
      location:            data.location || undefined,
    });
  });

  if (!isOpen) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(13,27,62,0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 20,
        opacity: mounted ? 1 : 0, transition: 'opacity 0.25s',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes jModalUp { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes jFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes jSpin    { to{transform:rotate(360deg)} }
        textarea::placeholder,input::placeholder { color:#8fa3c8;font-weight:400; }
      `}</style>

      <div style={{
        background: C.white,
        borderRadius: 22,
        width: '100%', maxWidth: 560, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: C.shadowLg,
        border: `1px solid ${C.border}`,
        animation: mounted ? 'jModalUp 0.32s cubic-bezier(0.22,1,0.36,1) both' : 'none',
        overflow: 'hidden',
      }}>

        {/* ── Top accent bar ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.blueDark}, ${C.blue}, ${C.teal})` }} />

        {/* ── Header ── */}
        <div style={{
          padding: '22px 26px 18px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
          background: `linear-gradient(135deg, ${C.blueDim}, transparent)`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: C.gradBlue, boxShadow: C.shadowBlue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={20} color={C.white} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: C.text, margin: 0,
              letterSpacing: '-0.5px', lineHeight: 1.1,
              fontFamily: "'Fraunces', Georgia, serif",
            }}>
              {mode === 'create' ? 'Post New Job' : 'Edit Job Posting'}
            </h2>
            <p style={{ fontSize: 12, color: C.textMuted, margin: '3px 0 0', fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {mode === 'create' ? 'Fill in the details to create your listing' : `Editing: ${job?.title}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            border: `1px solid ${C.border}`, background: C.white,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.textMuted, transition: 'all 0.16s',
          }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.surfaceDeep; b.style.color = C.text; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.white; b.style.color = C.textMuted; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '26px 26px 0', overflowY: 'auto', flex: 1 }}>
          <StepIndicator current={step} />

          {/* Step 0: Basics */}
          {step === 0 && (
            <div style={{ animation: 'jFadeIn 0.22s ease both' }}>
              <div style={{ marginBottom: 18 }}>
                <Lbl required>Job Title</Lbl>
                <Field placeholder="e.g., Senior React Developer" iconLeft={<Briefcase size={14} />} hasError={!!errors.title} {...register('title')} />
                <Err msg={errors.title?.message} />
              </div>
              <div style={{ marginBottom: 6 }}>
                <Lbl required>Job Description</Lbl>
                <TextArea rows={5} placeholder="Describe the role, responsibilities, and what great looks like…" hasError={!!errors.description} {...register('description')} />
                <Err msg={errors.description?.message} />
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div style={{ animation: 'jFadeIn 0.22s ease both' }}>
              <div style={{ marginBottom: 18 }}>
                <Lbl required>Years of Experience Required</Lbl>
                <Field type="number" placeholder="0" iconLeft={<TrendingUp size={14} />} hasError={!!errors.experience_required} {...register('experience_required', { valueAsNumber: true })} />
                <Err msg={errors.experience_required?.message} />
                <p style={{ fontSize: 11.5, color: C.textFaint, marginTop: 5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Minimum years of professional experience required
                </p>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Lbl>Location</Lbl>
                <Field placeholder="Remote, New York, London…" iconLeft={<MapPin size={14} />} {...register('location')} />
                <p style={{ fontSize: 11.5, color: C.textFaint, marginTop: 5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Leave blank if fully remote or flexible
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div style={{ animation: 'jFadeIn 0.22s ease both' }}>
              <Lbl required>Required Skills</Lbl>

              {/* Skill input */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <Field
                    placeholder="Type a skill and press Enter or +"
                    value={newSkill}
                    onChange={e => setNewSkill((e.target as HTMLInputElement).value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  />
                </div>
                <button
                  type="button" onClick={addSkill}
                  style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: newSkill.trim() ? C.gradBlue : C.surfaceDeep,
                    border: `1.5px solid ${newSkill.trim() ? 'transparent' : C.border}`,
                    color: newSkill.trim() ? C.white : C.textFaint,
                    cursor: newSkill.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: newSkill.trim() ? C.shadowBlue : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              <Err msg={errors.skills_required?.message as string} />

              {/* Tags */}
              {skills.length > 0 ? (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 7, padding: '14px',
                  borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, minHeight: 56,
                  marginTop: 8,
                }}>
                  {skills.map((sk, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px 5px 12px', borderRadius: 99,
                      background: C.blueDim, color: C.blue,
                      border: `1px solid ${C.blue}25`,
                      fontSize: 12.5, fontWeight: 600,
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      animation: `jFadeIn 0.2s ease ${i * 0.04}s both`,
                    }}>
                      {sk}
                      <button type="button" onClick={() => removeSkill(sk)} style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: `${C.blue}20`, border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: C.blue, padding: 0, transition: 'all 0.14s',
                      }}
                        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.danger; b.style.color = C.white; }}
                        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${C.blue}20`; b.style.color = C.blue; }}
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{
                  marginTop: 8, padding: '22px 14px', borderRadius: 12,
                  background: C.surface, border: `1.5px dashed ${C.borderMid}`,
                  textAlign: 'center',
                }}>
                  <Sparkles size={18} style={{ color: C.textFaint, display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: C.textFaint, margin: 0, fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Add at least one skill to continue
                  </p>
                </div>
              )}

              {skills.length > 0 && (
                <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {skills.length} skill{skills.length !== 1 ? 's' : ''} added · click × to remove
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '18px 26px 22px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 10, flexShrink: 0, background: C.white,
        }}>
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            style={{
              flex: step === 0 ? 0.5 : 1,
              padding: '11px 14px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: C.white,
              color: C.text, fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.surface; b.style.borderColor = C.borderFocus; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = C.white; b.style.borderColor = C.border; }}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {step < 2 ? (
            <button
              type="button" onClick={handleNext}
              style={{
                flex: 1.5, padding: '11px 14px', borderRadius: 10,
                border: 'none', background: C.gradBlue,
                color: C.white, fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
                boxShadow: C.shadowBlue,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button" onClick={handleFinalSubmit} disabled={saving}
              style={{
                flex: 1.5, padding: '11px 14px', borderRadius: 10,
                border: 'none',
                background: saving ? C.surfaceDeep : C.gradBlue,
                color: saving ? C.textFaint : C.white,
                fontSize: 13.5, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                boxShadow: saving ? 'none' : C.shadowBlue,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s',
              }}
            >
              {saving
                ? <><Loader2 size={14} style={{ animation: 'jSpin 1s linear infinite' }} /> Saving…</>
                : <><Briefcase size={14} /> {mode === 'create' ? 'Post Job' : 'Save Changes'}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};