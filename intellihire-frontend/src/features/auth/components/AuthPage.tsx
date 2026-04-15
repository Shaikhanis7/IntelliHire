// features/auth/components/AuthPage.tsx
// Aesthetic: Crisp light — warm white, slate navy, soft shadows
// Fonts: DM Sans (body) + Fraunces (display)
// Motion: Framer Motion — panel slide, staggered reveals, shake on error
// Responsive: mobile-first, single-column < 640px, split-panel ≥ 880px

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight,
  Sparkles, Shield, Zap, Users, Briefcase,
  AlertCircle, CheckCircle2, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/* ─── Breakpoints ────────────────────────────────────────────────────────────── */
const BP = { sm: 640, md: 880 } as const;

function useWindowWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : BP.md,
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const C = {
  bg:           '#f5f6fa',
  surface:      '#ffffff',
  surfaceAlt:   '#f8f9fc',
  border:       'rgba(30,58,138,0.12)',
  borderHov:    'rgba(30,58,138,0.28)',
  borderFocus:  '#2563eb',
  navy:         '#1e3a8a',
  blue:         '#2563eb',
  blueLight:    '#3b82f6',
  blueDim:      'rgba(37,99,235,0.07)',
  gradBlue:     'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
  gradPanel:    'linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
  white:        '#ffffff',
  text:         '#0f172a',
  textSub:      '#334155',
  textMuted:    '#64748b',
  textFaint:    '#94a3b8',
  error:        '#dc2626',
  errorDim:     'rgba(220,38,38,0.06)',
  errorBorder:  'rgba(220,38,38,0.28)',
  success:      '#059669',
  successDim:   'rgba(5,150,105,0.08)',
  shadow:       '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.06)',
  shadowMd:     '0 4px 24px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)',
  shadowLg:     '0 20px 60px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.08)',
};

/* ─── Error lookup tables ────────────────────────────────────────────────────── */
const LOGIN_ERRORS: Array<[string, string]> = [
  ['invalid email or password', 'Incorrect email or password. Please try again.'],
  ['invalid',                   'Incorrect email or password. Please try again.'],
  ['unauthorized',              'Incorrect email or password. Please try again.'],
  ['credential',                'Incorrect email or password. Please try again.'],
  ['not found',                 'No account found with this email address.'],
  ['no account',                'No account found with this email address.'],
  ['network',                   'Connection error. Please check your internet and try again.'],
  ['fetch',                     'Connection error. Please check your internet and try again.'],
];

const SIGNUP_ERRORS: Array<[string, string]> = [
  ['already exists',            'An account with this email already exists. Try signing in instead.'],
  ['already',                   'An account with this email already exists. Try signing in instead.'],
  ['exists',                    'An account with this email already exists. Try signing in instead.'],
  ['network',                   'Connection error. Please check your internet and try again.'],
  ['fetch',                     'Connection error. Please check your internet and try again.'],
];

function friendlyMessage(
  error: string | null,
  table: Array<[string, string]>,
  fallback: string,
): string | null {
  if (!error) return null;
  const lower = error.toLowerCase();
  for (const [key, msg] of table) {
    if (lower.includes(key)) return msg;
  }
  return fallback;
}

/* ─── Schemas ────────────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  email:    z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginData  = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

/* ─── Input field ────────────────────────────────────────────────────────────── */
interface FieldProps {
  label: string; type?: string; placeholder: string;
  icon: React.ReactNode; error?: string;
  showToggle?: boolean; onToggle?: () => void; showing?: boolean;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
}

const Field: React.FC<FieldProps> = ({
  label, type = 'text', placeholder, icon,
  error, showToggle, onToggle, showing, registration,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11.5, fontWeight: 600,
        color: C.textMuted, marginBottom: 6,
        letterSpacing: 0.4, textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: focused ? C.blue : error ? C.error : C.textFaint,
          display: 'flex', transition: 'color 0.2s',
        }}>
          {icon}
        </span>
        <input
          type={showToggle ? (showing ? 'text' : 'password') : type}
          placeholder={placeholder}
          {...registration}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `11px 12px 11px 38px`,
            paddingRight: showToggle ? 40 : 12,
            border: `1.5px solid ${error ? C.errorBorder : focused ? C.borderFocus : C.border}`,
            borderRadius: 10, fontSize: 13.5,
            color: C.text, background: focused ? C.white : C.surfaceAlt,
            outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
            caretColor: C.blue,
            boxShadow: focused ? `0 0 0 3px rgba(37,99,235,0.1)` : 'none',
          }}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
        />
        {showToggle && (
          <button type="button" onClick={onToggle}
            style={{
              position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textFaint, display: 'flex', padding: 2,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = C.blue)}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = C.textFaint)}
          >
            {showing ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ margin: '5px 0 0', fontSize: 11.5, color: C.error, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <AlertCircle size={11} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Error banner ───────────────────────────────────────────────────────────── */
const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.97 }}
    transition={{ duration: 0.25 }}
    style={{
      padding: '11px 14px',
      background: C.errorDim,
      border: `1px solid ${C.errorBorder}`,
      borderRadius: 10,
      color: C.error,
      fontSize: 13,
      marginBottom: 16,
      display: 'flex', alignItems: 'flex-start', gap: 9,
      fontWeight: 500,
    }}
  >
    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>{message}</span>
  </motion.div>
);

/* ─── Login form ─────────────────────────────────────────────────────────────── */
const LoginForm: React.FC<{ onSwitch: () => void; isMobile: boolean }> = ({ onSwitch, isMobile }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate  = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const controls  = useAnimation();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => () => clearError(), [clearError]);

  const friendlyError = friendlyMessage(
    error, LOGIN_ERRORS, 'Sign in failed. Please check your credentials and try again.',
  );

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch {
      controls.start({ x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.5 } });
    }
  };

  return (
    <motion.form animate={controls} onSubmit={handleSubmit(onSubmit)}>
      <AnimatePresence>
        {friendlyError && <ErrorBanner message={friendlyError} />}
      </AnimatePresence>

      <Field label="Email address" type="email" placeholder="you@company.com"
        icon={<Mail size={14} />} error={errors.email?.message}
        registration={register('email')} />
      <Field label="Password" placeholder="••••••••"
        icon={<Lock size={14} />} error={errors.password?.message}
        showToggle onToggle={() => setShowPw(p => !p)} showing={showPw}
        registration={register('password')} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.textMuted, cursor: 'pointer' }}>
          <input type="checkbox" style={{ accentColor: C.blue, width: 13, height: 13 }} />
          Remember me
        </label>
        <motion.a href="#" whileHover={{ color: C.navy }}
          style={{ fontSize: 12.5, color: C.blue, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}>
          Forgot password?
        </motion.a>
      </div>

      <motion.button type="submit" disabled={isLoading}
        whileHover={!isLoading ? { scale: 1.015, boxShadow: '0 8px 28px rgba(37,99,235,0.35)' } : {}}
        whileTap={!isLoading ? { scale: 0.985 } : {}}
        style={{
          width: '100%', padding: '13px',
          background: isLoading ? 'rgba(37,99,235,0.45)' : C.gradBlue,
          border: 'none', borderRadius: 10,
          fontSize: 14.5, fontWeight: 700,
          color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'inherit', marginBottom: 16,
          boxShadow: '0 4px 16px rgba(37,99,235,0.28)',
          transition: 'background 0.2s',
        }}>
        {isLoading ? <><Loader /> Signing in…</> : <><span>Sign In</span><ArrowRight size={14} /></>}
      </motion.button>

      <Divider text="New to IntelliHire?" />

      <motion.button type="button" onClick={onSwitch}
        whileHover={{ borderColor: C.blue, color: C.blue, background: C.blueDim }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', padding: '12px', background: 'transparent',
          border: `1.5px solid ${C.border}`, borderRadius: 10,
          fontSize: 13.5, fontWeight: 600, color: C.textMuted,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}>
        Create an account
      </motion.button>

      {isMobile && (
        <p style={{ textAlign: 'center', fontSize: 11, color: C.textFaint, marginTop: 16 }}>
          By signing in, you agree to our{' '}
          <a href="#" style={{ color: C.blue, textDecoration: 'none' }}>Terms</a>
          {' '}and{' '}
          <a href="#" style={{ color: C.blue, textDecoration: 'none' }}>Privacy Policy</a>
        </p>
      )}
    </motion.form>
  );
};

/* ─── Signup form ────────────────────────────────────────────────────────────── */
const SignupForm: React.FC<{ onSwitch: () => void; isMobile: boolean }> = ({ onSwitch, isMobile }) => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const navigate  = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const controls  = useAnimation();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => () => clearError(), [clearError]);

  const friendlyError = friendlyMessage(
    error, SIGNUP_ERRORS, 'Registration failed. Please try again.',
  );

  const onSubmit = async (data: SignupData) => {
    try {
      const { confirmPassword, ...rest } = data;
      await registerUser(rest);
      navigate('/dashboard');
    } catch {
      controls.start({ x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.5 } });
    }
  };

  return (
    <motion.form animate={controls} onSubmit={handleSubmit(onSubmit)}>
      <AnimatePresence>
        {friendlyError && <ErrorBanner message={friendlyError} />}
      </AnimatePresence>

      <Field label="Full name" placeholder="Jane Smith" icon={<User size={14} />}
        error={errors.name?.message} registration={register('name')} />
      <Field label="Email address" type="email" placeholder="you@company.com"
        icon={<Mail size={14} />} error={errors.email?.message}
        registration={register('email')} />
      <Field label="Password" placeholder="Min. 8 characters"
        icon={<Lock size={14} />} error={errors.password?.message}
        showToggle onToggle={() => setShowPw(p => !p)} showing={showPw}
        registration={register('password')} />
      <Field label="Confirm password" placeholder="Re-enter password"
        icon={<Lock size={14} />} error={errors.confirmPassword?.message}
        showToggle onToggle={() => setShowCf(p => !p)} showing={showCf}
        registration={register('confirmPassword')} />

      <motion.button type="submit" disabled={isLoading}
        whileHover={!isLoading ? { scale: 1.015, boxShadow: '0 8px 28px rgba(37,99,235,0.35)' } : {}}
        whileTap={!isLoading ? { scale: 0.985 } : {}}
        style={{
          width: '100%', padding: '13px',
          background: isLoading ? 'rgba(37,99,235,0.45)' : C.gradBlue,
          border: 'none', borderRadius: 10,
          fontSize: 14.5, fontWeight: 700,
          color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'inherit', marginBottom: 14, marginTop: 4,
          boxShadow: '0 4px 16px rgba(37,99,235,0.28)',
        }}>
        {isLoading ? <><Loader /> Creating account…</> : <><span>Create Account</span><ArrowRight size={14} /></>}
      </motion.button>

      <Divider text="Already have an account?" />

      <motion.button type="button" onClick={onSwitch}
        whileHover={{ borderColor: C.blue, color: C.blue, background: C.blueDim }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', padding: '12px', background: 'transparent',
          border: `1.5px solid ${C.border}`, borderRadius: 10,
          fontSize: 13.5, fontWeight: 600, color: C.textMuted,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}>
        Sign in instead
      </motion.button>

      {isMobile && (
        <p style={{ textAlign: 'center', fontSize: 11, color: C.textFaint, marginTop: 16 }}>
          By signing up, you agree to our{' '}
          <a href="#" style={{ color: C.blue, textDecoration: 'none' }}>Terms</a>
          {' '}and{' '}
          <a href="#" style={{ color: C.blue, textDecoration: 'none' }}>Privacy Policy</a>
        </p>
      )}
    </motion.form>
  );
};

/* ─── Shared micro-components ────────────────────────────────────────────────── */
const Loader: React.FC = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%' }}
  />
);

const Divider: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <div style={{ flex: 1, height: 1, background: C.border }} />
    <span style={{ fontSize: 11.5, color: C.textFaint, fontWeight: 500 }}>{text}</span>
    <div style={{ flex: 1, height: 1, background: C.border }} />
  </div>
);

/* ─── Mobile header bar (replaces the navy panel on small screens) ───────────── */
const MobileHeader: React.FC<{ isLogin: boolean }> = ({ isLogin }) => (
  <div style={{
    background: C.gradPanel,
    padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10,
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Briefcase size={16} color="#fff" />
    </div>
    <div>
      <span style={{
        fontSize: 17, fontWeight: 700, color: '#fff',
        letterSpacing: '-0.3px', fontFamily: "'Fraunces', serif",
        display: 'block', lineHeight: 1.2,
      }}>
        IntelliHire
      </span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
        {isLogin ? 'Welcome back' : 'Start hiring smarter'}
      </span>
    </div>
  </div>
);

/* ─── Panel content (desktop) ────────────────────────────────────────────────── */
const FEATURES_LOGIN = [
  { icon: Sparkles,     text: 'AI-powered resume search'  },
  { icon: Zap,          text: 'Fast candidate matching'   },
  { icon: Users,        text: 'Talent pool management'    },
  { icon: Shield,       text: 'Enterprise-grade security' },
];
const FEATURES_SIGNUP = [
  { icon: CheckCircle2, text: 'Free 14-day trial'         },
  { icon: Shield,       text: 'No credit card required'   },
  { icon: Zap,          text: 'Cancel anytime'            },
];

const PanelContent: React.FC<{ isLogin: boolean }> = ({ isLogin }) => {
  const features = isLogin ? FEATURES_LOGIN : FEATURES_SIGNUP;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isLogin ? 'panel-login' : 'panel-signup'}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
            <motion.div whileHover={{ scale: 1.1, rotate: -8 }} transition={{ type: 'spring', stiffness: 400 }}
              style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={18} color="#fff" />
            </motion.div>
            <span style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', fontFamily: "'Fraunces', serif" }}>
              IntelliHire
            </span>
          </div>

          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-1.2px', marginBottom: 14, fontFamily: "'Fraunces', serif" }}>
              {isLogin
                ? <><span>Welcome</span><br /><span style={{ color: 'rgba(255,255,255,0.65)' }}>back.</span></>
                : <><span>Start hiring</span><br /><span style={{ color: 'rgba(255,255,255,0.65)' }}>smarter.</span></>}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
              {isLogin
                ? 'Your next great hire is waiting. Sign in to continue where you left off.'
                : 'Join thousands of recruiters finding the perfect candidate, faster than ever.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {features.map(({ icon: Icon, text }, i) => (
              <motion.div key={text} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color="rgba(255,255,255,0.9)" />
                </div>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{text}</span>
              </motion.div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 'auto', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            Trusted by 1,000+ companies worldwide
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════════ */
export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin]           = useState(true);
  const [panelIsLogin, setPanelIsLogin] = useState(true);
  const width = useWindowWidth();

  const isMobile = width < BP.sm;
  const isTablet = width >= BP.sm && width < BP.md;

  const switchMode = () => {
    setTimeout(() => setPanelIsLogin(v => !v), 280);
    setIsLogin(v => !v);
  };

  // ── Padding based on viewport ──
  const formPadH  = isMobile ? 24 : isTablet ? 28 : 38;
  const formPadV  = isMobile ? 28 : 36;
  const panelPad  = isTablet ? '32px 28px' : '40px 36px';
  const cardRadius = isMobile ? 0 : 22;
  const cardMaxW   = isMobile ? '100%' : 880;
  const cardHeight = isMobile
    ? '100%'
    : isTablet
    ? 'min(700px, calc(100vh - 40px))'
    : 'min(660px, calc(100vh - 40px))';

  /* ── Mobile layout — single column, stacked ── */
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,700;0,800;1,700&display=swap');
          * { box-sizing: border-box; }
          ::selection { background: rgba(37,99,235,0.18); color: #1e3a8a; }
          input::placeholder { color: #c1cada; }
        `}</style>

        {/* Navy top bar */}
        <MobileHeader isLogin={isLogin} />

        {/* Form area */}
        <div style={{ flex: 1, overflowY: 'auto', background: C.surface, padding: `${formPadV}px ${formPadH}px` }}>
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div key="login-mobile"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                <div style={{ marginBottom: 22 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 4, fontFamily: "'Fraunces', serif" }}>Welcome back</h2>
                  <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0 }}>Sign in to your account</p>
                </div>
                <LoginForm onSwitch={switchMode} isMobile />
              </motion.div>
            ) : (
              <motion.div key="signup-mobile"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                <div style={{ marginBottom: 22 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 4, fontFamily: "'Fraunces', serif" }}>Create Account</h2>
                  <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0 }}>Join IntelliHire today</p>
                </div>
                <SignupForm onSwitch={switchMode} isMobile />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ── Tablet / Desktop layout — split panel card ── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eef2fb 0%, #f0f4ff 40%, #ebf0fa 70%, #edf1fb 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', fontFamily: "'DM Sans', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,700;0,800;1,700&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(37,99,235,0.18); color: #1e3a8a; }
        input::placeholder { color: #c1cada; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.18); border-radius: 99px; }
        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.6; }
          40%      { transform: translate(50px,-35px) scale(1.1); opacity:0.8; }
          70%      { transform: translate(-30px,25px) scale(0.95); opacity:0.55; }
        }
        @keyframes drift2 {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.45; }
          35%      { transform: translate(-60px,40px) scale(1.12); opacity:0.6; }
          70%      { transform: translate(40px,-25px) scale(0.9); opacity:0.4; }
        }
      `}</style>

      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-8%', left: '8%', width: 620, height: 480, borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%', background: 'radial-gradient(ellipse, rgba(37,99,235,0.14) 0%, rgba(99,102,241,0.06) 50%, transparent 70%)', filter: 'blur(50px)', animation: 'drift1 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-4%', right: '2%', width: 560, height: 440, borderRadius: '45% 55% 40% 60% / 55% 45% 65% 35%', background: 'radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, rgba(56,189,248,0.05) 45%, transparent 70%)', filter: 'blur(55px)', animation: 'drift2 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '40%', width: 400, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'drift1 24s ease-in-out infinite reverse' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: cardMaxW,
          height: cardHeight,
          borderRadius: cardRadius,
          boxShadow: C.shadowLg + ', 0 0 0 1px rgba(30,58,138,0.07)',
          overflow: 'hidden',
          position: 'relative',
          background: C.surface,
        }}
      >
        {/* LEFT: Sign Up */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
          background: C.surface, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: `${formPadV}px ${formPadH}px`,
          zIndex: 0, overflowY: 'auto',
        }}>
          <motion.div
            animate={{ opacity: isLogin ? 0 : 1, scale: isLogin ? 0.97 : 1, filter: isLogin ? 'blur(2px)' : 'blur(0px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ pointerEvents: isLogin ? 'none' : 'auto' }}
          >
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: isTablet ? 20 : 24, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 5, fontFamily: "'Fraunces', serif" }}>Create Account</h2>
              <p style={{ fontSize: 13.5, color: C.textMuted }}>Join IntelliHire today</p>
            </div>
            <SignupForm onSwitch={switchMode} isMobile={false} />
          </motion.div>
        </div>

        {/* RIGHT: Sign In */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', width: '50%', height: '100%',
          background: C.surface, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: `${formPadV}px ${formPadH}px`,
          zIndex: 0, overflowY: 'auto',
        }}>
          <motion.div
            animate={{ opacity: isLogin ? 1 : 0, scale: isLogin ? 1 : 0.97, filter: isLogin ? 'blur(0px)' : 'blur(2px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ pointerEvents: isLogin ? 'auto' : 'none' }}
          >
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: isTablet ? 20 : 24, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 5, fontFamily: "'Fraunces', serif" }}>Welcome back</h2>
              <p style={{ fontSize: 13.5, color: C.textMuted }}>Sign in to your account</p>
            </div>
            <LoginForm onSwitch={switchMode} isMobile={false} />
          </motion.div>
        </div>

        {/* Sliding navy panel */}
        <motion.div
          initial={{ x: '0%' }}
          animate={{ x: isLogin ? '0%' : '100%' }}
          transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.9 }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
            background: C.gradPanel, display: 'flex', flexDirection: 'column',
            padding: panelPad, zIndex: 2, overflow: 'hidden',
          }}
        >
          <PanelContent isLogin={panelIsLogin} />
        </motion.div>

        {/* Footer bar */}
        <motion.div
          animate={{ left: isLogin ? '50%' : '0%' }}
          transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.9 }}
          style={{
            position: 'absolute', bottom: 0, width: '50%',
            padding: `11px ${formPadH}px`,
            borderTop: `1px solid ${C.border}`,
            textAlign: 'center', fontSize: 11, color: C.textFaint,
            background: C.surface, zIndex: 1,
          }}
        >
          By {isLogin ? 'signing in' : 'signing up'}, you agree to our{' '}
          <motion.a href="#" whileHover={{ color: C.navy }} style={{ color: C.blue, textDecoration: 'none', transition: 'color 0.15s' }}>Terms</motion.a>
          {' '}and{' '}
          <motion.a href="#" whileHover={{ color: C.navy }} style={{ color: C.blue, textDecoration: 'none', transition: 'color 0.15s' }}>Privacy Policy</motion.a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;