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
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
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
            clientAvatar: b.customer_avatar || 'https://via.placeholder.com/40?text=C',
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
                    image: s.image || 'https://via.placeholder.com/80?text=Service'
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
                                <img src="${service.image}" alt="${service.title}" width="40" height="40">
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
            const serviceId = parseInt(e.currentTarget.getAttribute('data-service-id'));
            editService(serviceId);
        });
    });
    
    document.querySelectorAll('.delete-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceId = parseInt(e.currentTarget.getAttribute('data-service-id'));
            deleteService(serviceId);
        });
    });
}

// Load bookings from API
async function loadBookings() {
    if (!currentBookings.length) showLoading('bookingsTable');
    try {
        if (window.auth && window.auth.isLoggedIn()) {
            // Map API bookings to UI shape
            const apiBookings = await window.api.getProviderBookings(activeTab === 'upcoming' ? 'upcoming' : activeTab);
            if (Array.isArray(apiBookings)) {
                const mapped = apiBookings.map(b => ({
                    id: b.id,
                    customer_id: b.customer_id,
                    serviceName: b.service_title || 'Service',
                    clientName: b.customer_name || 'Client',
                    clientAvatar: b.customer_avatar || 'https://via.placeholder.com/40?text=C',
                    date: b.date,
                    time: b.time,
                    status: b.status,
                    price: b.service_price || b.total_price || b.price || 0
                }));
                // Detect new upcoming bookings and notify
                if (activeTab === 'upcoming') {
                    const newOnes = mapped.filter(b => !knownUpcomingBookingIds.has(b.id));
                    if (newOnes.length > 0) {
                        newOnes.forEach(b => knownUpcomingBookingIds.add(b.id));
                        try { showNotification(`${newOnes.length} new booking request(s)`, 'success'); } catch (_) {}
                    }
                    // Keep set in sync by removing ones no longer present
                    const currentIds = new Set(mapped.map(b => b.id));
                    Array.from(knownUpcomingBookingIds).forEach(id => { if (!currentIds.has(id)) knownUpcomingBookingIds.delete(id); });
                }
                currentBookings = mapped;
                renderBookings(currentBookings);
                return;
            }
        }
    } catch (error) {
        console.warn('Failed to load provider bookings from API:', error.message);
        console.warn('Could not load bookings:', error.message);
    }

    // No demo data – show empty state
    currentBookings = [];
    renderBookings(currentBookings);
}

// Periodically poll for new upcoming bookings
setInterval(() => {
    if (document.getElementById('bookings-section') && window.auth && window.auth.isLoggedIn()) {
        const previousTab = activeTab;
        // Temporarily ensure we check upcoming
        const restore = previousTab;
        activeTab = 'upcoming';
        loadBookings().finally(() => { activeTab = restore; });
    }
}, 20000);

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
                            <div class="client-info">
                                <img src="${booking.clientAvatar}" alt="${booking.clientName}" width="30" height="30">
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
                            ` : ''}
                            ${booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'upcoming' ? `
                                <button class="action-btn complete-booking-btn" data-booking-id="${booking.id}" title="Complete">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="action-btn cancel-booking-btn" data-booking-id="${booking.id}" title="Cancel">
                                    <i class="fas fa-times"></i>
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
                            <div class="client-info">
                                <img src="${booking.clientAvatar}" alt="${booking.clientName}" width="30" height="30">
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

// Load earnings data from completed bookings
async function loadEarnings() {
    showLoading('transactionsList');
    try {
        const allBookings = await window.api.getProviderBookings('all');
        const bookings = Array.isArray(allBookings) ? allBookings : [];
        const completed = bookings.filter(b => b.status === 'completed');
        const totalEarnings = completed.reduce((sum, b) => sum + (parseFloat(b.service_price || b.price || b.total_price || 0)), 0);

        document.getElementById('totalEarningsAmount').textContent = `P${totalEarnings.toLocaleString()}`;

        // Update earnings sub-stats
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        const completedJobsEl = document.getElementById('completedJobsCount');
        const avgPerJobEl = document.getElementById('avgPerJob');
        const cancellationRateEl = document.getElementById('cancellationRate');
        if (completedJobsEl) completedJobsEl.textContent = completed.length;
        if (avgPerJobEl) avgPerJobEl.textContent = completed.length ? `P${(totalEarnings / completed.length).toFixed(2)}` : 'P0';
        if (cancellationRateEl) cancellationRateEl.textContent = bookings.length ? `${Math.round((cancelled.length / bookings.length) * 100)}%` : '0%';

        initializeEarningsBreakdownChart();

        // Show completed bookings as transactions
        const transactions = completed.map(b => ({
            service: b.service_title || 'Service',
            client: b.customer_name || 'Client',
            amount: parseFloat(b.service_price || b.price || b.total_price || 0),
            date: b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            status: 'completed'
        }));
        renderTransactions(transactions);
    } catch (error) {
        console.warn('Could not load earnings data:', error.message);
        document.getElementById('totalEarningsAmount').textContent = 'P0';
        initializeEarningsBreakdownChart();
        renderTransactions([]);
    }
}

// Render transactions
function renderTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h3>No transactions</h3>
                <p>You don't have any transactions yet</p>
            </div>
        `;
        return;
    }
    
    transactionsList.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-service">${transaction.service}</div>
                <div class="transaction-client">${transaction.client}</div>
            </div>
            <div class="transaction-amount">P${transaction.amount}</div>
            <div class="transaction-date">${transaction.date}</div>
            <div class="transaction-status success">${transaction.status}</div>
        </div>
    `).join('');
}

// Initialize earnings chart
function initializeEarningsChart() {
    const ctx = document.getElementById('earningsChart').getContext('2d');
    
    // Sample data - in a real app, this would come from the API
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Earnings',
            data: [1200, 1900, 1500, 2000, 1800, 2200],
            backgroundColor: 'rgba(67, 97, 238, 0.2)',
            borderColor: 'rgba(67, 97, 238, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Initialize earnings breakdown chart
function initializeEarningsBreakdownChart(earningsData) {
    const ctx = document.getElementById('earningsBreakdownChart').getContext('2d');
    
    // Sample data - in a real app, this would come from the API
    const data = {
        labels: ['Home Cleaning', 'Carpet Cleaning', 'Window Cleaning', 'Deep Cleaning'],
        datasets: [{
            data: [65, 25, 15, 10],
            backgroundColor: [
                'rgba(67, 97, 238, 0.8)',
                'rgba(103, 114, 229, 0.8)',
                'rgba(135, 131, 221, 0.8)',
                'rgba(167, 148, 212, 0.8)'
            ],
            borderWidth: 0
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right'
            }
        },
        cutout: '70%'
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: options
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
            loadBookings();
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
    
    // Period selectors
    const periodSelectors = document.querySelectorAll('select[id$="Period"]');
    periodSelectors.forEach(select => {
        select.addEventListener('change', () => {
            // In a real app, this would reload data for the selected period
            console.log(`Period changed to ${select.value}`);
        });
    });
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
                    <div class="booking-client">
                        <img src="${booking.clientAvatar}" alt="${booking.clientName}">
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
                </div>
            ` : ''}
            ${booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'upcoming' ? `
                <div class="booking-actions">
                    <button class="primary-btn" onclick="completeBooking('${booking.id}')">
                        <i class="fas fa-check"></i>
                        Mark as Completed
                    </button>
                    <button class="cancel-btn" onclick="cancelBooking('${booking.id}')">
                        <i class="fas fa-times"></i>
                        Decline
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    openModal('bookingDetailsModal');
}

// Accept/confirm booking (sets status to 'confirmed' – triggers customer-side inDrive acceptance)
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
            const res = await fetch(`http://localhost:5000/api/user/${currentUser.id}`, {
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
            container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center;color:#999;"><i class="fas fa-star" style="font-size:2rem;margin-bottom:8px;"></i><p>No reviews yet</p></div>';
            return;
        }

        container.innerHTML = reviews.map(r => {
            const stars = '<i class="fas fa-star" style="color:#f5a623;"></i>'.repeat(r.rating) + '<i class="far fa-star" style="color:#ddd;"></i>'.repeat(5 - r.rating);
            const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            return `
                <div style="padding:16px;border:1px solid #eee;border-radius:10px;margin-bottom:12px;background:#fff;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <img src="${r.customer_avatar || 'https://via.placeholder.com/36?text=C'}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.95rem;">${r.customer_name || 'Customer'}</div>
                            <div style="font-size:0.8rem;color:#aaa;">${date}</div>
                        </div>
                        <div style="font-size:0.95rem;">${stars}</div>
                    </div>
                    ${r.comment ? `<p style="margin:0;color:#555;font-size:0.9rem;line-height:1.5;">${r.comment}</p>` : '<p style="margin:0;color:#bbb;font-style:italic;font-size:0.85rem;">No comment</p>'}
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
            if (!silent) container.innerHTML = '<div class="empty-state" style="padding:40px 16px;text-align:center;color:#999;"><i class="fas fa-comments" style="font-size:2rem;margin-bottom:8px;"></i><p>No conversations yet</p></div>';
            return;
        }

        container.innerHTML = convos.map(c => `
            <div class="convo-item" data-user-id="${c.user_id}" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;transition:background 0.15s;${_activeChatUserId === c.user_id ? 'background:#e8e0f7;' : ''}" onmouseover="this.style.background='#f0ecf9'" onmouseout="this.style.background='${_activeChatUserId === c.user_id ? '#e8e0f7' : ''}'">
                <img src="${c.user_avatar || 'https://via.placeholder.com/40?text=U'}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.user_name}</div>
                    <div style="font-size:0.8rem;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.is_mine ? 'You: ' : ''}${c.last_message}</div>
                </div>
                <div style="font-size:0.7rem;color:#aaa;white-space:nowrap;">${_timeAgo(c.last_message_at)}</div>
            </div>
        `).join('');

        container.querySelectorAll('.convo-item').forEach(el => {
            el.addEventListener('click', () => {
                const uid = el.getAttribute('data-user-id');
                const name = el.querySelector('div[style*="font-weight:600"]').textContent;
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
            return `<div style="max-width:70%;padding:10px 14px;border-radius:16px;font-size:0.9rem;line-height:1.4;word-wrap:break-word;${isMine ? 'align-self:flex-end;background:#e91e8c;color:#fff;border-bottom-right-radius:4px;' : 'align-self:flex-start;background:#f0f0f0;color:#333;border-bottom-left-radius:4px;'}">
                ${m.content}
                <div style="font-size:0.65rem;margin-top:4px;opacity:0.7;text-align:${isMine ? 'right' : 'left'};">${_timeAgo(m.created_at)}</div>
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
    const msgLink = document.querySelector('.nav-link[data-section="messages"]');
    if (msgLink) msgLink.classList.add('active');
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
window.completeBooking = completeBooking;
window.cancelBooking = cancelBooking;