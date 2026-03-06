import type { WeatherContext } from '../types';

export interface OutfitWeatherProfile {
  coverage: 'light' | 'medium' | 'heavy';
  layering: 'single' | 'layered' | 'heavy-layered';
  fabricWeight: 'light' | 'mid' | 'heavy';
}

export interface WeatherStyleNote {
  condition: string;
  summary: string;
}

export function generateWeatherStyleNote(
  outfitProfile: OutfitWeatherProfile,
  weatherContext: WeatherContext,
  score: number
): WeatherStyleNote {

  const forecast = weatherContext?.relevantForecast;
  const currentTemp = weatherContext?.currentConditions?.temp ?? null;
  const currentCond = weatherContext?.currentConditions?.condition ?? 'unknown';

  if (!forecast) {
    return generateCurrentConditionNote(
      outfitProfile,
      currentTemp,
      currentCond,
      score
    );
  }

  const segments = ['morning', 'afternoon', 'evening', 'night'] as const;

  let temps: number[] = [];
  let rainDetected = false;
  let stormDetected = false;

  segments.forEach((time) => {
    const segment = forecast[time];
    if (!segment) return;

    temps.push(segment.temp);

    const condition = segment.condition?.toLowerCase() || '';

    if (condition.includes('storm') || condition.includes('thunder')) {
      stormDetected = true;
    }

    if (condition.includes('rain') || condition.includes('drizzle')) {
      rainDetected = true;
    }
  });

  if (temps.length === 0) {
    if (currentTemp === null) {
      return {
        condition: 'unknown',
        summary: 'Weather forecasts are currently unavailable. Dress comfortably for your environment.'
      };
    }
    return generateCurrentConditionNote(
      outfitProfile,
      currentTemp,
      currentCond,
      score
    );
  }

  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempSwing = maxTemp - minTemp;

  let summary = "";

  // Severe condition check first
  if (stormDetected) {
    summary = `Storm conditions are expected at some point today. Protective layers may improve comfort.`;
  }

  // Rain check
  else if (rainDetected) {
    summary = `Rain is expected later today. Fabric choice and footwear may affect comfort.`;
  }

  // Large temperature swing
  else if (tempSwing >= 8) {
    if (outfitProfile.layering === 'single') {
      summary = `Temperatures will range from ${minTemp}°C to ${maxTemp}°C today. A single-layer outfit limits flexibility as conditions shift.`;
    } else {
      summary = `Temperatures will range from ${minTemp}°C to ${maxTemp}°C today. The layering allows flexibility throughout the day.`;
    }
  }

  // Stable day
  else {
    summary = `Conditions remain relatively stable today (${minTemp}–${maxTemp}°C). The outfit should perform consistently.`;
  }


  if (score < 50) {
    summary = `Even if weather allows, the overall look needs refinement. ${summary}`;
  }

  return {
    condition: currentCond !== 'unknown' ? currentCond : (stormDetected ? 'storm' : (rainDetected ? 'rain' : 'stable')),
    summary
  };
}

function generateCurrentConditionNote(
  outfit: OutfitWeatherProfile,
  temp: number | null,
  condition: string,
  score: number
): WeatherStyleNote {
  if (temp === null || temp === undefined) {
    return {
      condition: condition?.toLowerCase() || 'unknown',
      summary: 'Current temperature data is unavailable. Dress comfortably for your environment.'
    };
  }

  const conditionLower = condition.toLowerCase();
  let advice = '';

  // Heat scenarios
  if (temp >= 34) {
    if (outfit.coverage === 'heavy' || outfit.layering === 'heavy-layered') {
      advice = `Very hot conditions (${temp}°C). Heavy coverage may trap heat—lighter fabrics recommended.`;
    } else {
      advice = `Very hot conditions (${temp}°C). Lightweight coverage suits current heat well.`;
    }
  } else if (temp >= 28) {
    if (outfit.fabricWeight === 'heavy') {
      advice = `Warm conditions (${temp}°C). Heavy fabrics may feel uncomfortable—breathable materials preferred.`;
    } else {
      advice = `Warm conditions (${temp}°C). Current fabric weight allows good heat management.`;
    }
  }

  // Cold scenarios
  else if (temp < 10) {
    if (outfit.coverage === 'light' || outfit.layering === 'single') {
      advice = `Cold conditions (${temp}°C). Light coverage requires additional layering for warmth.`;
    } else {
      advice = `Cold conditions (${temp}°C). Layered structure provides good insulation.`;
    }
  } else if (temp < 18) {
    if (outfit.layering === 'single') {
      advice = `Cool conditions (${temp}°C). Light layering could improve comfort.`;
    } else {
      advice = `Cool conditions (${temp}°C). Current layering approach is appropriate.`;
    }
  }

  // Rain
  else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    if (outfit.fabricWeight === 'light') {
      advice = `Rain expected. Lightweight fabrics may absorb moisture—consider water-resistant protection.`;
    } else {
      advice = `Rain expected. Water-resistant outerwear or umbrella recommended.`;
    }
  }

  // Moderate
  else {
    advice = `Moderate conditions (${temp}°C). Outfit performs well in current weather.`;
  }

  if (score < 50) {
    advice = `Even if weather allows, the overall look needs refinement. ${advice}`;
  }

  return {
    condition: conditionLower,
    summary: advice
  };
}