// utils/weatherHelper.ts
function generateWeatherStyleNote(outfitProfile, weatherContext, score) {
  const forecast = weatherContext?.relevantForecast;
  const currentTemp = weatherContext?.currentConditions?.temp ?? null;
  const currentCond = weatherContext?.currentConditions?.condition ?? "unknown";
  if (!forecast) {
    if (currentTemp === null) {
      return {
        condition: "unknown",
        summary: "Weather conditions are currently unavailable. Dress comfortably for your environment."
      };
    }
    return generateCurrentConditionNote(
      outfitProfile,
      currentTemp,
      currentCond,
      score
    );
  }
  const segments = ["morning", "afternoon", "evening", "night"];
  let temps = [];
  let rainDetected = false;
  let stormDetected = false;
  segments.forEach((time) => {
    const segment = forecast[time];
    if (!segment) return;
    temps.push(segment.temp);
    const condition = segment.condition?.toLowerCase() || "";
    if (condition.includes("storm") || condition.includes("thunder")) {
      stormDetected = true;
    }
    if (condition.includes("rain") || condition.includes("drizzle")) {
      rainDetected = true;
    }
  });
  if (temps.length === 0) {
    if (currentTemp === null) {
      return {
        condition: "unknown",
        summary: "Weather forecasts are currently unavailable. Dress comfortably for your environment."
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
  if (stormDetected) {
    summary = `Storm conditions are expected at some point today. Protective layers may improve comfort.`;
  } else if (rainDetected) {
    summary = `Rain is expected later today. Fabric choice and footwear may affect comfort.`;
  } else if (tempSwing >= 8) {
    if (outfitProfile.layering === "single") {
      summary = `Temperatures will range from ${minTemp}\xB0C to ${maxTemp}\xB0C today. A single-layer outfit limits flexibility as conditions shift.`;
    } else {
      summary = `Temperatures will range from ${minTemp}\xB0C to ${maxTemp}\xB0C today. The layering allows flexibility throughout the day.`;
    }
  } else {
    summary = `Conditions remain relatively stable today (${minTemp}\u2013${maxTemp}\xB0C). The outfit should perform consistently.`;
  }
  if (score < 50) {
    summary = `Even if weather allows, the overall look needs refinement. ${summary}`;
  }
  return {
    condition: currentCond !== "unknown" ? currentCond : stormDetected ? "storm" : rainDetected ? "rain" : "stable",
    summary
  };
}
function generateCurrentConditionNote(outfit2, temp, condition, score) {
  const conditionLower = condition.toLowerCase();
  let advice = "";
  if (temp >= 34) {
    if (outfit2.coverage === "heavy" || outfit2.layering === "heavy-layered") {
      advice = `Very hot conditions (${temp}\xB0C). Heavy coverage may trap heat\u2014lighter fabrics recommended.`;
    } else {
      advice = `Very hot conditions (${temp}\xB0C). Lightweight coverage suits current heat well.`;
    }
  } else if (temp >= 28) {
    if (outfit2.fabricWeight === "heavy") {
      advice = `Warm conditions (${temp}\xB0C). Heavy fabrics may feel uncomfortable\u2014breathable materials preferred.`;
    } else {
      advice = `Warm conditions (${temp}\xB0C). Current fabric weight allows good heat management.`;
    }
  } else if (temp < 10) {
    if (outfit2.coverage === "light" || outfit2.layering === "single") {
      advice = `Cold conditions (${temp}\xB0C). Light coverage requires additional layering for warmth.`;
    } else {
      advice = `Cold conditions (${temp}\xB0C). Layered structure provides good insulation.`;
    }
  } else if (temp < 18) {
    if (outfit2.layering === "single") {
      advice = `Cool conditions (${temp}\xB0C). Light layering could improve comfort.`;
    } else {
      advice = `Cool conditions (${temp}\xB0C). Current layering approach is appropriate.`;
    }
  } else if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
    if (outfit2.fabricWeight === "light") {
      advice = `Rain expected. Lightweight fabrics may absorb moisture\u2014consider water-resistant protection.`;
    } else {
      advice = `Rain expected. Water-resistant outerwear or umbrella recommended.`;
    }
  } else {
    advice = `Moderate conditions (${temp}\xB0C). Outfit performs well in current weather.`;
  }
  if (score < 50) {
    advice = `Even if weather allows, the overall look needs refinement. ${advice}`;
  }
  return {
    condition: conditionLower,
    summary: advice
  };
}

// test-weather.ts
var outfit = { coverage: "light", layering: "single", fabricWeight: "light" };
console.log("TEST 1: Missing both");
console.log(generateWeatherStyleNote(outfit, { intent: "now" }, 80));
console.log("\nTEST 2: Has current conditions, no forecast");
console.log(generateWeatherStyleNote(outfit, {
  intent: "now",
  currentConditions: { temp: 25, condition: "Sunny", icon: "", label: "" }
}, 80));
console.log("\nTEST 3: Has forecast, no current conditions");
console.log(generateWeatherStyleNote(outfit, {
  intent: "now",
  currentConditions: null,
  relevantForecast: {
    morning: { temp: 15, condition: "Rain" },
    afternoon: { temp: 22, condition: "Cloudy" },
    evening: null,
    night: null
  }
}, 80));
console.log("\nTEST 4: Has both");
console.log(generateWeatherStyleNote(outfit, {
  intent: "now",
  currentConditions: { temp: 20, condition: "Clear", icon: "", label: "" },
  relevantForecast: {
    morning: { temp: 18, condition: "Clear" },
    afternoon: { temp: 26, condition: "Sunny" },
    evening: null,
    night: null
  }
}, 80));
