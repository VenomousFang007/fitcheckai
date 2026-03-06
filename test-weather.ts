// @ts-nocheck
import { generateWeatherStyleNote } from './utils/weatherHelper';

const outfit = { coverage: 'light', layering: 'single', fabricWeight: 'light' };

console.log("TEST 1: Missing both");
console.log(generateWeatherStyleNote(outfit, { intent: 'now' }, 80));

console.log("\nTEST 2: Has current conditions, no forecast");
console.log(generateWeatherStyleNote(outfit, { 
  intent: 'now', 
  currentConditions: { temp: 25, condition: 'Sunny', icon: '', label: '' } 
}, 80));

console.log("\nTEST 3: Has forecast, no current conditions");
console.log(generateWeatherStyleNote(outfit, { 
  intent: 'now', 
  currentConditions: null,
  relevantForecast: {
    morning: { temp: 15, condition: 'Rain' },
    afternoon: { temp: 22, condition: 'Cloudy' },
    evening: null,
    night: null
  }
}, 80));

console.log("\nTEST 4: Has both");
console.log(generateWeatherStyleNote(outfit, { 
  intent: 'now', 
  currentConditions: { temp: 20, condition: 'Clear', icon: '', label: '' },
  relevantForecast: {
    morning: { temp: 18, condition: 'Clear' },
    afternoon: { temp: 26, condition: 'Sunny' },
    evening: null,
    night: null
  }
}, 80));
