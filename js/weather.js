/**
 * 今日水印相机 - 天气模块
 * 基于Open-Meteo免费API自动获取实时天气信息
 * 备用API: wttr.in
 */

class WeatherManager {
    constructor() {
        this.currentWeather = null;
        this.lastFetchTime = 0;
        this.cacheDuration = 10 * 60 * 1000; // 10分钟缓存
        this.fetching = false;

        // WMO天气代码映射表（中文描述 + 图标）
        this.WMO_CODE_MAP = {
            0:  { text: '晴',       icon: '☀️', category: 'clear' },
            1:  { text: '晴间多云', icon: '🌤️', category: 'partly_cloudy' },
            2:  { text: '多云',     icon: '⛅', category: 'partly_cloudy' },
            3:  { text: '阴',       icon: '☁️', category: 'cloudy' },
            45: { text: '雾',       icon: '🌫️', category: 'fog' },
            48: { text: '雾凇',     icon: '🌫️', category: 'fog' },
            51: { text: '小毛毛雨', icon: '🌦️', category: 'drizzle' },
            53: { text: '毛毛雨',   icon: '🌦️', category: 'drizzle' },
            55: { text: '大毛毛雨', icon: '🌦️', category: 'drizzle' },
            56: { text: '冻毛毛雨', icon: '🌧️', category: 'freezing' },
            57: { text: '密冻毛毛雨', icon: '🌧️', category: 'freezing' },
            61: { text: '小雨',     icon: '🌧️', category: 'rain' },
            63: { text: '中雨',     icon: '🌧️', category: 'rain' },
            65: { text: '大雨',     icon: '🌧️', category: 'rain' },
            66: { text: '冻雨',     icon: '🌧️', category: 'freezing' },
            67: { text: '密冻雨',   icon: '🌧️', category: 'freezing' },
            71: { text: '小雪',     icon: '🌨️', category: 'snow' },
            73: { text: '中雪',     icon: '🌨️', category: 'snow' },
            75: { text: '大雪',     icon: '🌨️', category: 'snow' },
            77: { text: '雪粒',     icon: '🌨️', category: 'snow' },
            80: { text: '小阵雨',   icon: '🌦️', category: 'showers' },
            81: { text: '阵雨',     icon: '🌦️', category: 'showers' },
            82: { text: '强阵雨',   icon: '🌦️', category: 'showers' },
            85: { text: '小阵雪',   icon: '🌨️', category: 'snow_showers' },
            86: { text: '阵雪',     icon: '🌨️', category: 'snow_showers' },
            95: { text: '雷暴',     icon: '⛈️', category: 'thunderstorm' },
            96: { text: '雷暴伴冰雹', icon: '⛈️', category: 'thunderstorm' },
            99: { text: '强雷暴伴冰雹', icon: '⛈️', category: 'thunderstorm' }
        };

        // 默认天气（获取失败时使用）
        this.defaultWeather = {
            text: '晴',
            temp: '27°C',
            icon: '☀️',
            humidity: null,
            windSpeed: null,
            isDay: 1,
            source: 'default'
        };
    }

    /**
     * 根据经纬度获取实时天气
     * @param {number} lat - 纬度
     * @param {number} lon - 经度
     * @returns {Promise<Object>} 天气信息
     */
    async getWeatherByCoords(lat, lon) {
        // 检查缓存
        const now = Date.now();
        if (this.currentWeather && (now - this.lastFetchTime) < this.cacheDuration) {
            return this.currentWeather;
        }

        // 防止重复请求
        if (this.fetching) {
            return this.currentWeather || this.defaultWeather;
        }

        this.fetching = true;

        try {
            const weather = await this._fetchFromOpenMeteo(lat, lon);
            if (weather) {
                this.currentWeather = weather;
                this.lastFetchTime = now;
                return weather;
            }
        } catch (err) {
            console.warn('Open-Meteo天气获取失败:', err);
        }

        // 备用API
        try {
            const weather = await this._fetchFromWttr(lat, lon);
            if (weather) {
                this.currentWeather = weather;
                this.lastFetchTime = now;
                return weather;
            }
        } catch (err) {
            console.warn('wttr.in天气获取失败:', err);
        }

        // 所有API都失败，返回默认或缓存
        this.fetching = false;
        return this.currentWeather || this.defaultWeather;
    }

    /**
     * 从Open-Meteo获取天气（主API）
     */
    async _fetchFromOpenMeteo(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data || !data.current) return null;

        const code = data.current.weather_code;
        const wmoInfo = this.WMO_CODE_MAP[code] || { text: '未知', icon: '🌡️', category: 'unknown' };
        const temp = Math.round(data.current.temperature_2m);

        return {
            text: wmoInfo.text,
            icon: wmoInfo.icon,
            category: wmoInfo.category,
            temp: `${temp}°C`,
            tempValue: temp,
            humidity: data.current.relative_humidity_2m,
            apparentTemp: data.current.apparent_temperature != null ? Math.round(data.current.apparent_temperature) : null,
            isDay: data.current.is_day,
            precipitation: data.current.precipitation,
            cloudCover: data.current.cloud_cover,
            windSpeed: data.current.wind_speed_10m,
            windDirection: data.current.wind_direction_10m,
            source: 'open-meteo',
            updateTime: new Date().toISOString()
        };
    }

    /**
     * 从wttr.in获取天气（备用API）
     */
    async _fetchFromWttr(lat, lon) {
        const url = `https://wttr.in/${lat},${lon}?format=j1`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data || !data.current_condition || !data.current_condition[0]) return null;

        const cur = data.current_condition[0];
        const temp = parseInt(cur.temp_C) || 27;
        const weatherDesc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value || '').trim();
        const text = this._translateWttrDesc(weatherDesc, parseInt(cur.weatherCode));

        return {
            text: text,
            icon: this._getIconByDesc(text),
            category: this._getCategoryByDesc(text),
            temp: `${temp}°C`,
            tempValue: temp,
            humidity: parseInt(cur.humidity) || null,
            apparentTemp: parseInt(cur.FeelsLikeC) || null,
            isDay: 1,
            precipitation: parseFloat(cur.precipMM) || 0,
            cloudCover: parseInt(cur.cloudcover) || null,
            windSpeed: parseInt(cur.windspeedKmph) || null,
            windDirection: parseInt(cur.winddirDegree) || null,
            source: 'wttr.in',
            updateTime: new Date().toISOString()
        };
    }

    /**
     * 翻译wttr.in天气描述为中文
     */
    _translateWttrDesc(desc, code) {
        const descMap = {
            'clear': '晴', 'sunny': '晴', 'clear ': '晴',
            'partly cloudy': '晴间多云', 'partlycloudy': '晴间多云',
            'cloudy': '阴', 'overcast': '阴',
            'mist': '雾', 'fog': '雾', 'foggy': '雾',
            'light rain': '小雨', 'light drizzle': '小毛毛雨',
            'drizzle': '毛毛雨', 'heavy drizzle': '大毛毛雨',
            'moderate rain': '中雨', 'heavy rain': '大雨',
            'light snow': '小雪', 'moderate snow': '中雪', 'heavy snow': '大雪',
            'thunderstorm': '雷暴', 'thundery outbreaks': '雷暴',
            'light showers': '小阵雨', 'showers': '阵雨', 'heavy showers': '强阵雨',
            'blizzard': '暴风雪', 'blowing snow': '吹雪'
        };
        const lowerDesc = (desc || '').toLowerCase();
        if (descMap[lowerDesc]) return descMap[lowerDesc];
        // wttr.in weatherCode: 113=晴, 116=多云, 119,122=阴, 143=雾, 176,263,266=毛毛雨
        // 293,296,299,302,305,308=雨, 179,182,185=冻雨, 200,386,389=雷暴, 227,230=雪
        const codeMap = {
            113: '晴', 116: '晴间多云', 119: '阴', 122: '阴', 143: '雾',
            176: '小毛毛雨', 263: '小毛毛雨', 266: '毛毛雨', 281: '冻毛毛雨', 284: '密冻毛毛雨',
            293: '小雨', 296: '小雨', 299: '中雨', 302: '中雨', 305: '大雨', 308: '大雨',
            311: '冻雨', 314: '冻雨', 317: '冻雨',
            179: '小雪', 182: '小雪', 185: '小雪', 227: '小雪', 230: '大雪',
            320: '小雪', 323: '小雪', 326: '中雪', 329: '大雪', 332: '大雪', 335: '大雪', 338: '大雪',
            350: '冻雨', 353: '小阵雨', 356: '阵雨', 359: '强阵雨',
            362: '小阵雪', 365: '阵雪',
            200: '雷暴', 386: '雷暴', 389: '雷暴伴冰雹', 392: '雷暴', 395: '雷暴伴冰雹'
        };
        return codeMap[code] || desc || '晴';
    }

    /**
     * 根据天气描述获取图标
     */
    _getIconByDesc(text) {
        const iconMap = {
            '晴': '☀️', '晴间多云': '🌤️', '多云': '⛅', '阴': '☁️',
            '雾': '🌫️', '雾凇': '🌫️',
            '小毛毛雨': '🌦️', '毛毛雨': '🌦️', '大毛毛雨': '🌦️',
            '冻毛毛雨': '🌧️', '密冻毛毛雨': '🌧️',
            '小雨': '🌧️', '中雨': '🌧️', '大雨': '🌧️',
            '冻雨': '🌧️', '密冻雨': '🌧️',
            '小雪': '🌨️', '中雪': '🌨️', '大雪': '🌨️', '雪粒': '🌨️',
            '小阵雨': '🌦️', '阵雨': '🌦️', '强阵雨': '🌦️',
            '小阵雪': '🌨️', '阵雪': '🌨️',
            '雷暴': '⛈️', '雷暴伴冰雹': '⛈️', '强雷暴伴冰雹': '⛈️',
            '暴风雪': '🌨️', '吹雪': '🌨️'
        };
        return iconMap[text] || '🌡️';
    }

    /**
     * 根据天气描述获取分类
     */
    _getCategoryByDesc(text) {
        if (text.includes('晴')) return 'clear';
        if (text.includes('多云')) return 'partly_cloudy';
        if (text.includes('阴')) return 'cloudy';
        if (text.includes('雾')) return 'fog';
        if (text.includes('毛毛雨')) return 'drizzle';
        if (text.includes('冻')) return 'freezing';
        if (text.includes('雨')) return 'rain';
        if (text.includes('雪')) return 'snow';
        if (text.includes('雷')) return 'thunderstorm';
        if (text.includes('阵雨') || text.includes('阵雪')) return 'showers';
        return 'unknown';
    }

    /**
     * 获取天气详情字符串（用于水印显示）
     */
    getWeatherString() {
        if (!this.currentWeather) return '';
        const w = this.currentWeather;
        return `${w.text} ${w.temp}`;
    }

    /**
     * 获取天气详情信息（用于预览页面展示）
     */
    getWeatherDetail() {
        if (!this.currentWeather) return null;
        const w = this.currentWeather;
        let detail = `${w.icon} ${w.text} ${w.temp}`;
        if (w.humidity != null) detail += ` | 湿度${w.humidity}%`;
        if (w.windSpeed != null) detail += ` | 风速${w.windSpeed}km/h`;
        if (w.apparentTemp != null) detail += ` | 体感${w.apparentTemp}°C`;
        detail += ` | 来源:${w.source}`;
        return detail;
    }

    /**
     * 清除缓存（强制下次重新获取）
     */
    clearCache() {
        this.currentWeather = null;
        this.lastFetchTime = 0;
    }

    /**
     * 根据城市名获取天气（不支持坐标时的备用方案）
     */
    async getWeatherByCity(cityName) {
        if (!cityName) return this.defaultWeather;
        try {
            const url = `https://wttr.in/${encodeURIComponent(cityName)}?format=j1`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000)
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (!data || !data.current_condition || !data.current_condition[0]) return null;
            const cur = data.current_condition[0];
            const temp = parseInt(cur.temp_C) || 27;
            const weatherDesc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value || '').trim();
            const text = this._translateWttrDesc(weatherDesc, parseInt(cur.weatherCode));
            const weather = {
                text: text,
                icon: this._getIconByDesc(text),
                category: this._getCategoryByDesc(text),
                temp: `${temp}°C`,
                tempValue: temp,
                humidity: parseInt(cur.humidity) || null,
                apparentTemp: parseInt(cur.FeelsLikeC) || null,
                isDay: 1,
                windSpeed: parseInt(cur.windspeedKmph) || null,
                windDirection: parseInt(cur.winddirDegree) || null,
                source: 'wttr.in',
                updateTime: new Date().toISOString()
            };
            this.currentWeather = weather;
            this.lastFetchTime = Date.now();
            return weather;
        } catch (err) {
            console.warn('按城市获取天气失败:', err);
            return this.defaultWeather;
        }
    }
}

// 导出到全局
window.WeatherManager = WeatherManager;
