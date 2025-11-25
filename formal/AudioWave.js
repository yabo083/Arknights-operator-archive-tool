/**
 * AudioWave - 音频波形播放器组件
 * 科技感音频可视化播放器，支持播放列表和动态波形显示
 * 原生JavaScript实现，无任何第三方依赖
 * @version 1.0.0
 * @author Audio Wave Team
 */

(function(window) {
    'use strict';

    // ==================== CSS 样式定义 ====================
    const CSS_STYLES = `
        @font-face {
            font-family: 'Futuru';
            src: url('../../resource/font/Futuru/Futuru-Medium-iF66d197b1052bd.otf') format('opentype');
            font-weight: normal;
            font-style: normal;
        }

        .audio-wave-container {
            position: relative;
            width: 465px; 
            height: 55px;
            background-color: transparent;
            cursor: pointer;
            overflow: hidden;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.3s;
        }

        .audio-wave-container:hover {
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 5px;
            cursor: ew-resize;
        }

        .audio-wave-container.dragging {
            cursor: ew-resize !important;
            background-color: rgba(199, 246, 255, 0.08);
        }

        canvas.audio-wave-canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        .audio-wave-status {
            position: absolute;
            color: rgba(255, 255, 255, 0.9);
            font-family: 'Futuru', sans-serif;
            font-size: 14px;
            letter-spacing: 1px;
            text-transform: uppercase;
            pointer-events: auto;
            opacity: 0;
            transition: opacity 0.3s, transform 0.3s;
            transform: translateY(20px);
            text-shadow: 0 0 5px rgba(199, 246, 255, 0.5);
            width: 100%;
            text-align: right;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 4px;
            box-sizing: border-box;
            z-index: 2;
            cursor: pointer;
        }

        .audio-wave-status.dragging {
            cursor: ew-resize !important;
        }

        .audio-wave-container:hover .audio-wave-status {
            opacity: 1;
            transform: translateY(10px);
        }

        .audio-wave-volume-glow {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100%;
            pointer-events: none;
            mix-blend-mode: screen;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 1;
            overflow: hidden;
        }

        .audio-wave-volume-glow::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            height: 100%;
            width: var(--volume-width, 50%);
            background: linear-gradient(
                120deg,
                rgba(199, 246, 255, 0) 0%,
                rgba(199, 246, 255, 0.3) 50%,
                rgba(199, 246, 255, 0.6) 100%
            );
            transform: skewX(-10deg);
            transform-origin: bottom left;
            filter: blur(2px);
            box-shadow: var(--glow-shadow, 0 0 10px rgba(199, 246, 255, 0.3));
            will-change: width, box-shadow;
        }

        .audio-wave-container:hover .audio-wave-volume-glow {
            opacity: 1;
        }

        .audio-wave-volume-glow.muted::before {
            width: 0 !important;
            box-shadow: none !important;
        }
    `;

    // ==================== 主类定义 ====================
    class AudioWave {
        constructor(options = {}) {
            // 合并默认配置
            this.config = {
                container: null,           // 容器元素或选择volumeChange器
                playlistUrl: './playlist.json',  // 播放列表文件路径
                musicBasePath: '',         // 音乐文件基础路径
                barWidth: 6,               // 条形宽度
                barGap: 6,                 // 条形间距
                barColor: '#C7F6FF',       // 条形颜色（淡青蓝色）
                autoPlay: true,            // 自动播放
                loop: true,                // 循环播放
                fftSize: 64,               // FFT大小（频谱分析精度）
                ...options
            };

            // 获取容器元素
            if (typeof this.config.container === 'string') {
                this.container = document.querySelector(this.config.container);
            } else if (this.config.container instanceof HTMLElement) {
                this.container = this.config.container;
            } else {
                console.error('AudioWave: Invalid container element');
                return;
            }

            if (!this.container) {
                console.error('AudioWave: Container not found');
                return;
            }

            // 初始化属性
            this.audio = new Audio();
            this.audio.crossOrigin = "anonymous";
            this.audioContext = null;
            this.analyser = null;
            this.source = null;
            this.canvas = null;
            this.ctx = null;
            this.isPlaying = false;
            this.playlist = [];
            this.currentTrackIndex = 0;
            this.animationId = null;
            this.barsHeight = [];
            this.isAnimating = false;
            this.statusText = null;
            
            // 音量控制相关
            this.volume = 0.5; // 默认50%音量
            this.audio.volume = this.volume;
            this.volumeGlow = null;
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartVolume = 0;
            this.lastVolumeStep = Math.round(this.volume * 100); // 音量档位（0-100）
            this.volumeStepSize = 0.01; // 每档1%
            this.lastSoundTime = 0; // 上次音效播放时间
            this.minSoundInterval = 30; // 最小音效间隔（ms）
            this.lastVolumeChangeTime = 0; // 用于计算滑动速度
            
            // 创建音量调节音效（咔哒声）
            this.initVolumeClickSound();

            // 注入样式并初始化
            this.injectStyles();
            this.init();
        }

        /**
         * 注入 CSS 样式到页面
         */
        injectStyles() {
            if (document.getElementById('audio-wave-styles')) {
                return;
            }

            const styleElement = document.createElement('style');
            styleElement.id = 'audio-wave-styles';
            styleElement.textContent = CSS_STYLES;
            document.head.appendChild(styleElement);
        }

        /**
         * 初始化组件
         */
        async init() {
            this.createDOM();
            this.attachEvents();
            await this.loadPlaylist();

            if (this.playlist.length > 0) {
                this.loadTrack(0);
                if (this.config.autoPlay) {
                    this.play().catch(e => {
                        console.log("Autoplay prevented by browser, waiting for interaction.", e);
                        const startOnInteraction = () => {
                            this.play();
                            document.removeEventListener('click', startOnInteraction);
                        };
                        document.addEventListener('click', startOnInteraction);
                    });
                }
            }
        }

        /**
         * 创建 DOM 元素
         */
        createDOM() {
            this.container.classList.add('audio-wave-container');

            // 创建 Canvas
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'audio-wave-canvas';
            this.container.appendChild(this.canvas);

            this.ctx = this.canvas.getContext('2d');

            // 创建音量辉光层
            this.volumeGlow = document.createElement('div');
            this.volumeGlow.className = 'audio-wave-volume-glow';
            this.container.appendChild(this.volumeGlow);

            // 创建状态文本
            this.statusText = document.createElement('div');
            this.statusText.className = 'audio-wave-status';
            this.statusText.innerText = 'Click to Play/Pause';
            this.container.appendChild(this.statusText);
            
            // 初始化音量视觉效果
            this.updateVolumeVisual();

            // 调整 Canvas 尺寸
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            // 初始绘制
            this.startAnimation();
        }

        /**
         * 调整 Canvas 尺寸
         */
        resizeCanvas() {
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = this.container.clientHeight;
            this.barsHeight = [];
            if (!this.isAnimating) {
                this.startAnimation();
            }
        }

        /**
         * 绑定事件
         */
        attachEvents() {
            let dragStartTime = 0;

            // 容器mousedown开始拖动检测
            this.container.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartVolume = this.volume;
                dragStartTime = Date.now();
                this.container.classList.add('dragging');
                this.statusText.classList.add('dragging');
                document.body.style.userSelect = 'none';
            });

            // 全局mousemove处理音量拖动
            document.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    const deltaX = e.clientX - this.dragStartX;
                    const volumeChange = deltaX / 300; // 120px = 100%音量变化（更灵敏）
                    let newVolume = this.dragStartVolume + volumeChange;
                    newVolume = Math.max(0, Math.min(1, newVolume));
                    this.setVolume(newVolume);
                }
            });

            // 全局mouseup结束拖动
            document.addEventListener('mouseup', (e) => {
                if (this.isDragging) {
                    const dragDuration = Date.now() - dragStartTime;
                    const deltaX = Math.abs(e.clientX - this.dragStartX);
                    
                    // 如果拖动距离很小且时间很短，视为点击切换播放
                    if (deltaX < 5 && dragDuration < 200) {
                        this.toggle();
                    }
                    
                    this.isDragging = false;
                    this.container.classList.remove('dragging');
                    this.statusText.classList.remove('dragging');
                    document.body.style.userSelect = '';
                }
            });

            this.audio.addEventListener('ended', () => {
                this.next();
            });

            // 滚轮控制音量
            this.container.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1; // 向下滚减小，向上滚增大
                const newVolume = this.volume + (delta * this.volumeStepSize);
                this.setVolume(newVolume, true); // 传入true表示播放音效
            }, { passive: false });
        }

        /**
         * 初始化音频上下文
         */
        initAudioContext() {
            if (!this.audioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = this.config.fftSize;

                if (!this.source) {
                    this.source = this.audioContext.createMediaElementSource(this.audio);
                    this.source.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);
                }
            }

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }

        /**
         * 加载播放列表
         */
        async loadPlaylist() {
            try {
                const response = await fetch(this.config.playlistUrl);
                const data = await response.json();
                
                this.playlist = data.map(item => {
                    let track = typeof item === 'string' ? { src: item } : item;
                    if (this.config.musicBasePath && !track.src.match(/^https?:\/\//)) {
                        track.src = this.config.musicBasePath + track.src;
                    }
                    return track;
                });
                
                console.log('Playlist loaded:', this.playlist);
            } catch (error) {
                console.error('Failed to load playlist:', error);
                this.statusText.innerText = 'Error loading playlist';
            }
        }

        /**
         * 加载指定曲目
         * @param {number} index - 曲目索引
         */
        loadTrack(index) {
            if (index >= 0 && index < this.playlist.length) {
                this.currentTrackIndex = index;
                this.audio.src = this.playlist[index].src;
                const title = this.playlist[index].title || 'Track ' + (index + 1);
                this.statusText.innerText = title;
                this.statusText.title = title;
            }
        }

        /**
         * 播放音频
         */
        play() {
            this.initAudioContext();
            this.audio.volume = this.volume; // 确保音量同步
            return this.audio.play().then(() => {
                this.isPlaying = true;
                this.startAnimation();
            }).catch(err => {
                console.error("Play failed", err);
                this.isPlaying = false;
                this.startAnimation();
                throw err;
            });
        }

        /**
         * 暂停音频
         */
        pause() {
            this.audio.pause();
            this.isPlaying = false;
        }

        /**
         * 切换播放/暂停
         */
        toggle() {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }

        /**
         * 播放下一曲
         */
        next() {
            let nextIndex = this.currentTrackIndex + 1;
            if (nextIndex >= this.playlist.length) {
                if (this.config.loop) {
                    nextIndex = 0;
                } else {
                    return;
                }
            }
            this.loadTrack(nextIndex);
            this.play();
        }

        /**
         * 播放上一曲
         */
        previous() {
            let prevIndex = this.currentTrackIndex - 1;
            if (prevIndex < 0) {
                if (this.config.loop) {
                    prevIndex = this.playlist.length - 1;
                } else {
                    return;
                }
            }
            this.loadTrack(prevIndex);
            this.play();
        }

        /**
         * 启动动画循环
         */
        startAnimation() {
            if (!this.isAnimating) {
                this.isAnimating = true;
                this.draw();
            }
        }

        /**
         * 绘制波形
         */
        draw() {
            this.animationId = requestAnimationFrame(() => this.draw());

            const width = this.canvas.width;
            const height = this.canvas.height;
            const barWidth = this.config.barWidth;
            const barGap = this.config.barGap;
            const barColor = this.config.barColor;
            const totalBarWidth = barWidth + barGap;
            const numBars = Math.floor(width / totalBarWidth);

            // 初始化或调整 barsHeight 数组
            if (this.barsHeight.length !== numBars) {
                const newHeights = new Float32Array(numBars).fill(barWidth);
                for (let i = 0; i < Math.min(this.barsHeight.length, numBars); i++) {
                    newHeights[i] = this.barsHeight[i];
                }
                this.barsHeight = newHeights;
            }

            let dataArray = null;
            let bufferLength = 0;

            if (this.isPlaying && this.analyser) {
                bufferLength = this.analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                this.analyser.getByteFrequencyData(dataArray);
            }

            const paddingLeft = 5;
            this.ctx.clearRect(0, 0, width, height);
            this.ctx.fillStyle = barColor;

            // 动态时发光更强
            this.ctx.shadowBlur = this.isPlaying ? 5 : 3;
            this.ctx.shadowColor = barColor;

            let allSettled = true;

            for (let i = 0; i < numBars; i++) {
                let targetHeight = barWidth;

                if (this.isPlaying && dataArray) {
                    const startIdx = Math.floor(i * bufferLength / numBars);
                    const endIdx = Math.floor((i + 1) * bufferLength / numBars);

                    let value = 0;
                    if (endIdx <= startIdx) {
                        value = dataArray[startIdx] || 0;
                    } else {
                        let maxVal = 0;
                        for (let j = startIdx; j < endIdx; j++) {
                            if (dataArray[j] > maxVal) maxVal = dataArray[j];
                        }
                        value = maxVal;
                    }

                    const percent = value / 255;
                    targetHeight = height * percent * 0.8;
                    if (targetHeight < barWidth) targetHeight = barWidth;
                }

                // 动画平滑处理（插值）
                const currentHeight = this.barsHeight[i];
                let easeFactor = 0.2;

                if (targetHeight > currentHeight) {
                    easeFactor = 0.4; // 伸长更快
                } else {
                    easeFactor = 0.15; // 回落更慢
                }

                const diff = targetHeight - currentHeight;

                if (Math.abs(diff) < 0.5) {
                    this.barsHeight[i] = targetHeight;
                } else {
                    this.barsHeight[i] += diff * easeFactor;
                    allSettled = false;
                }

                // 绘制圆角矩形条形
                const x = paddingLeft + i * totalBarWidth;
                const y = (height - this.barsHeight[i]) / 2;
                this.roundRect(this.ctx, x, y, barWidth, this.barsHeight[i], barWidth / 2);
                this.ctx.fill();
            }

            // 如果暂停且所有条形都已回落，停止动画
            if (!this.isPlaying && allSettled) {
                cancelAnimationFrame(this.animationId);
                this.isAnimating = false;
            }
        }

        /**
         * 绘制圆角矩形
         * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
         * @param {number} x - X 坐标
         * @param {number} y - Y 坐标
         * @param {number} width - 宽度
         * @param {number} height - 高度
         * @param {number} radius - 圆角半径
         */
        roundRect(ctx, x, y, width, height, radius) {
            if (width < 2 * radius) radius = width / 2;
            if (height < 2 * radius) radius = height / 2;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + width, y, x + width, y + height, radius);
            ctx.arcTo(x + width, y + height, x, y + height, radius);
            ctx.arcTo(x, y + height, x, y, radius);
            ctx.arcTo(x, y, x + width, y, radius);
            ctx.closePath();
        }

        /**
         * 初始化音量调节音效（使用Web Audio API生成咔哒声）
         */
        initVolumeClickSound() {
            // 创建独立的音频上下文用于音效
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.soundContext = new AudioContext();
        }

        /**
         * 播放音量调节咔哒声（更拟真的机械旋钮音效）
         * @param {number} speed - 滑动速度，用于动态调整音量
         */
        playVolumeClickSound(speed = 0) {
            if (!this.soundContext) return;
            
            try {
                const ctx = this.soundContext;
                const now = ctx.currentTime;
                const duration = 0.04; // 40ms
                
                // 根据滑动速度动态调整音量（速度越快，音量越低）
                // speed > 0.5 表示快速滑动，降低音量避免刺耳
                const speedFactor = speed > 0.5 ? Math.max(0.3, 1 - speed * 0.6) : 1;
                
                // 主增益节点
                const masterGain = ctx.createGain();
                masterGain.gain.value = speedFactor; // 应用速度衰减
                masterGain.connect(ctx.destination);
                
                // === 第一层：主要撞击声（金属碰撞） ===
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(1200, now);
                osc1.frequency.exponentialRampToValueAtTime(200, now + 0.008);
                gain1.gain.setValueAtTime(0.117, now); // 降低音量
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
                osc1.connect(gain1);
                gain1.connect(masterGain);
                
                // === 第二层：高频金属质感 ===
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(3500, now);
                osc2.frequency.exponentialRampToValueAtTime(800, now + 0.005);
                gain2.gain.setValueAtTime(0.0325, now); // 降低音量
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
                osc2.connect(gain2);
                gain2.connect(masterGain);
                
                // === 第三层：低频机械共鸣 ===
                const osc3 = ctx.createOscillator();
                const gain3 = ctx.createGain();
                osc3.type = 'triangle';
                osc3.frequency.setValueAtTime(150, now);
                osc3.frequency.exponentialRampToValueAtTime(80, now + 0.02);
                gain3.gain.setValueAtTime(0.065, now + 0.002); // 降低音量
                gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
                osc3.connect(gain3);
                gain3.connect(masterGain);
                
                // === 第四层：白噪音（摩擦质感） ===
                const bufferSize = ctx.sampleRate * duration;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const noiseData = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    noiseData[i] = (Math.random() * 2 - 1) * 0.3;
                }
                
                const noiseSource = ctx.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                
                // 白噪音高通滤波（只保留高频摩擦声）
                const noiseFilter = ctx.createBiquadFilter();
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.setValueAtTime(2000, now);
                
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.052, now); // 降低音量
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
                
                noiseSource.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(masterGain);
                
                // === 启动所有音源 ===
                osc1.start(now);
                osc1.stop(now + duration);
                osc2.start(now);
                osc2.stop(now + duration);
                osc3.start(now + 0.002);
                osc3.stop(now + duration);
                noiseSource.start(now);
                noiseSource.stop(now + duration);
                
                // 清理资源
                const cleanup = () => {
                    try {
                        osc1.disconnect();
                        osc2.disconnect();
                        osc3.disconnect();
                        noiseSource.disconnect();
                        gain1.disconnect();
                        gain2.disconnect();
                        gain3.disconnect();
                        noiseGain.disconnect();
                        noiseFilter.disconnect();
                        masterGain.disconnect();
                    } catch (e) {}
                };
                
                osc1.onended = cleanup;
                
            } catch (error) {
                console.warn('Failed to play volume click sound:', error);
            }
        }

        /**
         * 销毁组件
         */
        destroy() {
            // 停止播放
            this.pause();
            
            // 停止动画
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            // 清理音频上下文
            if (this.audioContext) {
                this.audioContext.close();
            }
            
            // 清理音效上下文
            if (this.soundContext) {
                this.soundContext.close();
            }
            
            // 移除事件监听
            window.removeEventListener('resize', this.resizeCanvas);
            
            // 清空容器
            if (this.container) {
                this.container.innerHTML = '';
                this.container.classList.remove('audio-wave-container');
            }
        }

        /**
         * 设置音量
         * @param {number} volume - 音量值 (0-1)
         * @param {boolean} playSound - 是否播放音效
         */
        setVolume(volume, playSound = true) {
            this.volume = Math.max(0, Math.min(1, volume));
            this.audio.volume = this.volume;
            
            // 检测是否跨越音量档位（100档，每1%一档）
            const currentStep = Math.round(this.volume * 100);
            const now = Date.now();
            
            if (playSound && currentStep !== this.lastVolumeStep) {
                // 计算滑动速度（档位变化/时间）
                const timeDelta = now - this.lastVolumeChangeTime;
                const stepDelta = Math.abs(currentStep - this.lastVolumeStep);
                const speed = timeDelta > 0 ? stepDelta / timeDelta : 0;
                
                // 音效节流：快速滑动时降低播放频率
                const timeSinceLastSound = now - this.lastSoundTime;
                if (timeSinceLastSound >= this.minSoundInterval) {
                    this.playVolumeClickSound(speed);
                    this.lastSoundTime = now;
                }
                
                this.lastVolumeStep = currentStep;
                this.lastVolumeChangeTime = now;
            }
            
            this.updateVolumeVisual();
        }

        /**
         * 更新音量视觉效果
         */
        updateVolumeVisual() {
            if (!this.volumeGlow) return;

            const volumePercent = this.volume * 100;
            
            if (this.volume === 0) {
                // 静音状态
                this.volumeGlow.classList.add('muted');
                this.volumeGlow.style.setProperty('--volume-width', '0%');
            } else {
                this.volumeGlow.classList.remove('muted');
                this.volumeGlow.style.setProperty('--volume-width', `${volumePercent}%`);
                
                // 根据音量调整发光强度（非线性增强效果）
                const glowIntensity = 8 + (Math.pow(this.volume, 0.8) * 25); // 8-33px
                const glowOpacity = 0.25 + (Math.pow(this.volume, 0.7) * 0.5); // 0.25-0.75
                this.volumeGlow.style.setProperty('--glow-shadow', `0 0 ${glowIntensity}px rgba(199, 246, 255, ${glowOpacity})`);
            }
        }

        /**
         * 获取当前播放状态
         * @returns {Object} 播放状态信息
         */
        getStatus() {
            return {
                isPlaying: this.isPlaying,
                currentTrack: this.currentTrackIndex,
                totalTracks: this.playlist.length,
                currentTime: this.audio.currentTime,
                duration: this.audio.duration,
                volume: this.volume,
                trackInfo: this.playlist[this.currentTrackIndex] || null
            };
        }
    }

    // ==================== 暴露到全局 ====================
    window.AudioWave = AudioWave;

})(window);
