/**
 * ArkInfoTip - 明日方舟风格通知条组件
 * 深度复刻罗德岛终端/PRTS界面的工业科技风格
 * 原生JavaScript实现，无任何第三方依赖
 * @version 1.0.0
 * @author Arknights UI Team
 */

(function(window) {
    'use strict';

    // ==================== CSS 样式定义 ====================
    const CSS_STYLES = `
        /* 容器样式 - 支持多个位置 */
        .ark-infotip-container {
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ark-infotip-container.top-right {
            top: 20px;
            right: 20px;
        }

        .ark-infotip-container.top-left {
            top: 20px;
            left: 20px;
        }

        .ark-infotip-container.bottom-right {
            bottom: 20px;
            right: 20px;
        }

        .ark-infotip-container.bottom-left {
            bottom: 20px;
            left: 20px;
        }

        .ark-infotip-container.top-center {
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
        }

        .ark-infotip-container.bottom-center {
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
        }

        /* 通知条主体 - 切角设计 */
        .ark-infotip {
            position: relative;
            min-width: 320px;
            max-width: 420px;
            padding: 16px 20px 16px 16px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            clip-path: polygon(
                0 0,
                calc(100% - 12px) 0,
                100% 12px,
                100% 100%,
                0 100%
            );
            pointer-events: auto;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            font-family: 'Oswald', 'Roboto Condensed', 'Source Han Sans', sans-serif;
        }

        /* 背景扫描线纹理 */
        .ark-infotip::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.02) 2px,
                rgba(255, 255, 255, 0.02) 4px
            );
            pointer-events: none;
            z-index: 1;
        }

        /* 状态指示条 - 左侧竖条 */
        .ark-infotip .status-bar {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            z-index: 2;
        }

        .ark-infotip.info .status-bar { background: #23ADE5; }
        .ark-infotip.success .status-bar { background: #91D300; }
        .ark-infotip.warning .status-bar { background: #FFCD00; }
        .ark-infotip.error .status-bar { background: #FF3333; }

        /* 内容容器 */
        .ark-infotip-content {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        /* SVG 图标 */
        .ark-infotip-icon {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            margin-top: 2px;
        }

        .ark-infotip.info .ark-infotip-icon { color: #23ADE5; }
        .ark-infotip.success .ark-infotip-icon { color: #91D300; }
        .ark-infotip.warning .ark-infotip-icon { color: #FFCD00; }
        .ark-infotip.error .ark-infotip-icon { color: #FF3333; }

        /* 文本区域 */
        .ark-infotip-text {
            flex: 1;
            min-width: 0;
        }

        /* 标题 */
        .ark-infotip-title {
            font-size: 14px;
            font-weight: 600;
            color: #FFFFFF;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 4px 0;
            line-height: 1.4;
        }

        /* 消息内容 */
        .ark-infotip-message {
            font-size: 13px;
            color: #CCCCCC;
            margin: 0;
            line-height: 1.5;
            word-break: break-word;
        }

        /* 编号标识 - 装饰元素 */
        .ark-infotip-hash {
            position: absolute;
            top: 4px;
            right: 6px;
            font-size: 9px;
            color: rgba(255, 255, 255, 0.2);
            font-weight: 300;
            letter-spacing: 0.5px;
            z-index: 3;
            font-family: 'Courier New', monospace;
        }

        /* 进度条容器 */
        .ark-infotip-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: rgba(255, 255, 255, 0.05);
            overflow: hidden;
            z-index: 2;
        }

        /* 进度条填充 */
        .ark-infotip-progress-bar {
            height: 100%;
            width: 100%;
            transform-origin: left;
            transition: transform linear;
        }

        .ark-infotip.info .ark-infotip-progress-bar { background: #23ADE5; }
        .ark-infotip.success .ark-infotip-progress-bar { background: #91D300; }
        .ark-infotip.warning .ark-infotip-progress-bar { background: #FFCD00; }
        .ark-infotip.error .ark-infotip-progress-bar { background: #FF3333; }

        /* 关闭按钮 */
        .ark-infotip-close {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
            z-index: 3;
        }

        .ark-infotip-close:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        /* ==================== 动画定义 ==================== */
        
        /* 进场动画 - 从右侧滑入 */
        @keyframes ark-slide-in-right {
            0% {
                opacity: 0;
                transform: translateX(100%) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }

        /* 进场动画 - 从左侧滑入 */
        @keyframes ark-slide-in-left {
            0% {
                opacity: 0;
                transform: translateX(-100%) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }

        /* 进场动画 - 从上方滑入 */
        @keyframes ark-slide-in-top {
            0% {
                opacity: 0;
                transform: translateY(-100%) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* 进场动画 - 从下方滑入 */
        @keyframes ark-slide-in-bottom {
            0% {
                opacity: 0;
                transform: translateY(100%) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* 退场动画 - 向右折叠 */
        @keyframes ark-slide-out-right {
            0% {
                opacity: 1;
                transform: translateX(0) scaleX(1);
            }
            100% {
                opacity: 0;
                transform: translateX(50%) scaleX(0);
            }
        }

        /* 退场动画 - 向左折叠 */
        @keyframes ark-slide-out-left {
            0% {
                opacity: 1;
                transform: translateX(0) scaleX(1);
            }
            100% {
                opacity: 0;
                transform: translateX(-50%) scaleX(0);
            }
        }

        /* Glitch 故障效果 */
        @keyframes ark-glitch {
            0%, 100% {
                transform: translate(0);
                opacity: 1;
            }
            20% {
                transform: translate(-2px, 1px);
                opacity: 0.8;
            }
            40% {
                transform: translate(2px, -1px);
                opacity: 0.9;
            }
            60% {
                transform: translate(-1px, 2px);
                opacity: 0.85;
            }
            80% {
                transform: translate(1px, -2px);
                opacity: 0.95;
            }
        }

        /* 应用进场动画 */
        .ark-infotip.entering-right {
            animation: ark-slide-in-right 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .ark-infotip.entering-left {
            animation: ark-slide-in-left 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .ark-infotip.entering-top {
            animation: ark-slide-in-top 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .ark-infotip.entering-bottom {
            animation: ark-slide-in-bottom 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        /* 应用退场动画 */
        .ark-infotip.exiting-right {
            animation: ark-slide-out-right 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
        }

        .ark-infotip.exiting-left {
            animation: ark-slide-out-left 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
        }

        /* Glitch 效果应用 */
        .ark-infotip.glitch .ark-infotip-title {
            animation: ark-glitch 0.3s;
        }

        /* ==================== 响应式设计 ==================== */
        
        /* 平板设备 (768px - 1024px) */
        @media screen and (max-width: 1024px) {
            .ark-infotip-container {
                gap: 10px;
            }

            .ark-infotip {
                min-width: 280px;
                max-width: 380px;
                padding: 14px 18px 14px 14px;
            }

            .ark-infotip-icon {
                width: 22px;
                height: 22px;
            }

            .ark-infotip-title {
                font-size: 13px;
            }

            .ark-infotip-message {
                font-size: 12px;
            }

            .ark-infotip-hash {
                font-size: 8px;
            }
        }

        /* 移动设备 (< 768px) */
        @media screen and (max-width: 768px) {
            .ark-infotip-container {
                gap: 8px;
                left: 10px !important;
                right: 10px !important;
                transform: none !important;
                width: calc(100% - 20px);
            }

            .ark-infotip-container.top-right,
            .ark-infotip-container.top-left,
            .ark-infotip-container.top-center {
                top: 10px;
            }

            .ark-infotip-container.bottom-right,
            .ark-infotip-container.bottom-left,
            .ark-infotip-container.bottom-center {
                bottom: 10px;
            }

            .ark-infotip {
                min-width: 0;
                max-width: 100%;
                width: 100%;
                padding: 12px 16px 12px 12px;
                clip-path: polygon(
                    0 0,
                    calc(100% - 8px) 0,
                    100% 8px,
                    100% 100%,
                    0 100%
                );
            }

            .ark-infotip-content {
                gap: 10px;
            }

            .ark-infotip-icon {
                width: 20px;
                height: 20px;
                margin-top: 0;
            }

            .ark-infotip-title {
                font-size: 12px;
                letter-spacing: 0.5px;
                margin-bottom: 2px;
            }

            .ark-infotip-message {
                font-size: 11px;
                line-height: 1.4;
            }

            .ark-infotip-hash {
                font-size: 7px;
                top: 3px;
                right: 4px;
            }

            .ark-infotip-close {
                width: 18px;
                height: 18px;
                top: 6px;
                right: 6px;
            }

            .ark-infotip-progress {
                height: 1.5px;
            }
        }

        /* 小屏幕移动设备 (< 480px) */
        @media screen and (max-width: 480px) {
            .ark-infotip {
                padding: 10px 14px 10px 10px;
            }

            .ark-infotip-content {
                gap: 8px;
            }

            .ark-infotip-icon {
                width: 18px;
                height: 18px;
            }

            .ark-infotip-title {
                font-size: 11px;
            }

            .ark-infotip-message {
                font-size: 10px;
            }

            .ark-infotip-hash {
                display: none; /* 在极小屏幕上隐藏编号 */
            }
        }

        /* 横屏模式优化 */
        @media screen and (max-width: 768px) and (orientation: landscape) {
            .ark-infotip-container {
                gap: 6px;
            }

            .ark-infotip {
                padding: 10px 14px 10px 10px;
            }

            .ark-infotip-container.top-right,
            .ark-infotip-container.top-left,
            .ark-infotip-container.top-center {
                top: 8px;
            }

            .ark-infotip-container.bottom-right,
            .ark-infotip-container.bottom-left,
            .ark-infotip-container.bottom-center {
                bottom: 8px;
            }
        }

        /* 触摸设备优化 */
        @media (hover: none) and (pointer: coarse) {
            .ark-infotip {
                /* 增大触摸目标 */
                padding: 14px 18px 14px 14px;
            }

            .ark-infotip-close {
                /* 增大关闭按钮触摸区域 */
                width: 24px;
                height: 24px;
                padding: 4px;
            }

            /* 禁用悬停效果 */
            .ark-infotip-close:hover {
                color: rgba(255, 255, 255, 0.4);
            }

            .ark-infotip-close:active {
                color: rgba(255, 255, 255, 0.8);
            }
        }

        /* 高 DPI 屏幕优化 */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .ark-infotip {
                border-width: 0.5px;
            }

            .ark-infotip .status-bar {
                width: 3px;
            }
        }

        /* 减弱动画模式 (尊重用户偏好) */
        @media (prefers-reduced-motion: reduce) {
            .ark-infotip,
            .ark-infotip-progress-bar {
                animation: none !important;
                transition: none !important;
            }

            .ark-infotip.entering-right,
            .ark-infotip.entering-left,
            .ark-infotip.entering-top,
            .ark-infotip.entering-bottom {
                animation: none;
                opacity: 1;
                transform: none;
            }

            .ark-infotip.exiting-right,
            .ark-infotip.exiting-left {
                animation: none;
                opacity: 0;
            }
        }

        /* 深色模式支持 */
        @media (prefers-color-scheme: light) {
            .ark-infotip {
                background: rgba(245, 245, 245, 0.95);
                border-color: rgba(0, 0, 0, 0.1);
            }

            .ark-infotip::before {
                background: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 0, 0, 0.02) 2px,
                    rgba(0, 0, 0, 0.02) 4px
                );
            }

            .ark-infotip-title {
                color: #1a1a1a;
            }

            .ark-infotip-message {
                color: #4a4a4a;
            }

            .ark-infotip-hash {
                color: rgba(0, 0, 0, 0.2);
            }

            .ark-infotip-close {
                color: rgba(0, 0, 0, 0.4);
            }

            .ark-infotip-close:hover {
                color: rgba(0, 0, 0, 0.8);
            }

            .ark-infotip-progress {
                background: rgba(0, 0, 0, 0.05);
            }
        }

        /* 打印样式 */
        @media print {
            .ark-infotip-container {
                display: none !important;
            }
        }
    `;

    // ==================== SVG 图标定义 ====================
    const ICONS = {
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`,
        
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`,
        
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,
        
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`
    };

    // ==================== 主类定义 ====================
    class ArkInfoTip {
        constructor() {
            // 消息计数器，用于生成唯一编号
            this.messageCounter = 0;
            
            // 容器缓存
            this.containers = {};
            
            // 设备信息
            this.deviceInfo = this.detectDevice();
            
            // 初始化样式
            this.injectStyles();
            
            // 监听窗口大小变化
            this.setupResizeHandler();
        }

        /**
         * 检测设备类型和屏幕信息
         * @returns {Object} 设备信息
         */
        detectDevice() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isLandscape = width > height;
            
            let deviceType = 'desktop';
            if (width < 480) {
                deviceType = 'mobile-small';
            } else if (width < 768) {
                deviceType = 'mobile';
            } else if (width < 1024) {
                deviceType = 'tablet';
            }

            return {
                type: deviceType,
                width: width,
                height: height,
                isTouchDevice: isTouchDevice,
                isLandscape: isLandscape,
                pixelRatio: window.devicePixelRatio || 1
            };
        }

        /**
         * 设置窗口大小变化监听
         */
        setupResizeHandler() {
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.deviceInfo = this.detectDevice();
                    this.adjustContainersForDevice();
                }, 150);
            });
        }

        /**
         * 根据设备调整容器
         */
        adjustContainersForDevice() {
            // 在移动设备上，将所有通知统一到 top-center 位置
            if (this.deviceInfo.type === 'mobile' || this.deviceInfo.type === 'mobile-small') {
                Object.keys(this.containers).forEach(position => {
                    if (position !== 'top-center' && position !== 'bottom-center') {
                        const container = this.containers[position];
                        if (container) {
                            // 保持现有通知，但不强制移动
                            // 新通知会使用移动端优化的位置
                        }
                    }
                });
            }
        }

        /**
         * 注入 CSS 样式到页面
         */
        injectStyles() {
            if (document.getElementById('ark-infotip-styles')) {
                return; // 已经注入过了
            }

            const styleElement = document.createElement('style');
            styleElement.id = 'ark-infotip-styles';
            styleElement.textContent = CSS_STYLES;
            document.head.appendChild(styleElement);
        }

        /**
         * 获取或创建指定位置的容器
         * @param {string} position - 位置标识
         * @returns {HTMLElement} 容器元素
         */
        getContainer(position) {
            if (!this.containers[position]) {
                const container = document.createElement('div');
                container.className = `ark-infotip-container ${position}`;
                document.body.appendChild(container);
                this.containers[position] = container;
            }
            return this.containers[position];
        }

        /**
         * 显示通知
         * @param {Object} options - 配置选项
         * @returns {HTMLElement} 通知元素
         */
        show(options) {
            // 合并默认配置
            const config = {
                type: 'info',           // 类型: info, success, warning, error
                title: '',              // 标题
                message: '',            // 消息内容
                duration: 3000,         // 显示时长(毫秒)，0 表示不自动关闭
                position: 'top-right',  // 位置
                closable: true,         // 是否显示关闭按钮
                glitch: true,           // 是否启用故障效果
                responsive: true,       // 是否启用响应式自适应
                ...options
            };

            // 响应式位置调整
            if (config.responsive) {
                config.position = this.getResponsivePosition(config.position);
                
                // 在移动设备上缩短显示时间
                if ((this.deviceInfo.type === 'mobile' || this.deviceInfo.type === 'mobile-small') && config.duration > 0) {
                    config.duration = Math.min(config.duration, 4000);
                }
                
                // 在触摸设备上禁用 glitch 效果以提高性能
                if (this.deviceInfo.isTouchDevice && this.deviceInfo.type !== 'desktop') {
                    config.glitch = false;
                }
            }

            // 生成唯一消息编号
            this.messageCounter++;
            const messageId = `PRTS-LOG // ${String(this.messageCounter).padStart(2, '0')}`;

            // 创建通知元素
            const notification = this.createNotification(config, messageId);

            // 获取容器并添加通知
            const container = this.getContainer(config.position);
            container.appendChild(notification);

            // 触发进场动画
            requestAnimationFrame(() => {
                const animationDirection = this.getAnimationDirection(config.position);
                notification.classList.add(`entering-${animationDirection}`);
                
                if (config.glitch) {
                    notification.classList.add('glitch');
                    setTimeout(() => {
                        notification.classList.remove('glitch');
                    }, 300);
                }
            });

            // 启动进度条动画
            if (config.duration > 0) {
                const progressBar = notification.querySelector('.ark-infotip-progress-bar');
                if (progressBar) {
                    progressBar.style.transitionDuration = `${config.duration}ms`;
                    requestAnimationFrame(() => {
                        progressBar.style.transform = 'scaleX(0)';
                    });
                }

                // 自动关闭
                setTimeout(() => {
                    this.close(notification, config.position);
                }, config.duration);
            }

            return notification;
        }

        /**
         * 创建通知 DOM 元素
         * @param {Object} config - 配置
         * @param {string} messageId - 消息编号
         * @returns {HTMLElement} 通知元素
         */
        createNotification(config, messageId) {
            const notification = document.createElement('div');
            notification.className = `ark-infotip ${config.type}`;

            // 状态指示条
            const statusBar = document.createElement('div');
            statusBar.className = 'status-bar';

            // 内容容器
            const content = document.createElement('div');
            content.className = 'ark-infotip-content';

            // 图标
            const icon = document.createElement('div');
            icon.className = 'ark-infotip-icon';
            icon.innerHTML = ICONS[config.type] || ICONS.info;

            // 文本区域
            const textArea = document.createElement('div');
            textArea.className = 'ark-infotip-text';

            if (config.title) {
                const title = document.createElement('div');
                title.className = 'ark-infotip-title';
                title.textContent = config.title;
                textArea.appendChild(title);
            }

            if (config.message) {
                const message = document.createElement('div');
                message.className = 'ark-infotip-message';
                message.textContent = config.message;
                textArea.appendChild(message);
            }

            content.appendChild(icon);
            content.appendChild(textArea);

            // 编号标识
            const hash = document.createElement('div');
            hash.className = 'ark-infotip-hash';
            hash.textContent = messageId;

            // 关闭按钮
            let closeBtn = null;
            if (config.closable) {
                closeBtn = document.createElement('button');
                closeBtn.className = 'ark-infotip-close';
                closeBtn.innerHTML = '×';
                closeBtn.onclick = () => {
                    this.close(notification, config.position);
                };
            }

            // 进度条
            const progress = document.createElement('div');
            progress.className = 'ark-infotip-progress';
            const progressBar = document.createElement('div');
            progressBar.className = 'ark-infotip-progress-bar';
            progress.appendChild(progressBar);

            // 组装元素
            notification.appendChild(statusBar);
            notification.appendChild(content);
            notification.appendChild(hash);
            if (closeBtn) {
                notification.appendChild(closeBtn);
            }
            notification.appendChild(progress);

            return notification;
        }

        /**
         * 关闭通知
         * @param {HTMLElement} notification - 通知元素
         * @param {string} position - 位置
         */
        close(notification, position) {
            if (!notification || !notification.parentNode) {
                return;
            }

            // 触发退场动画
            const animationDirection = this.getAnimationDirection(position);
            notification.classList.add(`exiting-${animationDirection}`);

            // 动画结束后移除元素
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }

                // 如果容器为空，清理容器
                const container = this.containers[position];
                if (container && container.children.length === 0) {
                    container.parentNode.removeChild(container);
                    delete this.containers[position];
                }
            }, 300);
        }

        /**
         * 获取响应式位置
         * @param {string} position - 原始位置
         * @returns {string} 适配后的位置
         */
        getResponsivePosition(position) {
            // 移动设备上统一使用顶部居中或底部居中
            if (this.deviceInfo.type === 'mobile' || this.deviceInfo.type === 'mobile-small') {
                if (position.includes('bottom')) {
                    return 'bottom-center';
                }
                return 'top-center';
            }
            
            // 平板设备上保持原位置
            if (this.deviceInfo.type === 'tablet') {
                return position;
            }
            
            // 桌面设备保持原位置
            return position;
        }

        /**
         * 根据位置获取动画方向
         * @param {string} position - 位置
         * @returns {string} 动画方向
         */
        getAnimationDirection(position) {
            if (position.includes('right')) {
                return 'right';
            } else if (position.includes('left')) {
                return 'left';
            } else if (position.includes('top')) {
                return 'top';
            } else if (position.includes('bottom')) {
                return 'bottom';
            }
            return 'right';
        }

        /**
         * 获取设备信息
         * @returns {Object} 设备信息
         */
        getDeviceInfo() {
            return { ...this.deviceInfo };
        }

        /**
         * 快捷方法 - INFO
         */
        info(message, title = 'INFORMATION') {
            return this.show({
                type: 'info',
                title: title,
                message: message
            });
        }

        /**
         * 快捷方法 - SUCCESS
         */
        success(message, title = 'SUCCESS') {
            return this.show({
                type: 'success',
                title: title,
                message: message
            });
        }

        /**
         * 快捷方法 - WARNING
         */
        warning(message, title = 'WARNING') {
            return this.show({
                type: 'warning',
                title: title,
                message: message
            });
        }

        /**
         * 快捷方法 - ERROR
         */
        error(message, title = 'ERROR') {
            return this.show({
                type: 'error',
                title: title,
                message: message
            });
        }

        /**
         * 清除所有通知
         */
        clearAll() {
            Object.keys(this.containers).forEach(position => {
                const container = this.containers[position];
                if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            });
            this.containers = {};
            this.messageCounter = 0;
        }
    }

    // ==================== 暴露到全局 ====================
    // 创建单例实例
    window.ArkInfoTip = new ArkInfoTip();

})(window);
