// Provider Dashboard JavaScript - ServiceHub
async function loadWalletBalance() {
    const token = localStorage.getItem("token"); // stored on login
    if (!token) {
      console.error("No token found.");
      return;
    }
  
    try {
      const res = await fetch("http://localhost:5000/api/wallet/balance", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
  
      if (res.ok) {
        document.getElementById("wallet-address").textContent = data.public_key;
        document.getElementById("wallet-balance").textContent = `${data.balance.toFixed(2)} XLM`;
      } else {
        document.getElementById("wallet-balance").textContent = "Error loading balance";
        console.error(data);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  }
  
  window.addEventListener("load", loadWalletBalance);
  
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the API to be loaded
    setTimeout(async () => {
        try {
            // Check if user is authenticated
            if (!window.auth || !window.auth.isLoggedIn()) {
                // User is not logged in, redirect to login
                window.location.href = 'index.html';
                return;
            }
            
            // Check the actual user type; only redirect if we are CERTAIN user is not a provider
            const currentUser = await window.auth.getCurrentUser();
            if (currentUser && currentUser.user_type !== 'provider') {
                // User is not a provider, redirect to customer dashboard
                if (!window.location.pathname.includes('dashboard.html')) {
                    window.location.href = 'dashboard.html';
                    return;
                }
            }
            
            // Initialize dashboard
            initializeDashboard();
            setupNavigation();
            setupModals();
            loadUserData();
            loadDashboardData();
            setupEventListeners();
        } catch (error) {
            console.error('Authentication check failed:', error);
            // Don't redirect on error to prevent blinking loops; show a message instead
            try { showNotification('Unable to verify session. Please refresh.', 'error'); } catch (_) {}
        }
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
let currentGoods = [];
// (reverted) removed provider lending demo

// Sample data - in a real app, this would come from the API
const sampleServices = [
    {
        id: 1,
        title: 'Professional Home Cleaning',
        description: 'Thorough cleaning of your entire home by experienced professionals.',
        category: 'home',
        price: 120,
        duration: '2-3 hours',
        rating: 4.8,
        bookings: 42,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format'
    },
    {
        id: 2,
        title: 'Deep Carpet Cleaning',
        description: 'Specialized carpet cleaning using eco-friendly products.',
        category: 'home',
        price: 150,
        duration: '2-4 hours',
        rating: 4.7,
        bookings: 28,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&auto=format'
    }
];

const sampleBookings = [
    {
        id: 1,
        serviceId: 1,
        serviceName: 'Professional Home Cleaning',
        clientName: 'John Doe',
        clientAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        date: '2024-03-20',
        time: '10:00',
        status: 'upcoming',
        price: 120,
        notes: 'Please focus on kitchen and bathrooms'
    },
    {
        id: 2,
        serviceId: 1,
        serviceName: 'Professional Home Cleaning',
        clientName: 'Emily Smith',
        clientAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
        date: '2024-03-18',
        time: '14:00',
        status: 'completed',
        price: 120,
        notes: 'Pet-friendly cleaning products please'
    },
    {
        id: 3,
        serviceId: 2,
        serviceName: 'Deep Carpet Cleaning',
        clientName: 'Michael Brown',
        clientAvatar: 'https://randomuser.me/api/portraits/men/45.jpg',
        date: '2024-03-15',
        time: '11:00',
        status: 'completed',
        price: 150,
        notes: 'Living room and hallway only'
    }
];

const sampleTransactions = [
    {
        id: 1,
        service: 'Professional Home Cleaning',
        date: 'March 18, 2024',
        amount: 120,
        status: 'completed',
        client: 'Emily Smith'
    },
    {
        id: 2,
        service: 'Deep Carpet Cleaning',
        date: 'March 15, 2024',
        amount: 150,
        status: 'completed',
        client: 'Michael Brown'
    },
    {
        id: 3,
        service: 'Professional Home Cleaning',
        date: 'March 10, 2024',
        amount: 120,
        status: 'completed',
        client: 'Robert Johnson'
    }
];

// Sample goods (AI-generated images via picsum/photos & unsplash)
const sampleGoods = [
    {
        id: 101,
        title: 'Eco Multi-Surface Cleaner',
        description: 'Plant-based formula for streak-free shine on most surfaces.',
        price: 14.99,
        stock: 64,
        image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&auto=format&fit=crop'
    },
    {
        id: 102,
        title: 'Microfiber Towel Pack (5)',
        description: 'Ultra-soft, lint-free towels safe for delicate finishes.',
        price: 11.50,
        stock: 150,
        image: 'https://images.unsplash.com/photo-1595433707802-6b2626ef95b9?w=800&auto=format&fit=crop'
    },
    {
        id: 103,
        title: 'Heavy-Duty Scrub Brush',
        description: 'Ergonomic grip with durable bristles for deep cleaning.',
        price: 8.25,
        stock: 89,
        image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&auto=format&fit=crop'
    },
    {
        id: 104,
        title: 'Natural Air Freshener',
        description: 'Non-toxic essential oil blend for long-lasting freshness.',
        price: 9.75,
        stock: 120,
        image: 'https://images.unsplash.com/photo-1592945403244-b3fb9b1b1eb8?w=800&auto=format&fit=crop'
    }
];

// Initialize dashboard
function initializeDashboard() {
    // Load user data from localStorage or API
    const storedUser = localStorage.getItem('currentProvider');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
    
    updateUserDisplay();
    showSection('dashboard');
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
        showNotification('Failed to load user data. Please refresh the page.', 'error');
        
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
        case 'goods':
            loadGoods();
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
        case 'support':
            // Support section is static
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Fetch provider dashboard stats from API
        const stats = await window.api.request('/provider/dashboard/stats');
        
        // Update stats with real data
        document.getElementById('upcomingBookingsCount').textContent = stats.pending_bookings || 0;
        document.getElementById('monthlyEarnings').textContent = `P${stats.total_earnings || 0}`;
        document.getElementById('averageRating').textContent = stats.average_rating ? stats.average_rating.toFixed(1) : '0.0';
        document.getElementById('totalClients').textContent = stats.completed_bookings || 0;
        
        // Fetch recent bookings
        const recentBookings = await window.api.request('/provider/dashboard/recent-bookings?limit=3');
        renderRecentBookings(recentBookings);
        
        // Initialize charts with real data
        initializeEarningsChart();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Fallback to demo data if API fails
        const upcomingBookings = sampleBookings.filter(b => b.status === 'upcoming').length;
        const monthlyEarnings = sampleBookings
            .filter(b => b.status === 'completed')
            .reduce((sum, booking) => sum + booking.price, 0);
        
        document.getElementById('upcomingBookingsCount').textContent = upcomingBookings;
        document.getElementById('monthlyEarnings').textContent = `P${monthlyEarnings}`;
        document.getElementById('averageRating').textContent = '4.8';
        document.getElementById('totalClients').textContent = sampleBookings.length;
        
        renderRecentBookings(sampleBookings.slice(0, 3));
        initializeEarningsChart();
    }
}

// Load services (prefer API, fall back to demo)
async function loadServices() {
    try {
        if (window.auth && window.auth.isLoggedIn()) {
            // Use the new provider dashboard services endpoint
            const apiServices = await window.api.request('/provider/dashboard/services');
            if (Array.isArray(apiServices)) {
                currentServices = apiServices.map(s => ({
                    id: s.id,
                    title: s.title,
                    description: s.description || '',
                    category: s.category || 'other',
                    price: s.price,
                    duration: s.duration || '',
                    rating: s.average_rating || 0,
                    bookings: s.booking_count || 0,
                    reviews: s.review_count || 0,
                    status: s.status || 'active',
                    image: s.image || 'https://via.placeholder.com/80?text=Service'
                }));
                renderServices(currentServices);
                return;
            }
        }
    } catch (error) {
        console.warn('Failed to load services from API, using demo data:', error.message);
    }
    
    // Fallback to demo data
    currentServices = sampleServices;
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
                        <td>$${service.price}</td>
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

// Load goods (demo with search filter)
async function loadGoods() {
    try {
        // If there is an API in future: prefer it here
        // const apiGoods = await window.api.getProviderGoods?.();
        // if (Array.isArray(apiGoods)) { currentGoods = apiGoods; renderGoods(currentGoods); return; }
    } catch (error) {
        console.warn('Failed to load goods from API, using demo data:', error.message);
    }

    const queryInput = document.getElementById('goodsSearch');
    const query = (queryInput?.value || '').trim().toLowerCase();
    const data = sampleGoods.filter(g =>
        !query || g.title.toLowerCase().includes(query) || g.description.toLowerCase().includes(query)
    );
    currentGoods = data;
    renderGoods(currentGoods);
}

// Render goods grid
function renderGoods(goods) {
    const grid = document.getElementById('goodsGrid');
    if (!grid) return;

    if (goods.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No goods found</h3>
                <p>Add your first product to start selling</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = goods.map(g => `
        <div class="good-card">
            <img class="good-image" src="${g.image}" alt="${g.title}">
            <div class="good-content">
                <div class="good-title">${g.title}</div>
                <div class="good-desc">${g.description}</div>
                <div class="good-meta">
                    <div class="good-price">$${g.price.toFixed(2)}</div>
                    <div class="good-stock">Stock: ${g.stock}</div>
                </div>
                <div class="good-actions">
                    <button class="outline-btn edit-good-btn" data-good-id="${g.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="outline-btn delete-good-btn" data-good-id="${g.id}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.edit-good-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-good-id'));
            editGood(id);
        });
    });
    document.querySelectorAll('.delete-good-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-good-id'));
            deleteGood(id);
        });
    });
}

function editGood(goodId) {
    const good = sampleGoods.find(g => g.id === goodId);
    if (!good) return;
    showNotification('Edit good functionality would be implemented here', 'info');
}

function deleteGood(goodId) {
    if (confirm('Are you sure you want to delete this product?')) {
        const index = sampleGoods.findIndex(g => g.id === goodId);
        if (index !== -1) {
            sampleGoods.splice(index, 1);
            loadGoods();
            showNotification('Product deleted', 'success');
        }
    }
}

// Load bookings (prefer API, fall back to demo)
async function loadBookings() {
    try {
        if (window.auth && window.auth.isLoggedIn()) {
            // Map API bookings to UI shape
            const apiBookings = await window.api.getProviderBookings(activeTab === 'upcoming' ? 'upcoming' : activeTab);
            if (Array.isArray(apiBookings)) {
                const mapped = apiBookings.map(b => ({
                    id: b.id,
                    serviceName: b.service_title || 'Service',
                    clientName: b.customer_name || 'Client',
                    clientAvatar: b.customer_avatar || 'https://via.placeholder.com/40?text=C',
                    date: b.date,
                    time: b.time,
                    status: b.status,
                    price: b.price || 0
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
    }

    // Fallback to demo data
    let filteredBookings = sampleBookings;
    if (activeTab !== 'all') {
        filteredBookings = sampleBookings.filter(booking => booking.status === activeTab);
    }
    currentBookings = filteredBookings;
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
                        <td>$${booking.price}</td>
                        <td>
                            <span class="status-badge ${booking.status}">${booking.status}</span>
                        </td>
                        <td>
                            <button class="action-btn view-booking-btn" data-booking-id="${booking.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${booking.status === 'upcoming' ? `
                                <button class="action-btn complete-booking-btn" data-booking-id="${booking.id}">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="action-btn cancel-booking-btn" data-booking-id="${booking.id}">
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
            const bookingId = parseInt(e.currentTarget.getAttribute('data-booking-id'));
            viewBookingDetails(bookingId);
        });
    });
    
    document.querySelectorAll('.complete-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = parseInt(e.currentTarget.getAttribute('data-booking-id'));
            completeBooking(bookingId);
        });
    });
    
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = parseInt(e.currentTarget.getAttribute('data-booking-id'));
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

// Load earnings data
async function loadEarnings() {
    try {
        // Fetch earnings data from API
        const earningsData = await window.api.request('/provider/dashboard/earnings');
        
        if (Array.isArray(earningsData) && earningsData.length > 0) {
            // Update total earnings with real data
            const totalEarnings = earningsData.reduce((sum, month) => sum + (month.earnings || 0), 0);
            document.getElementById('totalEarningsAmount').textContent = `P${totalEarnings.toLocaleString()}`;
            
            // Update earnings breakdown chart with real data
            initializeEarningsBreakdownChart(earningsData);
            
            // Update transactions list with real data (you might need another endpoint for this)
            // For now, we'll keep the sample transactions
            renderTransactionsList(sampleTransactions);
            
            return;
        }
    } catch (error) {
        console.error('Error loading earnings data:', error);
    }
    
    // Fallback to demo data
    const totalEarnings = sampleTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    document.getElementById('totalEarningsAmount').textContent = `P${totalEarnings}`;
    
    initializeEarningsBreakdownChart();
    renderTransactionsList(sampleTransactions);
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
            <div class="transaction-amount">$${transaction.amount}</div>
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
        });
    }
    
    // Add new service button
    const addNewServiceBtn = document.getElementById('addNewServiceBtn');
    if (addNewServiceBtn) {
        addNewServiceBtn.addEventListener('click', () => {
            openModal('addServiceModal');
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('serviceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadServices, 300));
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('Logout button found and event listener added');
        logoutBtn.addEventListener('click', (e) => {
            console.log('Logout button clicked');
            e.preventDefault();
            logout();
        });
    } else {
        console.error('Logout button not found!');
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
    
    // Goods: add button
    const addNewGoodBtn = document.getElementById('addNewGoodBtn');
    if (addNewGoodBtn) {
        addNewGoodBtn.addEventListener('click', () => {
            showNotification('Add Good form coming soon', 'info');
        });
    }
    
    // Goods: search input
    const goodsSearch = document.getElementById('goodsSearch');
    if (goodsSearch) {
        goodsSearch.addEventListener('input', debounce(loadGoods, 300));
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
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// View booking details
function viewBookingDetails(bookingId) {
    const booking = sampleBookings.find(b => b.id === bookingId);
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
                    <span>$${booking.price}</span>
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
            
            ${booking.status === 'upcoming' ? `
                <div class="booking-actions">
                    <button class="primary-btn" onclick="completeBooking(${booking.id})">
                        <i class="fas fa-check"></i>
                        Mark as Completed
                    </button>
                    <button class="cancel-btn" onclick="cancelBooking(${booking.id})">
                        <i class="fas fa-times"></i>
                        Cancel Booking
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    openModal('bookingDetailsModal');
}

// Complete booking
function completeBooking(bookingId) {
    const booking = sampleBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    if (confirm('Mark this booking as completed?')) {
        booking.status = 'completed';
        closeModal('bookingDetailsModal');
        loadBookings();
        loadDashboardData();
        showNotification('Booking marked as completed', 'success');
    }
}

// Cancel booking
function cancelBooking(bookingId) {
    const booking = sampleBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    if (confirm('Are you sure you want to cancel this booking?')) {
        booking.status = 'cancelled';
        closeModal('bookingDetailsModal');
        loadBookings();
        loadDashboardData();
        showNotification('Booking cancelled', 'success');
    }
}

// Edit service
function editService(serviceId) {
    const service = sampleServices.find(s => s.id === serviceId);
    if (!service) return;
    
    // In a real app, this would open an edit modal with the service data
    console.log('Editing service:', service);
    showNotification('Edit service functionality would be implemented here', 'info');
}

// Delete service
function deleteService(serviceId) {
    if (confirm('Are you sure you want to delete this service? This cannot be undone.')) {
        // In a real app, this would call the API to delete the service
        const index = sampleServices.findIndex(s => s.id === serviceId);
        if (index !== -1) {
            sampleServices.splice(index, 1);
            loadServices();
            showNotification('Service deleted', 'success');
        }
    }
}

// Handle add service
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

    // Try creating via API so customers can see it
    if (window.auth && window.auth.isLoggedIn()) {
        try {
            await window.services.create({
                title,
                description,
                category,
                price: parseFloat(price),
                duration: duration === 'custom' ? 'Custom' : `${duration} minutes`
            });
            closeModal('addServiceModal');
            showNotification('Service created successfully', 'success');
            await loadServices();
            e.target.reset();
            return;
        } catch (error) {
            console.error('Failed to create service via API, saving locally:', error);
        }
    }

    // Fallback local insert
    const newService = {
        id: Date.now(),
        title,
        category,
        price: parseFloat(price),
        duration: duration === 'custom' ? 'Custom' : `${duration} minutes`,
        description,
        rating: 0,
        bookings: 0,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format'
    };
    sampleServices.unshift(newService);
    closeModal('addServiceModal');
    showNotification('Service created locally (demo mode)', 'success');
    loadServices();
    e.target.reset();
}

// Update profile
function updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const phone = document.getElementById('profilePhone').value;
    const location = document.getElementById('profileLocation').value;
    const businessName = document.getElementById('businessName').value;
    const businessDescription = document.getElementById('businessDescription').value;
    
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