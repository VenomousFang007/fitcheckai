import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EyeIcon, EyeOffIcon } from './Icons';
import { FitCheckLogo } from "./FitCheckLogo";


export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getErrorMessage = (error: any) => {
    if (!error) return '';
    if (error.message.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (error.message.includes('User already registered')) return 'This email is already in use.';
    if (error.message.includes('password')) return 'Password must be at least 6 characters.';
    if (error.message.includes('valid email')) return 'Please enter a valid email address.';
    return error.message;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        setErrorMsg('If an account exists for this email, we’ve sent a reset link.');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });
        if (error) throw error;
        if (!error && !isLogin) {
          setErrorMsg('Registration successful. Please verify your email.');
        }
      }
    } catch (error: any) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

    const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
redirectTo: window.location.origin,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const animationClasses = {
    logo: `transition-all duration-1000 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`,
    tagline: `transition-all duration-1000 delay-500 ${isMounted ? 'opacity-100' : 'opacity-0'}`,
    inputs: `transition-all duration-1000 delay-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`,
    button: `transition-all duration-1000 delay-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`
  };

  return (
    <div className="min-h-screen bg-classik-beige flex flex-col items-center justify-center p-6 text-classik-black font-manrope selection:bg-classik-dark/10">
      
      {/* Background Ambience */}
      <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] bg-classik-warm/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] bg-classik-taupe/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        <div className="mb-12 flex flex-col items-center text-center">
  {/* Brand Lockup */}
  <div
    className={`flex items-center gap-4 ${animationClasses.logo}`}
  >
    <FitCheckLogo className="w-16 md:w-20 text-classik-dark" />

    <span className="text-2xl md:text-3xl font-black uppercase tracking-[0.25em] text-classik-black">
      FitCheck<span className="text-classik-dark">AI</span>
    </span>
  </div>

  {/* Tagline */}
  <p
    className={`mt-4 text-classik-taupe font-bold text-xs uppercase tracking-[0.3em] ${animationClasses.tagline}`}
  >
    {isForgotPassword
      ? 'Reset your password'
      : isLogin
      ? 'Welcome back. Let’s check your fit.'
      : 'Create your style profile.'}
  </p>
</div>

        <div className={`w-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-10 shadow-sm relative overflow-hidden transition-opacity duration-700 ${animationClasses.inputs}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          
          <form onSubmit={handleAuth} className="space-y-6 relative z-10 transition-all duration-500">
            
            <div className="transition-all duration-500 ease-in-out">
              {!isLogin && !isForgotPassword && (
                <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-in">
                  <div>
                    <label className="block text-[9px] font-black text-classik-black/40 uppercase tracking-[0.25em] mb-2.5 ml-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-white/50 border border-classik-black/5 rounded-2xl px-6 py-4 text-classik-black font-semibold text-sm focus:outline-none focus:border-classik-dark transition-all placeholder-classik-black/20"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-classik-black/40 uppercase tracking-[0.25em] mb-2.5 ml-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-white/50 border border-classik-black/5 rounded-2xl px-6 py-4 text-classik-black font-semibold text-sm focus:outline-none focus:border-classik-dark transition-all placeholder-classik-black/20"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black text-classik-black/40 uppercase tracking-[0.25em] mb-2.5 ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/50 border border-classik-black/5 rounded-2xl px-6 py-4 text-classik-black font-semibold text-sm focus:outline-none focus:border-classik-dark transition-all placeholder-classik-black/20"
                    placeholder="name@email.com"
                  />
                </div>

                {!isForgotPassword && (
                  <div>
                    <label className="block text-[9px] font-black text-classik-black/40 uppercase tracking-[0.25em] mb-2.5 ml-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/50 border border-classik-black/5 rounded-2xl px-6 py-4 pr-12 text-classik-black font-semibold text-sm focus:outline-none focus:border-classik-dark transition-all placeholder-classik-black/20"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-classik-black/30 hover:text-classik-black/60 transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                    {isLogin && (
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setErrorMsg('');
                          }}
                          className="text-[10px] text-classik-taupe/60 uppercase tracking-[0.1em] hover:text-classik-dark transition-colors"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className={`p-4 rounded-2xl text-[13px] font-bold text-center animate-fade-in ${errorMsg.includes('sent') || errorMsg.includes('successful') ? 'bg-classik-warm/10 text-classik-dark' : 'bg-red-50 text-red-800/80 border border-red-100'}`}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-16 rounded-full font-black text-[11px] uppercase tracking-[0.35em] text-white bg-classik-dark transition-all shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${animationClasses.button}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                isForgotPassword ? 'Send reset link' : (isLogin ? 'Sign In' : 'Sign Up')
              )}
            </button>
          </form>

          

          {/* Google Sign-In (hidden during forgot password) */}
{!isForgotPassword && (
  <div className="mt-6">
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full h-16 rounded-full bg-white border border-classik-black/10 text-classik-black font-black text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:bg-white/80 transition-all active:scale-[0.98]"
    >
      {/* Google Icon */}
      <svg
        className="w-5 h-5"
        viewBox="0 0 533.5 544.3"
      >
        <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.3h146.9c-6.3 34.1-25 62.9-53.4 82.1v68.1h86.3c50.5-46.5 81.7-115 81.7-195.1z" />
        <path fill="#34a853" d="M272 544.3c72.6 0 133.6-24.1 178.1-65.6l-86.3-68.1c-24 16.1-54.7 25.6-91.8 25.6-70.7 0-130.7-47.7-152.2-111.8H32.7v70.2C76.9 475.4 168.1 544.3 272 544.3z" />
        <path fill="#fbbc04" d="M119.8 324.4c-10.8-32.1-10.8-66.7 0-98.8V155.4H32.7c-37.2 74.4-37.2 162.1 0 236.5l87.1-67.5z" />
        <path fill="#ea4335" d="M272 107.7c39.5-.6 77.5 14.1 106.5 40.8l79.5-79.5C411.7 24.2 346.1-1.3 272 0 168.1 0 76.9 68.9 32.7 155.4l87.1 70.2C141.3 155.4 201.3 107.7 272 107.7z" />
      </svg>

      Continue with Google
    </button>
  </div>
)}

          <div className={`mt-10 text-center transition-all duration-1000 delay-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            {isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMsg('');
                }}
                className="text-[10px] text-classik-taupe/60 uppercase tracking-[0.25em] outline-none hover:text-classik-dark"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMsg('');
                }}
                className="text-[10px] text-classik-taupe/60 uppercase tracking-[0.25em] outline-none"
              >
                {isLogin ? (
                  <>Don’t have an account? <span className="text-classik-dark">Sign Up</span></>
                ) : (
                  <>Already have an account? <span className="text-classik-dark">Sign In</span></>
                )}
              </button>
            )}
          </div>
        </div>
        
        
        <p className={`mt-12 text-center text-[9px] font-bold text-classik-taupe/30 uppercase tracking-[0.4em] italic transition-all duration-1000 delay-[1200ms] ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
  Styling is the language of confidence.
</p>

<div className="mt-8 text-center text-xs text-gray-500">
  <button
    className="hover:text-gray-800 transition-colors"
    onClick={() => window.dispatchEvent(new Event('open-privacy'))}
  >
    Privacy Policy
  </button>
  {' • '}
  <button
    className="hover:text-gray-800 transition-colors"
    onClick={() => window.dispatchEvent(new Event('open-terms'))}
  >
    Terms of Service
  </button>
</div>
      </div>
    </div>
  );
}