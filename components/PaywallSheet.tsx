import React, { useState, useEffect } from 'react';
import { FitCheckLogo } from './FitCheckLogo';
import type { PaywallTrigger } from '../types';
import { supabase } from '../lib/supabase';
import { usePaystackPayment } from 'react-paystack';

// ── Pricing Constants ────────────────────────────────────────────────────────
const PRICING = {
    NGN: {
        monthly: 3000,
        yearly: 30000,
        yearlyPerMonth: 2500,
        symbol: '₦',
        code: 'NGN',
    },
    USD: {
        monthly: 4,
        yearly: 40,
        yearlyPerMonth: 3.33,
        symbol: '$',
        code: 'USD',
    },
} as const;

type CurrencyKey = keyof typeof PRICING;

const PLAN_CODES: Record<CurrencyKey, { monthly?: string, yearly?: string }> = {
    USD: {
        monthly: import.meta.env.VITE_PAYSTACK_PLAN_USD_MONTHLY,
        yearly: import.meta.env.VITE_PAYSTACK_PLAN_USD_YEARLY,
    },
    NGN: {
        monthly: "PLN_sllk221vvduh39m",
        yearly: "PLN_bzdpzc0rnk7nxj0",
    }
};
// ── Locale Detection ─────────────────────────────────────────────────────────
function detectCurrency(): CurrencyKey {
    try {
        const lang = navigator.language || '';
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (lang.includes('NG') || lang.includes('ng') || tz.includes('Lagos') || tz.includes('Africa')) {
            return 'NGN';
        }
    } catch {
        // fallback
    }
    return 'USD';
}

// ── Value Props ──────────────────────────────────────────────────────────────
const VALUE_PROPS = [
    'Deep-dive stylistic adjustments',
    'Interactive Style AI chat',
    'Unlimited outfit analyses',
    'Track your aesthetic evolution',
];

// ── Trigger-Based Headlines ──────────────────────────────────────────────────
const HEADLINES: Record<PaywallTrigger, string> = {
    improve_tips: 'Unlock your tailored improvement plan.',
    style_ai: 'Chat with your personal AI stylist.',
    style_dna: 'Track your evolving aesthetic.',
    daily_limit: 'Your daily check is complete.',
    profile_upgrade: 'Elevate your style journey.',
};

const SUBTITLES: Record<PaywallTrigger, string> = {
    improve_tips:
        'Gain full access to deep-dive stylistic adjustments, interactive Style AI, and your evolving Style DNA.',
    style_ai:
        'Get real-time, personalised advice from an AI stylist that knows your outfit inside out.',
    style_dna:
        'See how your personal style evolves over time with detailed analytics and trend tracking.',
    daily_limit:
        'We limit analysis to one outfit every 24 hours to encourage intentional styling. Upgrade for unlimited access.',
    profile_upgrade:
        'Gain full access to deep-dive stylistic adjustments, interactive Style AI, and your evolving Style DNA.',
};

// ── Check Icon ───────────────────────────────────────────────────────────────
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

// ── Component ────────────────────────────────────────────────────────────────
import { Session } from '@supabase/supabase-js';

interface PaywallSheetProps {
    trigger: PaywallTrigger;
    session: Session | null;
    subscriptionTier: 'free' | 'premium';
    onClose: () => void;
    onSubscribed: () => void;
}

// ── Isolated Checkout Button ──────────────────────────────────────────────────
const CheckoutButton: React.FC<{
    config: any;
    onSuccess: (ref: any) => void;
    onClose: () => void;
}> = ({ config, onSuccess, onClose }) => {
    const initializePayment = usePaystackPayment(config);

    return (
        <button
            onClick={() => initializePayment({ onSuccess, onClose })}
            className="group relative w-full h-14 rounded-full flex items-center justify-center bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-lg transition-all duration-500 active:scale-[0.98] overflow-hidden cursor-pointer"
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">Subscribe Now</span>
        </button>
    );
};

export const PaywallSheet: React.FC<PaywallSheetProps> = ({
    trigger,
    session,
    subscriptionTier,
    onClose,
    onSubscribed,
}) => {
    const [isYearly, setIsYearly] = useState(true);
    const [currency, setCurrency] = useState<CurrencyKey>('USD');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setCurrency(detectCurrency());
        // Trigger entrance animation on next frame
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const pricing = PRICING[currency];
    const displayPrice = isYearly ? pricing.yearlyPerMonth : pricing.monthly;
    const billedLabel = isYearly
        ? `Billed ${pricing.symbol}${pricing.yearly.toLocaleString()}/year`
        : 'Billed monthly';

    const formatPrice = (amount: number) => {
        if (currency === 'NGN') return `₦${amount.toLocaleString()}`;
        return `$${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const savingsLabel = currency === 'NGN' ? 'Save ₦6,000' : '2 Months Free';

    // -- Paystack Setup --
    const activePlanType = isYearly ? 'yearly' : 'monthly';
    const paystackPlan = PLAN_CODES[currency]?.[activePlanType] || '';
    const paystackAmount = (isYearly ? pricing.yearly : pricing.monthly) * 100;

    const paystackConfig = {
        email: session?.user?.email || 'user@example.com',
        amount: paystackAmount,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
        plan: paystackPlan,
        currency: currency,
        metadata: {
            user_id: session?.user?.id || "",
            plan_type: activePlanType,
            custom_fields: [
                {
                    display_name: "User ID",
                    variable_name: "user_id",
                    value: session?.user?.id || ""
                },
                {
                    display_name: "Plan Type",
                    variable_name: "plan_type",
                    value: activePlanType
                }
            ]
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[600] flex items-end justify-center transition-all duration-300 ${isVisible ? 'bg-classik-black/60 backdrop-blur-md' : 'bg-transparent'
                }`}
            onClick={handleDismiss}
        >
            <div
                className={`w-full max-w-md bg-white border-t border-classik-dark/5 rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] relative overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${isVisible ? 'translate-y-0' : 'translate-y-full'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-classik-beige/30 via-transparent to-transparent pointer-events-none" />

                {/* Drag handle */}
                <div className="flex justify-center pt-4 pb-2">
                    <div className="w-10 h-1 rounded-full bg-classik-dark/10" />
                </div>

                <div className="relative z-10 px-8 pb-10 pt-2 flex flex-col items-center text-center">
                    <div className="flex justify-center mb-6">
                        <FitCheckLogo className="h-6 w-auto text-classik-dark" />
                    </div>

                    {/* ── 2. Headline & Subtitle ─────────────────────────────────── */}
                    <h3 className="text-classik-black font-black text-2xl tracking-tight leading-tight mb-3 max-w-[320px]">
                        {HEADLINES[trigger]}
                    </h3>
                    <p className="text-classik-taupe text-sm leading-relaxed font-medium mb-8 max-w-[300px]">
                        {SUBTITLES[trigger]}
                    </p>

                    {/* ── 3. Value Props ─────────────────────────────────────────── */}
                    <div className="w-full mb-8">
                        <ul className="space-y-3 text-left">
                            {VALUE_PROPS.map((prop, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-classik-dark/5 flex items-center justify-center flex-shrink-0">
                                        <CheckIcon className="w-3 h-3 text-classik-dark" />
                                    </div>
                                    <span className="text-[13px] font-bold text-classik-black/80 tracking-tight">
                                        {prop}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── 4. Monthly/Yearly Toggle ───────────────────────────────── */}
                    <div className="w-full flex items-center justify-center gap-1 p-1 bg-classik-dark/5 rounded-full mb-6 relative">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${!isYearly
                                ? 'bg-white text-classik-black shadow-sm'
                                : 'text-classik-taupe'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 relative ${isYearly
                                ? 'bg-white text-classik-black shadow-sm'
                                : 'text-classik-taupe'
                                }`}
                        >
                            Yearly
                            {isYearly && (
                                <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 bg-classik-warm text-white text-[7px] font-black uppercase tracking-wider rounded-full">
                                    {savingsLabel}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── 5. Dynamic Price Display ──────────────────────────────── */}
                    <div className="mb-2 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-classik-black tabular-nums">
                            {formatPrice(displayPrice)}
                        </span>
                        <span className="text-classik-taupe text-sm font-bold">/mo</span>
                    </div>
                    <p className="text-[10px] font-bold text-classik-taupe/60 uppercase tracking-[0.15em] mb-8">
                        {billedLabel}
                    </p>

                    {/* ── 6. Primary CTA ────────────────────────────────────────── */}
                    {paystackPlan ? (
                        <CheckoutButton
                            key={`${paystackPlan}-${paystackAmount}`}
                            config={paystackConfig}
                            onSuccess={(reference) => {
                                console.log('Payment successful:', reference);
                                onSubscribed();
                            }}
                            onClose={() => {
                                console.log('Payment closed.');
                            }}
                        />
                    ) : (
                        <button
                            onClick={() => alert(`The ${activePlanType} plan for ${currency} is not yet configured.`)}
                            className="group relative w-full h-14 rounded-full flex items-center justify-center bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-lg transition-all duration-500 active:scale-[0.98] overflow-hidden cursor-pointer"
                        >
                            <span className="relative z-10">Subscribe Now</span>
                        </button>
                    )}

                    {/* ── 7. Trust Footer ────────────────────────────────────────── */}
                    <p className="mt-4 text-[10px] font-medium text-classik-taupe/50 leading-relaxed max-w-[280px]">
                        Cancel anytime. Secure payment via Paystack.
                    </p>

                    {/* ── Dismiss ───────────────────────────────────────────────── */}
                    <button
                        onClick={handleDismiss}
                        className="mt-4 text-classik-taupe/50 text-[10px] uppercase font-black tracking-[0.3em] hover:text-classik-dark transition-colors cursor-pointer"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};
