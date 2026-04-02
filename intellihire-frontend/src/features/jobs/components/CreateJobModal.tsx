import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2, Briefcase, MapPin, TrendingUp, FileText, Sparkles, Loader2, ChevronRight } from 'lucide-react';

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
const T = {
  primary:      '#1a56db',
  primaryLight: '#eff6ff',
  primaryMid:   '#dbeafe',
  primaryDark:  '#1e40af',
  accent:       '#0891b2',
  accentLight:  '#ecfeff',
  success:      '#059669',
  successLight: '#ecfdf5',
  warning:      '#d97706',
  warningLight: '#fffbeb',
  danger:       '#dc2626',
  dangerLight:  '#fef2f2',
  purple:       '#7c3aed',
  purpleLight:  '#f5f3ff',
  white:        '#ffffff',
  gray50:       '#f8fafc',
  gray100:      '#f1f5f9',
  gray200:      '#e2e8f0',
  gray300:      '#cbd5e1',
  gray400:      '#94a3b8',
  gray500:      '#64748b',
  gray600:      '#475569',
  gray700:      '#334155',
  gray800:      '#1e293b',
  gray900:      '#0f172a',
  textHeading:  '#0f172a',
  textBody:     '#334155',
  textMuted:    '#64748b',
  textLight:    '#94a3b8',
  border:       '#e2e8f0',
  borderFocus:  '#93c5fd',
  shadowSm:     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd:     '0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
  shadowLg:     '0 20px 48px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.08)',
  shadowPrimary:'0 4px 14px rgba(26,86,219,0.22)',
};

const jobSchema = z.object({
  title:               z.string().min(3, 'Title must be at least 3 characters'),
  description:         z.string().min(20, 'Description must be at least 20 characters'),
  skills_required:     z.array(z.string()).min(1, 'At least one skill is required'),
  experience_required: z.number().min(0, 'Experience must be 0 or more'),
  location:            z.string().optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => void;
  isLoading?: boolean;
}

/* ─── Field label ────────────────────────────────────────────────────────────── */
const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label style={{
    display: 'block', fontSize: 11.5, fontWeight: 700,
    color: T.textMuted, marginBottom: 7,
    letterSpacing: 0.4, textTransform: 'uppercase',
  }}>
    {children}
    {required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
  </label>
);

/* ─── Error message ──────────────────────────────────────────────────────────── */
const ErrorMsg: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <p style={{ fontSize: 12, color: T.danger, marginTop: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.danger, display: 'inline-block', flexShrink: 0 }} />
      {msg}
    </p>
  ) : null;

/* ─── Styled input ───────────────────────────────────────────────────────────── */
const StyledInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean; icon?: React.ReactNode }> = ({
  error, icon, style, ...props
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: focused ? T.primary : T.textLight, display: 'flex', transition: 'color 0.16s',
          pointerEvents: 'none',
        }}>
          {icon}
        </span>
      )}
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: '100%',
          padding: icon ? '10px 14px 10px 36px' : '10px 14px',
          border: `1.5px solid ${error ? T.danger + '80' : focused ? T.borderFocus : T.border}`,
          borderRadius: 10,
          fontSize: 13.5, color: T.textHeading,
          background: error ? T.dangerLight + '50' : focused ? T.primaryLight + '60' : T.white,
          outline: 'none', fontFamily: 'inherit', fontWeight: 500,
          boxShadow: focused ? `0 0 0 3px ${T.borderFocus}40` : 'none',
          transition: 'all 0.18s ease',
          ...style,
        }}
      />
    </div>
  );
};

/* ─── Styled textarea ────────────────────────────────────────────────────────── */
const StyledTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }> = ({
  error, ...props
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e  => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%',
        padding: '10px 14px',
        border: `1.5px solid ${error ? T.danger + '80' : focused ? T.borderFocus : T.border}`,
        borderRadius: 10,
        fontSize: 13.5, color: T.textHeading,
        background: error ? T.dangerLight + '50' : focused ? T.primaryLight + '60' : T.white,
        outline: 'none', fontFamily: 'inherit', fontWeight: 500,
        resize: 'vertical', minHeight: 110,
        boxShadow: focused ? `0 0 0 3px ${T.borderFocus}40` : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
        lineHeight: 1.7,
      }}
    />
  );
};

/* ─── Progress steps ─────────────────────────────────────────────────────────── */
const steps = ['Basics', 'Details', 'Skills'];
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
    {steps.map((s, i) => (
      <React.Fragment key={s}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: i < current ? T.success : i === current ? T.primary : T.gray100,
            border: `2px solid ${i < current ? T.success : i === current ? T.primary : T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: i <= current ? T.white : T.textLight,
            transition: 'all 0.3s ease',
            boxShadow: i === current ? T.shadowPrimary : 'none',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: i === current ? 700 : 500, color: i === current ? T.primary : T.textLight, whiteSpace: 'nowrap' }}>
            {s}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div style={{
            flex: 1, height: 2, margin: '0 6px', marginBottom: 18,
            background: i < current ? T.success : T.border,
            transition: 'background 0.3s ease',
          }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

/* ─── Main modal ─────────────────────────────────────────────────────────────── */
export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen, onClose, onSubmit, isLoading,
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: { skills_required: [], experience_required: 0 },
  });

  const [newSkill, setNewSkill] = React.useState('');
  const [step, setStep]         = React.useState(0);
  const [mounted, setMounted]   = React.useState(false);
  const skills = watch('skills_required');

  React.useEffect(() => {
    if (isOpen) {
      setStep(0);
      setTimeout(() => setMounted(true), 10);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setValue('skills_required', [...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setValue('skills_required', skills.filter(s => s !== skill));
  };

  const handleNext = async () => {
    let valid = false;
    if (step === 0) valid = await trigger(['title', 'description']);
    if (step === 1) valid = await trigger(['experience_required']);
    if (valid) setStep(s => s + 1);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 20,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.25s ease',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp   { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn    { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin      { to { transform:rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        textarea::placeholder, input::placeholder { color: ${T.textLight}; font-weight: 400; }
        .skill-tag:hover .skill-remove { opacity: 1 !important; }
      `}</style>

      {/* ── Modal container ── */}
      <div style={{
        background: T.white,
        borderRadius: 20,
        width: '100%', maxWidth: 560,
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: T.shadowLg,
        border: `1px solid ${T.border}`,
        animation: mounted ? 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '22px 26px 20px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
          background: `linear-gradient(135deg, ${T.primaryLight}, ${T.white})`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: T.primary, boxShadow: T.shadowPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={20} color={T.white} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.textHeading, margin: 0, letterSpacing: '-0.4px', lineHeight: 1.1 }}>
              Post New Job
            </h2>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: '3px 0 0', fontWeight: 500 }}>
              Fill in the details to create your listing
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              border: `1px solid ${T.border}`, background: T.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.textMuted, transition: 'all 0.16s',
            }}
            onMouseEnter={e => { (e.currentTarget).style.background = T.gray50; (e.currentTarget).style.color = T.textHeading; }}
            onMouseLeave={e => { (e.currentTarget).style.background = T.white; (e.currentTarget).style.color = T.textMuted; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '26px 26px 0', overflowY: 'auto', flex: 1 }}>
          <StepIndicator current={step} />

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Step 0: Basics ── */}
            {step === 0 && (
              <div style={{ animation: 'fadeIn 0.22s ease both' }}>
                <div style={{ marginBottom: 18 }}>
                  <Label required>Job Title</Label>
                  <StyledInput
                    placeholder="e.g., Senior React Developer"
                    icon={<Briefcase size={14} />}
                    error={!!errors.title}
                    {...register('title')}
                  />
                  <ErrorMsg msg={errors.title?.message} />
                </div>

                <div style={{ marginBottom: 6 }}>
                  <Label required>Job Description</Label>
                  <StyledTextarea
                    rows={5}
                    placeholder="Describe the role, responsibilities, and what great looks like…"
                    error={!!errors.description}
                    {...register('description')}
                  />
                  <ErrorMsg msg={errors.description?.message} />
                </div>
              </div>
            )}

            {/* ── Step 1: Details ── */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.22s ease both' }}>
                <div style={{ marginBottom: 18 }}>
                  <Label required>Experience Required</Label>
                  <StyledInput
                    type="number"
                    placeholder="0"
                    icon={<TrendingUp size={14} />}
                    error={!!errors.experience_required}
                    {...register('experience_required', { valueAsNumber: true })}
                  />
                  <ErrorMsg msg={errors.experience_required?.message} />
                  <p style={{ fontSize: 11.5, color: T.textLight, marginTop: 5, fontWeight: 500 }}>
                    Minimum years of professional experience required
                  </p>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <Label>Location</Label>
                  <StyledInput
                    placeholder="Remote, New York, London, etc."
                    icon={<MapPin size={14} />}
                    error={!!errors.location}
                    {...register('location')}
                  />
                  <ErrorMsg msg={errors.location?.message} />
                  <p style={{ fontSize: 11.5, color: T.textLight, marginTop: 5, fontWeight: 500 }}>
                    Leave blank if fully remote / flexible
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 2: Skills ── */}
            {step === 2 && (
              <div style={{ animation: 'fadeIn 0.22s ease both' }}>
                <Label required>Required Skills</Label>

                {/* Skill input row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <StyledInput
                      placeholder="Type a skill and press Enter or +"
                      value={newSkill}
                      onChange={e => setNewSkill((e.target as HTMLInputElement).value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addSkill}
                    style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: newSkill.trim() ? T.primary : T.gray100,
                      border: `1.5px solid ${newSkill.trim() ? 'transparent' : T.border}`,
                      color: newSkill.trim() ? T.white : T.textLight,
                      cursor: newSkill.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: newSkill.trim() ? T.shadowPrimary : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <ErrorMsg msg={errors.skills_required?.message as string} />

                {/* Skill tags */}
                {skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10, padding: '14px', borderRadius: 12, background: T.gray50, border: `1px solid ${T.border}`, minHeight: 56 }}>
                    {skills.map((skill, i) => (
                      <span
                        key={i}
                        className="skill-tag"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 10px 5px 12px', borderRadius: 99,
                          background: T.primaryLight, color: T.primary,
                          border: `1px solid ${T.primary}25`,
                          fontSize: 12.5, fontWeight: 600,
                          animation: `fadeIn 0.2s ease ${i * 0.04}s both`,
                        }}
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="skill-remove"
                          style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: `${T.primary}20`, border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: T.primary,
                            opacity: 0.6, transition: 'all 0.14s',
                            padding: 0,
                          }}
                          onMouseEnter={e => { (e.currentTarget).style.background = T.danger; (e.currentTarget).style.color = T.white; (e.currentTarget).style.opacity = '1'; }}
                          onMouseLeave={e => { (e.currentTarget).style.background = `${T.primary}20`; (e.currentTarget).style.color = T.primary; (e.currentTarget).style.opacity = '0.6'; }}
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    marginTop: 10, padding: '20px 14px', borderRadius: 12,
                    background: T.gray50, border: `1.5px dashed ${T.border}`,
                    textAlign: 'center',
                  }}>
                    <Sparkles size={18} style={{ color: T.textLight, display: 'block', margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 13, color: T.textLight, margin: 0, fontWeight: 500 }}>
                      Add at least one skill to continue
                    </p>
                  </div>
                )}

                {skills.length > 0 && (
                  <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 8, fontWeight: 500 }}>
                    {skills.length} skill{skills.length !== 1 ? 's' : ''} added · click × to remove
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '18px 26px 22px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10,
          flexShrink: 0, background: T.white,
        }}>
          {/* Back / Cancel */}
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            style={{
              flex: step === 0 ? 0.5 : 1,
              padding: '11px 14px', borderRadius: 10,
              border: `1.5px solid ${T.border}`, background: T.white,
              color: T.textBody, fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => { (e.currentTarget).style.background = T.gray50; (e.currentTarget).style.borderColor = T.borderFocus; }}
            onMouseLeave={e => { (e.currentTarget).style.background = T.white; (e.currentTarget).style.borderColor = T.border; }}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {/* Next / Submit */}
          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                flex: 1.5,
                padding: '11px 14px', borderRadius: 10,
                border: 'none', background: T.primary,
                color: T.white, fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: T.shadowPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.primaryDark)}
              onMouseLeave={e => (e.currentTarget.style.background = T.primary)}
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              style={{
                flex: 1.5,
                padding: '11px 14px', borderRadius: 10,
                border: 'none',
                background: isLoading ? T.gray200 : T.primary,
                color: isLoading ? T.textMuted : T.white,
                fontSize: 13.5, fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: isLoading ? 'none' : T.shadowPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget).style.background = T.primaryDark; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget).style.background = T.primary; }}
            >
              {isLoading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Posting…</>
                : <><Briefcase size={14} /> Post Job</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};