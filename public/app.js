// app.js - Complete with Comments, Feedback, Reply, and Admin Delete
const API_URL = '';
let token = localStorage.getItem('token');
let currentUser = null;
let currentPage = 'home';
let bikes = [];
let soldList = [];

// ============= HELPER FUNCTIONS =============
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 50px; z-index: 10000;';
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
        return null;
    }
}

// ============= COMMENTS API =============
async function loadComments(bikeId) {
    const response = await apiCall(`/api/comments/${bikeId}`);
    if (response && response.ok) {
        return await response.json();
    }
    return [];
}

async function addComment(bikeId, text, userName) {
    const response = await apiCall('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ bikeId, text, user: userName })
    });
    if (response && response.ok) return true;
    return false;
}

async function addReply(commentId, text, userName) {
    const response = await apiCall(`/api/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text, user: userName })
    });
    if (response && response.ok) return true;
    return false;
}

async function deleteComment(commentId) {
    if (!token) {
        showToast('Only admin can delete comments', true);
        return false;
    }
    if (!confirm('Delete this comment?')) return false;
    const response = await apiCall(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (response && response.ok) return true;
    return false;
}

// ============= FEEDBACK API =============
async function loadFeedbacks(soldId) {
    const response = await apiCall(`/api/feedbacks/${soldId}`);
    if (response && response.ok) {
        return await response.json();
    }
    return [];
}

async function addFeedback(soldId, rating, comment, userName) {
    const response = await apiCall('/api/feedbacks', {
        method: 'POST',
        body: JSON.stringify({ soldId, rating, comment, user: userName })
    });
    if (response && response.ok) return true;
    return false;
}

async function addFeedbackReply(feedbackId, text, userName) {
    const response = await apiCall(`/api/feedbacks/${feedbackId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text, user: userName })
    });
    if (response && response.ok) return true;
    return false;
}

async function deleteFeedback(feedbackId) {
    if (!token) {
        showToast('Only admin can delete feedback', true);
        return false;
    }
    if (!confirm('Delete this feedback?')) return false;
    const response = await apiCall(`/api/feedbacks/${feedbackId}`, { method: 'DELETE' });
    if (response && response.ok) return true;
    return false;
}

// ============= BIKE DETAILS WITH COMMENTS =============
window.showBikeDetails = async function(bikeId) {
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    
    const comments = await loadComments(bikeId);
    
    const commentsHtml = comments.map(comment => `
        <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-start">
                <div>
                    <span class="font-semibold text-blue-600">${escapeHtml(comment.user)}</span>
                    <span class="text-xs text-gray-400 ml-2">${comment.date}</span>
                </div>
                <div>
                    <button onclick="window.toggleReplyForm('comment', '${comment._id}')" class="text-xs text-blue-500 hover:text-blue-700 mr-2">Reply</button>
                    ${token ? `<button onclick="window.deleteCommentAndRefresh('${comment._id}', '${bikeId}')" class="text-xs text-red-500 hover:text-red-700"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>
            <p class="text-gray-700 mt-1">${escapeHtml(comment.text)}</p>
            <div id="comment-replies-${comment._id}" class="ml-4 mt-2">
                ${(comment.replies || []).map(reply => `
                    <div class="bg-gray-100 rounded-lg p-2 mb-2">
                        <div><span class="font-semibold text-green-600">${escapeHtml(reply.user)}</span> <span class="text-xs text-gray-400">${reply.date}</span></div>
                        <p class="text-gray-700 text-sm">${escapeHtml(reply.text)}</p>
                    </div>
                `).join('')}
            </div>
            <div id="comment-reply-form-${comment._id}" class="hidden mt-2">
                <div class="flex gap-2">
                    <input type="text" id="comment-reply-input-${comment._id}" placeholder="Write a reply..." class="flex-1 border rounded-lg px-3 py-1 text-sm">
                    <button onclick="window.submitCommentReply('${comment._id}', '${bikeId}')" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">Reply</button>
                </div>
            </div>
        </div>
    `).join('');
    
    const modalHtml = `
        <div class="bg-white rounded-2xl w-full max-w-2xl mx-auto p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-2xl font-black text-blue-600">${escapeHtml(bike.name)}</h2>
                <button onclick="document.getElementById('bikeDetailsModal').classList.add('hidden')" class="text-gray-500 text-2xl">&times;</button>
            </div>
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="w-full h-64 object-cover rounded-xl mb-4" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">💰 Price</p><p class="text-xl font-bold">${bike.price}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">🏷️ Brand</p><p class="text-lg font-semibold">${escapeHtml(bike.brand)}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📅 Year</p><p class="text-lg font-semibold">${bike.year}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📊 Kilometers</p><p class="text-lg font-semibold">${bike.km}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📍 Location</p><p class="text-lg font-semibold">${escapeHtml(bike.location)}</p></div>
            </div>
            
            <div class="mt-6 border-t pt-4">
                <h3 class="text-lg font-bold mb-3">💬 Comments & Questions</h3>
                <div class="mb-4">
                    <div class="flex gap-2">
                        <input type="text" id="comment-input" placeholder="Write a comment..." class="flex-1 border rounded-lg px-4 py-2">
                        <button onclick="window.submitComment('${bikeId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Post</button>
                    </div>
                </div>
                <div id="comments-list" class="max-h-60 overflow-y-auto">
                    ${commentsHtml || '<p class="text-gray-500 text-center py-4">No comments yet.</p>'}
                </div>
            </div>
            
            <div class="mt-6 flex gap-3">
                <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" target="_blank" class="flex-1 bg-green-600 text-white text-center py-2 rounded-lg">Inquire on WhatsApp</a>
                ${token ? `<button onclick="window.editBike('${bike._id}'); document.getElementById('bikeDetailsModal').classList.add('hidden')" class="flex-1 bg-yellow-500 text-white py-2 rounded-lg">Edit Bike</button>` : ''}
                <button onclick="document.getElementById('bikeDetailsModal').classList.add('hidden')" class="flex-1 bg-gray-300 py-2 rounded-lg">Close</button>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('bikeDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bikeDetailsModal';
        modal.className = 'fixed inset-0 z-[400] hidden items-center justify-center modal-overlay p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.classList.remove('hidden');
};

window.submitComment = async function(bikeId) {
    const input = document.getElementById('comment-input');
    const text = input.value;
    if (!text.trim()) return;
    const userName = token && currentUser ? currentUser.username : 'Customer';
    await addComment(bikeId, text, userName);
    input.value = '';
    await window.showBikeDetails(bikeId);
};

window.toggleReplyForm = function(type, id) {
    const form = document.getElementById(`${type}-reply-form-${id}`);
    if (form) form.classList.toggle('hidden');
};

window.submitCommentReply = async function(commentId, bikeId) {
    const input = document.getElementById(`comment-reply-input-${commentId}`);
    const text = input.value;
    if (!text.trim()) return;
    const userName = token && currentUser ? currentUser.username : 'Admin';
    await addReply(commentId, text, userName);
    input.value = '';
    document.getElementById(`comment-reply-form-${commentId}`).classList.add('hidden');
    await window.showBikeDetails(bikeId);
};

window.deleteCommentAndRefresh = async function(commentId, bikeId) {
    const success = await deleteComment(commentId);
    if (success) await window.showBikeDetails(bikeId);
};

// ============= SOLD DETAILS WITH FEEDBACK =============
window.showSoldDetails = async function(soldId) {
    const sold = soldList.find(s => s._id === soldId);
    if (!sold) return;
    
    const feedbacks = await loadFeedbacks(soldId);
    
    const feedbacksHtml = feedbacks.map(fb => `
        <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex text-yellow-500">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</div>
                    <span class="font-semibold text-blue-600">${escapeHtml(fb.user)}</span>
                    <span class="text-xs text-gray-400 ml-2">${fb.date}</span>
                </div>
                <div>
                    <button onclick="window.toggleFeedbackReplyForm('${fb._id}')" class="text-xs text-blue-500 hover:text-blue-700 mr-2">Reply</button>
                    ${token ? `<button onclick="window.deleteFeedbackAndRefresh('${fb._id}', '${soldId}')" class="text-xs text-red-500 hover:text-red-700"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>
            <p class="text-gray-700 mt-1">${escapeHtml(fb.comment)}</p>
            <div id="feedback-replies-${fb._id}" class="ml-4 mt-2">
                ${(fb.replies || []).map(reply => `
                    <div class="bg-gray-100 rounded-lg p-2 mb-2">
                        <div><span class="font-semibold text-green-600">${escapeHtml(reply.user)}</span> <span class="text-xs text-gray-400">${reply.date}</span></div>
                        <p class="text-gray-700 text-sm">${escapeHtml(reply.text)}</p>
                    </div>
                `).join('')}
            </div>
            <div id="feedback-reply-form-${fb._id}" class="hidden mt-2">
                <div class="flex gap-2">
                    <input type="text" id="feedback-reply-input-${fb._id}" placeholder="Write a reply..." class="flex-1 border rounded-lg px-3 py-1 text-sm">
                    <button onclick="window.submitFeedbackReply('${fb._id}', '${soldId}')" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">Reply</button>
                </div>
            </div>
        </div>
    `).join('');
    
    const modalHtml = `
        <div class="bg-white rounded-2xl w-full max-w-2xl mx-auto p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-2xl font-black text-green-600">✅ ${escapeHtml(sold.name)}</h2>
                <button onclick="document.getElementById('soldDetailsModal').classList.add('hidden')" class="text-gray-500 text-2xl">&times;</button>
            </div>
            ${sold.image ? `<img src="${sold.image}" class="w-full h-64 object-cover rounded-xl mb-4" onerror="this.style.display='none'">` : ''}
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">💰 Sold Price</p><p class="text-xl font-bold text-green-600">${sold.sold_price}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">👤 Buyer</p><p class="text-lg font-semibold">${escapeHtml(sold.buyer)}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📅 Sold Date</p><p class="text-lg font-semibold">${sold.month_year}</p></div>
            </div>
            
            <div class="mt-6 border-t pt-4">
                <h3 class="text-lg font-bold mb-3">⭐ Customer Feedback</h3>
                <div class="mb-4">
                    <div class="flex gap-1 mb-2" id="rating-stars">
                        ${[1,2,3,4,5].map(i => `<i class="fas fa-star text-gray-300 text-2xl cursor-pointer" data-rating="${i}" onclick="window.setRating(${i})"></i>`).join('')}
                    </div>
                    <input type="hidden" id="selected-rating" value="0">
                    <textarea id="feedback-comment" placeholder="Share your experience..." class="w-full border rounded-lg px-4 py-2 mb-2" rows="2"></textarea>
                    <button onclick="window.submitFeedback('${soldId}')" class="bg-green-600 text-white px-4 py-2 rounded-lg">Submit Feedback</button>
                </div>
                <div id="feedbacks-list" class="max-h-60 overflow-y-auto">
                    ${feedbacksHtml || '<p class="text-gray-500 text-center py-4">No feedback yet.</p>'}
                </div>
            </div>
            
            <div class="mt-6 flex gap-3">
                ${token ? `<button onclick="window.editSold('${sold._id}'); document.getElementById('soldDetailsModal').classList.add('hidden')" class="flex-1 bg-yellow-500 text-white py-2 rounded-lg">Edit Entry</button>` : ''}
                <button onclick="document.getElementById('soldDetailsModal').classList.add('hidden')" class="flex-1 bg-gray-300 py-2 rounded-lg">Close</button>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('soldDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'soldDetailsModal';
        modal.className = 'fixed inset-0 z-[400] hidden items-center justify-center modal-overlay p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.classList.remove('hidden');
};

let currentRating = 0;
window.setRating = function(rating) {
    currentRating = rating;
    document.getElementById('selected-rating').value = rating;
    for (let i = 1; i <= 5; i++) {
        const star = document.querySelector(`#rating-stars i[data-rating="${i}"]`);
        if (star) {
            if (i <= rating) {
                star.classList.remove('text-gray-300');
                star.classList.add('text-yellow-500');
            } else {
                star.classList.remove('text-yellow-500');
                star.classList.add('text-gray-300');
            }
        }
    }
};

window.submitFeedback = async function(soldId) {
    const rating = parseInt(document.getElementById('selected-rating').value);
    const comment = document.getElementById('feedback-comment').value;
    if (rating === 0) { showToast('Please select a rating!', true); return; }
    if (!comment.trim()) { showToast('Please write your feedback!', true); return; }
    const userName = token && currentUser ? currentUser.username : 'Customer';
    await addFeedback(soldId, rating, comment, userName);
    document.getElementById('selected-rating').value = 0;
    document.getElementById('feedback-comment').value = '';
    currentRating = 0;
    for (let i = 1; i <= 5; i++) {
        const star = document.querySelector(`#rating-stars i[data-rating="${i}"]`);
        if (star) star.classList.remove('text-yellow-500');
    }
    await window.showSoldDetails(soldId);
};

window.toggleFeedbackReplyForm = function(feedbackId) {
    const form = document.getElementById(`feedback-reply-form-${feedbackId}`);
    if (form) form.classList.toggle('hidden');
};

window.submitFeedbackReply = async function(feedbackId, soldId) {
    const input = document.getElementById(`feedback-reply-input-${feedbackId}`);
    const text = input.value;
    if (!text.trim()) return;
    const userName = token && currentUser ? currentUser.username : 'Admin';
    await addFeedbackReply(feedbackId, text, userName);
    input.value = '';
    document.getElementById(`feedback-reply-form-${feedbackId}`).classList.add('hidden');
    await window.showSoldDetails(soldId);
};

window.deleteFeedbackAndRefresh = async function(feedbackId, soldId) {
    const success = await deleteFeedback(feedbackId);
    if (success) await window.showSoldDetails(soldId);
};

// ============= EDIT FUNCTIONS =============
window.editBike = function(id) {
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
    if (bike.image) { preview.src = bike.image; preview.classList.remove('hidden'); }
    else { preview.classList.add('hidden'); }
    document.getElementById('editBikeModal').classList.remove('hidden');
};

window.deleteBike = async function(id) {
    if (!token) { showToast('Login as admin', true); return; }
    if (!confirm('Delete this bike?')) return;
    const response = await apiCall(`/api/bikes/${id}`, { method: 'DELETE' });
    if (response && response.ok) { showToast('Bike deleted'); loadBikes(); closeAllModals(); }
};

window.editSold = function(id) {
    const sold = soldList.find(s => s._id === id);
    if (!sold) return;
    document.getElementById('editSoldId').value = sold._id;
    document.getElementById('soldName').value = sold.name;
    document.getElementById('soldPrice').value = sold.sold_price.replace('Rs.', '').replace(/,/g, '').trim();
    document.getElementById('soldMonthYear').value = sold.month_year;
    document.getElementById('soldBuyer').value = sold.buyer;
    document.getElementById('soldImageUrl').value = sold.image || '';
    const preview = document.getElementById('soldImagePreview');
    if (sold.image) { preview.src = sold.image; preview.classList.remove('hidden'); }
    else { preview.classList.add('hidden'); }
    document.getElementById('editSoldModal').classList.remove('hidden');
};

window.deleteSold = async function(id) {
    if (!token) { showToast('Login as admin', true); return; }
    if (!confirm('Delete this sold entry?')) return;
    const response = await apiCall(`/api/sold/${id}`, { method: 'DELETE' });
    if (response && response.ok) { showToast('Sold entry deleted'); loadSold(); closeAllModals(); }
};

window.markAsSold = async function(bikeId) {
    if (!token) { showToast('Login as admin', true); return; }
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    const buyerName = prompt('Enter buyer name:', '');
    if (!buyerName) return;
    const soldPrice = prompt('Enter sold price (Rs.):', bike.price.replace('Rs.', '').trim());
    if (!soldPrice) return;
    const monthYear = prompt('Enter month/year:', new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
    if (!monthYear) return;
    const soldData = { name: bike.name, sold_price: `Rs. ${parseInt(soldPrice.replace(/[^0-9]/g, '')).toLocaleString()}`, sold_price_num: parseInt(soldPrice.replace(/[^0-9]/g, '')) || 0, month_year: monthYear, buyer: buyerName, image: bike.image };
    const response = await apiCall('/api/sold', { method: 'POST', body: JSON.stringify(soldData) });
    if (response && response.ok) {
        await apiCall(`/api/bikes/${bikeId}`, { method: 'DELETE' });
        showToast('Bike marked as sold!');
        loadBikes(); loadSold(); closeAllModals();
    }
};

window.openAddBikeModal = function() {
    document.getElementById('editBikeId').value = '';
    document.getElementById('bikeName').value = '';
    document.getElementById('bikePrice').value = '';
    document.getElementById('bikeYear').value = '';
    document.getElementById('bikeKm').value = '';
    document.getElementById('bikeLocation').value = '';
    document.getElementById('bikeBrand').value = '';
    document.getElementById('bikeImageUrl').value = '';
    document.getElementById('bikeImageUpload').value = '';
    document.getElementById('bikeImagePreview').classList.add('hidden');
    document.getElementById('editBikeModal').classList.remove('hidden');
};

window.openAddSoldModal = function() {
    document.getElementById('editSoldId').value = '';
    document.getElementById('soldName').value = '';
    document.getElementById('soldPrice').value = '';
    document.getElementById('soldMonthYear').value = '';
    document.getElementById('soldBuyer').value = '';
    document.getElementById('soldImageUrl').value = '';
    document.getElementById('soldImageUpload').value = '';
    document.getElementById('soldImagePreview').classList.add('hidden');
    document.getElementById('editSoldModal').classList.remove('hidden');
};

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
    if (response && response.ok) { showToast(id ? 'Bike updated!' : 'Bike added!'); closeAllModals(); loadBikes(); }
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
    if (response && response.ok) { showToast(id ? 'Sold entry updated!' : 'Sold entry added!'); closeAllModals(); loadSold(); }
});

// ============= PAGE TEMPLATES =============
const templates = {
    home: () => `
        <header class="hero-gradient min-h-[75vh] flex items-center justify-center text-center text-white">
            <div class="container mx-auto px-4 py-8">
                <span class="inline-block bg-blue-600/80 px-4 py-1 rounded-full text-sm font-bold mb-4">#RideTheExtraordinary</span>
                <h1 class="text-4xl md:text-7xl font-black mb-4">Own Your <span class="text-blue-400">Dream Machine</span></h1>
                <p class="text-base md:text-2xl text-gray-200 max-w-3xl mx-auto mb-6">Premium new & used motorcycles | Main Street, Kiran, Batticaloa</p>
                <div class="flex justify-center gap-4"><button onclick="window.navigateTo('bikes')" class="bg-blue-600 px-6 py-3 rounded-xl font-bold">Explore Bikes</button><button onclick="window.navigateTo('exchange')" class="bg-transparent border-2 border-white px-6 py-3 rounded-xl font-bold">Sell Your Bike</button></div>
                <div class="grid grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto"><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">500+</div><div class="text-xs">Bikes Sold</div></div><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">100%</div><div class="text-xs">Trust</div></div><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">24/7</div><div class="text-xs">Support</div></div></div>
            </div>
        </header>
        <section class="py-16 bg-white text-center"><h2 class="text-3xl font-bold mb-8">Why Choose <span class="text-blue-600">Mr. Priyan Motors?</span></h2><div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4"><div><i class="fas fa-shield-alt text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Trusted Dealer</h3><p class="text-gray-600">Since 2021</p></div><div><i class="fas fa-hand-holding-usd text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Best Exchange</h3><p class="text-gray-600">Instant valuation</p></div><div><i class="fas fa-file-signature text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Hassle-free Docs</h3><p class="text-gray-600">Full support</p></div></div></section>
    `,
    bikes: () => `
        <div class="container mx-auto px-4 py-8">
            <div class="flex justify-between items-center mb-6"><div><h1 class="text-3xl md:text-4xl font-black">🔥 Available Motorcycles</h1><p class="text-gray-600">Click on any bike to view details</p></div>${token ? `<button onclick="window.openAddBikeModal()" class="bg-green-600 text-white px-5 py-2 rounded-xl font-bold"><i class="fas fa-plus"></i> Add New Bike</button>` : ''}</div>
            <div class="flex gap-2 mb-6"><button data-filter="all" class="filter-chip active-filter px-4 py-2 rounded-full border bg-white">All Bikes</button><button data-filter="price-desc" class="filter-chip px-4 py-2 rounded-full border bg-white">Price High-Low</button><button data-filter="price-asc" class="filter-chip px-4 py-2 rounded-full border bg-white">Price Low-High</button></div>
            <div id="bikesGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    `,
    sold: () => `
        <div class="container mx-auto px-4 py-8">
            <div class="flex justify-between items-center mb-6"><div><h1 class="text-3xl md:text-4xl font-black">✅ Recently Sold Bikes</h1><p class="text-gray-500">Click on any sold bike to view details and leave feedback</p></div>${token ? `<button onclick="window.openAddSoldModal()" class="bg-green-600 text-white px-5 py-2 rounded-xl font-bold"><i class="fas fa-plus"></i> Add Sold Entry</button>` : ''}</div>
            <div id="soldGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    `,
    exchange: () => `
        <div class="container mx-auto px-4 py-16 max-w-5xl text-center">
            <i class="fas fa-hand-holding-usd text-blue-600 text-5xl mb-4"></i>
            <h1 class="text-3xl md:text-5xl font-black">💰 Sell Your Bike Instantly</h1>
            <p class="text-xl text-gray-700 mt-3">Best Exchange Offers | Free Valuation | Instant Cash</p>
            <p class="text-lg text-gray-600 mt-2">Call or WhatsApp: <strong class="text-blue-600">075 350 3111</strong></p>
            <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="bg-white p-8 rounded-2xl shadow-xl"><i class="fab fa-whatsapp text-green-600 text-5xl"></i><h2 class="text-2xl font-bold mt-4">WhatsApp Valuation</h2><a href="https://wa.me/94753503111" class="inline-block mt-6 bg-green-600 text-white px-8 py-3 rounded-full">Start Chat</a></div>
                <div class="bg-white p-8 rounded-2xl shadow-xl"><i class="fas fa-phone-alt text-blue-600 text-5xl"></i><h2 class="text-2xl font-bold mt-4">Call for Exchange</h2><a href="tel:0753503111" class="inline-block mt-6 bg-black text-white px-8 py-3 rounded-full">Call Now</a></div>
            </div>
        </div>
    `,
    contact: () => `
        <div class="container mx-auto px-4 py-12">
            <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                <div><h1 class="text-3xl md:text-5xl font-black mb-6">Visit Our <span class="text-blue-600">Showroom</span></h1>
                <div class="space-y-6 text-lg"><div><i class="fas fa-map-marker-alt text-blue-600"></i> Main Street, Kiran, Batticaloa, Sri Lanka</div>
                <div><i class="fas fa-phone-alt text-blue-600"></i> 075 350 3111 / WhatsApp</div>
                <div><i class="fas fa-clock text-blue-600"></i> Monday - Sunday: 9:00 AM - 8:00 PM</div></div>
                <div class="mt-8 flex gap-4"><a href="https://wa.me/94753503111" class="bg-green-600 text-white px-6 py-3 rounded-xl">WhatsApp Us</a><a href="tel:0753503111" class="bg-black text-white px-6 py-3 rounded-xl">Call Now</a></div></div>
                <div class="bg-gray-200 rounded-2xl h-80 flex flex-col items-center justify-center"><i class="fas fa-map-marked-alt text-4xl text-gray-500 mb-3"></i><p class="text-gray-600 text-center">📍 Main Street, Kiran, Batticaloa</p></div>
            </div>
        </div>
    `
};

// ============= NAVIGATION =============
window.navigateTo = function(page) {
    currentPage = page;
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        if (link.dataset.page === page) link.classList.add('active-page');
        else link.classList.remove('active-page');
    });
    const pageContent = document.getElementById('pageContent');
    if (pageContent && templates[page]) pageContent.innerHTML = templates[page]();
    if (page === 'bikes') loadBikes();
    if (page === 'sold') loadSold();
    window.scrollTo(0, 0);
    document.getElementById('mobileTabs')?.classList.add('hidden');
};

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

function renderBikes() {
    const grid = document.getElementById('bikesGrid');
    if (!grid) return;
    if (bikes.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-12">No bikes available.</div>'; return; }
    grid.innerHTML = bikes.map(bike => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md bike-card border cursor-pointer" onclick="window.showBikeDetails('${bike._id}')">
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="bike-img w-full" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
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
                    ${token ? `<button onclick="event.stopPropagation(); window.editBike('${bike._id}')" class="text-xs text-yellow-600">✏️ Edit</button><button onclick="event.stopPropagation(); window.deleteBike('${bike._id}')" class="text-xs text-red-600">🗑️ Delete</button><button onclick="event.stopPropagation(); window.markAsSold('${bike._id}')" class="text-xs text-purple-600">🏷️ Mark Sold</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function renderSold() {
    const grid = document.getElementById('soldGrid');
    if (!grid) return;
    if (soldList.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-12">No sold records.</div>'; return; }
    grid.innerHTML = soldList.map(s => `
        <div class="bg-white rounded-2xl shadow-md sold-card border-l-8 border-green-500 cursor-pointer p-4" onclick="window.showSoldDetails('${s._id}')">
            <h3 class="text-xl font-bold">${escapeHtml(s.name)}</h3>
            <p class="font-bold text-green-700 text-lg">${s.sold_price}</p>
            <p class="text-sm text-gray-600"><i class="far fa-calendar-alt"></i> ${s.month_year} · Buyer: ${escapeHtml(s.buyer)}</p>
            ${s.image ? `<div class="mt-2"><img src="${s.image}" class="w-full h-32 object-cover rounded-lg" onclick="event.stopPropagation(); window.showImagePreview('${s.image}')" onerror="this.style.display='none'"></div>` : ''}
            ${token ? `<div class="flex gap-2 mt-3"><button onclick="event.stopPropagation(); window.editSold('${s._id}')" class="text-xs text-yellow-600">✏️ Edit</button><button onclick="event.stopPropagation(); window.deleteSold('${s._id}')" class="text-xs text-red-600">🗑️ Delete</button></div>` : ''}
        </div>
    `).join('');
}

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
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('showLoginOption').classList.add('hidden');
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
        document.getElementById('userStatusText').innerHTML = 'Admin';
        document.getElementById('dropdownUserName').innerHTML = 'Admin (Edit Mode)';
        document.getElementById('dropdownUserRole').innerHTML = '● Edit Mode';
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('showLoginOption').classList.add('hidden');
        closeAllModals();
        showToast('Login successful!');
        if (currentPage === 'bikes') loadBikes();
        if (currentPage === 'sold') loadSold();
        return true;
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        return false;
    }
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    document.getElementById('userStatusText').innerHTML = 'Guest';
    document.getElementById('dropdownUserName').innerHTML = 'Guest User';
    document.getElementById('dropdownUserRole').innerHTML = 'View Only Mode';
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('showLoginOption').classList.remove('hidden');
    showToast('Logged out');
    if (currentPage === 'bikes') loadBikes();
    if (currentPage === 'sold') loadSold();
}

// ============= EVENT LISTENERS =============
document.getElementById('doLoginBtn')?.addEventListener('click', () => {
    login(document.getElementById('loginUsername').value, document.getElementById('loginPassword').value);
});

document.getElementById('showLoginOption')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').classList.remove('hidden');
});

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

document.getElementById('accountBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('accountDropdown').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!document.getElementById('accountDropdown')?.contains(e.target) && e.target !== document.getElementById('accountBtn')) {
        document.getElementById('accountDropdown')?.classList.add('hidden');
    }
});

document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileTabs').classList.toggle('hidden');
});

document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.navigateTo(link.dataset.page);
    });
});

document.getElementById('closeModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeSoldModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeLogoModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeLoginModalBtn')?.addEventListener('click', closeAllModals);

document.getElementById('bikeImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('bikeImagePreview').src = ev.target.result;
            document.getElementById('bikeImagePreview').classList.remove('hidden');
            document.getElementById('bikeImageUrl').value = '';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('soldImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('soldImagePreview').src = ev.target.result;
            document.getElementById('soldImagePreview').classList.remove('hidden');
            document.getElementById('soldImageUrl').value = '';
        };
        reader.readAsDataURL(file);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.dataset?.filter) {
        const filter = e.target.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.remove('active-filter', 'bg-blue-600', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
        });
        e.target.classList.add('active-filter', 'bg-blue-600', 'text-white');
        if (filter === 'all') bikes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (filter === 'price-desc') bikes.sort((a, b) => b.price_num - a.price_num);
        else if (filter === 'price-asc') bikes.sort((a, b) => a.price_num - b.price_num);
        renderBikes();
    }
});

document.getElementById('clickableLogo')?.addEventListener('click', () => {
    if (token) {
        document.getElementById('logoPreview').src = document.getElementById('siteLogo').src;
        document.getElementById('logoUrlInput').value = document.getElementById('siteLogo').src;
        document.getElementById('editLogoModal').classList.remove('hidden');
    } else {
        showToast('Please login as admin', true);
        document.getElementById('loginModal').classList.remove('hidden');
    }
});

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
        closeAllModals();
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

// ============= INITIALIZE =============
async function init() {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        token = savedToken;
        await checkAuth();
    }
    await loadLogo();
    window.navigateTo('home');
}

init();
