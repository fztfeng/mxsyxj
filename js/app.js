/**
 * 今日水印相机 - 主应用逻辑
 * 负责UI交互、事件绑定和整体应用流程
 */

class App {
    constructor() {
        this.camera = new CameraManager();
        this.watermark = new WatermarkManager();
        this.weather = new WeatherManager();
        this.watermarkOverlay = null;
        this.brandOverlay = null;
        this.currentPhoto = null;
        this.photos = [];
        this.watermarkUpdateInterval = null;
        this.settingsPanelOpen = false;
        this.currentZoom = 1;
        this.verifyModalOpen = false;
        this.currentMode = 'photo';
        this.currentUser = null;
        this.selectedVipPlan = 'yearly';
        this.teamData = null;
        this.collageLayout = 2;
        this.collagePhotos = [];
        this.reportPhotos = [];

        this.loadPhotosFromStorage();
        this.loadUserFromStorage();
        this.loadTeamFromStorage();
    }

    async init() {
        await this.showSplash();
        this.watermarkOverlay = document.getElementById('watermark-overlay');
        this.brandOverlay = document.getElementById('brand-overlay');
        this.bindEvents();
        this.updateWatermarkPreview();
        this.updateLoginUI();

        try {
            await this.camera.init();
            this.showToast('相机已就绪');
        } catch (err) {
            console.error('相机初始化失败:', err);
            this.showToast('相机初始化失败，请检查权限');
        }

        this.startTimeUpdateTimer();

        // 启动时自动获取定位
        setTimeout(() => this.autoGetLocation(), 1000);

        // 启动时自动获取天气（如果是自动模式）
        if (this.watermark.config.weatherMode !== 'manual') {
            setTimeout(() => this.refreshAutoWeather(), 2000);
        }
    }

    async showSplash() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                const app = document.getElementById('app');
                splash.classList.add('fade-out');
                app.classList.remove('hidden');
                setTimeout(() => {
                    splash.style.display = 'none';
                    resolve();
                }, 500);
            }, 1500);
        });
    }

    bindEvents() {
        // 侧边菜单
        document.getElementById('btn-menu').addEventListener('click', () => {
            this.openSideMenu();
        });

        document.querySelector('.side-menu-overlay').addEventListener('click', () => {
            this.closeSideMenu();
        });

        // 侧边菜单头部点击 - 登录/用户信息
        document.querySelector('.side-menu-header').addEventListener('click', () => {
            if (!this.currentUser) {
                this.closeSideMenu();
                this.openLoginModal();
            }
        });

        document.getElementById('menu-watermark').addEventListener('click', () => {
            this.closeSideMenu();
            this.toggleSettingsPanel(true);
        });

        document.getElementById('menu-gallery').addEventListener('click', () => {
            this.closeSideMenu();
            this.openGallery();
        });

        document.getElementById('menu-verify').addEventListener('click', () => {
            this.closeSideMenu();
            this.openVerifyModal();
        });

        document.getElementById('menu-team').addEventListener('click', () => {
            this.closeSideMenu();
            this.openTeamModal();
        });

        document.getElementById('menu-about').addEventListener('click', () => {
            this.closeSideMenu();
            this.openAboutModal();
        });

        // 闪光灯
        document.getElementById('btn-flash').addEventListener('click', () => {
            const mode = this.camera.toggleFlash();
            const btn = document.getElementById('btn-flash');
            const slash = btn.querySelector('.flash-slash');
            const modeText = { off: '已关闭', on: '已开启', auto: '自动' };
            btn.classList.toggle('active', mode !== 'off');
            if (slash) slash.classList.toggle('hidden', mode !== 'off');
            this.showToast(`闪光灯${modeText[mode]}`);
        });

        // 照片验真
        document.getElementById('btn-verify').addEventListener('click', () => {
            this.openVerifyModal();
        });

        // 验真模态框关闭
        document.getElementById('btn-close-verify').addEventListener('click', () => {
            this.closeVerifyModal();
        });

        document.getElementById('verify-modal').addEventListener('click', (e) => {
            if (e.target.id === 'verify-modal') {
                this.closeVerifyModal();
            }
        });

        // 验真输入框
        document.getElementById('btn-verify-code').addEventListener('click', () => {
            this.verifyPhotoByCode();
        });

        document.getElementById('verify-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyPhotoByCode();
            }
        });

        // 防伪设置开关
        document.getElementById('toggle-brand').addEventListener('change', (e) => {
            this.watermark.updateConfig('brandEnabled', e.target.checked);
            this.updateWatermarkPreview();
            this.saveSettings();
            this.showToast(e.target.checked ? '品牌水印已开启' : '品牌水印已关闭');
        });

        document.getElementById('toggle-antifake').addEventListener('change', (e) => {
            this.watermark.updateConfig('antiFakeEnabled', e.target.checked);
            this.updateWatermarkPreview();
            this.saveSettings();
            this.showToast(e.target.checked ? '防伪码已开启' : '防伪码已关闭');
        });

        // 切换摄像头
        document.getElementById('btn-switch-camera').addEventListener('click', async () => {
            try {
                await this.camera.switchCamera();
                this.showToast('已切换摄像头');
            } catch (err) {
                this.showToast('切换摄像头失败');
            }
        });

        // 变焦控制
        document.querySelectorAll('.zoom-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.zoom-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const zoom = item.dataset.zoom;
                this.applyZoom(zoom);
            });
        });

        // 拍照按钮
        document.getElementById('btn-capture').addEventListener('click', () => {
            this.capturePhoto();
        });

        // 水印编辑按钮
        document.getElementById('btn-watermark-edit').addEventListener('click', () => {
            this.toggleSettingsPanel(true);
        });

        // 相册按钮
        document.getElementById('btn-gallery').addEventListener('click', () => {
            this.openGallery();
        });

        document.getElementById('btn-close-gallery').addEventListener('click', () => {
            this.closeGallery();
        });

        document.getElementById('btn-clear-gallery').addEventListener('click', () => {
            this.clearGallery();
        });

        // 预览模态框
        document.getElementById('btn-back-camera').addEventListener('click', () => {
            this.closePreview();
        });

        document.getElementById('btn-save').addEventListener('click', () => {
            this.savePhoto();
        });

        document.getElementById('btn-retake').addEventListener('click', () => {
            this.closePreview();
        });

        document.getElementById('btn-share').addEventListener('click', () => {
            this.sharePhoto();
        });

        // 设置面板关闭
        document.getElementById('btn-close-settings').addEventListener('click', () => {
            this.toggleSettingsPanel(false);
        });

        document.getElementById('settings-panel').addEventListener('click', (e) => {
            if (e.target.id === 'settings-panel') {
                this.toggleSettingsPanel(false);
            }
        });

        // 模板选择
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.watermark.updateConfig('template', item.dataset.template);
                this.updateWatermarkPreview();
            });
        });

        // 时间设置
        document.getElementById('toggle-custom-time').addEventListener('change', (e) => {
            const enabled = e.target.checked;
            document.getElementById('time-settings').classList.toggle('hidden', !enabled);
            this.watermark.updateConfig('useCustomTime', enabled);
            if (!enabled) {
                this.watermark.updateConfig('customTime', null);
            } else {
                const now = new Date();
                const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                document.getElementById('custom-date').value = date;
                document.getElementById('custom-time').value = time;
                this.watermark.setCustomTime(date, time);
            }
            this.updateWatermarkPreview();
        });

        document.getElementById('custom-date').addEventListener('change', (e) => {
            const date = e.target.value;
            const time = document.getElementById('custom-time').value || '12:00';
            this.watermark.setCustomTime(date, time);
            this.updateWatermarkPreview();
        });

        document.getElementById('custom-time').addEventListener('change', (e) => {
            const time = e.target.value;
            const date = document.getElementById('custom-date').value || this.getTodayDate();
            this.watermark.setCustomTime(date, time);
            this.updateWatermarkPreview();
        });

        document.getElementById('btn-sync-time').addEventListener('click', () => {
            const { date, time } = this.watermark.syncCurrentTime();
            document.getElementById('custom-date').value = date;
            document.getElementById('custom-time').value = time;
            this.updateWatermarkPreview();
            this.showToast('已同步当前时间');
        });

        // 位置设置
        document.getElementById('toggle-custom-location').addEventListener('change', (e) => {
            const enabled = e.target.checked;
            document.getElementById('location-settings').classList.toggle('hidden', !enabled);
            this.watermark.updateConfig('useCustomLocation', enabled);
            if (enabled) {
                this.getCurrentLocation();
            } else {
                this.watermark.updateConfig('customLocation', null);
                this.updateWatermarkPreview();
            }
        });

        ['custom-province', 'custom-city', 'custom-address', 'custom-coords'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateCustomLocation();
            });
        });

        document.getElementById('btn-get-location').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // 天气设置
        document.getElementById('toggle-custom-weather').addEventListener('change', (e) => {
            const enabled = e.target.checked;
            document.getElementById('weather-settings').classList.toggle('hidden', !enabled);
            this.updateWeather();
        });

        // 天气模式切换
        document.querySelectorAll('.weather-mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.weather-mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const mode = tab.dataset.mode;
                this.switchWeatherMode(mode);
            });
        });

        // 刷新天气按钮
        document.getElementById('btn-refresh-weather').addEventListener('click', () => {
            this.refreshAutoWeather();
        });

        document.getElementById('custom-weather').addEventListener('input', () => {
            this.updateWeather();
        });

        document.getElementById('custom-temp').addEventListener('input', () => {
            this.updateWeather();
        });

        // 自定义文字
        document.getElementById('toggle-custom-text').addEventListener('change', (e) => {
            const enabled = e.target.checked;
            document.getElementById('text-settings').classList.toggle('hidden', !enabled);
            this.watermark.updateConfig('useCustomText', enabled);
            this.updateWatermarkPreview();
        });

        document.getElementById('custom-text').addEventListener('input', (e) => {
            this.watermark.updateConfig('customText', e.target.value);
            this.updateWatermarkPreview();
        });

        // 水印样式
        document.getElementById('watermark-position').addEventListener('change', (e) => {
            this.watermark.updateConfig('position', e.target.value);
            this.updateWatermarkPreview();
        });

        document.getElementById('watermark-font-size').addEventListener('change', (e) => {
            this.watermark.updateConfig('fontSize', e.target.value);
            this.updateWatermarkPreview();
        });

        document.getElementById('watermark-opacity').addEventListener('input', (e) => {
            this.watermark.updateConfig('opacity', parseInt(e.target.value));
            this.updateWatermarkPreview();
        });

        // 模式标签切换
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentMode = mode;

                switch (mode) {
                    case 'photo':
                        break;
                    case 'video':
                        this.openVideoMode();
                        break;
                    case 'collage':
                        this.openCollageModal();
                        break;
                    case 'report':
                        this.openReportModal();
                        break;
                    case 'edit':
                        this.openPhotoEditMode();
                        break;
                }
            });
        });

        // 快捷操作
        document.querySelector('.quick-left').addEventListener('click', () => {
            this.openLoginModal();
        });

        document.querySelector('.quick-right').addEventListener('click', () => {
            this.openTeamModal();
        });

        // VIP标识
        document.querySelector('.vip-badge').addEventListener('click', () => {
            this.openVipModal();
        });

        // 关于页面模态框
        document.querySelector('.about-close-btn').addEventListener('click', () => {
            this.closeAboutModal();
        });
        document.getElementById('about-modal').addEventListener('click', (e) => {
            if (e.target.id === 'about-modal') this.closeAboutModal();
        });
        document.getElementById('about-link-privacy').addEventListener('click', () => {
            this.showToast('隐私政策：我们严格保护您的个人隐私数据');
        });
        document.getElementById('about-link-terms').addEventListener('click', () => {
            this.showToast('用户协议：使用本应用即表示同意服务条款');
        });
        document.getElementById('about-link-feedback').addEventListener('click', () => {
            this.showToast('感谢反馈！请发送邮件至 support@moxi.camera');
        });

        // 登录/注册模态框
        document.querySelector('.login-close-btn').addEventListener('click', () => {
            this.closeLoginModal();
        });
        document.getElementById('login-modal').addEventListener('click', (e) => {
            if (e.target.id === 'login-modal') this.closeLoginModal();
        });
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchLoginTab(tab.dataset.tab);
            });
        });
        document.getElementById('btn-login-submit').addEventListener('click', () => {
            this.handleLoginSubmit();
        });

        // VIP模态框
        document.querySelector('.vip-close-btn').addEventListener('click', () => {
            this.closeVipModal();
        });
        document.getElementById('vip-modal').addEventListener('click', (e) => {
            if (e.target.id === 'vip-modal') this.closeVipModal();
        });
        document.querySelectorAll('.vip-plan').forEach(plan => {
            plan.addEventListener('click', () => {
                document.querySelectorAll('.vip-plan').forEach(p => p.classList.remove('selected'));
                plan.classList.add('selected');
                this.selectedVipPlan = plan.dataset.plan;
            });
        });
        document.getElementById('btn-vip-subscribe').addEventListener('click', () => {
            this.handleVipSubscribe();
        });

        // 团队模态框
        document.querySelector('.team-close-btn').addEventListener('click', () => {
            this.closeTeamModal();
        });
        document.getElementById('team-modal').addEventListener('click', (e) => {
            if (e.target.id === 'team-modal') this.closeTeamModal();
        });
        document.getElementById('btn-create-team').addEventListener('click', () => {
            this.showTeamForm('create');
        });
        document.getElementById('btn-join-team').addEventListener('click', () => {
            this.showTeamForm('join');
        });
        document.getElementById('btn-confirm-create-team').addEventListener('click', () => {
            this.handleCreateTeam();
        });
        document.getElementById('btn-confirm-join-team').addEventListener('click', () => {
            this.handleJoinTeam();
        });
        document.getElementById('btn-copy-team-code').addEventListener('click', () => {
            this.copyTeamCode();
        });
        document.getElementById('btn-leave-team').addEventListener('click', () => {
            this.handleLeaveTeam();
        });

        // 拼图模态框
        document.querySelector('.collage-close-btn').addEventListener('click', () => {
            this.closeCollageModal();
        });
        document.querySelectorAll('.collage-layout-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.collage-layout-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.collageLayout = parseInt(item.dataset.layout);
                this.renderCollagePreview();
            });
        });
        document.getElementById('btn-collage-add-photo').addEventListener('click', () => {
            this.addCollagePhoto();
        });
        document.getElementById('btn-collage-export').addEventListener('click', () => {
            this.exportCollage();
        });

        // 汇报模态框
        document.querySelector('.report-close-btn').addEventListener('click', () => {
            this.closeReportModal();
        });
        document.getElementById('btn-report-add-photo').addEventListener('click', () => {
            this.addReportPhoto();
        });
        document.getElementById('btn-report-export').addEventListener('click', () => {
            this.exportReport();
        });
        document.getElementById('report-title').addEventListener('input', () => {
            this.renderReportPreview();
        });
        document.getElementById('report-content').addEventListener('input', () => {
            this.renderReportPreview();
        });
    }

    updateWeather() {
        const enabled = document.getElementById('toggle-custom-weather').checked;
        const mode = this.watermark.config.weatherMode || 'auto';

        if (mode === 'manual') {
            const text = document.getElementById('custom-weather').value || '晴';
            const temp = document.getElementById('custom-temp').value || '27°C';
            this.watermark.setWeather(enabled, text, temp);
        } else {
            // 自动模式：使用已缓存的天气数据
            if (enabled && this.weather.currentWeather) {
                this.watermark.setWeatherFromAuto(this.weather.currentWeather);
                this.watermark.config.weather.enabled = true;
            } else {
                this.watermark.config.weather.enabled = enabled;
            }
        }
        this.updateWatermarkPreview();
    }

    /**
     * 切换天气模式（自动/手动）
     */
    switchWeatherMode(mode) {
        this.watermark.setWeatherMode(mode);

        if (mode === 'auto') {
            document.getElementById('weather-auto-panel').classList.remove('hidden');
            document.getElementById('weather-manual-panel').classList.add('hidden');
            // 如果已有天气数据，直接更新
            if (this.weather.currentWeather) {
                this.updateAutoWeatherDisplay();
                this.updateWeather();
            } else {
                // 尝试获取天气
                this.refreshAutoWeather();
            }
        } else {
            document.getElementById('weather-auto-panel').classList.add('hidden');
            document.getElementById('weather-manual-panel').classList.remove('hidden');
            this.updateWeather();
        }
        this.saveSettings();
    }

    /**
     * 刷新自动天气获取
     */
    async refreshAutoWeather() {
        const descEl = document.getElementById('weather-auto-desc');
        const detailEl = document.getElementById('weather-auto-detail');
        const iconEl = document.getElementById('weather-auto-icon');
        const refreshBtn = document.getElementById('btn-refresh-weather');

        descEl.textContent = '正在获取天气...';
        detailEl.textContent = '请稍候';
        refreshBtn.disabled = true;

        // 尝试从已保存的坐标获取
        let lat, lon;
        const coordsEl = document.getElementById('custom-coords');
        if (coordsEl && coordsEl.value) {
            const parts = coordsEl.value.split(',');
            lat = parseFloat(parts[0]);
            lon = parseFloat(parts[1]);
        }

        // 如果没有坐标，尝试通过定位获取
        if (!lat || !lon) {
            if (navigator.geolocation) {
                descEl.textContent = '正在获取定位...';
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        lat = position.coords.latitude;
                        lon = position.coords.longitude;
                        await this._fetchAndDisplayWeather(lat, lon, descEl, detailEl, iconEl, refreshBtn);
                    },
                    async (err) => {
                        // 定位失败，尝试用wttr.in基于IP获取
                        descEl.textContent = '定位失败，尝试基于IP获取...';
                        await this._fetchWeatherByIP(descEl, detailEl, iconEl, refreshBtn);
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
                );
            } else {
                await this._fetchWeatherByIP(descEl, detailEl, iconEl, refreshBtn);
            }
        } else {
            await this._fetchAndDisplayWeather(lat, lon, descEl, detailEl, iconEl, refreshBtn);
        }
    }

    /**
     * 获取并显示天气
     */
    async _fetchAndDisplayWeather(lat, lon, descEl, detailEl, iconEl, refreshBtn) {
        try {
            const weather = await this.weather.getWeatherByCoords(lat, lon);
            if (weather) {
                this.watermark.setWeatherFromAuto(weather);
                this.updateAutoWeatherDisplay();
                this.updateWatermarkPreview();
                this.showToast(`天气已更新: ${weather.text} ${weather.temp}`);
            } else {
                descEl.textContent = '获取天气失败';
                detailEl.textContent = '请检查网络后重试';
            }
        } catch (err) {
            console.warn('天气获取失败:', err);
            descEl.textContent = '获取天气失败';
            detailEl.textContent = '请检查网络后重试';
        } finally {
            refreshBtn.disabled = false;
        }
    }

    /**
     * 基于IP获取天气（定位失败时的备用方案）
     */
    async _fetchWeatherByIP(descEl, detailEl, iconEl, refreshBtn) {
        try {
            // 使用wttr.in自动检测位置
            const url = 'https://wttr.in/?format=j1';
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000)
            });
            if (!response.ok) throw new Error('IP天气获取失败');
            const data = await response.json();
            if (data && data.current_condition && data.current_condition[0]) {
                const cur = data.current_condition[0];
                const temp = parseInt(cur.temp_C) || 27;
                const weatherDesc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value || '').trim();
                const text = this.weather._translateWttrDesc(weatherDesc, parseInt(cur.weatherCode));
                const weather = {
                    text: text,
                    icon: this.weather._getIconByDesc(text),
                    category: this.weather._getCategoryByDesc(text),
                    temp: `${temp}°C`,
                    tempValue: temp,
                    humidity: parseInt(cur.humidity) || null,
                    apparentTemp: parseInt(cur.FeelsLikeC) || null,
                    isDay: 1,
                    windSpeed: parseInt(cur.windspeedKmph) || null,
                    source: 'wttr.in(ip)',
                    updateTime: new Date().toISOString()
                };
                this.weather.currentWeather = weather;
                this.weather.lastFetchTime = Date.now();
                this.watermark.setWeatherFromAuto(weather);
                this.updateAutoWeatherDisplay();
                this.updateWatermarkPreview();
                this.showToast(`天气已更新: ${weather.text} ${weather.temp}`);
            }
        } catch (err) {
            console.warn('IP天气获取失败:', err);
            descEl.textContent = '获取天气失败';
            detailEl.textContent = '请检查网络或手动输入';
        } finally {
            refreshBtn.disabled = false;
        }
    }

    /**
     * 更新自动天气面板的显示
     */
    updateAutoWeatherDisplay() {
        const w = this.weather.currentWeather;
        if (!w) return;

        const iconEl = document.getElementById('weather-auto-icon');
        const descEl = document.getElementById('weather-auto-desc');
        const detailEl = document.getElementById('weather-auto-detail');

        if (iconEl) iconEl.textContent = w.icon || '🌡️';
        if (descEl) descEl.textContent = `${w.text} ${w.temp}`;

        let detail = '';
        if (w.humidity != null) detail += `湿度${w.humidity}% `;
        if (w.windSpeed != null) detail += `风速${w.windSpeed}km/h `;
        if (w.apparentTemp != null) detail += `体感${w.apparentTemp}°C `;
        detail += `| ${w.source}`;
        if (detailEl) detailEl.textContent = detail.trim();
    }

    /**
     * 定位成功后自动获取天气
     */
    async _fetchWeatherAfterLocation(lat, lon) {
        try {
            const weather = await this.weather.getWeatherByCoords(lat, lon);
            if (weather) {
                this.watermark.setWeatherFromAuto(weather);
                this.updateAutoWeatherDisplay();
                this.updateWatermarkPreview();
            }
        } catch (err) {
            console.warn('定位后天气获取失败:', err);
        }
    }

    applyZoom(zoom) {
        if (zoom === 'wide') {
            this.currentZoom = 0.5;
            this.showToast('广角模式');
        } else {
            this.currentZoom = parseFloat(zoom);
            this.showToast(`${zoom}x 变焦`);
        }
        
        // 尝试应用变焦到视频流
        if (this.camera.stream) {
            const track = this.camera.stream.getVideoTracks()[0];
            if (track) {
                const constraints = { advanced: [{ zoom: this.currentZoom }] };
                track.applyConstraints(constraints).catch(() => {
                    // 浏览器不支持硬件变焦，使用CSS缩放
                    const video = document.getElementById('camera-video');
                    video.style.transform = `scale(${this.currentZoom})`;
                    video.style.transformOrigin = 'center';
                });
            }
        }
    }

    updateWatermarkPreview() {
        if (this.watermarkOverlay) {
            this.watermark.updatePreview(this.watermarkOverlay);
        }
        if (this.brandOverlay) {
            this.watermark.updateBrandPreview(this.brandOverlay);
        }
        // 更新设置面板中的防伪码预览
        const previewEl = document.getElementById('current-antifake-preview');
        if (previewEl) {
            previewEl.textContent = this.watermark.getAntiFakeCode();
        }
    }

    startTimeUpdateTimer() {
        this.watermarkUpdateInterval = setInterval(() => {
            if (!this.watermark.config.useCustomTime) {
                this.updateWatermarkPreview();
            }
        }, 1000);

        // 每10分钟自动刷新天气
        this.weatherRefreshInterval = setInterval(() => {
            if (this.watermark.config.weatherMode !== 'manual' && 
                this.watermark.config.weather?.enabled !== false) {
                this.refreshAutoWeather();
            }
        }, 10 * 60 * 1000);
    }

    capturePhoto() {
        try {
            const captureBtn = document.getElementById('btn-capture');
            captureBtn.classList.add('capturing');
            this.flashEffect();

            // 拍照前重置变焦
            const video = document.getElementById('camera-video');
            const prevTransform = video.style.transform;
            video.style.transform = '';

            // 为本次拍照生成新的防伪码
            const antiFakeCode = this.watermark.generateAntiFakeCode();
            const captureTime = new Date().toISOString();
            const location = this.watermark.getLocation();
            const timeData = this.watermark.getCurrentTime();

            const dataUrl = this.camera.capture(this.watermark);
            this.currentPhoto = dataUrl;
            this.currentPhotoMeta = {
                antiFakeCode: antiFakeCode,
                captureTime: captureTime,
                location: location.full || `${location.province}${location.city}${location.address}` || '未知位置',
                watermarkTime: timeData.fullDate || '',
                weather: this.watermark.getWeather(),
                weatherDetail: this.watermark.getWeatherDetail()
            };

            // 恢复变焦
            video.style.transform = prevTransform;

            document.getElementById('preview-image').src = dataUrl;
            document.getElementById('preview-modal').classList.remove('hidden');

            // 更新预览中的防伪信息
            this.updatePreviewAntiFakeInfo();

            setTimeout(() => {
                captureBtn.classList.remove('capturing');
            }, 300);

            // 拍照后生成新的防伪码供下次使用
            this.watermark.generateAntiFakeCode();
            this.updateWatermarkPreview();
        } catch (err) {
            console.error('拍照失败:', err);
            this.showToast('拍照失败: ' + err.message);
        }
    }

    /**
     * 更新预览模态框中的防伪信息
     */
    updatePreviewAntiFakeInfo() {
        const infoEl = document.getElementById('preview-antifake-info');
        if (infoEl && this.currentPhotoMeta) {
            const meta = this.currentPhotoMeta;
            infoEl.innerHTML = `
                <div class="antifake-row">
                    <span class="antifake-icon">✓</span>
                    <span class="antifake-label">防伪验证</span>
                    <span class="antifake-code">${meta.antiFakeCode}</span>
                </div>
                <div class="antifake-detail">
                    <span>拍摄时间：${meta.watermarkTime || '—'}</span>
                </div>
                <div class="antifake-detail">
                    <span>拍摄位置：${meta.location || '—'}</span>
                </div>
                <div class="antifake-detail">
                    <span>天气信息：${meta.weather || '—'}</span>
                </div>
                ${meta.weatherDetail ? `
                <div class="antifake-detail antifake-weather-detail">
                    <span>${meta.weatherDetail.icon || ''} ${meta.weatherDetail.source === 'open-meteo' ? '实时' : '实时'}数据</span>
                    ${meta.weatherDetail.humidity != null ? `<span>湿度${meta.weatherDetail.humidity}%</span>` : ''}
                    ${meta.weatherDetail.windSpeed != null ? `<span>风速${meta.weatherDetail.windSpeed}km/h</span>` : ''}
                    ${meta.weatherDetail.apparentTemp != null ? `<span>体感${meta.weatherDetail.apparentTemp}°C</span>` : ''}
                </div>` : ''}
            `;
        }
    }

    flashEffect() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #fff; z-index: 999; pointer-events: none;
            opacity: 0.8; transition: opacity 0.3s ease;
        `;
        document.body.appendChild(flash);
        requestAnimationFrame(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        });
    }

    closePreview() {
        document.getElementById('preview-modal').classList.add('hidden');
        this.currentPhoto = null;
        this.currentPhotoMeta = null;
    }

    /**
     * 打开照片验真模态框
     */
    openVerifyModal() {
        const modal = document.getElementById('verify-modal');
        const resultEl = document.getElementById('verify-result');
        const inputEl = document.getElementById('verify-code-input');
        if (modal) {
            modal.classList.remove('hidden');
            this.verifyModalOpen = true;
            if (resultEl) resultEl.innerHTML = '';
            if (inputEl) inputEl.value = '';
            setTimeout(() => { if (inputEl) inputEl.focus(); }, 300);
        }
    }

    /**
     * 关闭照片验真模态框
     */
    closeVerifyModal() {
        const modal = document.getElementById('verify-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.verifyModalOpen = false;
        }
    }

    /**
     * 通过防伪码验证照片
     */
    verifyPhotoByCode() {
        const inputEl = document.getElementById('verify-code-input');
        const resultEl = document.getElementById('verify-result');
        const code = inputEl ? inputEl.value.trim().toUpperCase() : '';

        if (!code) {
            this.showVerifyResult('error', '请输入防伪码', '防伪码不能为空');
            return;
        }

        if (code.length < 12) {
            this.showVerifyResult('error', '防伪码格式错误', '防伪码应为13位字符');
            return;
        }

        // 在已保存的照片中查找匹配的防伪码
        const matchedPhoto = this.photos.find(p => p.antiFakeCode === code);

        if (matchedPhoto) {
            const captureDate = new Date(matchedPhoto.timestamp);
            const dateStr = `${captureDate.getFullYear()}-${String(captureDate.getMonth() + 1).padStart(2, '0')}-${String(captureDate.getDate()).padStart(2, '0')} ${String(captureDate.getHours()).padStart(2, '0')}:${String(captureDate.getMinutes()).padStart(2, '0')}`;
            this.showVerifyResult('success', '验证通过', `
                <div class="verify-detail-row"><span class="verify-detail-label">防伪码</span><span class="verify-detail-value">${matchedPhoto.antiFakeCode}</span></div>
                <div class="verify-detail-row"><span class="verify-detail-label">保存时间</span><span class="verify-detail-value">${dateStr}</span></div>
                <div class="verify-detail-row"><span class="verify-detail-label">水印时间</span><span class="verify-detail-value">${matchedPhoto.watermarkTime || '—'}</span></div>
                <div class="verify-detail-row"><span class="verify-detail-label">拍摄位置</span><span class="verify-detail-value">${matchedPhoto.location || '—'}</span></div>
            `);
            // 显示匹配的照片缩略图
            const thumbEl = document.getElementById('verify-photo-thumb');
            if (thumbEl) {
                thumbEl.innerHTML = `<img src="${matchedPhoto.dataUrl}" alt="验证照片">`;
                thumbEl.classList.remove('hidden');
            }
        } else {
            this.showVerifyResult('error', '验证未通过', `未找到防伪码 <strong>${code}</strong> 对应的照片记录。请确认防伪码是否正确，或该照片是否在本设备上拍摄保存。`);
            const thumbEl = document.getElementById('verify-photo-thumb');
            if (thumbEl) {
                thumbEl.innerHTML = '';
                thumbEl.classList.add('hidden');
            }
        }
    }

    /**
     * 显示验真结果
     */
    showVerifyResult(type, title, detail) {
        const resultEl = document.getElementById('verify-result');
        if (!resultEl) return;
        const icon = type === 'success' ? '✓' : '✗';
        resultEl.innerHTML = `
            <div class="verify-result-card verify-${type}">
                <div class="verify-result-icon">${icon}</div>
                <div class="verify-result-title">${title}</div>
                <div class="verify-result-detail">${detail}</div>
            </div>
        `;
    }

    savePhoto() {
        if (!this.currentPhoto) {
            this.showToast('没有可保存的照片');
            return;
        }

        const photo = {
            id: Date.now(),
            dataUrl: this.currentPhoto,
            timestamp: new Date().toISOString(),
            antiFakeCode: this.currentPhotoMeta ? this.currentPhotoMeta.antiFakeCode : '',
            location: this.currentPhotoMeta ? this.currentPhotoMeta.location : '',
            watermarkTime: this.currentPhotoMeta ? this.currentPhotoMeta.watermarkTime : '',
            weather: this.currentPhotoMeta ? this.currentPhotoMeta.weather : ''
        };
        this.photos.unshift(photo);
        this.savePhotosToStorage();
        this.updateGalleryThumbnail();
        this.downloadPhoto(this.currentPhoto);
        this.showToast('照片已保存（含防伪信息）');
        this.closePreview();
    }

    downloadPhoto(dataUrl) {
        const link = document.createElement('a');
        const now = new Date();
        const fileName = `moxi_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.jpg`;
        link.download = fileName;
        link.href = dataUrl;
        link.click();
    }

    async sharePhoto() {
        if (!this.currentPhoto) return;
        try {
            if (navigator.share) {
                const response = await fetch(this.currentPhoto);
                const blob = await response.blob();
                const file = new File([blob], 'moxi_photo.jpg', { type: 'image/jpeg' });
                await navigator.share({
                    title: '今日水印相机',
                    text: '使用今日水印相机拍摄',
                    files: [file]
                });
            } else {
                this.downloadPhoto(this.currentPhoto);
                this.showToast('已保存到本地');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                this.showToast('分享失败，已保存到本地');
                this.downloadPhoto(this.currentPhoto);
            }
        }
    }

    openSideMenu() {
        document.getElementById('side-menu').classList.remove('hidden');
    }

    closeSideMenu() {
        document.getElementById('side-menu').classList.add('hidden');
    }

    openGallery() {
        const modal = document.getElementById('gallery-modal');
        const content = document.getElementById('gallery-content');
        
        if (this.photos.length === 0) {
            content.innerHTML = `
                <div class="gallery-empty">
                    <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" opacity="0.3">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <p>暂无照片</p>
                </div>
            `;
        } else {
            content.innerHTML = '<div class="gallery-grid">' + 
                this.photos.map(photo => `
                    <div class="gallery-item" data-id="${photo.id}">
                        <img src="${photo.dataUrl}" alt="照片">
                        ${photo.antiFakeCode ? `<div class="gallery-antifake-badge">✓ ${photo.antiFakeCode.substring(0, 6)}...</div>` : ''}
                        <div class="delete-icon" data-id="${photo.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </div>
                    </div>
                `).join('') + 
            '</div>';

            content.querySelectorAll('.gallery-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-icon')) {
                        e.stopPropagation();
                        this.deletePhoto(parseInt(item.dataset.id));
                    } else {
                        this.viewPhoto(parseInt(item.dataset.id));
                    }
                });
            });
        }

        modal.classList.remove('hidden');
    }

    closeGallery() {
        document.getElementById('gallery-modal').classList.add('hidden');
    }

    viewPhoto(id) {
        const photo = this.photos.find(p => p.id === id);
        if (photo) {
            this.currentPhoto = photo.dataUrl;
            this.currentPhotoMeta = {
                antiFakeCode: photo.antiFakeCode || '',
                captureTime: photo.timestamp || '',
                location: photo.location || '',
                watermarkTime: photo.watermarkTime || '',
                weather: photo.weather || ''
            };
            document.getElementById('preview-image').src = photo.dataUrl;
            document.getElementById('preview-modal').classList.remove('hidden');
            this.updatePreviewAntiFakeInfo();
            this.closeGallery();
        }
    }

    deletePhoto(id) {
        this.photos = this.photos.filter(p => p.id !== id);
        this.savePhotosToStorage();
        this.updateGalleryThumbnail();
        this.openGallery();
        this.showToast('已删除');
    }

    clearGallery() {
        if (this.photos.length === 0) {
            this.showToast('相册已为空');
            return;
        }
        if (confirm('确定要清空所有照片吗？')) {
            this.photos = [];
            this.savePhotosToStorage();
            this.updateGalleryThumbnail();
            this.openGallery();
            this.showToast('已清空相册');
        }
    }

    updateGalleryThumbnail() {
        const thumbnail = document.querySelector('.gallery-thumbnail');
        if (this.photos.length > 0) {
            thumbnail.innerHTML = `<img src="${this.photos[0].dataUrl}" alt="最近照片">`;
        } else {
            thumbnail.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#999">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
            `;
        }
    }

    getCurrentLocation() {
        const statusEl = document.getElementById('location-status');
        
        if (!navigator.geolocation) {
            statusEl.textContent = '您的浏览器不支持定位功能';
            statusEl.className = 'location-status error';
            return;
        }

        statusEl.textContent = '正在获取定位...';
        statusEl.className = 'location-status loading';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(4);
                const lon = position.coords.longitude.toFixed(4);
                
                this.reverseGeocode(lat, lon).then(address => {
                    if (address) {
                        document.getElementById('custom-province').value = address.province || '';
                        document.getElementById('custom-city').value = address.city || '';
                        document.getElementById('custom-address').value = address.address || '';
                        document.getElementById('custom-coords').value = `${lat},${lon}`;
                        
                        this.updateCustomLocation();
                        statusEl.textContent = `定位成功: ${address.full || lat + ',' + lon}`;
                        statusEl.className = 'location-status success';
                    } else {
                        document.getElementById('custom-coords').value = `${lat},${lon}`;
                        this.updateCustomLocation();
                        statusEl.textContent = `定位成功: ${lat},${lon}`;
                        statusEl.className = 'location-status success';
                    }
                    // 定位成功后自动获取天气（仅自动模式）
                    if (this.watermark.config.weatherMode === 'auto') {
                        this._fetchWeatherAfterLocation(parseFloat(lat), parseFloat(lon));
                    }
                }).catch(() => {
                    document.getElementById('custom-coords').value = `${lat},${lon}`;
                    this.updateCustomLocation();
                    statusEl.textContent = `定位成功: ${lat},${lon}`;
                    statusEl.className = 'location-status success';
                    // 定位成功后自动获取天气
                    if (this.watermark.config.weatherMode === 'auto') {
                        this._fetchWeatherAfterLocation(parseFloat(lat), parseFloat(lon));
                    }
                });
            },
            (err) => {
                let msg = '定位失败';
                switch (err.code) {
                    case 1: msg = '定位权限被拒绝'; break;
                    case 2: msg = '定位不可用'; break;
                    case 3: msg = '定位超时'; break;
                }
                statusEl.textContent = msg + '，请手动输入位置';
                statusEl.className = 'location-status error';
                // 定位失败时尝试IP定位
                this._fallbackIPLocation();
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        );
    }

    /**
     * 应用定位结果到水印（自动模式专用）
     * 关键：自动设置 useCustomLocation = true 并勾选开关
     */
    _applyLocationResult(lat, lon, address) {
        // 填充表单
        document.getElementById('custom-coords').value = `${lat},${lon}`;
        if (address) {
            document.getElementById('custom-province').value = address.province || '';
            document.getElementById('custom-city').value = address.city || '';
            document.getElementById('custom-address').value = address.address || '';
        }

        // 关键修复：启用自定义位置，否则 getLocation() 返回空
        this.watermark.updateConfig('useCustomLocation', true);

        // 同步UI开关状态
        const toggle = document.getElementById('toggle-custom-location');
        if (toggle && !toggle.checked) {
            toggle.checked = true;
            document.getElementById('location-settings').classList.remove('hidden');
        }

        this.updateCustomLocation();

        // 自动获取天气
        if (this.watermark.config.weatherMode === 'auto') {
            this._fetchWeatherAfterLocation(parseFloat(lat), parseFloat(lon));
        }
    }

    /**
     * 启动时自动获取定位（静默模式，不显示状态）
     */
    autoGetLocation() {
        if (!navigator.geolocation) {
            // 浏览器不支持定位，直接走IP定位
            this._fallbackIPLocation();
            return;
        }

        // 先尝试低精度快速定位
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(4);
                const lon = position.coords.longitude.toFixed(4);

                this.reverseGeocode(lat, lon).then(address => {
                    this._applyLocationResult(lat, lon, address);
                }).catch(() => {
                    this._applyLocationResult(lat, lon, null);
                });
            },
            (err) => {
                console.warn('自动定位失败:', err.message);
                // 尝试高精度定位
                this._retryHighAccuracyLocation();
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
    }

    /**
     * 高精度定位重试
     */
    _retryHighAccuracyLocation() {
        if (!navigator.geolocation) {
            this._fallbackIPLocation();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(4);
                const lon = position.coords.longitude.toFixed(4);

                this.reverseGeocode(lat, lon).then(address => {
                    this._applyLocationResult(lat, lon, address);
                }).catch(() => {
                    this._applyLocationResult(lat, lon, null);
                });
            },
            (err) => {
                console.warn('高精度定位也失败:', err.message);
                // 最终备用：IP定位
                this._fallbackIPLocation();
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
        );
    }

    /**
     * IP定位备用方案（通过免费API获取大致位置）
     */
    async _fallbackIPLocation() {
        // 方案1: ipapi.co
        try {
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                signal: AbortSignal.timeout(6000)
            });
            if (!response.ok) throw new Error('ipapi response not ok');
            const data = await response.json();
            if (data && data.latitude && data.longitude) {
                const lat = data.latitude.toFixed(4);
                const lon = data.longitude.toFixed(4);
                const address = data.city ? {
                    province: data.region || '',
                    city: data.city || '',
                    address: ''
                } : null;
                this._applyLocationResult(lat, lon, address);
                console.log('IP定位成功(ipapi.co):', data.city);
                return;
            }
        } catch (err) {
            console.warn('ipapi.co定位失败:', err.message);
        }

        // 方案2: ipinfo.io
        try {
            const resp2 = await fetch('https://ipinfo.io/json', {
                method: 'GET',
                signal: AbortSignal.timeout(6000)
            });
            if (!resp2.ok) throw new Error('ipinfo response not ok');
            const data2 = await resp2.json();
            if (data2 && data2.loc) {
                const [lat, lon] = data2.loc.split(',');
                const fLat = parseFloat(lat).toFixed(4);
                const fLon = parseFloat(lon).toFixed(4);
                const address = data2.city ? {
                    province: data2.region || '',
                    city: data2.city || '',
                    address: ''
                } : null;
                this._applyLocationResult(fLat, fLon, address);
                console.log('IP定位成功(ipinfo.io):', data2.city);
                return;
            }
        } catch (err2) {
            console.warn('ipinfo.io定位也失败:', err2.message);
        }

        // 方案3: 使用默认城市坐标（北京）作为最后兜底
        console.warn('所有定位方案均失败，使用默认位置');
        this._applyLocationResult('39.9042', '116.4074', {
            province: '北京市',
            city: '北京市',
            address: ''
        });
    }

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-CN`,
                { method: 'GET', headers: { 'Accept': 'application/json' } }
            );
            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                const province = addr.state || addr.province || '';
                const city = addr.city || addr.town || addr.county || addr.district || '';
                const address = addr.suburb || addr.village || addr.road || '';
                const full = data.display_name || '';
                return { province, city, address, full: `${province}${city}${address}`.trim() || full };
            }
        } catch (err) {
            console.warn('逆地理编码失败:', err);
        }
        return null;
    }

    updateCustomLocation() {
        const province = document.getElementById('custom-province').value;
        const city = document.getElementById('custom-city').value;
        const address = document.getElementById('custom-address').value;
        const coords = document.getElementById('custom-coords').value;
        this.watermark.setCustomLocation(province, city, address, coords);
        this.updateWatermarkPreview();
    }

    getTodayDate() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    toggleSettingsPanel(show) {
        const panel = document.getElementById('settings-panel');
        this.settingsPanelOpen = show;
        panel.classList.toggle('hidden', !show);
    }

    /* ========== 关于页面 ========== */
    openAboutModal() {
        document.getElementById('about-modal').classList.remove('hidden');
    }

    closeAboutModal() {
        document.getElementById('about-modal').classList.add('hidden');
    }

    /* ========== 登录/注册 ========== */
    openLoginModal() {
        if (this.currentUser) {
            this.showToast(`已登录：${this.currentUser.nickname}`);
            return;
        }
        document.getElementById('login-modal').classList.remove('hidden');
        this.switchLoginTab('login');
    }

    closeLoginModal() {
        document.getElementById('login-modal').classList.add('hidden');
    }

    switchLoginTab(tab) {
        document.querySelectorAll('.login-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        const isRegister = tab === 'register';
        document.querySelectorAll('.register-only').forEach(el => {
            el.classList.toggle('hidden', !isRegister);
        });
        document.getElementById('login-title').textContent = isRegister ? '注册' : '登录';
        document.getElementById('btn-login-submit').textContent = isRegister ? '注册' : '登录';
        this.loginTab = tab;
    }

    handleLoginSubmit() {
        const account = document.getElementById('login-account').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const isRegister = this.loginTab === 'register';

        if (!account) {
            this.showToast('请输入手机号或邮箱');
            return;
        }
        if (!password || password.length < 6) {
            this.showToast('密码至少6位');
            return;
        }

        if (isRegister) {
            const confirmPassword = document.getElementById('login-confirm-password').value.trim();
            const nickname = document.getElementById('login-nickname').value.trim();
            if (password !== confirmPassword) {
                this.showToast('两次密码不一致');
                return;
            }
            if (!nickname) {
                this.showToast('请输入昵称');
                return;
            }
            // 注册
            this.currentUser = {
                account: account,
                nickname: nickname,
                vip: false,
                registerTime: new Date().toISOString()
            };
            this.saveUserToStorage();
            this.updateLoginUI();
            this.closeLoginModal();
            this.showToast(`注册成功，欢迎 ${nickname}！`);
        } else {
            // 登录（本地模拟）
            const saved = this.loadUserFromStorageRaw();
            if (saved && saved.account === account) {
                this.currentUser = saved;
                this.updateLoginUI();
                this.closeLoginModal();
                this.showToast(`登录成功，欢迎回来 ${saved.nickname}！`);
            } else {
                // 新用户直接登录
                this.currentUser = {
                    account: account,
                    nickname: account.replace(/[@\d]/g, '').substring(0, 8) || '用户' + account.substring(0, 4),
                    vip: false,
                    registerTime: new Date().toISOString()
                };
                this.saveUserToStorage();
                this.updateLoginUI();
                this.closeLoginModal();
                this.showToast('登录成功！');
            }
        }
    }

    updateLoginUI() {
        const quickLeft = document.querySelector('.quick-left');
        const sideMenuName = document.querySelector('.side-menu-name');
        const sideMenuVip = document.querySelector('.side-menu-vip');
        const vipBadge = document.querySelector('.vip-badge');

        if (this.currentUser) {
            if (quickLeft) quickLeft.textContent = `${this.currentUser.nickname} >`;
            if (sideMenuName) sideMenuName.textContent = this.currentUser.nickname;
            if (sideMenuVip) {
                sideMenuVip.textContent = this.currentUser.vip ? 'VIP会员' : '开通VIP享更多功能';
            }
            if (vipBadge) {
                vipBadge.textContent = this.currentUser.vip ? 'VIP' : 'VIP';
                vipBadge.style.opacity = this.currentUser.vip ? '1' : '0.6';
            }
        } else {
            if (quickLeft) quickLeft.textContent = '立即登录 >';
            if (sideMenuName) sideMenuName.textContent = '立即登录 >';
            if (sideMenuVip) sideMenuVip.textContent = '开通VIP享更多功能';
            if (vipBadge) {
                vipBadge.textContent = 'VIP';
                vipBadge.style.opacity = '0.6';
            }
        }
    }

    saveUserToStorage() {
        try {
            localStorage.setItem('moxi_user', JSON.stringify(this.currentUser));
        } catch (err) {
            console.warn('保存用户信息失败:', err);
        }
    }

    loadUserFromStorage() {
        const saved = this.loadUserFromStorageRaw();
        if (saved) {
            this.currentUser = saved;
        }
    }

    loadUserFromStorageRaw() {
        try {
            const saved = localStorage.getItem('moxi_user');
            return saved ? JSON.parse(saved) : null;
        } catch (err) {
            return null;
        }
    }

    /* ========== VIP会员 ========== */
    openVipModal() {
        document.getElementById('vip-modal').classList.remove('hidden');
        // 默认选中推荐套餐
        document.querySelectorAll('.vip-plan').forEach(p => p.classList.remove('selected'));
        const popular = document.querySelector('.vip-plan.popular');
        if (popular) popular.classList.add('selected');
        this.selectedVipPlan = 'yearly';
    }

    closeVipModal() {
        document.getElementById('vip-modal').classList.add('hidden');
    }

    handleVipSubscribe() {
        if (!this.currentUser) {
            this.closeVipModal();
            this.showToast('请先登录');
            this.openLoginModal();
            return;
        }
        const planNames = { monthly: '月度会员', yearly: '年度会员', lifetime: '终身会员' };
        this.currentUser.vip = true;
        this.currentUser.vipPlan = this.selectedVipPlan;
        this.saveUserToStorage();
        this.updateLoginUI();
        this.closeVipModal();
        this.showToast(`恭喜开通${planNames[this.selectedVipPlan] || 'VIP'}！`);
    }

    /* ========== 团队管理 ========== */
    openTeamModal() {
        document.getElementById('team-modal').classList.remove('hidden');
        this.updateTeamUI();
    }

    closeTeamModal() {
        document.getElementById('team-modal').classList.add('hidden');
    }

    showTeamForm(type) {
        document.getElementById('team-no-team').classList.add('hidden');
        document.getElementById('team-create-form').classList.toggle('hidden', type !== 'create');
        document.getElementById('team-join-form').classList.toggle('hidden', type !== 'join');
    }

    handleCreateTeam() {
        const name = document.getElementById('team-name-input').value.trim();
        const desc = document.getElementById('team-desc-input').value.trim();
        if (!name) {
            this.showToast('请输入团队名称');
            return;
        }
        // 生成6位邀请码
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.teamData = {
            name: name,
            desc: desc || '日常记录',
            code: code,
            members: 1,
            photos: this.photos.length,
            createTime: new Date().toISOString()
        };
        this.saveTeamToStorage();
        this.updateTeamUI();
        this.showToast(`团队"${name}"创建成功！`);
    }

    handleJoinTeam() {
        const code = document.getElementById('team-code-input').value.trim().toUpperCase();
        if (!code || code.length < 6) {
            this.showToast('请输入6位邀请码');
            return;
        }
        // 模拟加入团队
        this.teamData = {
            name: '协作团队',
            desc: '通过邀请码加入',
            code: code,
            members: Math.floor(Math.random() * 10) + 2,
            photos: Math.floor(Math.random() * 50),
            createTime: new Date().toISOString()
        };
        this.saveTeamToStorage();
        this.updateTeamUI();
        this.showToast('加入团队成功！');
    }

    handleLeaveTeam() {
        if (confirm('确定要退出团队吗？')) {
            this.teamData = null;
            this.saveTeamToStorage();
            this.updateTeamUI();
            this.showToast('已退出团队');
        }
    }

    copyTeamCode() {
        if (this.teamData) {
            const code = this.teamData.code;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    this.showToast('邀请码已复制：' + code);
                }).catch(() => {
                    this.showToast('邀请码：' + code);
                });
            } else {
                this.showToast('邀请码：' + code);
            }
        }
    }

    updateTeamUI() {
        const noTeam = document.getElementById('team-no-team');
        const createForm = document.getElementById('team-create-form');
        const joinForm = document.getElementById('team-join-form');
        const teamInfo = document.getElementById('team-info');

        if (this.teamData) {
            noTeam.classList.add('hidden');
            createForm.classList.add('hidden');
            joinForm.classList.add('hidden');
            teamInfo.classList.remove('hidden');
            document.getElementById('team-info-name').textContent = this.teamData.name;
            document.getElementById('team-info-desc').textContent = this.teamData.desc;
            document.getElementById('team-code-display').textContent = this.teamData.code;
            document.getElementById('team-stat-members').textContent = this.teamData.members;
            document.getElementById('team-stat-photos').textContent = this.teamData.photos;
        } else {
            noTeam.classList.remove('hidden');
            createForm.classList.add('hidden');
            joinForm.classList.add('hidden');
            teamInfo.classList.add('hidden');
            // 清空输入
            document.getElementById('team-name-input').value = '';
            document.getElementById('team-desc-input').value = '';
            document.getElementById('team-code-input').value = '';
        }
    }

    saveTeamToStorage() {
        try {
            localStorage.setItem('moxi_team', JSON.stringify(this.teamData));
        } catch (err) {
            console.warn('保存团队信息失败:', err);
        }
    }

    loadTeamFromStorage() {
        try {
            const saved = localStorage.getItem('moxi_team');
            if (saved) this.teamData = JSON.parse(saved);
        } catch (err) {
            this.teamData = null;
        }
    }

    /* ========== 边拍边拼 ========== */
    openCollageModal() {
        document.getElementById('collage-modal').classList.remove('hidden');
        this.collagePhotos = new Array(this.collageLayout).fill(null);
        this.renderCollagePreview();
    }

    closeCollageModal() {
        document.getElementById('collage-modal').classList.add('hidden');
        this.switchToPhotoMode();
    }

    addCollagePhoto() {
        // 找到第一个空位
        const emptyIndex = this.collagePhotos.indexOf(null);
        if (emptyIndex === -1) {
            this.showToast('已填满，请先移除照片');
            return;
        }
        // 拍照填充
        try {
            const video = document.getElementById('camera-video');
            const prevTransform = video.style.transform;
            video.style.transform = '';
            const dataUrl = this.camera.capture(this.watermark);
            video.style.transform = prevTransform;
            this.collagePhotos[emptyIndex] = dataUrl;
            this.renderCollagePreview();
            this.showToast('已添加照片');
        } catch (err) {
            this.showToast('拍照失败: ' + err.message);
        }
    }

    removeCollagePhoto(index) {
        this.collagePhotos[index] = null;
        this.renderCollagePreview();
    }

    renderCollagePreview() {
        const preview = document.getElementById('collage-preview');
        const count = this.collageLayout;
        // 确保数组长度匹配
        while (this.collagePhotos.length < count) this.collagePhotos.push(null);
        this.collagePhotos = this.collagePhotos.slice(0, count);

        let html = '<div class="collage-grid">';
        for (let i = 0; i < count; i++) {
            const photo = this.collagePhotos[i];
            if (photo) {
                html += `<div class="collage-slot" data-index="${i}">`;
                html += `<img src="${photo}" alt="照片${i + 1}">`;
                html += `<div class="collage-slot-remove" data-index="${i}">&times;</div>`;
                html += `</div>`;
            } else {
                html += `<div class="collage-slot" data-index="${i}"><span class="collage-slot-empty">点击添加</span></div>`;
            }
        }
        html += '</div>';
        preview.innerHTML = html;

        // 绑定移除事件
        preview.querySelectorAll('.collage-slot-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCollagePhoto(parseInt(btn.dataset.index));
            });
        });
        // 绑定空位点击事件
        preview.querySelectorAll('.collage-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const idx = parseInt(slot.dataset.index);
                if (this.collagePhotos[idx] === null) {
                    this.addCollagePhoto();
                }
            });
        });
    }

    exportCollage() {
        const filledCount = this.collagePhotos.filter(p => p !== null).length;
        if (filledCount === 0) {
            this.showToast('请先添加照片');
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetW = 1080;
        const targetH = 1080;
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, targetW, targetH);

        const count = this.collageLayout;
        const gap = 8;
        const images = [];
        let loaded = 0;

        this.collagePhotos.forEach((photo, i) => {
            if (photo) {
                const img = new Image();
                img.onload = () => {
                    images[i] = img;
                    loaded++;
                    if (loaded === filledCount) {
                        drawCollage();
                    }
                };
                img.src = photo;
            } else {
                loaded++;
                if (loaded === filledCount) {
                    drawCollage();
                }
            }
        });

        const self = this;
        function drawCollage() {
            const slots = self.getCollageSlots(count, targetW, targetH, gap);
            slots.forEach((slot, i) => {
                if (images[i]) {
                    const img = images[i];
                    const imgRatio = img.width / img.height;
                    const slotRatio = slot.w / slot.h;
                    let sx = 0, sy = 0, sw = img.width, sh = img.height;
                    if (imgRatio > slotRatio) {
                        sw = img.height * slotRatio;
                        sx = (img.width - sw) / 2;
                    } else {
                        sh = img.width / slotRatio;
                        sy = (img.height - sh) / 2;
                    }
                    ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
                } else {
                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
                }
            });

            // 添加水印
            self.watermark.drawWatermarkOnCanvas(ctx, targetW, targetH);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            self.currentPhoto = dataUrl;
            self.currentPhotoMeta = {
                antiFakeCode: self.watermark.getAntiFakeCode(),
                captureTime: new Date().toISOString(),
                location: '',
                watermarkTime: '',
                weather: self.watermark.getWeather(),
                weatherDetail: self.watermark.getWeatherDetail()
            };
            document.getElementById('preview-image').src = dataUrl;
            document.getElementById('preview-modal').classList.remove('hidden');
            self.updatePreviewAntiFakeInfo();
            self.closeCollageModal();
            self.showToast('拼图已生成');
        }
    }

    getCollageSlots(count, w, h, gap) {
        const slots = [];
        if (count === 2) {
            const halfW = (w - gap * 3) / 2;
            slots.push({ x: gap, y: gap, w: halfW, h: h - gap * 2 });
            slots.push({ x: gap * 2 + halfW, y: gap, w: halfW, h: h - gap * 2 });
        } else if (count === 3) {
            const halfW = (w - gap * 3) / 2;
            const halfH = (h - gap * 3) / 2;
            slots.push({ x: gap, y: gap, w: w - gap * 2, h: halfH });
            slots.push({ x: gap, y: gap * 2 + halfH, w: halfW, h: halfH });
            slots.push({ x: gap * 2 + halfW, y: gap * 2 + halfH, w: halfW, h: halfH });
        } else if (count === 4) {
            const halfW = (w - gap * 3) / 2;
            const halfH = (h - gap * 3) / 2;
            slots.push({ x: gap, y: gap, w: halfW, h: halfH });
            slots.push({ x: gap * 2 + halfW, y: gap, w: halfW, h: halfH });
            slots.push({ x: gap, y: gap * 2 + halfH, w: halfW, h: halfH });
            slots.push({ x: gap * 2 + halfW, y: gap * 2 + halfH, w: halfW, h: halfH });
        }
        return slots;
    }

    /* ========== 拼图汇报 ========== */
    openReportModal() {
        document.getElementById('report-modal').classList.remove('hidden');
        this.reportPhotos = [];
        this.renderReportPhotos();
        this.renderReportPreview();
    }

    closeReportModal() {
        document.getElementById('report-modal').classList.add('hidden');
        this.switchToPhotoMode();
    }

    addReportPhoto() {
        if (this.photos.length === 0) {
            this.showToast('请先拍照保存到相册');
            return;
        }
        // 添加最近的照片
        const photo = this.photos[this.reportPhotos.length % this.photos.length];
        this.reportPhotos.push(photo.dataUrl);
        this.renderReportPhotos();
        this.renderReportPreview();
    }

    removeReportPhoto(index) {
        this.reportPhotos.splice(index, 1);
        this.renderReportPhotos();
        this.renderReportPreview();
    }

    renderReportPhotos() {
        const grid = document.getElementById('report-photos-grid');
        if (this.reportPhotos.length === 0) {
            grid.innerHTML = '<div class="report-photos-empty">点击"添加"从相册选择照片</div>';
            return;
        }
        let html = '';
        this.reportPhotos.forEach((photo, i) => {
            html += `<div class="report-photo-item">`;
            html += `<img src="${photo}" alt="照片${i + 1}">`;
            html += `<div class="report-photo-remove" data-index="${i}">&times;</div>`;
            html += `</div>`;
        });
        grid.innerHTML = html;
        grid.querySelectorAll('.report-photo-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeReportPhoto(parseInt(btn.dataset.index));
            });
        });
    }

    renderReportPreview() {
        const canvas = document.getElementById('report-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const title = document.getElementById('report-title').value || '工作汇报';
        const content = document.getElementById('report-content').value || '';
        const photoCount = this.reportPhotos.length;

        const w = 750;
        const headerH = 100;
        const photoSize = 220;
        const photoGap = 10;
        const photosPerRow = 3;
        const photoRows = Math.ceil(Math.max(photoCount, 1) / photosPerRow);
        const photosH = photoRows * photoSize + (photoRows - 1) * photoGap + 20;
        const contentH = content ? 80 : 0;
        const footerH = 60;
        const h = headerH + photosH + contentH + footerH + 40;

        canvas.width = w;
        canvas.height = h;

        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // 标题栏
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, headerH);
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(0, headerH - 4, w, 4);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, w / 2, headerH / 2 + 8);
        ctx.font = '13px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        ctx.fillText(dateStr, w / 2, headerH / 2 + 32);

        // 照片区
        let y = headerH + 20;
        if (photoCount > 0) {
            const loadedImages = [];
            let loaded = 0;
            this.reportPhotos.forEach((photo, i) => {
                const img = new Image();
                img.onload = () => {
                    loadedImages[i] = img;
                    loaded++;
                    if (loaded === photoCount) {
                        drawPhotos();
                    }
                };
                img.src = photo;
            });

            const self = this;
            function drawPhotos() {
                const photoW = (w - 40 - (photosPerRow - 1) * photoGap) / photosPerRow;
                loadedImages.forEach((img, i) => {
                    const row = Math.floor(i / photosPerRow);
                    const col = i % photosPerRow;
                    const px = 20 + col * (photoW + photoGap);
                    const py = y + row * (photoSize + photoGap);
                    const imgRatio = img.width / img.height;
                    let sx = 0, sy = 0, sw = img.width, sh = img.height;
                    if (imgRatio > photoW / photoSize) {
                        sw = img.height * (photoW / photoSize);
                        sx = (img.width - sw) / 2;
                    } else {
                        sh = img.width / (photoW / photoSize);
                        sy = (img.height - sh) / 2;
                    }
                    ctx.drawImage(img, sx, sy, sw, sh, px, py, photoW, photoSize);
                });
                drawContent();
            }
        } else {
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(20, y, w - 40, 150);
            ctx.fillStyle = '#ccc';
            ctx.font = '14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无照片', w / 2, y + 80);
            drawContent();
        }

        function drawContent() {
            let cy = y + photoRows * (photoSize + photoGap) + 10;
            if (content) {
                ctx.fillStyle = '#333';
                ctx.font = '15px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                self.wrapText(ctx, content, 20, cy + 20, w - 40, 22);
                cy += contentH;
            }

            // 底部
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, h - footerH, w, footerH);
            ctx.fillStyle = '#999';
            ctx.font = '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('今日水印相机 · 真实可验', w / 2, h - footerH / 2 + 4);
            ctx.font = '11px -apple-system, sans-serif';
            ctx.fillStyle = '#ccc';
            ctx.fillText('© 2026 今日水印相机', w / 2, h - 20);
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const chars = text.split('');
        let line = '';
        let currentY = y;
        for (let i = 0; i < chars.length; i++) {
            const testLine = line + chars[i];
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, x, currentY);
                line = chars[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }

    exportReport() {
        const canvas = document.getElementById('report-canvas');
        if (!canvas) return;
        const title = document.getElementById('report-title').value.trim();
        if (!title) {
            this.showToast('请输入汇报标题');
            return;
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        this.currentPhoto = dataUrl;
        this.currentPhotoMeta = {
            antiFakeCode: this.watermark.getAntiFakeCode(),
            captureTime: new Date().toISOString(),
            location: '',
            watermarkTime: '',
            weather: this.watermark.getWeather(),
            weatherDetail: this.watermark.getWeatherDetail()
        };
        document.getElementById('preview-image').src = dataUrl;
        document.getElementById('preview-modal').classList.remove('hidden');
        this.updatePreviewAntiFakeInfo();
        this.closeReportModal();
        this.showToast('汇报图已生成');
    }

    /* ========== 照片编辑模式 ========== */
    openPhotoEditMode() {
        if (this.photos.length === 0) {
            this.showToast('相册暂无照片，请先拍照');
            this.switchToPhotoMode();
            return;
        }
        // 打开相册让用户选择照片
        this.openGallery();
        this.showToast('选择照片后可重新编辑水印');
    }

    /* ========== 视频模式 ========== */
    openVideoMode() {
        this.showToast('视频模式：长按拍照按钮录制视频');
        // 设置视频录制标志
        this.videoMode = true;
    }

    switchToPhotoMode() {
        this.currentMode = 'photo';
        this.videoMode = false;
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.mode-tab[data-mode="photo"]').classList.add('active');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden', 'fade-out');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => { toast.classList.add('hidden'); }, 300);
        }, 2000);
    }

    savePhotosToStorage() {
        try {
            const photosToSave = this.photos.slice(0, 20);
            localStorage.setItem('moxi_photos', JSON.stringify(photosToSave));
        } catch (err) {
            console.warn('保存照片失败:', err);
        }
    }

    loadPhotosFromStorage() {
        try {
            const saved = localStorage.getItem('moxi_photos');
            if (saved) this.photos = JSON.parse(saved);
        } catch (err) {
            this.photos = [];
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('moxi_settings', JSON.stringify(this.watermark.getConfig()));
        } catch (err) {
            console.warn('保存设置失败:', err);
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('moxi_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.watermark.updateConfigs(settings);
                if (settings.template) {
                    document.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
                    const item = document.querySelector(`.template-item[data-template="${settings.template}"]`);
                    if (item) item.classList.add('active');
                }
                if (settings.position) document.getElementById('watermark-position').value = settings.position;
                if (settings.fontSize) document.getElementById('watermark-font-size').value = settings.fontSize;
                if (settings.opacity) document.getElementById('watermark-opacity').value = settings.opacity;
                if (settings.weather) {
                    document.getElementById('toggle-custom-weather').checked = settings.weather.enabled;
                    document.getElementById('custom-weather').value = settings.weather.text || '';
                    document.getElementById('custom-temp').value = settings.weather.temp || '';
                }
                // 恢复天气模式
                if (settings.weatherMode) {
                    this.watermark.setWeatherMode(settings.weatherMode);
                    document.querySelectorAll('.weather-mode-tab').forEach(t => t.classList.remove('active'));
                    const tab = document.querySelector(`.weather-mode-tab[data-mode="${settings.weatherMode}"]`);
                    if (tab) tab.classList.add('active');
                    if (settings.weatherMode === 'auto') {
                        document.getElementById('weather-auto-panel')?.classList.remove('hidden');
                        document.getElementById('weather-manual-panel')?.classList.add('hidden');
                    } else {
                        document.getElementById('weather-auto-panel')?.classList.add('hidden');
                        document.getElementById('weather-manual-panel')?.classList.remove('hidden');
                    }
                }
                // 恢复防伪设置
                const brandToggle = document.getElementById('toggle-brand');
                const antifakeToggle = document.getElementById('toggle-antifake');
                if (brandToggle) brandToggle.checked = settings.brandEnabled !== false;
                if (antifakeToggle) antifakeToggle.checked = settings.antiFakeEnabled !== false;
            }
        } catch (err) {
            console.warn('加载设置失败:', err);
        }
    }
}

const app = new App();

window.addEventListener('DOMContentLoaded', async () => {
    app.loadSettings();
    await app.init();
    app.updateGalleryThumbnail();
});

window.addEventListener('beforeunload', () => {
    app.camera.destroy();
    app.saveSettings();
    if (app.watermarkUpdateInterval) clearInterval(app.watermarkUpdateInterval);
    if (app.weatherRefreshInterval) clearInterval(app.weatherRefreshInterval);
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (app.watermarkUpdateInterval) clearInterval(app.watermarkUpdateInterval);
        if (app.weatherRefreshInterval) clearInterval(app.weatherRefreshInterval);
    } else {
        if (app.camera.isReady()) app.startTimeUpdateTimer();
        // 页面恢复可见时，如果天气缓存过期则刷新
        if (app.watermark.config.weatherMode !== 'manual' &&
            app.weather.currentWeather &&
            (Date.now() - app.weather.lastFetchTime) > app.weather.cacheDuration) {
            app.refreshAutoWeather();
        }
    }
});
