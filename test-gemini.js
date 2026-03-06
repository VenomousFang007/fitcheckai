import { GoogleGenAI, Type } from "@google/genai";
import fetch from "node-fetch";

import dotenv from "dotenv";
dotenv.config();

const test = async () => {
    try {
        const ai2 = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
        const res = await ai2.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Generate a mock improvement plan for a user wearing a casual t-shirt and jeans.",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        winningElements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        diagnosticSummary: {
                            type: Type.OBJECT,
                            properties: {
                                primaryIssue: { type: Type.STRING },
                                secondaryIssue: { type: Type.STRING },
                                alignmentImpact: { type: Type.STRING }
                            },
                            required: ["primaryIssue", "secondaryIssue", "alignmentImpact"]
                        },
                        problemStatements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        improvementSections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    whyMatters: { type: Type.STRING },
                                    styleImpact: { type: Type.STRING },
                                    actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["title", "whyMatters", "styleImpact", "actionSteps"]
                            }
                        },
                        advancedInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
                        outfitWeatherProfile: {
                            type: Type.OBJECT,
                            properties: {
                                coverage: { type: Type.STRING, enum: ["light", "medium", "heavy"] },
                                layering: { type: Type.STRING, enum: ["single", "layered", "heavy-layered"] },
                                fabricWeight: { type: Type.STRING, enum: ["light", "mid", "heavy"] }
                            },
                            required: ["coverage", "layering", "fabricWeight"]
                        }
                    },
                    required: ["winningElements", "diagnosticSummary", "problemStatements", "improvementSections", "advancedInsights", "outfitWeatherProfile"]
                }
            }
        });
        console.log("Success:", res.text);
    } catch (e) {
        console.error("API Error:", e);
    }
};

test();
