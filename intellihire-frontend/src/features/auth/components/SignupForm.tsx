import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// ── Schema ────────────────────────────────────────────────────────────────────
const signupSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

// ── Shared input style helper ─────────────────────────────────────────────────
const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px 12px 42px',
  border: `1.5px solid ${hasError ? '#e55' : '#dce6f7'}`,
  borderRadius: '10px',
  fontSize: '14px',
  color: '#0d1f4a',
  background: '#f7faff',
  outline: 'none',
  fontFamily: 'inherit',
});

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#3a4f78',
  marginBottom: '7px',
};

// ── Component ─────────────────────────────────────────────────────────────────
export const SignupForm: React.FC = () => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = async (data: SignupFormData) => {
    try {
      const { confirmPassword, ...rest } = data;
      await registerUser(rest);
      navigate('/dashboard');
    } catch (_) {}
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #dbeafe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 8px 48px rgba(18,70,168,0.14)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '36px 40px 0', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg,#1246a8,#2d77f7)',
                borderRadius: '12px',
                width: '44px',
                height: '44px',
                marginBottom: '14px',
              }}
            >
              <Briefcase size={22} color="#fff" />
            </div>
            <h2
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: '#0d1f4a',
                letterSpacing: '-0.4px',
                marginBottom: '4px',
              }}
            >
              Create Account
            </h2>
            <p style={{ fontSize: '14px', color: '#7a8fb5', marginBottom: '0' }}>
              Join IntelliHire today
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 40px 32px' }}>
            {error && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '10px 14px',
                  background: '#fff0f0',
                  border: '1px solid #f5c0c0',
                  borderRadius: '10px',
                  color: '#c0392b',
                  fontSize: '13px',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              {/* Full Name */}
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color="#93aad4"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    {...register('name')}
                    style={inputStyle(!!errors.name)}
                    onFocus={e => (e.target.style.borderColor = '#2d77f7')}
                    onBlur={e => (e.target.style.borderColor = errors.name ? '#e55' : '#dce6f7')}
                  />
                </div>
                {errors.name && (
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#d43b3b' }}>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="#93aad4"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    {...register('email')}
                    style={inputStyle(!!errors.email)}
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
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="#93aad4"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    {...register('password')}
                    style={{ ...inputStyle(!!errors.password), paddingRight: '44px' }}
                    onFocus={e => (e.target.style.borderColor = '#2d77f7')}
                    onBlur={e => (e.target.style.borderColor = errors.password ? '#e55' : '#dce6f7')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#93aad4',
                      display: 'flex',
                      padding: '4px',
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

              {/* Confirm Password */}
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="#93aad4"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    {...register('confirmPassword')}
                    style={{ ...inputStyle(!!errors.confirmPassword), paddingRight: '44px' }}
                    onFocus={e => (e.target.style.borderColor = '#2d77f7')}
                    onBlur={e =>
                      (e.target.style.borderColor = errors.confirmPassword ? '#e55' : '#dce6f7')
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#93aad4',
                      display: 'flex',
                      padding: '4px',
                    }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#d43b3b' }}>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: isLoading
                    ? '#93aad4'
                    : 'linear-gradient(135deg,#1246a8,#2d77f7)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                }}
              >
                {isLoading ? 'Creating account…' : 'Create Account'}
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '24px 0 16px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#e5edf8' }} />
              <span style={{ fontSize: '13px', color: '#b0c2de', whiteSpace: 'nowrap' }}>
                Already have an account?
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e5edf8' }} />
            </div>

            <Link
              to="/auth/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                border: '1.5px solid #2d77f7',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1246a8',
                textDecoration: 'none',
                background: 'transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLAnchorElement).style.background = '#f0f6ff')
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')
              }
            >
              Sign in instead
            </Link>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: '1px solid #f0f4fb',
              padding: '16px 40px',
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#b0c2de',
            }}
          >
            By signing up, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
};