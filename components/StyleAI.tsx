import React, { useState, useEffect, useRef } from 'react';
import { FitCheckLogo } from './FitCheckLogo';
import { callGemini, callGeminiStream } from '../lib/gemini';
import { SendIcon, ArrowLeftIcon } from './Icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../auth/useUser';
import {
  getOrCreateConversation,
  loadMessages,
  saveMessage,
  type StyleAIMessage
} from '../lib/styleAIMemory';
import type { Intent, WeatherContext } from '../types';
import { generateStylistMemory, detectStagnation } from '../lib/stylistIntelligence';


import { OutfitContext } from '../types';

interface StyleAIPageProps {
  outfitContext: OutfitContext;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  conversationId: string; // ← Add conversation scoping
  timestamp?: string; // ← Optional: helps with debugging
}

const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

// Add this utility function near the top of your file
const sanitizeAIResponse = (text: string): string => {
  let cleaned = text;

  // Replace common markdown list patterns with numbered format
  // Pattern: "* Something" or "- Something" at start of line
  cleaned = cleaned.replace(/^[*\-]\s+(.+)$/gm, (match, content, offset, string) => {
    // Count which bullet this is by looking at previous bullets
    const precedingText = string.substring(0, offset);
    const bulletCount = (precedingText.match(/^[*\-]\s+/gm) || []).length + 1;
    return `${bulletCount}. ${content}`;
  });

  // Remove stray markdown symbols
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1'); // Bold
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1'); // Italic
  cleaned = cleaned.replace(/__(.+?)__/g, '$1'); // Underline
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, ''); // Headers

  return cleaned;
};


const SYSTEM_INSTRUCTION = `
YOU ARE STYLEAI — PERSONAL STYLE COACH

You are the lead stylist inside FitCheck. You are not a report generator. You are a coach. You speak like a knowledgeable friend who happens to have an incredible eye for fashion.

Your personality:
Warm, confident, invested in the user's growth.
You celebrate what works before addressing what doesn't.
You are honest but never cold. Direct but never dismissive.
You make people feel seen, then guide them higher.

---

CONVERSATIONAL FLOW (CRITICAL)

You are having a CONVERSATION, not delivering a report.

RULE 1: ALWAYS END WITH A FOLLOW-UP QUESTION.
Every response you give MUST end with a genuine, specific follow-up question that makes the user want to continue talking. This is non-negotiable.

Good examples:
"Want me to break down the color story here?"
"Curious — what were you going for with this pairing?"
"Should I suggest a quick swap that could bump this up?"
"Want to know what one change would make the biggest difference?"

Bad examples (too generic):
"Do you have any other questions?"
"Is there anything else I can help with?"
"Let me know if you need more help."

RULE 2: LEAD WITH WHAT WORKS.
Before any critique, acknowledge what the outfit does well. This is not flattery — it's honest observation. People engage more when they feel their wins are recognized.

RULE 3: PROGRESSIVE DISCLOSURE.
Do not dump everything at once. Share your main observation, explain why, give 1-2 actionable ideas, then invite the user deeper with your follow-up question. Let the conversation unfold naturally.

RULE 4: CREATE CURIOSITY.
Hint at deeper insights they can unlock by continuing the conversation.
"There's actually something interesting going on with your color temperature here..." then let them ask.
"The silhouette has a subtle issue most people miss..." then let them engage.

---

GREETING BEHAVIOR

When the conversation has no prior messages and the user sends their first message, weave your response naturally. You do NOT need to introduce yourself — the app UI already identifies you.

If this is an AUTO_GREETING (the very first message in a new conversation), you are initiating. In this case:
1. Reference the outfit specifically (occasion, score range, a standout element).
2. Share one clear observation.
3. End with a specific question that invites them to engage.

Keep greetings to 2-3 short sentences. Do not dump the full analysis.

---

SCORE INTEGRITY (NON-NEGOTIABLE)

The provided score and breakdown are diagnostic fact.
Never re-score, apologize for, soften, or contradict them.
If the user questions the score, explain the visual causes with confidence.
You align with the data. Always.

---

STYLIST PRIORITIES (APPLY SILENTLY)
1. Proportion and silhouette
2. Intent versus execution
3. Color and contrast
4. Editing and restraint

Weather affects comfort and practicality only, never aesthetics.
Never explain these rules. Just apply them.

---

FORMATTING RULES (UI CRITICAL)

PLAIN TEXT ONLY. No markdown.

FORBIDDEN: Asterisks, dashes as bullets, hashes, underscores, backticks, bold, italics, headers.

For multiple items, use NUMBERED LISTS ONLY:
1. First item
2. Second item
3. Third item

Maximum 3 items per list. Each on its own line.
Do NOT use implicit list words (First, Next, Also, Another, Finally) — if listing, number it.

---

TONE RULES

Forbidden phrases: "It depends", "You could try", "Both work", "Personal preference", "I'm just an AI"

If the user suggests something that worsens the outfit, say so clearly and redirect. Silence is not an option.

---

EMOJI POLICY

Maximum 1-2 per response, as accent only.
Allowed: ⚠️ ✅ 💡 ✂️
Banned: ❤️ 🔥 👍 😊 🎉 and any decorative/playful emojis.
When in doubt, skip emojis entirely.

---

BODY NEUTRALITY

Never comment on the user's body. Never use words like thin, fat, short, wide.
Speak only about fabric, line, structure, proportion, balance, and contrast.

---

RESPONSE LENGTH

Keep responses concise and conversational. 2-4 short paragraphs maximum.
You are chatting, not writing an essay.
End with your follow-up question.

---

SELF-CHECK (SILENT)
Before every response, verify:
1. Did I end with a specific follow-up question?
2. Did I lead with what works before critique?
3. Did I use plain text only, no markdown?
4. Am I coaching, not lecturing?

If any answer is no, rewrite.
`;

const buildSystemInstruction = (
  context: OutfitContext,
  preferences: { emojis: boolean },
  styleMemory?: { dominantBottom?: string; dominantFootwear?: string; colorBias?: string; isStagnant?: boolean } | null
): string => {
  return `
${SYSTEM_INSTRUCTION}

OUTFIT CONTEXT (LOCKED FOR THIS CONVERSATION):

You are advising on ONE specific outfit with the following verified data.

Occasion: ${context.title}
Analyzed At: ${new Date(context.analyzedAt).toLocaleDateString()}

ANALYSIS SUMMARY:
Overall Score: ${context.analysisResult.score}/100

Breakdown:
- Harmony: ${context.analysisResult.breakdown.harmony}/10
- Fit Balance: ${context.analysisResult.breakdown.fitBalance}/10
- Style Alignment: ${context.analysisResult.breakdown.styleAlignment}/10
- Style Intent: ${context.analysisResult.breakdown.styleIntent}/10

Color Palette:
${context.analysisResult.palette.join(', ')}

${context.improvementPlan
      ? `
IMPROVEMENT PLAN CONTEXT:
Primary Focus: ${context.improvementPlan.diagnosticSummary.primaryIssue}
Winning Elements: ${context.improvementPlan.winningElements.join(', ')}
`
      : `
No improvement plan has been generated yet.
Your role is to verbally interpret this data, not repeat the improvement page.
Explain causes, not lists.
`
    }

${context.weatherContext
      ? `
WEATHER CONTEXT FOR THIS OUTFIT:

Intent: ${context.weatherContext.intent || 'now'}
Relevant Time: ${context.weatherContext.timeWindow?.label || 'Current time'}

Current Conditions:
- Temperature: ${context.weatherContext.currentConditions?.temp || 'Unknown'}°C
- Condition: ${context.weatherContext.currentConditions?.condition || 'unknown'}
- ${context.weatherContext.currentConditions?.label || 'Weather data pending'}

${context.weatherContext.relevantForecast ? `
Forecast for Today (Segmented):

Morning:
- ${context.weatherContext.relevantForecast?.morning?.temp ?? 'N/A'}°C
- ${context.weatherContext.relevantForecast?.morning?.condition ?? 'Unknown'}

Afternoon:
- ${context.weatherContext.relevantForecast?.afternoon?.temp ?? 'N/A'}°C
- ${context.weatherContext.relevantForecast?.afternoon?.condition ?? 'Unknown'}

Evening:
- ${context.weatherContext.relevantForecast?.evening?.temp ?? 'N/A'}°C
- ${context.weatherContext.relevantForecast?.evening?.condition ?? 'Unknown'}

Night:
- ${context.weatherContext.relevantForecast?.night?.temp ?? 'N/A'}°C
- ${context.weatherContext.relevantForecast?.night?.condition ?? 'Unknown'}
` : 'No forecast data available - using current conditions only.'}

Weather Summary: ${context.weatherContext.weatherNote || 'Weather analysis pending'}

WEATHER REASONING RULES:
- Weather affects COMFORT and PRACTICALITY only, never aesthetic judgment.
- If the user asks "is this okay for tonight?" or similar time-specific questions, reference the FORECAST data in the time window above, NOT current conditions.
- If the user asks about a specific time of day, reference that segment (morning, afternoon, evening, night).
- NEVER lower the outfit score based on weather.
- Suggest practical additions (jacket, umbrella, layers) when weather demands it.
- If no forecast is available, acknowledge limitations and answer based on current conditions only.
`
      : 'No weather data available for this outfit.'
    }

${styleMemory ? `
STYLE HISTORY (PERSONAL PATTERNS FROM RECENT OUTFITS):
This user tends to favor:
${styleMemory.dominantBottom ? `Bottom: ${styleMemory.dominantBottom}` : ''}
${styleMemory.dominantFootwear ? `Footwear: ${styleMemory.dominantFootwear}` : ''}
${styleMemory.colorBias ? `Color tendency: ${styleMemory.colorBias}` : ''}
${styleMemory.isStagnant ? `
NOTE: This user shows repetitive patterns. Gently nudge them toward variety when relevant. Do not lecture — hint at expansion opportunities.
` : ''}
Use this to personalize your coaching. Reference their patterns naturally when relevant.
Do NOT list this data back to them. Weave it into advice.
` : ''}

CRITICAL RULES:
- You MUST ground all answers in this outfit’s data.
- You MUST NOT invent scores, colors, or feedback.
- You MUST NOT reference other outfits or past analyses.
- If asked about something not present here, say you don’t have that information.
- You MAY explain why the score is what it is.
- You MUST ground explanations in the breakdown and improvement plan.
- You MUST NOT re-score or contradict the given score.
`;
};

const urlToInlineData = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({
      inlineData: {
        data: (reader.result as string).split(',')[1],
        mimeType: blob.type
      }
    });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const StyleAIPage: React.FC<StyleAIPageProps> = ({
  outfitContext,
  onClose,
}) => {
  if (!outfitContext) {
    return null; // or loading skeleton
  }

  const {
    outfitId,
    imageUrl,
    analysisResult,
    improvementPlan,
    weatherContext,
  } = outfitContext;



  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');





  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [styleMemoryData, setStyleMemoryData] = useState<{
    dominantBottom?: string;
    dominantFootwear?: string;
    colorBias?: string;
    isStagnant?: boolean;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInjectedVisualRef = useRef(false);
  const hasGreetedRef = useRef(false);

  const recordingStartRef = useRef<number | null>(null);
  const pendingSuggestionRef = useRef<string | null>(null);

  // Suggestion chips for conversational prompts
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { user } = useUser();
  useEffect(() => {
    console.log("[AUTH CHECK] user →", user);
    console.log("[AUTH CHECK] user.id →", user?.id);
  }, [user]);



  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // ← Add loading state

  // Hard reset when outfit changes
  useEffect(() => {
    console.log('[STYLE AI RESET] Outfit changed → hard reset UI state');

    setMessages([]);
    setConversationId(null);
    setInputText('');
    setIsTyping(false);
    setIsInitializing(true); // ← Reset loading state
    hasInjectedVisualRef.current = false;
    hasGreetedRef.current = false;
    setShowSuggestions(true);
  }, [outfitId]);

  // Initialize conversation with race condition protection
  useEffect(() => {
    if (!user?.id || !outfitId) {
      setIsInitializing(false);
      return;
    }

    let cancelled = false;
    const currentOutfitId = outfitId; // ← Capture for validation
    const abortController = new AbortController();

    (async () => {
      try {
        console.log('[STYLE AI INIT]', { userId: user.id, outfitId });

        const convId = await getOrCreateConversation({
          userId: user.id,
          outfitId,
        });

        // ✅ Critical: Verify outfit hasn't changed
        if (cancelled || currentOutfitId !== outfitId) {
          console.log('[STYLE AI INIT] Aborted: outfit changed during fetch');
          return;
        }

        setConversationId(convId);

        const msgs = await loadMessages(convId);

        // ✅ Verify AGAIN before updating messages
        if (cancelled || currentOutfitId !== outfitId) {
          console.log('[STYLE AI INIT] Aborted: outfit changed during message load');
          return;
        }

        // ✅ Tag each message with its conversation ID
        setMessages(
          msgs.map(m => ({
            role: m.role as 'user' | 'model',
            content: m.content,
            conversationId: convId, // ← Critical: tag messages
            timestamp: m.created_at,
          }))
        );

        setIsInitializing(false);

        // ✅ Fetch style memory (non-blocking enrichment)
        if (user.id && !cancelled) {
          generateStylistMemory(user.id).then(memory => {
            if (cancelled || currentOutfitId !== outfitId) return;
            if (memory) {
              const diagnosis = detectStagnation(memory);
              const dominantTemp = Object.entries(memory.colorBias).sort((a, b) => b[1] - a[1])[0];
              setStyleMemoryData({
                dominantBottom: memory.dominantBottom.type || undefined,
                dominantFootwear: memory.dominantFootwear.type || undefined,
                colorBias: dominantTemp ? dominantTemp[0] : undefined,
                isStagnant: diagnosis.bottomStagnant || diagnosis.footwearStagnant || diagnosis.boldnessLow,
              });
              console.log('[STYLE MEMORY] Loaded user style patterns');
            }
          }).catch(err => console.warn('[STYLE MEMORY] Failed:', err));
        }

        // ✅ AUTO-GREETING: If no messages exist, generate a coaching greeting
        if (msgs.length === 0 && !hasGreetedRef.current && !cancelled && currentOutfitId === outfitId) {
          hasGreetedRef.current = true;
          console.log('[STYLE AI GREETING] No messages found, generating auto-greeting');
          generateAutoGreeting(convId, currentOutfitId);
        }
      } catch (error) {
        console.error('[STYLE AI INIT ERROR]', error);
        if (!cancelled && currentOutfitId === outfitId) {
          setIsInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      console.log('[STYLE AI CLEANUP] Cancelled outfit init for', outfitId);
    };
  }, [user?.id, outfitId]);

  // ============================================
  // AUTO-GREETING GENERATOR
  // ============================================
  const generateAutoGreeting = async (convId: string, currentOutfitId: string) => {
    setIsTyping(true);

    try {
      // Build the visual context for the greeting
      const visualContextMessage = await buildVisualContextMessage(outfitContext.imageUrl);
      hasInjectedVisualRef.current = true;

      const greetingPrompt = `AUTO_GREETING: This is the start of a brand new conversation. The user just opened the chat to discuss this outfit. Generate a warm, coaching-style opening message that:
1. Briefly acknowledges the outfit (reference the occasion "${outfitContext.title}" and score ${outfitContext.analysisResult.score}/100)
2. Shares one specific, interesting observation about the look
3. Ends with a follow-up question that invites them to engage

Keep it to 2-3 short sentences. Be warm, specific, and natural. Do NOT dump the full analysis.`;

      const historyParts = [
        visualContextMessage,
        { role: 'user', parts: [{ text: greetingPrompt }] }
      ];

      let fullResponse = '';

      // Add placeholder for streaming
      const greetingPlaceholder: Message = {
        role: 'model',
        content: '',
        conversationId: convId,
        timestamp: new Date().toISOString(),
      };

      setMessages([greetingPlaceholder]);

      for await (const chunk of callGeminiStream({
        model: 'gemini-3-flash-preview',
        contents: historyParts,
        systemInstruction: buildSystemInstruction(outfitContext, { emojis: true }, styleMemoryData),
      })) {
        if (outfitContext.outfitId !== currentOutfitId) break;

        fullResponse += chunk;
        const displayResponse = sanitizeAIResponse(fullResponse);

        setMessages([{
          role: 'model',
          content: displayResponse,
          conversationId: convId,
          timestamp: new Date().toISOString(),
        }]);
      }

      // Save to database
      if (outfitContext.outfitId === currentOutfitId && fullResponse) {
        await saveMessage({
          conversationId: convId,
          role: 'model',
          content: sanitizeAIResponse(fullResponse),
        });
        console.log('[STYLE AI GREETING] Greeting saved');
      }
    } catch (error) {
      console.error('[STYLE AI GREETING ERROR]', error);
    } finally {
      setIsTyping(false);
    }
  };

  // ============================================
  // SUGGESTION CHIP HANDLER
  // ============================================
  const handleSuggestionTap = (suggestion: string) => {
    setShowSuggestions(false);
    setInputText(suggestion);
    // Use a ref to flag auto-send on next render cycle
    pendingSuggestionRef.current = suggestion;
  };

  // Auto-send when a suggestion chip populates the input
  useEffect(() => {
    if (pendingSuggestionRef.current && inputText === pendingSuggestionRef.current) {
      pendingSuggestionRef.current = null;
      handleSendMessage();
    }
  }, [inputText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const buildVisualContextMessage = async (imageUrl: string) => {
    const visual = await urlToInlineData(imageUrl);

    return {
      role: 'user',
      parts: [
        {
          text:
            "VISUAL CONTEXT (REFERENCE ONLY). " +
            "This image shows the outfit already analyzed. " +
            "Use it only to support explanations about fit, color, and texture. " +
            "Do NOT re-score, re-analyze, or contradict the existing analysis."
        },
        { inlineData: visual.inlineData }
      ]
    };
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping || isInitializing) return;

    // ✅ Capture current context at invocation time
    const currentConversationId = conversationId;
    const currentOutfitId = outfitContext.outfitId;

    if (!currentConversationId) {
      console.warn('[SEND BLOCKED] Conversation not ready yet');
      return;
    }

    const userMessageText = inputText.trim();
    setInputText('');
    setShowSuggestions(false);

    // ✅ Optimistic update with conversation scoping
    const userMessageUI: Message = {
      role: 'user',
      content: userMessageText,
      conversationId: currentConversationId, // ← Tag with conversation
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [
      ...prev.filter(m => m.conversationId === currentConversationId), // ← Filter stale messages
      userMessageUI,
    ]);
    setIsTyping(true);

    try {
      // ✅ Validate context hasn't changed
      if (outfitContext.outfitId !== currentOutfitId) {
        console.warn('[SEND BLOCKED] Outfit changed during send preparation');
        setIsTyping(false);
        return;
      }

      // Save user message to database
      await saveMessage({
        conversationId: currentConversationId,
        role: 'user',
        content: userMessageText,
      });

      console.log('[SEND] User message saved');

      // ✅ Validate again after async operation
      if (outfitContext.outfitId !== currentOutfitId) {
        console.warn('[SEND BLOCKED] Outfit changed during message save');
        setIsTyping(false);
        return;
      }

      // ✅ Build history from messages tagged with current conversation only
      let historyParts: any[] = [];

      // ✅ Inject visual context ONCE per conversation
      if (!hasInjectedVisualRef.current) {
        const visualContextMessage = await buildVisualContextMessage(outfitContext.imageUrl);
        historyParts.push(visualContextMessage);
        hasInjectedVisualRef.current = true;
      }

      // ✅ Append previous messages (text only)
      messages
        .filter(msg => msg.conversationId === currentConversationId)
        .forEach(msg => {
          historyParts.push({
            role: msg.role,
            parts: [{ text: msg.content }],
          });
        });

      // ✅ Append current user message
      historyParts.push({
        role: 'user',
        parts: [{ text: userMessageText }],
      });

      let fullResponse = '';

      // ✅ Add empty AI message with conversation scoping
      const aiMessagePlaceholder: Message = {
        role: 'model',
        content: '',
        conversationId: currentConversationId, // ← Tag with conversation
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [
        ...prev.filter(m => m.conversationId === currentConversationId),
        aiMessagePlaceholder,
      ]);

      // Stream the response via proxy
      for await (const chunk of callGeminiStream({
        model: 'gemini-3-flash-preview',
        contents: historyParts,
        systemInstruction: buildSystemInstruction(outfitContext, {
          emojis: true, // TEMP: later wire this to personality
        }, styleMemoryData),
      })) {
        // ✅ Validate context during streaming
        if (outfitContext.outfitId !== currentOutfitId) {
          console.warn('[SEND BLOCKED] Outfit changed during AI streaming');
          break;
        }

        fullResponse += chunk;

        // ✅ Apply sanitization before rendering
        const displayResponse = sanitizeAIResponse(fullResponse);

        setMessages(prev => {
          // ✅ Only update messages from current conversation
          const filtered = prev.filter(m => m.conversationId === currentConversationId);
          const updated = [...filtered];
          if (updated.length > 0) {
            updated[updated.length - 1].content = displayResponse;
          }
          return updated;
        });
      }

      // ✅ Final validation before saving AI response
      if (outfitContext.outfitId !== currentOutfitId) {
        console.warn('[SEND BLOCKED] Outfit changed before AI response save');
        setIsTyping(false);
        return;
      }

      // ✅ Save sanitized version to database
      await saveMessage({
        conversationId: currentConversationId,
        role: 'model',
        content: sanitizeAIResponse(fullResponse),
      });

      console.log('[SEND] AI response saved');
    } catch (error) {
      console.error('[SEND ERROR] Chat error:', error);

      // ✅ Only show error if still on same outfit
      if (outfitContext.outfitId === currentOutfitId) {
        const errorMessage: Message = {
          role: 'model',
          content: "I'm having trouble connecting right now. Please try again.",
          conversationId: currentConversationId,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [
          ...prev.filter(m => m.conversationId === currentConversationId),
          errorMessage,
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // --- AUDIO LOGIC (unchanged) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration =
          Date.now() - (recordingStartRef.current ?? 0);

        // Always stop mic hardware
        stream.getTracks().forEach(track => track.stop());

        // Ignore ultra-short recordings
        if (duration < 700) {
          setIsTranscribing(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      recordingStartRef.current = Date.now();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone initialization failed:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = audioBlob.type || 'audio/webm';

        const text = await callGemini({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                {
                  text: `
Transcribe the audio to text.

IMPORTANT RULES:
- If no clear human speech is detected, return EXACTLY: [NO_SPEECH]
- If the speech is unclear, mumbling, or incomplete, return EXACTLY: [UNCLEAR]
- Do NOT guess.
- Do NOT invent words.
- Do NOT summarize.
Return only the transcription or one of the tokens above.
`
                }
              ]
            }
          ],
        });

        if (!text) {
          setIsTranscribing(false);
          return;
        }

        const cleaned = text.trim();

        if (
          cleaned === "[NO_SPEECH]" ||
          cleaned === "[UNCLEAR]" ||
          cleaned.length < 3
        ) {
          // Do nothing. Do NOT inject garbage into input.
          setIsTranscribing(false);
          return;
        }

        if (text) {
          setInputText(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${text.trim()}` : text.trim();
          });
        }
        setIsTranscribing(false);
      };
    } catch (error) {
      console.error("Transcription failed:", error);
      setIsTranscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-classik-beige font-manrope flex flex-col animate-fade-in">

      {/* HEADER */}
      <header className="flex-none h-20 flex items-center justify-between px-6 bg-classik-beige/95 backdrop-blur-sm border-b border-classik-dark/5 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/40 border border-white/20 flex items-center justify-center active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeftIcon className="w-5 h-5 text-classik-black" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <FitCheckLogo className="w-5 h-5 text-classik-dark" />
            <span className="text-sm font-black uppercase tracking-[0.15em] text-classik-black">Style AI</span>
          </div>
          <span className="text-[9px] font-bold text-classik-taupe uppercase tracking-widest mt-0.5">Your Personal Stylist</span>
        </div>

        <div className="w-10" />
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* OUTFIT CONTEXT — Compact thumbnail */}
        <div className="mb-4 flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/40 shadow-sm shrink-0">
            <img
              src={imageUrl}
              alt="Analyzed outfit"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center min-h-[5rem]">
            <p className="text-xs font-bold text-classik-black uppercase tracking-wide">{outfitContext.title}</p>
            <p className="text-[11px] font-semibold text-classik-taupe mt-1">Score: {outfitContext.analysisResult.score}/100</p>
            <p className="text-[10px] font-medium text-classik-taupe/60 mt-0.5">
              {new Date(outfitContext.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* CHAT MESSAGES */}
        {messages
          .filter(msg => msg.conversationId === conversationId)
          .map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={`${msg.conversationId}-${msg.timestamp || idx}`}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`
    max-w-[85%] rounded-[24px] p-5 text-sm font-medium leading-relaxed tracking-tight
    ${isUser
                      ? 'bg-classik-dark text-white rounded-br-none shadow-lg'
                      : 'bg-white/60 text-classik-black border border-white/60 rounded-bl-none shadow-sm backdrop-blur-md'
                    }
  `}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white/40 text-classik-black border border-white/40 rounded-[24px] rounded-bl-none p-4 shadow-sm backdrop-blur-md flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-classik-black/40 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-classik-black/40 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-classik-black/40 animate-bounce" />
            </div>
          </div>
        )}

        {/* SUGGESTION CHIPS */}
        {showSuggestions && !isTyping && messages.filter(m => m.conversationId === conversationId).length > 0 && messages.filter(m => m.conversationId === conversationId).length <= 2 && (
          <div className="flex flex-wrap gap-2 mt-2 animate-fade-in">
            {[
              "What's working in this outfit?",
              "How can I improve this?",
              outfitContext.weatherContext ? "Is this weather-appropriate?" : "Break down the color story",
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionTap(suggestion)}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-classik-dark bg-white/70 border border-classik-dark/10 shadow-sm hover:bg-white hover:border-classik-dark/20 active:scale-95 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="flex-none p-6 pb-8 bg-gradient-to-t from-classik-beige via-classik-beige to-transparent">
        <div className="relative flex items-center gap-3">
          {/* TEXT INPUT */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              isRecording
                ? "Listening..."
                : isTranscribing
                  ? "Transcribing..."
                  : "Chat with Style AI"
            }
            disabled={isTyping || isRecording || isTranscribing || isInitializing} // ✅ Add isInitializing
            className="w-full h-14 bg-white/60 backdrop-blur-xl border border-white rounded-full px-6 text-sm font-bold text-classik-black placeholder-classik-black/30 shadow-sm focus:outline-none focus:border-classik-dark/20 focus:bg-white/80 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          />

          {/* MIC BUTTON */}
          <button
            onClick={toggleRecording}
            disabled={isTyping || isTranscribing}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
              ${isRecording
                ? 'bg-red-500 text-white shadow-lg animate-pulse'
                : isTranscribing
                  ? 'bg-classik-dark/10 text-classik-black/40 cursor-wait'
                  : 'bg-white/40 text-classik-black/60 border border-white hover:bg-white/60 active:scale-95'
              }
              ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isTranscribing ? (
              <div className="w-5 h-5 border-2 border-classik-dark/30 border-t-classik-dark rounded-full animate-spin" />
            ) : (
              <MicIcon className="w-5 h-5" />
            )}
          </button>

          {/* SEND BUTTON */}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping || isRecording || isTranscribing || isInitializing || !conversationId} // ✅ Add checks
            className={`
              w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
              ${(!inputText.trim() || isTyping || isRecording || isTranscribing)
                ? 'bg-white/40 text-classik-black/20 cursor-default'
                : 'bg-classik-dark text-white shadow-lg active:scale-95 hover:bg-classik-dark/90'
              }
            `}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};