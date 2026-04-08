import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Briefcase,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigate('/dashboard');
    } catch (_) {}
  };

  const features = [
    { icon: Sparkles, text: 'AI-Powered Resume Search' },
    { icon: Zap, text: 'Fast Candidate Matching' },
    { icon: Users, text: 'Talent Pool Management' },
    { icon: Shield, text: 'Enterprise Security' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #dbeafe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Outer max-width container */}
      <div style={{ width: '100%', maxWidth: '960px' }}>
        {/* Two-column grid wrapper */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          {/* ── LEFT: Brand panel ───────────────────────────────── */}
          <div
            style={{
              background: 'linear-gradient(145deg, #1246a8 0%, #1e5dda 55%, #2d77f7 100%)',
              borderRadius: '20px',
              padding: '48px 40px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              minHeight: '480px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* decorative circles */}
            <div
              style={{
                position: 'absolute', top: '-50px', right: '-50px',
                width: '180px', height: '180px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
              }}
            />
            <div
              style={{
                position: 'absolute', bottom: '-40px', left: '-40px',
                width: '140px', height: '140px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
              }}
            />

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  width: '44px', height: '44px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Briefcase size={22} color="#fff" />
              </div>
              <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                IntelliHire
              </span>
            </div>

            {/* Headline */}
            <div>
              <h2
                style={{
                  fontSize: '36px', fontWeight: 700, lineHeight: 1.15,
                  marginBottom: '12px', letterSpacing: '-0.5px',
                }}
              >
                Welcome<br />back.
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
                Your next great hire is waiting.<br />Sign in to continue your journey.
              </p>
            </div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {features.map(({ icon: Icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      width: '32px', height: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} color="#fff" />
                  </div>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: 'auto' }}>
              Trusted by 1,000+ companies worldwide
            </p>
          </div>

          {/* ── RIGHT: Login form card ───────────────────────────── */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 8px 48px rgba(18,70,168,0.14)',
              overflow: 'hidden',
            }}
          >
            {/* Card body */}
            <div style={{ padding: '40px 40px 32px' }}>
              {/* Mobile logo (shown only when left panel wraps below) */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                    marginBottom: '6px',
                  }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#1246a8,#2d77f7)',
                      borderRadius: '10px', padding: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Briefcase size={20} color="#fff" />
                  </div>
                </div>
                <h2
                  style={{
                    fontSize: '26px', fontWeight: 700, color: '#0d1f4a',
                    letterSpacing: '-0.4px', marginBottom: '4px',
                  }}
                >
                  Sign In
                </h2>
                <p style={{ fontSize: '14px', color: '#7a8fb5' }}>
                  Access your hiring dashboard
                </p>
              </div>

              {/* Error alert */}
              {error && (
                <div
                  style={{
                    marginBottom: '20px', padding: '10px 14px',
                    background: '#fff0f0', border: '1px solid #f5c0c0',
                    borderRadius: '10px', color: '#c0392b', fontSize: '13px',
                    display: 'flex', gap: '8px',
                  }}
                >
                  <span>⚠️</span>
                  <p style={{ margin: 0 }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Email */}
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: '13px', fontWeight: 500,
                      color: '#3a4f78', marginBottom: '7px',
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={16} color="#93aad4"
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="email"
                      placeholder="you@company.com"
                      {...register('email')}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '12px 14px 12px 42px',
                        border: errors.email ? '1.5px solid #e55' : '1.5px solid #dce6f7',
                        borderRadius: '10px', fontSize: '14px',
                        color: '#0d1f4a', background: '#f7faff', outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#2d77f7')}
                      onBlur={e => (e.target.style.borderColor = errors.email ? '#e55' : '#dce6f7')}
                    />
                  </div>
                  {errors.email && (
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#d43b3b' }}>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: '13px', fontWeight: 500,
                      color: '#3a4f78', marginBottom: '7px',
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16} color="#93aad4"
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '12px 44px 12px 42px',
                        border: errors.password ? '1.5px solid #e55' : '1.5px solid #dce6f7',
                        borderRadius: '10px', fontSize: '14px',
                        color: '#0d1f4a', background: '#f7faff', outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#2d77f7')}
                      onBlur={e => (e.target.style.borderColor = errors.password ? '#e55' : '#dce6f7')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#93aad4', display: 'flex', padding: '4px',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#d43b3b' }}>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember me + Forgot */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      fontSize: '13px', color: '#7a8fb5', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ accentColor: '#2d77f7', width: '14px', height: '14px' }}
                    />
                    Remember me
                  </label>
                  <a
                    href="#"
                    style={{
                      fontSize: '13px', color: '#2d77f7', fontWeight: 500, textDecoration: 'none',
                    }}
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '13px',
                    background: isLoading ? '#93aad4' : 'linear-gradient(135deg,#1246a8,#2d77f7)',
                    border: 'none', borderRadius: '10px',
                    fontSize: '15px', fontWeight: 600, color: '#fff',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: 'inherit', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  {isLoading ? 'Signing in…' : 'Sign In'}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </form>

              {/* Divider */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  margin: '24px 0 16px',
                }}
              >
                <div style={{ flex: 1, height: '1px', background: '#e5edf8' }} />
                <span style={{ fontSize: '13px', color: '#b0c2de', whiteSpace: 'nowrap' }}>
                  New to IntelliHire?
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e5edf8' }} />
              </div>

              <Link
                to="/auth/signup"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px',
                  border: '1.5px solid #2d77f7', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, color: '#1246a8',
                  textDecoration: 'none', background: 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = '#f0f6ff')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
              >
                Create an account
              </Link>
            </div>

            {/* Card footer */}
            <div
              style={{
                borderTop: '1px solid #f0f4fb',
                padding: '16px 40px',
                textAlign: 'center',
                fontSize: '11.5px',
                color: '#b0c2de',
              }}
            >
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};