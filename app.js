import { SequenceManager } from './js/sequence.js';
import { fetchMenuData, renderMenu } from './js/menu.js';
import { supabase } from './js/supabaseClient.js';

async function initializeApp() {
    console.log('🚀 Loto Imperial: Iniciando aplicación...');
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // ==========================================
    // 0. SISTEMA DE ANIMACIÓN (Carga Prioritaria)
    // ==========================================
    const manager = new SequenceManager('hero-canvas');

    // Cargamos la secuencia y configuramos el frame inicial
    await manager.addSequence('home-to-menu', {
        url: 'imagenes/background/comp2',
        prefix: 'Comp 2_',
        frameCount: 144,
        padding: 5,
        extension: 'png'
    });

    // EMPIEZA DESDE EL FRAME 9
    const START_FRAME = 9;
    const END_FRAME = 143;
    manager.setFrame('home-to-menu', START_FRAME);
    await manager.transitionTo('home-to-menu');

    const homeProxy = { frame: START_FRAME };
    gsap.to(homeProxy, {
        frame: END_FRAME,
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

    // ==========================================
    // 1. SISTEMA DE AUTENTICACIÓN
    // ==========================================
    const authModal = document.getElementById('authModal');
    const closeModal = document.querySelector('.close-modal');
    const navAccount = document.getElementById('navAccount');
    const accountLabel = document.getElementById('accountLabel');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authFullName = document.getElementById('authFullName');
    const registerFields = document.getElementById('registerFields');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authFeedback = document.getElementById('authFeedback');

    let currentAuthMode = 'login';

    navAccount.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                authModal.classList.remove('hidden');
            } else {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.role === 'admin') {
                    showSection('admin');
                } else {
                    showSection('profile');
                }
            }
        } catch (err) {
            authModal.classList.remove('hidden');
        }
    });

    closeModal.addEventListener('click', () => authModal.classList.add('hidden'));

    tabLogin.addEventListener('click', () => {
        currentAuthMode = 'login';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        registerFields.classList.add('hidden');
        authSubmitBtn.innerText = 'Ingresar';
    });

    tabRegister.addEventListener('click', () => {
        currentAuthMode = 'register';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerFields.classList.remove('hidden');
        authSubmitBtn.innerText = 'Registrarse';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authFeedback.classList.add('hidden');
        const email = authEmail.value;
        const password = authPassword.value;

        try {
            if (currentAuthMode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showNotification('Bienvenido de nuevo, Imperial.', 'success');
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: authFullName.value } }
                });
                if (error) throw error;
                showNotification('Registro exitoso. Revisa tu correo.', 'success');
            }
            authModal.classList.add('hidden');
            authForm.reset();
        } catch (err) {
            authFeedback.innerHTML = `<p style="color: #ff4444; text-align:center; margin-top:10px;">${err.message}</p>`;
            authFeedback.classList.remove('hidden');
            showNotification('Error en la autenticación.', 'error');
        }
    });

    async function updateAuthUI(user) {
        if (user) {
            accountLabel.innerText = 'Mi Cuenta';
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role === 'admin') accountLabel.innerText = 'Panel Admin';
        } else {
            accountLabel.innerText = 'Cuenta';
        }
    }

    supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session?.user || null);
    });

    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session?.user || null);

    async function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.remove('hidden');

            // ESTÁTICO FRAME 143 PARA PANEL DE USUARIO Y ADMIN
            if (sectionId === 'profile' || sectionId === 'admin') {
                manager.setFrame('home-to-menu', 143);
            }

            if (sectionId === 'profile') await loadUserProfile();
            else if (sectionId === 'admin') await loadAdminPanel();
        }
    }

    async function loadUserProfile() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        document.getElementById('userName').innerText = profile?.full_name || 'Usuario Imperial';
        document.getElementById('userEmail').innerText = session.user.email;
        const { data: res } = await supabase.from('reservations').select('*').eq('user_id', session.user.id).order('date', { ascending: false });
        const resGrid = document.getElementById('userReservationsGrid');
        resGrid.innerHTML = '';
        if (!res || res.length === 0) {
            resGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No tienes reservaciones registradas.</p>';
            return;
        }
        res.forEach(r => {
            const card = document.createElement('div');
            card.className = 'reservation-entry';
            card.innerHTML = `
                <div class="res-info">
                    <strong style="display:block; font-family: var(--font-title); color: var(--primary-highlight);">${r.date}</strong>
                    <span style="color: var(--text-main);">${r.time} | ${r.guests} Invitados</span>
                </div>
                <div class="res-code-badge">${r.special_code}</div>
            `;
            resGrid.appendChild(card);
        });
    }

    async function loadAdminPanel() {
        const { data: res } = await supabase.from('reservations').select('*, profiles(full_name)').eq('status', 'pendiente').order('date', { ascending: true });
        const adminGrid = document.getElementById('adminReservationsGrid');
        adminGrid.innerHTML = '';
        if (!res || res.length === 0) {
            adminGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay reservaciones pendientes.</p>';
            return;
        }
        res.forEach(r => {
            const item = document.createElement('div');
            item.className = 'admin-res-item';
            item.innerHTML = `
                <div class="admin-res-info">
                    <strong style="display:block; color: var(--primary-highlight);">${r.profiles?.full_name || 'Desconocido'}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${r.date} a las ${r.time} | ${r.guests} pax</span>
                </div>
                <div class="res-code-badge">${r.special_code}</div>
                <div class="admin-res-actions">
                    <button class="btn-premium" style="padding: 5px 10px; font-size: 0.7rem; margin-right: 5px;" onclick="updateResStatus('${r.id}', 'completada')">✓</button>
                    <button class="btn-premium" style="padding: 5px 10px; font-size: 0.7rem; border-color: #ff4444; color: #ff4444;" onclick="updateResStatus('${r.id}', 'cancelada')">✕</button>
                </div>
            `;
            adminGrid.appendChild(item);
        });
    }

    window.updateResStatus = async (id, status) => {
        const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
        if (error) showNotification('Error al actualizar estado', 'error');
        else {
            showNotification('Estado actualizado correctamente', 'success');
            await loadAdminPanel();
        }
    };

    document.getElementById('btnSearchCode').addEventListener('click', async () => {
        const code = document.getElementById('adminSearchCode').value;
        if (!code) return;
        const { data, error } = await supabase.from('reservations').select('*, profiles(full_name)').eq('special_code', code).single();
        if (error || !data) showNotification('Reservación no encontrada', 'error');
        else showNotification(`Encontrado: ${data.profiles?.full_name}`, 'success');
    });

    // 2. Menu Animations
    gsap.fromTo('#menu .section-header', { y: 50, opacity: 0 }, {
        scrollTrigger: { trigger: '#menu', start: 'top 80%' },
        y: 0, opacity: 1, duration: 1, ease: 'power3.out'
    });

    gsap.fromTo('#menu .cat-btn', { scale: 0, opacity: 0 }, {
        scrollTrigger: { trigger: '#menu', start: 'top 70%' },
        scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)'
    });

    // 3. Reserve Animations
    gsap.fromTo('#reserve .reservation-card', { scale: 0.8, opacity: 0 }, {
        scrollTrigger: { trigger: '#reserve', start: 'top 70%' },
        scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out'
    });

    // 4. Contact Animations
    gsap.fromTo('#contact .contact-info', { x: -100, opacity: 0 }, {
        scrollTrigger: { trigger: '#contact', start: 'top 80%' },
        x: 0, opacity: 1, duration: 1, ease: 'power2.out'
    });

    gsap.fromTo('#contact .map-placeholder', { x: 100, opacity: 0 }, {
        scrollTrigger: { trigger: '#contact', start: 'top 80%' },
        x: 0, opacity: 1, duration: 1, ease: 'power2.out'
    });

    // Hybrid Navigation System
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;
            e.preventDefault();
            document.querySelectorAll('.section').forEach(s => {
                if (!['profile', 'admin'].includes(s.id)) s.classList.remove('hidden');
            });
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
    fetchMenuData().then(menuData => {
        function handleCategoryChange(category) {
            catButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-cat') === category));
            renderMenu(menuGrid, menuData, category);
        }
        catButtons.forEach(btn => btn.addEventListener('click', () => handleCategoryChange(btn.getAttribute('data-cat'))));
        renderMenu(menuGrid, menuData, 'japones');
    });

    function showNotification(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Reservation Form
    const reserveForm = document.getElementById('premiumReserveForm');
    const feedback = document.getElementById('reservaFeedback');
    if (reserveForm) {
        reserveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showNotification('Por favor, inicie sesión para reservar.', 'error');
                navAccount.click();
                return;
            }
            const submitBtn = reserveForm.querySelector('.btn-submit');
            const date = reserveForm.querySelector('input[type="date"]').value;
            const time = reserveForm.querySelector('input[type="time"]').value;
            const guests = reserveForm.querySelector('select').value;
            const specialRequests = reserveForm.querySelector('textarea').value;
            const selectedDate = new Date(date + 'T00:00:00');
            const today = new Date();
            today.setHours(0,0,0,0);
            if (selectedDate < today) {
                showNotification('No puede reservar en una fecha pasada.', 'error');
                return;
            }
            submitBtn.disabled = true;
            submitBtn.innerText = 'Procesando...';
            try {
                const specialCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const { data, error } = await supabase.from('reservations').insert([{
                    user_id: session.user.id,
                    date, time, guests: parseInt(guests) || 1,
                    special_requests: specialRequests,
                    special_code: specialCode
                }]).select();
                if (error) throw error;
                feedback.innerHTML = `
                    <div style="text-align:center; color: var(--primary-highlight); margin-top:20px;">
                        <i class="fa-solid fa-circle-check" style="font-size:2rem;"></i>
                        <p>Reservación confirmada.</p>
                        <div class="res-code-badge" style="display:inline-block; margin: 15px 0; font-size: 1.5rem; padding: 10px 20px;">${specialCode}</div>
                        <p style="font-size: 0.8rem;">Guarde este código para presentarlo al llegar.</p>
                    </div>`;
                feedback.classList.remove('hidden');
                submitBtn.innerText = 'Reservado';
                reserveForm.reset();
                showNotification('Reservación realizada con éxito.', 'success');
            } catch (err) {
                showNotification('Error al procesar reservación.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirmar Reserva';
            }
        });
    }

    const sectionsScroll = document.querySelectorAll('.section');
    window.addEventListener('scroll', () => {
        let current = '';
        sectionsScroll.forEach(section => {
            if (window.pageYOffset >= section.offsetTop - 100) current = section.getAttribute('id');
        });
        navItems.forEach(item => {
            const target = item.getAttribute('data-target');
            item.classList.toggle('active', target === current);
        });
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(reg => console.log('SW Registered'));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(err => console.error('Critical app init error:', err));
});
