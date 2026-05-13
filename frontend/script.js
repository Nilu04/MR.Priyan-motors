// script.js - Updated for Cloudflare deployment
// Change this to your Worker URL after deployment
const API_URL = 'https://mrpriyan-api.your-subdomain.workers.dev';

let token = localStorage.getItem('token');
let currentUser = null;
let bikes = [];
let soldList = [];
let socialLinks = { whatsapp_group: '', facebook_page: '' };

// ============= HELPER FUNCTIONS =============
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 50px; z-index: 10000; animation: fadeInOut 3s ease;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function closeAllModals() {
    const modals = ['loginModal', 'editBikeModal', 'editSoldModal', 'editLogoModal'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ============= API CALLS =============
async function apiCall(endpoint, options = {}) {
    const headers = { ...options.headers };
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            logout();
            return null;
        }
        return response;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Network error. Please try again.', true);
        return null;
    }
}

// ============= LOAD DATA =============
async function loadBikes() {
    const response = await apiCall('/api/bikes');
    if (response && response.ok) {
        bikes = await response.json();
        renderBikes();
    }
}

async function loadSold() {
    const response = await apiCall('/api/sold');
    if (response && response.ok) {
        soldList = await response.json();
        renderSold();
    }
}

async function loadSocialLinks() {
    const response = await apiCall('/api/settings/social');
    if (response && response.ok) {
        socialLinks = await response.json();
        const whatsappBtn = document.getElementById('whatsappGroupBtn');
        const facebookBtn = document.getElementById('facebookPageBtn');
        if (whatsappBtn) whatsappBtn.href = socialLinks.whatsapp_group || 'https://chat.whatsapp.com/yourinvitecode';
        if (facebookBtn) facebookBtn.href = socialLinks.facebook_page || 'https://facebook.com/yourpage';
        const editWhatsapp = document.getElementById('editWhatsapp');
        const editFacebook = document.getElementById('editFacebook');
        if (editWhatsapp) editWhatsapp.value = socialLinks.whatsapp_group || '';
        if (editFacebook) editFacebook.value = socialLinks.facebook_page || '';
    }
}

async function saveSocialLinks() {
    const whatsapp = document.getElementById('editWhatsapp').value;
    const facebook = document.getElementById('editFacebook').value;
    const response = await apiCall('/api/settings/social', {
        method: 'POST',
        body: JSON.stringify({ whatsapp_group: whatsapp, facebook_page: facebook })
    });
    if (response && response.ok) {
        showToast('Social links updated!');
        loadSocialLinks();
        const adminEdit = document.getElementById('adminSocialEdit');
        if (adminEdit) adminEdit.classList.add('hidden');
    } else {
        showToast('Failed to update', true);
    }
}

function renderBikes() {
    const grid = document.getElementById('bikesGrid');
    if (!grid) return;
    if (bikes.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12">No bikes available.</div>';
        return;
    }
    grid.innerHTML = bikes.map(bike => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md bike-card border cursor-pointer" onclick="showBikeDetails('${bike._id}')">
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="bike-img w-full h-48 object-cover" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="p-4">
                <h3 class="text-xl font-black">${escapeHtml(bike.name)}</h3>
                <div class="text-blue-600 font-bold text-xl">${bike.price}</div>
                <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mt-2">
                    <span><i class="far fa-calendar"></i> ${bike.year}</span>
                    <span><i class="fas fa-road"></i> ${bike.km}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${bike.location}</span>
                    <span><i class="fas fa-tag"></i> ${bike.brand}</span>
                </div>
                <div class="mt-3 flex gap-2">
                    <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" target="_blank" class="text-xs text-green-600" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i> Inquire</a>
                    ${token ? `<button onclick="event.stopPropagation(); editBike('${bike._id}')" class="text-xs text-yellow-600">✏️ Edit</button><button onclick="event.stopPropagation(); deleteBike('${bike._id}')" class="text-xs text-red-600">🗑️ Delete</button><button onclick="event.stopPropagation(); markAsSold('${bike._id}')" class="text-xs text-purple-600">🏷️ Mark Sold</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    const addBtn = document.getElementById('addNewBikeBtn');
    if (addBtn) {
        if (token) addBtn.classList.remove('hidden');
        else addBtn.classList.add('hidden');
    }
}

function renderSold() {
    const grid = document.getElementById('soldGrid');
    if (!grid) return;
    if (soldList.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12">No sold records.</div>';
        return;
    }
    grid.innerHTML = soldList.map(s => `
        <div class="bg-white rounded-2xl shadow-md sold-card border-l-8 border-green-500 cursor-pointer p-4" onclick="showSoldDetails('${s._id}')">
            <h3 class="text-xl font-bold">${escapeHtml(s.name)}</h3>
            <p class="font-bold text-green-700 text-lg">${s.sold_price}</p>
            <p class="text-sm text-gray-600"><i class="far fa-calendar-alt"></i> ${s.month_year} · Buyer: ${escapeHtml(s.buyer)}</p>
            ${s.image ? `<div class="mt-2"><img src="${s.image}" class="w-full h-32 object-cover rounded-lg" onclick="event.stopPropagation(); showImagePreview('${s.image}')" onerror="this.style.display='none'"></div>` : ''}
            ${token ? `<div class="flex gap-2 mt-3"><button onclick="event.stopPropagation(); editSold('${s._id}')" class="text-xs text-yellow-600">✏️ Edit</button><button onclick="event.stopPropagation(); deleteSold('${s._id}')" class="text-xs text-red-600">🗑️ Delete</button></div>` : ''}
        </div>
    `).join('');
    
    const addBtn = document.getElementById('addSoldEntryBtn');
    if (addBtn) {
        if (token) addBtn.classList.remove('hidden');
        else addBtn.classList.add('hidden');
    }
}

// ============= BIKE DETAILS =============
async function showBikeDetails(bikeId) {
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    
    const commentsRes = await apiCall(`/api/comments/${bikeId}`);
    const comments = commentsRes && commentsRes.ok ? await commentsRes.json() : [];
    
    const commentsHtml = comments.map(c => `
        <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-start">
                <div><span class="font-semibold text-blue-600">${escapeHtml(c.user)}</span><span class="text-xs text-gray-400 ml-2">${c.date}</span></div>
                ${token ? `<button onclick="deleteComment('${c._id}', '${bikeId}')" class="text-xs text-red-500">Delete</button>` : ''}
            </div>
            <p class="text-gray-700 mt-1">${escapeHtml(c.text)}</p>
        </div>
    `).join('');
    
    const modalHtml = `
        <div class="bg-white rounded-2xl w-full max-w-2xl mx-auto p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-2xl font-black text-blue-600">${escapeHtml(bike.name)}</h2>
                <button onclick="closeModal('bikeDetailsModal')" class="text-gray-500 text-2xl">&times;</button>
            </div>
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="w-full h-64 object-cover rounded-xl mb-4 cursor-pointer" onclick="showImagePreview('${bike.image}')" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">💰 Price</p><p class="text-xl font-bold">${bike.price}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">🏷️ Brand</p><p class="text-lg font-semibold">${escapeHtml(bike.brand)}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📅 Year</p><p class="text-lg font-semibold">${bike.year}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📊 Kilometers</p><p class="text-lg font-semibold">${bike.km}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📍 Location</p><p class="text-lg font-semibold">${escapeHtml(bike.location)}</p></div>
            </div>
            <div class="mt-6 border-t pt-4">
                <h3 class="text-lg font-bold mb-3">💬 Comments</h3>
                <div class="mb-4"><div class="flex gap-2"><input type="text" id="commentInput" placeholder="Write a comment..." class="flex-1 border rounded-lg px-4 py-2"><button onclick="submitComment('${bikeId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Post</button></div></div>
                <div id="commentsList" class="max-h-60 overflow-y-auto">${commentsHtml || '<p class="text-gray-500 text-center py-4">No comments yet.</p>'}</div>
            </div>
            <div class="mt-6 flex gap-3">
                <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" target="_blank" class="flex-1 bg-green-600 text-white text-center py-2 rounded-lg">Inquire on WhatsApp</
