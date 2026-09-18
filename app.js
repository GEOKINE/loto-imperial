import { SequenceManager } from './js/sequence.js';
import { fetchMenuData, renderMenu } from './js/menu.js';

async function initializeApp() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // 1. Sequence Animation System
    const manager = new SequenceManager('hero-canvas');

    // Home to Menu Transition
    await manager.addSequence('home-to-// Home to Menu Transition
    await manager.addSequence('home-to-menu', {
        url: 'imagenes/background/comp2',
        prefix: 'Comp 2_',
        frameCount: 144,
        padding: 5,
        extension: 'png'
    });

    await manager.transitionTo('home-to-menu');

    const homeProxy = { frame: 0 };
    gsap.to(homeProxy, {
        frame: manager.sequences['home-to-menu'].frameCount - 1,
        scrollTrigger: {
            trigger: '#home',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
        },
        ease: 'none',
        onUpdate: () => {
            manager.setFrame('home-to-menu', Math.round(homeProxy.frame));
        }
    });

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

    // Hybrid Navigation System
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            gsap.to(window, {
                duration: 1.5,
                scrollTo: { y: `#${targetId}`, offsetY: 0 },
                ease: 'power3.inOut'
            });
        });
    });

    // Core Menu Logic
    const catButtons = document.querySelectorAll('.cat-btn');
    const menuGrid = document.getElementById('menu-grid');
    const menuData = await fetchMenuData();

    function handleCategoryChange(category) {
        catButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-cat') === category);
        });
        renderMenu(menuGrid, menuData, category);
    }

    catButtons.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryChange(btn.getAttribute('data-cat')));
    });

    renderMenu(menuGrid, menuData, 'japones');

    // Reservation Form
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

    // Active Nav Item on Scroll
    const sectionsScroll = document.querySelectorAll('.section');
    window.addEventListener('scroll', () => {
        let current = '';
        sectionsScroll.forEach(section => {
            if (window.pageYOffset >= section.offsetTop - 100) {
                current = section.getAttribute('id');
            }
        });
        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('href') === `#${current}`);
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
