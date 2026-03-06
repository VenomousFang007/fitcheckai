
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If there's a session on load at this route, it's a recovery flow or an active session
      setIsValid(!!session);
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValid(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (isValid === null) {
    return (
      <div className="min-h-screen bg-classik-beige flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-classik-dark/10 border-t-classik-dark rounded-full animate-spin" />
      </div>
    );
  }

  // NO ACTIVE RECOVERY SESSION
  if (!isValid) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-manrope">
        <div className="w-full max-w-sm text-center space-y-6">
          <p className="text-classik-taupe text-sm font-medium leading-relaxed">
            This reset link is invalid or has expired.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-dark border-b border-classik-dark/20 pb-1"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE RECOVERY SESSION
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-manrope selection:bg-classik-dark/10">
      <div className="w-full max-w-sm">
        {success ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-classik-dark font-black text-xs uppercase tracking-[0.2em]">
              Password updated successfully.
            </p>
            <p className="text-classik-taupe text-[10px] font-bold uppercase tracking-widest opacity-60">
              Returning to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-classik-black/40 uppercase tracking-[0.25em] mb-2.5 ml-1">
                  New password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-classik-beige/30 border border-classik-black/5 rounded-2xl px-6 py-4 text-classik-black font-semibold text-sm focus:outline-none focus:border-classik-dark transition-all placeholder-classik-black/10"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-classik-black/40 uppercase tracking-[0.25em] mb-2.5 ml-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-classik-beige/30 border border-classik-black/5 rounded-2xl px-6 py-4 text-classik-black font-semibold text-sm focus:outline-none focus:border-classik-dark transition-all placeholder-classik-black/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[13px] font-bold text-red-800/80 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 rounded-full font-black text-[11px] uppercase tracking-[0.35em] text-white bg-classik-dark transition-all shadow-lg active:scale-[0.98] disabled:opacity-30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                'Update password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
