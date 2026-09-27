import { useEffect, useState } from 'react'

export interface ForecastDay {
  day: string
  icon: 'sun' | 'cloud' | 'partly' | 'rain' | 'storm' | 'snow' | 'fog'
  maxTemp: number
  minTemp: number
}

export interface WeatherData {
  temperature: number
  condition: string
  icon: 'sun' | 'cloud' | 'partly' | 'rain' | 'storm' | 'snow' | 'fog'
  location?: string
  highTemp?: number
  lowTemp?: number
  humidity?: number
  windSpeed?: string
  feelsLike?: number
  forecast?: ForecastDay[]
  fetchedAt: number
}

function mapWeatherCode(code: number): { condition: string; icon: WeatherData['icon'] } {
  if (code === 0) return { condition: 'Clear', icon: 'sun' }
  if (code === 1 || code === 2) return { condition: 'Partly Cloudy', icon: 'partly' }
  if (code === 3) return { condition: 'Cloudy', icon: 'cloud' }
  if (code >= 45 && code <= 48) return { condition: 'Fog', icon: 'fog' }
  if (code >= 51 && code <= 67) return { condition: 'Rain', icon: 'rain' }
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: 'snow' }
  if (code >= 80 && code <= 82) return { condition: 'Showers', icon: 'rain' }
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: 'storm' }
  return { condition: 'Clear', icon: 'sun' }
}

export function useWeather(): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    let mounted = true

    // Load initial cached weather from store
    window.bridge
      ?.invoke<WeatherData | null>('store:get', 'weatherCache')
      .then((cached) => {
        if (mounted && cached && typeof cached.temperature === 'number' && !isNaN(cached.temperature)) {
          setWeather(cached)
        }
      })
      .catch(() => {})

    const fetchWeather = async () => {
      try {
        let lat = 17.385 // Default fallback latitude (Hyderabad)
        let lon = 78.4866 // Default fallback longitude
        let city = 'Hyderabad'

        // 1. Try IP Geolocation (non-hardcoded)
        try {
          const geoRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) })
          if (geoRes.ok) {
            const geo = await geoRes.json()
            if (typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
              lat = geo.latitude
              lon = geo.longitude
              city = geo.city || city
            }
          }
        } catch {
          // Geo IP fallback silently fails
        }

        // 2. Fetch current & 5-day daily forecast from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
        const res = await fetch(weatherUrl, { signal: AbortSignal.timeout(6000) })
        if (!res.ok) return

        const data = await res.json()
        if (data && data.current_weather && typeof data.current_weather.temperature === 'number') {
          const temp = Math.round(data.current_weather.temperature)
          const code = data.current_weather.weathercode ?? 0
          const { condition, icon } = mapWeatherCode(code)

          let highTemp: number | undefined
          let lowTemp: number | undefined
          let forecast: ForecastDay[] | undefined

          if (data.daily && Array.isArray(data.daily.time)) {
            highTemp = Math.round(data.daily.temperature_2m_max[0] ?? temp)
            lowTemp = Math.round(data.daily.temperature_2m_min[0] ?? temp - 5)

            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            forecast = data.daily.time.slice(1, 5).map((tStr: string, idx: number) => {
              const dObj = new Date(tStr)
              const dName = dayNames[dObj.getDay()] || 'Day'
              const dCode = data.daily.weathercode[idx + 1] ?? 0
              const { icon: dIcon } = mapWeatherCode(dCode)
              return {
                day: dName,
                icon: dIcon,
                maxTemp: Math.round(data.daily.temperature_2m_max[idx + 1] ?? temp),
                minTemp: Math.round(data.daily.temperature_2m_min[idx + 1] ?? temp - 4),
              }
            })
          }

          const fresh: WeatherData = {
            temperature: temp,
            condition,
            icon,
            location: city,
            highTemp,
            lowTemp,
            forecast,
            fetchedAt: Date.now(),
          }

          if (mounted) {
            setWeather(fresh)
            void window.bridge?.invoke('store:set', 'weatherCache', fresh)
          }
        }
      } catch {
        // Network failure keeps displaying last successful cached value
      }
    }

    fetchWeather()
    // Refresh interval: 45 minutes
    const id = setInterval(fetchWeather, 45 * 60 * 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return weather
}
