import { supabase } from './supabaseClient.js';

export async function fetchMenuData() {
    console.log('Fetching menu data from Supabase...');
    try {
        // Fetch menu items and their associated categories
        const { data, error } = await supabase
            .from('menu_items')
            .select(`
                name,
                price,
                description,
                image_url,
                menu_categories (name)
            `);

        if (error) throw error;

        console.log('Menu data fetched successfully:', data);

        // Transform the flat list into a grouped object: { categoryName: [items] }
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

        return groupedMenu;
    } catch (error) {
        console.error('CRITICAL ERROR loading menu from Supabase:', error);
        return null;
    }
}

export function renderMenu(menuGrid, menuData, category) {
    if (!menuGrid) return;
    menuGrid.innerHTML = '';

    const items = (menuData && menuData[category]) ? menuData[category] : [];

    if (items.length === 0) {
        menuGrid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column: 1/-1;">Próximamente más delicias en esta categoría.</p>';
        return;
    }

    items.forEach((item) => {
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
