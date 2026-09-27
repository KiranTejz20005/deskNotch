import React from 'react'
import { Sun, Cloud, CloudSun, CloudRain, CloudLightning, Snowflake, CloudFog, MapPin, Droplets, Wind, Thermometer } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useWeather, WeatherData, ForecastDay } from '../../hooks/useWeather'

export const WEATHER_WIDTH = FEATURE_CARD_WIDTH

function WeatherIcon({ icon, size = 20, color }: { icon: WeatherData['icon']; size?: number; color?: string }) {
  switch (icon) {
    case 'sun':
      return <Sun size={size} style={{ color: color || '#facc15' }} />
    case 'cloud':
      return <Cloud size={size} className="text-white/70" />
    case 'partly':
      return <CloudSun size={size} style={{ color: color || '#fde047' }} />
    case 'rain':
      return <CloudRain size={size} className="text-sky-400" />
    case 'storm':
      return <CloudLightning size={size} className="text-amber-400" />
    case 'snow':
      return <Snowflake size={size} className="text-cyan-200" />
    case 'fog':
      return <CloudFog size={size} className="text-white/50" />
    default:
      return <Sun size={size} style={{ color: color || '#facc15' }} />
  }
}

export const WeatherTile: React.FC<{ accent: string }> = ({ accent }) => {
  const weather = useWeather()

  if (!weather) {
    return (
      <FeatureCard title="Weather" icon={<Sun size={15} />} accent={accent}>
        <div className="flex flex-1 flex-col items-center justify-center text-center text-white/50 text-[13px]">
          Loading weather forecast...
        </div>
      </FeatureCard>
    )
  }

  return (
    <FeatureCard
      title="Weather"
      icon={<Sun size={15} />}
      accent={accent}
      action={
        <div className="flex items-center gap-1 text-[12px] font-medium text-white/70">
          <MapPin size={12} className="text-white/50" />
          <span>{weather.location || 'Local Weather'}</span>
        </div>
      }
    >
      <div className="flex flex-1 flex-col justify-between py-1">
        {/* Main Current Weather Display */}
        <div className="flex items-center justify-between px-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[38px] font-black leading-none tracking-tight text-white tabular-nums">
                {weather.temperature}°
              </span>
              <span className="text-[16px] font-bold text-white/80">
                {weather.condition}
              </span>
            </div>
            {weather.highTemp !== undefined && weather.lowTemp !== undefined && (
              <div className="flex items-center gap-3 text-[13px] font-semibold text-white/50 mt-1">
                <span>H: {weather.highTemp}°</span>
                <span>L: {weather.lowTemp}°</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/10 shadow-sm">
            <WeatherIcon icon={weather.icon} size={36} color={accent} />
          </div>
        </div>

        {/* 4-Day Forecast Grid */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="w-full pt-3 border-t border-white/[0.08] my-2">
            <div className="grid grid-cols-4 gap-2">
              {weather.forecast.map((f: ForecastDay, idx: number) => (
                <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.04] text-center">
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">{f.day}</span>
                  <div className="my-1">
                    <WeatherIcon icon={f.icon} size={18} />
                  </div>
                  <span className="text-[13px] font-extrabold text-white tabular-nums">{f.maxTemp}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supporting Secondary Info Bar */}
        <div className="flex items-center justify-around pt-2 text-[12px] font-medium text-white/50 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <Droplets size={12} className="text-sky-400" />
            <span>Humidity: {weather.humidity ?? 65}%</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Wind size={12} className="text-teal-400" />
            <span>Wind: {weather.windSpeed ?? '12 km/h'}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Thermometer size={12} className="text-amber-400" />
            <span>Feels: {weather.feelsLike ?? weather.temperature}°</span>
          </div>
        </div>
      </div>
    </FeatureCard>
  )
}
