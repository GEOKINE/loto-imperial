import { SequenceManager } from './js/sequence.js';
import { fetchMenuData, renderMenu, initBookMenu } from './js/menu.js?v=2';
import { supabase } from './js/supabaseClient.js';
import { showReservationSuccess } from './reservation-success.js';

async function initializeApp() {
    console.log('🚀 Loto Imperial: Iniciando aplicación...');
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // ==========================================
    // 🔮 CONTROL DE PANTALLA DE CARGA (ORIGINAL GITHUB)
    // ==========================================
    const loadingScreen = document.getElementById('loadingScreen');
    const loaderBar = document.getElementById('loaderBar');

    let currentProgress = 15;
    let loaderDismissed = false;

    function updateLoaderProgress(targetPercent) {
        if (loaderDismissed) return;
        currentProgress = Math.max(currentProgress, Math.min(100, Math.round(targetPercent)));
        if (loaderBar) loaderBar.style.width = `${currentProgress}%`;

        if (currentProgress >= 100) {
            hideLoader();
        }
    }

    function hideLoader() {
        if (loaderDismissed || !loadingScreen) return;
        loaderDismissed = true;

        if (loaderBar) loaderBar.style.width = '100%';

        setTimeout(() => {
            if (window.gsap) {
                gsap.to(loadingScreen, {
                    opacity: 0,
                    duration: 1.0,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        loadingScreen.classList.add('hidden');
                        loadingScreen.style.display = 'none';
                    }
                });
            } else {
                loadingScreen.classList.add('hidden');
                loadingScreen.style.display = 'none';
            }
        }, 350);
    }

    // Seguridad de tiempo máximo (máximo 3.5s para no hacer esperar al usuario)
    setTimeout(() => {
        if (!loaderDismissed) {
            updateLoaderProgress(100);
            hideLoader();
        }
    }, 3500);

    // ==========================================
    // ⚡ RENDERIZADO INMEDIATO DEL MENÚ
    // ==========================================
    initBookMenu();
    updateLoaderProgress(35, "Carta imperial cargada...");

    // Sincronización en segundo plano con Supabase / Caché local
    fetchMenuData().then(menuData => {
        if (menuData) {
            initBookMenu(menuData);
        }
    }).catch(err => console.warn('Carga diferida del menú:', err));

    // ==========================================
    // 0. SISTEMA DE ANIMACIÓN (Con reporte de progreso al Preloader)
    // ==========================================
    const manager = new SequenceManager('hero-canvas');

    // Carga no bloqueante: la aplicación interactiva arranca de inmediato
    manager.addSequence('home-to-menu', {
        url: 'imagenes/background/comp2',
        prefix: 'Comp 2_',
        frameCount: 144,
        padding: 5,
        extension: 'png',
        onInitialReady: () => {
            updateLoaderProgress(70, "Efectos visuales listos...");
        },
        onProgress: (loaded, total) => {
            const percent = 70 + Math.round((loaded / total) * 30);
            updateLoaderProgress(percent, `Cargando atmósfera (${loaded}/${total})...`);
        }
    }).then(async () => {
        const START_FRAME = 9;
        const END_FRAME = 143;
        manager.setFrame('home-to-menu', START_FRAME);
        await manager.transitionTo('home-to-menu');

        updateLoaderProgress(100, "Mesa lista");

        const homeProxy = { frame: START_FRAME };
        gsap.to(homeProxy, {
            frame: END_FRAME,
            scrollTrigger: {
                trigger: document.getElementById('inicio') ? '#inicio' : '#home',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            },
            ease: 'none',
            onUpdate: () => {
                manager.setFrame('home-to-menu', Math.round(homeProxy.frame));
            }
        });
    }).catch(err => {
        console.warn('Secuencia de fondo no disponible en este momento:', err);
        updateLoaderProgress(100, "Listo");
        hideLoader();
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
        e.stopPropagation();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                authModal.classList.remove('hidden');
                return;
            }

            // Asegurar perfil del usuario
            try {
                await supabase.from('profiles').upsert({
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Comensal Imperial',
                    role: 'cliente'
                }, { onConflict: 'id', ignoreDuplicates: true });
            } catch (pErr) {
                console.warn('Aviso upsert profile:', pErr);
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile?.role === 'admin') {
                await showSection('admin');
            } else {
                await showSection('profile');
            }
        } catch (err) {
            console.error('Error al abrir cuenta:', err);
            showNotification('Error al cargar datos del perfil.', 'warning');
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
                authModal.classList.add('hidden');
                authForm.reset();

                // Redirección inmediata al panel correspondiente
                if (data?.user) {
                    await updateAuthUI(data.user);
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    if (profile?.role === 'admin') {
                        await showSection('admin');
                    } else {
                        await showSection('profile');
                    }
                }
                return;
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: authFullName.value } }
                });
                if (error) throw error;
                // Crear perfil en la tabla profiles al registrarse
                if (data?.user) {
                    await supabase.from('profiles').upsert({
                        id: data.user.id,
                        full_name: authFullName.value || email.split('@')[0],
                        role: 'cliente'
                    }, { onConflict: 'id', ignoreDuplicates: true });
                    await updateAuthUI(data.user);
                    await showSection('profile');
                }
                showNotification('Registro exitoso. Bienvenido.', 'success');
                authModal.classList.add('hidden');
                authForm.reset();
                return;
            }
        } catch (err) {
            authFeedback.innerHTML = `<p style="color: #ff4444; text-align:center; margin-top:10px;">${err.message}</p>`;
            authFeedback.classList.remove('hidden');
            showNotification('Error en la autenticación.', 'error');
        }
    });

    async function updateAuthUI(user) {
        if (user) {
            accountLabel.innerText = 'Mi Cuenta';
            // Crear/asegurar perfil en Supabase al iniciar sesión
            try {
                await supabase.from('profiles').upsert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Comensal Imperial',
                    role: 'cliente'
                }, { onConflict: 'id', ignoreDuplicates: true });
            } catch (pErr) {}
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
            if (profile?.role === 'admin') accountLabel.innerText = 'Panel Admin';
            // Sincronizar reservas offline pendientes si las hay
            syncOfflineReservations();
        } else {
            accountLabel.innerText = 'Cuenta';
        }
    }

    supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session?.user || null);
    });

    // Comprobación de sesión asíncrona en segundo plano (no bloquea el arranque)
    supabase.auth.getSession().then(({ data }) => {
        updateAuthUI(data?.session?.user || null);
    }).catch(e => {
        console.warn('Supabase Auth: Sesión inicial no disponible:', e.message);
        updateAuthUI(null);
    });

    async function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.remove('hidden');

            if (sectionId === 'profile' || sectionId === 'admin') {
                try {
                    manager.setFrame('home-to-menu', 143);
                } catch(e) {}
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            if (sectionId === 'profile') await loadUserProfile();
            else if (sectionId === 'admin') await loadAdminPanel();
        }
    }

    async function loadUserProfile() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            if (navigator.onLine && localStorage.getItem('loto_offline_reservations')) {
                try {
                    await syncOfflineReservations();
                } catch(e) {}
            }

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            const userNameEl = document.getElementById('userName');
            const userEmailEl = document.getElementById('userEmail');
            if (userNameEl) userNameEl.innerText = profile?.full_name || session.user.user_metadata?.full_name || 'Usuario Imperial';
            if (userEmailEl) userEmailEl.innerText = session.user.email || '';
            
            const resGrid = document.getElementById('userReservationsGrid');
            if (!resGrid) return;
            resGrid.innerHTML = '';

            let serverRes = [];
            if (navigator.onLine) {
                try {
                    const { data } = await supabase.from('reservations').select('*').eq('user_id', session.user.id).order('date', { ascending: false });
                    serverRes = data || [];
                } catch (err) {
                    console.warn('Error cargando reservas desde Supabase:', err);
                }
            }

            let offlineRes = [];
            try {
                const queue = JSON.parse(localStorage.getItem('loto_offline_reservations') || '[]');
                offlineRes = queue.filter(item => item.user_id === session.user.id);
            } catch (e) {}

            const allReservations = [...offlineRes.map(r => ({ ...r, isOffline: true })), ...serverRes];

            if (allReservations.length === 0) {
                resGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No tienes reservaciones registradas.</p>';
                return;
            }

            allReservations.forEach(r => {
                const card = document.createElement('div');
                card.className = 'reservation-entry';
                
                let statusBadge = '';
                if (r.isOffline) {
                    statusBadge = '<span style="background: rgba(255, 180, 0, 0.2); color: #ffb84d; border: 1px solid rgba(255, 180, 0, 0.4); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px;">⏳ Pendiente de sincronizar</span>';
                } else if (r.status === 'completada') {
                    statusBadge = '<span style="background: var(--badge-jade); color: var(--accent-jade-bright); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px; text-transform: uppercase;">✓ Completada</span>';
                } else if (r.status === 'cancelada') {
                    statusBadge = '<span style="background: #4d1414; color: #ff6b6b; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px; text-transform: uppercase;">✕ Cancelada</span>';
                } else {
                    statusBadge = '<span style="background: rgba(46, 204, 113, 0.18); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.35); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px; text-transform: uppercase; font-weight: 600;">✓ Confirmada</span>';
                }

                card.innerHTML = `
                    <div class="res-info">
                        <strong style="display:flex; align-items: center; font-family: var(--font-title); color: var(--primary-highlight);">
                            ${r.date} ${statusBadge}
                        </strong>
                        <span style="color: var(--text-main); font-size: 0.9rem;">${r.time} | ${r.guests} Invitados</span>
                        ${r.special_requests ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Petición: ${r.special_requests}</p>` : ''}
                    </div>
                    <div class="res-code-badge">${r.special_code}</div>
                `;
                resGrid.appendChild(card);
            });
        } catch (err) {
            console.error('Error en loadUserProfile:', err);
        }
    }
    async function loadAdminPanel(filter = 'pendiente') {
        const adminGrid = document.getElementById('adminReservationsGrid');
        if (!adminGrid) return;
        adminGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Cargando registros imperiales...</p>';

        try {
            let query = supabase.from('reservations').select('*, profiles(full_name)').order('date', { ascending: true });
            
            if (filter !== 'todas') {
                query = query.eq('status', filter);
            }

            const { data: res, error } = await query;
            if (error) throw error;

            adminGrid.innerHTML = '';
            if (!res || res.length === 0) {
                adminGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">No hay reservaciones con estado "${filter}".</p>`;
                return;
            }

            res.forEach(r => {
                const item = document.createElement('div');
                item.className = 'admin-res-item';
                
                const statusColor = r.status === 'completada' ? 'var(--accent-jade-bright)' : r.status === 'cancelada' ? '#ff4d4d' : 'var(--primary-highlight)';

                item.innerHTML = `
                    <div class="admin-res-info">
                        <strong style="display:block; color: var(--primary-highlight); font-size: 1.05rem;">
                            ${r.profiles?.full_name || 'Comensal Imperial'}
                        </strong>
                        <span style="font-size: 0.85rem; color: var(--text-main);">${r.date} a las ${r.time} | ${r.guests} pax</span>
                        <span style="display:inline-block; font-size: 0.75rem; color: ${statusColor}; text-transform: uppercase; margin-top: 3px; font-weight: 600;">Estado: ${r.status}</span>
                        ${r.special_requests ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Nota: ${r.special_requests}</p>` : ''}
                    </div>
                    <div class="res-code-badge">${r.special_code}</div>
                    <div class="admin-res-actions">
                        ${r.status === 'pendiente' ? `
                            <button class="btn-admin-action btn-admin-approve" title="Marcar como válida" onclick="window.updateResStatus('${r.id}', 'completada')">
                                <i class="fa-solid fa-check"></i>
                                <span>Válida</span>
                            </button>
                            <button class="btn-admin-action btn-admin-cancel" title="Cancelar reservación" onclick="window.updateResStatus('${r.id}', 'cancelada')">
                                <i class="fa-solid fa-xmark"></i>
                                <span>Cancelar</span>
                            </button>
                        ` : `
                            <button class="btn-admin-action btn-admin-reopen" title="Mover a pendiente" onclick="window.updateResStatus('${r.id}', 'pendiente')">
                                <i class="fa-solid fa-rotate-left"></i>
                                <span>Reabrir</span>
                            </button>
                        `}
                    </div>
                `;
                adminGrid.appendChild(item);
            });
        } catch (err) {
            console.error('Error cargando panel admin:', err);
            adminGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ff4d4d; padding: 20px;">Error al cargar las reservaciones. Verifique permisos de administrador.</p>';
        }
    }

    // Selector de filtro del admin
    const adminStatusFilter = document.getElementById('adminStatusFilter');
    if (adminStatusFilter) {
        adminStatusFilter.addEventListener('change', () => {
            loadAdminPanel(adminStatusFilter.value);
        });
    }

    // Botones de cierre de sesión
    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            showNotification('Sesión finalizada. Hasta pronto.', 'success');
            document.querySelectorAll('.section').forEach(s => {
                if (!['profile', 'admin'].includes(s.id)) s.classList.remove('hidden');
                else s.classList.add('hidden');
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updateAuthUI(null);
        } catch (e) {
            console.warn('Error al cerrar sesión:', e);
        }
    };
    document.getElementById('btnLogoutUser')?.addEventListener('click', handleLogout);
    document.getElementById('btnLogoutAdmin')?.addEventListener('click', handleLogout);

    window.updateResStatus = async (id, status) => {
        try {
            console.log(`[Admin] Intentando actualizar reservación ${id} a estado: "${status}"...`);
            
            const { data, error } = await supabase
                .from('reservations')
                .update({ status })
                .eq('id', id)
                .select();

            if (error) {
                console.error('[Admin] Error en Supabase al actualizar:', error);
                showNotification(`Error al actualizar en Supabase: ${error.message || error.code}`, 'error');
                return;
            }

            if (!data || data.length === 0) {
                console.warn('[Admin] PostgREST retornó 0 filas modificadas. Posible bloqueo de permisos RLS en Supabase.');
                showNotification('No se pudo modificar en Supabase: tu usuario no tiene permisos de administrador (RLS).', 'error');
                return;
            }

            console.log('[Admin] Reservación actualizada exitosamente en Supabase:', data[0]);
            showNotification(`Reservación marcada como ${status}.`, 'success');
            const currentFilter = document.getElementById('adminStatusFilter')?.value || 'pendiente';
            await loadAdminPanel(currentFilter);
        } catch (err) {
            console.error('[Admin] Excepción inesperada en updateResStatus:', err);
            showNotification('Error inesperado al actualizar la reservación.', 'error');
        }
    };

    document.getElementById('btnSearchCode').addEventListener('click', async () => {
        const codeInput = document.getElementById('adminSearchCode');
        const code = codeInput ? codeInput.value.trim() : '';
        if (!code) return;
        const { data, error } = await supabase.from('reservations').select('*, profiles(full_name)').eq('special_code', code).single();
        if (error || !data) {
            showNotification(`Código "${code}" no encontrado.`, 'error');
        } else {
            showNotification(`Encontrado: ${data.profiles?.full_name || 'Comensal'} (${data.status})`, 'success');
            const adminGrid = document.getElementById('adminReservationsGrid');
            if (adminGrid) {
                adminGrid.innerHTML = '';
                const item = document.createElement('div');
                item.className = 'admin-res-item';
                item.innerHTML = `
                    <div class="admin-res-info">
                        <strong style="display:block; color: var(--primary-highlight); font-size: 1.05rem;">${data.profiles?.full_name || 'Comensal'}</strong>
                        <span style="font-size: 0.85rem; color: var(--text-main);">${data.date} a las ${data.time} | ${data.guests} pax</span>
                        <span style="display:inline-block; font-size: 0.75rem; color: var(--primary-highlight); text-transform: uppercase; margin-top: 3px;">Estado: ${data.status}</span>
                    </div>
                    <div class="res-code-badge">${data.special_code}</div>
                    <div class="admin-res-actions">
                        ${data.status === 'pendiente' ? `
                            <button class="btn-admin-action btn-admin-approve" title="Marcar como válida" onclick="window.updateResStatus('${data.id}', 'completada')">
                                <i class="fa-solid fa-check"></i>
                                <span>Válida</span>
                            </button>
                            <button class="btn-admin-action btn-admin-cancel" title="Cancelar reservación" onclick="window.updateResStatus('${data.id}', 'cancelada')">
                                <i class="fa-solid fa-xmark"></i>
                                <span>Cancelar</span>
                            </button>
                        ` : `
                            <button class="btn-admin-action btn-admin-reopen" title="Mover a pendiente" onclick="window.updateResStatus('${data.id}', 'pendiente')">
                                <i class="fa-solid fa-rotate-left"></i>
                                <span>Reabrir</span>
                            </button>
                        `}
                    </div>
                `;
                adminGrid.appendChild(item);
            }
        }
    });

    // 2. Menu Animations
    if (document.querySelector('#menu .leather-cover-frame')) {
        gsap.fromTo('#menu .leather-cover-frame', { y: 40, opacity: 0 }, {
            scrollTrigger: { trigger: '#menu', start: 'top 85%' },
            y: 0, opacity: 1, duration: 1, ease: 'power3.out'
        });
    }
    if (document.querySelectorAll('#menu .menu-tab').length) {
        gsap.fromTo('#menu .menu-tab', { scale: 0.8, opacity: 0 }, {
            scrollTrigger: { trigger: '#menu', start: 'top 85%' },
            scale: 1, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.7)'
        });
    }

    // 3. Reserve Animations (Soporta #reservaciones o #reserve)
    const reserveSection = document.querySelector('#reservaciones') || document.querySelector('#reserve');
    const reserveCard = document.querySelector('#reservaciones .reservation-card') || document.querySelector('#reserve .reservation-card');
    if (reserveSection && reserveCard) {
        gsap.fromTo(reserveCard, { scale: 0.8, opacity: 0 }, {
            scrollTrigger: { trigger: reserveSection, start: 'top 70%' },
            scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out'
        });
    }

    // 4. Contact Animations (Soporta #contacto o #contact)
    const contactSection = document.querySelector('#contacto') || document.querySelector('#contact');
    const contactInfo = document.querySelector('#contacto .contact-info') || document.querySelector('#contact .contact-info');
    const mapPlaceholder = document.querySelector('#contacto .map-placeholder') || document.querySelector('#contact .map-placeholder');

    if (contactSection && contactInfo) {
        gsap.fromTo(contactInfo, { x: -100, opacity: 0 }, {
            scrollTrigger: { trigger: contactSection, start: 'top 80%' },
            x: 0, opacity: 1, duration: 1, ease: 'power2.out'
        });
    }

    if (contactSection && mapPlaceholder) {
        gsap.fromTo(mapPlaceholder, { x: 100, opacity: 0 }, {
            scrollTrigger: { trigger: contactSection, start: 'top 80%' },
            x: 0, opacity: 1, duration: 1, ease: 'power2.out'
        });
    }

    // Hybrid Navigation System (Barra Flotante Inferior)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            if (item.id === 'navAccount' || targetId === 'profile' || targetId === 'admin') {
                return;
            }
            e.preventDefault();
            document.querySelectorAll('.section').forEach(s => {
                if (!['profile', 'admin'].includes(s.id)) s.classList.remove('hidden');
                else s.classList.add('hidden');
            });
            navItems.forEach(i => {
                i.classList.remove('active', 'text-imperial-gold');
                i.classList.add('text-imperial-cream/70');
            });
            item.classList.add('active', 'text-imperial-gold');
            item.classList.remove('text-imperial-cream/70');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    function showNotification(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-circle-exclamation';
        else if (type === 'warning') iconClass = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ==========================================
    // SISTEMA DE ESTADO OFFLINE FIRST (Imagen de Referencia)
    // ==========================================
    const offlineOverlay = document.getElementById('offlineOverlay');
    const offlinePill = document.getElementById('offlinePill');
    const btnRetryConnection = document.getElementById('btnRetryConnection');
    const btnBrowseOffline = document.getElementById('btnBrowseOffline');
    const retrySpinner = document.getElementById('retrySpinner');
    const retryBtnText = document.getElementById('retryBtnText');

    function showOfflineScreen() {
        if (offlineOverlay) {
            offlineOverlay.classList.remove('hidden');
            offlineOverlay.classList.add('flex');
        }
        if (offlinePill) {
            offlinePill.classList.add('hidden');
            offlinePill.classList.remove('flex');
        }
    }

    function hideOfflineScreen(showPill = false) {
        if (offlineOverlay) {
            offlineOverlay.classList.add('hidden');
            offlineOverlay.classList.remove('flex');
        }
        if (offlinePill) {
            if (showPill) {
                offlinePill.classList.remove('hidden');
                offlinePill.classList.add('flex');
            } else {
                offlinePill.classList.add('hidden');
                offlinePill.classList.remove('flex');
            }
        }
    }

    // Función unificada de estado de red
    function updateNetworkStatus(isOnline) {
        if (isOnline) {
            hideOfflineScreen(false);
            showNotification('Conexión con el Imperio restablecida.', 'success');
            syncOfflineReservations();
            fetchMenuData().then(updatedMenu => {
                if (updatedMenu) {
                    initBookMenu(updatedMenu);
                }
            });
        } else {
            showOfflineScreen();
        }
    }

    // Botón: REINTENTAR CONEXIÓN (con verificación activa y feedback)
    if (btnRetryConnection) {
        btnRetryConnection.addEventListener('click', async () => {
            if (retryBtnText) retryBtnText.innerText = 'VERIFICANDO...';
            if (retrySpinner) retrySpinner.classList.add('animate-spin');

            try {
                if (!navigator.onLine) {
                    throw new Error('Aún sin conexión detectada');
                }
                const res = await fetch('index.html', { method: 'HEAD', cache: 'no-store' });
                if (res.ok || navigator.onLine) {
                    updateNetworkStatus(true);
                } else {
                    throw new Error('Aún sin conexión');
                }
            } catch (err) {
                showNotification('Aún sin conexión. Modo offline activo.', 'warning');
            } finally {
                if (retryBtnText) retryBtnText.innerText = 'REINTENTAR CONEXIÓN';
                if (retrySpinner) retrySpinner.classList.remove('animate-spin');
            }
        });
    }

    // Botón: EXPLORAR MENÚ SIN CONEXIÓN (Minimiza el bloqueo a un pill)
    if (btnBrowseOffline) {
        btnBrowseOffline.addEventListener('click', () => {
            hideOfflineScreen(true);
            showNotification('Navegando en modo sin conexión.', 'warning');
        });
    }

    // Clic en el Pill flotante para reabrir la pantalla si el usuario desea reintentar
    if (offlinePill) {
        offlinePill.addEventListener('click', () => {
            showOfflineScreen();
        });
    }

    // Toggle de Menú Móvil
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
        });
    }

    // Inicialización de iconos Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    // Funcion de Sincronizacion de Reservas Offline
    async function syncOfflineReservations() {
        const offlineData = localStorage.getItem('loto_offline_reservations');
        if (!offlineData) return;
        try {
            const queue = JSON.parse(offlineData);
            if (!Array.isArray(queue) || queue.length === 0) return;

            // Esperar sesión activa antes de sincronizar con Supabase
            const { data: { session: syncSession } } = await supabase.auth.getSession();
            if (!syncSession?.user) {
                return;
            }

            // Asegurar perfil del usuario actual en Supabase (evita FK 23503)
            try {
                await supabase.from('profiles').upsert({
                    id: syncSession.user.id,
                    full_name: syncSession.user.user_metadata?.full_name || syncSession.user.email?.split('@')[0] || 'Comensal Imperial',
                    role: 'cliente'
                }, { onConflict: 'id', ignoreDuplicates: true });
            } catch (pErr) {}

            console.log('Sincronizando ' + queue.length + ' reservaciones offline con Supabase...');
            const remaining = [];
            for (const resItem of queue) {
                const { isOffline, created_at, ...cleanItem } = resItem;
                // Vincular siempre al ID del usuario autenticado actual
                cleanItem.user_id = syncSession.user.id;

                const { error } = await supabase.from('reservations').insert([cleanItem]);
                if (error) {
                    console.error('Error insertando reserva en Supabase:', error);
                    const irrecoverable = ['23503', '23505', '42501', 'PGRST116'];
                    if (!irrecoverable.includes(String(error.code))) {
                        remaining.push(resItem);
                    } else {
                        console.warn('Reserva descartada (error permanente):', error.code);
                    }
                }
            }
            if (remaining.length === 0) {
                localStorage.removeItem('loto_offline_reservations');
                showNotification('Tus reservaciones pendientes se sincronizaron con exito.', 'success');
            } else {
                localStorage.setItem('loto_offline_reservations', JSON.stringify(remaining));
            }
        } catch (e) {
            console.warn('Error en syncOfflineReservations:', e);
        }
    }

    // Listeners de Red
    window.addEventListener('online', () => updateNetworkStatus(true));
    window.addEventListener('offline', () => updateNetworkStatus(false));

    // Comprobación de estado al cargar la página
    if (!navigator.onLine) {
        updateNetworkStatus(false);
    } else {
        syncOfflineReservations();
    }

    // Configuración de fecha mínima en el formulario
    const reserveDateInput = document.getElementById('reserveDate');
    if (reserveDateInput) {
        reserveDateInput.min = new Date().toISOString().split('T')[0];
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
            const date = document.getElementById('reserveDate').value;
            const time = document.getElementById('reserveTime').value;
            const guests = document.getElementById('reserveGuests').value;
            const specialRequests = document.getElementById('reserveNotes').value;
            
            const selectedDate = new Date(date + 'T00:00:00');
            const today = new Date();
            today.setHours(0,0,0,0);
            if (selectedDate < today) {
                showNotification('No puede reservar en una fecha pasada.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerText = 'Procesando...';

            const specialCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const reservationData = {
                user_id: session.user.id,
                date,
                time,
                guests: parseInt(guests) || 1,
                special_requests: specialRequests,
                special_code: specialCode
            };

            // Flujo sin conexión (Offline)
            if (!navigator.onLine) {
                const existingQueue = JSON.parse(localStorage.getItem('loto_offline_reservations') || '[]');
                existingQueue.push({ ...reservationData, created_at: new Date().toISOString() });
                localStorage.setItem('loto_offline_reservations', JSON.stringify(existingQueue));

                feedback.innerHTML = `
                    <div style="text-align:center; color: var(--primary-highlight); margin-top:20px;">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size:2.2rem; color: var(--primary-highlight); margin-bottom: 8px; display: block;"></i>
                        <p style="font-weight: 600; font-size: 1.1rem;">Reservación guardada localmente</p>
                        <div class="res-code-badge" style="display:inline-block; margin: 15px 0; font-size: 1.4rem; padding: 10px 20px;">${specialCode}</div>
                        <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 400px; margin: 0 auto;">
                            Tu reserva quedó registrada en tu dispositivo y se enviará al restaurante automáticamente cuando se restablezca internet.
                        </p>
                    </div>`;
                feedback.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirmar Reserva';
                reserveForm.reset();
                showNotification('Reserva guardada sin conexión.', 'warning');
                return;
            }

            // Flujo con conexión (Online)
            try {
                // Garantizar perfil antes de insertar (evita FK error 23503)
                await supabase.from('profiles').upsert({
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Comensal Imperial',
                    role: 'cliente'
                }, { onConflict: 'id', ignoreDuplicates: true });

                const { data, error } = await supabase.from('reservations').insert([reservationData]).select();
                if (error) throw error;
                feedback.classList.add('hidden');
                submitBtn.innerText = 'Reservado';
                reserveForm.reset();
                showReservationSuccess(specialCode, { date, time, guests });
                showNotification('¡Reservación realizada con éxito!', 'success');
            } catch (err) {
                // Respaldo en caso de caída inesperada
                const existingQueue = JSON.parse(localStorage.getItem('loto_offline_reservations') || '[]');
                existingQueue.push({ ...reservationData, created_at: new Date().toISOString() });
                localStorage.setItem('loto_offline_reservations', JSON.stringify(existingQueue));

                feedback.innerHTML = `
                    <div style="text-align:center; color: var(--primary-highlight); margin-top:20px;">
                        <i class="fa-solid fa-clock" style="font-size:2rem; color: var(--primary-highlight); margin-bottom: 8px; display: block;"></i>
                        <p>Guardada para sincronización</p>
                        <div class="res-code-badge" style="display:inline-block; margin: 15px 0; font-size: 1.3rem; padding: 8px 18px;">${specialCode}</div>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">Hubo intermitencia en el servidor. Tu reserva fue guardada y se reintentará en breve.</p>
                    </div>`;
                feedback.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirmar Reserva';
                showNotification('Guardada localmente por intermitencia de red.', 'warning');
            }
        });
    }

    const sectionsScroll = document.querySelectorAll('.section');
    window.addEventListener('scroll', () => {
        let current = '';
        sectionsScroll.forEach(section => {
            if (window.pageYOffset >= section.offsetTop - 120) current = section.getAttribute('id');
        });
        navItems.forEach(item => {
            const target = item.getAttribute('data-target');
            const isActive = target === current;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.classList.add('text-imperial-gold');
                item.classList.remove('text-imperial-cream/70');
            } else {
                item.classList.remove('text-imperial-gold');
                item.classList.add('text-imperial-cream/70');
            }
        });
    });

    // ==========================================
    // 5. CHATBOT CONCIERGE: TOGUI CON TEXT-TO-SPEECH
    // ==========================================
    const chatBubble = document.getElementById('chat-bubble');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('closeChat');
    const chatBody = document.getElementById('chatBody');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatOptBtns = document.querySelectorAll('.chat-opt-btn');
    const toggleVoiceBtn = document.getElementById('toggleVoice');
    const voiceIcon = document.getElementById('voiceIcon');

    if (chatBubble && chatWindow) {
        // Estado de la voz del dispositivo
        let isVoiceEnabled = true;

        // Función Text-to-Speech (Voz del Dispositivo)
        const speakTogui = (htmlContent) => {
            if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
            try {
                window.speechSynthesis.cancel(); // Cancelar locución previa
                // Limpiar etiquetas HTML y emojis para habla fluida
                const plainText = htmlContent
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/[🍜🍣🦆🥟🏮✨📍🍶🌱🐾•→\$]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!plainText) return;

                const utterance = new SpeechSynthesisUtterance(plainText);
                utterance.lang = 'es-MX';

                const voices = window.speechSynthesis.getVoices();
                // Buscar voz natural en español
                const preferredVoice = voices.find(v => 
                    (v.lang === 'es-MX' || v.lang === 'es-ES' || v.lang.startsWith('es')) &&
                    (v.name.toLowerCase().includes('google') ||
                     v.name.toLowerCase().includes('sabina') ||
                     v.name.toLowerCase().includes('paulina') ||
                     v.name.toLowerCase().includes('natural') ||
                     v.name.toLowerCase().includes('female') ||
                     v.name.toLowerCase().includes('zira'))
                ) || voices.find(v => v.lang.startsWith('es'));

                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }

                utterance.rate = 0.95;
                utterance.pitch = 1.05;
                utterance.volume = 1;

                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.warn('[TTS] Error en síntesis de voz:', err);
            }
        };

        // Precargar voces
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }

        // Control de botón de voz
        if (toggleVoiceBtn && voiceIcon) {
            toggleVoiceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                isVoiceEnabled = !isVoiceEnabled;
                if (isVoiceEnabled) {
                    voiceIcon.className = 'fa-solid fa-volume-high text-imperial-gold';
                    toggleVoiceBtn.title = 'Voz de Togui activada (clic para silenciar)';
                    speakTogui('Voz de Togui activada.');
                } else {
                    window.speechSynthesis.cancel();
                    voiceIcon.className = 'fa-solid fa-volume-xmark text-imperial-muted';
                    toggleVoiceBtn.title = 'Voz de Togui silenciada (clic para activar)';
                }
            });
        }

        // Alternar visibilidad del chat
        const toggleChat = (show) => {
            const isCurrentlyHidden = chatWindow.classList.contains('hidden');
            const shouldShow = typeof show === 'boolean' ? show : isCurrentlyHidden;
            if (shouldShow) {
                chatWindow.classList.remove('hidden');
                chatWindow.classList.add('flex');
                if (chatInput) chatInput.focus();
                // Hablar saludo inicial si se abre por primera vez
                if (!chatWindow.dataset.greeted) {
                    chatWindow.dataset.greeted = 'true';
                    speakTogui('Saludos de honor. Soy Togui, tu mayordomo y guía gastronómico en Loto Imperial. ¿En qué puedo servirte hoy?');
                }
            } else {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                chatWindow.classList.add('hidden');
                chatWindow.classList.remove('flex');
            }
        };

        // Navegación fluida y apertura de secciones desde el Chatbot
        const navigateToReservations = () => {
            toggleChat(false);
            // Mostrar todas las secciones principales (por si el usuario estaba en profile o admin)
            document.querySelectorAll('.section').forEach(s => {
                if (!['profile', 'admin'].includes(s.id)) s.classList.remove('hidden');
                else s.classList.add('hidden');
            });
            // Actualizar pestaña activa en la barra de navegación inferior
            document.querySelectorAll('.nav-item').forEach(i => {
                if (i.getAttribute('data-target') === 'reservaciones') {
                    i.classList.add('active', 'text-imperial-gold');
                    i.classList.remove('text-imperial-cream/70');
                } else {
                    i.classList.remove('active', 'text-imperial-gold');
                    i.classList.add('text-imperial-cream/70');
                }
            });
            const target = document.getElementById('reservaciones');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => {
                    const nameField = document.getElementById('reserveFullName');
                    if (nameField) {
                        nameField.focus();
                        nameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);
            }
        };

        const navigateToMenu = () => {
            toggleChat(false);
            document.querySelectorAll('.section').forEach(s => {
                if (!['profile', 'admin'].includes(s.id)) s.classList.remove('hidden');
                else s.classList.add('hidden');
            });
            document.querySelectorAll('.nav-item').forEach(i => {
                if (i.getAttribute('data-target') === 'menu') {
                    i.classList.add('active', 'text-imperial-gold');
                    i.classList.remove('text-imperial-cream/70');
                } else {
                    i.classList.remove('active', 'text-imperial-gold');
                    i.classList.add('text-imperial-cream/70');
                }
            });
            const target = document.getElementById('menu');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        chatBubble.addEventListener('click', () => toggleChat());
        if (closeChat) {
            closeChat.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleChat(false);
            });
        }

        // Agregar mensaje al contenedor con estilo dorado
        const appendMessage = (sender, text) => {
            if (!chatBody) return;
            const msgDiv = document.createElement('div');
            msgDiv.className = sender === 'user'
                ? 'chat-msg user-msg bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] font-semibold border border-[#FFE699] p-3 rounded-2xl rounded-tr-none self-end max-w-[85%] leading-relaxed shadow-[0_0_15px_rgba(255,218,116,0.35)] text-xs sm:text-sm'
                : 'chat-msg ai-msg bg-gradient-to-br from-[#2a1b08] to-[#1c1205] text-[#FFE8A3] border border-[#FFDA74]/70 p-3.5 rounded-2xl rounded-tl-none self-start max-w-[85%] leading-relaxed shadow-[0_0_15px_rgba(255,218,116,0.25)] text-xs sm:text-sm';
            msgDiv.innerHTML = text;
            chatBody.appendChild(msgDiv);
            chatBody.scrollTop = chatBody.scrollHeight;
        };

        // Delegación de clics en botones y enlaces dentro de las respuestas de Togui
        chatBody.addEventListener('click', (e) => {
            const btnRes = e.target.closest('.chat-goto-res');
            if (btnRes) {
                e.preventDefault();
                navigateToReservations();
                return;
            }
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (href === '#reservaciones') {
                e.preventDefault();
                navigateToReservations();
            } else if (href === '#menu') {
                e.preventDefault();
                navigateToMenu();
            }
        });

        // Respuestas inteligentes y personalizadas de Togui
        const respondTogui = (userText) => {
            const lower = userText.toLowerCase().trim();
            let reply = '';

            if (lower.includes('menu') || lower.includes('menú') || lower.includes('platillo') || lower.includes('comida') || lower.includes('recomiend') || lower.includes('especialidad')) {
                reply = `🥟 <strong class="text-imperial-gold">Recomendaciones exclusivas de Togui:</strong><br><br>
                1. 🍣 <strong>Sashimi Deluxe</strong> ($35): Selección fresca de atún aleta azul, salmón y hamachi con wasabi fresco.<br>
                2. 🦆 <strong>Pato Pekín Imperial</strong> ($42): Laqueado tradicional con piel crocante, crepas al vapor y salsa hoisin.<br>
                3. 🍜 <strong>Pad Thai Royal</strong> ($26): Fideos de arroz con langostinos jumbo y tamarindo ancestral.<br><br>
                <a href="#menu" class="chat-link inline-block text-imperial-gold font-bold underline hover:text-yellow-300">Explorar toda la Carta de Autor →</a>`;
            } else if (lower.includes('reserva') || lower.includes('mesa') || lower.includes('apartar') || lower.includes('cenar')) {
                reply = `🏮 <strong class="text-imperial-gold">Reservación en Loto Imperial:</strong><br><br>
                Será un honor recibirle. Disponemos de salones principales y exclusivos tatamis de honor.<br><br>
                <button type="button" class="chat-goto-res mt-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-calendar-check"></i>
                    <span>Ir al Formulario de Reserva →</span>
                </button>`;
            } else if (lower.includes('hora') || lower.includes('abierto') || lower.includes('horario') || lower.includes('dónde') || lower.includes('donde') || lower.includes('ubicacion') || lower.includes('ubicación') || lower.includes('direccion') || lower.includes('dirección')) {
                reply = `📍 <strong class="text-imperial-gold">Ubicación y Horarios:</strong><br><br>
                • <strong>Dirección</strong>: Paseo de la Reforma 450, Juárez, Cuauhtémoc, CDMX.<br>
                • <strong>Horario</strong>: Martes a Domingo de 13:00 a 23:30 hrs.<br>
                • <strong>Servicios</strong>: Valet parking en puerta y código de vestir <em>Smart Casual</em>.`;
            } else if (lower.includes('bebida') || lower.includes('sake') || lower.includes('vino') || lower.includes('cava') || lower.includes('trago')) {
                reply = `🍶 <strong class="text-imperial-gold">Cava y Mixología Imperial:</strong><br><br>
                Nuestra cava alberga una refinada selección de Sakes <em>Junmai Daiginjo</em>, cócteles de autor infusionados con lichi y flor de loto, y vinos de alta gama para maridaje oriental.`;
            } else if (lower.includes('alergia') || lower.includes('vegetari') || lower.includes('vegano') || lower.includes('gluten')) {
                reply = `🌱 <strong class="text-imperial-gold">Dietas y Alérgenos:</strong><br><br>
                Nuestros maestros de cocina adaptan platillos vegetarianos, libres de gluten o especiales para alergias. Por favor indíquelo en las notas de su reservación.`;
            } else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('togui') || lower.includes('saludos')) {
                reply = `¡Un cordial saludo! Soy <strong class="text-imperial-gold">Togui</strong> 🐾, tu anfitrión en Loto Imperial. ¿Te gustaría conocer los platillos del día o prefieres que reservemos tu mesa?`;
            } else {
                reply = `Entiendo con gusto su consulta. Como mayordomo imperial, le sugiero descubrir nuestra <a href="#menu" class="chat-link text-imperial-gold underline">Carta Gastronómica</a> o asegurar su velada en <a href="#reservaciones" class="chat-link text-imperial-gold underline">Reservaciones</a>. ¿Puedo asistirle en algún detalle en particular?`;
            }

            setTimeout(() => {
                appendMessage('ai', reply);
                speakTogui(reply);
            }, 300);
        };

        // Píldoras de opciones rápidas
        chatOptBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const text = btn.innerText.replace(/^[^\wáéíóúÁÉÍÓÚñÑ]+/g, '').trim();
                appendMessage('user', text);

                if (action === 'reserva') {
                    respondTogui('reserva');
                } else if (action === 'menu') {
                    respondTogui('menu');
                } else if (action === 'ubicacion') {
                    respondTogui('ubicacion');
                } else if (action === 'bebidas') {
                    respondTogui('bebidas');
                }
            });
        });

        // Enviar consulta por formulario
        if (chatForm && chatInput) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;
                appendMessage('user', text);
                chatInput.value = '';
                respondTogui(text);
            });
        }
    }

    // Registro del Service Worker como Módulo (type: 'module') con estrategias avanzadas
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js', { type: 'module' })
                .then(reg => {
                    console.log('✓ SW Loto Imperial registrado con éxito (ES Module v5 - SWR/Network-First)');
                    reg.update();
                })
                .catch(err => {
                    console.warn('Registro SW module falló, intentando registro estándar:', err);
                    navigator.serviceWorker.register('sw.js')
                        .then(reg => console.log('✓ SW Loto Imperial registrado (modo estándar):', reg))
                        .catch(e => console.error('Error registrando Service Worker:', e));
                });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(err => console.error('Critical app init error:', err));
});