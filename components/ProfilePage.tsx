import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  ArrowLeftIcon, ProfileIcon,
  CalendarIcon, GaugeIcon,
  CameraIcon, BellIcon, LockIcon, LogOutIcon, ChevronRightIcon,
  RefreshIcon
} from './Icons';
import { supabase } from '../lib/supabase';
import { FitCheckLogo } from './FitCheckLogo';
import { SubscriptionTier } from '../types';

// --- NOTIFICATION TYPES ---

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

const TYPE_EMOJI: Record<string, string> = {
  payment_failed: '⚠️',
  subscription_created: '🎉',
  subscription_disabled: '😢',
  premium_expiry_warning: '⏰',
  renewal_reminder: '🔔',
  weekly_challenge: '🏆',
  streak_reminder: '🔥',
  engagement_nudge: '👋',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// --- COMPONENTS ---

interface SettingsSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const SettingsSheet: React.FC<SettingsSheetProps> = ({
  title,
  onClose,
  children
}) => (
  <div
    className="fixed inset-0 z-[600] flex items-end justify-center bg-classik-black/60 backdrop-blur-md animate-fade-in"
    onClick={onClose}
  >
    <div
      className="w-full max-w-md bg-white border-t border-classik-dark/5 rounded-t-[40px] p-8 pb-14 shadow-[0_-20px_60px_rgba(0,0,0,0.3)] transform animate-slide-up-sheet relative overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-classik-beige/30 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-xl font-black text-classik-black tracking-tight uppercase">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 opacity-40 hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

type ActiveSheet = 'notifications' | 'privacy' | 'reset' | 'logout' | 'subscription' | null;

interface ProfilePageProps {
  onBack: () => void;
  onHistory: () => void;
  session: Session | null;
  onResetApp: () => void;
  subscriptionTier?: SubscriptionTier;
  onOpenPaywall?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBack,
  onHistory,
  session,
  onResetApp,
  subscriptionTier = 'free',
  onOpenPaywall
}) => {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [streakRemindersEnabled, setStreakRemindersEnabled] = useState(true);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Notification center state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifListLoading, setNotifListLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleCancelSubscription = async () => {
    if (!session?.user?.id) {
      alert("Session expired. Please log in again.");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel your Premium subscription?\nYou will continue to have Premium access until the end of your current billing period.")) return;

    setIsCanceling(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to cancel subscription');

      alert("Subscription canceled successfully.");
      setActiveSheet(null);
    } catch (err: any) {
      console.error("Cancel err:", err);
      alert(err.message || 'Error connecting to the payment server. Please contact support.');
    } finally {
      setIsCanceling(false);
    }
  };

  // STRICT PROFILE STATS STATE (single source for UI)
  const [currentStreak, setCurrentStreak] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [avgScore, setAvgScore] = useState<number | '--'>('--');
  const [styleLabel, setStyleLabel] = useState('Style Explorer');

  const firstName = session?.user?.user_metadata?.first_name || 'SAM';
  const email = session?.user?.email;

  // --- LOAD NOTIFICATION PREFERENCES ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadNotificationPrefs = async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('daily_style_reminders, streak_reminders, weekly_summary')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load notification prefs:', error);
      } else {
        setNotificationsEnabled(!!data?.daily_style_reminders);
        setStreakRemindersEnabled(data?.streak_reminders !== false);
        setWeeklySummaryEnabled(data?.weekly_summary !== false);
      }

      setNotifLoading(false);
    };

    loadNotificationPrefs();
  }, [session]);

  // --- LOAD UNREAD COUNT (always, for badge) ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .neq('status', 'read');

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    loadUnreadCount();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel(`profile-notifs:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 30));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session?.user?.id]);

  // --- FETCH NOTIFICATIONS WHEN SHEET OPENS ---
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    setNotifListLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, status, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => n.status !== 'read').length);
    }
    setNotifListLoading(false);
  }, [session?.user?.id]);

  // --- MARK ALL AS READ ---
  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id || unreadCount === 0) return;
    setMarkingRead(true);

    const unreadIds = notifications.filter(n => n.status !== 'read').map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .in('id', unreadIds);

      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
      setUnreadCount(0);
    }
    setMarkingRead(false);
  }, [session?.user?.id, unreadCount, notifications]);

  // Auto-fetch and mark-read when notification sheet opens
  useEffect(() => {
    if (activeSheet === 'notifications') {
      fetchNotifications().then(() => {
        // Small delay so user sees the unread state before it clears
        setTimeout(() => markAllAsRead(), 800);
      });
    }
  }, [activeSheet, fetchNotifications, markAllAsRead]);

  // --- DATA LOADING ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadProfileData = async () => {
      try {
        // 1. Fetch Style DNA archetype from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('current_archetype')
          .eq('user_id', session.user.id) // ← THIS is your real column
          .maybeSingle();

        if (profileError) {
          console.error('Failed to load archetype:', profileError);
          setStyleLabel('Style Explorer');
        } else if (profile?.current_archetype) {
          setStyleLabel(profile.current_archetype);
        } else {
          setStyleLabel('Style DNA Forming');
        }


        // 2. Fetch all outfits (Single Query for stats)
        const { data, error } = await supabase
          .from('OutfitData')
          .select('created_at, score')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error || !data) throw error;

        // 3. Outfit count
        setHistoryCount(data.length);

        // 4. Average score
        const scored = data.filter(d => typeof d.score === 'number');
        if (scored.length > 0) {
          const total = scored.reduce((sum, i) => sum + i.score, 0);
          setAvgScore(Math.round(total / scored.length));
        } else {
          setAvgScore('--');
        }

        // 5. Streak calculation (timezone-safe, deterministic)
        const days = data.map(row => {
          const d = new Date(row.created_at);
          d.setHours(0, 0, 0, 0); // normalize
          return d.getTime();
        });

        const uniqueDays = Array.from(new Set(days)).sort((a, b) => b - a);

        let streak = 0;
        if (uniqueDays.length > 0) {
          // Check if latest is today or yesterday
          const latest = new Date(uniqueDays[0]);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          // Only count streak if latest outfit was today or yesterday
          if (latest.getTime() === today.getTime() || latest.getTime() === yesterday.getTime()) {
            let cursor = new Date(latest);
            for (const dayTs of uniqueDays) {
              if (dayTs === cursor.getTime()) {
                streak++;
                cursor.setDate(cursor.getDate() - 1);
              } else {
                break;
              }
            }
          }
        }

        setCurrentStreak(streak);

      } catch (e) {
        console.error('Profile load failed:', e);
      }
    };

    loadProfileData();
  }, [session]);

  // --- UI EFFECTS ---
  useEffect(() => {
    if (activeSheet) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeSheet]);

  // --- HANDLERS ---

  const toggleNotifications = async (val: boolean) => {
    if (!session?.user?.id || notifLoading) return;

    setNotificationsEnabled(val); // optimistic UI

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: session.user.id,
          daily_style_reminders: val
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Failed to update notification prefs:', error);
      // rollback UI if needed
      setNotificationsEnabled(!val);
    }
  };

  const handleResetStyleHistory = async () => {
    // 1. Guard against double clicks
    if (isResetting) return;

    // 2. No window.confirm needed. The UI Modal IS the confirmation.
    // We proceed immediately.

    // 3. Validate Session
    if (!session?.user?.id) {
      alert("Session expired. Please log in again.");
      return;
    }

    try {
      setIsResetting(true);

      // 4. Call RPC
      const { data, error } = await supabase.rpc('reset_user_history');

      // 5. Handle Network/Supabase Layer Errors
      if (error) throw error;

      // 6. Handle Logic/Database Layer Errors (from our custom JSON return)
      // Note: RPC returns 'data' as the JSON object we built in SQL
      const result = data as { success: boolean; deleted_count: number; error?: string; user?: string };

      if (!result.success) {
        throw new Error(result.error || 'Unknown database error');
      }

      console.log(`RESET COMPLETE. Deleted ${result.deleted_count} rows for user ${result.user}`);

      // 7. Clear Local Storage
      const keysToRemove = [
        'fitCheckLocalHistory',
        'fitcheckai_profile_insights',
        'fitcheckai_last_analyzed_count',
        'fitCheckStreak',

      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // 8. Reset UI State
      setCurrentStreak(0);
      setHistoryCount(0);
      setAvgScore('--');
      setStyleLabel('Style Explorer');
      setActiveSheet(null);

      // 9. Propagate to parent
      onResetApp();

    } catch (err: any) {
      console.error('Reset failed:', err);
      alert(`Reset Failed: ${err.message || 'Please check your connection.'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogoutConfirm = async () => {
    console.log("LOGOUT STARTED");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("LOGOUT ERROR:", error);
        alert("Logout failed. Try again.");
        return;
      }

      console.log("SESSION CLEARED");

      // Clear all client state
      [
        'fitCheckLocalHistory',
        'fitcheckai_profile_insights',
        'fitcheckai_last_analyzed_count',
        'fitCheckStreak',
      ].forEach(key => localStorage.removeItem(key));

      // Close modal
      setActiveSheet(null);

      // Hard redirect so user cannot go back

    } catch (err) {
      console.error("LOGOUT EXCEPTION:", err);
      alert("Unexpected logout error.");
    }
  };

  const getLevelLabel = (streak: number) => {
    if (streak >= 30) return "Signature Authority";
    if (streak >= 22) return "Defined Perspective";
    if (streak >= 15) return "Aesthetic Realignment";
    if (streak >= 8) return "Established Routine";
    if (streak >= 4) return "Rhythmic Progression";
    if (streak >= 1) return "Foundation Set";
    return "Status Paused";
  };

  return (
    <div className="min-h-screen w-full bg-classik-beige text-classik-black flex flex-col font-manrope animate-fade-in relative overflow-hidden">

      {/* 1. Header Section */}
      <header className="sticky top-0 z-20 px-6 py-6 bg-classik-beige/95 backdrop-blur-sm flex items-center justify-between border-b border-classik-dark/5">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/40 border border-white/20 flex items-center justify-center active:scale-95 transition-all shadow-sm">
          <ArrowLeftIcon className="w-5 h-5 text-classik-black" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-black/40">Profile</span>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-6 py-12 flex flex-col gap-12 pb-24 flex-1 w-full">

        {/* 2. User Identity Card */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-white/40 blur-3xl rounded-full opacity-60 pointer-events-none" />
            <div className="relative w-32 h-32 rounded-full bg-white/30 backdrop-blur-2xl border border-white/60 flex items-center justify-center overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_15px_35px_rgba(80,49,29,0.06)]">
              <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
              <ProfileIcon className="w-16 h-16 text-classik-taupe/40" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-1 uppercase">{firstName}</h2>
            <p className="text-sm font-bold text-classik-taupe tracking-wide mb-4 uppercase opacity-80">{styleLabel}</p>
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center px-5 py-2 rounded-full bg-classik-taupe/10 text-classik-taupe text-[10px] font-black uppercase tracking-widest border border-white/40">
                {getLevelLabel(currentStreak)}
              </div>
              {email && (
                <span className="text-[11px] font-medium text-classik-taupe/60 lowercase tracking-tight">
                  {email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onHistory} className="col-span-1 bg-white/40 border border-white/60 rounded-3xl p-6 flex flex-col items-start gap-3 hover:bg-white/60 transition-all text-left group shadow-sm">
            <div className="w-10 h-10 rounded-full bg-classik-warm/10 flex items-center justify-center">
              <CameraIcon className="w-5 h-5 text-classik-warm" />
            </div>
            <div>
              <span className="text-4xl font-black block leading-none">{historyCount}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Outfits</span>
            </div>
          </button>

          <div className="col-span-1 bg-white/40 border border-white/60 rounded-3xl p-6 flex flex-col items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-classik-warm/10 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-classik-warm" />
            </div>
            <div>
              <span className="text-4xl font-black block leading-none">{currentStreak}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Streak</span>
            </div>
          </div>

          <div className="col-span-2 bg-white/40 border border-white/60 rounded-3xl p-8 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#4A2E1B" strokeWidth="2" opacity="0.05" />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#806248"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * (typeof avgScore === 'number' ? avgScore : 0) / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <GaugeIcon className="w-6 h-6 text-classik-warm/60" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Avg Style Score</span>
              </div>
            </div>
            <span className="text-5xl font-black tracking-tighter">{avgScore}</span>
          </div>
        </div>

        {/* 4. Settings Section */}
        <div className="flex flex-col gap-10 pt-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/30 ml-4">Settings</h3>
            <div className="bg-white/40 border border-white/60 rounded-[32px] overflow-hidden divide-y divide-classik-dark/5 shadow-sm">
              <button onClick={() => setActiveSheet('notifications')} className="w-full flex items-center justify-between p-7 hover:bg-white/60 transition-colors group" >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <BellIcon className="w-5 h-5 text-classik-warm" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold tracking-tight">Notifications</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 opacity-20 group-hover:opacity-40" />
              </button>
              <button onClick={() => setActiveSheet('privacy')} className="w-full flex items-center justify-between p-7 hover:bg-white/60 transition-colors group" >
                <div className="flex items-center gap-5">
                  <LockIcon className="w-5 h-5 text-classik-warm" />
                  <span className="text-sm font-bold tracking-tight">Privacy & Data</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 opacity-20 group-hover:opacity-40" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/30 ml-4">Account</h3>
            <div className="bg-white/40 border border-white/60 rounded-[32px] overflow-hidden divide-y divide-classik-dark/5 shadow-sm">
              <button
                onClick={() => {
                  if (subscriptionTier !== 'premium') {
                    onOpenPaywall?.();
                  } else {
                    setActiveSheet('subscription');
                  }
                }}
                className={`w-full flex items-center justify-between p-7 transition-colors group hover:bg-white/60`}
              >
                <div className="flex items-center gap-5">
                  <FitCheckLogo className={`w-8 h-auto flex-shrink-0 ${subscriptionTier === 'premium' ? 'text-classik-dark' : 'text-classik-warm'}`} />
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-bold tracking-tight">Premium</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${subscriptionTier === 'premium' ? 'text-classik-dark' : 'text-classik-taupe/60'}`}>
                      {subscriptionTier === 'premium'
                        ? 'Manage Subscription'
                        : 'Upgrade to Premium'}
                    </span>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 opacity-20 group-hover:opacity-40" />
              </button>
              <button onClick={() => setActiveSheet('reset')} className="w-full flex items-center justify-between p-7 hover:bg-red-50/50 transition-colors group" >
                <div className="flex items-center gap-5">
                  <RefreshIcon className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-bold tracking-tight text-red-500/80">Reset Style History</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 opacity-10" />
              </button>
              <button onClick={() => setActiveSheet('logout')} className="w-full flex items-center justify-between p-7 hover:bg-white/60 transition-colors group" >
                <div className="flex items-center gap-5">
                  <LogOutIcon className="w-5 h-5 text-classik-dark/40" />
                  <span className="text-sm font-bold tracking-tight opacity-60">Log Out Session</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 opacity-10" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM SHEETS --- */}
      {activeSheet === 'notifications' && (
        <div
          className="fixed inset-0 z-[600] flex items-end justify-center bg-classik-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveSheet(null)}
        >
          <div
            className="w-full max-w-md bg-white border-t border-classik-dark/5 rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] transform animate-slide-up-sheet relative overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-classik-beige/30 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <h3 className="text-xl font-black text-classik-black tracking-tight uppercase">Notifications</h3>
                <button onClick={() => setActiveSheet(null)} className="p-2 -mr-2 opacity-40 hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Notification Inbox */}
              <div className="flex-1 overflow-y-auto px-8 pb-4" style={{ maxHeight: '45vh' }}>
                {notifListLoading ? (
                  <div className="py-10 text-center">
                    <p className="text-[12px] font-bold text-classik-taupe/50 uppercase tracking-widest">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-3xl mb-2">🔔</p>
                    <p className="text-[12px] font-bold text-classik-taupe/50 uppercase tracking-widest">All caught up!</p>
                    <p className="text-[11px] text-classik-taupe/40 mt-2 font-medium">Notifications about your style journey will appear here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {markingRead && (
                      <p className="text-[10px] font-bold text-classik-taupe/40 uppercase tracking-widest text-right mb-1">Marking read…</p>
                    )}
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-[20px] border transition-colors ${n.status !== 'read'
                          ? 'bg-classik-warm/5 border-classik-warm/10'
                          : 'bg-white/40 border-white/60'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {TYPE_EMOJI[n.type] || '📬'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-black text-classik-black leading-snug truncate">
                              {n.title}
                            </p>
                            <p className="text-[12px] font-medium text-classik-taupe/70 leading-relaxed mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                            <p className="text-[10px] font-bold text-classik-taupe/40 uppercase tracking-widest mt-1.5">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                          {n.status !== 'read' && (
                            <div className="w-2 h-2 bg-classik-warm rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="px-8 py-2">
                <div className="h-px bg-classik-dark/5" />
              </div>

              {/* Notification Preferences */}
              <div className="px-8 pb-10 flex flex-col gap-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-classik-black/30 mb-1">Preferences</h4>

                {/* Daily Style Reminder */}
                <div className="flex items-center justify-between p-5 bg-white/40 rounded-[20px] border border-white/60 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Daily style reminder</span>
                  <button
                    disabled={notifLoading}
                    onClick={() => toggleNotifications(!notificationsEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-500 ${notificationsEnabled ? 'bg-classik-dark' : 'bg-classik-dark/10'
                      } ${notifLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-transform duration-500 transform shadow-md ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* Streak Reminders */}
                <div className="flex items-center justify-between p-5 bg-white/40 rounded-[20px] border border-white/60 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Streak reminders</span>
                  <button
                    disabled={notifLoading}
                    onClick={async () => {
                      const newVal = !streakRemindersEnabled;
                      setStreakRemindersEnabled(newVal);
                      const { error } = await supabase
                        .from('notification_preferences')
                        .upsert({ user_id: session!.user.id, streak_reminders: newVal }, { onConflict: 'user_id' });
                      if (error) { console.error('Failed to update streak prefs:', error); setStreakRemindersEnabled(!newVal); }
                    }}
                    className={`relative w-14 h-8 rounded-full transition-all duration-500 ${streakRemindersEnabled ? 'bg-classik-dark' : 'bg-classik-dark/10'
                      } ${notifLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-transform duration-500 transform shadow-md ${streakRemindersEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* Weekly Summary */}
                <div className="flex items-center justify-between p-5 bg-white/40 rounded-[20px] border border-white/60 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Weekly summary</span>
                  <button
                    disabled={notifLoading}
                    onClick={async () => {
                      const newVal = !weeklySummaryEnabled;
                      setWeeklySummaryEnabled(newVal);
                      const { error } = await supabase
                        .from('notification_preferences')
                        .upsert({ user_id: session!.user.id, weekly_summary: newVal }, { onConflict: 'user_id' });
                      if (error) { console.error('Failed to update weekly prefs:', error); setWeeklySummaryEnabled(!newVal); }
                    }}
                    className={`relative w-14 h-8 rounded-full transition-all duration-500 ${weeklySummaryEnabled ? 'bg-classik-dark' : 'bg-classik-dark/10'
                      } ${notifLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full transition-transform duration-500 transform shadow-md ${weeklySummaryEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSheet === 'subscription' && (
        <SettingsSheet title="Manage Subscription" onClose={() => setActiveSheet(null)}>
          <div className="flex flex-col gap-6 text-center">
            <div className="space-y-4">
              <div className="p-6 bg-white/40 rounded-[24px] border border-white flex flex-col items-center">
                <FitCheckLogo className="w-12 h-auto text-classik-dark mb-4" />
                <h4 className="font-black text-xl mb-1 text-classik-black">FitCheck AI Premium</h4>
                <p className="text-sm text-classik-taupe font-medium">Your subscription is currently active.</p>
              </div>
            </div>

            <p className="text-xs text-classik-taupe px-4 leading-relaxed font-medium">
              If you cancel now, your plan will not automatically renew. You will still have access to premium features until your current billing period ends.
            </p>

            <div className="flex flex-col gap-4 mt-4">
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className={`w-full h-16 rounded-full font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-sm border border-classik-dark/10 text-classik-dark ${isCanceling
                  ? 'bg-classik-black/5 cursor-not-allowed opacity-50'
                  : 'bg-transparent hover:bg-red-50 hover:text-red-500 hover:border-red-500/30'
                  }`}
              >
                {isCanceling ? 'Processing...' : 'Cancel Subscription'}
              </button>
              <button onClick={() => setActiveSheet(null)} className="w-full h-16 rounded-full bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl" >
                Keep Premium
              </button>
            </div>
          </div>
        </SettingsSheet>
      )}

      {activeSheet === 'privacy' && (
        <SettingsSheet title="Privacy & Data" onClose={() => setActiveSheet(null)}>
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="p-6 bg-white/40 rounded-[24px] border border-white">
                <p className="font-black text-[11px] uppercase tracking-widest mb-2 opacity-80">Data Sovereignty</p>
                <p className="text-classik-taupe text-[13px] leading-relaxed font-medium">Your data remains your own. We do not sell user profiles. Privacy is embedded in our styling model.</p>
              </div>
              <div className="p-6 bg-white/40 rounded-[24px] border border-white">
                <p className="font-black text-[11px] uppercase tracking-widest mb-2 opacity-80">Image Isolation</p>
                <p className="text-classik-taupe text-[13px] leading-relaxed font-medium">Analysis is performed in isolated environments. We do not use your photos for external model training.</p>
              </div>
            </div>
            <button onClick={() => setActiveSheet(null)} className="w-full h-16 rounded-full bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.3em] mt-4" >
              Acknowledge
            </button>
          </div>
        </SettingsSheet>
      )}

      {activeSheet === 'reset' && (
        <SettingsSheet title="Confirm Reset" onClose={() => setActiveSheet(null)}>
          <div className="text-center space-y-10">
            <p className="text-classik-taupe text-base leading-relaxed font-medium">
              Resetting will <span className="text-red-500 font-black">permanently erase</span> your style timeline and identity DNA. This action is irreversible.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={handleResetStyleHistory}
                disabled={isResetting}
                className={`w-full h-16 rounded-full text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-xl transition-all ${isResetting
                  ? 'bg-red-300 cursor-not-allowed'
                  : 'bg-red-500/80 active:scale-95'
                  }`}
              >
                {isResetting ? 'Resetting...' : 'Permanently Reset'}
              </button>
              <button onClick={() => setActiveSheet(null)} className="w-full h-16 rounded-full bg-classik-black/5 text-classik-black/40 font-black text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all" >
                Keep My History
              </button>
            </div>
          </div>
        </SettingsSheet>
      )}

      {activeSheet === 'logout' && (
        <SettingsSheet title="Sign Out" onClose={() => setActiveSheet(null)}>
          <div className="text-center space-y-10">
            <p className="text-classik-taupe text-base leading-relaxed font-medium">
              Do you wish to conclude your current session?
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={handleLogoutConfirm} className="w-full h-16 rounded-full bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl" >
                Yes, Sign Out
              </button>
              <button onClick={() => setActiveSheet(null)} className="w-full h-16 rounded-full bg-classik-black/5 text-classik-black/40 font-black text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all" >
                Stay Logged In
              </button>
            </div>
          </div>
        </SettingsSheet>
      )}
    </div>
  );
};

