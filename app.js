// LOTO IMPERIAL - Advanced Pan-Asian Logic, Choreography & Dynamic Data

class ImageSequence {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.baseUrl = config.url;
        this.prefix = config.prefix || '';
        this.frameCount = config.frameCount;
        this.padding = config.padding || 0;
        this.extension = config.extension || 'png';

        this.images = [];
        this.currentFrame = 0;
        this.isLoaded = false;
        this.opacity = 1;

        this.init();
    }

    async init() {
        console.log(`Initializing sequence: ${this.baseUrl}`);
        try {
            const loadPromises = [];
            for (let i = 0; i < this.frameCount; i++) {
                const frameNum = i.toString().padStart(this.padding, '0');
                const url = `${this.baseUrl}/${this.prefix}${frameNum}.${this.extension}`;
                loadPromises.push(this.loadImage(url));
            }
            this.images = await Promise.all(loadPromises);
            this.isLoaded = true;
            console.log(`Sequence loaded successfully: ${this.frameCount} frames`);
            this.resize();
            this.render();
            window.addEventListener('resize', () => this.resize());
        } catch (e) {
            console.error("CRITICAL ERROR loading image sequence:", e);
        }
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load: ${url}`));
            img.src = url;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.render();
    }

    setFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
        this.render();
    }

    setOpacity(val) {
        this.opacity = val;
        this.render();
    }

    render() {
        if (!this.isLoaded) return;
        const img = this.images[this.currentFrame];
        if (!img) return;

        const canvasAspect = this.canvas.width / this.canvas.height;
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (canvasAspect > imgAspect) {
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imgAspect;
            offsetY = (this.canvas.height - drawHeight) / 2;
        } else {
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imgAspect;
            offsetX = (this.canvas.width - drawWidth) / 2;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = this.opacity;
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        this.ctx.globalAlpha = 1.0;
    }
}

class SequenceManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.sequences = {};
        this.currentSeqId = null;
    }

    async addSequence(id, config) {
        const seq = new ImageSequence(this.canvasId, config);
        this.sequences[id] = seq;
        await seq.init();
        return seq;
    }

    setFrame(id, frame) {
        if (this.sequences[id]) {
            this.sequences[id].setFrame(frame);
        }
    }

    setOpacity(id, opacity) {
        if (this.sequences[id]) {
            this.sequences[id].setOpacity(opacity);
        }
    }

    async transitionTo(id) {
        if (this.currentSeqId === id) return;

        const prevId = this.currentSeqId;
        this.currentSeqId = id;

        if (prevId && this.sequences[prevId]) {
            gsap.to(this.sequences[prevId], {
                opacity: 0,
                duration: 0.5,
                onUpdate: () => this.sequences[prevId].setOpacity(this.sequences[prevId].opacity)
            });
        }

        if (this.sequences[id]) {
            this.sequences[id].opacity = 0;
            this.sequences[id].render();
            gsap.to(this.sequences[id], {
                opacity: 1,
                duration: 0.5,
                onUpdate: () => this.sequences[id].setOpacity(this.sequences[id].opacity)
            });
        }
    }
}

// Global state for menu data
let MENU_DATA = null;

async function fetchMenuData() {
    console.log('Fetching menu data...');
    try {
        const response = await fetch('menu.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        MENU_DATA = await response.json();
        console.log('Menu data loaded successfully:', MENU_DATA);
        return MENU_DATA;
    } catch (error) {
        console.error('CRITICAL ERROR loading menu data:', error);
        return null;
    }
}

async function initializeApp() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // 1. Sequence Animation System
    const manager = new SequenceManager('hero-canvas');

    // Home to Menu Transition
    await manager.addSequence('home-to-menu', {
        url: 'imagenes/background/comp1',
        prefix: 'frame_',
        frameCount: 145,
        padding: 5,
        extension: 'png'
    });

    // Set initial sequence
    await manager.transitionTo('home-to-menu');

    // Animation Proxy for Home sequence to allow easing
    const homeProxy = { frame: 0 };
    gsap.to(homeProxy, {
        frame: manager.sequences['home-to-menu'].frameCount - 1,
        scrollTrigger: {
            trigger: '#home',
            start: 'top top',
            end: 'bottom top',
            scrub: 1, // Smooth scrub
        },
        ease: 'power2.inOut',
        onUpdate: () => {
            manager.setFrame('home-to-menu', Math.round(homeProxy.frame));
        }
    });

    // PLACEHOLDERS FOR FUTURE TRANSITIONS
    // Once images are provided, we will add sequences here:
    // - 'menu-to-reserve'
    // - 'reserve-to-contact'
    // And set up their ScrollTriggers similarly to homeProxy.

    // 2. Menu Animations
    gsap.fromTo('#menu .section-header',
        { y: 50, opacity: 0 },
        {
            scrollTrigger: {
                trigger: '#menu',
                start: 'top 80%',
            },
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power3.out'
        }
    );

    gsap.fromTo('#menu .cat-btn',
        { scale: 0, opacity: 0 },
        {
            scrollTrigger: {
                trigger: '#menu',
                start: 'top 70%',
            },
            scale: 1,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'back.out(1.7)'
        }
    );

    // 3. Reserve Animations
    gsap.fromTo('#reserve .reservation-card',
        { scale: 0.8, opacity: 0 },
        {
            scrollTrigger: {
                trigger: '#reserve',
                start: 'top 70%',
            },
            scale: 1,
            opacity: 1,
            duration: 1.2,
            ease: 'expo.out'
        }
    );

    // 4. Contact Animations
    gsap.fromTo('#contact .contact-info',
        { x: -100, opacity: 0 },
        {
            scrollTrigger: {
                trigger: '#contact',
                start: 'top 80%',
            },
            x: 0,
            opacity: 1,
            duration: 1,
            ease: 'power2.out'
        }
    );

    gsap.fromTo('#contact .map-placeholder',
        { x: 100, opacity: 0 },
        {
            scrollTrigger: {
                trigger: '#contact',
                start: 'top 80%',
            },
            x: 0,
            opacity: 1,
            duration: 1,
            ease: 'power2.out'
        }
    );

    // ==========================================
    // HYBRID NAVIGATION SYSTEM
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            gsap.to(window, {
                duration: 1.5,
                scrollTo: {
                    y: `#${targetId}`,
                    offsetY: 0
                },
                ease: 'power3.inOut'
            });
        });
    });

    // ==========================================
    // CORE MENU LOGIC (Dynamic Data)
    // ==========================================
    const catButtons = document.querySelectorAll('.cat-btn');
    const menuGrid = document.getElementById('menu-grid');

    function renderMenu(category) {
        if (!menuGrid) return;
        menuGrid.innerHTML = '';

        const items = (MENU_DATA && MENU_DATA[category]) ? MENU_DATA[category] : [];

        if (items.length === 0) {
            menuGrid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column: 1/-1;">Próximamente más delicias en esta categoría.</p>';
            return;
        }

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'menu-item';
            card.innerHTML = `
                <div class="menu-item-image-wrapper">
                    <img src="${item.img}" alt="${item.name}" loading="lazy">
                </div>
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <h3>${item.name}</h3>
                        <span class="price">${item.price}</span>
                    </div>
                    <p class="menu-item-desc">${item.desc}</p>
                </div>
            `;
            menuGrid.appendChild(card);
        });
    }

    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(btn.getAttribute('data-cat'));
        });
    });

    // INITIAL LOAD SEQUENCE
    await fetchMenuData();
    renderMenu('japones');

    const reserveForm = document.getElementById('premiumReserveForm');
    const feedback = document.getElementById('reservaFeedback');

    if (reserveForm) {
        reserveForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = reserveForm.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Procesando...';
            setTimeout(() => {
                feedback.innerHTML = `
                    <div style="text-align:center; color: var(--primary-highlight); margin-top:20px;">
                        <i class="fa-solid fa-circle-check" style="font-size:2rem;"></i>
                        <p>Reservación confirmada. Esperamos verle pronto en Loto Imperial.</p>
                    </div>
                `;
                feedback.classList.remove('hidden');
                submitBtn.innerText = 'Reservado';
                reserveForm.reset();
            }, 2000);
        });
    }

    const navItemsScroll = document.querySelectorAll('.nav-item');
    const sectionsScroll = document.querySelectorAll('.section');

    window.addEventListener('scroll', () => {
        let current = '';
        sectionsScroll.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        navItemsScroll.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Error', err));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(err => console.error('Critical app init error:', err));
});
