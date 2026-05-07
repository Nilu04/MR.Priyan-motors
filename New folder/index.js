// index.js
AOS.init({ once: true, disable: 'mobile' });

// ================= CONFIG =================
const ADMIN_USER = { username: "admin", password: "admin123" };
let isLoggedIn = false;
let currentUser = "Guest";

let bikes = [
    { id: 1, name: "Hero", price: "Rs. 290,000", year: "2020", km: "26,200 km", location: "Batticaloa,Kiran", brand: "Honda", priceNum: 290000, image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
    { id: 2, name: "Apache 180", price: "Rs. 350,000", year: "2014", km: "34,300 km", location: "Batticaloa,Kiran", brand: "TVS", priceNum: 350000, image: "https://i.ibb.co/yF2W5xJp/b2.jpg" },
    { id: 3, name: "YAMAHA RAY ZR", price: "Rs. 490,000", year: "2018", km: "32,800 km", location: "Batticaloa,Kiran", brand: "YAMAHA", priceNum: 490000, image: "https://i.ibb.co/1tbJmkkr/b3.jpg" },
    { id: 4, name: "BAJAJ NS 200", price: "Rs. 850,000", year: "2015", km: "52,100 km", location: "Batticaloa,Kiran", brand: "BAJAJ", priceNum: 850000, image: "https://i.ibb.co/Kjd5WbgJ/b4.jpg" },
    { id: 5, name: "APACHE 180", price: "Rs. 250,000", year: "2016", km: "42,900 km", location: "Batticaloa,Kiran", brand: "TVS", priceNum: 250000, image: "https://i.ibb.co/gbchh2mW/b5.jpg" }
];
let soldList = [
    { id: 101, name: "Honda CB Shine", soldPrice: "Rs. 375,000", monthYear: "Feb 2025", buyer: "Mr. Ramesh" },
    { id: 102, name: "Yamaha FZ V3", soldPrice: "Rs. 485,000", monthYear: "Mar 2025", buyer: "Mrs. Santhiya" },
    { id: 103, name: "Royal Enfield Meteor", soldPrice: "Rs. 1,680,000", monthYear: "Feb 2025", buyer: "Mr. Sivakumar" }
];
let nextBikeId = 6, nextSoldId = 104;

// ================= HELPERS =================
function formatPrice(num) { return "Rs. " + num.toLocaleString('en-US'); }
function closeAllModals() {
    ['editBikeModal','editSoldModal','editLogoModal','loginModal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.classList.add('hidden'); el.style.display = 'none'; }
    });
}

// ================= RENDER FUNCTIONS =================
function renderBikes() {
    const grid = document.getElementById('bikesGrid');
    if(!grid) return;
    if(bikes.length===0) { grid.innerHTML='<div class="col-span-full text-center py-12">No bikes available. Admin can add new.</div>'; return; }
    grid.innerHTML = bikes.map(bike => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md bike-card border">
            <img src="${bike.image}" alt="${bike.name}" class="bike-img" loading="lazy" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="p-4">
                <h3 class="text-xl md:text-2xl font-black">${bike.name}</h3>
                <div class="text-blue-600 font-extrabold text-xl md:text-2xl">${bike.price}</div>
                <div class="grid grid-cols-2 gap-1 text-xs md:text-sm text-gray-500 mt-2"><span><i class="far fa-calendar"></i> ${bike.year}</span><span><i class="fas fa-road"></i> ${bike.km}</span><span><i class="fas fa-map-marker-alt"></i> ${bike.location}</span><span><i class="fas fa-tag"></i> ${bike.brand}</span></div>
                ${isLoggedIn ? 
                    `<div class="flex gap-3 mt-4"><button onclick="editBike(${bike.id})" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteBike(${bike.id})" class="delete-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs"><i class="fas fa-trash"></i> Delete</button></div>` : 
                    `<a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}%20(${bike.price})" class="mt-4 block bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 rounded-xl font-bold text-sm transition"><i class="fab fa-whatsapp mr-1"></i> Inquire Now</a>`
                }
            </div>
        </div>
    `).join('');
    if(document.getElementById('addNewBikeBtn')) isLoggedIn ? document.getElementById('addNewBikeBtn').classList.remove('hidden') : document.getElementById('addNewBikeBtn').classList.add('hidden');
}

function renderSold() {
    const soldGrid = document.getElementById('soldGrid');
    if(!soldGrid) return;
    soldGrid.innerHTML = soldList.map(s => `
        <div class="bg-white rounded-2xl shadow-md sold-card p-4 border-l-8 border-green-500">
            <h3 class="text-xl font-bold">${s.name}</h3>
            <p class="font-bold text-green-700 text-lg">${s.soldPrice}</p>
            <p class="text-xs text-gray-600 mt-1"><i class="far fa-calendar-alt"></i> ${s.monthYear} · Buyer: ${s.buyer}</p>
            ${isLoggedIn ? `<div class="flex gap-3 mt-4"><button onclick="editSold(${s.id})" class="edit-btn bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteSold(${s.id})" class="delete-btn bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs"><i class="fas fa-trash"></i> Delete</button></div>` : `<div class="mt-3 text-gray-500 text-xs flex items-center gap-2"><i class="fas fa-check-circle text-green-500"></i> Sold by Mr. Priyan Motors</div>`}
        </div>
    `).join('');
    const addSoldBtn = document.getElementById('addSoldBikeBtn');
    if(addSoldBtn) isLoggedIn ? addSoldBtn.classList.remove('hidden') : addSoldBtn.classList.add('hidden');
}

// ================= CRUD OPERATIONS =================
window.editBike = (id) => { 
    if(!isLoggedIn) { alert("Admin login required."); return; } 
    const bike = bikes.find(b => b.id === id); 
    if(bike) { 
        document.getElementById('modalTitle').innerText = "✏️ Edit Bike"; 
        document.getElementById('editBikeId').value = bike.id; 
        document.getElementById('bikeName').value = bike.name; 
        document.getElementById('bikePrice').value = bike.price.replace("Rs. ", "").replace(/,/g, ''); 
        document.getElementById('bikeYear').value = bike.year; 
        document.getElementById('bikeKm').value = bike.km; 
        document.getElementById('bikeLocation').value = bike.location; 
        document.getElementById('bikeBrand').value = bike.brand; 
        document.getElementById('bikeImageUrl').value = bike.image; 
        const preview = document.getElementById('bikeImagePreview'); 
        if(bike.image) { preview.src = bike.image; preview.classList.remove('hidden'); } 
        else preview.classList.add('hidden'); 
        document.getElementById('editBikeModal').classList.remove('hidden'); 
        document.getElementById('editBikeModal').style.display = 'flex'; 
    } 
};

window.deleteBike = (id) => { 
    if(!isLoggedIn) { alert("Admin access required."); return; } 
    if(confirm("Delete bike?")) { bikes = bikes.filter(b => b.id !== id); renderBikes(); } 
};

window.editSold = (id) => { 
    if(!isLoggedIn) { alert("Admin login required."); return; } 
    const sold = soldList.find(s=>s.id===id); 
    if(sold){ 
        document.getElementById('editSoldId').value=sold.id; 
        document.getElementById('soldName').value=sold.name; 
        document.getElementById('soldPrice').value=sold.soldPrice.replace("Rs. ","").replace(/,/g,''); 
        document.getElementById('soldMonthYear').value=sold.monthYear; 
        document.getElementById('soldBuyer').value=sold.buyer; 
        document.getElementById('editSoldModal').classList.remove('hidden'); 
        document.getElementById('editSoldModal').style.display='flex'; 
    } 
};

window.deleteSold = (id) => { 
    if(!isLoggedIn) { alert("Admin access required."); return; } 
    if(confirm("Remove sold record?")) { soldList = soldList.filter(s=>s.id !== id); renderSold(); } 
};

// ================= EVENT LISTENERS =================
document.getElementById('saveBikeBtn')?.addEventListener('click', ()=>{ 
    if(!isLoggedIn) return; 
    const id = document.getElementById('editBikeId').value; 
    const name = document.getElementById('bikeName').value; 
    let priceRaw = document.getElementById('bikePrice').value; 
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g,'')) || 0; 
    const price = formatPrice(priceNum); 
    const year = document.getElementById('bikeYear').value; 
    const km = document.getElementById('bikeKm').value; 
    const location = document.getElementById('bikeLocation').value; 
    const brand = document.getElementById('bikeBrand').value; 
    let image = document.getElementById('bikeImageUrl').value; 
    if(!image) image = "https://placehold.co/600x400/1E3A8A/white?text=Motorcycle"; 
    if(id) { 
        const index = bikes.findIndex(b=>b.id == id); 
        if(index!==-1) bikes[index] = {...bikes[index], name, price, year, km, location, brand, image, priceNum}; 
    } else { 
        bikes.push({ id: nextBikeId++, name, price, year, km, location, brand, image, priceNum }); 
    } 
    renderBikes(); 
    closeAllModals(); 
});

document.getElementById('addNewBikeBtn')?.addEventListener('click', ()=>{ 
    if(!isLoggedIn){ alert("Admin login required."); return; } 
    document.getElementById('modalTitle').innerText = "➕ Add New Bike"; 
    document.getElementById('editBikeId').value = ''; 
    document.getElementById('bikeName').value=''; 
    document.getElementById('bikePrice').value=''; 
    document.getElementById('bikeYear').value=''; 
    document.getElementById('bikeKm').value=''; 
    document.getElementById('bikeLocation').value=''; 
    document.getElementById('bikeBrand').value=''; 
    document.getElementById('bikeImageUrl').value=''; 
    document.getElementById('bikeImagePreview').classList.add('hidden'); 
    document.getElementById('editBikeModal').classList.remove('hidden'); 
    document.getElementById('editBikeModal').style.display='flex'; 
});

document.getElementById('addSoldBikeBtn')?.addEventListener('click', ()=>{ 
    if(!isLoggedIn){ alert("Admin login required."); return; } 
    document.getElementById('soldModalTitle').innerText = "➕ Add Sold Bike"; 
    document.getElementById('editSoldId').value=''; 
    document.getElementById('soldName').value=''; 
    document.getElementById('soldPrice').value=''; 
    document.getElementById('soldMonthYear').value=''; 
    document.getElementById('soldBuyer').value=''; 
    document.getElementById('editSoldModal').classList.remove('hidden'); 
    document.getElementById('editSoldModal').style.display='flex'; 
});

document.getElementById('saveSoldBtn')?.addEventListener('click', ()=>{ 
    if(!isLoggedIn) return; 
    const id = document.getElementById('editSoldId').value; 
    const name = document.getElementById('soldName').value; 
    let priceVal = document.getElementById('soldPrice').value; 
    const soldPrice = "Rs. "+priceVal.replace(/[^0-9]/g,''); 
    const monthYear = document.getElementById('soldMonthYear').value; 
    const buyer = document.getElementById('soldBuyer').value; 
    if(id){ 
        const index = soldList.findIndex(s=>s.id==id); 
        if(index!==-1) soldList[index]={...soldList[index], name, soldPrice, monthYear, buyer}; 
    } else { 
        soldList.push({ id: nextSoldId++, name, soldPrice, monthYear, buyer }); 
    } 
    renderSold(); 
    closeAllModals(); 
});

// Logo management
function updateLogo(url) { 
    document.getElementById('siteLogo').src = url; 
    localStorage.setItem('websiteLogo', url); 
}

document.getElementById('editLogoMenuItem')?.addEventListener('click', (e) => { 
    e.preventDefault(); 
    if(!isLoggedIn) { alert("Admin login required."); return; } 
    const currentLogo = document.getElementById('siteLogo').src; 
    document.getElementById('logoPreview').src = currentLogo; 
    document.getElementById('logoUrlInput').value = currentLogo; 
    document.getElementById('editLogoModal').classList.remove('hidden'); 
    document.getElementById('editLogoModal').style.display = 'flex'; 
});

document.getElementById('logoUploadInput')?.addEventListener('change', function(e) { 
    const file = e.target.files[0]; 
    if(file) { 
        const reader = new FileReader(); 
        reader.onload = function(ev) { 
            document.getElementById('logoPreview').src = ev.target.result; 
            document.getElementById('logoUrlInput').value = ev.target.result; 
        }; 
        reader.readAsDataURL(file); 
    } 
});

document.getElementById('saveLogoBtn')?.addEventListener('click', () => { 
    const newLogoUrl = document.getElementById('logoUrlInput').value; 
    if(newLogoUrl) updateLogo(newLogoUrl); 
    closeAllModals(); 
});

const savedLogo = localStorage.getItem('websiteLogo'); 
if(savedLogo) document.getElementById('siteLogo').src = savedLogo;

// Modal close buttons
document.getElementById('closeModalBtn')?.addEventListener('click',()=>{ closeAllModals(); });
document.getElementById('closeSoldModalBtn')?.addEventListener('click',()=>{ closeAllModals(); });
document.getElementById('closeLogoModalBtn')?.addEventListener('click',()=>{ closeAllModals(); });
document.getElementById('closeLoginModalBtn')?.addEventListener('click',()=>{ closeAllModals(); });

// Authentication
function updateUIAfterLogin() { 
    isLoggedIn = true; 
    currentUser = ADMIN_USER.username; 
    document.getElementById('userStatusText').innerHTML = `<i class="fas fa-user-shield"></i> ${currentUser}`; 
    document.getElementById('dropdownUserName').innerHTML = `${currentUser} (Admin) <span class="text-green-600 text-xs">● Edit Mode</span>`; 
    closeAllModals(); 
    renderBikes(); 
    renderSold(); 
    alert("✅ Admin login successful! You can now edit bikes, sold listings & logo."); 
}

function logout() { 
    isLoggedIn = false; 
    currentUser = "Guest"; 
    document.getElementById('userStatusText').innerHTML = "Guest"; 
    document.getElementById('dropdownUserName').innerHTML = "Guest User <span class='text-gray-400 text-xs'>View Only</span>"; 
    renderBikes(); 
    renderSold(); 
    alert("Logged out. View-only mode."); 
}

document.getElementById('showLoginOption')?.addEventListener('click', (e) => { 
    e.preventDefault(); 
    document.getElementById('loginModal').classList.remove('hidden'); 
    document.getElementById('loginModal').style.display = 'flex'; 
    document.getElementById('accountDropdown').classList.add('hidden'); 
});

document.getElementById('doLoginBtn')?.addEventListener('click', ()=>{ 
    const u = document.getElementById('loginUsername').value; 
    const p = document.getElementById('loginPassword').value; 
    if(u===ADMIN_USER.username && p===ADMIN_USER.password){ 
        updateUIAfterLogin(); 
    } else { 
        document.getElementById('loginError').classList.remove('hidden'); 
        setTimeout(()=>document.getElementById('loginError').classList.add('hidden'),2500); 
    } 
});

document.getElementById('logoutBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); logout(); });

// Account dropdown
document.getElementById('accountBtn')?.addEventListener('click', (e)=>{ 
    e.stopPropagation(); 
    document.getElementById('accountDropdown').classList.toggle('hidden'); 
});
document.addEventListener('click', (e)=>{ 
    if(!document.getElementById('accountDropdown')?.contains(e.target) && e.target !== document.getElementById('accountBtn')) 
        document.getElementById('accountDropdown')?.classList.add('hidden'); 
});

// Profile and settings handlers
document.getElementById('profileBtn')?.addEventListener('click',(e)=>{ e.preventDefault(); alert(isLoggedIn ? `Admin: ${currentUser}\nFull edit permissions.` : "Guest mode. Login to edit."); });
document.getElementById('settingsBtn')?.addEventListener('click',(e)=>{ e.preventDefault(); alert("Admin can edit logo, bikes & sold entries."); });
document.getElementById('changePasswordBtn')?.addEventListener('click',(e)=>{ 
    e.preventDefault(); 
    if(isLoggedIn){ 
        let newPass = prompt("New admin password"); 
        if(newPass) ADMIN_USER.password = newPass; 
        alert("Password changed! Re-login."); 
        logout(); 
    } else alert("Admin login required."); 
});
document.getElementById('changeUsernameBtn')?.addEventListener('click',(e)=>{ 
    e.preventDefault(); 
    if(isLoggedIn){ 
        let newUser = prompt("New admin username"); 
        if(newUser) ADMIN_USER.username = newUser; 
        alert("Username changed! Re-login."); 
        logout(); 
    } else alert("Admin login required."); 
});

// Tab navigation
const tabs = ['home','bikes','sold','exchange','contact'];
function showTab(tabId) { 
    tabs.forEach(t=>{ document.getElementById(`${t}Content`)?.classList.add('hidden'); }); 
    document.getElementById(`${tabId}Content`)?.classList.remove('hidden'); 
    document.querySelectorAll('.tab-btn').forEach(btn=>{ 
        if(btn.getAttribute('data-tab')===tabId) btn.classList.add('active-tab'); 
        else btn.classList.remove('active-tab'); 
    }); 
    if(tabId==='bikes') renderBikes(); 
    if(tabId==='sold') renderSold(); 
    window.scrollTo(0,0); 
}

document.querySelectorAll('.tab-btn, .tab-btn-mobile').forEach(btn=>{ 
    btn.addEventListener('click',()=>{ const t = btn.getAttribute('data-tab'); if(t) showTab(t); }); 
});
document.querySelectorAll('[data-nav-bikes]').forEach(el=>el.addEventListener('click',(e)=>{ e.preventDefault(); showTab('bikes'); }));
document.querySelectorAll('[data-nav-exchange]').forEach(el=>el.addEventListener('click',(e)=>{ e.preventDefault(); showTab('exchange'); }));
document.getElementById('mobileMenuToggle')?.addEventListener('click',()=>{ document.getElementById('mobileTabs')?.classList.toggle('hidden'); });

// Bike filters
function applyBikeFilter(type) { 
    if(type==='all') bikes.sort((a,b)=>a.id-b.id); 
    else if(type==='price-desc') bikes.sort((a,b)=>b.priceNum-a.priceNum); 
    else if(type==='price-asc') bikes.sort((a,b)=>a.priceNum-b.priceNum); 
    renderBikes(); 
}
document.querySelectorAll('[data-bike-filter]').forEach(btn=>{ 
    btn.addEventListener('click',function(){ 
        document.querySelectorAll('[data-bike-filter]').forEach(b=>b.classList.remove('active-filter','bg-blue-600','text-white')); 
        this.classList.add('active-filter','bg-blue-600','text-white'); 
        applyBikeFilter(this.getAttribute('data-bike-filter')); 
    }); 
});

// Initialize
showTab('home');
renderBikes(); 
renderSold();