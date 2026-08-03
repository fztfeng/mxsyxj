/**
 * 今日水印相机 - 水印模块
 * 负责水印的生成、渲染和管理
 */

class WatermarkManager {
    constructor() {
        this.config = {
            template: 'default',
            position: 'bottom-left',
            fontSize: 'medium',
            opacity: 90,
            customTime: null,
            customLocation: null,
            customText: '',
            weather: { enabled: true, text: '晴', temp: '27°C' },
            weatherMode: 'auto',
            useCustomTime: false,
            useCustomLocation: false,
            useCustomText: false,
            brandEnabled: true,
            antiFakeEnabled: true
        };

        this.currentAntiFakeCode = '';
        this.locationIcon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="vertical-align: middle; margin-right: 3px; flex-shrink: 0;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
        this.shieldIcon = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="flex-shrink: 0;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`;

        // 初始生成防伪码
        this.generateAntiFakeCode();
    }

    updateConfig(key, value) {
        this.config[key] = value;
    }

    updateConfigs(updates) {
        Object.assign(this.config, updates);
    }

    /**
     * 生成13位防伪码（大写字母+数字混合）
     * 格式: 13位随机字符
     */
    generateAntiFakeCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 13; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.currentAntiFakeCode = code;
        return code;
    }

    /**
     * 获取当前防伪码
     */
    getAntiFakeCode() {
        return this.currentAntiFakeCode;
    }

    /**
     * 生成品牌防伪水印HTML（右下角）
     * 匹配参考图：今日水印 → 相机 [真实可验](蓝色徽章) → 防伪 XXXXXXXXXXXXX
     */
    generateBrandHTML() {
        if (!this.config.brandEnabled) return '';

        let html = '';
        // 品牌名称
        html += `<div class="brand-name">今日水印</div>`;
        // 副标题：相机 + 蓝色徽章"真实可验"
        html += `<div class="brand-subtitle">相机 <span class="brand-verify-badge">真实可验</span></div>`;
        
        // 防伪码
        if (this.config.antiFakeEnabled) {
            html += `<div class="brand-antifake"><span class="antifake-label">防伪</span> ${this.currentAntiFakeCode}</div>`;
        }
        
        return html;
    }

    /**
     * 更新品牌防伪水印预览
     */
    updateBrandPreview(brandElement) {
        if (!brandElement) return;
        if (this.config.brandEnabled) {
            brandElement.classList.remove('hidden');
            brandElement.style.opacity = this.config.opacity / 100;
            brandElement.innerHTML = this.generateBrandHTML();
        } else {
            brandElement.classList.add('hidden');
        }
    }

    /**
     * 获取星期几
     */
    getWeekDay(date) {
        const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return weekDays[date.getDay()];
    }

    /**
     * 获取当前时间字符串
     */
    getCurrentTime() {
        if (this.config.useCustomTime && this.config.customTime) {
            return this.config.customTime;
        }
        const now = new Date();
        return {
            time: this.formatTime(now),
            date: this.formatDate(now),
            fullDate: this.formatFullDate(now),
            weekDay: this.getWeekDay(now)
        };
    }

    formatTime(date) {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    formatFullDate(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }

    /**
     * 获取天气信息
     */
    getWeather() {
        if (this.config.weather.enabled) {
            const w = this.config.weather;
            return `${w.text} ${w.temp}`;
        }
        return '';
    }

    /**
     * 获取位置信息
     */
    getLocation() {
        if (this.config.useCustomLocation && this.config.customLocation) {
            return this.config.customLocation;
        }
        return {
            province: '',
            city: '',
            address: '',
            full: '',
            coords: ''
        };
    }

    /**
     * 生成水印HTML
     */
    generateWatermarkHTML() {
        const timeData = this.getCurrentTime();
        const location = this.getLocation();
        const weather = this.getWeather();
        const template = this.config.template;

        switch (template) {
            case 'default':
                return this.generateDefaultTemplate(timeData, location, weather);
            case 'simple':
                return this.generateSimpleTemplate(timeData, location, weather);
            case 'modern':
                return this.generateModernTemplate(timeData, location, weather);
            case 'professional':
                return this.generateProfessionalTemplate(timeData, location, weather);
            default:
                return this.generateDefaultTemplate(timeData, location, weather);
        }
    }

    /**
     * 经典模板 - 匹配截图样式
     * 大号时间 | 日期 \n 星期 天气 温度 \n 地点
     */
    generateDefaultTemplate(timeData, location, weather) {
        let html = '';
        // 第一行：时间 | 日期
        html += `<div class="wm-main">`;
        html += `<span class="wm-time">${timeData.time}</span>`;
        html += `<span class="wm-divider"></span>`;
        html += `<span class="wm-date">${timeData.date}</span>`;
        html += `</div>`;
        
        // 第二行：星期 天气 温度
        if (weather) {
            html += `<div class="wm-weather">${timeData.weekDay} ${weather}</div>`;
        } else {
            html += `<div class="wm-weather">${timeData.weekDay}</div>`;
        }
        
        // 第三行：地点
        const locText = location.full || `${location.province}${location.city}${location.address}`;
        if (locText) {
            html += `<div class="wm-location">${this.locationIcon}${locText}</div>`;
        }
        
        // 自定义文字
        if (this.config.useCustomText && this.config.customText) {
            html += `<div class="wm-text">${this.config.customText}</div>`;
        }
        
        return html;
    }

    /**
     * 简约模板
     */
    generateSimpleTemplate(timeData, location, weather) {
        let html = '';
        html += `<div class="wm-time">${timeData.time}</div>`;
        html += `<div class="wm-date">${timeData.date}</div>`;
        
        if (this.config.useCustomText && this.config.customText) {
            html += `<div class="wm-text">${this.config.customText}</div>`;
        }
        
        return html;
    }

    /**
     * 现代模板
     */
    generateModernTemplate(timeData, location, weather) {
        let html = '';
        html += `<div class="wm-badge">今日</div>`;
        html += `<div class="wm-time">${timeData.time}</div>`;
        html += `<div class="wm-date">${timeData.date}</div>`;
        
        if (weather) {
            html += `<div class="wm-weather">${timeData.weekDay} ${weather}</div>`;
        }
        
        const locText = location.full || `${location.province}${location.city}`;
        if (locText) {
            html += `<div class="wm-location">${locText}</div>`;
        }
        
        if (this.config.useCustomText && this.config.customText) {
            html += `<div class="wm-text">${this.config.customText}</div>`;
        }
        
        return html;
    }

    /**
     * 专业模板
     */
    generateProfessionalTemplate(timeData, location, weather) {
        let html = '';
        html += `<div class="wm-time">${timeData.fullDate}</div>`;
        
        if (weather) {
            html += `<div class="wm-weather">${timeData.weekDay} ${weather}</div>`;
        }
        
        const locText = location.full || `${location.province}${location.city}${location.address}`;
        if (locText) {
            html += `<div class="wm-location">${this.locationIcon}${locText}</div>`;
        }
        
        const noteText = this.config.useCustomText && this.config.customText 
            ? this.config.customText 
            : '工作记录';
        html += `<div class="wm-text">${noteText}</div>`;
        
        return html;
    }

    /**
     * 更新水印预览
     */
    updatePreview(overlayElement) {
        if (!overlayElement) return;

        overlayElement.className = `watermark-overlay template-${this.config.template}`;
        this.applyPosition(overlayElement);
        overlayElement.style.opacity = this.config.opacity / 100;
        this.applyFontSize(overlayElement);
        overlayElement.innerHTML = this.generateWatermarkHTML();
    }

    applyPosition(overlayElement) {
        overlayElement.style.top = '';
        overlayElement.style.bottom = '';
        overlayElement.style.left = '';
        overlayElement.style.right = '';
        overlayElement.style.textAlign = '';
        overlayElement.style.transform = '';

        const positionMap = {
            'bottom-left': { bottom: '20px', left: '20px', right: '', top: '', textAlign: 'left' },
            'bottom-right': { bottom: '20px', right: '20px', left: '', top: '', textAlign: 'right' },
            'bottom-center': { bottom: '20px', left: '50%', right: '', top: '', transform: 'translateX(-50%)', textAlign: 'center' },
            'top-left': { top: '70px', left: '20px', bottom: '', right: '', textAlign: 'left' },
            'top-right': { top: '70px', right: '20px', bottom: '', left: '', textAlign: 'right' }
        };

        const pos = positionMap[this.config.position];
        if (pos) {
            Object.keys(pos).forEach(key => {
                if (pos[key] !== '') {
                    overlayElement.style[key] = pos[key];
                }
            });
        }
    }

    applyFontSize(overlayElement) {
        const sizeMap = { small: 0.8, medium: 1.0, large: 1.25 };
        const scale = sizeMap[this.config.fontSize] || 1.0;

        const timeEl = overlayElement.querySelector('.wm-time');
        const dateEl = overlayElement.querySelector('.wm-date');
        const weatherEl = overlayElement.querySelector('.wm-weather');
        const locEl = overlayElement.querySelector('.wm-location');
        const textEl = overlayElement.querySelector('.wm-text');
        const dividerEl = overlayElement.querySelector('.wm-divider');

        const template = this.config.template;
        const baseTimeSize = template === 'professional' ? 15 : (template === 'simple' ? 34 : (template === 'modern' ? 30 : 38));

        if (timeEl) timeEl.style.fontSize = `${baseTimeSize * scale}px`;
        if (dateEl) dateEl.style.fontSize = `${15 * scale}px`;
        if (weatherEl) weatherEl.style.fontSize = `${13 * scale}px`;
        if (locEl) locEl.style.fontSize = `${11 * scale}px`;
        if (textEl) textEl.style.fontSize = `${12 * scale}px`;
        if (dividerEl) dividerEl.style.height = `${28 * scale}px`;
    }

    /**
     * 在Canvas上绘制水印
     */
    drawWatermarkOnCanvas(ctx, canvasWidth, canvasHeight) {
        const timeData = this.getCurrentTime();
        const location = this.getLocation();
        const weather = this.getWeather();
        const opacity = this.config.opacity / 100;
        const scale = this.getFontScale();

        ctx.save();
        ctx.globalAlpha = opacity;

        switch (this.config.template) {
            case 'default':
                this.drawDefaultOnCanvas(ctx, canvasWidth, canvasHeight, timeData, location, weather, scale);
                break;
            case 'simple':
                this.drawSimpleOnCanvas(ctx, canvasWidth, canvasHeight, timeData, location, weather, scale);
                break;
            case 'modern':
                this.drawModernOnCanvas(ctx, canvasWidth, canvasHeight, timeData, location, weather, scale);
                break;
            case 'professional':
                this.drawProfessionalOnCanvas(ctx, canvasWidth, canvasHeight, timeData, location, weather, scale);
                break;
        }

        // 绘制品牌防伪水印（右下角）
        if (this.config.brandEnabled) {
            this.drawBrandOnCanvas(ctx, canvasWidth, canvasHeight, scale);
        }

        ctx.restore();
    }

    /**
     * Canvas绘制 - 品牌防伪水印（右下角）
     * 匹配参考图：今日水印 → 相机 [真实可验](蓝色徽章) → 防伪 XXXXXXXXXXXXX
     */
    drawBrandOnCanvas(ctx, w, h, scale) {
        const padding = 30 * (w / 1080);
        const rightX = w - padding;
        let y = h - padding;

        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        // 防伪码（最底部）
        if (this.config.antiFakeEnabled) {
            const antifakeFontSize = 13 * scale * (w / 1080);
            ctx.font = `${antifakeFontSize}px 'Courier New', monospace`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 4;
            ctx.fillText(`防伪 ${this.currentAntiFakeCode}`, rightX, y);
            y -= antifakeFontSize + 6 * (w / 1080);
        }

        // 副标题：相机 [真实可验] 蓝色徽章
        const subFontSize = 14 * scale * (w / 1080);
        const ratio = w / 1080;
        const cameraText = '相机';
        const verifyText = '真实可验';
        const gap = 6 * ratio;
        const badgePadX = 8 * ratio;
        const badgePadY = 3 * ratio;
        const badgeRadius = 4 * ratio;

        // 测量文字宽度
        ctx.font = `${subFontSize}px -apple-system, sans-serif`;
        const cameraWidth = ctx.measureText(cameraText).width;
        ctx.font = `bold ${subFontSize}px -apple-system, sans-serif`;
        const verifyWidth = ctx.measureText(verifyText).width;
        const badgeWidth = verifyWidth + badgePadX * 2;
        const badgeHeight = subFontSize + badgePadY * 2;

        // 总宽度 = 相机 + gap + 徽章
        const totalWidth = cameraWidth + gap + badgeWidth;
        const startX = rightX - totalWidth; // 左起位置

        // 绘制"相机"文字
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 4;
        ctx.font = `${subFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const cameraY = y - badgePadY; // 对齐徽章中心
        ctx.fillText(cameraText, startX, cameraY);

        // 绘制蓝色徽章背景（圆角矩形）
        const badgeX = startX + cameraWidth + gap;
        const badgeY = y - badgeHeight;
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#4A90D9';
        this._drawRoundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
        ctx.fill();

        // 绘制"真实可验"文字（白色加粗）
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${subFontSize}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(verifyText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

        y -= badgeHeight + 6 * (w / 1080);

        // 品牌名称
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const brandFontSize = 20 * scale * (w / 1080);
        ctx.font = `bold ${brandFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`今日水印`, rightX, y);
        ctx.shadowOffsetY = 0;
    }

    /**
     * 绘制圆角矩形
     */
    _drawRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    getFontScale() {
        const sizeMap = { small: 0.8, medium: 1.0, large: 1.25 };
        return sizeMap[this.config.fontSize] || 1.0;
    }

    /**
     * Canvas绘制 - 经典模板（匹配截图）
     * 从上到下绘制：时间|日期 → 星期 天气 → 地点
     */
    drawDefaultOnCanvas(ctx, w, h, timeData, location, weather, scale) {
        const padding = 30 * (w / 1080);
        const timeFontSize = 50 * scale * (w / 1080);
        const dateFontSize = 20 * scale * (w / 1080);
        const weatherFontSize = 17 * scale * (w / 1080);
        const locFontSize = 13 * scale * (w / 1080); // 缩小位置信息字体
        
        const pos = this.getCanvasPosition(w, h, padding);
        let x = pos.x;
        let y = pos.y;

        ctx.textAlign = pos.align;
        ctx.textBaseline = 'top';

        // === 第一行（顶部）：时间 | 日期 ===
        ctx.font = `bold ${timeFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillText(timeData.time, x, y);
        
        // 竖线分隔符 + 日期（仅在左对齐时横向排列）
        const timeWidth = ctx.measureText(timeData.time).width;
        if (pos.align === 'right') {
            // 右对齐：日期在时间左侧
            const dateWidth = ctx.measureText(timeData.date).width;
            const dividerX = x - timeWidth - 12 * (w / 1080) - 2 * (w / 1080);
            const dateX = dividerX - 12 * (w / 1080) - dateWidth;
            const dividerHeight = 38 * scale * (w / 1080);
            
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(dividerX, y + 4 * (w / 1080), 2 * (w / 1080), dividerHeight);
            
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 4;
            ctx.font = `${dateFontSize}px -apple-system, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(timeData.date, dateX, y + (timeFontSize - dateFontSize) / 2);
        } else {
            // 左对齐/居中：日期在时间右侧
            const dividerX = x + timeWidth + 12 * (w / 1080);
            const dividerHeight = 38 * scale * (w / 1080);
            const dateX = dividerX + 12 * (w / 1080);
            
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(dividerX, y + 4 * (w / 1080), 2 * (w / 1080), dividerHeight);
            
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 4;
            ctx.font = `${dateFontSize}px -apple-system, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(timeData.date, dateX, y + (timeFontSize - dateFontSize) / 2);
        }
        y += timeFontSize + 8 * (w / 1080);

        // === 第二行：星期 天气 ===
        ctx.font = `${weatherFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.shadowOffsetY = 1;
        const weatherText = weather ? `${timeData.weekDay} ${weather}` : timeData.weekDay;
        ctx.fillText(weatherText, x, y);
        y += weatherFontSize + 6 * (w / 1080);

        // === 第三行（底部）：地点（缩小字体，放在天气下方）===
        const locText = location.full || `${location.province}${location.city}${location.address}`;
        if (locText) {
            ctx.font = `${locFontSize}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillText(`📍 ${locText}`, x, y);
            y += locFontSize + 4 * (w / 1080);
        }

        // 自定义文字
        if (this.config.useCustomText && this.config.customText) {
            ctx.font = `${16 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillText(this.config.customText, x, y);
        }
    }

    drawSimpleOnCanvas(ctx, w, h, timeData, location, weather, scale) {
        const padding = 30 * (w / 1080);
        const baseFontSize = 45 * scale * (w / 1080);
        
        const pos = this.getCanvasPosition(w, h, padding);
        let x = pos.x;
        let y = pos.y;

        ctx.textAlign = pos.align;
        ctx.textBaseline = 'top';

        ctx.font = `300 ${baseFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillText(timeData.time, x, y);
        y += baseFontSize + 4 * (w / 1080);

        ctx.font = `${18 * scale * (w / 1080)}px -apple-system, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.shadowOffsetY = 1;
        ctx.fillText(timeData.date, x, y);
        y += 22 * scale * (w / 1080);

        if (this.config.useCustomText && this.config.customText) {
            ctx.font = `${16 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(this.config.customText, x, y);
        }
    }

    drawModernOnCanvas(ctx, w, h, timeData, location, weather, scale) {
        const padding = 30 * (w / 1080);
        const baseFontSize = 40 * scale * (w / 1080);
        
        const pos = this.getCanvasPosition(w, h, padding);
        let x = pos.x;
        let y = pos.y;

        ctx.textAlign = pos.align;
        ctx.textBaseline = 'top';

        // 徽章
        const badgeText = '今日';
        ctx.font = `bold ${14 * scale * (w / 1080)}px -apple-system, sans-serif`;
        const badgeWidth = ctx.measureText(badgeText).width + 16 * (w / 1080);
        const badgeHeight = 22 * scale * (w / 1080);
        
        if (pos.align === 'right') {
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(x - badgeWidth, y, badgeWidth, badgeHeight);
            ctx.fillStyle = '#000';
            ctx.shadowColor = 'transparent';
            ctx.fillText(badgeText, x - 8 * (w / 1080), y + 4);
        } else {
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(x, y, badgeWidth, badgeHeight);
            ctx.fillStyle = '#000';
            ctx.shadowColor = 'transparent';
            ctx.fillText(badgeText, x + 8 * (w / 1080), y + 4);
        }
        y += badgeHeight + 8 * (w / 1080);

        ctx.font = `800 ${baseFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillText(timeData.time, x, y);
        y += baseFontSize + 4 * (w / 1080);

        ctx.font = `${16 * scale * (w / 1080)}px -apple-system, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.shadowOffsetY = 1;
        ctx.fillText(timeData.date, x, y);
        y += 20 * scale * (w / 1080);

        if (weather) {
            ctx.font = `${16 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(`${timeData.weekDay} ${weather}`, x, y);
            y += 20 * scale * (w / 1080);
        }

        const locText = location.full || `${location.province}${location.city}`;
        if (locText) {
            ctx.font = `${13 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillText(locText, x, y);
            y += 22 * scale * (w / 1080);
        }

        if (this.config.useCustomText && this.config.customText) {
            ctx.font = `${16 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(this.config.customText, x, y);
        }
    }

    drawProfessionalOnCanvas(ctx, w, h, timeData, location, weather, scale) {
        const padding = 30 * (w / 1080);
        const lineX = padding;
        let startY = h - padding - 100 * (w / 1080);

        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(lineX, startY, 3 * (w / 1080), 90 * (w / 1080));

        let x = lineX + 15 * (w / 1080);
        let y = startY;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.font = `600 ${18 * scale * (w / 1080)}px -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 4;
        ctx.fillText(timeData.fullDate, x, y);
        y += 26 * scale * (w / 1080);

        if (weather) {
            ctx.font = `${17 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillText(`${timeData.weekDay} ${weather}`, x, y);
            y += 24 * scale * (w / 1080);
        }

        const locText = location.full || `${location.province}${location.city}${location.address}`;
        if (locText) {
            ctx.font = `${13 * scale * (w / 1080)}px -apple-system, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillText(`📍 ${locText}`, x, y);
            y += 20 * scale * (w / 1080);
        }

        const noteText = this.config.useCustomText && this.config.customText 
            ? this.config.customText 
            : '工作记录';
        ctx.font = `500 ${16 * scale * (w / 1080)}px -apple-system, sans-serif`;
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(noteText, x, y);
    }

    getCanvasPosition(w, h, padding) {
        const positions = {
            'bottom-left': { x: padding, y: h - padding - 120, align: 'left' },
            'bottom-right': { x: w - padding, y: h - padding - 120, align: 'right' },
            'bottom-center': { x: w / 2, y: h - padding - 120, align: 'center' },
            'top-left': { x: padding, y: padding + 180, align: 'left' },
            'top-right': { x: w - padding, y: padding + 180, align: 'right' }
        };
        return positions[this.config.position] || positions['bottom-left'];
    }

    setCustomTime(date, time) {
        if (date && time) {
            const dt = new Date(`${date}T${time}`);
            this.config.customTime = {
                time: time,
                date: this.formatDate(dt),
                fullDate: this.formatFullDate(dt),
                weekDay: this.getWeekDay(dt)
            };
        } else {
            this.config.customTime = null;
        }
    }

    setCustomLocation(province, city, address, coords) {
        if (province || city || address) {
            this.config.customLocation = {
                province: province || '',
                city: city || '',
                address: address || '',
                full: `${province || ''}${city || ''}${address || ''}`.trim(),
                coords: coords || ''
            };
        } else {
            this.config.customLocation = null;
        }
    }

    setWeather(enabled, text, temp) {
        this.config.weather = { enabled, text, temp };
    }

    /**
     * 设置天气模式
     * @param {string} mode - 'auto' 或 'manual'
     */
    setWeatherMode(mode) {
        this.config.weatherMode = mode;
    }

    /**
     * 从WeatherManager自动获取的天气数据更新水印天气
     * @param {Object} weatherData - WeatherManager返回的天气对象
     */
    setWeatherFromAuto(weatherData) {
        if (!weatherData) return;
        this.config.weather = {
            enabled: true,
            text: weatherData.text || '晴',
            temp: weatherData.temp || '27°C'
        };
        // 存储完整天气数据供详情展示
        this.weatherDetail = weatherData;
    }

    /**
     * 获取天气详情数据
     */
    getWeatherDetail() {
        return this.weatherDetail || null;
    }

    syncCurrentTime() {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.setCustomTime(date, time);
        return { date, time };
    }

    getConfig() {
        return { ...this.config };
    }
}

window.WatermarkManager = WatermarkManager;
