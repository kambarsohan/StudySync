import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from '../../components/Brand'
import { Button, Card, Field } from '../../components/ui'
import { useAuth } from './AuthProvider'
import { requireSupabase, supabaseConfigured } from '../../lib/supabase'
import { loginSchema, resetPasswordSchema, signupSchema } from '../../lib/validators'

type Mode = 'login' | 'signup' | 'forgot' | 'reset'
type AuthValues = { fullName: string; email: string; password: string; confirmPassword: string; agreed: boolean }
const forgotSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') })

export function AuthPage({ mode }: { mode: Mode }) {
  const { state } = useLocation() as { state?: { from?: { pathname?: string } } }
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const isSignup = mode === 'signup'
  const isLogin = mode === 'login'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'
  const schema = isSignup ? signupSchema : isLogin ? loginSchema : isReset ? resetPasswordSchema : forgotSchema
  const form = useForm<AuthValues>({
    resolver: zodResolver(schema) as Resolver<AuthValues>,
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', agreed: false },
  })
  const errors = form.formState.errors

  async function submit(values: AuthValues) {
    if (!supabaseConfigured) {
      setNotice('Connect a Supabase project to enable authentication. Add the two browser-safe values shown in .env.example, then reload.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const client = requireSupabase()
      if (isSignup) {
        const { data, error } = await client.auth.signUp({
          email: values.email.trim(), password: values.password,
          options: { data: { full_name: values.fullName.trim() }, emailRedirectTo: `${window.location.origin}/onboarding` },
        })
        if (error) throw error
        if (!data.session) {
          setNotice('Check your inbox for a confirmation link. After confirming, you can finish your student profile.')
        } else {
          await refreshProfile(data.user?.id)
          navigate('/onboarding', { replace: true })
        }
      } else if (isLogin) {
        const { data, error } = await client.auth.signInWithPassword({ email: values.email.trim(), password: values.password })
        if (error) throw error
        await refreshProfile(data.user?.id)
        navigate(state?.from?.pathname || '/dashboard', { replace: true })
      } else if (isForgot) {
        const { error } = await client.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
        if (error) throw error
        setNotice('If an account matches that email, a password reset link is on its way.')
      } else {
        const { error } = await client.auth.updateUser({ password: values.password })
        if (error) throw error
        toast.success('Password updated. Please sign in with your new password.')
        navigate('/login', { replace: true })
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  const title = isSignup ? 'Make space to grow.' : isLogin ? 'Good to see you again.' : isForgot ? 'Reset your password.' : 'Choose a new password.'
  const intro = isSignup ? 'Create your account and find the people who help you do your best work.' : isLogin ? 'Pick up where your last study session left off.' : isForgot ? 'We’ll send you a secure link to get back into your account.' : 'Choose a strong password you have not used before.'
  const friendlyNotice = notice.startsWith('If an account') || notice.startsWith('Check your inbox')

  return <main className="auth-page">
    <section className="auth-aside"><Brand /><div className="auth-aside-copy"><span className="eyebrow"><Sparkles size={14} /> A better way to study together</span><h1>Good work is easier when it’s shared.</h1><p>Find your people, make a plan, and keep showing up for the goals that matter to you.</p><div className="auth-aside-mark"><div className="orb orb-one" /><div className="orb orb-two" /><div className="study-note"><LockKeyhole size={16} /> Your profile. Your boundaries.</div></div></div><div className="auth-aside-bottom"><span>Study smarter. Find your people. Achieve together.</span><Link to="/privacy">Privacy first</Link></div></section>
    <section className="auth-main"><div className="auth-mobile-brand"><Brand /></div><Card className="auth-card">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to home</Link>
      <p className="eyebrow">STUDYSYNC ACCOUNT</p><h2>{title}</h2><p className="auth-intro">{intro}</p>
      {notice && <div className={`notice ${friendlyNotice ? 'notice-success' : 'notice-info'}`} role="status">{notice}</div>}
      {!supabaseConfigured && <div className="notice notice-info" role="status">Authentication is safely paused until a Supabase project is configured. See the setup guide and <code>.env.example</code>.</div>}
      <form className="form-stack" onSubmit={form.handleSubmit(submit)} noValidate>
        {isSignup && <Field label="Full name" placeholder="e.g. Alex Morgan" autoComplete="name" {...form.register('fullName')} error={errors.fullName?.message} />}
        {(isSignup || isLogin || isForgot) && <Field label="Email address" type="email" placeholder="you@university.edu" autoComplete="email" {...form.register('email')} error={errors.email?.message} />}
        {!isForgot && <div className="field password-field"><label htmlFor="auth-password">{isReset ? 'New password' : 'Password'}</label><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup || isReset ? 'new-password' : 'current-password'} placeholder={isReset || isSignup ? 'At least 10 characters' : 'Enter your password'} {...form.register('password')} aria-invalid={Boolean(errors.password)} /> <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>{errors.password && <span className="field-error" role="alert">{errors.password.message}</span>}</div>}
        {(isSignup || isReset) && <div className="field password-field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" {...form.register('confirmPassword')} aria-invalid={Boolean(errors.confirmPassword)} /><button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}>{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button>{errors.confirmPassword && <span className="field-error" role="alert">{errors.confirmPassword.message}</span>}</div>}
        {isSignup && <label className="checkbox-row"><input type="checkbox" {...form.register('agreed')} /><span>I agree to the <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.</span>{errors.agreed && <span className="field-error" role="alert">{errors.agreed.message}</span>}</label>}
        {isLogin && <div className="auth-options"><span>Secure sign in</span><Link to="/forgot-password">Forgot password?</Link></div>}
        <Button type="submit" disabled={busy} className="button-wide">{busy ? <><LoaderCircle className="spin" size={17} /> Please wait…</> : <>{isSignup ? 'Create account' : isLogin ? 'Sign in' : isForgot ? 'Send reset link' : 'Update password'} <ArrowRight size={16} /></>}</Button>
      </form>
      <p className="auth-switch">{isLogin ? <>New to StudySync? <Link to="/signup">Create an account</Link></> : isSignup ? <>Already have an account? <Link to="/login">Sign in</Link></> : isForgot ? <>Remembered it? <Link to="/login">Sign in</Link></> : <>Back to <Link to="/login">sign in</Link></>}</p>
      <p className="auth-safe"><Mail size={14} /> Your email and contact details are never shown publicly.</p>
    </Card></section>
  </main>
}
