import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map of currencies and plan types to Paystack Plan Codes
const PLAN_CODES: Record<string, { monthly: string | null; yearly: string | null }> = {
    NGN: {
        monthly: 'PLN_sllk221vvduh39m',
        yearly: 'PLN_bzdpzc0rnk7nxj0'
    },
    USD: {
        monthly: null, // Pending Paystack USD approval
        yearly: null
    }
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email, currency = 'NGN', plan_type = 'yearly' } = await req.json();

        if (!email) {
            throw new Error('Email is required');
        }

        const planCode = PLAN_CODES[currency]?.[plan_type];
        if (!planCode) {
            throw new Error(`Plan for ${currency} ${plan_type} is not currently available.`);
        }

        const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecretKey) {
            throw new Error('Paystack secret key not configured');
        }

        // Initialize transaction with Paystack
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                plan: planCode,
                amount: plan_type === 'yearly' ? 30000 * 100 : 3000 * 100, // Amount in kobo/cents. Note: If using strict plan ID, amount might be overridden by plan.
                callback_url: 'http://localhost:3000/profile', // temporary return url
            }),
        });

        const data = await response.json();

        if (!data.status) {
            console.error('Paystack initialization failed:', data);
            throw new Error(data.message || 'Payment initialization failed');
        }

        return new Response(
            JSON.stringify({
                success: true,
                authorization_url: data.data.authorization_url,
                access_code: data.data.access_code,
                reference: data.data.reference
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        console.error('Error in checkout:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
