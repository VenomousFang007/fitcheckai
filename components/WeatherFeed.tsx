import { useEffect, useState } from 'react';
import type { Intent, WeatherContext } from '../types';



interface WeatherFeedProps {
  intent: Intent;
  onWeatherUpdate: (data: WeatherContext) => void;
}

export const WeatherFeed = ({ intent, onWeatherUpdate }: WeatherFeedProps) => {
  const [hasFetched, setHasFetched] = useState(false);

  const getWeatherIcon = (condition: string): string => {
    if (condition.includes('clear')) return '☀️';
    if (condition.includes('cloud')) return '⛅️';
    if (condition.includes('rain') || condition.includes('drizzle')) return '🌧';
    if (condition.includes('storm') || condition.includes('thunderstorm')) return '⛈';
    if (condition.includes('snow')) return '❄️';
    if (condition.includes('wind')) return '🌬';
    return '⛅️';
  };

  const getWeatherLabel = (temp: number, condition: string): string => {
    const conditionName = condition.charAt(0).toUpperCase() + condition.slice(1);
    if (temp < 10) return `${conditionName} & Cold`;
    if (temp > 33) return `${conditionName} & Hot`;
    if (temp >= 28) return `${conditionName} & Warm`;
    if (temp >= 18) return `${conditionName} & Mild`;
    return `${conditionName} & Cool`;
  };

  const evaluateWeatherFit = (
  temp: number,
  condition: string
): { verdict: string; explanation: string } => {

  // Severe weather = instant veto
  if (
    condition.includes('storm') ||
    condition.includes('thunderstorm') ||
    condition.includes('snow')
  ) {
    return {
      verdict: 'Not ideal',
      explanation:
        'Harsh conditions nearby. Comfort and protection may matter more than styling today.'
    };
  }

  // VERY HOT
  if (temp >= 34) {
    return {
      verdict: 'Not ideal',
      explanation:
        'Intense heat. Heavy fabrics, layers, or dark materials will feel suffocating.'
    };
  }

  // HOT
  if (temp >= 28) {
    return {
      verdict: 'Mostly suitable',
      explanation:
        'Warm conditions. Breathable materials will likely feel better than structured or layered looks.'
    };
  }

  // COOL
  if (temp >= 18 && temp < 28) {
    return {
      verdict: 'Suitable',
      explanation:
        'Comfortable range. Most outfit choices should wear well without adjustment.'
    };
  }

  // COLD
  if (temp >= 10 && temp < 18) {
    return {
      verdict: 'Mostly suitable',
      explanation:
        'Cooler air. Light layering could help keep the outfit feeling balanced.'
    };
  }

  // VERY COLD
  if (temp < 10) {
    return {
      verdict: 'Not ideal',
      explanation:
        'Cold conditions. Without adequate layering, comfort may take a hit.'
    };
  }

  // Rain modifier
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return {
      verdict: 'Mostly suitable',
      explanation:
        'Rain expected. Materials and footwear choice will affect how well this outfit holds up.'
    };
  }

  // Fallback
  return {
    verdict: 'Suitable',
    explanation:
      'Conditions are neutral. Outfit performance should be stable.'
  };
};

  // Get user location using multiple methods
  const getUserLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    // Method 1: Try browser geolocation first (most accurate)
    if (navigator.geolocation) {
      try {
        console.log('📍 Trying browser geolocation...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              timeout: 5000,
              maximumAge: 300000,
              enableHighAccuracy: false
            }
          );
        });
        console.log('✅ Browser geolocation success!');
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (error) {
        console.log('⚠️ Browser geolocation failed, trying IP-based location...');
      }
    }

    // Method 2: Fallback to IP-based geolocation (works everywhere)
    try {
      console.log('🌐 Trying IP-based geolocation...');
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP geolocation failed');
      
      const data = await response.json();
      console.log('✅ IP-based geolocation success!');
      return {
        latitude: data.latitude,
        longitude: data.longitude
      };
    } catch (error) {
      console.error('❌ IP-based geolocation failed');
      throw new Error('Could not determine location');
    }
  };

  useEffect(() => {
    if (hasFetched) return;

    const fetchWeather = async () => {
      try {
        console.log('🌍 Starting weather fetch...');
        
        // Get user location (tries browser geolocation, then IP-based)
        const { latitude, longitude } = await getUserLocation();
        console.log(`✅ Location: ${latitude}, ${longitude}`);

        // Fetch weather using location
        const API_KEY = 'fe906e526c29f73cb335d8c6b3e4ee0c';
const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;
        
        console.log('🌤️ Fetching weather data...');
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Weather API error:', errorData);
          throw new Error(`Weather API failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Weather data received:', data);
        
        const today = new Date();
today.setHours(0, 0, 0, 0);

const todayForecast = data.list.filter((item: any) => {
  const forecastDate = new Date(item.dt * 1000);
  forecastDate.setHours(0, 0, 0, 0);
  return forecastDate.getTime() === today.getTime();
});

const segmentBuckets: Record<string, any[]> = {
  morning: [],
  afternoon: [],
  evening: [],
  night: []
};

todayForecast.forEach((item: any) => {
  const hour = new Date(item.dt * 1000).getHours();

  if (hour >= 6 && hour < 12) segmentBuckets.morning.push(item);
  else if (hour >= 12 && hour < 18) segmentBuckets.afternoon.push(item);
  else if (hour >= 18 && hour < 22) segmentBuckets.evening.push(item);
  else segmentBuckets.night.push(item);
});

const buildSegment = (items: any[]) => {
  if (!items.length) return null;

  const temps = items.map(i => i.main.temp);
  const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
  const condition = items[0].weather[0]?.main || 'Unknown';
  const lowerCondition = condition.toLowerCase();

  return {
    temp: avgTemp,
    condition: lowerCondition,
    icon: getWeatherIcon(lowerCondition),
    label: getWeatherLabel(avgTemp, condition)
  };
};

const segmentedWeather = {
  morning: buildSegment(segmentBuckets.morning),
  afternoon: buildSegment(segmentBuckets.afternoon),
  evening: buildSegment(segmentBuckets.evening),
  night: buildSegment(segmentBuckets.night)
};

onWeatherUpdate({
  intent,
  timeWindow: {
    label: 'Today',
    startHour: 6,
    endHour: 23,
  },
  currentConditions: segmentedWeather.morning || segmentedWeather.afternoon,
  relevantForecast: segmentedWeather as any,
  weatherNote: 'Today’s weather segmented by time of day.'
});
        
        setHasFetched(true);
        console.log('✅ Weather update complete! 🎉');

      } catch (error) {
        console.error('❌ Weather fetch error:', error);
        
        onWeatherUpdate({
  intent,
  timeWindow: {
    label: 'Today',
    startHour: 6,
    endHour: 22,
  },
  currentConditions: {
    temp: 0,
    condition: 'unknown',
    icon: '⛅️',
    label: 'Weather Fit',
  },
  relevantForecast: null,
  weatherNote: 'Weather data unavailable for your location.',
});
        
        setHasFetched(true);
      }
    };

    fetchWeather();
  }, [hasFetched, onWeatherUpdate]);

  // Returns nothing - this is a logic-only component
  return null;
};
