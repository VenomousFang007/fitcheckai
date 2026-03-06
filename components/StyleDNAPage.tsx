import React, { useState, useEffect, useRef } from 'react';
import { callGemini } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { Fingerprint } from 'lucide-react';

interface StyleDNAPageProps {
  onBack: () => void;
}

interface TopOutfit {
  id_uuid: string;  // Changed from id: string
  image_url: string;
  score: number;
  created_at: string;
}

interface PaletteItem {
  name: string;
  hex: string;
  description: string;
}

interface DNAProfile {
  archetype: string;
  description: string;
  editorsPerspective: string;
  signaturePalette: PaletteItem[];
  silhouetteAndFit: string;
  whereItWorksBest: string;
}

// Constants
const BATCH_SIZE = 15; // DNA unlocks and updates every 15 outfits
const DNA_SAMPLE_SIZE = 5; // Top 5 outfits per batch used for DNA


const isValidHex = (hex: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/i.test(hex);
};

const ensureVisibleColor = (hex: string): string => {
  if (!isValidHex(hex)) return "#E6E1D9";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 240) return "#F0EAD6";
  return hex;
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

const getCurrentStreakStartDate = (dates: string[]): Date | null => {
  if (dates.length === 0) return null;

  const uniqueDays = Array.from(
    new Set(
      dates.map(d =>
        new Date(d).toISOString().split('T')[0]
      )
    )
  ).sort((a, b) => (a > b ? -1 : 1));

  let streakCount = 1;
  let streakStart = new Date(uniqueDays[0]);

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);

    const diff =
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streakCount++;
      streakStart = curr;
      if (streakCount >= 15) {
        return streakStart;
      }
    } else {
      break;
    }
  }

  return null;
};

const getCurrentStreakLength = (dates: string[]): number => {
  if (dates.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(dates.map(d => new Date(d).toISOString().split('T')[0]))
  ).sort((a, b) => (a > b ? -1 : 1));

  let count = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);

    const diff =
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) count++;
    else break;
  }

  return count;
};



export const StyleDNAPage: React.FC<StyleDNAPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [allOutfits, setAllOutfits] = useState<TopOutfit[]>([]);
  const [dnaBatchOutfits, setDnaBatchOutfits] = useState<TopOutfit[]>([]); // Top 5 for current DNA version
  const [dna, setDna] = useState<DNAProfile | null>(null);
  const [currentDNAVersion, setCurrentDNAVersion] = useState<number>(0);
  const [streakDays, setStreakDays] = useState(0);
  const [availableDNAVersions, setAvailableDNAVersions] = useState<number[]>([]);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    loadStyleData();
    loadAvailableDNAVersions();
  }, []);

  const loadStyleData = async () => {
    try {
      setInitializing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch ALL outfits sorted by score, then by date
      const { data: outfitsData, error } = await supabase
        .from('OutfitData')
        .select('id_uuid, image_url, score, created_at')
        .eq('user_id', user.id)
        .not('score', 'is', null)
        .gt('score', 0)
        .order('score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validOutfits = outfitsData || [];
      setAllOutfits(validOutfits);

      // STEP 3: Calculate streak start + current streak progress

      const uploadDates = validOutfits.map(o => o.created_at);

      // ALWAYS show current streak progress
      const currentStreak = getCurrentStreakLength(uploadDates);
      setStreakDays(Math.min(currentStreak, BATCH_SIZE));

      // DNA gate still exists
      const streakStartDate = getCurrentStreakStartDate(uploadDates);
      if (!streakStartDate) {
        return; // progress shows, DNA stays locked
      }

      // STEP 1: Get highest stored DNA version
      const { data: existingVersions } = await supabase
        .from('style_dna_history')
        .select('dna_version, dna_payload, top_outfit_ids')
        .eq('user_id', user.id)
        .order('dna_version', { ascending: false })
        .limit(1);

      const highestStoredVersion = existingVersions?.[0]?.dna_version ?? -1;

      // STEP 2: Calculate what version user QUALIFIES for based on total streak
      const totalStreakDays = getCurrentStreakLength(uploadDates);
      const qualifiedVersion = Math.floor(totalStreakDays / BATCH_SIZE) - 1;

      // STEP 3: Load existing DNA (if any)
      if (highestStoredVersion >= 0 && existingVersions?.[0]) {
        setDna(existingVersions[0].dna_payload);
        setCurrentDNAVersion(highestStoredVersion);

        // Load the outfits that were used for this DNA version
        const storedOutfitIds = existingVersions[0].top_outfit_ids || [];
        const batchOutfits = validOutfits.filter(o => storedOutfitIds.includes(o.id_uuid));
        setDnaBatchOutfits(batchOutfits);
      }

      // STEP 4: ONLY generate if user qualifies for a NEW version
      if (qualifiedVersion > highestStoredVersion) {
        setLoading(true);

        // Calculate the streak window for the NEW version
        const streakWindowStart = new Date(
          streakStartDate.getTime() +
          qualifiedVersion * BATCH_SIZE * 24 * 60 * 60 * 1000
        );

        const streakWindowEnd = new Date(
          streakWindowStart.getTime() +
          BATCH_SIZE * 24 * 60 * 60 * 1000
        );

        // Get outfits from this specific window
        const streakOutfits = validOutfits.filter(o => {
          const d = new Date(o.created_at);
          return d >= streakWindowStart && d < streakWindowEnd;
        });

        const top5 = streakOutfits
          .sort((a, b) => b.score - a.score)
          .slice(0, DNA_SAMPLE_SIZE);

        setDnaBatchOutfits(top5);

        // Generate new DNA
        await generateStyleDNA(
          top5,
          streakWindowStart,
          streakWindowEnd,
          qualifiedVersion
        );

        setCurrentDNAVersion(qualifiedVersion);
        await loadAvailableDNAVersions(); // Refresh the version list

        setLoading(false);
      }


    } catch (err) {
      console.error("Style DNA Load Error:", err);
    } finally {
      setInitializing(false);
    }
  };

  const loadDNAVersion = async (version: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('style_dna_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('dna_version', version)
        .single();

      if (error) throw error;

      setDna(data.dna_payload);
      setCurrentDNAVersion(data.dna_version);

      // Load the outfits for this version
      const storedOutfitIds = data.top_outfit_ids || [];
      const { data: outfitsData } = await supabase
        .from('OutfitData')
        .select('id_uuid, image_url, score, created_at')
        .in('id_uuid', storedOutfitIds);

      if (outfitsData) {
        // Sort by score to maintain consistent order
        const sortedOutfits = outfitsData.sort((a, b) => b.score - a.score);
        setDnaBatchOutfits(sortedOutfits);
      }
    } catch (err) {
      console.error('Failed to load DNA version:', err);
    }
  };

  const loadAvailableDNAVersions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('style_dna_history')
        .select('dna_version')
        .eq('user_id', user.id)
        .order('dna_version', { ascending: false });

      if (error) throw error;

      setAvailableDNAVersions(data.map(d => d.dna_version));
    } catch (err) {
      console.error('Failed to load DNA versions:', err);
    }
  };

  const generateStyleDNA = async (
    dnaBatchOutfits: TopOutfit[],
    streakWindowStart: Date,
    streakWindowEnd: Date,
    qualifiedVersion: number
  ) => {
    try {
      // Convert top 5 outfit images to inline data for AI
      const imageParts = await Promise.all(
        dnaBatchOutfits.map(o => urlToInlineData(o.image_url))
      );

      const text = await callGemini({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [
              ...imageParts.map(ip => ip),
              { text: `Analyze these ${DNA_SAMPLE_SIZE} outfits. Define the Style DNA. Derive exactly 5 signature colors from these specific outfits.` }
            ]
          }
        ],
        systemInstruction: `
You are a sharp, modern stylist writing for everyday people.
Avoid formal event language.
Use casual, grounded scenarios.
No fashion jargon.
Speak friendly. No advice.

Output JSON only:
{
  "archetype": "2-3 word title",
  "description": "2-3 Short paragraph identity description.",
  "editorsPerspective": "Visual patterns. Start with 'Looking at your top looks together...'",
  "signaturePalette": [
    {
      "name": "Human-friendly color name (e.g. Camel Tan)",
      "hex": "#HEXCODE",
      "description": " short sentence (max 12 words) explaining its role."
    }
  ],
  "silhouetteAndFit": "Proportions description.",
  "whereItWorksBest": "Real-life context."
}
`,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              archetype: { type: "STRING" },
              description: { type: "STRING" },
              editorsPerspective: { type: "STRING" },
              signaturePalette: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    hex: { type: "STRING" },
                    description: { type: "STRING" }
                  },
                  required: ["name", "hex", "description"]
                }
              },
              silhouetteAndFit: { type: "STRING" },
              whereItWorksBest: { type: "STRING" }
            },
            required: ["archetype", "description", "editorsPerspective", "signaturePalette", "silhouetteAndFit", "whereItWorksBest"]
          }
        }
      });

      const profile: DNAProfile = JSON.parse(text);


      // Lock this DNA version with the batch it was derived from
      setDna(profile);


      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          current_dna_version: qualifiedVersion,
          current_archetype: profile.archetype,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      const { error: historyError } = await supabase
        .from('style_dna_history')
        .upsert(
          {
            user_id: user.id,
            dna_version: qualifiedVersion,
            archetype: profile.archetype,
            dna_payload: profile,
            streak_start_date: streakWindowStart.toISOString().split('T')[0],
            streak_end_date: streakWindowEnd.toISOString().split('T')[0],
            top_outfit_ids: dnaBatchOutfits.map(o => o.id_uuid),
          },
          {
            onConflict: 'user_id,dna_version',
          }
        );

      if (historyError) {
        console.error('Style DNA history upsert failed:', historyError);
      }


    } catch (err) {
      console.error("DNA Generation Error:", err);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-classik-beige flex flex-col items-center justify-center p-6 text-center font-manrope">
        <div className="w-8 h-8 border-2 border-classik-dark/10 border-t-classik-dark rounded-full animate-spin mb-4" />
        <p className="text-classik-taupe text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          Loading Style DNA...
        </p>
      </div>
    );
  }

  const isUnlocked = streakDays >= BATCH_SIZE;

  // STATE 1: Not enough outfits - show progress
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-classik-beige flex flex-col items-center justify-center p-8 text-center font-manrope">
        <div className="w-16 h-16 bg-classik-dark/5 rounded-full flex items-center justify-center mb-6">
          <Fingerprint size={24} className="text-classik-dark/30" strokeWidth={2.2} />
        </div>

        <h2 className="text-xl font-black text-classik-black mb-2">
          Style DNA Is Forming
        </h2>

        <p className="text-classik-taupe text-sm leading-relaxed max-w-[260px] font-medium opacity-70 mb-6">
          Your style identity unlocks after a {BATCH_SIZE}-day consistency streak.
        </p>

        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-classik-dark/50 mb-3">
          Day {streakDays} of {BATCH_SIZE}
        </span>

        <div className="w-[220px] h-[6px] bg-classik-dark/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-classik-dark transition-all duration-500"
            style={{ width: `${(streakDays / BATCH_SIZE) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // STATE 2: Generating DNA - show spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-classik-beige flex flex-col items-center justify-center p-6 text-center font-manrope">
        <div className="w-8 h-8 border-2 border-classik-dark/10 border-t-classik-dark rounded-full animate-spin mb-4" />
        <p className="text-classik-taupe text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          Mapping your style DNA...
        </p>
      </div>
    );
  }

  // STATE 3: Display DNA profile (using dnaBatchOutfits for marquee)
  return (
    <div className="min-h-screen bg-classik-beige text-classik-black font-manrope selection:bg-classik-dark/10 overflow-x-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 50s linear infinite;
        }
      `}</style>

      {availableDNAVersions.length > 1 && (
        <div className="flex justify-center gap-2 mb-8">
          {availableDNAVersions.map(v => (
            <button
              key={v}
              onClick={() => loadDNAVersion(v)}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full
          ${v === currentDNAVersion
                  ? 'bg-classik-dark text-classik-beige'
                  : 'bg-classik-dark/10 text-classik-dark'
                }`}
            >
              DNA v{v}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-md mx-auto px-6 py-16 flex flex-col gap-20">
        {/* 1. STYLE ARCHETYPE */}
        <section className="animate-fade-in text-center space-y-4 pt-4">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/20 block">Archetype</span>
          <h1 className="text-4xl font-black tracking-tighter leading-none text-classik-black uppercase">
            {dna?.archetype || "Analyzing..."}
          </h1>
          <p className="text-sm font-medium leading-relaxed max-w-xs mx-auto" style={{ color: '#50311d' }}>
            {dna?.description || "Curating your style profile based on your best looks."}
          </p>
        </section>

        {/* 2. TOP 5 OUTFITS - GLASSMORPHIC FLOATING STRIP (from dnaBatchOutfits) */}
        <section className="relative -mx-6 overflow-hidden py-4 pointer-events-none">
          <div className="flex w-fit animate-marquee">
            {[...dnaBatchOutfits, ...dnaBatchOutfits, ...dnaBatchOutfits, ...dnaBatchOutfits].map((outfit, idx) => (
              <div
                key={`${outfit.id_uuid}-${idx}`}
                className="w-[200px] shrink-0 mx-4 bg-white/15 backdrop-blur-xl border border-white/20 rounded-[32px] p-2 shadow-sm"
              >
                <img
                  src={outfit.image_url}
                  alt=""
                  className="w-full aspect-[3/4] object-cover rounded-[24px]"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 3. EDITOR'S PERSPECTIVE */}
        {dna && (
          <section className="bg-white/40 border border-white/60 rounded-[40px] p-8 shadow-sm animate-fade-in" style={{ animationDelay: '200ms' }}>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-classik-dark/30 block mb-4">Perspective</span>
            <p className="text-base font-medium leading-relaxed text-classik-black/80">
              {dna.editorsPerspective}
            </p>
          </section>
        )}

        {/* 4. SIGNATURE PALETTE - GLASSMORPHIC MARQUEE (derived from dnaBatchOutfits) */}
        {dna && (
          <section className="space-y-10">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/20 text-center block">Signature Palette</span>
            <div className="relative -mx-6 overflow-hidden py-4 pointer-events-none">
              <div className="flex w-fit animate-marquee">
                {[...(dna.signaturePalette || []), ...(dna.signaturePalette || []), ...(dna.signaturePalette || [])].map((color, idx) => (
                  <div
                    key={`${color.name}-${idx}`}
                    className="w-[240px] shrink-0 mx-4 bg-white/15 backdrop-blur-xl border border-white/30 rounded-[48px] p-10 flex flex-col items-center text-center gap-8 shadow-sm"
                  >
                    <div
                      className="w-24 h-24 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] border border-white/20"
                      style={{
                        backgroundColor: ensureVisibleColor(color.hex)
                      }}
                    />
                    <div className="space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-[0.15em] leading-tight text-classik-black">
                        {color.name}
                      </h4>
                      <p className="text-[11px] font-medium text-classik-taupe leading-relaxed tracking-tight line-clamp-2">
                        {color.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. SILHOUETTE & FIT */}
        {dna && (
          <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="bg-classik-dark/5 border border-classik-dark/5 rounded-[40px] p-8 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-classik-dark/40 block">Silhouette & Fit</span>
              <p className="text-lg font-bold tracking-tight text-classik-black leading-snug">
                {dna.silhouetteAndFit}
              </p>
            </div>
          </section>
        )}

        {/* 6. WHERE YOUR STYLE WORKS BEST */}
        {dna && (
          <section className="text-center animate-fade-in px-4" style={{ animationDelay: '600ms' }}>
            <p className="text-sm font-medium leading-relaxed text-classik-taupe italic">
              {dna.whereItWorksBest}
            </p>
          </section>
        )}

        {/* 7. EVOLUTION NOTE */}
        <footer className="pt-8 text-center animate-fade-in" style={{ animationDelay: '800ms' }}>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-classik-black/10">
            Your Style DNA updates every {BATCH_SIZE} consecutive days
          </p>
        </footer>
      </div>
    </div>
  );
};