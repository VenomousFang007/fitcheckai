import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error.message);
        navigate('/auth'); // back to login
        return;
      }

      if (data.session) {
        // ✅ User is authenticated
        navigate('/upload'); // or /results or /dashboard
      } else {
        // ❌ No session found
        navigate('/auth');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-classik-taupe">
      Signing you in…
    </div>
  );
}