import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify caller is authenticated via Supabase JWT
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const {
            model = "gemini-3-flash-preview",
            contents,
            generationConfig,
            systemInstruction,
            stream = false,
        } = body;

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "Gemini API key not configured" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Build the request body for the Gemini REST API
        const geminiBody: Record<string, unknown> = { contents };

        if (systemInstruction) {
            geminiBody.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }

        if (generationConfig) {
            geminiBody.generationConfig = generationConfig;
        }

        // Streaming path — forward SSE chunks back to the client
        if (stream) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

            const geminiRes = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiBody),
            });

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                return new Response(
                    JSON.stringify({ error: `Gemini API error: ${geminiRes.status}`, details: errText }),
                    {
                        status: geminiRes.status,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            // Pipe the SSE stream back to the client
            return new Response(geminiRes.body, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }

        // Non-streaming path
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody),
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            return new Response(
                JSON.stringify({ error: `Gemini API error: ${geminiRes.status}`, details: errText }),
                {
                    status: geminiRes.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const geminiData = await geminiRes.json();

        // Extract the text from Gemini's response format
        const text =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        return new Response(JSON.stringify({ text }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("gemini-proxy error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
