// Provider Dashboard JavaScript - TireloMate

document.addEventListener('DOMContentLoaded', function() {
    // --- PHASE 1: Set up UI handlers immediately (no API needed) ---
    initializeDashboard();
    setupNavigation();
    setupModals();
    setupEventListeners();

    // Logout must always work, even if everything else fails
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await window.auth.logout();
                } catch (err) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentProvider');
                    window.location.href = 'index.html';
                }
            }
        });
    }

    // --- PHASE 2: Auth check + data loading (async, may fail) ---
    setTimeout(async () => {
        // Check if user is authenticated (token in localStorage)
        if (!window.auth || !window.auth.isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }

        // Redirect non-providers to customer dashboard
        try {
            const user = await window.auth.getCurrentUser();
            if (!user || user.user_type !== 'provider') {
                window.location.replace('dashboard.html');
                return;
            }
        } catch (e) {
            console.warn('Could not verify provider role, redirecting to customer dashboard:', e.message);
            window.location.replace('dashboard.html');
            return;
        }

        // Load data — each call is independent
        try { loadUserData(); } catch (e) { console.warn('loadUserData failed:', e.message); }

        loadDashboardData();
    }, 100);
});

// User data and state management
let currentUser = {
    id: null,
    name: 'Loading...',
    email: '',
    phone: '',
    location: '',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    businessName: '',
    businessDescription: ''
};

let currentServices = [];
let currentBookings = [];
let activeTab = 'upcoming';
let knownUpcomingBookingIds = new Set();

// Data arrays – populated from API only (no demo data)
let sampleServices = [];
let sampleBookings = [];
let sampleTransactions = [];

// Initialize dashboard — show the dashboard section visually without triggering API calls
function initializeDashboard() {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('currentProvider');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }

    updateUserDisplay();

    // Show dashboard section directly (no API call yet — that happens in Phase 2)
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('dashboard-section')?.classList.add('active');
}

// Load user data from API
async function loadUserData() {
    try {
        // Check if user is authenticated
        if (!window.auth || !window.auth.isLoggedIn()) {
            throw new Error('User not authenticated');
        }

        // Get current user data from API
        const user = await window.auth.getCurrentUser();
        
        if (user) {
            // Update currentUser object with real data
            currentUser = {
                id: user.id,
                name: user.name || 'Unknown User',
                email: user.email || '',
                phone: user.phone || '',
                location: user.address || '',
                avatar: user.avatar || 'https://randomuser.me/api/portraits/women/44.jpg',
                businessName: user.business_name || '',
                businessDescription: user.bio || ''
            };
            
            // Update the display
            updateUserDisplay();
        } else {
            throw new Error('Failed to load user data');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        console.warn('Failed to load user data:', error.message);
        
        // Set fallback data
        currentUser.name = 'User';
        updateUserDisplay();
    }
}

// Update user display
function updateUserDisplay() {
    const userNameElements = document.querySelectorAll('#userNameDisplay, #sidebarUserName');
    userNameElements.forEach(element => {
        if (element) {
            element.textContent = currentUser.name;
        }
    });
    
    const avatarElements = document.querySelectorAll('.user-avatar, .profile-avatar');
    avatarElements.forEach(element => {
        if (element) {
            element.src = currentUser.avatar;
        }
    });
    
    // Update profile form
    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.querySelector('#profileName').value = currentUser.name;
        profileForm.querySelector('#profileEmail').value = currentUser.email;
        profileForm.querySelector('#profilePhone').value = currentUser.phone;
        profileForm.querySelector('#profileLocation').value = currentUser.location;
        profileForm.querySelector('#businessName').value = currentUser.businessName;
        profileForm.querySelector('#businessDescription').value = currentUser.businessDescription;
    }
}

// Navigation setup - similar to customer dashboard
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            mobileNavItems.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link and matching mobile nav
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            const mobileMatch = document.querySelector(`.mobile-nav-item[data-section="${section}"]`);
            if (mobileMatch) mobileMatch.classList.add('active');

            showSection(section);
        });
    });

    // Mobile bottom nav
    mobileNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            // "More" toggle opens the bottom sheet instead of navigating
            if (this.classList.contains('mobile-more-toggle')) {
                const moreMenu = document.getElementById('mobileMoreMenu');
                if (moreMenu) moreMenu.classList.add('open');
                return;
            }

            mobileNavItems.forEach(l => l.classList.remove('active'));
            navLinks.forEach(l => l.classList.remove('active'));

            this.classList.add('active');
            const section = this.getAttribute('data-section');
            const sidebarMatch = document.querySelector(`.nav-link[data-section="${section}"]`);
            if (sidebarMatch) sidebarMatch.classList.add('active');

            showSection(section);
        });
    });

    // Mobile "More" bottom sheet
    const moreMenu = document.getElementById('mobileMoreMenu');
    const moreOverlay = document.getElementById('mobileMoreOverlay');
    if (moreMenu && moreOverlay) {
        moreOverlay.addEventListener('click', () => moreMenu.classList.remove('open'));
        moreMenu.querySelectorAll('.mobile-more-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                moreMenu.classList.remove('open');
                const section = this.getAttribute('data-section');
                if (!section) return;
                mobileNavItems.forEach(l => l.classList.remove('active'));
                navLinks.forEach(l => l.classList.remove('active'));
                const sidebarMatch = document.querySelector(`.nav-link[data-section="${section}"]`);
                if (sidebarMatch) sidebarMatch.classList.add('active');
                showSection(section);
            });
        });
    }
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'services':
            loadServices();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'earnings':
            loadEarnings();
            break;
        case 'profile':
            // Profile is already loaded
            break;
        case 'reviews':
            loadProviderReviews();
            break;
        case 'messages':
            loadConversations();
            _startMessagePolling();
            break;
        case 'support':
            // Support section is static
            break;
    }
    if (sectionName !== 'messages') _stopMessagePolling();
}

// Load dashboard data by computing stats from real endpoints
async function loadDashboardData() {
    try {
        // Fetch all bookings for this provider
        const allBookings = await window.api.getProviderBookings('all');
        const bookings = Array.isArray(allBookings) ? allBookings : [];
        console.log('loadDashboardData: got', bookings.length, 'bookings', bookings.map(b => ({ id: b.id, status: b.status, provider_id: b.provider_id })));

        // Compute stats from bookings
        const pending = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
        const completed = bookings.filter(b => b.status === 'completed');
        const totalEarnings = completed.reduce((sum, b) => sum + (parseFloat(b.service_price || b.price || b.total_price || 0)), 0);

        document.getElementById('upcomingBookingsCount').textContent = pending.length;
        document.getElementById('monthlyEarnings').textContent = `P${totalEarnings}`;
        document.getElementById('totalClients').textContent = completed.length;

        // Fetch provider rating
        try {
            const user = await window.auth.getCurrentUser();
            if (user) {
                const rating = await api.getProviderRating(user.id);
                document.getElementById('averageRating').textContent = rating.average_rating ? rating.average_rating.toFixed(1) : '0.0';
            }
        } catch (_) {
            document.getElementById('averageRating').textContent = '0.0';
        }

        // Recent bookings = first 3
        const recent = bookings.slice(0, 3).map(b => ({
            serviceName: b.service_title || 'Service',
            clientName: b.customer_name || 'Client',
            clientAvatar: b.customer_avatar || "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Ccircle%20cx='50'%20cy='50'%20r='50'%20fill='%23ffe6f2'/%3E%3Ccircle%20cx='50'%20cy='40'%20r='16'%20fill='%23B20062'%20opacity='0.55'/%3E%3Cpath%20d='M18,88%20Q18,60%2050,60%20Q82,60%2082,88%20Z'%20fill='%23B20062'%20opacity='0.55'/%3E%3C/svg%3E",
            date: b.date,
            time: b.time,
            status: b.status
        }));
        renderRecentBookings(recent);

        initializeEarningsChart();

    } catch (error) {
        console.warn('Could not load dashboard data:', error.message);

        document.getElementById('upcomingBookingsCount').textContent = '0';
        document.getElementById('monthlyEarnings').textContent = 'P0';
        document.getElementById('averageRating').textContent = '0.0';
        document.getElementById('totalClients').textContent = '0';

        renderRecentBookings([]);
        initializeEarningsChart();
    }
}

// Load services from /api/provider/services
async function loadServices() {
    if (!currentServices.length) showLoading('servicesTable');
    try {
        if (window.auth && window.auth.isLoggedIn()) {
            const apiServices = await window.api.getProviderServices();
            if (Array.isArray(apiServices)) {
                currentServices = apiServices.map(s => ({
                    id: s.id,
                    title: s.title,
                    description: s.description || '',
                    category: s.category || 'other',
                    price: s.price,
                    duration: s.duration_estimate || '',
                    rating: 0,
                    bookings: 0,
                    reviews: 0,
                    status: s.is_active === false ? 'inactive' : 'active',
                    image: s.image || "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20600%20400'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%23ffe6f2'/%3E%3Cstop%20offset='1'%20stop-color='%23ffcce6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20fill='url(%23g)'%20width='600'%20height='400'/%3E%3Cg%20transform='translate(300,180)'%20fill='%23B20062'%20opacity='0.45'%3E%3Ccircle%20r='46'%20fill='%23fff'%20opacity='0.6'/%3E%3Cpath%20d='M-22,-8%20L-22,18%20L22,18%20L22,-8%20L7,-8%20L0,-20%20L-7,-8%20Z%20M-14,-2%20L14,-2%20L14,12%20L-14,12%20Z'/%3E%3C/g%3E%3Ctext%20x='300'%20y='280'%20text-anchor='middle'%20font-family='Arial,sans-serif'%20font-size='18'%20font-weight='600'%20fill='%23B20062'%20opacity='0.7'%3EService%3C/text%3E%3C/svg%3E"
                }));
                renderServices(currentServices);
                return;
            }
        }
    } catch (error) {
        console.warn('Could not load services:', error.message);
    }

    // No data – show empty state
    currentServices = [];
    renderServices(currentServices);
}

// Render services
function renderServices(services) {
    const servicesTable = document.getElementById('servicesTable');
    if (!servicesTable) return;
    
    if (services.length === 0) {
        servicesTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-concierge-bell"></i>
                <h3>No services found</h3>
                <p>Add your first service to start receiving bookings</p>
                <button class="primary-btn" id="addFirstServiceBtn">
                    <i class="fas fa-plus"></i>
                    Add Service
                </button>
            </div>
        `;
        
        document.getElementById('addFirstServiceBtn')?.addEventListener('click', () => {
            openModal('addServiceModal');
        });
        
        return;
    }
    
    servicesTable.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Bookings</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${services.map(service => `
                    <tr>
                        <td>
                            <div class="service-info">
                                <img src="${service.image}" alt="${service.title}" width="40" height="40" style="border-radius:6px;object-fit:cover;" onerror="this.onerror=null;this.src=&quot;data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20fill='%23ffe6f2'%20width='100'%20height='100'%20rx='8'/%3E%3Cg%20transform='translate(50,50)'%20fill='%23B20062'%20opacity='0.5'%3E%3Cpath%20d='M-12,-5%20L-12,10%20L12,10%20L12,-5%20L4,-5%20L0,-12%20L-4,-5%20Z'/%3E%3C/g%3E%3C/svg%3E&quot;">
                                <div>
                                    <div class="service-name">${service.title}</div>
                                    <div class="service-duration">${service.duration}</div>
                                </div>
                            </div>
                        </td>
                        <td>${service.category.charAt(0).toUpperCase() + service.category.slice(1)}</td>
                        <td>P${service.price}</td>
                        <td>${service.bookings}</td>
                        <td>
                            <div class="rating">
                                ${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))}
                                <span>${service.rating}</span>
                            </div>
                        </td>
                        <td>
                            <span class="status-badge ${service.status}">${service.status}</span>
                        </td>
                        <td>
                            <button class="action-btn edit-service-btn" data-service-id="${service.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-service-btn" data-service-id="${service.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Add event listeners for action buttons
    document.querySelectorAll('.edit-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceId = e.currentTarget.getAttribute('data-service-id');
            editService(serviceId);
        });
    });

    document.querySelectorAll('.delete-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceId = e.currentTarget.getAttribute('data-service-id');
            deleteService(serviceId);
        });
    });
}

// Load bookings from API
async function loadBookings() {
    if (!currentBookings.length) showLoading('bookingsTable');
    try {
        if (window.auth && window.auth.isLoggedIn()) {
            const apiBookings = await window.api.getProviderBookings('all');
            if (Array.isArray(apiBookings)) {
                const mapped = apiBookings.map(b => ({
                    id: b.id,
                    customer_id: b.customer_id,
                    serviceName: b.service_title || 'Service',
                    clientName: b.customer_name || 'Client',
                    clientAvatar: b.customer_avatar || '',
                    date: b.date,
                    time: b.time,
                    status: b.status,
                    notes: b.notes || '',
                    price: b.service_price || b.total_price || b.price || 0
                }));
                currentBookings = mapped;
                filterAndRenderBookings();
                await _handleBookingDeepLink();
                return;
            }
        }
    } catch (error) {
        console.warn('Could not load bookings:', error.message);
    }
    currentBookings = [];
    filterAndRenderBookings();
    await _handleBookingDeepLink();
}

// Run once per page load
let _deepLinkHandled = false;
async function _handleBookingDeepLink() {
    if (_deepLinkHandled) return;
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking');
    const action = params.get('action');
    if (!bookingId || action !== 'review') return;
    _deepLinkHandled = true;

    // Switch to the Bookings section so the modal opens in the right context
    if (typeof showSection === 'function') {
        try { showSection('bookings'); } catch (e) { /* ignore */ }
    }

    let booking = currentBookings.find(b => String(b.id) === String(bookingId));

    // Not in the current filtered list — fetch it directly
    if (!booking && window.api && typeof window.api.getProviderBooking === 'function') {
        try {
            const fetched = await window.api.getProviderBooking(bookingId);
            if (fetched) {
                booking = {
                    id: fetched.id,
                    customer_id: fetched.customer_id,
                    serviceName: fetched.service_title || 'Service',
                    clientName: fetched.customer_name || 'Client',
                    clientAvatar: fetched.customer_avatar || '',
                    date: fetched.date,
                    time: fetched.time,
                    status: fetched.status,
                    notes: fetched.notes || '',
                    price: fetched.service_price || fetched.total_price || fetched.price || 0
                };
                // Add to local list so viewBookingDetails can find it
                if (!currentBookings.find(b => String(b.id) === String(booking.id))) {
                    currentBookings.push(booking);
                }
            }
        } catch (e) {
            console.warn('Deep-link fetch failed:', e.message);
        }
    }

    if (booking && typeof viewBookingDetails === 'function') {
        viewBookingDetails(booking.id);
        const modal = document.getElementById('bookingDetailsModal');
        if (modal) modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Strip query params so refresh doesn't re-trigger
    try {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) { /* ignore */ }
}

function filterAndRenderBookings() {
    let filtered;
    if (activeTab === 'upcoming') {
        filtered = currentBookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status));
    } else if (activeTab === 'completed') {
        filtered = currentBookings.filter(b => b.status === 'completed');
    } else if (activeTab === 'cancelled') {
        filtered = currentBookings.filter(b => b.status === 'cancelled');
    } else {
        filtered = currentBookings;
    }
    renderBookings(filtered);
}

// Periodically poll for new bookings and refresh dashboard stats
setInterval(() => {
    if (window.auth && window.auth.isLoggedIn()) {
        loadBookings();
        if (document.querySelector('#dashboard-section.active')) {
            loadDashboardData();
        }
    }
}, 20000);

// Avatar helper: show image if valid URL, otherwise show initial circle
function _avatarHtml(avatarUrl, name, size = 30) {
    const initial = (name || '?').charAt(0).toUpperCase();
    const colors = ['#e91e8c', '#6c63ff', '#28a745', '#f5a623', '#17a2b8', '#dc3545', '#6f42c1', '#fd7e14'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    if (avatarUrl && avatarUrl.startsWith('http') && !avatarUrl.includes('placeholder')) {
        return `<img src="${avatarUrl}" alt="${name}" width="${size}" height="${size}" style="border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;align-items:center;justify-content:center;font-weight:600;font-size:${Math.round(size * 0.45)}px;flex-shrink:0;">${initial}</div>`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:${Math.round(size * 0.45)}px;flex-shrink:0;">${initial}</div>`;
}

// Render bookings
function renderBookings(bookings) {
    const bookingsTable = document.getElementById('bookingsTable');
    if (!bookingsTable) return;
    
    if (bookings.length === 0) {
        bookingsTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No ${activeTab} bookings</h3>
                <p>You don't have any ${activeTab} bookings at the moment</p>
            </div>
        `;
        return;
    }
    
    bookingsTable.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Service</th>
                    <th>Client</th>
                    <th>Date & Time</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>${booking.serviceName}</td>
                        <td>
                            <div class="client-info" style="display:flex;align-items:center;gap:8px;">
                                ${_avatarHtml(booking.clientAvatar, booking.clientName, 30)}
                                <span>${booking.clientName}</span>
                            </div>
                        </td>
                        <td>
                            ${new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            at ${booking.time}
                        </td>
                        <td>P${booking.price}</td>
                        <td>
                            <span class="status-badge ${booking.status}">${booking.status}</span>
                        </td>
                        <td>
                            <button class="action-btn view-booking-btn" data-booking-id="${booking.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${booking.customer_id ? `
                                <button class="action-btn" title="Message Customer" onclick="openMessageWithUser('${booking.customer_id}', '${(booking.clientName || '').replace(/'/g, "\\'")}')">
                                    <i class="fas fa-comment-dots" style="color:#6c63ff;"></i>
                                </button>
                            ` : ''}
                            ${booking.status === 'pending' ? `
                                <button class="action-btn confirm-booking-btn" data-booking-id="${booking.id}" title="Accept">
                                    <i class="fas fa-check-circle" style="color:#28a745;"></i>
                                </button>
                                <button class="action-btn cancel-booking-btn" data-booking-id="${booking.id}" title="Decline">
                                    <i class="fas fa-times" style="color:#dc3545;"></i>
                                </button>
                            ` : ''}
                            ${booking.status === 'confirmed' ? `
                                <button class="action-btn start-job-btn" data-booking-id="${booking.id}" title="Start Job">
                                    <i class="fas fa-play-circle" style="color:#28a745;"></i>
                                </button>
                            ` : ''}
                            ${booking.status === 'in_progress' ? `
                                <button class="action-btn complete-booking-btn" data-booking-id="${booking.id}" title="Mark Complete">
                                    <i class="fas fa-check-double" style="color:#1565c0;"></i>
                                </button>
                                <button class="action-btn cancel-booking-btn" data-booking-id="${booking.id}" title="Cancel">
                                    <i class="fas fa-times" style="color:#dc3545;"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Add event listeners for booking actions
    document.querySelectorAll('.view-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.getAttribute('data-booking-id');
            viewBookingDetails(bookingId);
        });
    });

    document.querySelectorAll('.confirm-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.getAttribute('data-booking-id');
            confirmBooking(bookingId);
        });
    });

    document.querySelectorAll('.start-job-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.getAttribute('data-booking-id');
            startJob(bookingId);
        });
    });

    document.querySelectorAll('.complete-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.getAttribute('data-booking-id');
            completeBooking(bookingId);
        });
    });

    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.getAttribute('data-booking-id');
            cancelBooking(bookingId);
        });
    });
}

// Render recent bookings
function renderRecentBookings(bookings) {
    const recentBookingsTable = document.getElementById('recentBookingsTable');
    if (!recentBookingsTable) return;
    
    if (bookings.length === 0) {
        recentBookingsTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No recent bookings</h3>
                <p>You don't have any recent bookings</p>
            </div>
        `;
        return;
    }
    
    recentBookingsTable.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Service</th>
                    <th>Client</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>${booking.serviceName}</td>
                        <td>
                            <div class="client-info" style="display:flex;align-items:center;gap:8px;">
                                ${_avatarHtml(booking.clientAvatar, booking.clientName, 30)}
                                <span>${booking.clientName}</span>
                            </div>
                        </td>
                        <td>
                            ${new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            at ${booking.time}
                        </td>
                        <td>
                            <span class="status-badge ${booking.status}">${booking.status}</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Cached bookings so period changes don't re-fetch
let _earningsBookingsCache = null;

function _getPrice(b) {
    return parseFloat(b.service_price || b.price || b.total_price || 0);
}

function _filterByPeriod(bookings, period) {
    if (period === 'all') return bookings;
    const now = new Date();
    const start = new Date(now);
    if (period === 'today') { start.setHours(0,0,0,0); }
    else if (period === 'week') { start.setDate(now.getDate() - 7); }
    else if (period === 'month') { start.setMonth(now.getMonth() - 1); }
    else if (period === 'year') { start.setFullYear(now.getFullYear() - 1); }
    return bookings.filter(b => {
        if (!b.date) return false;
        return new Date(b.date) >= start;
    });
}

function _groupByTime(completed, mode) {
    const map = {};
    for (const b of completed) {
        if (!b.date) continue;
        const d = new Date(b.date);
        let key, label;
        if (mode === 'week') {
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            key = weekStart.toISOString().slice(0, 10);
            label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (mode === 'year') {
            key = `${d.getFullYear()}`;
            label = `${d.getFullYear()}`;
        } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
        if (!map[key]) map[key] = { label, total: 0 };
        map[key].total += _getPrice(b);
    }
    const sorted = Object.keys(map).sort();
    return { labels: sorted.map(k => map[k].label), values: sorted.map(k => map[k].total) };
}

function _updateEarningsUI(bookings, earningsPeriod, breakdownPeriod) {
    const all = Array.isArray(bookings) ? bookings : [];
    const periodFiltered = _filterByPeriod(all.filter(b => b.status === 'completed'), earningsPeriod);
    const allCompleted = all.filter(b => b.status === 'completed');
    const cancelled = all.filter(b => b.status === 'cancelled');

    const totalEarnings = periodFiltered.reduce((sum, b) => sum + _getPrice(b), 0);
    const el = document.getElementById('totalEarningsAmount');
    if (el) el.textContent = `P${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const completedJobsEl = document.getElementById('completedJobsCount');
    const avgPerJobEl = document.getElementById('avgPerJob');
    const cancellationRateEl = document.getElementById('cancellationRate');
    if (completedJobsEl) completedJobsEl.textContent = periodFiltered.length;
    if (avgPerJobEl) avgPerJobEl.textContent = periodFiltered.length ? `P${(_getPrice({ total_price: totalEarnings / periodFiltered.length })).toFixed(2)}` : 'P0.00';
    if (cancellationRateEl) cancellationRateEl.textContent = all.length ? `${Math.round((cancelled.length / all.length) * 100)}%` : '0%';

    // Compute change indicator
    const changeEl = document.getElementById('earningsChange');
    if (changeEl && earningsPeriod !== 'all') {
        const prevStart = new Date();
        const nowDate = new Date();
        if (earningsPeriod === 'today') { prevStart.setDate(nowDate.getDate() - 1); }
        else if (earningsPeriod === 'week') { prevStart.setDate(nowDate.getDate() - 14); }
        else if (earningsPeriod === 'month') { prevStart.setMonth(nowDate.getMonth() - 2); }
        else if (earningsPeriod === 'year') { prevStart.setFullYear(nowDate.getFullYear() - 2); }
        const prevEnd = new Date();
        if (earningsPeriod === 'today') { prevEnd.setDate(nowDate.getDate() - 1); prevEnd.setHours(23,59,59); }
        else if (earningsPeriod === 'week') { prevEnd.setDate(nowDate.getDate() - 7); }
        else if (earningsPeriod === 'month') { prevEnd.setMonth(nowDate.getMonth() - 1); }
        else if (earningsPeriod === 'year') { prevEnd.setFullYear(nowDate.getFullYear() - 1); }
        const prevCompleted = allCompleted.filter(b => {
            if (!b.date) return false;
            const d = new Date(b.date);
            return d >= prevStart && d < prevEnd;
        });
        const prevTotal = prevCompleted.reduce((s, b) => s + _getPrice(b), 0);
        if (prevTotal > 0) {
            const pct = Math.round(((totalEarnings - prevTotal) / prevTotal) * 100);
            const up = pct >= 0;
            changeEl.innerHTML = `<i class="fas fa-arrow-${up ? 'up' : 'down'}"></i><span>${up ? '+' : ''}${pct}% from previous period</span>`;
            changeEl.style.color = up ? '#2e7d32' : '#d32f2f';
        } else {
            changeEl.innerHTML = '<span>No previous data to compare</span>';
            changeEl.style.color = '#6c757d';
        }
    } else if (changeEl) {
        changeEl.innerHTML = '';
    }

    // Bar+line chart: revenue over time
    const timeData = _groupByTime(allCompleted, breakdownPeriod);
    initializeEarningsChart(timeData.labels, timeData.values);
    initializeEarningsBreakdownChart(timeData.labels, timeData.values);

    // Doughnut: by category (from period-filtered data)
    const categoryMap = {};
    for (const b of periodFiltered) {
        const cat = b.service_category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + _getPrice(b);
    }
    initializeCategoryChart(Object.keys(categoryMap), Object.values(categoryMap));

    // Transactions list (most recent first)
    const transactions = periodFiltered
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .map(b => ({
            service: b.service_title || 'Service',
            client: b.customer_name || 'Client',
            amount: _getPrice(b),
            date: b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            status: 'completed'
        }));
    renderTransactions(transactions);
}

// Load earnings data from completed bookings
async function loadEarnings() {
    showLoading('transactionsList');
    try {
        const allBookings = await window.api.getProviderBookings('all');
        _earningsBookingsCache = Array.isArray(allBookings) ? allBookings : [];

        const earningsPeriod = (document.getElementById('totalEarningsPeriod') || {}).value || 'all';
        const breakdownPeriod = (document.getElementById('earningsBreakdownPeriod') || {}).value || 'month';
        _updateEarningsUI(_earningsBookingsCache, earningsPeriod, breakdownPeriod);
    } catch (error) {
        console.warn('Could not load earnings data:', error.message);
        document.getElementById('totalEarningsAmount').textContent = 'P0.00';
        initializeEarningsChart([], []);
        initializeEarningsBreakdownChart([], []);
        initializeCategoryChart([], []);
        renderTransactions([]);
    }
}

// Render transactions
function renderTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state" style="padding:30px 20px;">
                <i class="fas fa-receipt" style="font-size:2.5rem;color:#d1d5db;margin-bottom:12px;"></i>
                <h3 style="font-size:1.1rem;margin-bottom:4px;">No transactions yet</h3>
                <p style="font-size:0.88rem;">Completed bookings will appear here</p>
            </div>
        `;
        return;
    }
    
    transactionsList.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-service">${transaction.service}</div>
                <div class="transaction-client"><i class="fas fa-user" style="font-size:0.7rem;margin-right:4px;opacity:0.5;"></i>${transaction.client}</div>
            </div>
            <div style="text-align:right;">
                <div class="transaction-amount" style="color:#2e7d32;font-weight:700;">+P${transaction.amount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="transaction-date" style="font-size:0.78rem;color:#9ca3af;">${transaction.date}</div>
            </div>
        </div>
    `).join('');
}

// Chart instances (stored so we can destroy before re-creating)
let _earningsChartInstance = null;
let _breakdownChartInstance = null;
let _categoryChartInstance = null;

// Initialize earnings bar+line chart with real data
function initializeEarningsChart(monthLabels, monthEarnings) {
    const canvas = document.getElementById('earningsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy previous instance
    if (_earningsChartInstance) { _earningsChartInstance.destroy(); _earningsChartInstance = null; }

    const labels = monthLabels && monthLabels.length ? monthLabels : ['No data'];
    const values = monthEarnings && monthEarnings.length ? monthEarnings : [0];

    _earningsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Earnings',
                    data: values,
                    backgroundColor: 'rgba(233, 30, 140, 0.3)',
                    borderColor: 'rgba(233, 30, 140, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    order: 2
                },
                {
                    label: 'Trend',
                    data: values,
                    type: 'line',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(67, 97, 238, 1)',
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// The breakdown chart is now the bar/line "Revenue Over Time" chart
// The old earningsBreakdownChart canvas is reused for this purpose
function initializeEarningsBreakdownChart(categoryLabels, categoryEarnings) {
    const canvas = document.getElementById('earningsBreakdownChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (_breakdownChartInstance) { _breakdownChartInstance.destroy(); _breakdownChartInstance = null; }

    const labels = categoryLabels && categoryLabels.length ? categoryLabels : ['No data'];
    const values = categoryEarnings && categoryEarnings.length ? categoryEarnings : [0];

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(178, 0, 98, 0.25)');
    gradient.addColorStop(1, 'rgba(178, 0, 98, 0.02)');

    _breakdownChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: values,
                    backgroundColor: gradient,
                    borderColor: 'rgba(178, 0, 98, 0.8)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    order: 2
                },
                {
                    label: 'Trend',
                    data: values,
                    type: 'line',
                    borderColor: '#4361ee',
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#4361ee',
                    pointBorderWidth: 2.5,
                    pointHoverRadius: 7,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26,26,46,0.92)',
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.datasetIndex === 1) return null;
                            return ' P' + ctx.parsed.y.toLocaleString('en-US', {minimumFractionDigits:2});
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    ticks: {
                        callback: v => 'P' + v.toLocaleString(),
                        font: { size: 11 },
                        color: '#9ca3af'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: '#6b7280' }
                }
            }
        }
    });
}

// Initialize category doughnut chart
function initializeCategoryChart(categoryLabels, categoryEarnings) {
    const canvas = document.getElementById('earningsCategoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (_categoryChartInstance) { _categoryChartInstance.destroy(); _categoryChartInstance = null; }

    const colors = [
        '#B20062', '#4361ee', '#28a745', '#f5a623',
        '#6c63ff', '#17a2b8', '#dc3545', '#6f42c1'
    ];

    const labels = categoryLabels && categoryLabels.length ? categoryLabels : ['No data'];
    const values = categoryEarnings && categoryEarnings.length ? categoryEarnings : [1];

    _categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26,26,46,0.92)',
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
                            return ` ${ctx.label}: P${ctx.parsed.toLocaleString('en-US', {minimumFractionDigits:2})} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Booking tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeTab = this.getAttribute('data-tab');
            filterAndRenderBookings();
        });
    });
    
    // Add service button
    const addServiceBtn = document.getElementById('addServiceBtn');
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', () => {
            openModal('addServiceModal');
            initServiceLocationMap();
        });
    }

    // Add new service button
    const addNewServiceBtn = document.getElementById('addNewServiceBtn');
    if (addNewServiceBtn) {
        addNewServiceBtn.addEventListener('click', () => {
            openModal('addServiceModal');
            initServiceLocationMap();
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('serviceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadServices, 300));
    }
    
    // Profile form
    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    // Add service form
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', handleAddService);
    }
    
    // Support form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleSupportMessage);
    }
    
    // Period selectors — re-render earnings from cache when changed
    const totalPeriodSel = document.getElementById('totalEarningsPeriod');
    const breakdownPeriodSel = document.getElementById('earningsBreakdownPeriod');
    const refreshEarnings = () => {
        if (!_earningsBookingsCache) return;
        const ep = (totalPeriodSel || {}).value || 'all';
        const bp = (breakdownPeriodSel || {}).value || 'month';
        _updateEarningsUI(_earningsBookingsCache, ep, bp);
    };
    if (totalPeriodSel) totalPeriodSel.addEventListener('change', refreshEarnings);
    if (breakdownPeriodSel) breakdownPeriodSel.addEventListener('change', refreshEarnings);
}

// Modal functions - similar to customer dashboard
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    // Reset edit mode when closing the service modal
    if (modalId === 'addServiceModal') {
        _editingServiceId = null;
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// View booking details
function viewBookingDetails(bookingId) {
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const modalContent = document.getElementById('bookingDetailsContent');
    if (!modalContent) return;
    
    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    modalContent.innerHTML = `
        <div class="booking-details-container">
            <div class="booking-header">
                <div>
                    <div class="booking-service">${booking.serviceName}</div>
                    <div class="booking-client" style="display:flex;align-items:center;gap:8px;">
                        ${_avatarHtml(booking.clientAvatar, booking.clientName, 36)}
                        <span>${booking.clientName}</span>
                    </div>
                </div>
                <span class="status-badge ${booking.status}">${booking.status}</span>
            </div>
            
            <div class="booking-details-grid">
                <div class="booking-detail">
                    <label>Date</label>
                    <span>${formattedDate}</span>
                </div>
                <div class="booking-detail">
                    <label>Time</label>
                    <span>${booking.time}</span>
                </div>
                <div class="booking-detail">
                    <label>Price</label>
                    <span>P${booking.price}</span>
                </div>
                <div class="booking-detail">
                    <label>Status</label>
                    <span class="status-badge ${booking.status}">${booking.status}</span>
                </div>
            </div>
            
            ${booking.notes ? `
                <div class="booking-notes">
                    <label>Client Notes</label>
                    <p>${booking.notes}</p>
                </div>
            ` : ''}
            
            ${booking.status === 'pending' ? `
                <div class="booking-actions">
                    <button class="primary-btn" onclick="confirmBooking('${booking.id}')" style="background:#28a745;">
                        <i class="fas fa-check-circle"></i>
                        Accept Booking
                    </button>
                    <button class="cancel-btn" onclick="cancelBooking('${booking.id}')">
                        <i class="fas fa-times"></i>
                        Decline
                    </button>
                </div>
            ` : ''}
            ${booking.status === 'confirmed' ? `
                <div class="booking-actions">
                    <button class="primary-btn" onclick="startJob('${booking.id}')" style="background:#28a745;">
                        <i class="fas fa-play-circle"></i>
                        Start Job
                    </button>
                </div>
            ` : ''}
            ${booking.status === 'in_progress' ? `
                <div class="booking-actions">
                    <button class="primary-btn" onclick="completeBooking('${booking.id}')">
                        <i class="fas fa-check-double"></i>
                        Mark as Completed
                    </button>
                    <button class="cancel-btn" onclick="cancelBooking('${booking.id}')">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    openModal('bookingDetailsModal');
}

// Start job (sets status to 'in_progress')
async function startJob(bookingId) {
    if (!confirm('Start this job now?')) return;

    try {
        await window.api.updateProviderBookingStatus(bookingId, 'in_progress');
        closeModal('bookingDetailsModal');
        await loadBookings();
        loadDashboardData();
        showNotification('Job started!', 'success');
    } catch (err) {
        console.error('Failed to start job:', err.message, err);
        showNotification('Failed to start job: ' + err.message, 'error');
    }
}

// Accept/confirm booking (sets status to 'confirmed')
async function confirmBooking(bookingId) {
    if (!confirm('Accept this booking request?')) return;

    try {
        await window.api.updateProviderBookingStatus(bookingId, 'confirmed');
        closeModal('bookingDetailsModal');
        await loadBookings();
        loadDashboardData();
        showNotification('Booking accepted!', 'success');
    } catch (err) {
        console.error('Failed to confirm booking via API:', err);
        showNotification('Failed to accept booking. Please try again.', 'error');
    }
}

// Complete booking (confirm via API)
async function completeBooking(bookingId) {
    if (!confirm('Mark this booking as completed?')) return;

    try {
        await window.api.updateProviderBookingStatus(bookingId, 'completed');
        closeModal('bookingDetailsModal');
        await loadBookings();
        loadDashboardData();
        showNotification('Booking marked as completed', 'success');
    } catch (err) {
        console.error('Failed to complete booking via API:', err);
        showNotification('Failed to complete booking. Please try again.', 'error');
    }
}

// Cancel booking (confirm via API – also triggers customer-side "confirmed" for the inDrive flow)
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        await window.api.updateProviderBookingStatus(bookingId, 'cancelled');
        closeModal('bookingDetailsModal');
        await loadBookings();
        loadDashboardData();
        showNotification('Booking cancelled', 'success');
    } catch (err) {
        console.error('Failed to cancel booking via API:', err);
        showNotification('Failed to cancel booking. Please try again.', 'error');
    }
}

// Track whether we're editing an existing service
let _editingServiceId = null;

// Edit service — pre-fill the add service modal and switch to update mode
function editService(serviceId) {
    const service = currentServices.find(s => s.id === serviceId);
    if (!service) return;

    _editingServiceId = serviceId;

    // Pre-fill form fields
    document.getElementById('serviceTitle').value = service.title || '';
    document.getElementById('serviceCategory').value = service.category || '';
    document.getElementById('servicePrice').value = service.price || '';
    document.getElementById('serviceDescription').value = service.description || '';

    // Duration: try to parse "60 minutes" -> "60", otherwise set to "custom"
    const durationEl = document.getElementById('serviceDuration');
    if (durationEl) {
        const match = (service.duration || '').match(/^(\d+)/);
        if (match) {
            durationEl.value = match[1];
        } else {
            durationEl.value = 'custom';
        }
    }

    openModal('addServiceModal');
    initServiceLocationMap();
}

// Delete service via API
async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service? This cannot be undone.')) return;

    try {
        await api.deleteService(serviceId);
        const index = currentServices.findIndex(s => s.id === serviceId);
        if (index !== -1) {
            currentServices.splice(index, 1);
            renderServices(currentServices);
        }
        showNotification('Service deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete service: ' + error.message, 'error');
    }
}

// Handle add/edit service
async function handleAddService(e) {
    e.preventDefault();

    const title = document.getElementById('serviceTitle').value;
    const category = document.getElementById('serviceCategory').value;
    const price = document.getElementById('servicePrice').value;
    const duration = document.getElementById('serviceDuration').value;
    const description = document.getElementById('serviceDescription').value;

    if (!title || !category || !price || !duration || !description) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Get location data from map marker
    const locationAddress = document.getElementById('serviceLocationAddress').value;
    let locationData = {};
    if (window._serviceMapMarker) {
        const latlng = window._serviceMapMarker.getLatLng();
        locationData.location_lat = latlng.lat;
        locationData.location_lng = latlng.lng;
    }
    if (locationAddress) {
        locationData.location_address = locationAddress;
    }

    if (!window.auth || !window.auth.isLoggedIn()) {
        showNotification('You must be logged in to manage services.', 'error');
        return;
    }

    const servicePayload = {
        title,
        description,
        category,
        price: parseFloat(price),
        duration_estimate: duration === 'custom' ? 'Custom' : `${duration} minutes`,
        ...locationData
    };

    try {
        if (_editingServiceId) {
            // Update existing service
            await api.updateService(_editingServiceId, servicePayload);
            showNotification('Service updated successfully', 'success');
            _editingServiceId = null;
        } else {
            // Create new service
            await window.services.create(servicePayload);
            showNotification('Service created successfully', 'success');
        }
        closeModal('addServiceModal');
        destroyServiceLocationMap();
        await loadServices();
        e.target.reset();
    } catch (error) {
        showNotification('Failed to save service: ' + error.message, 'error');
    }
}

// Update profile
async function updateProfile(e) {
    e.preventDefault();

    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const phone = document.getElementById('profilePhone').value;
    const location = document.getElementById('profileLocation').value;
    const businessName = document.getElementById('businessName').value;
    const businessDescription = document.getElementById('businessDescription').value;

    // Persist to Supabase via PUT /api/user/{id}
    try {
        if (window.auth && window.auth.isLoggedIn() && currentUser.id) {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`https://final-year-project-tirelomate.vercel.app/api/user/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, phone })
            });
            if (!res.ok) {
                const err = await res.json();
                showNotification(err.error || 'Failed to update profile', 'error');
                return;
            }
        }
    } catch (err) {
        showNotification('Could not save profile. Please try again.', 'error');
        return;
    }

    // Update current user
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;
    currentUser.location = location;
    currentUser.businessName = businessName;
    currentUser.businessDescription = businessDescription;

    // Save to localStorage
    localStorage.setItem('currentProvider', JSON.stringify(currentUser));

    // Update display
    updateUserDisplay();

    showNotification('Profile updated successfully!', 'success');
}

// Handle support message
function handleSupportMessage(e) {
    e.preventDefault();
    
    const subject = document.getElementById('supportSubject').value;
    const message = document.getElementById('supportMessage').value;
    
    if (!subject || !message) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Simulate sending message
    showNotification('Your message has been sent. We\'ll get back to you within 24 hours.', 'success');
    
    // Reset form
    e.target.reset();
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            console.log('Logging out...');
            
            // Check if auth object exists
            if (!window.auth) {
                console.error('Auth object not available');
                throw new Error('Authentication system not available');
            }
            
            await window.auth.logout();
            // The logout function in auth.js already handles the redirect
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback redirect - always redirect to home page
            showNotification('Logging out...', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Leaflet Map for Service Location =====

function initServiceLocationMap() {
    // Destroy previous map instance if any
    destroyServiceLocationMap();

    // Small delay so the modal is fully visible before initializing
    setTimeout(() => {
        const mapContainer = document.getElementById('serviceLocationMap');
        if (!mapContainer) return;

        // Center on Gaborone
        const defaultLat = -24.6282;
        const defaultLng = 25.9231;

        const map = L.map('serviceLocationMap').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

        // Store references globally so other functions can access them
        window._serviceMap = map;
        window._serviceMapMarker = marker;

        // Fix map rendering inside modal
        setTimeout(() => map.invalidateSize(), 300);

        // "Use My Current Location" button
        const locationBtn = document.getElementById('useMyLocationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', function () {
                if (!navigator.geolocation) {
                    showNotification('Geolocation is not supported by your browser', 'error');
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        marker.setLatLng([lat, lng]);
                        map.setView([lat, lng], 15);
                        showNotification('Location updated to your current position', 'success');
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        showNotification('Could not get your location. Please drag the marker instead.', 'error');
                    }
                );
            });
        }
    }, 200);
}

function destroyServiceLocationMap() {
    if (window._serviceMap) {
        window._serviceMap.remove();
        window._serviceMap = null;
        window._serviceMapMarker = null;
    }
}

// ===== Reviews Section =====

async function loadProviderReviews() {
    showLoading('providerReviewsList');
    try {
        const user = await window.auth.getCurrentUser();
        if (!user) return;

        // Fetch rating summary
        const rating = await api.getProviderRating(user.id);
        document.getElementById('providerAvgRating').textContent = rating.average_rating || '0.0';
        const fullStars = Math.floor(rating.average_rating || 0);
        const emptyStars = 5 - fullStars;
        document.getElementById('providerAvgStars').innerHTML = '<i class="fas fa-star"></i>'.repeat(fullStars) + '<i class="far fa-star" style="color:#ddd;"></i>'.repeat(emptyStars);
        document.getElementById('providerReviewCount').textContent = `${rating.review_count || 0} review${rating.review_count !== 1 ? 's' : ''}`;

        // Fetch all reviews
        const reviews = await api.getProviderReviews(user.id);
        const container = document.getElementById('providerReviewsList');
        if (!container) return;

        if (!Array.isArray(reviews) || reviews.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p></div>';
            return;
        }

        container.innerHTML = reviews.map(r => {
            const stars = '<i class="fas fa-star"></i>'.repeat(r.rating) + '<i class="far fa-star" style="color:#ddd;"></i>'.repeat(5 - r.rating);
            const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const name = r.customer_name || 'Customer';
            const initial = name.charAt(0).toUpperCase();
            const colors = ['#e91e8c', '#6c63ff', '#28a745', '#f5a623', '#17a2b8', '#dc3545', '#6f42c1', '#fd7e14'];
            const color = colors[initial.charCodeAt(0) % colors.length];
            const avatarHtml = (r.customer_avatar && r.customer_avatar.startsWith('http') && !r.customer_avatar.includes('placeholder'))
                ? `<img src="${r.customer_avatar}" alt="${name}" class="review-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                  + `<div class="review-avatar-initial" style="display:none;background:${color};">${initial}</div>`
                : `<div class="review-avatar-initial" style="background:${color};">${initial}</div>`;
            return `
                <div class="review-card">
                    <div class="review-header">
                        ${avatarHtml}
                        <div class="review-meta">
                            <div class="review-name">${name}</div>
                            <div class="review-date">${date}</div>
                        </div>
                        <div class="review-stars">${stars}</div>
                    </div>
                    ${r.comment ? `<p class="review-comment">${r.comment}</p>` : '<p class="review-no-comment">No comment</p>'}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load reviews:', err);
        console.warn('Could not load reviews:', err.message);
    }
}

// ===== Messaging System =====

let _msgPollTimer = null;
let _activeChatUserId = null;
let _currentUserId = null;

function _startMessagePolling() {
    _stopMessagePolling();
    _msgPollTimer = setInterval(() => {
        if (_activeChatUserId) _loadChatThread(_activeChatUserId);
        loadConversations(true);
    }, 5000);
}

function _stopMessagePolling() {
    if (_msgPollTimer) { clearInterval(_msgPollTimer); _msgPollTimer = null; }
}

async function loadConversations(silent = false) {
    if (!_currentUserId) {
        try {
            const u = await window.auth.getCurrentUser();
            if (u) _currentUserId = u.id;
        } catch (_) {}
    }

    const container = document.getElementById('convoListItems');
    if (!container) return;

    if (!silent) showLoading('convoListItems');

    try {
        const convos = await window.messaging.getConversations();
        if (!Array.isArray(convos) || convos.length === 0) {
            if (!silent) container.innerHTML = '<div class="empty-state" style="padding:40px 16px;"><i class="fas fa-comments"></i><p>No conversations yet</p></div>';
            return;
        }

        container.innerHTML = convos.map(c => {
            const name = c.user_name || 'User';
            const initial = name.charAt(0).toUpperCase();
            const colors = ['#e91e8c', '#6c63ff', '#28a745', '#f5a623', '#17a2b8', '#dc3545', '#6f42c1', '#fd7e14'];
            const color = colors[initial.charCodeAt(0) % colors.length];
            const avatarHtml = (c.user_avatar && c.user_avatar.startsWith('http') && !c.user_avatar.includes('placeholder'))
                ? `<img src="${c.user_avatar}" alt="${name}" class="convo-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                  + `<div class="convo-avatar" style="display:none;background:${color};color:#fff;font-weight:700;justify-content:center;align-items:center;font-size:1rem;flex-shrink:0;">${initial}</div>`
                : `<div class="convo-avatar" style="background:${color};color:#fff;display:flex;font-weight:700;justify-content:center;align-items:center;font-size:1rem;flex-shrink:0;">${initial}</div>`;
            return `
            <div class="convo-item${_activeChatUserId === c.user_id ? ' active' : ''}" data-user-id="${c.user_id}">
                ${avatarHtml}
                <div class="convo-info">
                    <div class="convo-name">${name}</div>
                    <div class="convo-preview">${c.is_mine ? 'You: ' : ''}${c.last_message}</div>
                </div>
                <div class="convo-time">${_timeAgo(c.last_message_at)}</div>
            </div>
        `;
        }).join('');

        container.querySelectorAll('.convo-item').forEach(el => {
            el.addEventListener('click', () => {
                const uid = el.getAttribute('data-user-id');
                const name = el.querySelector('.convo-name').textContent;
                _selectConversation(uid, name);
            });
        });
    } catch (e) {
        console.error('Failed to load conversations:', e);
        if (!silent) console.warn('Could not load conversations:', e.message);
    }
}

function _selectConversation(userId, userName) {
    _activeChatUserId = userId;
    document.getElementById('chatWithName').textContent = userName;
    document.getElementById('chatInputArea').style.display = 'flex';
    _loadChatThread(userId);
    loadConversations(true);

    const sendBtn = document.getElementById('chatSendBtn');
    const input = document.getElementById('chatMessageInput');
    const newSend = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSend, sendBtn);
    newSend.addEventListener('click', () => _sendMessage(userId));
    input.onkeydown = (e) => { if (e.key === 'Enter') _sendMessage(userId); };
}

async function _loadChatThread(userId) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    try {
        const messages = await window.messaging.getMessages(userId);
        if (!Array.isArray(messages)) return;

        const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;

        container.innerHTML = messages.map(m => {
            const isMine = m.sender_id === _currentUserId;
            return `<div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
                ${m.content}
                <div class="bubble-time">${_timeAgo(m.created_at)}</div>
            </div>`;
        }).join('');

        if (wasAtBottom || messages.length <= 20) container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error('Failed to load messages:', e);
        console.warn('Could not load messages:', e.message);
    }
}

async function _sendMessage(userId) {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
        await window.messaging.send(userId, text);
        await _loadChatThread(userId);
        loadConversations(true);
    } catch (e) {
        showNotification('Failed to send message', 'error');
    }
}

function openMessageWithUser(userId, userName) {
    showSection('messages');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(l => l.classList.remove('active'));
    const msgLink = document.querySelector('.nav-link[data-section="messages"]');
    if (msgLink) msgLink.classList.add('active');
    const msgMobile = document.querySelector('.mobile-nav-item[data-section="messages"]');
    if (msgMobile) msgMobile.classList.add('active');
    setTimeout(() => _selectConversation(userId, userName || 'User'), 300);
}

function _timeAgo(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

// ===== Loading Spinner Utilities =====

function showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<div class="loading-spinner-container" style="display:flex;align-items:center;justify-content:center;padding:40px;">
        <div style="width:36px;height:36px;border:4px solid #e0e0e0;border-top-color:#e91e8c;border-radius:50%;animation:_spin 0.7s linear infinite;"></div>
    </div>
    <style>@keyframes _spin{to{transform:rotate(360deg)}}</style>`;
}

function hideLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const spinner = el.querySelector('.loading-spinner-container');
    if (spinner) spinner.remove();
}

function showNotification(message, type = 'info') {
    // Remove any existing notifications of the same type to avoid stacking
    const existingNotifications = document.querySelectorAll(`.notification.${type}`);
    existingNotifications.forEach(notif => {
        notif.classList.remove('show');
        setTimeout(() => {
            if (notif.parentNode) {
                notif.parentNode.removeChild(notif);
            }
        }, 300);
    });

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add icon for better visibility
    if (type === 'error') {
        notification.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>${message}`;
    } else if (type === 'success') {
        notification.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${message}`;
    } else if (type === 'warning') {
        notification.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>${message}`;
    } else {
        notification.innerHTML = `<i class="fas fa-info-circle" style="margin-right: 8px;"></i>${message}`;
    }
    
    document.body.appendChild(notification);
    
    // Ensure notification is visible above all elements
    notification.style.zIndex = '9999';
    
    // Show notification with a slight delay to ensure DOM is ready
    setTimeout(() => {
        notification.classList.add('show');
    }, 50);
    
    // Auto-hide after appropriate duration
    const duration = type === 'error' ? 5000 : 3000; // Errors stay longer
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    // Allow manual dismissal by clicking
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
    
    // Add hover effect for better UX
    notification.style.cursor = 'pointer';
}

// Export functions for global access
window.startJob = startJob;
window.completeBooking = completeBooking;
window.cancelBooking = cancelBooking;