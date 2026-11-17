import { supabase } from './supabaseClient.js';

/**
 * Carga el menú de forma híbrida (Supabase cuando hay conexión, menu.json / localStorage cuando está offline).
 */
export async function fetchMenuData() {
    // 1. Si el dispositivo está online, intentamos consultar Supabase con timeout de seguridad
    if (navigator.onLine) {
        console.log('🌐 Conectado: Intentando obtener menú desde Supabase...');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout para no trabar la UI

            const { data, error } = await supabase
                .from('menu_items')
                .select(`
                    name,
                    price,
                    description,
                    image_url,
                    menu_categories (name)
                `);

            clearTimeout(timeoutId);

            if (error) throw error;

            if (data && data.length > 0) {
                const groupedMenu = {};
                data.forEach(item => {
                    const categoryName = item.menu_categories?.name || 'others';
                    if (!groupedMenu[categoryName]) {
                        groupedMenu[categoryName] = [];
                    }

                    groupedMenu[categoryName].push({
                        name: item.name,
                        price: item.price,
                        desc: item.description,
                        img: item.image_url
                    });
                });

                // Guardamos en caché local para próximas visitas offline
                try {
                    localStorage.setItem('loto_imperial_menu', JSON.stringify(groupedMenu));
                } catch (e) {
                    console.warn('No se pudo guardar menú en localStorage:', e);
                }

                console.log('✓ Menú obtenido con éxito desde Supabase');
                return groupedMenu;
            }
        } catch (error) {
            console.warn('⚠️ No fue posible consultar Supabase, activando fallback local:', error.message);
        }
    }

    // 2. Fallback Offline: Primero revisamos localStorage (datos más recientes)
    try {
        const cachedMenu = localStorage.getItem('loto_imperial_menu');
        if (cachedMenu) {
            console.log('📦 Menú cargado desde caché local (Offline)');
            return JSON.parse(cachedMenu);
        }
    } catch (e) {
        console.warn('Error leyendo menú de localStorage:', e);
    }

    // 3. Fallback Offline: Leemos menu.json empaquetado en la PWA
    try {
        console.log('📄 Cargando menú desde archivo local menu.json...');
        const response = await fetch('menu.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const menuJson = await response.json();
        console.log('✓ Menú local cargado correctamente');
        return menuJson;
    } catch (err) {
        console.error('❌ Error crítico cargando menú local:', err);
        return null;
    }
}

// ============================================================
// 1. DATASET COMPLETO DE CAPÍTULOS DE LA CARTA ENCUADERNADA
// ============================================================
export const catalogChapters = [
  {
    key: "japon",
    aliases: ["japones", "japon", "japan"],
    roman: "CAPÍTULO I",
    origin: "TRADICIÓN NIPONA",
    title: "JAPÓN: ARTE Y PRECISIÓN",
    subtitle: "“Cortes puros, caldos de cocción lenta de doce horas y el respeto absoluto por el ingrediente de temporada.”",
    pairing: "Maridaje sugerido: Dassai 23 Junmai Daiginjo servido a 8°C.",
    folios: ["01", "02"],
    items: [
      {
        name: "SASHIMI DELUXE",
        price: "$35",
        tag: "Chef's Selection",
        description: "Cortes frescos de atún, salmón y pesca del día sobre nieve.",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "RAMEN TONKOTSU",
        price: "$22",
        tag: "12h Cocción",
        description: "Caldo cremoso de cerdo cocinado por 12h, chashu y huevo marinado.",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "UNAGI DON",
        price: "$32",
        tag: "Especialidad",
        description: "Anguila glaseada asada sobre cama de arroz Koshihikari premium.",
        image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "YAKITORI MIX",
        price: "$20",
        tag: "Binchotan",
        description: "Brochetas de pollo y vegetales asadas al carbón japonés binchotan.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "TEMPURA IMPERIAL",
        price: "$25",
        tag: "Crujiente",
        description: "Camarones y vegetales rebozados en masa ligera y crujiente.",
        image: "https://images.unsplash.com/photo-1581781870027-04212e231e96?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "OMAKASE PREMIUM",
        price: "$50",
        tag: "12 Piezas",
        description: "Selección del Chef: 12 piezas de sushi y sashimi de la temporada.",
        image: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    key: "china",
    aliases: ["chino", "china"],
    roman: "CAPÍTULO II",
    origin: "HERENCIA DINÁSTICA",
    title: "CHINA: FUEGO Y WOK IMPERIAL",
    subtitle: "“Recetas palaciegas laqueadas, dim sum artesanal al vapor de bambú y aromas ahumados al wok.”",
    pairing: "Maridaje sugerido: Pinot Noir Reserva Imperial o Té Oolong tostado.",
    folios: ["03", "04"],
    items: [
      {
        name: "PATO PEKÍN IMPERIAL",
        price: "$48",
        tag: "Clásico Imperial",
        description: "Pato laqueado crujiente con crepas artesanales, cebollín y salsa hoisin.",
        image: "https://images.unsplash.com/photo-1518492104633-130d0cc84637?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "DIM SUM DE LOTO",
        price: "$24",
        tag: "Al Vapor",
        description: "Canasta de bambú con har gow de camarón cristal y siu mai con trufa.",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "RES MONGOLIANA WOK",
        price: "$34",
        tag: "Fuego Alto",
        description: "Láminas de rib-eye selladas al wok con ajo negro, jengibre y soya dulce.",
        image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "LANGOSTA AL JENGIBRE",
        price: "$65",
        tag: "Reserva Especial",
        description: "Cola de langosta salteada con cebollín tierno y reducción de vino Shaoxing.",
        image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "BAOZI DE CERDO CHAR SIU",
        price: "$19",
        tag: "Artesanal",
        description: "Bollos esponjosos al vapor rellenos de panceta glaseada a la miel.",
        image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "ARROZ FRITO CANTONÉS",
        price: "$21",
        tag: "Aroma Wok",
        description: "Arroz jazmín salteado con camarones tigre, jamón curado y sésamo.",
        image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    key: "sabores",
    aliases: ["sudeste", "sabores", "asia"],
    roman: "CAPÍTULO III",
    origin: "RUTA DE LAS ESPECIAS",
    title: "SABORES ASIÁTICOS: BANGKOK Y SEÚL",
    subtitle: "“Hierbas aromáticas vibrantes, currys aterciopelados y brasas coreanas llenas de carácter.”",
    pairing: "Maridaje sugerido: Cóctel Loto de Oro con yuzu y flor de saúco.",
    folios: ["05", "06"],
    items: [
      {
        name: "PAD THAI REAL",
        price: "$26",
        tag: "Tailandia",
        description: "Fideos de arroz en tamarindo añejo, camarones jumbo, cacahuate y lima.",
        image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "CURRY VERDE DE WAGYU",
        price: "$39",
        tag: "Bangkok",
        description: "Leche de coco artesanal, albahaca tailandesa y cortes tiernos de Wagyu.",
        image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "SOPA TOM YUM GOONG",
        price: "$23",
        tag: "Aromática",
        description: "Caldo vibrante de hierba limón, galanga, hojas de lima y langostinos.",
        image: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "BULGOGI COREANO",
        price: "$33",
        tag: "Seúl",
        description: "Filete marinado en pera asiática y soya sobre piedra caliente con kimchi.",
        image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "ROLLITOS VIETNAMITAS",
        price: "$18",
        tag: "Fresco",
        description: "Papel de arroz con camarón, mango ataulfo, menta fresca y salsa nuoc cham.",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "BAO CROCANTE DE PATO",
        price: "$24",
        tag: "Fusión",
        description: "Pan al vapor relleno de confit de pato, pepino encurtido y yuzu.",
        image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    key: "infantil",
    aliases: ["infantil", "kids"],
    roman: "CAPÍTULO IV",
    origin: "PEQUEÑOS INVITADOS",
    title: "MENÚ INFANTIL: PEQUEÑO LOTO",
    subtitle: "“Creaciones delicadas, equilibradas y sin picante pensadas para los exploradores más jóvenes.”",
    pairing: "Acompañamiento sugerido: Infusión fría de durazno blanco y miel.",
    folios: ["07", "08"],
    items: [
      {
        name: "MINI BENTO IMPERIAL",
        price: "$16",
        tag: "Favorito",
        description: "Arroz al vapor con forma de panda, brochetas de pollo teriyaki y edamames.",
        image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "FIDEOS UDON SUAVES",
        price: "$14",
        tag: "Sin Picante",
        description: "Fideos gruesos japoneses salteados con pollo orgánico y zanahoria dulce.",
        image: "https://images.unsplash.com/photo-1618841557871-b4664fbf0cb3?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "ROLLITOS CALIFORNIA KIDS",
        price: "$15",
        tag: "8 Piezas",
        description: "Rollos frescos de surimi de cangrejo, aguacate cremoso y queso suave.",
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "TORI KARAAGE DORADO",
        price: "$15",
        tag: "Crujiente",
        description: "Bocados crujientes de pechuga de pollo acompañados de arroz jazmín.",
        image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "GYOZAS DULCES DE POLLO",
        price: "$14",
        tag: "6 Piezas",
        description: "Empanadillas japonesas selladas a la plancha con relleno suave de pollo.",
        image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "MOCHI HELADO TRÍO",
        price: "$12",
        tag: "Postre",
        description: "Tres esferas de pasta de arroz dulce rellenas de helado artesanal.",
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    key: "bebidas",
    aliases: ["bebidas", "elixir", "elixires", "vinos"],
    roman: "CAPÍTULO V",
    origin: "CAVA Y MIXOLOGÍA",
    title: "SAKE Y VINOS: MARIDAJE IMPERIAL",
    subtitle: "“Etiquetas de culto niponas, vinos de guarda y coctelería botánica con oro comestible.”",
    pairing: "Servicio de Sommelier disponible en mesa para degustaciones guiadas.",
    folios: ["09", "10"],
    items: [
      {
        name: "DASSAI 23 JUNMAI DAIGINJO",
        price: "$42",
        tag: "Copa / Jarra",
        description: "Sake ultra-premium de Yamaguchi con notas florales de melón blanco.",
        image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "CÓCTEL LOTO DE ORO",
        price: "$19",
        tag: "Mixología",
        description: "Ginebra japonesa Roku, flor de saúco, yuzu fresco y lámina de oro.",
        image: "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "KUBOTA MANJU SAKE",
        price: "$38",
        tag: "Niigata",
        description: "Equilibrio magistral entre acidez sutil y profundidad umami.",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "CHOYA UMESHU ROYAL",
        price: "$18",
        tag: "Ciruela Japonesa",
        description: "Licor artesanal de ciruela ume macerada con notas de almendra dulce.",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "PINOT NOIR RESERVA IMPERIAL",
        price: "$28",
        tag: "Maridaje Pato",
        description: "Vino tinto elegante de cuerpo medio con notas de cereza negra.",
        image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "TÉ OOLONG DE ALTA MONTAÑA",
        price: "$14",
        tag: "Sin Alcohol",
        description: "Infusión ceremonial en tetera de hierro con aroma a orquídea tostada.",
        image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

// Metadatos por platillo: [nivel de picante 0-3, alérgenos]
export const dishMeta = {
  "SASHIMI DELUXE": [0, "Pescado fresco"],
  "RAMEN TONKOTSU": [1, "Gluten, huevo, soya"],
  "UNAGI DON": [0, "Pescado, soya, gluten"],
  "YAKITORI MIX": [0, "Soya, gluten"],
  "TEMPURA IMPERIAL": [0, "Crustáceos, gluten, huevo"],
  "OMAKASE PREMIUM": [0, "Pescado, mariscos, soya"],
  "PATO PEKÍN IMPERIAL": [0, "Gluten, soya, sésamo"],
  "DIM SUM DE LOTO": [0, "Gluten, crustáceos"],
  "RES MONGOLIANA WOK": [1, "Soya, gluten"],
  "LANGOSTA AL JENGIBRE": [1, "Crustáceos, soya"],
  "BAOZI DE CERDO CHAR SIU": [0, "Gluten, soya"],
  "ARROZ FRITO CANTONÉS": [0, "Huevo, soya"],
  "PAD THAI REAL": [1, "Cacahuate, crustáceos, huevo"],
  "CURRY VERDE DE WAGYU": [3, "Pescado"],
  "SOPA TOM YUM GOONG": [3, "Crustáceos, pescado"],
  "BULGOGI COREANO": [1, "Soya, sésamo, gluten"],
  "ROLLITOS VIETNAMITAS": [0, "Crustáceos, cacahuate"],
  "BAO CROCANTE DE PATO": [0, "Gluten, soya"],
  "MINI BENTO IMPERIAL": [0, "Gluten, soya, huevo"],
  "FIDEOS UDON SUAVES": [0, "Gluten, soya"],
  "ROLLITOS CALIFORNIA KIDS": [0, "Sésamo, soya"],
  "TORI KARAAGE DORADO": [0, "Gluten, soya"],
  "GYOZAS DULCES DE POLLO": [0, "Gluten, soya"],
  "MOCHI HELADO TRÍO": [0, "Lácteos, soya"],
  "DASSAI 23 JUNMAI DAIGINJO": [0, "Contiene alcohol (Sake Daiginjo)"],
  "CÓCTEL LOTO DE ORO": [0, "Contiene alcohol"],
  "KUBOTA MANJU SAKE": [0, "Contiene alcohol"],
  "CHOYA UMESHU ROYAL": [0, "Contiene alcohol"],
  "PINOT NOIR RESERVA IMPERIAL": [0, "Contiene alcohol, sulfitos"],
  "TÉ OOLONG DE ALTA MONTAÑA": [0, "Sin alérgenos conocidos"],
};

const spiceLabels = ["Sin picante", "Picante suave", "Picante medio", "Muy picante"];
const spiceDots = (n) => n === 0 ? "" :
  `<span class="inline-flex gap-0.5 ml-2 align-middle" title="${spiceLabels[n]}" aria-label="${spiceLabels[n]}">${
    [1,2,3].map(i => `<span class="w-1.5 h-1.5 rounded-full ${i <= n ? "bg-[#d9442f]" : "bg-imperial-gold/25"}"></span>`).join("")}</span>`;

const priceNum = (p) => parseInt(String(p).replace(/[^0-9]/g, ""), 10) || 0;

// ============================================================
// 2. SISTEMA DE AUDIO PROCEDURAL (SONIDO DE PAPEL SINTETIZADO)
// ============================================================
let paperSoundEnabled = true;
let audioCtx = null;

export function playPaperRustleSound(duration = 0.42) {
  if (!paperSoundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const sampleRate = audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      const progress = i / length;
      const envelope = Math.sin(progress * Math.PI) ** 1.6;
      data[i] = (b0 + b1 + b2 + white * 0.18) * envelope * 0.22;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1100, audioCtx.currentTime);
    bandpass.frequency.exponentialRampToValueAtTime(2400, audioCtx.currentTime + duration * 0.6);
    bandpass.Q.value = 0.85;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseSource.start();
  } catch (e) {
    // Autoplay restrictions
  }
}

// ============================================================
// 3. MI SELECCIÓN (FAVORITOS) Y MODAL DE PLATILLOS
// ============================================================
export const selection = new Map();

export function updateSelectionBadge() {
  const n = selection.size;
  const el = document.getElementById("selection-count");
  if (!el) return;
  el.textContent = n;
  el.classList.toggle("hidden", n === 0);
}

export function showToast(message) {
  // Verificamos si existe toast-message o notification general
  let toast = document.getElementById("toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-message";
    toast.className = "fixed bottom-24 right-6 z-50 hidden items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#260d0f] border border-imperial-gold text-imperial-cream shadow-deep backdrop-blur-xl text-sm";
    toast.innerHTML = `<i data-lucide="check-circle-2" class="w-5 h-5 text-imperial-gold shrink-0"></i><span id="toast-text"></span>`;
    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();
  }
  const toastText = document.getElementById("toast-text");
  if (toastText) toastText.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("flex");

  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 3200);
}

export function toggleDish(name) {
  const item = catalogChapters.flatMap(c => c.items).find(i => i.name === name);
  if (!item) return;
  if (selection.has(name)) {
    selection.delete(name);
    showToast("Quitado de tu selección");
  } else {
    selection.set(name, item);
    showToast("Añadido a tu selección");
  }
  updateSelectionBadge();
  document.querySelectorAll(`[data-heart="${CSS.escape(name)}"]`).forEach(b => {
    const on = selection.has(name);
    b.setAttribute("aria-pressed", on);
    b.classList.toggle("text-imperial-gold", on);
    b.classList.toggle("text-imperial-muted", !on);
    b.querySelector("svg, i")?.setAttribute("fill", on ? "currentColor" : "none");
  });
  const dlg = document.getElementById("dish-dialog");
  if (dlg && dlg.open && dlg.dataset.mode === "list") openSelection();
  if (dlg && dlg.open && dlg.dataset.mode === "dish" && dlg.dataset.dish === name) openDish(name);
}

export function dishPanelOpen(mode, html, dishName) {
  const dlg = document.getElementById("dish-dialog");
  if (!dlg) return;
  dlg.dataset.mode = mode;
  dlg.dataset.dish = dishName || "";
  const body = document.getElementById("dish-dialog-body");
  if (body) body.innerHTML = html;
  if (!dlg.open) dlg.showModal();
  if (window.lucide) lucide.createIcons();
}

export function openDish(name) {
  const item = catalogChapters.flatMap(c => c.items).find(i => i.name === name);
  if (!item) return;
  const [spice, allergens] = dishMeta[name] || [0, "Ingredientes frescos del día"];
  const chosen = selection.has(name);
  dishPanelOpen("dish", `
    <div class="aspect-[16/10] overflow-hidden rounded-t-2xl bg-[#120505]">
      <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover"
           onerror="this.src='https://placehold.co/900x560/260d0f/D4AF37?text=${encodeURIComponent(item.name)}'" />
    </div>
    <div class="p-6 sm:p-8">
      <p class="text-xs tracking-[0.2em] text-imperial-gold font-semibold mb-2">${item.tag}</p>
      <div class="flex items-baseline justify-between gap-4 mb-3">
        <h3 class="font-serif text-xl sm:text-2xl font-bold tracking-wider text-imperial-cream">${item.name}</h3>
        <span class="font-serif text-2xl font-bold text-imperial-gold">${item.price}</span>
      </div>
      <p class="text-imperial-muted leading-relaxed mb-5 font-light">${item.description}</p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm mb-7">
        <dt class="text-imperial-gold font-medium">Picante</dt>
        <dd class="text-imperial-cream/90">${spiceLabels[spice]}${spiceDots(spice)}</dd>
        <dt class="text-imperial-gold font-medium">Alérgenos</dt>
        <dd class="text-imperial-cream/90">${allergens}</dd>
      </dl>
      <button type="button" onclick="window.toggleDish(decodeURIComponent('${encodeURIComponent(name)}'))"
        class="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all cursor-pointer ${
          chosen ? "bg-[#260d0f] border border-imperial-gold/50 text-imperial-gold"
                 : "bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] shadow-gold hover:brightness-105"}">
        <i data-lucide="${chosen ? "check" : "plus"}" class="w-4 h-4"></i>
        <span>${chosen ? "En tu selección. Quitar" : "Añadir a mi selección"}</span>
      </button>
    </div>`, name);
}

export function openSelection() {
  const items = [...selection.values()];
  const total = items.reduce((s, i) => s + priceNum(i.price), 0);
  const rows = items.map(i => `
    <li class="flex items-center justify-between gap-3 py-3 border-b border-imperial-gold/15">
      <button type="button" class="text-left min-w-0 flex-1 cursor-pointer" onclick="window.openDish(decodeURIComponent('${encodeURIComponent(i.name)}'))">
        <span class="block font-serif text-sm tracking-wider text-imperial-cream truncate">${i.name}</span>
        <span class="block text-xs text-imperial-muted">${i.tag}</span>
      </button>
      <span class="font-serif text-imperial-gold font-bold">${i.price}</span>
      <button type="button" aria-label="Quitar ${i.name}" class="p-1.5 text-imperial-muted hover:text-imperial-gold cursor-pointer"
              onclick="window.toggleDish(decodeURIComponent('${encodeURIComponent(i.name)}'))"><i data-lucide="x" class="w-4 h-4"></i></button>
    </li>`).join("");
  dishPanelOpen("list", `
    <div class="p-6 sm:p-8">
      <h3 class="font-serif text-xl font-bold tracking-wider text-gold-gradient mb-1">MI SELECCIÓN</h3>
      <p class="text-sm text-imperial-muted mb-4 font-light">Platillos selectos que desea degustar en su visita imperial.</p>
      ${items.length ? `<ul>${rows}</ul>
        <div class="flex items-baseline justify-between pt-4 mb-6">
          <span class="text-sm text-imperial-muted">Total estimado</span>
          <span class="font-serif text-2xl font-bold text-imperial-gold">$${total}</span>
        </div>
        <button type="button" onclick="document.getElementById('dish-dialog').close()"
           class="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] text-xs uppercase tracking-widest font-bold shadow-gold cursor-pointer">
           <i data-lucide="utensils" class="w-4 h-4"></i><span>Seguir explorando la carta</span></button>`
      : `<p class="py-8 text-center text-imperial-muted font-light">Aún no ha seleccionado platillos. Presione el corazón en cualquier platillo para guardarlo aquí.</p>`}
    </div>`);
}

// Hacer globales las funciones para eventos onclick inline
window.openDish = openDish;
window.openSelection = openSelection;
window.toggleDish = toggleDish;

// ============================================================
// 4. MOTOR DE HOJEADO Y CURVATURA DE PAPEL EN TIEMPO REAL
// ============================================================
let currentChapterIndex = 0;
let isAnimatingTurn = false;
let rafId = null;

const curlState = {
  active: false,
  dragging: false,
  direction: "next",
  pointerX: 0,
  pointerY: 0,
  targetX: 0,
  targetY: 0,
  nextChapterLabel: "",
};

function createBookDishRow(item, delayIndex) {
  const row = document.createElement("article");
  const [spice] = dishMeta[item.name] || [0];
  const chosen = selection.has(item.name);
  row.style.animationDelay = `${delayIndex * 45}ms`;
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", `Ver detalle de ${item.name}`);
  row.className =
    "animate-card group relative h-[112px] sm:h-[116px] flex items-center gap-4 p-3 rounded-2xl bg-[#160808]/85 hover:bg-[#260d0f]/95 border border-imperial-gold/20 hover:border-imperial-gold/60 transition-all duration-300 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFDA74]";
  
  const open = () => openDish(item.name);
  row.addEventListener("click", open);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  row.innerHTML = `
    <div class="relative w-28 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden bg-[#120505] border border-imperial-gold/30 shrink-0">
      <img
        src="${item.image}"
        onerror="this.src='https://placehold.co/320x200/260d0f/D4AF37?text=${encodeURIComponent(item.name)}'"
        alt="${item.name}"
        loading="lazy"
        class="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
      />
    </div>
    <div class="flex-1 min-w-0 flex flex-col justify-center pr-7">
      <div class="flex items-center mb-0.5">
        <span class="text-[10px] uppercase tracking-[0.2em] text-imperial-gold/85 font-semibold truncate">${item.tag}</span>
        ${spiceDots(spice)}
      </div>
      <div class="flex items-baseline justify-between gap-2 mb-1">
        <h4 class="font-serif text-sm sm:text-[15px] font-bold tracking-wider text-imperial-cream group-hover:text-imperial-gold transition-colors truncate">${item.name}</h4>
        <span class="font-serif text-base sm:text-lg font-bold text-imperial-gold shrink-0">${item.price}</span>
      </div>
      <p class="text-xs text-imperial-muted leading-snug font-light line-clamp-2 h-[33px]">${item.description}</p>
    </div>
    <button type="button" data-heart="${item.name}" aria-pressed="${chosen}" aria-label="Guardar ${item.name} en mi selección"
      class="absolute top-2 right-2 p-1.5 rounded-full hover:bg-imperial-gold/10 transition-colors cursor-pointer ${chosen ? "text-imperial-gold" : "text-imperial-muted"}">
      <i data-lucide="heart" class="w-4 h-4" ${chosen ? 'fill="currentColor"' : ""}></i>
    </button>
  `;

  const heartBtn = row.querySelector("[data-heart]");
  if (heartBtn) {
    heartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDish(item.name);
    });
    heartBtn.addEventListener("keydown", (e) => e.stopPropagation());
  }
  return row;
}

function resizeCurlCanvas(catalogBookEl, curlCanvas, ctx) {
  if (!catalogBookEl || !curlCanvas || !ctx) return;
  const rect = catalogBookEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  curlCanvas.width = rect.width * dpr;
  curlCanvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawRealisticPaperCurl(catalogBookEl, curlCanvas, ctx) {
  if (!catalogBookEl || !curlCanvas || !ctx) return;
  const w = catalogBookEl.clientWidth;
  const h = catalogBookEl.clientHeight;
  ctx.clearRect(0, 0, w, h);

  if (!curlState.active) return;

  const isNext = curlState.direction === "next";
  const cx = isNext ? w : 0;
  const cy = h;

  let px = Math.max(0, Math.min(w, curlState.pointerX));
  let py = Math.max(h * 0.15, Math.min(h - 2, curlState.pointerY));

  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);

  if (dist < 4) return;

  const mx = (cx + px) * 0.5;
  const my = (cy + py) * 0.5;

  const nx = dx / dist;
  const ny = dy / dist;

  const tx = -ny;
  const ty = nx;

  const span = Math.max(w, h) * 2;
  const f1x = mx + tx * span;
  const f1y = my + ty * span;
  const f2x = mx - tx * span;
  const f2y = my - ty * span;

  const b1x = f2x - nx * span;
  const b1y = f2y - ny * span;
  const b2x = f1x - nx * span;
  const b2y = f1y - ny * span;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  // 1. REVEALED UNDERNEATH PAGE CORNER
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(f1x, f1y);
  ctx.lineTo(f2x, f2y);
  ctx.lineTo(b1x, b1y);
  ctx.lineTo(b2x, b2y);
  ctx.closePath();
  ctx.clip();

  const underGrad = ctx.createLinearGradient(cx, cy, px, py);
  underGrad.addColorStop(0, "#120505");
  underGrad.addColorStop(0.65, "#1c0808");
  underGrad.addColorStop(1, "#260d0f");
  ctx.fillStyle = underGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 218, 116, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  if (curlState.nextChapterLabel) {
    ctx.fillStyle = "rgba(255, 218, 116, 0.85)";
    ctx.font = '600 12px "Cinzel", serif';
    ctx.textAlign = isNext ? "right" : "left";
    ctx.fillText(curlState.nextChapterLabel, isNext ? w - 28 : 28, h - 26);
  }

  const creaseShadow = ctx.createLinearGradient(
    mx,
    my,
    mx - nx * Math.min(90, dist * 0.55),
    my - ny * Math.min(90, dist * 0.55)
  );
  creaseShadow.addColorStop(0, "rgba(0, 0, 0, 0.78)");
  creaseShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = creaseShadow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // 2. REFLECTED CURLED PAPER BACKSIDE
  function reflectPoint(qx, qy) {
    const dot = (qx - mx) * nx + (qy - my) * ny;
    return {
      x: qx - 2 * dot * nx,
      y: qy - 2 * dot * ny,
    };
  }

  const bookCorners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  const p1x = f1x + nx * span;
  const p1y = f1y + ny * span;
  const p2x = f2x + nx * span;
  const p2y = f2y + ny * span;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(f1x, f1y);
  ctx.lineTo(f2x, f2y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(p1x, p1y);
  ctx.closePath();
  ctx.clip();

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = Math.min(36, 10 + dist * 0.08);
  ctx.shadowOffsetX = nx * 8;
  ctx.shadowOffsetY = ny * 8;

  ctx.beginPath();
  bookCorners.forEach((pt, idx) => {
    const rp = reflectPoint(pt.x, pt.y);
    if (idx === 0) ctx.moveTo(rp.x, rp.y);
    else ctx.lineTo(rp.x, rp.y);
  });
  ctx.closePath();

  const cylGrad = ctx.createLinearGradient(mx, my, px, py);
  cylGrad.addColorStop(0, "#160808");
  cylGrad.addColorStop(0.25, "#301214");
  cylGrad.addColorStop(0.5, "#4d1d20");
  cylGrad.addColorStop(0.75, "#2a0e10");
  cylGrad.addColorStop(1, "#1c0808");

  ctx.fillStyle = cylGrad;
  ctx.fill();
  ctx.restore();

  // Gold fold highlight
  ctx.beginPath();
  ctx.moveTo(f1x, f1y);
  ctx.lineTo(f2x, f2y);
  ctx.strokeStyle = "rgba(255, 218, 116, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

function startCurlLoop(catalogBookEl, curlCanvas, ctx) {
  if (rafId) return;
  function step() {
    if (!curlState.active) {
      rafId = null;
      return;
    }
    if (!curlState.dragging) {
      const ease = 0.2;
      curlState.pointerX += (curlState.targetX - curlState.pointerX) * ease;
      curlState.pointerY += (curlState.targetY - curlState.pointerY) * ease;

      const remDist = Math.hypot(
        curlState.targetX - curlState.pointerX,
        curlState.targetY - curlState.pointerY
      );

      if (remDist < 1.5 && !isAnimatingTurn) {
        curlState.active = false;
        ctx.clearRect(0, 0, catalogBookEl.clientWidth, catalogBookEl.clientHeight);
        rafId = null;
        return;
      }
    }
    drawRealisticPaperCurl(catalogBookEl, curlCanvas, ctx);
    rafId = requestAnimationFrame(step);
  }
  rafId = requestAnimationFrame(step);
}

function getPeekChapter(direction) {
  const targetIdx =
    direction === "next"
      ? (currentChapterIndex + 1) % catalogChapters.length
      : (currentChapterIndex - 1 + catalogChapters.length) % catalogChapters.length;
  return catalogChapters[targetIdx];
}

// ============================================================
// 5. INICIALIZADOR PRINCIPAL DEL MENÚ DE ALTA GAMA
// ============================================================
export function initBookMenu(menuData) {
  const catalogBookEl = document.getElementById("catalog-book");
  const curlCanvas = document.getElementById("page-curl-canvas");
  if (!catalogBookEl || !curlCanvas) return;
  const ctx = curlCanvas.getContext("2d");

  const leftDishesEl = document.getElementById("left-page-dishes");
  const rightDishesEl = document.getElementById("right-page-dishes");
  const tabButtons = document.querySelectorAll(".menu-tab");
  const chapterRomanEl = document.getElementById("chapter-roman");
  const chapterRomanSubEl = document.getElementById("chapter-roman-sub");
  const chapterOriginEl = document.getElementById("chapter-origin");
  const chapterTitleEl = document.getElementById("chapter-title");
  const chapterSubtitleEl = document.getElementById("chapter-subtitle");
  const chapterRightHeadingEl = document.getElementById("chapter-right-heading");
  const chapterPairingEl = document.getElementById("chapter-pairing");
  const folioNumbersEl = document.getElementById("folio-numbers");
  const leftFolioLabelEl = document.getElementById("left-folio-label");
  const rightFolioLabelEl = document.getElementById("right-folio-label");
  const catalogDotsEl = document.getElementById("catalog-dots");

  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const grabLeftZone = document.getElementById("grab-corner-left");
  const grabRightZone = document.getElementById("grab-corner-right");
  const soundToggleBtn = document.getElementById("paper-sound-toggle");
  const soundIconEl = document.getElementById("paper-sound-icon");
  const soundLabelEl = document.getElementById("paper-sound-label");

  // Si Supabase contiene datos, enriquecemos los capítulos
  if (menuData && typeof menuData === "object") {
    catalogChapters.forEach(ch => {
      let matchedData = null;
      for (const alias of ch.aliases) {
        if (menuData[alias] && menuData[alias].length > 0) {
          matchedData = menuData[alias];
          break;
        }
      }
      if (matchedData && matchedData.length > 0) {
        // Enriquecemos o actualizamos platillos
        matchedData.slice(0, 6).forEach((remoteItem, idx) => {
          if (ch.items[idx]) {
            ch.items[idx].name = remoteItem.name || ch.items[idx].name;
            ch.items[idx].price = typeof remoteItem.price === 'number' ? `$${remoteItem.price}` : (remoteItem.price || ch.items[idx].price);
            ch.items[idx].description = remoteItem.desc || ch.items[idx].description;
            if (remoteItem.img) ch.items[idx].image = remoteItem.img;
          }
        });
      }
    });
  }

  function updateCatalogNavigationUI(index) {
    tabButtons.forEach((tab, idx) => {
      if (idx === index) {
        tab.className =
          "menu-tab active px-4 sm:px-5 py-2.5 rounded-t-xl rounded-b-md text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-300 bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] shadow-gold -translate-y-0.5 cursor-pointer";
      } else {
        tab.className =
          "menu-tab px-4 sm:px-5 py-2.5 rounded-t-xl rounded-b-md text-xs sm:text-sm font-medium tracking-wider uppercase transition-all duration-300 bg-[#260d0f] text-imperial-cream/80 border border-imperial-gold/25 hover:border-imperial-gold/60 hover:text-imperial-gold cursor-pointer";
      }
    });

    if (catalogDotsEl) {
      catalogDotsEl.innerHTML = catalogChapters
        .map(
          (ch, idx) => `
          <button
            type="button"
            aria-label="Ir a ${ch.title}"
            onclick="window.__triggerPageTurnTo(${idx})"
            class="h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === index
                ? "w-8 bg-imperial-gold shadow-gold"
                : "w-2.5 bg-imperial-gold/30 hover:bg-imperial-gold/65"
            }"
          ></button>
        `
        )
        .join("");
    }
  }

  function renderChapterSpread(index) {
    const chapter = catalogChapters[index];
    if (chapterRomanEl) chapterRomanEl.textContent = chapter.roman;
    if (chapterRomanSubEl) chapterRomanSubEl.textContent = `${chapter.roman} • ${chapter.origin}`;
    if (chapterOriginEl) chapterOriginEl.textContent = chapter.origin;
    if (chapterTitleEl) chapterTitleEl.textContent = chapter.title;
    if (chapterSubtitleEl) chapterSubtitleEl.textContent = chapter.subtitle;
    if (chapterRightHeadingEl) chapterRightHeadingEl.textContent = "CURADURÍA & MARIDAJE";
    if (chapterPairingEl) chapterPairingEl.textContent = chapter.pairing;
    if (folioNumbersEl) folioNumbersEl.textContent = `FOLIOS ${chapter.folios[0]} – ${chapter.folios[1]}`;
    if (leftFolioLabelEl) leftFolioLabelEl.textContent = `PÁG. ${chapter.folios[0]}`;
    if (rightFolioLabelEl) rightFolioLabelEl.textContent = `PÁG. ${chapter.folios[1]}`;

    if (leftDishesEl) leftDishesEl.innerHTML = "";
    if (rightDishesEl) rightDishesEl.innerHTML = "";

    chapter.items.slice(0, 3).forEach((item, idx) => {
      if (leftDishesEl) leftDishesEl.appendChild(createBookDishRow(item, idx));
    });

    chapter.items.slice(3, 6).forEach((item, idx) => {
      if (rightDishesEl) rightDishesEl.appendChild(createBookDishRow(item, idx + 3));
    });

    updateCatalogNavigationUI(index);
    resizeCurlCanvas(catalogBookEl, curlCanvas, ctx);
    if (window.lucide) lucide.createIcons();
  }

  function completeAnimatedPageTurn(targetIndex, direction, alreadyStarted = false) {
    if (isAnimatingTurn || targetIndex === currentChapterIndex) return;
    isAnimatingTurn = true;
    resizeCurlCanvas(catalogBookEl, curlCanvas, ctx);

    const w = catalogBookEl.clientWidth;
    const h = catalogBookEl.clientHeight;
    const isNext = direction === "next";
    const targetChapter = catalogChapters[targetIndex];

    curlState.active = true;
    curlState.dragging = false;
    curlState.direction = direction;
    curlState.nextChapterLabel = `${targetChapter.roman} • ${targetChapter.title}`;

    if (!alreadyStarted) {
      curlState.pointerX = isNext ? w - 12 : 12;
      curlState.pointerY = h - 18;
      playPaperRustleSound(0.45);
    } else {
      playPaperRustleSound(0.32);
    }

    curlState.targetX = isNext ? -w * 0.25 : w * 1.25;
    curlState.targetY = h * 0.85;
    startCurlLoop(catalogBookEl, curlCanvas, ctx);

    setTimeout(() => {
      currentChapterIndex = targetIndex;
      renderChapterSpread(currentChapterIndex);
    }, 240);

    setTimeout(() => {
      curlState.active = false;
      isAnimatingTurn = false;
      ctx.clearRect(0, 0, w, h);
    }, 520);
  }

  function triggerPageTurnTo(targetIndex) {
    const normalizedIndex =
      (targetIndex + catalogChapters.length) % catalogChapters.length;
    if (normalizedIndex === currentChapterIndex || isAnimatingTurn) return;

    const isForward =
      (normalizedIndex > currentChapterIndex &&
        !(currentChapterIndex === 0 && normalizedIndex === catalogChapters.length - 1)) ||
      (currentChapterIndex === catalogChapters.length - 1 && normalizedIndex === 0);

    completeAnimatedPageTurn(normalizedIndex, isForward ? "next" : "prev", false);
  }

  window.__triggerPageTurnTo = triggerPageTurnTo;

  function setupCornerGrabInteraction(zoneEl, direction) {
    if (!zoneEl) return;
    const isNext = direction === "next";

    zoneEl.addEventListener("pointerenter", () => {
      if (isAnimatingTurn || curlState.dragging) return;
      resizeCurlCanvas(catalogBookEl, curlCanvas, ctx);
      const w = catalogBookEl.clientWidth;
      const h = catalogBookEl.clientHeight;
      const peekChapter = getPeekChapter(direction);

      curlState.active = true;
      curlState.direction = direction;
      curlState.nextChapterLabel = `${peekChapter.roman} • ${peekChapter.title}`;
      curlState.pointerX = isNext ? w - 6 : 6;
      curlState.pointerY = h - 6;
      curlState.targetX = isNext ? w - 58 : 58;
      curlState.targetY = h - 46;
      startCurlLoop(catalogBookEl, curlCanvas, ctx);
    });

    zoneEl.addEventListener("pointerleave", () => {
      if (isAnimatingTurn || curlState.dragging) return;
      const w = catalogBookEl.clientWidth;
      const h = catalogBookEl.clientHeight;
      curlState.targetX = isNext ? w - 1 : 1;
      curlState.targetY = h - 1;
      startCurlLoop(catalogBookEl, curlCanvas, ctx);
    });

    zoneEl.addEventListener("pointerdown", (e) => {
      if (isAnimatingTurn) return;
      e.preventDefault();
      zoneEl.setPointerCapture(e.pointerId);
      resizeCurlCanvas(catalogBookEl, curlCanvas, ctx);

      const rect = catalogBookEl.getBoundingClientRect();
      const peekChapter = getPeekChapter(direction);

      curlState.active = true;
      curlState.dragging = true;
      curlState.direction = direction;
      curlState.nextChapterLabel = `${peekChapter.roman} • ${peekChapter.title}`;
      curlState.pointerX = e.clientX - rect.left;
      curlState.pointerY = e.clientY - rect.top;
      playPaperRustleSound(0.28);
      startCurlLoop(catalogBookEl, curlCanvas, ctx);
    });

    zoneEl.addEventListener("pointermove", (e) => {
      if (!curlState.dragging) return;
      const rect = catalogBookEl.getBoundingClientRect();
      curlState.pointerX = e.clientX - rect.left;
      curlState.pointerY = e.clientY - rect.top;
    });

    function finishDrag() {
      if (!curlState.dragging) return;
      curlState.dragging = false;
      const w = catalogBookEl.clientWidth;
      const h = catalogBookEl.clientHeight;
      const draggedRatio = isNext
        ? (w - curlState.pointerX) / w
        : curlState.pointerX / w;

      if (draggedRatio > 0.24 || draggedRatio < 0.08) {
        const targetIdx =
          direction === "next"
            ? (currentChapterIndex + 1) % catalogChapters.length
            : (currentChapterIndex - 1 + catalogChapters.length) % catalogChapters.length;
        completeAnimatedPageTurn(targetIdx, direction, true);
      } else {
        curlState.targetX = isNext ? w - 1 : 1;
        curlState.targetY = h - 1;
        startCurlLoop(catalogBookEl, curlCanvas, ctx);
      }
    }

    zoneEl.addEventListener("pointerup", finishDrag);
    zoneEl.addEventListener("pointercancel", finishDrag);
  }

  setupCornerGrabInteraction(grabRightZone, "next");
  setupCornerGrabInteraction(grabLeftZone, "prev");

  // Tabs de capítulos
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetIndex = parseInt(btn.getAttribute("data-index"), 10);
      triggerPageTurnTo(targetIndex);
    });
  });

  // Botones prev / next
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => triggerPageTurnTo(currentChapterIndex - 1));
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => triggerPageTurnTo(currentChapterIndex + 1));
  }

  // Toggle de sonido
  if (soundToggleBtn && soundIconEl && soundLabelEl) {
    soundToggleBtn.addEventListener("click", () => {
      paperSoundEnabled = !paperSoundEnabled;
      soundToggleBtn.setAttribute("aria-pressed", String(paperSoundEnabled));
      soundLabelEl.textContent = paperSoundEnabled
        ? "Sonido de papel: Activo"
        : "Sonido de papel: Silenciado";
      soundIconEl.setAttribute("data-lucide", paperSoundEnabled ? "volume-2" : "volume-x");
      if (window.lucide) lucide.createIcons();
      if (paperSoundEnabled) playPaperRustleSound(0.25);
    });
  }

  // Teclado (Flechas Izquierda / Derecha)
  window.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    const rect = catalogBookEl.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      if (e.key === "ArrowRight") triggerPageTurnTo(currentChapterIndex + 1);
      if (e.key === "ArrowLeft") triggerPageTurnTo(currentChapterIndex - 1);
    }
  });

  // Cierre de modal al pulsar backdrop
  const dishDialog = document.getElementById("dish-dialog");
  if (dishDialog) {
    dishDialog.addEventListener("click", (e) => {
      if (e.target === dishDialog) dishDialog.close();
    });
  }

  // Resize listener
  window.addEventListener("resize", () => {
    resizeCurlCanvas(catalogBookEl, curlCanvas, ctx);
  });

  // Render inicial
  renderChapterSpread(0);
}

/**
 * Función fallback de renderizado para compatibilidad
 */
export function renderMenu(menuGrid, menuData, category) {
  initBookMenu(menuData);
}
