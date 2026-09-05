import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  ShoppingBag, 
  Bike, 
  Shield, 
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle, quickDemoLogin, loading } = useAuth();
  const { addToast, setRole } = useStore();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [authActionPending, setAuthActionPending] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsOperationNotAllowed(false);

    try {
      if (isRegister) {
        if (!email || !password || !displayName) {
          setErrorMsg('Please fill in all required fields.');
          return;
        }
        await register(email, password, displayName, phone);
        addToast('Welcome to 24', `Account registered for ${displayName}`, 'success');
      } else {
        if (!email || !password) {
          setErrorMsg('Email and password required.');
          return;
        }
        await login(email, password);
        addToast('Signed In', `Authenticated as ${email}`, 'success');
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      const rawMsg = err.message || '';
      
      if (err.code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed') || rawMsg.includes('provider is not enabled')) {
        setIsOperationNotAllowed(true);
        setErrorMsg('Firebase Email/Password authentication is disabled in your Firebase Console.');
      } else if (rawMsg.includes('auth/invalid-credential') || rawMsg.includes('auth/wrong-password') || rawMsg.includes('auth/user-not-found')) {
        setErrorMsg('Invalid email or password.');
      } else if (rawMsg.includes('auth/email-already-in-use')) {
        setErrorMsg('An account with this email already exists. Try signing in.');
      } else if (rawMsg.includes('auth/weak-password')) {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(rawMsg || 'Authentication failed.');
      }
    }
  };

  const handleDemoLogin = async (demoRole: 'ADMIN' | 'RIDER' | 'CUSTOMER') => {
    setErrorMsg(null);
    setIsOperationNotAllowed(false);
    setAuthActionPending(`demo-${demoRole}`);

    try {
      const userProfile = await quickDemoLogin(demoRole);
      setRole(demoRole);
      addToast('Quick Demo Active', `Switched to ${userProfile.display_name} (${demoRole})`, 'success');
      onClose();
    } catch (e: any) {
      console.error('Quick demo login error:', e);
      setErrorMsg(e.message || 'Demo sign in failed.');
    } finally {
      setAuthActionPending(null);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsOperationNotAllowed(false);
    setAuthActionPending('google');

    try {
      const userProfile = await loginWithGoogle();
      addToast('Signed In with Google', `Welcome back, ${userProfile.display_name}`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('closed-by-user')) {
        // User voluntarily closed popup
        return;
      }
      setErrorMsg(err.message || 'Google sign in failed.');
    } finally {
      setAuthActionPending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl my-8">
        <button
          id="auth-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">
              {isRegister ? 'Create 24 Account' : 'Sign In'}
            </h2>
            <p className="text-xs text-stone-400">
              {isRegister ? 'Register for order tracking & member perks' : 'Access your profile, orders & cockpit'}
            </p>
          </div>
        </div>

        {/* Quick Demo Identities Highlighted at Top for instant zero-friction access */}
        <div className="mb-5 p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-mono-code font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Quick Demo Identities
            </div>
            <span className="text-[10px] text-emerald-400 font-mono-code bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-semibold">
              Instant 1-Click
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              id="demo-login-customer-btn"
              type="button"
              disabled={loading || !!authActionPending}
              onClick={() => handleDemoLogin('CUSTOMER')}
              className="group p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 transition-all text-left flex flex-col items-center justify-center text-center active:scale-95"
            >
              <div className="w-7 h-7 rounded-md bg-stone-800 group-hover:bg-amber-500/20 flex items-center justify-center mb-1 text-stone-300 group-hover:text-amber-400 transition-colors">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-stone-200 group-hover:text-white">Customer</span>
              <span className="text-[10px] text-stone-500 font-mono-code">Storefront</span>
            </button>

            <button
              id="demo-login-rider-btn"
              type="button"
              disabled={loading || !!authActionPending}
              onClick={() => handleDemoLogin('RIDER')}
              className="group p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-sky-500/50 transition-all text-left flex flex-col items-center justify-center text-center active:scale-95"
            >
              <div className="w-7 h-7 rounded-md bg-stone-800 group-hover:bg-sky-500/20 flex items-center justify-center mb-1 text-stone-300 group-hover:text-sky-400 transition-colors">
                <Bike className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-stone-200 group-hover:text-white">Rider</span>
              <span className="text-[10px] text-stone-500 font-mono-code">Deliveries</span>
            </button>

            <button
              id="demo-login-admin-btn"
              type="button"
              disabled={loading || !!authActionPending}
              onClick={() => handleDemoLogin('ADMIN')}
              className="group p-2 rounded-lg bg-purple-950/30 hover:bg-purple-950/60 border border-purple-800/40 hover:border-purple-500/50 transition-all text-left flex flex-col items-center justify-center text-center active:scale-95"
            >
              <div className="w-7 h-7 rounded-md bg-purple-900/50 group-hover:bg-purple-500/30 flex items-center justify-center mb-1 text-purple-300 transition-colors">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-purple-200 group-hover:text-white">Admin</span>
              <span className="text-[10px] text-purple-400/80 font-mono-code">Operations</span>
            </button>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          id="google-signin-btn"
          type="button"
          disabled={loading || !!authActionPending}
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-750 text-stone-100 font-semibold rounded-xl text-xs sm:text-sm border border-stone-700 transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-98 mb-4 hover:border-stone-500"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{authActionPending === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-stone-800 w-full" />
          <span className="bg-stone-900 px-3 text-[11px] font-mono-code text-stone-500 uppercase tracking-wider shrink-0">
            or with email
          </span>
          <div className="border-t border-stone-800 w-full" />
        </div>

        {isOperationNotAllowed && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs text-stone-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Firebase Email/Password Auth Setup</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              Firebase projects require the Email/Password provider to be enabled manually:
            </p>
            <div className="text-[11px] font-mono-code bg-stone-950/80 p-2 rounded border border-stone-800 text-amber-200">
              Firebase Console → Authentication → Sign-in method → Enable Email/Password
            </div>
            <p className="text-[11px] text-stone-400">
              In the meantime, you can click <strong>Customer</strong>, <strong>Rider</strong>, or <strong>Admin</strong> above to test all features immediately!
            </p>
          </div>
        )}

        {errorMsg && !isOperationNotAllowed && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                  <input
                    id="auth-register-name-input"
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                  <input
                    id="auth-register-phone-input"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(603) 555-0199"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@manchester.net"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading || !!authActionPending}
            className="w-full py-2.5 mt-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 active:scale-98"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-3.5 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>{isRegister ? 'Already have an account?' : 'New to 24?'}</span>
          <button
            id="auth-toggle-mode-btn"
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
              setIsOperationNotAllowed(false);
            }}
            className="text-amber-400 font-semibold hover:underline"
          >
            {isRegister ? 'Sign In Instead' : 'Register Here'}
          </button>
        </div>
      </div>
    </div>
  );
};
