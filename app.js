import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjE-2q6PONBkCin9ZN22gDp9Q8pAH9ZW8",
    authDomain: "story-97cf7.firebaseapp.com",
    databaseURL: "https://story-97cf7-default-rtdb.firebaseio.com",
    projectId: "story-97cf7",
    storageBucket: "story-97cf7.firebasestorage.app",
    messagingSenderId: "742801388214",
    appId: "1:742801388214:web:32a305a8057b0582c5ec17",
    measurementId: "G-9DPPWX7CF0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تم تحديث الرقم
const WA_PHONE = "201202687082";
let cart = JSON.parse(localStorage.getItem('athar_cart')) || [];
let productsCache = [];
const SHIPPING_COST = 80;

// Variables for Editing Color
let editingItemIndex = null;
let editingItemProduct = null;

const governorates = [
    "القاهرة", "الجيزة", "الاسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", 
    "الغربية", "الاسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", 
    "اسوان", "اسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", 
    "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهـاج"
];

const colorPalette = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#800080', '#FFA500', '#A52A2A', '#808080',
    '#D4AF37', '#064E3B', '#FFC0CB', '#40E0D0', '#000080'
];
let selectedColorsAdmin = [];

// --- UTILS ---
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_W = 600;
                const scale = MAX_W / img.width;
                canvas.width = MAX_W;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
        reader.onerror = reject;
    });
};

// --- ROUTER ---
window.router = function(route, param = null) {
    const bg = document.getElementById('main-bg');
    const header = document.getElementById('main-header');
    window.scrollTo(0,0);
    
    // Background Logic
    if(route === 'home') {
        bg.style.display = 'block';
        header.style.display = 'flex';
        renderHome();
    } else {
        bg.style.display = 'none'; // White bg for inner pages
        header.style.display = 'none'; // No header for inner pages
        
        if(route === 'product') renderProductPage(param);
        else if(route === 'cart') renderCartPage();
        else if(route === 'admin') renderAdmin();
    }
}

// --- HOME ---
async function renderHome() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="product-grid">${Array(4).fill('<div class="img-box skeleton" style="height:200px; margin-bottom:20px;"></div>').join('')}</div>`;

    try {
        const q = query(collection(db, "products"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        productsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let html = '<div class="product-grid">';
        productsCache.forEach(p => {
            const img = p.images ? p.images[0] : p.imageCode;
            html += `
                <div class="product-card" onclick="router('product', '${p.id}')">
                    <div class="img-box">
                        <img src="${img}" class="p-img">
                        
                        <!-- الزر العائم الشفاف -->
                        <div class="float-btn-wrapper">
                            <div class="float-btn">
                                <span style="margin-left:8px;">${p.price}</span>
                                <i class="fas fa-plus"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        appDiv.innerHTML = html;
    } catch(e) { console.error(e); }
}

// --- PRODUCT PAGE ---
window.renderProductPage = (id) => {
    const p = productsCache.find(x => x.id === id);
    if(!p) return router('home');

    const images = p.images || [p.imageCode];
    const appDiv = document.getElementById('app');
    
    let colorsHtml = '';
    if(p.colors && p.colors.length) {
        colorsHtml = `<div style="margin:20px 0;">
            <p style="font-weight:bold; margin-bottom:10px;">اختر اللون:</p>
            <div style="display:flex; gap:12px;">
                ${p.colors.map((c, i) => 
                    `<div class="color-circle ${i===0?'selected':''}" style="background:${c}; width:40px; height:40px; border:3px solid ${i===0?'var(--primary)':'#eee'}" onclick="selectColor(this, '${c}')"></div>`
                ).join('')}
            </div>
            <input type="hidden" id="selected-color" value="${p.colors[0]}">
        </div>`;
    }

    appDiv.innerHTML = `
        <div class="page-view">
            <div class="back-header" style="position:absolute; top:20px; left:0; z-index:10; width:100%;">
                <button class="back-btn" onclick="router('home')" style="background:white; box-shadow:0 2px 10px rgba(0,0,0,0.1);"><i class="fas fa-arrow-right"></i></button>
            </div>

            <!-- صورة كاملة -->
            <div style="margin:-20px -20px 20px -20px;">
                <img src="${images[0]}" class="detail-img" id="main-img" style="height:450px; border-radius:0 0 30px 30px;">
            </div>

            ${images.length > 1 ? `<div class="thumbs">
                ${images.map(src => `<img src="${src}" class="thumb" onclick="document.getElementById('main-img').src='${src}'">`).join('')}
            </div>` : ''}

            <div class="detail-content">
                <h1 style="font-size:1.6rem; margin-bottom:5px;">${p.title}</h1>
                <div style="font-size:1.8rem; color:var(--primary); font-family:'Amiri'; font-weight:bold;">${p.price} ج.م</div>
                
                <p style="color:#666; line-height:1.7; margin:20px 0; font-size:1rem;">${p.description || 'لا يوجد وصف'}</p>

                ${colorsHtml}

                <div style="display:flex; align-items:center; justify-content:space-between; margin:30px 0;">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateDetailQty(-1)">-</button>
                        <span id="detail-qty" style="font-weight:bold; width:20px; text-align:center; font-size:1.2rem;">1</span>
                        <button class="qty-btn" onclick="updateDetailQty(1)">+</button>
                    </div>
                </div>

                <button class="btn-large" onclick="addToCart('${p.id}')">
                    أضف للسلة - <span id="btn-total">${p.price}</span> ج.م
                </button>
            </div>
        </div>
    `;
    
    window.currentPrice = p.price;
}

window.updateDetailQty = (change) => {
    const el = document.getElementById('detail-qty');
    const btnTotal = document.getElementById('btn-total');
    let val = parseInt(el.innerText) + change;
    if(val < 1) val = 1;
    el.innerText = val;
    btnTotal.innerText = val * window.currentPrice;
}

window.selectColor = (el, c) => {
    document.querySelectorAll('.color-circle').forEach(x => x.style.border = '3px solid #eee');
    el.style.border = '3px solid var(--primary)';
    document.getElementById('selected-color').value = c;
}

// --- CART ---
window.addToCart = (id) => {
    const p = productsCache.find(x => x.id === id);
    const qty = parseInt(document.getElementById('detail-qty').innerText);
    const colorInput = document.getElementById('selected-color');
    const color = colorInput ? colorInput.value : (p.colors ? p.colors[0] : 'Standard');
    const img = p.images ? p.images[0] : p.imageCode;

    const existingIdx = cart.findIndex(item => item.id === id && item.color === color);
    
    if(existingIdx > -1) cart[existingIdx].qty += qty;
    else cart.push({ ...p, color, img, qty });

    localStorage.setItem('athar_cart', JSON.stringify(cart));
    updateCartBadge();
    
    const t = document.getElementById('toast');
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
}

// --- CART PAGE ---
window.renderCartPage = () => {
    const appDiv = document.getElementById('app');
    
    if(cart.length === 0) {
        appDiv.innerHTML = `
            <div class="page-view" style="text-align:center; padding-top:100px;">
                <div class="back-header"><button class="back-btn" onclick="router('home')"><i class="fas fa-arrow-right"></i></button></div>
                <i class="fas fa-shopping-basket fa-3x" style="color:#eee; margin-bottom:20px;"></i>
                <h3>السلة فارغة</h3>
                <button onclick="router('home')" class="btn-large" style="width:200px; margin:20px auto;">تصفح المنتجات</button>
            </div>`;
        return;
    }

    let total = 0;
    const itemsHtml = cart.map((item, i) => {
        total += (item.price * item.qty);
        return `
            <div class="cart-item">
                <img src="${item.img}" class="cart-thumb">
                <div class="cart-info">
                    <div>
                        <div class="cart-title">${item.title}</div>
                        <!-- لون مع زر تعديل -->
                        <div class="cart-color-row">
                            <span class="cart-color-circle" style="background:${item.color}"></span>
                            <button class="edit-color-btn" onclick="openColorEdit(${i})">تعديل</button>
                        </div>
                        <div class="cart-price">${item.price} ج.م</div>
                    </div>
                    
                    <!-- أزرار التحكم تحت التفاصيل -->
                    <div class="cart-controls">
                        <div class="mini-qty">
                            <button class="mini-qty-btn" onclick="updateCartQty(${i}, -1)">-</button>
                            <span>${item.qty}</span>
                            <button class="mini-qty-btn" onclick="updateCartQty(${i}, 1)">+</button>
                        </div>
                        <button class="mini-delete" onclick="removeFromCart(${i})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const govOptions = governorates.map(g => `<option value="${g}">${g}</option>`).join('');

    appDiv.innerHTML = `
        <div class="page-view cart-page">
            <div class="back-header" style="position:fixed; top:0; left:0; width:100%; background:white; z-index:90; padding:15px 20px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <button class="back-btn" onclick="router('home')"><i class="fas fa-arrow-right"></i></button>
                <h3 style="flex:1; text-align:center;">سلة المشتريات (${cart.length})</h3>
                <div style="width:40px;"></div>
            </div>
            
            <div style="margin-top:10px;">${itemsHtml}</div>
            
            <div style="padding:20px;">
                <div style="background:#f9fafb; padding:20px; border-radius:15px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>المجموع</span><span>${total} ج.م</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>الشحن</span><span>${SHIPPING_COST} ج.م</span></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem; border-top:1px solid #eee; padding-top:10px;">
                        <span>الإجمالي</span>
                        <span style="color:var(--primary)">${total + SHIPPING_COST} ج.م</span>
                    </div>
                </div>

                <form onsubmit="checkout(event, ${total + SHIPPING_COST})">
                    <h3 style="margin-bottom:15px;">بيانات المستلم</h3>
                    <input id="c-name" placeholder="الاسم ثلاثي" required>
                    <input id="c-phone" type="tel" placeholder="رقم واتساب للمتابعة" required>
                    <select id="c-gov" required><option value="">اختر المحافظة</option>${govOptions}</select>
                    <input id="c-city" placeholder="المدينة" required>
                    <input id="c-area" placeholder="الحي / المنطقة" required>
                    <button type="submit" class="btn-large" style="background:var(--gold-gradient); color:black;">
                        <i class="fab fa-whatsapp"></i> إرسال الطلب
                    </button>
                </form>
            </div>
        </div>
    `;
}

// --- COLOR EDITING ---
window.openColorEdit = (idx) => {
    editingItemIndex = idx;
    const item = cart[idx];
    // Find original product to get all available colors
    const originalProd = productsCache.find(p => p.id === item.id) || item; 
    
    if(!originalProd.colors || originalProd.colors.length === 0) {
        alert("لا توجد ألوان أخرى لهذا المنتج");
        return;
    }

    const modal = document.getElementById('color-modal');
    const area = document.getElementById('modal-colors-area');
    
    area.innerHTML = originalProd.colors.map((c) => `
        <div class="color-circle" 
             style="background:${c}; width:40px; height:40px; border:3px solid ${item.color===c ? 'var(--primary)' : '#eee'}"
             onclick="selectEditColor(this, '${c}')"></div>
    `).join('');
    
    // Store temp selection
    area.setAttribute('data-selected', item.color);
    modal.classList.remove('hidden');
}

window.selectEditColor = (el, c) => {
    const area = document.getElementById('modal-colors-area');
    area.querySelectorAll('.color-circle').forEach(x => x.style.border = '3px solid #eee');
    el.style.border = '3px solid var(--primary)';
    area.setAttribute('data-selected', c);
}

window.confirmColorUpdate = () => {
    const area = document.getElementById('modal-colors-area');
    const newColor = area.getAttribute('data-selected');
    
    if(editingItemIndex !== null) {
        cart[editingItemIndex].color = newColor;
        // Merge if duplicate exists now? Ideally yes, but let's keep simple first
        localStorage.setItem('athar_cart', JSON.stringify(cart));
        renderCartPage();
    }
    closeColorModal();
}

window.closeColorModal = () => document.getElementById('color-modal').classList.add('hidden');

// --- CART ACTIONS ---
window.updateCartQty = (idx, change) => {
    cart[idx].qty += change;
    if(cart[idx].qty < 1) cart[idx].qty = 1;
    localStorage.setItem('athar_cart', JSON.stringify(cart));
    renderCartPage();
    updateCartBadge();
}

window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    localStorage.setItem('athar_cart', JSON.stringify(cart));
    renderCartPage();
    updateCartBadge();
}

window.updateCartBadge = () => document.getElementById('cart-badge').innerText = cart.reduce((a, b) => a + b.qty, 0);

window.checkout = (e, total) => {
    e.preventDefault();
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const gov = document.getElementById('c-gov').value;
    const city = document.getElementById('c-city').value;
    const area = document.getElementById('c-area').value;

    let msg = `*طلب جديد - أثر* 🕌\n👤 ${name}\n📱 ${phone}\n📍 ${gov}, ${city}, ${area}\n\n*الطلبات:*\n`;
    cart.forEach(i => msg += `- ${i.title} (${i.color}) x${i.qty}\n`);
    msg += `\n📦 الشحن: ${SHIPPING_COST} ج.م\n💰 *الإجمالي: ${total} ج.م*`;

    window.location.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
    cart = [];
    localStorage.setItem('athar_cart', JSON.stringify([]));
    updateCartBadge();
    router('home');
}

// --- ADMIN ---
window.checkAdmin = () => {
    if(sessionStorage.getItem('athar_admin')) router('admin');
    else {
        if(prompt("رمز المدير:") === "1234") {
            sessionStorage.setItem('athar_admin', 'true');
            router('admin');
        } else alert("خطأ");
    }
}

window.renderAdmin = () => {
    const appDiv = document.getElementById('app');
    const paletteHtml = colorPalette.map(c => `
        <div class="color-circle" style="background:${c}" onclick="addAdminColor('${c}')"></div>
    `).join('');

    appDiv.innerHTML = `
        <div class="admin-view">
            <div class="back-header" style="padding:0; margin-bottom:20px;">
                <button class="back-btn" onclick="router('home')"><i class="fas fa-home"></i></button>
                <h3>لوحة التحكم</h3>
            </div>
            <div class="admin-card">
                <h4 style="margin-bottom:15px;">إضافة منتج</h4>
                <form id="add-form">
                    <input id="a-title" placeholder="اسم المنتج" required>
                    <div style="display:flex; gap:10px;">
                        <input id="a-price" type="number" placeholder="السعر" required>
                        <input id="a-old" type="number" placeholder="سعر قديم">
                    </div>
                    <textarea id="a-desc" placeholder="الوصف" rows="3"></textarea>
                    <label>الصور (اختر 1-3 صور):</label>
                    <input type="file" id="a-imgs" multiple accept="image/*" max="3" style="background:white;">
                    <label>الألوان:</label>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin:10px 0;">${paletteHtml}</div>
                    <div id="selected-colors-area" style="margin-bottom:15px;"></div>
                    <button type="submit" class="btn-large" id="save-btn">حفظ المنتج</button>
                </form>
            </div>
        </div>
    `;

    selectedColorsAdmin = [];
    
    document.getElementById('add-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.innerText = "جاري الرفع...";
        btn.disabled = true;

        try {
            const files = document.getElementById('a-imgs').files;
            if(!files.length) throw new Error("اختر صورة واحدة على الأقل");
            const imgStrings = [];
            for(let i=0; i<files.length; i++) imgStrings.push(await compressImage(files[i]));

            await addDoc(collection(db, "products"), {
                title: document.getElementById('a-title').value,
                price: document.getElementById('a-price').value,
                oldPrice: document.getElementById('a-old').value,
                description: document.getElementById('a-desc').value,
                colors: selectedColorsAdmin,
                images: imgStrings,
                imageCode: imgStrings[0],
                timestamp: Date.now()
            });

            alert("تم الحفظ");
            router('home');
        } catch(err) {
            alert(err.message);
            btn.disabled = false;
        }
    };
}

window.addAdminColor = (c) => {
    if(!selectedColorsAdmin.includes(c)) {
        selectedColorsAdmin.push(c);
        renderAdminColors();
    }
}
window.removeAdminColor = (c) => {
    selectedColorsAdmin = selectedColorsAdmin.filter(x => x !== c);
    renderAdminColors();
}
function renderAdminColors() {
    const area = document.getElementById('selected-colors-area');
    area.innerHTML = selectedColorsAdmin.map(c => 
        `<span style="display:inline-flex; align-items:center; gap:5px; background:#eee; padding:5px 10px; border-radius:15px; margin:2px; font-size:0.8rem; cursor:pointer;" onclick="removeAdminColor('${c}')">
            <span style="width:10px; height:10px; background:${c}; border-radius:50%;"></span> حذف
        </span>`
    ).join('');
}

// Init
updateCartBadge();
router('home');
