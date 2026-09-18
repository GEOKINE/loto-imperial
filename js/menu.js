// LOTO IMPERIAL - Menu Logic & Dynamic Data

export async function fetchMenuData() {
    console.log('Fetching menu data...');
    try {
        const response = await fetch('menu.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Menu data loaded successfully:', data);
        return data;
    } catch (error) {
        console.error('CRITICAL ERROR loading menu data:', error);
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
