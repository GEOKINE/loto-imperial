import { supabase } from './supabaseClient.js';

/**
 * Normaliza nombres de platillos para comparaciones insensibles a mayúsculas y acentos.
 */
export function normalizeName(name) {
  return String(name || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Formatea un valor numérico o string en Pesos Mexicanos (MXN).
 */
export function formatPriceMXN(price) {
  if (price === undefined || price === null || price === "") return "$0 MXN";
  const str = String(price).trim();
  if (/MXN$/i.test(str)) return str;
  const num = parseInt(str.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return `${str} MXN`;
  // Si viene en formato dólar histórico (ej. 8..99), convertimos a precio base en MXN
  let valMXN = num;
  if (num > 0 && num < 100) {
    valMXN = num * 10;
  }
  return `$${valMXN.toLocaleString('es-MX')} MXN`;
}

/**
 * Obtiene el valor numérico entero para el cálculo de totales en MXN.
 */
export function priceNum(p) {
  if (!p) return 0;
  const num = parseInt(String(p).replace(/[^0-9]/g, ""), 10) || 0;
  if (num > 0 && num < 100) return num * 10;
  return num;
}

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
                    category_id,
                    main_ingredient,
                    ingredients,
                    menu_categories (name)
                `);

            clearTimeout(timeoutId);

            if (error) throw error;

            if (data && data.length > 0) {
                const groupedMenu = {};
                data.forEach(item => {
                    const categoryName = item.menu_categories?.name ||
                        (item.category_id === 1 ? 'japones' :
                         item.category_id === 2 ? 'chino' :
                         item.category_id === 3 ? 'sudeste' :
                         item.category_id === 4 ? 'infantil' :
                         item.category_id === 5 ? 'bebidas' : 'others');
                    if (!groupedMenu[categoryName]) {
                        groupedMenu[categoryName] = [];
                    }

                    groupedMenu[categoryName].push({
                        name: item.name,
                        price: item.price,
                        desc: item.description,
                        img: item.image_url,
                        main_ingredient: item.main_ingredient,
                        ingredients: item.ingredients
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
// 1. DICCIONARIO MAESTRO: INGREDIENTE PRINCIPAL E INGREDIENTES
// ============================================================
export const dishDetails = {
  // Japón
  "SASHIMI DELUXE": {
    mainIngredient: "Pescado",
    mainIngredientDetail: "Atún Aleta Azul & Salmón Fresco",
    categoryType: "pescado",
    icon: "🐟",
    ingredients: ["Atún aleta azul de pesca fresca", "Salmón sustentable", "Pulpo baby pochado", "Rábano daikon en espiral", "Wasabi natural", "Jengibre gari encurtido", "Salsa de soya añejada"],
    spice: 0,
    allergens: "Pescado, mariscos, soya"
  },
  "RAMEN TONKOTSU": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Panceta de Cerdo Chashu",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Fideos alcalinos frescos", "Caldo tonkotsu de 18 horas", "Panceta de cerdo chashu tierna", "Huevo ajitsuke marinado con yema cremosa", "Alga nori tostada", "Brotes de bambú menma", "Cebollín fresco"],
    spice: 1,
    allergens: "Gluten, huevo, soya"
  },
  "UNAGI DON": {
    mainIngredient: "Pescado",
    mainIngredientDetail: "Anguila de Agua Dulce",
    categoryType: "pescado",
    icon: "🐟",
    ingredients: ["Anguila de agua dulce (Unagi)", "Salsa dulce kabayaki reducida al mirin", "Arroz Koshihikari al vapor", "Semillas de ajonjolí tostado", "Pimienta sansho japonesa"],
    spice: 0,
    allergens: "Pescado, soya, gluten"
  },
  "YAKITORI MIX": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pollo Orgánico a las Brasas",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Pechuga y muslo de pollo orgánico", "Cebollín tierno negi", "Pimientos shishito", "Glaseado tare centenario", "Brasas de carbón blanco binchotan"],
    spice: 0,
    allergens: "Soya, gluten"
  },
  "TEMPURA IMPERIAL": {
    mainIngredient: "Mariscos",
    mainIngredientDetail: "Camarones Tigre & Vegetales",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Camarones tigre jumbo", "Flor de loto", "Camote dulce japonés", "Hongos shiitake", "Rebozado ligero y crujiente tempura", "Sal marina de matcha", "Salsa tentsuyu con daikon rallado"],
    spice: 0,
    allergens: "Crustáceos, gluten, huevo"
  },
  "OMAKASE PREMIUM": {
    mainIngredient: "Pescado & Mariscos",
    mainIngredientDetail: "Selección Imperial del Maestro (12 Tiempos)",
    categoryType: "pescado",
    icon: "🐟",
    ingredients: ["Nigiri de atún toro con caviar de soya", "Vieiras de Hokkaido braseadas", "Salmón con trufa negra", "Anguila glaseada", "Erizo de mar uni", "Pesca blanca del día", "Arroz shari sazonado"],
    spice: 0,
    allergens: "Pescado, mariscos, soya"
  },

  // China
  "PATO PEKÍN IMPERIAL": {
    mainIngredient: "Carne / Aves",
    mainIngredientDetail: "Pato Imperial Laqueado",
    categoryType: "aves",
    icon: "🦆",
    ingredients: ["Pato laqueado con piel ultra-crujiente y carne jugosa", "Crepas artesanales al vapor hechas a mano", "Pepino persa en juliana", "Cebollín fresco", "Salsa hoisin imperial de ciruela"],
    spice: 0,
    allergens: "Gluten, soya, sésamo"
  },
  "PATO PEKÍN": {
    mainIngredient: "Carne / Aves",
    mainIngredientDetail: "Pato Imperial Laqueado",
    categoryType: "aves",
    icon: "🦆",
    ingredients: ["Pato laqueado con piel crujiente", "Crepas al vapor artesanales", "Pepino persa", "Cebollín tierno", "Salsa hoisin tradicional"],
    spice: 0,
    allergens: "Gluten, soya, sésamo"
  },
  "DIM SUM DE LOTO": {
    mainIngredient: "Mariscos & Carne",
    mainIngredientDetail: "Camarón Cristal y Cerdo Trufado",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Har gow de camarón cristal en masa translúcida", "Siu mai de cerdo con esencia de trufa", "Xiao long bao aromatizado", "Aceite puro de sésamo tostado"],
    spice: 0,
    allergens: "Gluten, crustáceos, soya"
  },
  "DIM SUM PLATTER": {
    mainIngredient: "Mariscos & Carne",
    mainIngredientDetail: "Camarón Cristal y Dumplings al Vapor",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Dumplings al vapor rellenos de camarón", "Bollitos baozi", "Gyozas doradas a la plancha", "Cerdo especiado", "Salsa de soya y vinagre negro Chinkiang"],
    spice: 0,
    allergens: "Gluten, crustáceos, soya"
  },
  "RES MONGOLIANA WOK": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Finas Láminas de Rib-Eye",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Láminas de rib-eye selladas al wok a fuego vivo", "Ajo negro fermentado", "Jengibre fresco", "Cebolleta tierna", "Reducción de soya dulce", "Aceite de ajonjolí puro"],
    spice: 1,
    allergens: "Soya, gluten"
  },
  "POLLO KUNG PAO": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pechuga de Pollo en Cubos",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Pechuga de pollo orgánica en cubos", "Cacahuates tostados crocantes", "Chiles secos de árbol", "Pimientos dulces", "Pimienta de Sichuan", "Salsa agripicante al wok"],
    spice: 2,
    allergens: "Cacahuate, soya, gluten"
  },
  "MAPO TOFU": {
    mainIngredient: "Verduras / Tofu",
    mainIngredientDetail: "Tofu Sedoso de Soya & Carne Molida",
    categoryType: "verduras",
    icon: "🥬",
    ingredients: ["Tofu sedoso artesanal de soya", "Carne molida de res seleccionada", "Pasta fermentada doubanjiang de chile", "Pimienta de Sichuan aromática", "Aceite de chile rojo perfumado"],
    spice: 3,
    allergens: "Soya, gluten"
  },
  "SOPA AGRIPICANTE": {
    mainIngredient: "Verduras / Vegetales",
    mainIngredientDetail: "Tofu Suave, Hongos y Bambú",
    categoryType: "verduras",
    icon: "🥬",
    ingredients: ["Tofu en tiras finas", "Hongos oreja de madera", "Brotes de bambú tiernos", "Vinagre negro madurado de Chinkiang", "Pimienta blanca molida", "Huevo hilado al vapor"],
    spice: 2,
    allergens: "Huevo, soya, gluten"
  },
  "LANGOSTA AL JENGIBRE": {
    mainIngredient: "Mariscos",
    mainIngredientDetail: "Cola de Langosta Fresca",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Cola de langosta troceada y salteada al wok", "Jengibre fresco en juliana", "Cebollín tierno", "Reducción de vino de arroz Shaoxing", "Caldo concentrado de crustáceos"],
    spice: 1,
    allergens: "Crustáceos, soya"
  },
  "BAOZI DE CERDO CHAR SIU": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Panceta de Cerdo Glaseada Char Siu",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Bollos de trigo al vapor esponjosos", "Panceta de cerdo marinada al estilo cantonés char siu", "Miel de agave", "Cinco especias chinas tradicionales", "Salsa soya oscura"],
    spice: 0,
    allergens: "Gluten, soya"
  },
  "ARROZ FRITO CANTONÉS": {
    mainIngredient: "Mariscos & Carne",
    mainIngredientDetail: "Camarones Tigre & Jamón Curado",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Arroz jazmín salteado a fuego alto", "Camarones tigre frescos", "Dados de jamón curado", "Huevo batido al wok", "Cebollín tierno y sésamo tostado"],
    spice: 0,
    allergens: "Huevo, crustáceos, soya"
  },
  "ARROZ CHAUFA IMPERIAL": {
    mainIngredient: "Carne & Mariscos",
    mainIngredientDetail: "Carnes Seleccionadas y Huevo al Wok",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Arroz jazmín salteado al wok", "Pollo y carne de res en dados", "Huevo de granja en tortilla picada", "Cebollín chino", "Salsa de soya y jengibre"],
    spice: 0,
    allergens: "Huevo, soya, gluten"
  },

  // Sabores Asiáticos
  "PAD THAI REAL": {
    mainIngredient: "Mariscos",
    mainIngredientDetail: "Camarones Jumbo Frescos",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Fideos planos de arroz", "Camarones jumbo frescos", "Tofu salteado", "Huevo", "Germinado de soya crujiente", "Cacahuate tostado molido", "Pulpa pura de tamarindo", "Lima fresca"],
    spice: 1,
    allergens: "Cacahuate, crustáceos, huevo, soya"
  },
  "CURRY VERDE DE WAGYU": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Cortes Finos de Res Wagyu",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Cortes tiernos de res Wagyu", "Leche de coco fresca artesanal", "Pasta de curry verde molida en mortero", "Albahaca tailandesa sagrada", "Berenjena tailandesa", "Hojas de lima kaffir"],
    spice: 3,
    allergens: "Pescado (extracto de salsa nam pla)"
  },
  "SOPA TOM YUM GOONG": {
    mainIngredient: "Mariscos",
    mainIngredientDetail: "Langostinos Tigre",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Langostinos tigre enteros", "Hierba limón (lemongrass)", "Galanga fresca", "Hojas de lima kaffir", "Chiles ojo de pájaro", "Hongos paja", "Jugo recién exprimido de lima"],
    spice: 3,
    allergens: "Crustáceos, pescado"
  },
  "SOPA TOM YUM": {
    mainIngredient: "Mariscos",
    mainIngredientDetail: "Camarones Frescos",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Camarones frescos", "Caldo cítrico de hierba limón", "Galanga aromática", "Hojas de lima kaffir", "Chiles tailandeses", "Champiñones y cilantro fresco"],
    spice: 3,
    allergens: "Crustáceos, pescado"
  },
  "BULGOGI COREANO": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Filete de Res Marinado",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Finas láminas de filete de res", "Marinado de pera asiática nashi", "Ajo fresco y soya añejada", "Aceite puro de sésamo", "Kimchi casero sobre piedra caliente", "Arroz al vapor"],
    spice: 1,
    allergens: "Soya, sésamo, gluten"
  },
  "BIBIMBAP COREANO": {
    mainIngredient: "Carne & Verduras",
    mainIngredientDetail: "Carne de Res y Variedad de Verduras",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Arroz al vapor en cuenco de piedra caliente", "Láminas de carne de res marinada", "Espinacas salteadas", "Zanahoria en juliana", "Calabacita tierna", "Brotes de soya", "Huevo frito", "Pasta gochujang"],
    spice: 2,
    allergens: "Soya, huevo, sésamo, gluten"
  },
  "SATAY DE POLLO": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Brochetas de Pechuga de Pollo",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Brochetas de pechuga de pollo marinadas en cúrcuma y coco", "Salsa aterciopelada y cremosa de cacahuate", "Hierba limón", "Encurtido agridulce de pepino y chalotas"],
    spice: 1,
    allergens: "Cacahuate, soya"
  },
  "ROLLITOS VIETNAMITAS": {
    mainIngredient: "Mariscos & Verduras",
    mainIngredientDetail: "Camarón Pochado y Mango Ataulfo",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Obleas transparentes de papel de arroz", "Camarones pochados al punto", "Láminas de mango ataulfo dulce", "Fideos de arroz vermicelli", "Menta fresca", "Cilantro", "Salsa nuoc cham agridulce"],
    spice: 0,
    allergens: "Crustáceos, cacahuate"
  },
  "BAO CROCANTE DE PATO": {
    mainIngredient: "Carne / Aves",
    mainIngredientDetail: "Confit Crujiente de Pato",
    categoryType: "aves",
    icon: "🦆",
    ingredients: ["Pan bao esponjoso al vapor", "Confit crujiente de pato deshebrado", "Pepino persa encurtido agridulce", "Mayonesa artesanal japonesa de yuzu", "Cebollín tierno"],
    spice: 0,
    allergens: "Gluten, soya, huevo"
  },

  // Menú Infantil
  "MINI BENTO IMPERIAL": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pollo Teriyaki Suave",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Arroz al vapor moldeado en figura de panda", "Brochetas suaves de pollo en salsa teriyaki dulce", "Vainas de edamame tierno al vapor", "Zanahorias dulces", "Gajos de fruta fresca"],
    spice: 0,
    allergens: "Gluten, soya, sésamo"
  },
  "MINI SUSHI KIT": {
    mainIngredient: "Pescado",
    mainIngredientDetail: "Salmón Fresco & Arroz Koshihikari",
    categoryType: "pescado",
    icon: "🐟",
    ingredients: ["Mini piezas de sushi seleccionadas sin picante", "Salmón fresco suave", "Aguacate cremoso", "Arroz de sushi dulce", "Salsa de soya ligera especial infantil"],
    spice: 0,
    allergens: "Pescado, soya"
  },
  "FIDEOS UDON SUAVES": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pechuga de Pollo Orgánico",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Fideos gruesos japoneses udon de trigo", "Caldo dashi suave sin picante", "Pechuga de pollo orgánico deshebrada", "Zanahoria dulce rallada", "Calabacita tierna"],
    spice: 0,
    allergens: "Gluten, soya"
  },
  "ROLLITOS CALIFORNIA KIDS": {
    mainIngredient: "Mariscos",
    mainIngredientDetail: "Surimi de Cangrejo & Aguacate",
    categoryType: "mariscos",
    icon: "🦐",
    ingredients: ["Rollos de arroz con alga nori", "Surimi selecto de cangrejo", "Aguacate Hass mexicano maduro", "Queso crema suave Philadelphia", "Semillas de ajonjolí tostado"],
    spice: 0,
    allergens: "Crustáceos, lácteos, sésamo, soya"
  },
  "TORI KARAAGE DORADO": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pechuga de Pollo Crujiente",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Bocados tiernos de pechuga de pollo marinados", "Fécula ligera de papa japonesa ultra-crocante", "Arroz jazmín suave al vapor", "Salsa agridulce infantil de frutas"],
    spice: 0,
    allergens: "Gluten, soya"
  },
  "GYOZAS DULCES DE POLLO": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pollo Suave & Vegetales Tiernos",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Empanadillas japonesas selladas a la plancha", "Relleno delicado de pollo suave y cebollín", "Masa fina de trigo", "Salsa dulce ponzu infantil"],
    spice: 0,
    allergens: "Gluten, soya"
  },
  "ARROZ CON POLLO DULCE": {
    mainIngredient: "Carne",
    mainIngredientDetail: "Pollo Glaseado Agridulce",
    categoryType: "carne",
    icon: "🥩",
    ingredients: ["Arroz suave al vapor", "Trocitos tiernos de pollo", "Glaseado agridulce casero con piña", "Zanahorias y chícharos tiernos"],
    spice: 0,
    allergens: "Soya"
  },
  "ROLLITO PRIMAVERA KIDS": {
    mainIngredient: "Verduras / Vegetales",
    mainIngredientDetail: "Vegetales Tiernos y Crujientes",
    categoryType: "verduras",
    icon: "🥬",
    ingredients: ["Pasta fina crujiente y dorada", "Relleno de col tierna, zanahoria y brotes de soya sin picante", "Salsa dulce casera de ciruela"],
    spice: 0,
    allergens: "Gluten, soya"
  },
  "MOCHI HELADO TRÍO": {
    mainIngredient: "Verduras / Postre",
    mainIngredientDetail: "Arroz Dulce Glutinoso & Helado",
    categoryType: "verduras",
    icon: "🍨",
    ingredients: ["Tres esferas de masa artesanal de arroz mochigome", "Relleno de helado artesanal de matcha, sésamo negro y mango ataulfo", "Cacao fino"],
    spice: 0,
    allergens: "Lácteos, soya"
  },

  // Bebidas, Sake y Vinos
  "DASSAI 23 JUNMAI DAIGINJO": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Arroz Yamadanishiki Pulido al 23%",
    categoryType: "bebidas",
    icon: "🍶",
    ingredients: ["Arroz Yamadanishiki pulido al 23%", "Agua pura de manantial de Yamaguchi", "Koji natural", "Notas aromáticas de melón blanco, durazno y uva moscatel"],
    spice: 0,
    allergens: "Contiene alcohol (Sake Junmai Daiginjo)"
  },
  "SAKE JUNMAI DAIGINJO": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Arroz Yamadanishiki de Selección",
    categoryType: "bebidas",
    icon: "🍶",
    ingredients: ["Arroz pulido ultra-premium", "Agua pura de deshielo", "Koji natural", "Notas florales y cítricas suaves"],
    spice: 0,
    allergens: "Contiene alcohol"
  },
  "SAKE PREMIUM": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Arroz Fermentado Japonés",
    categoryType: "bebidas",
    icon: "🍶",
    ingredients: ["Arroz sake japonés de alta calidad", "Agua mineral de manantial", "Filtrado en frío", "Notas frescas de manzana verde y pera"],
    spice: 0,
    allergens: "Contiene alcohol"
  },
  "CÓCTEL LOTO DE ORO": {
    mainIngredient: "Bebida / Mixología",
    mainIngredientDetail: "Ginebra Japonesa Roku & Flor de Saúco",
    categoryType: "bebidas",
    icon: "🍸",
    ingredients: ["Ginebra japonesa artesanal Roku", "Licor francés de flor de saúco", "Jugo fresco de yuzu oriental", "Jarabe de jengibre artesanal", "Lámina de oro comestible de 24 quilates"],
    spice: 0,
    allergens: "Contiene alcohol"
  },
  "KUBOTA MANJU SAKE": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Arroz Gohyakumangoku de Niigata",
    categoryType: "bebidas",
    icon: "🍶",
    ingredients: ["Arroz Gohyakumangoku pulido al 33%", "Agua de manantial subterráneo de Niigata", "Fermentación lenta a baja temperatura", "Perfil umami sutil y seco"],
    spice: 0,
    allergens: "Contiene alcohol"
  },
  "CHOYA UMESHU ROYAL": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Ciruela Japonesa Ume Macerada",
    categoryType: "bebidas",
    icon: "🥃",
    ingredients: ["Ciruelas japonesas verdes ume de Wakayama", "Alcohol puro destilado de caña", "Miel de flores silvestres", "Notas de almendra dulce y acidez equilibrada"],
    spice: 0,
    allergens: "Contiene alcohol"
  },
  "PINOT NOIR RESERVA IMPERIAL": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Uva Pinot Noir de Guarda",
    categoryType: "bebidas",
    icon: "🍷",
    ingredients: ["Uvas 100% Pinot Noir de viñedo de clima frío", "12 meses de crianza en barrica de roble francés", "Notas de cereza negra, especias y tierra húmeda"],
    spice: 0,
    allergens: "Contiene alcohol, sulfitos"
  },
  "VINO RIESLING": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Uva Riesling de Valle Fresco",
    categoryType: "bebidas",
    icon: "🍷",
    ingredients: ["Uvas 100% Riesling aromáticas", "Fermentación en tanques de acero inoxidable", "Notas cítricas de lima, manzana verde y mineralidad"],
    spice: 0,
    allergens: "Contiene alcohol, sulfitos"
  },
  "VINO RIESLING IMPERIAL": {
    mainIngredient: "Bebida / Cava",
    mainIngredientDetail: "Uva Riesling Aromática",
    categoryType: "bebidas",
    icon: "🍷",
    ingredients: ["Uvas Riesling de cosecha tardía", "Equilibrio entre acidez y frescura", "Maridaje ideal para platillos especiados"],
    spice: 0,
    allergens: "Contiene alcohol, sulfitos"
  },
  "TÉ OOLONG DE ALTA MONTAÑA": {
    mainIngredient: "Verduras / Té",
    mainIngredientDetail: "Hojas Seleccionadas de Camellia Sinensis",
    categoryType: "verduras",
    icon: "🍵",
    ingredients: ["Hojas enteras de té Oolong semifermentado a más de 1,800m", "Infusionado en agua pura a 90°C", "Notas tostadas a orquídea y miel"],
    spice: 0,
    allergens: "Sin alérgenos conocidos (Sin alcohol)"
  },
  "TÉ MATCHA IMPERIAL": {
    mainIngredient: "Verduras / Té",
    mainIngredientDetail: "Té Verde Ceremonial de Uji (Kioto)",
    categoryType: "verduras",
    icon: "🍵",
    ingredients: ["Polvo fino de té verde Tencha grado ceremonial de primera cosecha de Uji", "Batido a mano con chasen de bambú", "Agua purificada"],
    spice: 0,
    allergens: "Sin alérgenos conocidos (Sin alcohol)"
  }
};

/**
 * Obtiene la información enriquecida (ingrediente principal, ingredientes, picante, alérgenos)
 * de cualquier platillo, ya sea local o remoto desde Supabase.
 */
export function getDishInfo(itemOrName) {
  const name = typeof itemOrName === "string" ? itemOrName : itemOrName?.name;
  const norm = normalizeName(name);
  const detail = dishDetails[norm] || {};
  
  const mainIngredient = (typeof itemOrName === "object" && itemOrName?.main_ingredient) || detail.mainIngredient || "Especialidad Imperial";
  const mainIngredientDetail = (typeof itemOrName === "object" && itemOrName?.main_ingredient_detail) || detail.mainIngredientDetail || mainIngredient;
  const categoryType = (typeof itemOrName === "object" && itemOrName?.category_type) || detail.categoryType || "carne";
  const icon = detail.icon || (
    categoryType === "carne" ? "🥩" :
    categoryType === "mariscos" ? "🦐" :
    categoryType === "pescado" ? "🐟" :
    categoryType === "verduras" ? "🥬" :
    categoryType === "aves" ? "🦆" : "🍶"
  );
  
  let ingredients = [];
  if (typeof itemOrName === "object" && itemOrName?.ingredients) {
    if (Array.isArray(itemOrName.ingredients)) {
      ingredients = itemOrName.ingredients;
    } else if (typeof itemOrName.ingredients === "string") {
      ingredients = itemOrName.ingredients.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  if (!ingredients.length && detail.ingredients) {
    ingredients = detail.ingredients;
  }
  if (!ingredients.length) {
    ingredients = ["Ingredientes selectos de temporada", "Especias orientales", "Salsas de la casa"];
  }

  const spice = (typeof itemOrName === "object" && itemOrName?.spice !== undefined) ? itemOrName.spice : (detail.spice ?? 0);
  const allergens = (typeof itemOrName === "object" && itemOrName?.allergens) || detail.allergens || "Consulte a nuestro personal";

  return {
    mainIngredient,
    mainIngredientDetail,
    categoryType,
    icon,
    ingredients,
    spice,
    allergens
  };
}

/**
 * Devuelve las clases CSS del badge de ingrediente principal según el tipo.
 */
export function getCategoryBadgeClasses(type) {
  switch (type) {
    case "mariscos":
      return "bg-[#0b242a] text-[#5eead4] border-[#14b8a6]/40";
    case "pescado":
      return "bg-[#0c2238] text-[#7dd3fc] border-[#0284c7]/40";
    case "verduras":
      return "bg-[#0e261a] text-[#6ee7b7] border-[#059669]/40";
    case "aves":
      return "bg-[#2d180b] text-[#fdba74] border-[#ea580c]/40";
    case "bebidas":
      return "bg-[#271026] text-[#f472b6] border-[#db2777]/40";
    case "carne":
    default:
      return "bg-[#2a0e10] text-[#FFDA74] border-[#D4AF37]/40";
  }
}

// ============================================================
// 2. DATASET DE CAPÍTULOS DE LA CARTA ENCUADERNADA (PRECIOS MXN)
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
        price: "$350 MXN",
        tag: "Chef's Selection",
        description: "Cortes frescos de atún, salmón y pesca del día sobre nieve.",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "RAMEN TONKOTSU",
        price: "$220 MXN",
        tag: "12h Cocción",
        description: "Caldo cremoso de cerdo cocinado por 12h, chashu y huevo marinado.",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "UNAGI DON",
        price: "$320 MXN",
        tag: "Especialidad",
        description: "Anguila glaseada asada sobre cama de arroz Koshihikari premium.",
        image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "YAKITORI MIX",
        price: "$200 MXN",
        tag: "Binchotan",
        description: "Brochetas de pollo y vegetales asadas al carbón japonés binchotan.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "TEMPURA IMPERIAL",
        price: "$250 MXN",
        tag: "Crujiente",
        description: "Camarones y vegetales rebozados en masa ligera y crujiente.",
        image: "https://images.unsplash.com/photo-1581781870027-04212e231e96?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "OMAKASE PREMIUM",
        price: "$1,200 MXN",
        tag: "12 Tiempos",
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
        price: "$480 MXN",
        tag: "Clásico Imperial",
        description: "Pato laqueado crujiente con crepas artesanales, cebollín y salsa hoisin.",
        image: "https://images.unsplash.com/photo-1518492104633-130d0cc84637?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "DIM SUM DE LOTO",
        price: "$240 MXN",
        tag: "Al Vapor",
        description: "Canasta de bambú con har gow de camarón cristal y siu mai con trufa.",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "RES MONGOLIANA WOK",
        price: "$340 MXN",
        tag: "Fuego Alto",
        description: "Láminas de rib-eye selladas al wok con ajo negro, jengibre y soya dulce.",
        image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "LANGOSTA AL JENGIBRE",
        price: "$650 MXN",
        tag: "Reserva Especial",
        description: "Cola de langosta salteada con cebollín tierno y reducción de vino Shaoxing.",
        image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "BAOZI DE CERDO CHAR SIU",
        price: "$190 MXN",
        tag: "Artesanal",
        description: "Bollos esponjosos al vapor rellenos de panceta glaseada a la miel.",
        image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "ARROZ FRITO CANTONÉS",
        price: "$210 MXN",
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
        price: "$260 MXN",
        tag: "Tailandia",
        description: "Fideos de arroz en tamarindo añejo, camarones jumbo, cacahuate y lima.",
        image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "CURRY VERDE DE WAGYU",
        price: "$390 MXN",
        tag: "Bangkok",
        description: "Leche de coco artesanal, albahaca tailandesa y cortes tiernos de Wagyu.",
        image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "SOPA TOM YUM GOONG",
        price: "$230 MXN",
        tag: "Aromática",
        description: "Caldo vibrante de hierba limón, galanga, hojas de lima y langostinos.",
        image: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "BULGOGI COREANO",
        price: "$330 MXN",
        tag: "Seúl",
        description: "Filete marinado en pera asiática y soya sobre piedra caliente con kimchi.",
        image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "ROLLITOS VIETNAMITAS",
        price: "$180 MXN",
        tag: "Fresco",
        description: "Papel de arroz con camarón, mango ataulfo, menta fresca y salsa nuoc cham.",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "BAO CROCANTE DE PATO",
        price: "$240 MXN",
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
        price: "$160 MXN",
        tag: "Favorito",
        description: "Arroz al vapor con forma de panda, brochetas de pollo teriyaki y edamames.",
        image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "FIDEOS UDON SUAVES",
        price: "$140 MXN",
        tag: "Sin Picante",
        description: "Fideos gruesos japoneses salteados con pollo orgánico y zanahoria dulce.",
        image: "https://images.unsplash.com/photo-1618841557871-b4664fbf0cb3?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "ROLLITOS CALIFORNIA KIDS",
        price: "$150 MXN",
        tag: "8 Piezas",
        description: "Rollos frescos de surimi de cangrejo, aguacate cremoso y queso suave.",
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "TORI KARAAGE DORADO",
        price: "$150 MXN",
        tag: "Crujiente",
        description: "Bocados crujientes de pechuga de pollo acompañados de arroz jazmín.",
        image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "GYOZAS DULCES DE POLLO",
        price: "$140 MXN",
        tag: "6 Piezas",
        description: "Empanadillas japonesas selladas a la plancha con relleno suave de pollo.",
        image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "MOCHI HELADO TRÍO",
        price: "$120 MXN",
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
        price: "$420 MXN",
        tag: "Copa / Jarra",
        description: "Sake ultra-premium de Yamaguchi con notas florales de melón blanco.",
        image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "CÓCTEL LOTO DE ORO",
        price: "$190 MXN",
        tag: "Mixología",
        description: "Ginebra japonesa Roku, flor de saúco, yuzu fresco y lámina de oro.",
        image: "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "KUBOTA MANJU SAKE",
        price: "$380 MXN",
        tag: "Niigata",
        description: "Equilibrio magistral entre acidez sutil y profundidad umami.",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "CHOYA UMESHU ROYAL",
        price: "$180 MXN",
        tag: "Ciruela Japonesa",
        description: "Licor artesanal de ciruela ume macerada con notas de almendra dulce.",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "PINOT NOIR RESERVA IMPERIAL",
        price: "$280 MXN",
        tag: "Maridaje Pato",
        description: "Vino tinto elegante de cuerpo medio con notas de cereza negra.",
        image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "TÉ OOLONG DE ALTA MONTAÑA",
        price: "$140 MXN",
        tag: "Sin Alcohol",
        description: "Infusión ceremonial en tetera de hierro con aroma a orquídea tostada.",
        image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

const spiceLabels = ["Sin picante", "Picante suave", "Picante medio", "Muy picante"];
const spiceDots = (n) => n === 0 ? "" :
  `<span class="inline-flex gap-0.5 ml-2 align-middle" title="${spiceLabels[n]}" aria-label="${spiceLabels[n]}">${
    [1,2,3].map(i => `<span class="w-1.5 h-1.5 rounded-full ${i <= n ? "bg-[#d9442f]" : "bg-imperial-gold/25"}"></span>`).join("")}</span>`;

// ============================================================
// 3. SISTEMA DE AUDIO PROCEDURAL (SONIDO DE PAPEL SINTETIZADO)
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
    // Autoplay policy
  }
}

// ============================================================
// 4. MI SELECCIÓN (FAVORITOS) Y MODAL DE DETALLE DE PLATILLO
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
  const item = catalogChapters.flatMap(c => c.items).find(i => normalizeName(i.name) === normalizeName(name));
  if (!item) return;
  const key = item.name;
  if (selection.has(key)) {
    selection.delete(key);
    showToast("Quitado de tu selección");
  } else {
    selection.set(key, item);
    showToast("Añadido a tu selección");
  }
  updateSelectionBadge();
  document.querySelectorAll(`[data-heart]`).forEach(b => {
    const dishAttr = b.getAttribute("data-heart");
    if (normalizeName(dishAttr) === normalizeName(key)) {
      const on = selection.has(key);
      b.setAttribute("aria-pressed", on);
      b.classList.toggle("text-imperial-gold", on);
      b.classList.toggle("text-imperial-muted", !on);
      b.querySelector("svg, i")?.setAttribute("fill", on ? "currentColor" : "none");
    }
  });
  const dlg = document.getElementById("dish-dialog");
  if (dlg && dlg.open && dlg.dataset.mode === "list") openSelection();
  if (dlg && dlg.open && dlg.dataset.mode === "dish" && normalizeName(dlg.dataset.dish) === normalizeName(key)) openDish(key);
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

/**
 * Abre la ficha interactiva del platillo mostrando:
 * - Ingrediente principal destacado (Carne, Mariscos, Pescado, Verduras, etc.)
 * - Lista de ingredientes de la receta
 * - Precio en Pesos Mexicanos (MXN)
 * - Nivel de picante y alérgenos
 */
export function openDish(name) {
  const item = catalogChapters.flatMap(c => c.items).find(i => normalizeName(i.name) === normalizeName(name));
  if (!item) return;
  const info = getDishInfo(item);
  const chosen = selection.has(item.name);
  const badgeClasses = getCategoryBadgeClasses(info.categoryType);
  const formattedPrice = formatPriceMXN(item.price);

  const ingredientsPills = info.ingredients.map(ing => `
    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#140607] border border-imperial-gold/25 text-xs text-imperial-cream font-medium">
      <span class="w-1.5 h-1.5 rounded-full bg-imperial-gold"></span>
      <span>${ing}</span>
    </span>
  `).join("");

  dishPanelOpen("dish", `
    <!-- Imagen del Platillo -->
    <div class="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-[#120505]">
      <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover"
           onerror="this.src='https://placehold.co/900x560/260d0f/D4AF37?text=${encodeURIComponent(item.name)}'" />
      <div class="absolute inset-0 bg-gradient-to-t from-[#1c0808] via-transparent to-black/30"></div>
      
      <!-- Badge de Ingrediente Principal en Esquina Superior -->
      <div class="absolute top-4 left-4 flex flex-wrap gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border shadow-gold ${badgeClasses}">
          <span>${info.icon}</span>
          <span>${info.mainIngredient}</span>
        </span>
        <span class="px-2.5 py-1 rounded-full bg-[#120505]/85 border border-imperial-gold/40 text-[11px] font-semibold tracking-wider text-imperial-gold">
          ${item.tag}
        </span>
      </div>
    </div>

    <!-- Cuerpo de Información -->
    <div class="p-6 sm:p-8">
      <!-- Nombre y Precio en MXN -->
      <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 mb-5 border-b border-imperial-gold/20">
        <div>
          <h3 class="font-serif text-2xl sm:text-3xl font-bold tracking-wider text-imperial-cream">${item.name}</h3>
          <span class="text-xs uppercase tracking-[0.2em] text-imperial-gold/80 font-medium">Especialidad de la Casa</span>
        </div>
        <div class="text-left sm:text-right mt-1 sm:mt-0">
          <span class="font-serif text-2xl sm:text-3xl font-bold text-imperial-gold block tracking-wide">${formattedPrice}</span>
          <span class="text-[10px] uppercase tracking-wider text-imperial-gold/75 block font-semibold">Pesos Mexicanos (MXN) • IVA incluido</span>
        </div>
      </div>

      <!-- Descripción Sensorial -->
      <p class="text-imperial-muted text-sm sm:text-base leading-relaxed mb-6 font-light italic">
        “${item.description}”
      </p>

      <!-- TARJETA DESTACADA: INGREDIENTE PRINCIPAL -->
      <div class="mb-5 p-4 rounded-xl bg-gradient-to-r from-[#220a0b] to-[#160808] border border-imperial-gold/35 flex items-center gap-4 shadow-md">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${badgeClasses}">
          ${info.icon}
        </div>
        <div class="flex-1 min-w-0">
          <span class="block text-[10px] uppercase tracking-[0.22em] text-imperial-gold font-bold">Ingrediente Principal Destacado</span>
          <h4 class="font-serif text-base sm:text-lg font-bold text-imperial-cream truncate">${info.mainIngredient}: ${info.mainIngredientDetail}</h4>
        </div>
      </div>

      <!-- SECCIÓN: INGREDIENTES DETALLADOS -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <i data-lucide="utensils" class="w-4 h-4 text-imperial-gold"></i>
          <h4 class="text-xs uppercase tracking-[0.22em] text-imperial-gold font-bold">Ingredientes de la Preparación</h4>
        </div>
        <div class="flex flex-wrap gap-2">
          ${ingredientsPills}
        </div>
      </div>

      <!-- METADATOS: PICANTE Y ALÉRGENOS -->
      <dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-xs sm:text-sm p-3.5 rounded-xl bg-[#120505]/75 border border-imperial-gold/15 mb-6">
        <dt class="text-imperial-gold font-medium flex items-center gap-1.5">
          <i data-lucide="flame" class="w-3.5 h-3.5"></i>
          <span>Picante:</span>
        </dt>
        <dd class="text-imperial-cream/90 flex items-center">${spiceLabels[info.spice]}${spiceDots(info.spice)}</dd>
        
        <dt class="text-imperial-gold font-medium flex items-center gap-1.5">
          <i data-lucide="info" class="w-3.5 h-3.5"></i>
          <span>Alérgenos:</span>
        </dt>
        <dd class="text-imperial-cream/90 font-light">${info.allergens}</dd>
      </dl>

      <!-- BOTÓN INTERACTIVO DE SELECCIÓN -->
      <button type="button" onclick="window.toggleDish(decodeURIComponent('${encodeURIComponent(item.name)}'))"
        class="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-xs sm:text-sm uppercase tracking-[0.16em] font-bold transition-all cursor-pointer ${
          chosen ? "bg-[#260d0f] border-2 border-imperial-gold text-imperial-gold shadow-gold"
                 : "bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] shadow-gold hover:brightness-105 active:scale-95"}">
        <i data-lucide="${chosen ? "check" : "heart"}" class="w-4 h-4"></i>
        <span>${chosen ? "En tu selección • Quitar de mi lista" : "Añadir a mi selección de platillos"}</span>
      </button>
    </div>`, item.name);
}

export function openSelection() {
  const items = [...selection.values()];
  const total = items.reduce((s, i) => s + priceNum(i.price), 0);
  const rows = items.map(i => {
    const info = getDishInfo(i);
    const formattedPrice = formatPriceMXN(i.price);
    return `
    <li class="flex items-center justify-between gap-3 py-3.5 border-b border-imperial-gold/15 hover:bg-[#260d0f]/40 px-2 rounded-lg transition-colors">
      <button type="button" class="text-left min-w-0 flex-1 cursor-pointer" onclick="window.openDish(decodeURIComponent('${encodeURIComponent(i.name)}'))">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-base">${info.icon}</span>
          <span class="block font-serif text-sm tracking-wider text-imperial-cream truncate font-bold">${i.name}</span>
        </div>
        <span class="block text-xs text-imperial-muted font-light">${info.mainIngredient}: ${info.mainIngredientDetail}</span>
      </button>
      <div class="text-right shrink-0">
        <span class="font-serif text-sm sm:text-base text-imperial-gold font-bold block">${formattedPrice}</span>
      </div>
      <button type="button" aria-label="Quitar ${i.name}" class="p-2 text-imperial-muted hover:text-red-400 cursor-pointer transition-colors"
              onclick="window.toggleDish(decodeURIComponent('${encodeURIComponent(i.name)}'))"><i data-lucide="x" class="w-4 h-4"></i></button>
    </li>`;
  }).join("");

  dishPanelOpen("list", `
    <div class="p-6 sm:p-8">
      <div class="flex items-center justify-between pb-3 mb-2 border-b border-imperial-gold/25">
        <h3 class="font-serif text-xl sm:text-2xl font-bold tracking-wider text-gold-gradient">MI SELECCIÓN IMPERIAL</h3>
        <span class="px-2.5 py-1 rounded-full bg-imperial-gold text-[#120505] text-xs font-bold">${items.length} Platillos</span>
      </div>
      <p class="text-xs sm:text-sm text-imperial-muted mb-5 font-light">Platillos selectos que planea ordenar en su próxima velada en Loto Imperial.</p>
      
      ${items.length ? `
        <ul class="divide-y divide-imperial-gold/10 max-h-[50vh] overflow-y-auto pr-1">${rows}</ul>
        
        <div class="mt-6 pt-4 border-t-2 border-imperial-gold/30">
          <div class="flex items-baseline justify-between mb-1">
            <span class="text-sm uppercase tracking-wider text-imperial-muted font-medium">Total estimado:</span>
            <span class="font-serif text-2xl sm:text-3xl font-bold text-imperial-gold">$${total.toLocaleString('es-MX')} MXN</span>
          </div>
          <span class="block text-[11px] text-right text-imperial-gold/75 mb-6 font-light">Precios expresados en Pesos Mexicanos (MXN) • IVA incluido</span>
        </div>

        <button type="button" onclick="document.getElementById('dish-dialog').close()"
           class="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#FFDA74] to-[#D4AF37] text-[#120505] text-xs uppercase tracking-widest font-bold shadow-gold cursor-pointer hover:brightness-105 active:scale-95">
           <i data-lucide="utensils" class="w-4 h-4"></i>
           <span>Seguir explorando la carta encuadernada</span>
        </button>`
      : `
        <div class="py-12 text-center text-imperial-muted font-light">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[#140607] border border-imperial-gold/25 flex items-center justify-center text-2xl text-imperial-gold">
            <i data-lucide="heart" class="w-7 h-7 text-imperial-gold/70"></i>
          </div>
          <p class="text-base text-imperial-cream mb-2 font-serif">Aún no ha seleccionado ningún platillo</p>
          <p class="text-xs max-w-sm mx-auto">Haga clic en cualquier platillo de la carta para conocer sus ingredientes, o presione el corazón para guardarlo en su comanda.</p>
        </div>`}
    </div>`);
}

// Hacer globales las funciones para eventos onclick inline
window.openDish = openDish;
window.openSelection = openSelection;
window.toggleDish = toggleDish;

// ============================================================
// 5. MOTOR DE HOJEADO Y CURVATURA DE PAPEL EN TIEMPO REAL
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

/**
 * Genera la tarjeta de platillo para el libro abierto.
 * Al hacer click en cualquier parte de la tarjeta se abre la ficha interactiva con ingredientes y detalles.
 */
function createBookDishRow(item, delayIndex) {
  const row = document.createElement("article");
  const info = getDishInfo(item);
  const chosen = selection.has(item.name);
  const badgeClasses = getCategoryBadgeClasses(info.categoryType);
  const formattedPrice = formatPriceMXN(item.price);

  row.style.animationDelay = `${delayIndex * 45}ms`;
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", `Ver ingredientes y detalles de ${item.name}`);
  row.className =
    "animate-card group relative h-[120px] sm:h-[126px] flex items-center gap-3.5 sm:gap-4 p-3 rounded-2xl bg-[#160808]/85 hover:bg-[#260d0f]/95 border border-imperial-gold/20 hover:border-imperial-gold/70 transition-all duration-300 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFDA74] shadow-sm hover:shadow-gold";
  
  const open = () => openDish(item.name);
  row.addEventListener("click", open);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  row.innerHTML = `
    <!-- Imagen del Platillo -->
    <div class="relative w-28 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden bg-[#120505] border border-imperial-gold/30 shrink-0">
      <img
        src="${item.image}"
        onerror="this.src='https://placehold.co/320x200/260d0f/D4AF37?text=${encodeURIComponent(item.name)}'"
        alt="${item.name}"
        loading="lazy"
        class="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
      />
    </div>

    <!-- Contenido y Metadatos -->
    <div class="flex-1 min-w-0 flex flex-col justify-center pr-6">
      <div class="flex items-center gap-1.5 mb-1">
        <!-- Badge de Ingrediente Principal -->
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeClasses}" title="Ingrediente principal: ${info.mainIngredient}">
          <span>${info.icon}</span>
          <span>${info.mainIngredient}</span>
        </span>
        <span class="text-[9px] uppercase tracking-[0.16em] text-imperial-gold/80 font-semibold truncate hidden sm:inline-block">${item.tag}</span>
        ${spiceDots(info.spice)}
      </div>

      <div class="flex items-baseline justify-between gap-2 mb-1">
        <h4 class="font-serif text-sm sm:text-[15px] font-bold tracking-wider text-imperial-cream group-hover:text-imperial-gold transition-colors truncate">
          ${item.name}
        </h4>
        <span class="font-serif text-xs sm:text-sm font-bold text-imperial-gold shrink-0 tracking-wide">
          ${formattedPrice}
        </span>
      </div>

      <p class="text-xs text-imperial-muted leading-snug font-light line-clamp-1 mb-1">
        ${item.description}
      </p>

      <!-- Indicador de Clic para Ver Ingredientes -->
      <div class="flex items-center gap-1 text-[10px] text-imperial-gold/75 group-hover:text-imperial-gold font-medium transition-colors">
        <span>Tocar para ver ingredientes</span>
        <i data-lucide="chevron-right" class="w-3 h-3 group-hover:translate-x-0.5 transition-transform"></i>
      </div>
    </div>

    <!-- Botón de Corazón (Favoritos) -->
    <button type="button" data-heart="${item.name}" aria-pressed="${chosen}" aria-label="Guardar ${item.name} en mi selección"
      class="absolute top-2 right-2 p-1.5 rounded-full hover:bg-imperial-gold/15 transition-colors cursor-pointer ${chosen ? "text-imperial-gold" : "text-imperial-muted"}">
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
// 6. INICIALIZADOR PRINCIPAL DEL MENÚ DE ALTA GAMA
// ============================================================
let bookInitialized = false;

export function initBookMenu(menuData) {
  const catalogBookEl = document.getElementById("catalog-book");
  const curlCanvas = document.getElementById("page-curl-canvas");
  if (!catalogBookEl || !curlCanvas) return;
  const ctx = curlCanvas.getContext("2d");

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
        matchedData.slice(0, 6).forEach((remoteItem, idx) => {
          if (!ch.items[idx]) {
            ch.items[idx] = { name: "", price: "", tag: "Especialidad", description: "", image: "" };
          }
          if (remoteItem.name) ch.items[idx].name = remoteItem.name;
          if (remoteItem.price !== undefined) {
            ch.items[idx].price = formatPriceMXN(remoteItem.price);
          }
          if (remoteItem.desc) ch.items[idx].description = remoteItem.desc;
          if (remoteItem.img) ch.items[idx].image = remoteItem.img;
          if (remoteItem.main_ingredient) ch.items[idx].main_ingredient = remoteItem.main_ingredient;
          if (remoteItem.ingredients) ch.items[idx].ingredients = remoteItem.ingredients;
        });
      }
    });
  }

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

  // Si ya se habían vinculado los eventos previamente, sólo refrescamos el pliego actual y salimos
  if (bookInitialized) {
    renderChapterSpread(currentChapterIndex);
    return;
  }
  bookInitialized = true;

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
