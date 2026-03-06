import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { callGemini } from './lib/gemini';
import { ProcessingState } from './components/ProcessingState';
import { ResultsPage } from './components/ResultsPage';
import { ImprovementPlanPage } from './components/ImprovementPlanPage';
import { Homepage } from './components/Homepage';
import { StyleAIPage } from './components/StyleAI';
import { HistoryPage } from './components/HistoryPage';
import { ProfilePage } from './components/ProfilePage';
import { StyleDNAPage } from './components/StyleDNAPage';
import { SplashScreen } from './components/SplashScreen';
import { UploadPage } from './components/UploadPage';
import { OnboardingIntro } from './components/OnboardingIntro';
import Auth from './components/Auth';
import { FeedbackStyle, UploadState, AnalysisResult, ImprovementPlan, NavTab, PaywallTrigger } from './types';
import { SparklesIcon } from './components/Icons';
import { PaywallSheet } from './components/PaywallSheet';
import { supabase } from './lib/supabase';
import { BottomNavigation } from './components/BottomNavigation';
import type { WeatherContext, Intent } from './types';
import { WeatherFeed } from './components/WeatherFeed';
import { NetworkBanner } from './components/NetworkBanner';

import { withTimeout } from './lib/withTimeout';
import { registerForPushNotifications } from './lib/notifications';
import { OutfitContext } from './types';
import Privacy from './components/Privacy';

import Terms from './components/Terms';
import { normalizeImage } from './lib/normalizeImage';
import { ensureWeeklyStyleChallenge } from "./lib/styleChallengeEngine";
import { evaluateWeeklyChallenge } from "./lib/challengeProgressEngine";




// --- FEATURE FLAG ---
const ENABLE_MONETIZATION = true;

// --- PAYWALL is now in components/PaywallSheet.tsx ---

// --- HELPERS ---

const getGeminiResponseText = async (response: any): Promise<string> => {
  if (!response) return "{}";
  if (typeof response.text === 'function') {
    return await response.text();
  } else if (typeof response.text === 'string') {
    return response.text;
  } else {
    return JSON.stringify(response);
  }
};

const fileToImageData = async (file: File) => {
  const base64String = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    data: base64String.split(',')[1],
    mimeType: file.type
  };
};


const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null); // ✅ null = loading
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Subscription State
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'premium'>('free');
  const isPremium = subscriptionTier === 'premium';

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallTrigger>('improve_tips');
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);

  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.HOME);
  const [weatherData, setWeatherData] = useState<WeatherContext | null>(null);
  const [weatherIntent, setWeatherIntent] = useState<Intent>('now');
  // ✅ NEW: Network status tracking
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [state, setState] = useState<UploadState & {
    currentOutfitId: string | null;
    analyzedAt: string | null;
    improvementError: boolean | null;
    validationStatus: 'idle' | 'pending' | 'accepted' | 'rejected';
    validationReason: string | null;
  }>({
    currentOutfitId: null, // ✅ NEW

    imagePreviewUrl: null,
    selectedStyle: FeedbackStyle.MOTIVATING,
    selectedOccasion: null,
    customOccasion: '',
    isAnalyzing: false,
    isGeneratingPlan: false,
    analysisResult: null,
    improvementPlan: null,
    improvementError: null,
    isHome: true,
    isHistory: false,
    isProfile: false,
    isStyleDNA: false,
    fromHistory: false,
    validationError: null,
    validationStatus: 'idle',
    validationReason: null,
    analyzedAt: null,
  });

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [showStyleAI, setShowStyleAI] = useState(false);

  const [showPrivacy, setShowPrivacy] = useState(false);

  const [showTerms, setShowTerms] = useState(false);

  const [paletteWarning, setPaletteWarning] = useState<null | {
    previousOutfitId: string;
    message: string;
  }>(null);

  const [weeklyChallenge, setWeeklyChallenge] = useState<any | null>(null);


  // ✅ NEW: Network status listener
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const openPrivacy = () => setShowPrivacy(true);
    const openTerms = () => setShowTerms(true);
    const closeLegal = () => {
      setShowPrivacy(false);
      setShowTerms(false);
    }

    window.addEventListener('open-privacy', openPrivacy);
    window.addEventListener('open-terms', openTerms);
    window.addEventListener('close-legal', closeLegal);

    return () => {
      window.removeEventListener('open-privacy', openPrivacy);
      window.removeEventListener('open-terms', openTerms);
      window.removeEventListener('close-legal', closeLegal);
    };
  }, []);


  useEffect(() => {
    const checkUserStatus = async (session: Session | null) => {
      setSession(session);

      if (!session) {
        // HARD RESET APP STATE ON LOGOUT
        setShowOnboarding(false);
        setOnboardingChecked(true);

        setActiveTab(NavTab.HOME);

        setState({
          imagePreviewUrl: null,
          selectedStyle: FeedbackStyle.MOTIVATING,
          selectedOccasion: null,
          customOccasion: '',
          isAnalyzing: false,
          isGeneratingPlan: false,
          analysisResult: null,
          improvementPlan: null,
          improvementError: null,
          isHome: true,
          isHistory: false,
          isProfile: false,
          isStyleDNA: false,
          fromHistory: false,
          validationError: null,
          validationStatus: 'idle',
          validationReason: null,
          currentOutfitId: null,
          analyzedAt: null,
        });

        setRawFile(null);
        setIsValidated(false);

        return;
      }


      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, subscription_tier, subscription_end_date')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Profile fetch failed:', error);
          setShowOnboarding(false);
          setOnboardingChecked(true);
          return;
        }



        if (!profile) {
          // NEW USER
          await supabase
            .from('notification_preferences')
            .upsert(
              {
                user_id: session.user.id,
                daily_style_reminders: true,
                weekly_summary: true,
                streak_reminder: true,
                push_token: null
              },
              { onConflict: 'user_id' }
            );

          setShowOnboarding(true);
          setOnboardingChecked(true);
          return;
        }

        // 🔁 RETURNING USER
        setShowOnboarding(!profile.onboarding_completed);
        setOnboardingChecked(true);

        // Map subscription tier
        let activeTier: 'free' | 'premium' = profile.subscription_tier === 'premium' ? 'premium' : 'free';

        if (activeTier === 'premium' && profile.subscription_end_date) {
          const endDate = new Date(profile.subscription_end_date);
          const now = new Date();
          if (endDate < now) {
            activeTier = 'free';
          }
        }

        setSubscriptionTier(activeTier);

        // ─── Gap 6: Save push token after login ───────────────────────────────
        // Fire-and-forget: push token registration. Won't block the login flow.
        registerForPushNotifications().then(token => {
          if (token) {
            supabase.from('notification_preferences').upsert(
              { user_id: session.user.id, push_token: token },
              { onConflict: 'user_id' }
            ).then(({ error }) => {
              if (error) console.error('[Push Token] Failed to save token:', error);
              else console.log('[Push Token] Saved successfully');
            });
          }
        }).catch(() => {
          // Push token registration is best-effort — web apps won't have Expo
          console.log('[Push Token] Not available in this environment');
        });

        console.log('[Weekly Challenge] Ensuring weekly challenge for user:', session.user.id);
        const generated = await ensureWeeklyStyleChallenge(session.user.id);
        console.log('[Weekly Challenge] Generation result:', generated);

        const { data: activeChallenge } = await supabase
          .from("style_challenges")
          .select("*")
          .eq("user_id", session.user.id)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[Weekly Challenge] Fetched active challenge for UI:', activeChallenge);
        setWeeklyChallenge(activeChallenge || null);

      } catch (e) {
        console.error('Unexpected auth error', e);
        setShowOnboarding(false);
        setOnboardingChecked(true);
      }
    };



    // Initial check (handles case where onAuthStateChange doesn't fire immediately)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkUserStatus(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserStatus(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- LOGIC: Validation ---
  const handleImageValidation = async (imageData) => {
    if (networkStatus === 'offline') {
      setState(prev => ({
        ...prev,
        validationStatus: 'rejected',
        validationReason: 'No internet connection.'
      }));
      return;
    }
    setGlobalError(null);
    try {
      if (!session) return;

      // Duplicate detection context: Summary of previously accepted outfits
      const { data: prevOutfits } = await supabase
        .from('OutfitData')
        .select('title, insight')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8);

      const outfitHistorySummary = prevOutfits?.map((o, idx) => {
        const insight = typeof o.insight === 'string' ? JSON.parse(o.insight) : o.insight;
        return `Outfit ${idx + 1}: ${o.title}. Colors: ${insight?.palette?.join(', ')}. Description: ${insight?.headline}`;
      }).join('\n') || "No previous outfits analyzed.";

      const text = await withTimeout(
        callGemini({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: imageData },
                { text: `Summary of previously accepted outfits:\n${outfitHistorySummary}\n\nValidate this new upload.` }
              ]
            }
          ],
          systemInstruction: `
You are an image validation engine that operates ONLY inside the Upload Page of a fashion analysis app.
Your ONLY job is to validate whether the uploaded image can proceed to analysis.

REJECT the image if ANY of the following apply:
- Nudity or partial nudity
- Visible underwear or swimwear
- Exposed torso
- Blurry or low-resolution image
- Poor lighting or heavy shadows hiding outfit details
- Mirror flash covering the outfit
- Multiple people in the image
- Non-human subjects
The outfit must show:
- Upper body clothing clearly
- Lower body clothing clearly
- Shoes OR lower garment hem

Sitting poses are acceptable if clothing coverage is visible.
Head visibility is NOT required.

You are an image validation engine operating ONLY on the Upload Page.

Your ONLY job is to decide whether the image can proceed to analysis.

REJECT the image ONLY if:
- The image is NSFW or inappropriate
- The image is too dark, blurry, or obscured
- The outfit is not visible from upper body to lower body
- Multiple people are visible
- The image is non-human
- The image is an EXACT DUPLICATE of a previously uploaded image
  (same image content, not similar outfit)

DO NOT reject for:
- Similar colors
- Similar silhouettes
- Same outfit worn differently
- Same outfit for a different occasion
- Sitting or standing poses (as long as the outfit is visible)

RESPONSE FORMAT (STRICT JSON):
{
  "status": "accepted" | "rejected",
  "reason": "short, human-readable reason"
}
False negatives are worse than false positives.

RESPONSE FORMAT (STRICT):
Return ONLY valid JSON:
{
  "status": "accepted" | "rejected",
  "reason": "short, clear, human-friendly sentence"
}
Do NOT suggest navigation or provide advice.
`,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                status: { type: "STRING", enum: ["accepted", "rejected"] },
                reason: { type: "STRING" }
              },
              required: ["status", "reason"]
            }
          }
        }),
        15000
      );

      const validation = JSON.parse(text.trim());

      //  HARD REJECTION — NO FALLTHROUGH
      if (validation.status === 'rejected') {
        setState(prev => ({
          ...prev,
          validationStatus: 'rejected',
          validationReason: validation.reason || 'This outfit has already been analyzed.'
        }));
        setIsValidated(false);
        return; // STOP EVERYTHING
      }

      //  ACCEPTED PATH
      setState(prev => ({
        ...prev,
        validationStatus: 'accepted',
        validationReason: null
      }));
      setIsValidated(true);

    } catch (error) {
      console.error("Validation failed:", error);
      setState(prev => ({
        ...prev,
        validationStatus: 'rejected',
        validationReason: "Validation service unavailable. Please try again."
      }));
      setIsValidated(false);
    }
  };

  // --- LOGIC: Improvement Plan ---
  const generateImprovementPlan = async (result: AnalysisResult, imageBase64: { data: string; mimeType: string }) => {
    if (networkStatus === 'offline') {
      setGlobalError("You’re offline. Improvement plans require internet access.");
      return;
    }
    setGlobalError(null);
    setState(prev => ({ ...prev, isGeneratingPlan: true, improvementError: null }));
    try {
      const text = await withTimeout(
        callGemini({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: imageBase64 },
                { text: `Analysis Result: ${JSON.stringify(result)}. Generate a complete improvement plan.` }
              ]
            }
          ],
          systemInstruction: `You are a calm, modern stylist providing a personal improvement plan. 
Speak clearly, humanly, and conversationally. Avoid jargon, academic theory, or robotic phrasing.
The user should feel guided, not judged. 

Strict Rules for JSON fields:
- diagnosticSummary.primaryIssue: This is the 'Key Focus'. Describe the main issue plainly and briefly. No over-analysis.
- winningElements: These are 'What works best'. Focus on strengths with short, affirmative sentences.
- problemStatements: These are 'Specific Changes'. Write as practical observations, not critiques.
- improvementSections.whyMatters: This is 'The Reasoning'. Explain why it matters in simple human terms.
- improvementSections.actionSteps: These are 'Your Next Steps'. Make them actionable and friendly.

outfitWeatherProfile Rules:
- Analyze the outfit's physical properties from the image ONLY
- Determine coverage: 'light' (shorts/tank/dress), 'medium' (jeans/shirt), 'heavy' (jacket/coat)
- Determine layering: 'single' (one piece), 'layered' (2-3 pieces), 'heavy-layered' (coat + multiple layers)
- Determine fabricWeight: 'light' (linen/cotton/silk), 'mid' (denim/knit), 'heavy' (wool/leather/thick outerwear)
- This profile is STATIC and describes the outfit itself, not weather conditions
- Do NOT include any weather advice or commentary in this section`,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                winningElements: { type: "ARRAY", items: { type: "STRING" } },
                diagnosticSummary: {
                  type: "OBJECT",
                  properties: {
                    primaryIssue: { type: "STRING" },
                    secondaryIssue: { type: "STRING" },
                    alignmentImpact: { type: "STRING" }
                  },
                  required: ["primaryIssue", "secondaryIssue", "alignmentImpact"]
                },
                problemStatements: { type: "ARRAY", items: { type: "STRING" } },
                improvementSections: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING" },
                      whyMatters: { type: "STRING" },
                      styleImpact: { type: "STRING" },
                      actionSteps: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["title", "whyMatters", "styleImpact", "actionSteps"]
                  }
                },
                advancedInsights: { type: "ARRAY", items: { type: "STRING" } },
                outfitWeatherProfile: {
                  type: "OBJECT",
                  properties: {
                    coverage: { type: "STRING", enum: ["light", "medium", "heavy"] },
                    layering: { type: "STRING", enum: ["single", "layered", "heavy-layered"] },
                    fabricWeight: { type: "STRING", enum: ["light", "mid", "heavy"] }
                  },
                  required: ["coverage", "layering", "fabricWeight"]
                }
              },
              required: ["winningElements", "diagnosticSummary", "problemStatements", "improvementSections", "advancedInsights", "outfitWeatherProfile"]
            }
          }
        }),
        20000
      );

      const plan: ImprovementPlan = JSON.parse(text.trim());

      setState(prev => ({
        ...prev,
        improvementPlan: plan,
        isGeneratingPlan: false,
        improvementError: null
      }));
      return plan;

    } catch (error) {
      console.error("Improvement plan failed:", error);
      setGlobalError("We couldn’t generate your improvement plan. Please try again.");
      setState(prev => ({
        ...prev,
        isGeneratingPlan: false,
        improvementError: true
      }));
      throw error;
    }
  };

  const handleStartAnalysis = () => {
    setState(prev => ({
      ...prev,
      isHome: false,
      isHistory: false,
      isProfile: false,
      isStyleDNA: false,
      analysisResult: null,
      improvementPlan: null
    }));

    setActiveTab(NavTab.HOME); // optional but stabilizes routing
  };

  const handleImageSelected = async (url: string | null, file: File | null) => {
    // 1. Handle Reset / Clear
    if (!url || !file) {
      setRawFile(null);
      setAnalysisFile(null);
      setIsValidated(false);

      setState(prev => ({
        ...prev,
        imagePreviewUrl: null,
        validationStatus: 'idle',
        validationReason: null
      }));
      return;
    }

    // 2. Initial State Update (Immediate Feedback)
    setRawFile(file);
    setIsValidated(false);
    setState(prev => ({
      ...prev,
      imagePreviewUrl: url,
      validationStatus: 'pending',
      validationReason: null
    }));

    try {
      // 3. Normalize Image
      // We wrap this in try/catch because image compression/resizing can fail
      const normalized = await normalizeImage(file);
      setAnalysisFile(normalized);

      // 4. Convert directly to Base64 (Skip createObjectURL)
      // This helper reads the File blob directly
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(normalized);
      });

      // Extract the raw data part if your validator expects just the hash
      // (Assuming urlToData returned { data: 'base64...', mimeType: '...' })
      const imageData = {
        data: base64String.split(',')[1],
        mimeType: normalized.type
      };

      // 5. Validate
      await handleImageValidation(imageData);

    } catch (error) {
      console.error("Image processing error:", error);

      // Catch errors from BOTH normalization AND validation here
      setState(prev => ({
        ...prev,
        validationStatus: 'rejected',
        validationReason: 'Could not process image. Please try another.'
      }));
    }
  };

  const handleWeatherUpdate = (data: WeatherContext) => {
    setWeatherData(data);
    console.log('🌤 Weather context updated:', data);
  };


  const handleOnboardingComplete = async () => {
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: session.user.id,
        onboarding_completed: true,
      });

    if (error) {
      console.error('Failed to update onboarding status', error);
      return;
    }

    setShowOnboarding(false);
    setActiveTab(NavTab.HOME);
    setState(prev => ({
      ...prev,
      isHome: true,
      isHistory: false,
      isProfile: false,
      isStyleDNA: false,
    }));
  };

  const handleAnalyze = async () => {
    if (networkStatus === 'offline') {
      setGlobalError("You’re offline. Connect to the internet to analyze outfits.");
      return;
    }
    setGlobalError(null);
    if (
      !state.imagePreviewUrl ||
      !rawFile ||
      !session ||
      state.validationStatus !== 'accepted'
    ) return;

    const occasion = state.selectedOccasion || state.customOccasion.trim();
    if (!occasion) {
      setValidationMsg("Please specify the occasion.");
      setTimeout(() => setValidationMsg(null), 3000);
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      if (!analysisFile) return;
      const imageData = await fileToImageData(analysisFile);
      const fileExt = rawFile.name.split('.').pop();
      const fileName = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

      await supabase.storage.from('outfits').upload(fileName, rawFile, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('outfits').getPublicUrl(fileName);

      const text = await withTimeout(
        callGemini({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: imageData },
                { text: `Analyze for: ${occasion}. Style: ${state.selectedStyle}.` }
              ]
            }
          ],
          systemInstruction: `
You are a dual-mode fashion analyst. You must perform two strictly separated steps for every request.

STEP 1: THE JUDGE (Objective Scoring)
- Evaluate strictly on fit, color harmony, silhouette, and occasion appropriateness.
- Assign a raw score from 0 to 100 based purely on visual merit.
- 0–59: Fails fundamentals
- 60–79: Average, lacks polish
- 80–89: Stylish, well-executed
- 90–100: Editorial-level quality
- CRITICAL: Do not inflate the score. If the score is below 70, at least TWO breakdown metrics MUST be 5 or lower.

STEP 2: THE SPEAKER (Subjective Feedback)
- Apply the requested feedback style ONLY to text fields.
- Do not change the numeric score.
- PUNCHLINE RULE (STRICT): The punchline must be a short impression-only statement (2 short paragraphs max).
- It must describe the vibe or social impression. No advice. Advice belongs in the Improvement Plan.

STEP 3: STYLE METRICS EXTRACTION (Strict Classification)

You must also classify the outfit into structured style components.

Extract:

- topType: (t-shirt, shirt, polo, hoodie, sweater, blazer, jacket, coat, tank, other)
- bottomType: (jeans, chinos, trousers, shorts, cargo, joggers, other)
- footwearType: (sneakers, loafers, boots, sandals, dress-shoes, slides, other)
- outerwear: true | false
- layeringLevel: single | light-layer | heavy-layer
- colorTemperature: warm | cool | neutral | mixed

This must be objective. No guessing beyond visible evidence.

Return JSON only:
{
  "score": number,
  "breakdown": {
    "harmony": number,
    "fitBalance": number,
    "styleAlignment": number,
    "styleIntent": number
  },
  "headline": string,
  "feedback": string,
  "palette": array,
  "styleMetrics": {
    "topType": string,
    "bottomType": string,
    "footwearType": string,
    "outerwear": boolean,
    "layeringLevel": string,
    "colorTemperature": string
  }
}
`,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                score: { type: "NUMBER" },
                breakdown: {
                  type: "OBJECT",
                  properties: {
                    harmony: { type: "NUMBER" },
                    fitBalance: { type: "NUMBER" },
                    styleAlignment: { type: "NUMBER" },
                    styleIntent: { type: "NUMBER" }
                  },
                  required: ["harmony", "fitBalance", "styleAlignment", "styleIntent"]
                },
                headline: { type: "STRING" },
                feedback: { type: "STRING" },
                palette: { type: "ARRAY", items: { type: "STRING" } },
                styleMetrics: {
                  type: "OBJECT",
                  properties: {
                    topType: { type: "STRING" },
                    bottomType: { type: "STRING" },
                    footwearType: { type: "STRING" },
                    outerwear: { type: "BOOLEAN" },
                    layeringLevel: { type: "STRING" },
                    colorTemperature: { type: "STRING" }
                  },
                  required: [
                    "topType",
                    "bottomType",
                    "footwearType",
                    "outerwear",
                    "layeringLevel",
                    "colorTemperature"
                  ]
                }
              },
              required: [
                "score",
                "breakdown",
                "headline",
                "feedback",
                "palette",
                "styleMetrics"
              ]
            }
          }
        }),
        20000
      );

      const result: AnalysisResult = JSON.parse(text.trim());

      const { data: previousOutfits } = await supabase
        .from('OutfitData')
        .select('id_uuid, insight')
        .eq('user_id', session.user.id)
        .limit(6);

      const similar = previousOutfits?.find(o => {
        const prev = typeof o.insight === 'string'
          ? JSON.parse(o.insight)
          : o.insight;

        return (
          prev?.palette &&
          result.palette &&
          prev.palette.join(',') === result.palette.join(',')
        );
      });

      if (similar) {
        setPaletteWarning({
          previousOutfitId: similar.id_uuid,
          message:
            "This outfit uses a similar color palette to one you’ve analyzed before. You can continue if the styling or occasion is different."
        });

        setState(prev => ({ ...prev, isAnalyzing: false }));
        return; // ⛔ STOP HERE
      }

      const { data: insertedOutfit, error } = await supabase
        .from('OutfitData')
        .insert([{
          user_id: session.user.id,
          image_url: publicUrl,
          title: occasion,
          score: result.score,
          insight: result,
          style_metrics: result.styleMetrics
        }])
        .select()
        .single();

      if (error || !insertedOutfit) {
        throw new Error('Failed to persist outfit');
      }

      // 🔥 Evaluate weekly challenge ONCE
      await evaluateWeeklyChallenge(
        session.user.id,
        result.styleMetrics
      );

      // 🔁 Reload updated challenge state
      const { data: updatedChallenge } = await supabase
        .from("style_challenges")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("primary_status", "active")  // ✅ CORRECTED
        .maybeSingle();

      setWeeklyChallenge(updatedChallenge || null);


      setState(prev => ({
        ...prev,
        currentOutfitId: insertedOutfit.id_uuid, // or .id depending on schema
        analyzedAt: insertedOutfit.created_at,
        analysisResult: result,
        imagePreviewUrl: publicUrl,
        improvementPlan: null,
        isAnalyzing: false,
      }));

      setActiveTab(NavTab.RESULTS);
      setHomeRefreshKey(prev => prev + 1);

    } catch (error) {
      console.error("Analysis failed:", error);
      setGlobalError("We couldn’t analyze your outfit. Check your connection and try again.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleGeneratePlan = async () => {
    if (!state.analysisResult || !state.imagePreviewUrl) return;

    setActiveTab(NavTab.IMPROVE_PROCESSING);

    try {
      let imageData: { data: string; mimeType: string };

      // ✅ CASE 1: User just uploaded an image (Upload flow)
      if (analysisFile) {
        imageData = await fileToImageData(analysisFile);
      }
      // ✅ CASE 2: User came from History (NO analysisFile)
      else {
        const response = await fetch(state.imagePreviewUrl);
        const blob = await response.blob();

        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        imageData = {
          data: base64String.split(',')[1],
          mimeType: blob.type || 'image/jpeg',
        };
      }

      await generateImprovementPlan(state.analysisResult, imageData);
      setActiveTab(NavTab.IMPROVE);

    } catch (error) {
      console.error("Improvement generation failed:", error);
      setActiveTab(NavTab.RESULTS);
    }
  };

  const handleTabChange = async (tab: NavTab) => {
    if (ENABLE_MONETIZATION && !isPremium && (tab === NavTab.IMPROVE)) {
      setPaywallContext('improve_tips');
      setShowPaywall(true);
      return;
    }
    if (ENABLE_MONETIZATION && !isPremium && (tab === NavTab.DNA)) {
      setPaywallContext('style_dna');
      setShowPaywall(true);
      return;
    }
    if (tab === NavTab.IMPROVE && !state.improvementPlan && state.analysisResult) {
      handleGeneratePlan();
      return;
    }
    setActiveTab(tab);
    setState(prev => ({ ...prev, isHistory: false, isProfile: false, isHome: true }));
  };

  const handleBack = () => {
    if (activeTab === NavTab.IMPROVE) { setActiveTab(NavTab.RESULTS); return; }
    if (activeTab === NavTab.RESULTS) { setActiveTab(NavTab.HOME); return; }
    if (state.isHistory || state.isProfile || state.isStyleDNA) {
      setState(prev => ({ ...prev, isHistory: false, isProfile: false, isStyleDNA: false, isHome: true }));
      setActiveTab(NavTab.HOME);
      return;
    }
    if (!state.isHome) {
      setState(prev => ({
        ...prev,
        imagePreviewUrl: null,
        selectedOccasion: null,
        customOccasion: '',
        isHome: true,
        validationStatus: 'idle',
        validationReason: null
      }));
      setActiveTab(NavTab.HOME);
      return;
    }
  };

  const handleGlobalReset = () => {
    setState({
      imagePreviewUrl: null,
      selectedStyle: FeedbackStyle.MOTIVATING,
      selectedOccasion: null,
      customOccasion: '',
      isAnalyzing: false,
      isGeneratingPlan: false,
      analysisResult: null,
      improvementPlan: null,
      improvementError: null,
      isHome: true,
      isHistory: false,
      isProfile: false,
      isStyleDNA: false,
      fromHistory: false,
      validationError: null,
      validationStatus: 'idle',
      validationReason: null,
      currentOutfitId: null,
      analyzedAt: null,
    });

    setRawFile(null);
    setIsValidated(false);

    setHomeRefreshKey(prev => prev + 1);
    delete window._fitCheckHomeLoaded;
    setActiveTab(NavTab.HOME);
  };


  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // 🔒 GLOBAL LEGAL PAGES (Must be BEFORE Auth check)
  if (showPrivacy) {
    return <Privacy />;
  }

  if (showTerms) {
    return <Terms />;
  }

  // 🔒 AUTH CHECK
  if (!session) {
    return <Auth />;
  }

  // ✅ Guard: Don't render until we know auth + profile status
  if (!onboardingChecked || showOnboarding === null) {
    return null; // or <LoadingScreen /> if preferred
  }

  if (showOnboarding) {
    return <OnboardingIntro onComplete={handleOnboardingComplete} />;
  }

  const canOpenStyleAI =
    state.currentOutfitId &&
    state.analysisResult &&
    state.imagePreviewUrl &&
    state.analyzedAt;

  if (showStyleAI) {
    // ✅ Add explicit validation
    if (!state.currentOutfitId || !state.imagePreviewUrl || !state.analyzedAt || !state.analysisResult) {
      console.error('[STYLE AI RENDER] Missing required context data');
      setShowStyleAI(false);
      return null;
    }




    const outfitContext: OutfitContext = {
      outfitId: state.currentOutfitId,
      imageUrl: state.imagePreviewUrl,
      title: state.selectedOccasion || 'Outfit',
      analyzedAt: state.analyzedAt,
      analysisResult: state.analysisResult,
      improvementPlan: state.improvementPlan,
      weatherContext: weatherData, // ✅ CHANGED: now full WeatherContext object
      weatherIntent: weatherIntent, // ✅ NEW
    };

    return (
      <StyleAIPage
        key={`style-ai-${outfitContext.outfitId}`} // ✅ More explicit key
        outfitContext={outfitContext}
        onClose={() => {
          setShowStyleAI(false);
          setActiveTab(NavTab.IMPROVE);
        }}
      />
    );
  }



  const isUploadPage = !state.isHome && !state.analysisResult && !state.improvementPlan && !state.isStyleDNA && !state.isHistory && !state.isProfile;

  return (
    <div className="min-h-screen bg-classik-beige font-manrope">
      <NetworkBanner status={networkStatus} />



      {globalError && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[500]
                   bg-red-600 text-white text-sm font-semibold
                   px-4 py-2 rounded-full shadow-lg"
        >
          {globalError}
        </div>
      )}

      {paletteWarning && (
        <div className="fixed inset-0 z-[700] bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-[32px] p-6">
            <h3 className="text-lg font-black mb-3">
              Similar color palette
            </h3>

            <p className="text-sm text-classik-taupe mb-6">
              {paletteWarning.message}
            </p>

            <div className="flex flex-col gap-3">
              <button
                className="h-14 rounded-full bg-classik-dark text-white font-black"
                onClick={() => {
                  setPaletteWarning(null);
                  handleAnalyze(); // continue anyway
                }}
              >
                Continue anyway
              </button>

              <button
                className="h-14 rounded-full bg-classik-black/5 text-classik-taupe font-black"
                onClick={() => setPaletteWarning(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <WeatherFeed
        intent={weatherIntent}
        onWeatherUpdate={handleWeatherUpdate}
      />

      {state.isAnalyzing && <ProcessingState imagePreviewUrl={state.imagePreviewUrl} mode="analysis" />}
      {activeTab === NavTab.IMPROVE_PROCESSING && (
        <ProcessingState imagePreviewUrl={state.imagePreviewUrl} mode="improvement" />
      )}

      {ENABLE_MONETIZATION && showPaywall && (
        <PaywallSheet
          trigger={paywallContext}
          session={session}
          subscriptionTier={subscriptionTier}
          onClose={() => setShowPaywall(false)}
          onSubscribed={async () => {
            // Optimistically show premium immediately
            setSubscriptionTier('premium');
            setShowPaywall(false);

            // Then verify via polling — the webhook needs a moment to process
            if (session?.user?.id) {
              let confirmed = false;
              for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('subscription_tier')
                  .eq('user_id', session.user.id)
                  .maybeSingle();
                if (profile?.subscription_tier === 'premium') {
                  confirmed = true;
                  console.log('[Subscription] Premium confirmed by Supabase after webhook');
                  break;
                }
              }
              if (!confirmed) {
                console.warn('[Subscription] Webhook may not have processed yet. Premium set optimistically.');
              }
            }
          }}
        />
      )}

      <div className="min-h-screen flex flex-col">
        <main className="flex-1 relative">
          <div className={`min-h-full w-full ${(!state.isHistory && !state.isProfile && !isUploadPage) ? 'block' : 'hidden'}`}>
            <div className={activeTab === NavTab.HOME ? "block" : "hidden"}>
              <Homepage
                key={homeRefreshKey}
                weeklyChallenge={weeklyChallenge}
                onStart={handleStartAnalysis}
                onHistory={() => setState(prev => ({ ...prev, isHistory: true }))}
                onProfile={() => setState(prev => ({ ...prev, isProfile: true }))}
                selectedStyle={state.selectedStyle}
                weatherContext={weatherData}
              />
            </div>

            {activeTab === NavTab.RESULTS && (
              <ResultsPage
                result={state.analysisResult}
                imageUrl={state.imagePreviewUrl}
                selectedStyle={state.selectedStyle}
                onRetake={() => {
                  setState(prev => ({ ...prev, analysisResult: null, imagePreviewUrl: null, isHome: false }));
                  setActiveTab(NavTab.HOME);
                }}
                onBack={handleBack}
                onGeneratePlan={() => handleTabChange(NavTab.IMPROVE)}
                isGeneratingPlan={state.isGeneratingPlan}
                improvementError={state.improvementError}
              />
            )}

            {activeTab === NavTab.IMPROVE && (
              <ImprovementPlanPage
                plan={state.improvementPlan}
                imagePreviewUrl={state.imagePreviewUrl}
                onBack={handleBack}
                onRetake={() => {
                  setState(prev => ({
                    ...prev,
                    improvementPlan: null,
                    analysisResult: null,
                    imagePreviewUrl: null,
                    isHome: false,
                  }));
                  setActiveTab(NavTab.HOME);
                }}
                weatherContext={weatherData}
                outfitScore={state.analysisResult?.score || 0}
                onOpenStyleAI={() => {
                  if (!state.currentOutfitId) {
                    console.error("Blocked StyleAI: outfitId missing");
                    return;
                  }
                  setShowStyleAI(true);
                }}
              />
            )}

            {activeTab === NavTab.DNA && <StyleDNAPage onBack={handleBack} />}
          </div>

          {state.isProfile && (
            <ProfilePage
              onBack={handleBack}
              onHistory={() => setState(prev => ({ ...prev, isProfile: false, isHistory: true }))}
              session={session}
              onResetApp={handleGlobalReset}
              subscriptionTier={subscriptionTier}
              onOpenPaywall={() => {
                setPaywallContext('profile_upgrade');
                setShowPaywall(true);
              }}
            />
          )}


          {state.isHistory && (
            <HistoryPage
              onBack={handleBack}

              onSelect={(item, url, outfitId, analyzedAt) => {
                setState(prev => ({
                  ...prev,
                  analysisResult: item,
                  imagePreviewUrl: url,
                  currentOutfitId: outfitId,
                  analyzedAt: analyzedAt,
                  isHistory: false,
                  improvementPlan: null
                }));
                setActiveTab(NavTab.RESULTS);
              }}
              session={session}
            />
          )}


          {isUploadPage && (
            <UploadPage
              imagePreviewUrl={state.imagePreviewUrl}
              selectedStyle={state.selectedStyle}
              selectedOccasion={state.selectedOccasion}
              customOccasion={state.customOccasion}
              isAnalyzing={state.isAnalyzing}
              isValidated={isValidated}
              validationMsg={validationMsg || state.validationReason}
              onBack={handleBack}
              onImageSelected={handleImageSelected}
              onStyleSelect={(s) => setState(prev => ({ ...prev, selectedStyle: s }))}
              onOccasionSelect={(v) => setState(prev => ({ ...prev, selectedOccasion: v }))}
              onCustomOccasionChange={(v) => setState(prev => ({ ...prev, customOccasion: v }))}
              onAnalyze={handleAnalyze}
              validationStatus={state.validationStatus}
              isOffline={networkStatus === 'offline'}
            />
          )}
        </main>

        {!(state.isAnalyzing || (state.isGeneratingPlan && activeTab === NavTab.IMPROVE) || state.isProfile || state.isHistory || isUploadPage) && (
          <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        )}
      </div>
    </div>
  );
};

export default App;
