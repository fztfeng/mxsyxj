/**
 * 今日水印相机 - 相机模块
 * 负责摄像头调用、切换、拍照等功能
 */

class CameraManager {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.facingMode = 'environment'; // 默认后置摄像头
        this.flashMode = 'off'; // off, on, auto
        this.isInitialized = false;
        this.availableCameras = [];
        this.currentCameraIndex = 0;
    }

    /**
     * 初始化相机
     */
    async init() {
        this.video = document.getElementById('camera-video');
        this.canvas = document.getElementById('camera-canvas');

        if (!this.video || !this.canvas) {
            throw new Error('找不到视频或画布元素');
        }

        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('您的浏览器不支持相机功能');
        }

        // 获取可用摄像头列表
        await this.enumerateCameras();

        // 启动相机
        await this.startCamera();
        
        this.isInitialized = true;
    }

    /**
     * 枚举可用摄像头
     */
    async enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(d => d.kind === 'videoinput');
        } catch (err) {
            console.warn('无法枚举摄像头:', err);
            this.availableCameras = [];
        }
    }

    /**
     * 启动相机
     */
    async startCamera() {
        // 停止现有流
        this.stopCamera();

        const constraints = {
            video: {
                facingMode: this.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // 等待视频加载
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
        } catch (err) {
            // 如果后置摄像头失败，尝试前置
            if (this.facingMode === 'environment') {
                console.warn('后置摄像头启动失败，尝试前置摄像头');
                this.facingMode = 'user';
                await this.startCamera();
                return;
            }
            throw new Error(`无法访问摄像头: ${err.message}`);
        }
    }

    /**
     * 停止相机
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
    }

    /**
     * 切换前后摄像头
     */
    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }

    /**
     * 切换闪光灯模式
     */
    toggleFlash() {
        const modes = ['off', 'on', 'auto'];
        const currentIndex = modes.indexOf(this.flashMode);
        this.flashMode = modes[(currentIndex + 1) % modes.length];
        
        // 尝试应用闪光灯设置（仅在后置摄像头时有效）
        this.applyFlashMode();
        
        return this.flashMode;
    }

    /**
     * 应用闪光灯模式
     */
    async applyFlashMode() {
        if (!this.stream) return;

        const track = this.stream.getVideoTracks()[0];
        if (!track) return;

        try {
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            if (capabilities.torch) {
                await track.applyConstraints({
                    advanced: [{ torch: this.flashMode === 'on' }]
                });
            }
        } catch (err) {
            console.warn('闪光灯控制不受支持:', err);
        }
    }

    /**
     * 拍照
     * @param {WatermarkManager} watermarkManager - 水印管理器
     * @returns {string} 图片的Data URL
     */
    capture(watermarkManager) {
        if (!this.video || !this.video.videoWidth) {
            throw new Error('相机未准备好');
        }

        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;

        // 设置画布大小
        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;

        const ctx = this.canvas.getContext('2d');

        // 如果是前置摄像头，镜像翻转
        if (this.facingMode === 'user') {
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
        }

        // 绘制视频帧到画布
        ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);

        // 恢复变换
        if (this.facingMode === 'user') {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // 绘制水印
        if (watermarkManager) {
            watermarkManager.drawWatermarkOnCanvas(ctx, videoWidth, videoHeight);
        }

        // 返回图片Data URL
        return this.canvas.toDataURL('image/jpeg', 0.92);
    }

    /**
     * 获取当前摄像头方向
     */
    getFacingMode() {
        return this.facingMode;
    }

    /**
     * 获取闪光灯模式
     */
    getFlashMode() {
        return this.flashMode;
    }

    /**
     * 检查是否已初始化
     */
    isReady() {
        return this.isInitialized && this.stream !== null;
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stopCamera();
        this.isInitialized = false;
    }
}

// 导出到全局
window.CameraManager = CameraManager;
