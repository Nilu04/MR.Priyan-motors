// script.js - Complete JavaScript for Mr. Priyan Motors
const API_URL = '';
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
        if (el) el.style.display = 'none';
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
    } else {
        showToast('Failed to update', true);
    }
}

function renderBikes() {
    const grid = document.getElementById('bikesGrid');
    if (!grid) return;
    if (bikes.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px;">No bikes available.</div>';
        return;
    }
    grid.innerHTML = bikes.map(bike => `
        <div class="bike-card" onclick="showBikeDetails('${bike._id}')">
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="bike-image" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="bike-info">
                <div class="bike-name">${escapeHtml(bike.name)}</div>
                <div class="bike-price">${bike.price}</div>
                <div class="bike-details">
                    <span><i class="far fa-calendar"></i> ${bike.year}</span>
                    <span><i class="fas fa-road"></i> ${bike.km}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${bike.location}</span>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" target="_blank" class="btn-sm btn-inquire" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i> Inquire</a>
                    ${token ? `<button onclick="event.stopPropagation(); editBike('${bike._id}')" class="btn-sm btn-edit"><i class="fas fa-edit"></i> Edit</button><button onclick="event.stopPropagation(); deleteBike('${bike._id}')" class="btn-sm btn-delete"><i class="fas fa-trash"></i> Delete</button><button onclick="event.stopPropagation(); markAsSold('${bike._id}')" class="btn-sm btn-sold"><i class="fas fa-tag"></i> Sold</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    const addBtn = document.getElementById('addNewBikeBtn');
    if (addBtn) addBtn.style.display = token ? 'block' : 'none';
}

function renderSold() {
    const grid = document.getElementById('soldGrid');
    if (!grid) return;
    if (soldList.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px;">No sold records.</div>';
        return;
    }
    grid.innerHTML = soldList.map(s => `
        <div class="sold-card" onclick="showSoldDetails('${s._id}')">
            <div class="sold-info">
                <div class="bike-name">${escapeHtml(s.name)}</div>
                <div class="bike-price" style="color:#10b981;">${s.sold_price}</div>
                <div class="bike-details">
                    <span><i class="far fa-calendar-alt"></i> ${s.month_year}</span>
                    <span><i class="fas fa-user"></i> ${escapeHtml(s.buyer)}</span>
                </div>
                ${s.image ? `<img src="${s.image}" style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-top:12px;" onclick="event.stopPropagation(); showImagePreview('${s.image}')">` : ''}
                <div class="card-actions">
                    ${token ? `<button onclick="event.stopPropagation(); editSold('${s._id}')" class="btn-sm btn-edit"><i class="fas fa-edit"></i> Edit</button><button onclick="event.stopPropagation(); deleteSold('${s._id}')" class="btn-sm btn-delete"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    const addBtn = document.getElementById('addSoldEntryBtn');
    if (addBtn) addBtn.style.display = token ? 'block' : 'none';
}

// ============= BIKE DETAILS WITH COMMENTS =============
async function showBikeDetails(bikeId) {
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    
    const commentsRes = await apiCall(`/api/comments/${bikeId}`);
    const comments = commentsRes && commentsRes.ok ? await commentsRes.json() : [];
    
    const commentsHtml = comments.map(c => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-user"><i class="fas fa-user-circle"></i> ${escapeHtml(c.user)}</span>
                <span class="comment-date">${c.date}</span>
            </div>
            <p class="comment-text">${escapeHtml(c.text)}</p>
            ${token ? `<button onclick="deleteComment('${c._id}', '${bikeId}')" style="margin-top:8px; background:#fee2e2; border:none; padding:6px 12px; border-radius:20px; font-size:11px; color:#dc2626;">Delete</button>` : ''}
        </div>
    `).join('');
    
    const modalHtml = `
        <div style="background:white; border-radius:24px; max-width:500px; width:100%; max-height:85vh; overflow-y-auto; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="font-size:24px; font-weight:800; color:#2563eb;">${escapeHtml(bike.name)}</h2>
                <button onclick="closeModal('bikeDetailsModal')" style="background:none; border:none; font-size:28px;">&times;</button>
            </div>
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" style="width:100%; height:220px; object-fit:cover; border-radius:16px; margin-bottom:16px;" onclick="showImagePreview('${bike.image}')">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">💰 Price</p><p style="font-weight:700; font-size:18px;">${bike.price}</p></div>
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">🏷️ Brand</p><p style="font-weight:600;">${escapeHtml(bike.brand)}</p></div>
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">📅 Year</p><p style="font-weight:600;">${bike.year}</p></div>
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">📊 KM</p><p style="font-weight:600;">${bike.km}</p></div>
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">📍 Location</p><p style="font-weight:600;">${escapeHtml(bike.location)}</p></div>
            </div>
            <div style="border-top:1px solid #e2e8f0; padding-top:16px;">
                <h3 style="font-weight:700; margin-bottom:12px;">💬 Comments</h3>
                <div style="display:flex; gap:8px; margin-bottom:16px;">
                    <input type="text" id="commentInput" placeholder="Write a comment..." style="flex:1; padding:12px; border:1px solid #e2e8f0; border-radius:40px;">
                    <button onclick="submitComment('${bikeId}')" style="background:#2563eb; color:white; border:none; padding:0 20px; border-radius:40px;">Post</button>
                </div>
                <div id="commentsList" style="max-height:200px; overflow-y:auto;">${commentsHtml || '<p style="text-align:center; color:#94a3b8;">No comments yet.</p>'}</div>
            </div>
            <div style="display:flex; gap:12px; margin-top:20px;">
                <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" target="_blank" class="btn-inquire" style="flex:1; background:#25D366; color:white; text-align:center; padding:14px; border-radius:40px; text-decoration:none; font-weight:600;"><i class="fab fa-whatsapp"></i> Inquire</a>
                ${token ? `<button onclick="editBike('${bike._id}'); closeModal('bikeDetailsModal')" style="flex:1; background:#eab308; color:white; border:none; border-radius:40px; font-weight:600;">Edit</button>` : ''}
                <button onclick="closeModal('bikeDetailsModal')" style="flex:1; background:#e2e8f0; border:none; border-radius:40px; font-weight:600;">Close</button>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('bikeDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bikeDetailsModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.style.display = 'flex';
}

async function submitComment(bikeId) {
    const input = document.getElementById('commentInput');
    const text = input.value;
    if (!text.trim()) return;
    const userName = token && currentUser ? currentUser.username : 'Customer';
    await apiCall('/api/comments', { method: 'POST', body: JSON.stringify({ bikeId, text, user: userName }) });
    input.value = '';
    showBikeDetails(bikeId);
}

async function deleteComment(commentId, bikeId) {
    if (!confirm('Delete this comment?')) return;
    await apiCall(`/api/comments/${commentId}`, { method: 'DELETE' });
    showBikeDetails(bikeId);
}

// ============= SOLD DETAILS WITH FEEDBACK =============
async function showSoldDetails(soldId) {
    const sold = soldList.find(s => s._id === soldId);
    if (!sold) return;
    
    const feedbacksRes = await apiCall(`/api/feedbacks/${soldId}`);
    const feedbacks = feedbacksRes && feedbacksRes.ok ? await feedbacksRes.json() : [];
    
    const feedbacksHtml = feedbacks.map(f => `
        <div class="comment">
            <div class="comment-header">
                <div><span class="comment-user">${escapeHtml(f.user)}</span> <span class="comment-date">${f.date}</span></div>
                ${token ? `<button onclick="deleteFeedback('${f._id}', '${soldId}')" style="background:#fee2e2; border:none; padding:4px 10px; border-radius:20px; font-size:11px;">Delete</button>` : ''}
            </div>
            <div style="color:#eab308; margin-bottom:6px;">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
            <p class="comment-text">${escapeHtml(f.comment)}</p>
        </div>
    `).join('');
    
    const modalHtml = `
        <div style="background:white; border-radius:24px; max-width:500px; width:100%; max-height:85vh; overflow-y:auto; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="font-size:24px; font-weight:800; color:#10b981;">✅ ${escapeHtml(sold.name)}</h2>
                <button onclick="closeModal('soldDetailsModal')" style="background:none; border:none; font-size:28px;">&times;</button>
            </div>
            ${sold.image ? `<img src="${sold.image}" style="width:100%; height:200px; object-fit:cover; border-radius:16px; margin-bottom:16px;" onclick="showImagePreview('${sold.image}')">` : ''}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">💰 Sold Price</p><p style="font-weight:700;">${sold.sold_price}</p></div>
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">👤 Buyer</p><p style="font-weight:600;">${escapeHtml(sold.buyer)}</p></div>
                <div style="background:#f8fafc; padding:12px; border-radius:12px;"><p style="font-size:12px; color:#64748b;">📅 Sold Date</p><p style="font-weight:600;">${sold.month_year}</p></div>
            </div>
            <div style="border-top:1px solid #e2e8f0; padding-top:16px;">
                <h3 style="font-weight:700; margin-bottom:12px;">⭐ Customer Feedback</h3>
                <div style="margin-bottom:16px;">
                    <div style="display:flex; gap:5px; margin-bottom:10px;" id="ratingStars">
                        ${[1,2,3,4,5].map(i => `<i class="fas fa-star" style="font-size:28px; color:#cbd5e1; cursor:pointer;" data-rating="${i}" onclick="setRating(${i})"></i>`).join('')}
                    </div>
                    <input type="hidden" id="selectedRating" value="0">
                    <textarea id="feedbackText" placeholder="Share your experience..." style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:16px; margin-bottom:10px;" rows="2"></textarea>
                    <button onclick="submitFeedback('${soldId}')" style="background:#10b981; color:white; border:none; padding:12px 20px; border-radius:40px; font-weight:600;">Submit Feedback</button>
                </div>
                <div id="feedbacksList">${feedbacksHtml || '<p style="text-align:center; color:#94a3b8;">No feedback yet.</p>'}</div>
            </div>
            <div style="display:flex; gap:12px; margin-top:20px;">
                ${token ? `<button onclick="editSold('${sold._id}'); closeModal('soldDetailsModal')" style="flex:1; background:#eab308; color:white; border:none; border-radius:40px; padding:14px; font-weight:600;">Edit</button>` : ''}
                <button onclick="closeModal('soldDetailsModal')" style="flex:1; background:#e2e8f0; border:none; border-radius:40px; padding:14px; font-weight:600;">Close</button>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('soldDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'soldDetailsModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.style.display = 'flex';
}

let currentRating = 0;
function setRating(rating) {
    currentRating = rating;
    document.getElementById('selectedRating').value = rating;
    for (let i = 1; i <= 5; i++) {
        const star = document.querySelector(`#ratingStars i[data-rating="${i}"]`);
        if (star) {
            if (i <= rating) {
                star.style.color = '#eab308';
            } else {
                star.style.color = '#cbd5e1';
            }
        }
    }
}

async function submitFeedback(soldId) {
    const rating = parseInt(document.getElementById('selectedRating').value);
    const comment = document.getElementById('feedbackText').value;
    if (rating === 0) { showToast('Please select a rating!', true); return; }
    if (!comment.trim()) { showToast('Please write feedback!', true); return; }
    const userName = token && currentUser ? currentUser.username : 'Customer';
    await apiCall('/api/feedbacks', { method: 'POST', body: JSON.stringify({ soldId, rating, comment, user: userName }) });
    document.getElementById('selectedRating').value = 0;
    document.getElementById('feedbackText').value = '';
    currentRating = 0;
    for (let i = 1; i <= 5; i++) {
        const star = document.querySelector(`#ratingStars i[data-rating="${i}"]`);
        if (star) star.style.color = '#cbd5e1';
    }
    showSoldDetails(soldId);
    showToast('Thank you for your feedback!');
}

async function deleteFeedback(feedbackId, soldId) {
    if (!confirm('Delete this feedback?')) return;
    await apiCall(`/api/feedbacks/${feedbackId}`, { method: 'DELETE' });
    showSoldDetails(soldId);
}

// ============= CRUD OPERATIONS =============
function editBike(id) {
    const bike = bikes.find(b => b._id === id);
    if (!bike) return;
    document.getElementById('editBikeId').value = bike._id;
    document.getElementById('bikeName').value = bike.name;
    document.getElementById('bikePrice').value = bike.price.replace('Rs.', '').replace(/,/g, '').trim();
    document.getElementById('bikeYear').value = bike.year;
    document.getElementById('bikeKm').value = bike.km;
    document.getElementById('bikeLocation').value = bike.location;
    document.getElementById('bikeBrand').value = bike.brand;
    document.getElementById('bikeImageUrl').value = bike.image || '';
    const preview = document.getElementById('bikeImagePreview');
    if (bike.image) { preview.src = bike.image; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
    document.getElementById('editBikeModal').style.display = 'flex';
}

async function deleteBike(id) {
    if (!confirm('Delete this bike?')) return;
    await apiCall(`/api/bikes/${id}`, { method: 'DELETE' });
    showToast('Bike deleted');
    loadBikes();
    closeModal('editBikeModal');
}

function editSold(id) {
    const sold = soldList.find(s => s._id === id);
    if (!sold) return;
    document.getElementById('editSoldId').value = sold._id;
    document.getElementById('soldName').value = sold.name;
    document.getElementById('soldPrice').value = sold.sold_price.replace('Rs.', '').replace(/,/g, '').trim();
    document.getElementById('soldMonthYear').value = sold.month_year;
    document.getElementById('soldBuyer').value = sold.buyer;
    document.getElementById('soldImageUrl').value = sold.image || '';
    const preview = document.getElementById('soldImagePreview');
    if (sold.image) { preview.src = sold.image; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
    document.getElementById('editSoldModal').style.display = 'flex';
}

async function deleteSold(id) {
    if (!confirm('Delete this sold entry?')) return;
    await apiCall(`/api/sold/${id}`, { method: 'DELETE' });
    showToast('Sold entry deleted');
    loadSold();
    closeModal('editSoldModal');
}

async function markAsSold(bikeId) {
    if (!token) { showToast('Please login as admin', true); return; }
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    const buyerName = prompt('Enter buyer name:', '');
    if (!buyerName) return;
    const soldPrice = prompt('Enter sold price (Rs.):', bike.price.replace('Rs.', '').trim());
    if (!soldPrice) return;
    const monthYear = prompt('Enter month/year:', new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
    if (!monthYear) return;
    const soldData = { name: bike.name, sold_price: `Rs. ${parseInt(soldPrice.replace(/[^0-9]/g, '')).toLocaleString()}`, sold_price_num: parseInt(soldPrice.replace(/[^0-9]/g, '')) || 0, month_year: monthYear, buyer: buyerName, image: bike.image };
    await apiCall('/api/sold', { method: 'POST', body: JSON.stringify(soldData) });
    await apiCall(`/api/bikes/${bikeId}`, { method: 'DELETE' });
    showToast('Bike marked as sold!');
    loadBikes();
    loadSold();
}

function openAddBikeModal() {
    document.getElementById('editBikeId').value = '';
    document.getElementById('bikeName').value = '';
    document.getElementById('bikePrice').value = '';
    document.getElementById('bikeYear').value = '';
    document.getElementById('bikeKm').value = '';
    document.getElementById('bikeLocation').value = '';
    document.getElementById('bikeBrand').value = '';
    document.getElementById('bikeImageUrl').value = '';
    document.getElementById('bikeImageUpload').value = '';
    document.getElementById('bikeImagePreview').style.display = 'none';
    document.getElementById('editBikeModal').style.display = 'flex';
}

function openAddSoldModal() {
    document.getElementById('editSoldId').value = '';
    document.getElementById('soldName').value = '';
    document.getElementById('soldPrice').value = '';
    document.getElementById('soldMonthYear').value = '';
    document.getElementById('soldBuyer').value = '';
    document.getElementById('soldImageUrl').value = '';
    document.getElementById('soldImageUpload').value = '';
    document.getElementById('soldImagePreview').style.display = 'none';
    document.getElementById('editSoldModal').style.display = 'flex';
}

// ============= SAVE HANDLERS =============
document.getElementById('saveBikeBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editBikeId').value;
    const name = document.getElementById('bikeName').value;
    const priceRaw = document.getElementById('bikePrice').value;
    const year = document.getElementById('bikeYear').value;
    const km = document.getElementById('bikeKm').value;
    const location = document.getElementById('bikeLocation').value;
    const brand = document.getElementById('bikeBrand').value;
    const imageUrl = document.getElementById('bikeImageUrl').value;
    const imageFile = document.getElementById('bikeImageUpload').files[0];
    if (!name || !year || !km || !location || !brand) { showToast('Fill all fields!', true); return; }
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const price = `Rs. ${priceNum.toLocaleString()}`;
    const formData = new FormData();
    formData.append('name', name); formData.append('price', price); formData.append('price_num', priceNum);
    formData.append('year', year); formData.append('km', km); formData.append('location', location); formData.append('brand', brand);
    if (imageUrl) formData.append('image_url', imageUrl);
    if (imageFile) formData.append('image', imageFile);
    const url = id ? `/api/bikes/${id}` : '/api/bikes';
    const method = id ? 'PUT' : 'POST';
    const response = await apiCall(url, { method, body: formData });
    if (response && response.ok) { showToast(id ? 'Bike updated!' : 'Bike added!'); closeModal('editBikeModal'); loadBikes(); }
});

document.getElementById('saveSoldBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editSoldId').value;
    const name = document.getElementById('soldName').value;
    const priceRaw = document.getElementById('soldPrice').value;
    const monthYear = document.getElementById('soldMonthYear').value;
    const buyer = document.getElementById('soldBuyer').value;
    const imageUrl = document.getElementById('soldImageUrl').value;
    const imageFile = document.getElementById('soldImageUpload').files[0];
    if (!name || !monthYear || !buyer) { showToast('Fill all fields!', true); return; }
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const soldPrice = `Rs. ${priceNum.toLocaleString()}`;
    const formData = new FormData();
    formData.append('name', name); formData.append('sold_price', soldPrice); formData.append('sold_price_num', priceNum);
    formData.append('month_year', monthYear); formData.append('buyer', buyer);
    if (imageUrl) formData.append('image_url', imageUrl);
    if (imageFile) formData.append('image', imageFile);
    const url = id ? `/api/sold/${id}` : '/api/sold';
    const method = id ? 'PUT' : 'POST';
    const response = await apiCall(url, { method, body: formData });
    if (response && response.ok) { showToast(id ? 'Sold updated!' : 'Sold added!'); closeModal('editSoldModal'); loadSold(); }
});

// ============= IMAGE PREVIEW =============
function showImagePreview(imageUrl) {
    let modal = document.getElementById('imagePreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imagePreviewModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.innerHTML = `<div style="background:white; border-radius:24px; max-width:90%; max-height:90%; overflow:auto; padding:20px;"><div style="text-align:right;"><button onclick="closeModal('imagePreviewModal')" style="background:none; border:none; font-size:28px;">&times;</button></div><img id="previewImage" src="" style="width:100%; height:auto; border-radius:16px;"></div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('previewImage').src = imageUrl;
    modal.style.display = 'flex';
}

// ============= FILTER HANDLERS =============
document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.dataset.filter;
        if (filter === 'all') bikes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (filter === 'price-desc') bikes.sort((a, b) => b.price_num - a.price_num);
        else if (filter === 'price-asc') bikes.sort((a, b) => a.price_num - b.price_num);
        renderBikes();
    });
});

// ============= AUTHENTICATION =============
async function checkAuth() {
    if (!token) return false;
    const response = await apiCall('/api/verify-token');
    if (response && response.ok) {
        const userResponse = await apiCall('/api/me');
        if (userResponse && userResponse.ok) currentUser = await userResponse.json();
        document.getElementById('userStatusText').innerHTML = 'Admin';
        document.getElementById('dropdownUserName').innerHTML = 'Admin (Edit Mode)';
        document.getElementById('dropdownUserRole').innerHTML = '● Edit Mode';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('showLoginOption').style.display = 'none';
        const adminEdit = document.getElementById('adminSocialEdit');
        if (adminEdit) adminEdit.style.display = 'block';
        return true;
    }
    return false;
}

async function login(username, password) {
    const response = await apiCall('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (response && response.ok) {
        const data = await response.json();
        token = data.token;
        localStorage.setItem('token', token);
        await checkAuth();
        closeModal('loginModal');
        showToast('Login successful!');
        loadBikes();
        loadSold();
        loadSocialLinks();
        return true;
    } else {
        document.getElementById('loginError').style.display = 'block';
        return false;
    }
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    document.getElementById('userStatusText').innerHTML = 'Guest';
    document.getElementById('dropdownUserName').innerHTML = 'Guest User';
    document.getElementById('dropdownUserRole').innerHTML = 'View Only Mode';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('showLoginOption').style.display = 'block';
    const adminEdit = document.getElementById('adminSocialEdit');
    if (adminEdit) adminEdit.style.display = 'none';
    showToast('Logged out');
    loadBikes();
    loadSold();
}

// ============= EVENT LISTENERS =============
document.getElementById('doLoginBtn')?.addEventListener('click', () => {
    login(document.getElementById('loginUsername').value, document.getElementById('loginPassword').value);
});
document.getElementById('showLoginOption')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').style.display = 'flex';
});
document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
document.getElementById('addNewBikeBtn')?.addEventListener('click', openAddBikeModal);
document.getElementById('addSoldEntryBtn')?.addEventListener('click', openAddSoldModal);
document.getElementById('saveSocialLinksBtn')?.addEventListener('click', saveSocialLinks);

// Image upload preview
document.getElementById('bikeImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { document.getElementById('bikeImagePreview').src = ev.target.result; document.getElementById('bikeImagePreview').style.display = 'block'; document.getElementById('bikeImageUrl').value = ''; };
        reader.readAsDataURL(file);
    }
});
document.getElementById('soldImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { document.getElementById('soldImagePreview').src = ev.target.result; document.getElementById('soldImagePreview').style.display = 'block'; document.getElementById('soldImageUrl').value = ''; };
        reader.readAsDataURL(file);
    }
});

// Logo handlers
document.getElementById('saveLogoBtn')?.addEventListener('click', async () => {
    const logoUrl = document.getElementById('logoUrlInput').value;
    const logoFile = document.getElementById('logoUploadInput').files[0];
    const formData = new FormData();
    if (logoUrl) formData.append('logoUrl', logoUrl);
    if (logoFile) formData.append('logo', logoFile);
    const response = await apiCall('/api/settings/logo', { method: 'POST', body: formData });
    if (response && response.ok) {
        const data = await response.json();
        document.getElementById('siteLogo').src = data.logoUrl;
        showToast('Logo updated!');
        closeModal('editLogoModal');
    }
});
document.getElementById('logoUploadInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('logoPreview').src = ev.target.result;
            document.getElementById('logoUrlInput').value = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

async function loadLogo() {
    const response = await apiCall('/api/settings/logo');
    if (response && response.ok) {
        const data = await response.json();
        if (data.logoUrl) document.getElementById('siteLogo').src = data.logoUrl;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Make functions global
window.editBike = editBike;
window.deleteBike = deleteBike;
window.editSold = editSold;
window.deleteSold = deleteSold;
window.markAsSold = markAsSold;
window.showBikeDetails = showBikeDetails;
window.showSoldDetails = showSoldDetails;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
window.setRating = setRating;
window.submitFeedback = submitFeedback;
window.deleteFeedback = deleteFeedback;
window.showImagePreview = showImagePreview;
window.closeModal = closeModal;

// ============= INITIALIZE =============
async function init() {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        token = savedToken;
        await checkAuth();
    }
    await loadLogo();
    await loadSocialLinks();
    if (window.location.pathname.includes('bikes.html')) loadBikes();
    if (window.location.pathname.includes('sold.html')) loadSold();
}
init();

// Make sure your server.js has this at the end
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});