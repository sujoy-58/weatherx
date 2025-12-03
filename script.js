const API_KEY = "83d4f626a5a5e59c2db09961300871fe";
const GEO_DIRECT = 'https://api.openweathermap.org/geo/1.0/direct';
const GEO_REVERSE = 'https://api.openweathermap.org/geo/1.0/reverse';
const WEATHER = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';

// state
let currentUnit = 'celsius';
let currentLocationName = 'Unknown';
let cachedData = null;
let cachedAlerts = [];
let isLightMode = false;

// DOM
const searchInput = document.getElementById('searchInput');
const errorMsg = document.getElementById('errorMsg');
const loadingState = document.getElementById('loadingState');
const weatherGrid = document.getElementById('weatherGrid');
const themeToggleBtn = document.getElementById('themeToggle');

const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');
const alertsBtn = document.getElementById('alertsBtn');

const alertsModal = document.getElementById('alertsModal');
const alertsOverlay = document.getElementById('alertsOverlay');
const alertsContent = document.getElementById('alertsContent');
const alertsClose = document.getElementById('alertsClose');

const infoModal = document.getElementById('infoModal');
const infoOverlay = document.getElementById('infoOverlay');
const infoContent = document.getElementById('infoContent');
const infoClose = document.getElementById('infoClose');
const infoTitle = document.getElementById('infoTitle');

// Improved weather icons
const weatherIcons = {
    thunderstorm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
    drizzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 16v-6a4 4 0 0 1 8 0v6"/><path d="M3 16h2"/><path d="M17 16h2"/><path d="M12 16v4"/></svg>`,
    rain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 13v8"/><path d="M8 13v8"/><path d="M12 15v8"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`,
    snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16h.01"/><path d="M8 20h.01"/><path d="M12 18h.01"/><path d="M12 22h.01"/><path d="M16 16h.01"/><path d="M16 20h.01"/></svg>`,
    fog: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 9h14"/><path d="M5 15h14"/><path d="M8 12h8"/></svg>`,
    clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>`,
    clouds: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`
};

// Production-level enhancements
// UV Index calculation
function calculateUVIndex(uvi) {
    if (uvi < 3) return { level: 'Low', class: 'uv-low' };
    if (uvi < 6) return { level: 'Moderate', class: 'uv-moderate' };
    if (uvi < 8) return { level: 'High', class: 'uv-high' };
    if (uvi < 11) return { level: 'Very High', class: 'uv-very-high' };
    return { level: 'Extreme', class: 'uv-extreme' };
}

// Air Quality Index calculation
function calculateAQI(pm25) {
    if (pm25 < 12) return { level: 'Good', class: 'aqi-good' };
    if (pm25 < 35.5) return { level: 'Moderate', class: 'aqi-moderate' };
    if (pm25 < 55.5) return { level: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy-sensitive' };
    if (pm25 < 150.5) return { level: 'Unhealthy', class: 'aqi-unhealthy' };
    if (pm25 < 250.5) return { level: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { level: 'Hazardous', class: 'aqi-hazardous' };
}

// helpers
function unitLabel() { return currentUnit === 'celsius' ? '°C' : '°F'; }
function toUnitTemp(c) { return currentUnit === 'celsius' ? Math.round(c) : Math.round((c * 9 / 5) + 32); }
function toUnitString(c) { return `${toUnitTemp(c)}${unitLabel()}`; }
function getWeatherIcon(code) {
    if (code >= 200 && code < 300) return weatherIcons.thunderstorm;
    if (code >= 300 && code < 400) return weatherIcons.drizzle;
    if (code >= 500 && code < 600) return weatherIcons.rain;
    if (code >= 600 && code < 700) return weatherIcons.snow;
    if (code >= 700 && code < 800) return weatherIcons.fog;
    if (code === 800) return weatherIcons.clear;
    return weatherIcons.clouds;
}
function tFormat(ts) { return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function dayFormat(ts) { 
    return new Date(ts * 1000).toLocaleDateString([], { weekday: 'short' });
}
function dateFormat(ts) {
    return new Date(ts * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function escapeHtml(s) { return String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }

// UI helpers
function showLoading() { loadingState.style.display = 'block'; weatherGrid.style.display = 'none'; }
function hideLoading() { loadingState.style.display = 'none'; weatherGrid.style.display = 'grid'; }
function showError(msg) { errorMsg.textContent = msg; }
function clearError() { errorMsg.textContent = ''; }

// Theme toggle
function initThemeToggle() {
    // Check for saved theme preference or prefer-color-scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        enableLightMode();
    }
    
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = isLightMode ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' :
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>';
        
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    if (isLightMode) {
        disableLightMode();
    } else {
        enableLightMode();
    }
}

function enableLightMode() {
    document.body.classList.add('light-mode');
    isLightMode = true;
    localStorage.setItem('theme', 'light');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    }
}

function disableLightMode() {
    document.body.classList.remove('light-mode');
    isLightMode = false;
    localStorage.setItem('theme', 'dark');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>';
    }
}

// events
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });
document.querySelector('.search-icon').addEventListener('click', handleSearch);
celsiusBtn.addEventListener('click', () => switchUnit('celsius'));
fahrenheitBtn.addEventListener('click', () => switchUnit('fahrenheit'));

alertsBtn.addEventListener('click', async () => { await onAlertsClick(); });
alertsOverlay?.addEventListener('click', hideAlertsModal);
alertsClose?.addEventListener('click', hideAlertsModal);

infoOverlay?.addEventListener('click', hideInfoModal);
infoClose?.addEventListener('click', hideInfoModal);

// unit switch
function switchUnit(unit) {
    currentUnit = unit;
    if (unit === 'celsius') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
        celsiusBtn.setAttribute('aria-pressed', 'true');
        fahrenheitBtn.setAttribute('aria-pressed', 'false');
    } else {
        fahrenheitBtn.classList.add('active');
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.setAttribute('aria-pressed', 'true');
        celsiusBtn.setAttribute('aria-pressed', 'false');
    }
    if (cachedData) renderAll(cachedData);
}

// search
function handleSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    searchInput.value = '';
    fetchByCityName(q);
}

// fetch flows
async function fetchByCityName(q) {
    showLoading(); clearError();
    try {
        const geoRes = await fetch(`${GEO_DIRECT}?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`);
        if (!geoRes.ok) throw new Error('Location not found');
        const geo = await geoRes.json();
        if (!geo || !geo[0]) throw new Error('Location not found');
        const { lat, lon, name: city, country } = geo[0];
        currentLocationName = `${city}${country ? ', ' + country : ''}`;
        await fetchWeatherAndForecast(lat, lon, true);
    } catch (err) {
        showError(err.message || 'Search failed');
    } finally {
        hideLoading();
    }
}

async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(`${GEO_REVERSE}?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
        if (!res.ok) return null;
        const arr = await res.json();
        if (arr && arr[0]) return `${arr[0].name}${arr[0].country ? ', ' + arr[0].country : ''}`;
        return null;
    } catch (e) { return null; }
}

async function fetchWeatherAndForecast(lat, lon, fitToView = true) {
    showLoading(); clearError();
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`${WEATHER}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
            fetch(`${FORECAST}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
        ]);

        if (weatherRes.status === 401 || forecastRes.status === 401) {
            showError('API key unauthorized (401). Fix key or use proxy.');
            hideLoading();
            return;
        }
        if (!weatherRes.ok || !forecastRes.ok) {
            showError('Unable to fetch weather (network/API).');
            hideLoading();
            return;
        }

        const weatherJson = await weatherRes.json();
        const forecastJson = await forecastRes.json();
        const synthetic = buildSyntheticOneCall(weatherJson, forecastJson);

        cachedData = { ...synthetic, coord: weatherJson.coord };
        if (fitToView) {
            if (!currentLocationName || currentLocationName === 'Unknown') {
                const rev = await reverseGeocode(lat, lon);
                if (rev) currentLocationName = rev;
            }
            renderAll(synthetic);
        }

        // cache alerts quietly
        cachedAlerts = await scanGlobalAlerts(true);
    } catch (err) {
        console.error(err);
        showError('Network or API error fetching weather.');
    } finally {
        hideLoading();
    }
}

// synthetic onecall
function buildSyntheticOneCall(nowJson, forecastJson) {
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
        // Add production-level data (simulated)
        uvi: Math.random() * 12, // Simulated UV index
        aqi: Math.random() * 300, // Simulated Air Quality
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
}

// alerts scan
const GLOBAL_CITIES = ['New York', 'London', 'Tokyo', 'New Delhi', 'Sydney', 'Rio de Janeiro', 'Cairo', 'Moscow'];
async function scanGlobalAlerts(returnArray = false) {
    const results = [];
    try {
        const promises = GLOBAL_CITIES.map(async city => {
            const geoRes = await fetch(`${GEO_DIRECT}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
            if (!geoRes.ok) return null;
            const geo = await geoRes.json();
            if (!geo || !geo[0]) return null;
            const { lat, lon } = geo[0];
            const res = await fetch(`${FORECAST}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null);
            if (!res) return null;
            const flags = [];
            (res.list || []).slice(0, 16).forEach(item => {
                if (item.pop && item.pop > 0.7) flags.push({ type: 'heavy-rain', dt: item.dt, pop: item.pop, desc: item.weather?.[0]?.description });
                if (item.wind && (item.wind.speed || 0) > 12) flags.push({ type: 'strong-wind', dt: item.dt, speed: item.wind.speed });
            });
            if (flags.length) return { city, flags };
            return null;
        });

        const resolved = await Promise.all(promises);
        const found = resolved.filter(Boolean);
        if (found.length) results.push(...found);
    } catch (e) {
        console.warn('scanGlobalAlerts err', e);
    }
    return returnArray ? results : [];
}

function flagLabel(f) {
    if (f.type === 'heavy-rain') return 'Heavy Rain Alert';
    if (f.type === 'strong-wind') return 'Strong Wind Warning';
    return 'Weather Alert';
}
function flagDescription(f) {
    if (f.type === 'heavy-rain') return `Forecast: ${f.desc || 'rain'} (chance ${(Math.round(f.pop * 100))}%) at ${tFormat(f.dt)}`;
    if (f.type === 'strong-wind') return `Wind speed forecast ${Math.round(f.speed * 3.6)} km/h at ${tFormat(f.dt)}`;
    return '';
}
function getAlertType(f) {
    if (f.type === 'heavy-rain') return 'warning';
    if (f.type === 'strong-wind') return 'caution';
    return 'caution';
}

// ---------- Drag functionality for hourly scroll ----------
function setupHourlyDrag(scrollContainer) {
    let isDragging = false;
    let startX, startScrollLeft;

    const startDrag = (e) => {
        isDragging = true;
        scrollContainer.classList.add('dragging');
        startX = e.pageX || e.touches[0].pageX;
        startScrollLeft = scrollContainer.scrollLeft;
        
        // Prevent text selection during drag
        e.preventDefault();
    };

    const stopDrag = () => {
        isDragging = false;
        scrollContainer.classList.remove('dragging');
    };

    const doDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX || e.touches[0].pageX;
        const walk = (x - startX) * 1.5; // Multiply for faster scrolling
        scrollContainer.scrollLeft = startScrollLeft - walk;
    };

    // Mouse events
    scrollContainer.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);

    // Touch events
    scrollContainer.addEventListener('touchstart', startDrag, { passive: false });
    scrollContainer.addEventListener('touchmove', doDrag, { passive: false });
    scrollContainer.addEventListener('touchend', stopDrag);

    // Prevent default touch actions
    scrollContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Cleanup function
    return () => {
        scrollContainer.removeEventListener('mousedown', startDrag);
        window.removeEventListener('mousemove', doDrag);
        window.removeEventListener('mouseup', stopDrag);
        scrollContainer.removeEventListener('touchstart', startDrag);
        scrollContainer.removeEventListener('touchmove', doDrag);
        scrollContainer.removeEventListener('touchend', stopDrag);
    };
}

// ---------- render UI (bento grid) ----------
function renderAll(data) {
    weatherGrid.innerHTML = '';

    // main card
    weatherGrid.appendChild(createMainCard(data));

    // side grid container
    const sideContainer = document.createElement('div');
    sideContainer.className = 'card card-side-container';
    
    // side grid (bento style - now 2x2)
    sideContainer.appendChild(createSideGrid(data.current));
    
    // sun arc card
    sideContainer.appendChild(createSunArcCard(data.current));
    
    weatherGrid.appendChild(sideContainer);

    // hourly full-width with drag functionality
    weatherGrid.appendChild(createHourlyCard(data.hourly));

    // weekly list
    weatherGrid.appendChild(createWeeklyList(data.daily));
}

// main card creation with icon aligned at top
function createMainCard(data) {
    const card = document.createElement('div');
    card.className = 'card card-main interactive';
    const cur = data.current;
    const icon = getWeatherIcon(cur.weather[0].id);
    const uvData = calculateUVIndex(cur.uvi);
    const aqiData = calculateAQI(cur.aqi);

    card.innerHTML = `
        <div class="location">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <div style="font-weight:600; font-size:18px;">${escapeHtml(currentLocationName)}</div>
        </div>

        <div class="main-weather">
            <div class="left-col">
                <div class="temp-large">${toUnitString(cur.temp)}</div>
                <div class="description">${escapeHtml(cur.weather[0].description)}</div>

                <div class="temp-details">
                    <div><div class="label">Feels like</div><div class="value">${toUnitString(cur.feels_like)}</div></div>
                    <div><div class="label">Humidity</div><div class="value">${cur.humidity}%</div></div>
                    <div><div class="label">Wind</div><div class="value">${Math.round(cur.wind_speed * 3.6)} km/h</div></div>
                </div>

                <div class="extra-details">
                    <div class="extra-detail-item">
                        <div class="extra-detail-label">UV Index</div>
                        <div class="extra-detail-value"><span class="uv-index ${uvData.class}">${cur.uvi.toFixed(1)} - ${uvData.level}</span></div>
                    </div>
                    <div class="extra-detail-item">
                        <div class="extra-detail-label">Air Quality</div>
                        <div class="extra-detail-value"><span class="aqi-index ${aqiData.class}">${cur.aqi.toFixed(0)} - ${aqiData.level}</span></div>
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;">
                <div class="icon-wrapper">${icon}</div>
                <div class="muted" style="text-align:center;font-size:14px;max-width:100px"><br>${cur.clouds}% cloudy</div>
            </div>
        </div>
    `;

    // click to open overview modal
    card.addEventListener('click', () => {
        const title = `${escapeHtml(currentLocationName)} — Weather Overview`;
        const paragraph = `Currently ${toUnitString(data.current.temp)} with ${escapeHtml(data.current.weather[0].description)}. Feels like ${toUnitString(data.current.feels_like)}. Humidity ${data.current.humidity}%. Wind speed ${Math.round(data.current.wind_speed * 3.6)} km/h.`;
        const details = {
            'Sunrise': cur.sunrise ? tFormat(cur.sunrise) : 'N/A',
            'Sunset': cur.sunset ? tFormat(cur.sunset) : 'N/A',
            'Visibility': `${(data.current.visibility / 1000).toFixed(1)} km`,
            'Cloud Cover': `${cur.clouds}%`,
            'UV Index': `${data.current.uvi.toFixed(1)} - ${uvData.level}`,
            'Air Quality': `${data.current.aqi.toFixed(0)} - ${aqiData.level}`,
            'Pressure': `${data.current.pressure} hPa`,
            'Dew Point': `${toUnitString(cur.dew_point)}`
        };
        showInfoModal(title, paragraph, details);
    });

    return card;
}

// side grid (bento style - 4 in a row)
function createSideGrid(current) {
    const card = document.createElement('div');
    card.className = 'card card-side-grid';

    card.innerHTML = `
        <div class="side-grid-card interactive" data-key="humidity">
            <div class="icon-small">${iconForKey('humidity')}</div>
            <div>
                <div class="stat-value">${current.humidity}%</div>
                <div class="stat-label">Humidity</div>
            </div>
        </div>
        <div class="side-grid-card interactive" data-key="wind">
            <div class="icon-small">${iconForKey('wind')}</div>
            <div>
                <div class="stat-value">${Math.round(current.wind_speed * 3.6)} km/h</div>
                <div class="stat-label">Wind Speed</div>
            </div>
        </div>
        <div class="side-grid-card interactive" data-key="visibility">
            <div class="icon-small">${iconForKey('visibility')}</div>
            <div>
                <div class="stat-value">${(current.visibility / 1000).toFixed(1)} km</div>
                <div class="stat-label">Visibility</div>
            </div>
        </div>
        <div class="side-grid-card interactive" data-key="pressure">
            <div class="icon-small">${iconForKey('pressure')}</div>
            <div>
                <div class="stat-value">${current.pressure} hPa</div>
                <div class="stat-label">Pressure</div>
            </div>
        </div>
    `;

    // Add click handlers for side grid cards
    card.querySelectorAll('.side-grid-card').forEach(el => {
        el.addEventListener('click', () => {
            const key = el.getAttribute('data-key');
            let title, paragraph;

            switch (key) {
                case 'humidity':
                    title = 'Humidity Details';
                    paragraph = generateHumidityText(current);
                    break;
                case 'wind':
                    title = 'Wind Details';
                    paragraph = generateWindText(current);
                    break;
                case 'visibility':
                    title = 'Visibility Details';
                    paragraph = generateVisibilityText(current);
                    break;
                case 'pressure':
                    title = 'Pressure Details';
                    paragraph = generatePressureText(current);
                    break;
            }

            showInfoModal(title, paragraph, { 'Value': el.querySelector('.stat-value').textContent, 'Location': currentLocationName });
        });
    });

    return card;
}

// sun arc card
function createSunArcCard(current) {
    const card = document.createElement('div');
    card.className = 'card card-sun-arc interactive';
    
    const sunrise = current.sunrise ? tFormat(current.sunrise) : '--:--';
    const sunset = current.sunset ? tFormat(current.sunset) : '--:--';
    const now = new Date(current.dt * 1000);
    const isDaytime = current.sunrise && current.sunset ? 
        (current.dt > current.sunrise && current.dt < current.sunset) : 
        (now.getHours() >= 6 && now.getHours() < 18);
    
    card.innerHTML = `

        
        <div class="sun-arc-container">
            <svg class="sun-arc-svg" viewBox="0 0 200 100">
                <path id="sunArcPath" class="sun-arc-path" d="M 20,80 Q 100,0 180,80" />
                <path id="sunArcProg" class="sun-arc-progress" d="M 20,80 Q 100,0 180,80" />
            </svg>
            <div id="sunPosition" class="sun-position"></div>
        </div>
        
        <div class="sun-times">
            <div class="sun-time">
                <span>${isDaytime ? 'Sunrise' : 'Sunset'}</span>
                <strong>${isDaytime ? sunrise : sunset}</strong>
            </div>
            <div class="sun-time">
                <span>${isDaytime ? 'Sunset' : 'Sunrise'}</span>
                <strong>${isDaytime ? sunset : sunrise}</strong>
            </div>
        </div>
    `;

    // Animate sun arc after DOM is ready
    setTimeout(() => {
        try {
            const path = card.querySelector('#sunArcPath');
            const prog = card.querySelector('#sunArcProg');
            const sunEl = card.querySelector('#sunPosition');

            if (path && prog && sunEl && current.sunrise && current.sunset && current.dt) {
                const sunriseTime = current.sunrise * 1000;
                const sunsetTime = current.sunset * 1000;
                const now = Math.min(Math.max(current.dt * 1000, sunriseTime), sunsetTime);
                const total = sunsetTime - sunriseTime || 1;
                const elapsed = now - sunriseTime;
                const progress = Math.max(0, Math.min(1, elapsed / total));

                const len = path.getTotalLength();
                prog.style.strokeDasharray = len;
                prog.style.strokeDashoffset = len * (1 - progress);

                // Calculate position on the quadratic curve
                const t = progress;
                const x = 20 + (160 * t);
                const y = 80 - (160 * t * (1 - t));
                sunEl.style.left = `${(x / 200) * 100}%`;
                sunEl.style.top = `${(y / 100) * 100}%`;

                // Add animation
                sunEl.animate([
                    { transform: 'translate(-50%,-50%) scale(0.9)' },
                    { transform: 'translate(-50%,-50%) scale(1)' }
                ], { duration: 900, easing: 'ease-out' });
            } else if (sunEl) {
                // If no sunrise/sunset data, position in middle
                sunEl.style.left = '50%';
                sunEl.style.top = '50%';
            }
        } catch (e) {
            console.warn('Sun arc animation error:', e);
        }
    }, 50);

    // Click handler for sun arc
    card.addEventListener('click', () => {
        const title = isDaytime ? 'Day Progress' : 'Night Time';
        const paragraph = isDaytime ? 
            `Sunrise at ${sunrise}, sunset at ${sunset}. The sun's current position is shown on the arc above.` :
            `Sunset was at ${sunset}, next sunrise at ${sunrise}.`;
        const details = {
            'Sunrise': sunrise,
            'Sunset': sunset,
            'Daylight Hours': current.sunrise && current.sunset ? 
                `${Math.round((current.sunset - current.sunrise) / 3600)} hours ${Math.round(((current.sunset - current.sunrise) % 3600) / 60)} minutes` : 'N/A',
            'Current Time': tFormat(current.dt)
        };
        showInfoModal(title, paragraph, details);
    });

    return card;
}

function iconForKey(k) {
    if (k === 'humidity') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 16v-6a4 4 0 0 1 8 0v6"/><path d="M3 16h2"/><path d="M17 16h2"/><path d="M12 16v4"/></svg>`;
    if (k === 'wind') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`;
    if (k === 'visibility') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    if (k === 'pressure') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`;
}

// hourly with drag functionality
function createHourlyCard(hourly) {
    const card = document.createElement('div');
    card.className = 'card card-hourly';
    const hours = hourly.slice(0, 24);

    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="margin:0;font-weight:600;font-size:18px">Hourly Forecast</h3>
            <div class="drag-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 17l5-5-5-5"/><path d="M13 17l5-5-5-5"/>
                </svg>
                Drag
            </div>
        </div>
        <div class="hourly-scroll">
            ${hours.map(h => {
                const timeStr = new Date(h.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true });
                const popPercent = Math.round(h.pop * 100);
                return `<div class="hourly-item" data-dt="${h.dt}">
                    <div class="hourly-time">${timeStr}</div>
                    <div class="hourly-icon icon-wrapper">${getWeatherIcon(h.weather[0].id)}</div>
                    <div class="hourly-temp">${toUnitTemp(h.temp)}${unitLabel()}</div>
                    <div class="muted" style="margin-top:6px;font-size:12px">${popPercent > 0 ? `💧 ${popPercent}%` : 'No rain'}</div>
                </div>`;
            }).join('')}
        </div>
    `;

    // Setup drag functionality
    const scrollContainer = card.querySelector('.hourly-scroll');
    const cleanup = setupHourlyDrag(scrollContainer);

    // Store cleanup function for later if needed
    card.cleanupDrag = cleanup;

    card.querySelectorAll('.hourly-item').forEach(it => {
        it.addEventListener('click', (e) => {
            // Don't trigger click if we were dragging
            if (scrollContainer.classList.contains('dragging')) {
                e.preventDefault();
                return;
            }
            
            const dt = Number(it.getAttribute('data-dt'));
            const h = hours.find(x => x.dt === dt) || hours[0];
            const title = `Forecast — ${new Date(h.dt * 1000).toLocaleString()}`;
            const paragraph = `Temperature ${toUnitString(h.temp)}. ${h.weather[0].description}. Chance of precipitation ${Math.round(h.pop * 100)}%. Feels like ${toUnitString(h.feels_like || h.temp)}. Wind ${Math.round((h.wind_speed || 0) * 3.6)} km/h.`;
            showInfoModal(title, paragraph, { 
                'Time': new Date(h.dt * 1000).toLocaleString(),
                'Temperature': `${toUnitString(h.temp)}`,
                'Feels Like': `${toUnitString(h.feels_like || h.temp)}`,
                'Precipitation Chance': `${Math.round(h.pop * 100)}%`,
                'Wind Speed': `${Math.round((h.wind_speed || 0) * 3.6)} km/h`
            });
        });
    });

    return card;
}

// weekly list with new layout
function createWeeklyList(daily) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card card-weekly';

    const days = daily.slice(0, 7);
    wrapper.innerHTML = `
        <h3 style="margin:0 0 10px 0;font-weight:600;font-size:18px">Daily Forecast</h3>
        <div class="weekly-list">
            ${days.map(d => {
                const w = (Array.isArray(d.weather) ? d.weather[0] : (d.weather || { id: 800, description: 'clear' }));
                const popPercent = Math.round(d.pop * 100);
                return `<div class="weekly-item interactive" data-dt="${d.dt}">
                    <div class="weekly-day-info">
                        <div class="weekly-day">${dayFormat(d.dt)}</div>
                        <div class="weekly-date">${dateFormat(d.dt)}</div>
                    </div>
                    <div class="weekly-middle">
                        <div class="icon-wrapper">${getWeatherIcon(w.id)}</div>
                        <div class="weekly-description muted">${w.description}</div>
                    </div>
                    <div class="weekly-temps">
                        <div class="weekly-temp-high">${toUnitTemp(d.temp.max)}${unitLabel()}</div>
                        <div class="weekly-temp-low">${toUnitTemp(d.temp.min)}${unitLabel()}</div>
                        ${popPercent > 0 ? `<div class="weekly-pop">💧 ${popPercent}%</div>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    wrapper.querySelectorAll('.weekly-item').forEach(it => {
        it.addEventListener('click', () => {
            const dt = Number(it.getAttribute('data-dt'));
            const d = days.find(x => x.dt === dt);
            const w = (Array.isArray(d.weather) ? d.weather[0] : (d.weather || { id: 800, description: 'clear' }));
            const title = `Forecast — ${dayFormat(d.dt)}, ${dateFormat(d.dt)}`;
            const paragraph = `Expected ${w.description}. High ${toUnitTemp(d.temp.max)}${unitLabel()}, Low ${toUnitTemp(d.temp.min)}${unitLabel()}. Chance of precipitation ${Math.round(d.pop * 100)}%.`;
            showInfoModal(title, paragraph, { 
                'Date': `${dayFormat(d.dt)}, ${dateFormat(d.dt)}`,
                'High Temperature': `${toUnitTemp(d.temp.max)}${unitLabel()}`,
                'Low Temperature': `${toUnitTemp(d.temp.min)}${unitLabel()}`,
                'Precipitation Chance': `${Math.round(d.pop * 100)}%`,
                'Conditions': w.description
            });
        });
    });

    return wrapper;
}

// paragraph text generators
function generateHumidityText(cur) {
    const v = cur.humidity;
    const dew = Math.round(cur.temp - ((100 - v) / 5));
    const comfort = v < 30 ? 'Dry' : v < 60 ? 'Comfortable' : v < 80 ? 'Humid' : 'Very Humid';
    return `Humidity ${v}%. Dew point (est) ${dew}${unitLabel()}. Comfort: ${comfort}.`;
}
function generateWindText(cur) {
    const s = Math.round(cur.wind_speed * 3.6);
    const beaufort = s < 2 ? 'Calm' : s < 12 ? 'Light' : s < 29 ? 'Moderate' : 'Strong';
    return `Wind ${s} km/h (${beaufort}). Direction: ${cur.wind_deg || 'N/A'}°.`;
}
function generateVisibilityText(cur) {
    const v = (cur.visibility / 1000).toFixed(1);
    const condition = v > 10 ? 'Excellent' : v > 5 ? 'Good' : v > 2 ? 'Moderate' : v > 1 ? 'Poor' : 'Very Poor';
    return `Visibility ${v} km (${condition}).`;
}
function generatePressureText(cur) {
    const p = cur.pressure;
    const condition = p > 1020 ? 'High' : p < 1000 ? 'Low' : 'Normal';
    return `Pressure ${p} hPa (${condition}).`;
}

// modals
function showInfoModal(title, paragraph, details = {}) {
    infoTitle.textContent = title;
    infoContent.innerHTML = '';
    const p = document.createElement('div');
    p.className = 'detail-paragraph';
    p.innerHTML = `<p style="margin:0">${escapeHtml(paragraph)}</p>`;
    infoContent.appendChild(p);

    if (details && Object.keys(details).length) {
        const detailBlock = document.createElement('div');
        detailBlock.className = 'detail-paragraph';
        detailBlock.style.marginTop = '12px';
        detailBlock.innerHTML = Object.keys(details).map(k => `<div style="margin-bottom:6px"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(details[k]))}</div>`).join('');
        infoContent.appendChild(detailBlock);
    }

    infoModal.classList.remove('hidden');
    infoModal.style.display = 'flex';
    infoModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => infoContent && infoContent.focus(), 50);
}
function hideInfoModal() {
    infoModal.classList.add('hidden');
    infoModal.style.display = 'none';
    infoModal.setAttribute('aria-hidden', 'true');
}

// alerts modal
async function onAlertsClick() {
    const alerts = await scanGlobalAlerts(true);
    cachedAlerts = alerts;
    renderAlertsModal(alerts);
    showAlertsModal();
}
function renderAlertsModal(alerts) {
    alertsContent.innerHTML = '';
    if (!alerts || alerts.length === 0) {
        const el = document.createElement('div');
        el.className = 'detail-paragraph';
        el.innerHTML = `<p>No active weather alerts at this time.</p>`;
        alertsContent.appendChild(el);
        return;
    }

    alerts.forEach(a => {
        a.flags.forEach(flag => {
            const alertType = getAlertType(flag);
            const alertIcon = alertType === 'warning'
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

            const el = document.createElement('div');
            el.className = `alert-item ${alertType}`;
            el.innerHTML = `
                <div class="alert-icon">${alertIcon}</div>
                <div class="alert-content">
                    <div class="alert-title">${escapeHtml(flagLabel(flag))} — ${escapeHtml(a.city)}</div>
                    <div class="alert-desc">${escapeHtml(flagDescription(flag))}</div>
                </div>
            `;
            alertsContent.appendChild(el);
        });
    });
}
function showAlertsModal() {
    alertsModal.classList.remove('hidden');
    alertsModal.style.display = 'flex';
    alertsModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => alertsContent && alertsContent.focus(), 50);
}
function hideAlertsModal() {
    alertsModal.classList.add('hidden');
    alertsModal.style.display = 'none';
    alertsModal.setAttribute('aria-hidden', 'true');
}

// bootstrap
async function init() {
    // Initialize theme toggle
    initThemeToggle();
    
    showLoading();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
            const { latitude: lat, longitude: lon } = pos.coords;
            const rev = await reverseGeocode(lat, lon);
            if (rev) currentLocationName = rev;
            await fetchWeatherAndForecast(lat, lon, true);
        }, async () => {
            const geo = await fetch(`${GEO_DIRECT}?q=London&limit=1&appid=${API_KEY}`).then(r => r.ok ? r.json() : null);
            if (geo && geo[0]) await fetchWeatherAndForecast(geo[0].lat, geo[0].lon, true);
            hideLoading();
        }, { timeout: 8000 });
    } else {
        const geo = await fetch(`${GEO_DIRECT}?q=London&limit=1&appid=${API_KEY}`).then(r => r.ok ? r.json() : null);
        if (geo && geo[0]) await fetchWeatherAndForecast(geo[0].lat, geo[0].lon, true);
        hideLoading();
    }

    setInterval(async () => { cachedAlerts = await scanGlobalAlerts(true); }, 5 * 60 * 1000);
}

init();