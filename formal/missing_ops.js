// Configuration - Responsive
function getResponsiveConfig() {
    const width = window.innerWidth;
    
    if (width <= 480) {
        // Mobile phones
        return {
            cardHeight: 4,
            cardSpacing: 9,
            radius: 300,
            angleStep: 20,
            rotationSpeed: 0.15,
            scrollSpeed: 0.04
        };
    } else if (width <= 768) {
        // Tablets
        return {
            cardHeight: 4.5,
            cardSpacing: 10,
            radius: 420,
            angleStep: 19,
            rotationSpeed: 0.18,
            scrollSpeed: 0.045
        };
    } else {
        // Desktop
        return {
            cardHeight: 5,
            cardSpacing: 11,
            radius: 580,
            angleStep: 18,
            rotationSpeed: 0.2,
            scrollSpeed: 0.05
        };
    }
}

let CONFIG = getResponsiveConfig();

// State
let state = {
    operators: [], // Full list with metadata
    missingOps: [], // Filtered list
    resourceMap: new Map(), // Map of name -> release info
    avatarMap: new Map(), // Map of name -> avatar info
    scrollPos: 0,
    targetScrollPos: 0,
    isDragging: false,
    lastMouseY: 0,
    maxScroll: 0 // [新增] 用于限制滚动边界
};

// Share Configuration
let shareConfig = {
    name: "DOCTOR",
    langPri: "cn",
    langSec: "en",
    theme: "cyan",
    assistant: ""
};

const DICTIONARY = {
    title: { cn: "干员收集报告", en: "OPERATOR COLLECTION REPORT", jp: "オペレーター収集報告" },
    total: { cn: "干员总数", en: "TOTAL OPERATORS", jp: "総オペレーター" },
    recruited: { cn: "已招募", en: "RECRUITED", jp: "採用済み" },
    rate: { cn: "收集率", en: "COLLECTION RATE", jp: "収集率" },
    missing: { cn: "未招募", en: "MISSING", jp: "未採用" },
    progress: { cn: "招募进度", en: "RECRUITMENT PROGRESS", jp: "採用進捗" },
    elite: { cn: "六星干员", en: "ELITE OPERATORS (6★)", jp: "上級エリート" },
    owned: { cn: "持有", en: "OWNED", jp: "所持" },
    totalSub: { cn: "总计", en: "TOTAL", jp: "合計" },
    rateSub: { cn: "占比", en: "RATE", jp: "割合" }
};

// DOM Elements
const els = {
    world: document.getElementById('world'),
    helix: document.getElementById('helix'),
    importBtn: document.getElementById('importBtn'),
    clearBtn: document.getElementById('clearBtn'),
    btnGroup: document.getElementById('btnGroup'),
    importModal: document.getElementById('importModal'),
    importText: document.getElementById('importText'),
    confirmImport: document.getElementById('confirmImport'),
    cancelImport: document.getElementById('cancelImport'),
    detailPanel: document.getElementById('detailPanel'),
    closeDetail: document.querySelector('.close-btn'),
    missingCount: document.getElementById('missingCount'),
    totalDays: document.getElementById('totalDays'),
    noiseCanvas: document.getElementById('noiseCanvas'),
    // Share Elements
    shareBtn: document.getElementById('shareBtn'),
    shareModal: document.getElementById('shareModal'),
    closeShare: document.getElementById('closeShare'),
    downloadShare: document.getElementById('downloadShare'),
    sharePreviewImage: document.getElementById('sharePreviewImage'),
    shareCardContainer: document.getElementById('shareCardContainer'),
    // Share Data Elements
    shareDate: document.getElementById('shareDate'),
    shareTotalOps: document.getElementById('shareTotalOps'),
    shareOwnedOps: document.getElementById('shareOwnedOps'),
    shareRate: document.getElementById('shareRate'),
    shareMissing: document.getElementById('shareMissing'),
    shareProgressBar: document.getElementById('shareProgressBar'),
    share6StarOwned: document.getElementById('share6StarOwned'),
    share6StarTotal: document.getElementById('share6StarTotal'),
    share6StarRate: document.getElementById('share6StarRate'),
    shareId: document.getElementById('shareId'),
    // Config Elements
    configName: document.getElementById('configName'),
    configLangPri: document.getElementById('configLangPri'),
    configLangSec: document.getElementById('configLangSec'),
    configTheme: document.getElementById('configTheme'),
    configAssistant: document.getElementById('configAssistant'),
    refreshShare: document.getElementById('refreshShare'),
    shareAssistantImg: document.getElementById('shareAssistantImg'),
    // Labels
    lblTitle: document.getElementById('lblTitle'),
    lblTotal: document.getElementById('lblTotal'),
    lblRecruited: document.getElementById('lblRecruited'),
    lblRate: document.getElementById('lblRate'),
    lblMissing: document.getElementById('lblMissing'),
    lblProgress: document.getElementById('lblProgress'),
    lblElite: document.getElementById('lblElite'),
    lblOwned: document.getElementById('lblOwned'),
    lblTotalSub: document.getElementById('lblTotalSub'),
    lblRateSub: document.getElementById('lblRateSub'),
    shareMorseContainer: document.getElementById('shareMorseContainer')
};

// Morse Strings
const MORSE_FULL = "-.. --- -.-. - --- .-. --..-- / -- ..- ... - / -.-- --- ..- / -... . / ... --- / -.-. .-.. --- ... . / - --- / - .... . / -.-. .-. . .- - ..- .-. . ... / --- ..-. / - .... .. ... / .--. .-.. .- -. . - ..--..";
const MORSE_NOT_FULL = "-.. --- -.-. - --- .-. --..-- / -.-- --- ..- .-. / .--- --- ..- .-. -. . -.-- / .. ... / -. --- - / -.-- . - / --- ...- . .-. .-.-.- / .-.. --- --- -.- / -... .- -.-. -.- --..-- / .... .- ...- . / -.-- --- ..- / -- .. ... ... . -.. / .- -. -.-- - .... .. -. --. ..--..";

// Initialization
async function init() {
    initNoise();
    await loadData();
    renderHelix();
    try {
        setupInteractions();
    } catch (e) {
        console.error("Setup interactions failed:", e);
    }
    animate();
}

// Data Loading
async function loadData() {
    try {
        // Load Release Time Data
        const releaseRes = await fetch('../resource/operator-release-time/干员上线时间_2025-11-24.json');
        const releaseData = await releaseRes.json();
        state.resourceMap = new Map(releaseData.map(item => [item.name, item]));

        // Load Avatar Metadata
        const metaRes = await fetch('../resource/arknights-avatars/metadata.json');
        const metaData = await metaRes.json();
        state.avatarMap = new Map(metaData.map(item => [item.name, item]));

        // Initialize empty
        state.operators = [];
        state.missingOps = [];
        
        updateStats();
        
        // 系统初始化完成通知
        ArkInfoTip.info('系统资源加载完成', 'System Ready');

    } catch (e) {
        console.error("Failed to load data:", e);
        ArkInfoTip.error('资源数据加载失败，请检查文件路径', 'Load Failed');
    }
}

function parseDate(dateStr) {
    // Format: "2019年4月30日 10:00"
    const cleanStr = dateStr.replace(/年|月/g, '-').replace(/日/g, '');
    return new Date(cleanStr).getTime();
}

function mockMissingData() {
    // Randomly mark 20% as missing for demo
    state.operators.forEach(op => {
        if (Math.random() < 0.2) {
            op.own = false;
        }
    });
    filterMissing();
}

function filterMissing() {
    state.missingOps = state.operators.filter(op => !op.own);
    // [新增] 计算最大滚动范围：(干员数量 - 1) * 每个干员的角度
    // 这样可以刚好滚到最后一个干员
    state.maxScroll = Math.max(0, (state.missingOps.length - 1) * CONFIG.angleStep);
}

function updateStats() {
    els.missingCount.innerText = state.missingOps.length.toString().padStart(1, '0');
    
    // Calculate total days missed (sum of days since release for each missing op)
    const now = Date.now();
    const totalMs = state.missingOps.reduce((acc, op) => {
        return acc + (now - op.timestamp);
    }, 0);
    const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    els.totalDays.innerText = totalDays.toString();
}

// Rendering
function renderHelix() {
    els.helix.innerHTML = '';

    if (state.operators.length === 0) {
        // 数据为空，恢复标题完整显示
        const titleBilingual = document.querySelector('.title-bilingual');
        if (titleBilingual) {
            titleBilingual.classList.remove('mode-orss');
        }
        const msg = document.createElement('div');
        msg.className = 'empty-message';
        msg.innerHTML = `
            <h2><span class="glitch-text" data-text="AWAITING DATA LINK...">AWAITING DATA LINK...</span></h2>
            <p>请点击左下角导入数据按钮同步干员档案</p>
        `;
        els.helix.appendChild(msg);
        return;
    }
    
    if (state.missingOps.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'empty-message';
        msg.innerHTML = `
            <h2><span class="glitch-text" data-text="ALL OPERATORS ACQUIRED">ALL OPERATORS ACQUIRED</span></h2>
            <p>博士，您已集齐所有干员。</p>
        `;
        els.helix.appendChild(msg);
        return;
    }
    
    state.missingOps.forEach((op, index) => {
        const card = document.createElement('div');
        card.className = `op-card rarity-${op.rarity}`;
        
        // Calculate 3D position
        // y 轴向下增长，形成螺旋
        const y = index * CONFIG.cardSpacing; 
        const angle = index * CONFIG.angleStep;
        
        // Store position data on element for animation
        card.dataset.y = y;
        card.dataset.angle = angle;

        // Apply transform
        // We apply the static 3D transform here. The floating animation is handled by CSS, 
        // but we need to be careful not to override the transform with CSS animation if it uses transform.
        // Actually, CSS animation will override inline style transform if we are not careful.
        // Better approach: Put the content INSIDE a wrapper that floats, or use a wrapper for the 3D position.
        
        // Let's use a wrapper for 3D positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        // 注意：这里我们只设置初始位置，整体的移动由 helix 容器控制
        wrapper.style.transform = `translateY(${y}px) rotateY(${angle}deg) translateZ(${CONFIG.radius}px)`;
        
        card.style.animationDelay = `${Math.random() * 5}s`;

        // Content
        const img = document.createElement('img');
        img.className = 'avatar';
        img.src = op.avatarUrl || 'placeholder.png';
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = `
            <div class="name">${op.name}</div>
            <div class="date">${op.releaseTime.split(' ')[0]}</div>
        `;

        card.appendChild(img);
        card.appendChild(info);
        
        // Click event
        card.addEventListener('click', () => showDetail(op));
        
        wrapper.appendChild(card);
        
        // 添加渐进式延迟动画
        wrapper.style.animationDelay = `${index * 0.03}s`;
        
        els.helix.appendChild(wrapper);
    });
}

// Interaction
function setupInteractions() {
    // Helper function: 检查事件是否发生在模态框内
    function isEventInModal(e) {
        // 检查所有可能打开的模态框
        const modals = [els.importModal, els.shareModal, els.detailPanel];
        for (const modal of modals) {
            if (modal && !modal.classList.contains('hidden')) {
                // 模态框可见，检查事件目标是否在模态框内
                if (modal.contains(e.target)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Scroll / Wheel
    window.addEventListener('wheel', (e) => {
        // 如果在模态框内滚动，不影响螺旋滚筒
        if (isEventInModal(e)) {
            return;
        }
        state.targetScrollPos += e.deltaY * CONFIG.scrollSpeed;
        clampScroll(); // [新增] 限制边界
    });

    // Dragging (Simple implementation)
    document.addEventListener('mousedown', (e) => {
        // 如果在模态框内点击，不触发拖拽
        if (isEventInModal(e)) {
            return;
        }
        state.isDragging = true;
        state.lastMouseY = e.clientY;
        els.world.style.cursor = 'grabbing';
    });

    document.addEventListener('mouseup', () => {
        state.isDragging = false;
        els.world.style.cursor = 'grab';
    });

    document.addEventListener('mousemove', (e) => {
        if (state.isDragging) {
            const deltaY = e.clientY - state.lastMouseY;
            state.targetScrollPos -= deltaY * 2; // 降低拖拽速度
            state.lastMouseY = e.clientY;
            clampScroll(); // [新增] 限制边界
        }
    });

    // Touch support for mobile
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        // 如果在模态框内触摸，不触发拖拽
        if (isEventInModal(e)) {
            return;
        }
        state.isDragging = true;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
        state.isDragging = false;
    });

    document.addEventListener('touchmove', (e) => {
        if (state.isDragging && e.touches.length > 0) {
            const deltaY = e.touches[0].clientY - touchStartY;
            state.targetScrollPos -= deltaY * 0.5; // 降低触摸滑动速度
            touchStartY = e.touches[0].clientY;
            clampScroll();
        }
    }, { passive: true });

    // Import Modal
    els.importBtn.addEventListener('click', () => {
        els.importModal.classList.remove('hidden');
    });

    // Clear Data
    let clearConfirmTimer = null;
    els.clearBtn.addEventListener('click', () => {
        if (state.operators.length === 0) {
            ArkInfoTip.warning('当前无数据需要清除', 'No Data');
            return; // 已经是空数据，无需清除
        }
        
        // 双击确认机制
        if (clearConfirmTimer === null) {
            // 第一次点击
            ArkInfoTip.warning('再次点击确认清除数据 // 此操作不可撤销', 'Confirm Clear', {
                duration: 3000,
                closable: false
            });
            clearConfirmTimer = setTimeout(() => {
                clearConfirmTimer = null;
            }, 3000);
        } else {
            // 第二次点击（3秒内）
            clearTimeout(clearConfirmTimer);
            clearConfirmTimer = null;
            clearData();
            ArkInfoTip.success('数据已清除，系统已重置', 'Data Cleared');
        }
    });

    els.cancelImport.addEventListener('click', () => {
        els.importModal.classList.add('hidden');
    });

    els.confirmImport.addEventListener('click', () => {
        try {
            const userData = JSON.parse(els.importText.value);
            if (!Array.isArray(userData) || userData.length === 0) {
                ArkInfoTip.warning('数据格式错误或为空数组', 'Invalid Data');
                return;
            }
            applyUserData(userData);
            els.importModal.classList.add('hidden');
            // 数据导入成功，触发标题收缩为ORSS
            const titleBilingual = document.querySelector('.title-bilingual');
            if (titleBilingual && userData.length > 0) {
                titleBilingual.classList.add('mode-orss');
            }
            
            // 导入成功通知
            const totalCount = state.operators.length;
            const missingCount = state.missingOps.length;
            ArkInfoTip.success(`成功导入 ${totalCount} 名干员档案 // 未招募 ${missingCount} 名`, 'Data Synced');
            
        } catch (e) {
            console.error('Import error:', e);
            ArkInfoTip.error('JSON 格式错误，请检查数据格式', 'Parse Failed');
        }
    });

    // Detail Panel
    els.closeDetail.addEventListener('click', () => {
        els.detailPanel.classList.add('hidden');
    });

    // Share Interactions
    if (els.shareBtn) {
        els.shareBtn.addEventListener('click', generateShareCard);
    }
    if (els.closeShare) {
        els.closeShare.addEventListener('click', () => {
            els.shareModal.classList.add('hidden');
        });
    }
    if (els.downloadShare) {
        els.downloadShare.addEventListener('click', downloadShareImage);
    }
    
    // Close modal on outside click
    if (els.shareModal) {
        els.shareModal.addEventListener('click', (e) => {
            if (e.target === els.shareModal) {
                els.shareModal.classList.add('hidden');
            }
        });
    }

    // Config Interactions
    if (els.refreshShare) {
        els.refreshShare.addEventListener('click', () => {
            updateConfigFromUI();
            ArkInfoTip.info('正在更新预览...', 'Updating');
            generateShareCard(false); // false = don't toggle modal, just refresh
        });
    }

    // Theme Selection
    if (els.configTheme) {
        const opts = els.configTheme.querySelectorAll('.color-opt');
        opts.forEach(opt => {
            opt.addEventListener('click', () => {
                opts.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                shareConfig.theme = opt.dataset.color;
            });
        });
    }
}

function updateConfigFromUI() {
    shareConfig.name = els.configName.value || "DOCTOR";
    shareConfig.langPri = els.configLangPri.value;
    shareConfig.langSec = els.configLangSec.value;
    shareConfig.assistant = els.configAssistant.value;
}

function updateAssistantOptions() {
    if (!els.configAssistant) return;
    
    // Clear existing (except first)
    while (els.configAssistant.options.length > 1) {
        els.configAssistant.remove(1);
    }
    
    // Add owned operators (prioritize 6 stars)
    const owned = state.operators.filter(op => op.own);
    // Sort: 6 star first, then by date
    owned.sort((a, b) => {
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return b.timestamp - a.timestamp;
    });
    
    owned.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op.name;
        opt.text = op.name;
        els.configAssistant.appendChild(opt);
    });
}

// [新增] 限制滚动范围的辅助函数
function clampScroll() {
    // 允许一点点弹性（-50 到 max+50），但主要限制在 0 到 maxScroll 之间
    const max = (typeof state.maxScroll === 'number' && !isNaN(state.maxScroll)) ? state.maxScroll : 0;
    if (state.targetScrollPos < -50) state.targetScrollPos = -50;
    if (state.targetScrollPos > max + 50) state.targetScrollPos = max + 50;
}

function clearData() {
    // 清空数据状态
    state.operators = [];
    state.missingOps = [];
    
    // 重置滚动位置
    state.scrollPos = 0;
    state.targetScrollPos = 0;
    state.maxScroll = 0;
    
    // 隐藏清除和分享按钮
    if (els.btnGroup) {
        els.btnGroup.classList.remove('has-data');
    }
    
    // 更新UI
    filterMissing();
    updateStats();
    updateAssistantOptions();
    renderHelix();
}

function applyUserData(userData) {
    // Rebuild operators list based on userData
    state.operators = userData.map(userOp => {
        const resourceOp = state.resourceMap.get(userOp.name);
        const meta = state.avatarMap.get(userOp.name);
        
        // Use resource data if available, otherwise default
        const releaseTime = resourceOp ? resourceOp.releaseTime : "2099年12月31日 00:00";
        const timestamp = parseDate(releaseTime);

        return {
            ...userOp, // contains id, name, elite, level, own, potential, rarity
            rarity: resourceOp ? resourceOp.rarity : (userOp.rarity || 1),
            releaseTime: releaseTime,
            source: resourceOp ? resourceOp.source : 'Unknown',
            avatarUrl: meta ? `../resource/arknights-avatars/${meta.name}.png` : null,
            timestamp: timestamp
        };
    });

    // Sort by date (newest first)
    state.operators.sort((a, b) => b.timestamp - a.timestamp);

    filterMissing();
    updateStats();
    updateAssistantOptions(); // Update assistant list
    
    // 重置滚动位置
    state.scrollPos = 0;
    state.targetScrollPos = 0;
    
    // 显示清除和分享按钮
    if (els.btnGroup) {
        els.btnGroup.classList.add('has-data');
    }
    
    renderHelix();
}

function showDetail(op) {
    document.getElementById('detailImg').src = op.avatarUrl;
    document.getElementById('detailName').innerText = op.name;
    document.getElementById('wikiLink').href = `https://prts.wiki/w/${encodeURIComponent(op.name)}`;
    document.getElementById('detailRarity').innerText = '★'.repeat(parseInt(op.rarity)); // Rarity is 1-based in JSON
    document.getElementById('detailDate').innerText = op.releaseTime;
    document.getElementById('detailSource').innerText = op.source || 'Unknown';
    
    const days = Math.floor((Date.now() - op.timestamp) / (1000 * 60 * 60 * 24));
    document.getElementById('detailMissed').innerText = `${days} DAYS`;

    els.detailPanel.classList.remove('hidden');
}

// Animation Loop
function animate() {
    // Smooth scroll interpolation
    state.scrollPos += (state.targetScrollPos - state.scrollPos) * 0.1;

    // [核心修改逻辑]
    // 1. 旋转：直接使用 scrollPos 作为角度。
    const rotation = -state.scrollPos; 

    // 2. 垂直位移：
    // 我们知道每个干员在构建时，Y坐标是 index * CONFIG.cardSpacing。
    // 我们也知道每个干员的角度是 index * CONFIG.angleStep。
    // 所以，当前旋转角度对应的理论 Y 坐标是： (当前角度 / 每步角度) * 每步高度。
    // 我们需要将整个容器 *反向* 移动这个距离，从而把“当前角度对应的干员”拉回到 Y=0 (屏幕中心)。
    const verticalOffset = -(state.scrollPos / CONFIG.angleStep) * CONFIG.cardSpacing;

    // 应用变换
    // 注意：先旋转，再垂直移动，或者反之，取决于坐标系。
    // 在 CSS transform 中，顺序很重要。
    // 我们希望圆筒绕 Y 轴旋转，同时在 Y 轴上平移。
    els.helix.style.transform = `translateY(${verticalOffset}px) rotateY(${rotation}deg)`;

    requestAnimationFrame(animate);
}

// Noise Effect for Background
function initNoise() {
    const canvas = els.noiseCanvas;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    
    // Handle responsive config changes on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newConfig = getResponsiveConfig();
            if (JSON.stringify(newConfig) !== JSON.stringify(CONFIG)) {
                CONFIG = newConfig;
                // Re-render the helix with new config
                if (state.missingOps.length > 0) {
                    renderHelix();
                }
            }
        }, 250);
    });

    function loop() {
        const w = canvas.width;
        const h = canvas.height;
        const idata = ctx.createImageData(w, h);
        const buffer32 = new Uint32Array(idata.data.buffer);
        const len = buffer32.length;

        for (let i = 0; i < len; i++) {
            if (Math.random() < 0.05) {
                buffer32[i] = 0xffffffff; // White noise
            }
        }

        ctx.putImageData(idata, 0, 0);
        requestAnimationFrame(loop);
    }
    loop();
}

async function generateShareCard(showModal = true) {
    // Wait for fonts to ensure layout is correct
    try {
        await document.fonts.ready;
    } catch (e) {
        console.warn("Font loading check failed", e);
    }

    // 1. Calculate Stats
    const total = state.operators.length;
    if (total === 0) {
        ArkInfoTip.warning('请先导入干员数据后再生成报告', 'No Data');
        return;
    }
    
    // 生成中通知
    ArkInfoTip.info('正在生成人事报告...', 'Generating');
    
    const owned = state.operators.filter(op => op.own).length;
    const missing = state.missingOps.length;
    const rate = ((owned / total) * 100).toFixed(1);
    
    // 6 Star Stats
    // Note: rarity is string in JSON
    const sixStarOps = state.operators.filter(op => op.rarity == "6");
    const sixStarTotal = sixStarOps.length;
    const sixStarOwned = sixStarOps.filter(op => op.own).length;
    const sixStarRate = sixStarTotal > 0 ? ((sixStarOwned / sixStarTotal) * 100).toFixed(1) : "0.0";

    // 2. Update DOM with Config
    updateShareLabels();
    
    // Theme
    const themeColor = {
        cyan: '#00ffcc',
        yellow: '#ffcc00',
        red: '#ff3333'
    }[shareConfig.theme] || '#00ffcc';
    
    els.shareCardContainer.style.setProperty('--accent-cyan', themeColor);
    
    // Assistant
    if (shareConfig.assistant) {
        const op = state.operators.find(o => o.name === shareConfig.assistant);
        if (op && op.avatarUrl) {
            els.shareAssistantImg.querySelector('img').src = op.avatarUrl;
            els.shareAssistantImg.classList.remove('hidden');
            // els.shareCardContainer.classList.add('has-assistant'); // No longer needed for width change
        } else {
            els.shareAssistantImg.classList.add('hidden');
            // els.shareCardContainer.classList.remove('has-assistant');
        }
    } else {
        els.shareAssistantImg.classList.add('hidden');
        // els.shareCardContainer.classList.remove('has-assistant');
    }

    // Data
    const now = new Date();
    els.shareDate.innerText = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getDate().toString().padStart(2,'0')}`;
    els.shareTotalOps.innerText = total;
    els.shareOwnedOps.innerText = owned;
    els.shareRate.innerText = `${rate}%`;
    els.shareMissing.innerText = missing;
    els.shareProgressBar.style.width = `${rate}%`;
    els.shareProgressBar.style.backgroundColor = themeColor;
    
    els.share6StarOwned.innerText = sixStarOwned;
    els.share6StarTotal.innerText = sixStarTotal;
    els.share6StarRate.innerText = `${sixStarRate}%`;
    
    els.shareId.innerText = shareConfig.name;
    
    // Morse Code Decoration
    const isFullCollection = (owned === total);
    const morseText = isFullCollection ? MORSE_FULL : MORSE_NOT_FULL;
    
    if (els.shareMorseContainer) {
        // Clear existing
        els.shareMorseContainer.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        const w = els.shareCardContainer.offsetWidth;
        const h = els.shareCardContainer.offsetHeight;
        
        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        els.shareMorseContainer.appendChild(canvas);
        
        // 1. Parse Morse to Elements
        // Structure: { type: 'dot'|'dash'|'gap', units: number }
        const elements = [];
        const chars = morseText.split('');
        
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            if (char === '.') {
                elements.push({ type: 'dot', units: 1 });
                elements.push({ type: 'gap', units: 1 }); // Intra-char gap
            } else if (char === '-') {
                elements.push({ type: 'dash', units: 3 });
                elements.push({ type: 'gap', units: 1 }); // Intra-char gap
            } else if (char === ' ') {
                // Space between characters. 
                // We already added a 1-unit gap after the last symbol.
                // Standard inter-char gap is 3 units. So we need 2 more.
                if (elements.length > 0 && elements[elements.length-1].type === 'gap') {
                     elements[elements.length-1].units += 2;
                } else {
                     elements.push({ type: 'gap', units: 3 });
                }
            } else if (char === '/') {
                // Word separator. Standard is 7 units.
                // If preceded by gap(1), add 6.
                if (elements.length > 0 && elements[elements.length-1].type === 'gap') {
                     elements[elements.length-1].units += 6;
                } else {
                     elements.push({ type: 'gap', units: 7 });
                }
            }
        }
        // Remove trailing gap
        if (elements.length > 0 && elements[elements.length-1].type === 'gap') {
            elements.pop();
        }

        // 2. Calculate Layout
        const totalUnits = elements.reduce((sum, el) => sum + el.units, 0);
        const padding = 13.5; // Inset
        const pathW = w - (padding * 2);
        const pathH = h - (padding * 2);
        const perimeter = (pathW + pathH) * 2;
        
        // Calculate unit size to fit exactly (Stretch deformation)
        const unitPx = perimeter / totalUnits;
        
        // 3. Draw
        // [颜色控制] 
        // 使用低透明度白色 (Alpha 0.12)，使其在宏观视角下仅表现为装饰性边框纹理，不喧宾夺主。
        // 配合深色背景，在放大查看细节时依然保持清晰的边缘。
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; 
        
        // Dynamic stroke width based on unit size, but clamped
        const strokeWidth = Math.max(2, Math.min(6, unitPx * 0.8));
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round'; // Makes dots round and dashes rounded rects
        
        ctx.beginPath();
        
        let currentDist = 0;
        
        // Helper to get coordinate at distance
        const getCoord = (d) => {
            // Normalize d to 0-perimeter
            d = d % perimeter;
            if (d < 0) d += perimeter;
            
            if (d < pathW) {
                // Top edge: (padding + d, padding)
                return { x: padding + d, y: padding, side: 0 };
            } else if (d < pathW + pathH) {
                // Right edge: (w - padding, padding + (d - pathW))
                return { x: w - padding, y: padding + (d - pathW), side: 1 };
            } else if (d < pathW * 2 + pathH) {
                // Bottom edge: (w - padding - (d - pathW - pathH), h - padding)
                // Note: Bottom edge goes Right to Left
                return { x: w - padding - (d - pathW - pathH), y: h - padding, side: 2 };
            } else {
                // Left edge: (padding, h - padding - (d - 2*pathW - pathH))
                // Note: Left edge goes Bottom to Top
                return { x: padding, y: h - padding - (d - 2*pathW - pathH), side: 3 };
            }
        };

        elements.forEach(el => {
            const lenPx = el.units * unitPx;
            
            if (el.type !== 'gap') {
                // To ensure dots look like dots and dashes like dashes with lineCap='round':
                // We draw a segment shorter than the allocated slot.
                // Visual Length = PathLength + StrokeWidth.
                // We want Visual Length ~= lenPx.
                // So PathLength = lenPx - StrokeWidth.
                
                let drawLen = lenPx - strokeWidth;
                // Ensure minimal length for dots so they appear
                if (drawLen < 0.1) drawLen = 0.1; 
                
                // Center the drawing within the slot
                const centerDist = currentDist + lenPx / 2;
                const startDist = centerDist - drawLen / 2;
                const endDist = centerDist + drawLen / 2;
                
                const start = getCoord(startDist);
                const end = getCoord(endDist);
                
                if (start.side === end.side) {
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                } else {
                    // Crosses corner
                    // Find corner coordinate
                    let cornerX, cornerY;
                    if (start.side === 0) { cornerX = w - padding; cornerY = padding; }      // Top -> Right
                    else if (start.side === 1) { cornerX = w - padding; cornerY = h - padding; } // Right -> Bottom
                    else if (start.side === 2) { cornerX = padding; cornerY = h - padding; }     // Bottom -> Left
                    else { cornerX = padding; cornerY = padding; }                               // Left -> Top
                    
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(cornerX, cornerY);
                    ctx.lineTo(end.x, end.y);
                }
            }
            
            currentDist += lenPx;
        });
        
        ctx.stroke();
    }

    // 3. Generate Image
    if (showModal) els.shareModal.classList.remove('hidden');
    els.sharePreviewImage.src = ""; // Clear previous
    
    try {
        // Wait for fonts to load if possible, or just wait a bit
        await document.fonts.ready;
        
        const canvas = await html2canvas(els.shareCardContainer, {
            backgroundColor: '#0a0a0a',
            scale: 2, // High resolution
            logging: false,
            useCORS: true,
            allowTaint: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        els.sharePreviewImage.src = imgData;
        
        // 生成成功通知
        if (showModal) {
            ArkInfoTip.success('人事报告已生成完成', 'Report Ready');
        }
    } catch (e) {
        console.error("Share generation failed:", e);
        ArkInfoTip.error('报告生成失败，请重试', 'Generation Failed');
    }
}

function updateShareLabels() {
    const getLabel = (key) => {
        const pri = DICTIONARY[key][shareConfig.langPri] || DICTIONARY[key]['en'];
        const sec = shareConfig.langSec === 'none' ? '' : (DICTIONARY[key][shareConfig.langSec] || '');
        
        if (!sec) return pri;
        return `${pri} <span style="font-size: 0.6em; color: #666; font-weight: normal;">${sec}</span>`;
    };

    els.lblTitle.innerHTML = getLabel('title');
    els.lblTotal.innerHTML = getLabel('total');
    els.lblRecruited.innerHTML = getLabel('recruited');
    els.lblRate.innerHTML = getLabel('rate');
    els.lblMissing.innerHTML = getLabel('missing');
    els.lblProgress.innerHTML = getLabel('progress');
    els.lblElite.innerHTML = getLabel('elite');
    els.lblOwned.innerHTML = getLabel('owned');
    els.lblTotalSub.innerHTML = getLabel('totalSub');
    els.lblRateSub.innerHTML = getLabel('rateSub');
}

function downloadShareImage() {
    if (!els.sharePreviewImage.src) {
        ArkInfoTip.warning('报告未生成，请先生成报告', 'No Report');
        return;
    }
    const link = document.createElement('a');
    const fileName = `Rhodes_Island_Report_${Date.now()}.png`;
    link.download = fileName;
    link.href = els.sharePreviewImage.src;
    link.click();
    
    // 下载成功通知
    ArkInfoTip.success('报告已保存至本地', 'Download Complete');
}

// Start
init();
