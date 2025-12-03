// /api/weather.js
// Vercel serverless function — proxy + synthetic onecall builder

export default async function handler(req, res) {
  try {
    const API_KEY = process.env.WEATHER_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ error: "WEATHER_API_KEY not configured" });
      return;
    }

    const GEO_DIRECT = 'https://api.openweathermap.org/geo/1.0/direct';
    const GEO_REVERSE = 'https://api.openweathermap.org/geo/1.0/reverse';
    const WEATHER = 'https://api.openweathermap.org/data/2.5/weather';
    const FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';

    // Accept either ?q=city OR ?lat=...&lon=...
    const { q, lat, lon } = req.query;

    // helper fetch that throws on non-OK
    const doFetch = async (url) => {
      const r = await fetch(url);
      const text = await r.text();
      if (!r.ok) throw { status: r.status, text };
      return JSON.parse(text);
    };

    // Determine coordinates
    let latNum = lat ? Number(lat) : null;
    let lonNum = lon ? Number(lon) : null;

    if ((!latNum || !lonNum) && !q) {
      res.status(400).json({ error: "Missing 'q' or lat/lon" });
      return;
    }

    if ((!latNum || !lonNum) && q) {
      // geo direct
      const geoUrl = `${GEO_DIRECT}?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`;
      const geo = await doFetch(geoUrl);
      if (!geo || !geo[0]) {
        res.status(404).json({ error: "Location not found" });
        return;
      }
      latNum = geo[0].lat;
      lonNum = geo[0].lon;
    }

    // fetch weather & forecast in parallel
    const weatherUrl = `${WEATHER}?lat=${latNum}&lon=${lonNum}&units=metric&appid=${API_KEY}`;
    const forecastUrl = `${FORECAST}?lat=${latNum}&lon=${lonNum}&units=metric&appid=${API_KEY}`;

    const [nowJson, forecastJson] = await Promise.all([doFetch(weatherUrl), doFetch(forecastUrl)]);

    // Build synthetic onecall similar to your client buildSyntheticOneCall
    const buildSyntheticOneCall = (nowJson, forecastJson) => {
      const current = {
        dt: nowJson.dt,
        sunrise: nowJson.sys?.sunrise || null,
        sunset: nowJson.sys?.sunset || null,
        temp: nowJson.main.temp,
        feels_like: nowJson.main.feels_like,
        pressure: nowJson.main.pressure,
        humidity: nowJson.main.humidity,
        dew_point: Math.round(nowJson.main.temp - ((100 - nowJson.main.humidity) / 5)),
        clouds: nowJson.clouds?.all ?? 0,
        visibility: nowJson.visibility ?? 10000,
        wind_speed: nowJson.wind?.speed ?? 0,
        wind_deg: nowJson.wind?.deg ?? 0,
        weather: nowJson.weather || [{ id: 800, description: 'clear' }],
        uvi: Number((Math.random() * 12).toFixed(1)), // simulated UV index
        aqi: Number((Math.random() * 300).toFixed(0)), // simulated Air Quality
      };

      const list = (forecastJson.list || []).slice(0, 40);

      const hourly = [];
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        for (let k = 0; k < 3; k++) {
          if (hourly.length >= 24) break;
          const dt = it.dt + k * 3600;
          hourly.push({
            dt,
            temp: it.main.temp,
            feels_like: it.main.feels_like,
            pop: it.pop ?? 0,
            weather: it.weather || [{ id: 800, description: 'clear' }],
            wind_speed: it.wind?.speed ?? 0
          });
        }
        if (hourly.length >= 24) break;
      }
      while (hourly.length < 24) {
        const last = hourly[hourly.length - 1] || { dt: current.dt + (hourly.length + 1) * 3600, temp: current.temp, weather: current.weather };
        hourly.push({ ...last, dt: last.dt + 3600 });
      }

      const byDate = {};
      list.forEach(item => {
        const key = new Date(item.dt * 1000).toISOString().slice(0, 10);
        if (!byDate[key]) byDate[key] = { temps: [], pops: [], weathers: [], dt: item.dt };
        byDate[key].temps.push(item.main.temp);
        byDate[key].pops.push(item.pop ?? 0);
        if (item.weather && item.weather[0]) byDate[key].weathers.push(item.weather[0]);
      });

      const keys = Object.keys(byDate).slice(0, 7);
      const daily = keys.map(k => {
        const d = byDate[k];
        const temps = d.temps.length ? d.temps : [current.temp];
        const pops = d.pops.length ? d.pops : [0];
        const midWeather = d.weathers.length ? d.weathers[Math.floor(d.weathers.length / 2)] : { id: 800, description: 'clear' };
        return {
          dt: d.dt,
          temp: { max: Math.max(...temps), min: Math.min(...temps) },
          pop: Math.round((pops.reduce((a, b) => a + b, 0) / pops.length) * 100) / 100,
          weather: [midWeather]
        };
      });

      return { current, hourly, daily };
    };

    const synthetic = buildSyntheticOneCall(nowJson, forecastJson);
    // include coord & name to help client
    const result = { ...synthetic, coord: nowJson.coord, name: nowJson.name || null };
    res.status(200).json(result);
  } catch (err) {
    console.error("Function error:", err);
    if (err && err.status) {
      res.status(err.status).send(err.text || String(err));
    } else {
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
}
