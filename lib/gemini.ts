/**
 * lib/gemini.ts
 *
 * Client-side helper that routes ALL Gemini calls through the
 * supabase/functions/gemini-proxy edge function.
 *
 * The Gemini API key never leaves the server.
 */

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/gemini-proxy`;

interface GeminiCallOptions {
    model?: string;
    contents: unknown;
    systemInstruction?: string;
    generationConfig?: Record<string, unknown>;
}

/**
 * Calls Gemini via the edge-function proxy. Returns the text response.
 */
export async function callGemini(opts: GeminiCallOptions): Promise<string> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
            model: opts.model || 'gemini-3-flash-preview',
            contents: opts.contents,
            systemInstruction: opts.systemInstruction,
            generationConfig: opts.generationConfig,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Gemini proxy error ${res.status}: ${err.error || res.statusText}`);
    }

    const json = await res.json();
    return json.text ?? '';
}

/**
 * Calls Gemini via the edge-function proxy with SSE streaming.
 * Yields text chunks as they arrive.
 */
export async function* callGeminiStream(
    opts: GeminiCallOptions
): AsyncGenerator<string, void, unknown> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
            model: opts.model || 'gemini-3-flash-preview',
            contents: opts.contents,
            systemInstruction: opts.systemInstruction,
            generationConfig: opts.generationConfig,
            stream: true,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Gemini proxy stream error ${res.status}: ${err.error || res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(jsonStr);
                    const text =
                        parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) yield text;
                } catch {
                    // skip malformed SSE data lines
                }
            }
        }
    }
}
