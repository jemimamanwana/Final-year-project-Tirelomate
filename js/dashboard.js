// Dashboard JavaScript - ServiceHub

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the API to be loaded
    setTimeout(async () => {
        try {
            // Check if user is authenticated
            if (!window.auth || !window.auth.isLoggedIn()) {
                // User is not logged in, redirect to login page
                window.location.href = 'index.html';
                return;
            }
            
            // Check if user is a provider - but only redirect if we're not already on the right page
            const isProvider = await window.auth.isProvider();
            if (isProvider) {
                // User is a provider, redirect to provider dashboard
                // But only if we're not already there to prevent redirect loops
                if (!window.location.pathname.includes('Services-provider-dashboard.html')) {
                    window.location.href = 'Services-provider-dashboard.html';
                    return;
                }
            }
            
            // Initialize dashboard
            initializeDashboard();
            setupNavigation();
            setupModals();
            loadUserData();
            loadServices();
            loadBookings();
            setupEventListeners();
        } catch (error) {
            console.error('Authentication check failed:', error);
            // Don't redirect on error to avoid loops
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
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
};

let currentServices = [];
let currentBookings = [];
let activeCategory = 'all';
let activeTab = 'upcoming';
let goodsData = [];
const RECENT_SERVICE_SEARCH_KEY = 'recent_service_searches';

// (reverted) removed lending demo data

// Services data (fallback demo). Real data is fetched from API on load
let servicesData = [
    {
        id: 1,
        title: 'Professional Home Cleaning',
        description: 'Thorough cleaning of your entire home by experienced professionals. We cover all areas including living rooms, bedrooms, kitchens, and bathrooms.',
        category: 'home',
        price: 120,
        rating: 4.8,
        reviews: 42,
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format',
        provider: {
            name: 'CleanPro Services',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            rating: 4.9,
            completedJobs: 156
        },
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        duration: '2-3 hours'
    },
    {
        id: 2,
        title: 'Website Development',
        description: 'Custom website development using modern technologies. From simple blogs to complex web applications, we build solutions tailored to your needs.',
        category: 'tech',
        price: 800,
        rating: 4.9,
        reviews: 36,
        image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&auto=format',
        provider: {
            name: 'WebCraft Solutions',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            rating: 4.8,
            completedJobs: 89
        },
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        duration: '1-4 weeks'
    },
    {
        id: 3,
        title: 'Math Tutoring',
        description: 'Experienced tutor for all levels of mathematics. Personalized lessons to help students understand concepts and improve grades.',
        category: 'education',
        price: 50,
        rating: 4.7,
        reviews: 28,
        image: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&auto=format',
        provider: {
            name: 'EduMasters',
            avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
            rating: 4.9,
            completedJobs: 234
        },
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        duration: '1 hour'
    },
    {
        id: 4,
        title: 'Graphic Design',
        description: 'Professional logo and branding design services. We create memorable visual identities that represent your brand effectively.',
        category: 'creative',
        price: 250,
        rating: 4.6,
        reviews: 15,
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format',
        provider: {
            name: 'Visual Impact Studio',
            avatar: 'https://randomuser.me/api/portraits/women/25.jpg',
            rating: 4.7,
            completedJobs: 67
        },
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        duration: '3-7 days'
    },
    {
        id: 5,
        title: 'Personal Training',
        description: 'Custom fitness programs tailored to your goals. Achieve your health objectives with personalized coaching and support.',
        category: 'health',
        price: 75,
        rating: 4.8,
        reviews: 27,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format',
        provider: {
            name: 'Peak Performance',
            avatar: 'https://randomuser.me/api/portraits/men/15.jpg',
            rating: 4.8,
            completedJobs: 178
        },
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        duration: '1 hour'
    },
    {
        id: 6,
        title: 'Garden Landscaping',
        description: 'Transform your outdoor space with professional landscaping services. From design to implementation, we create beautiful gardens.',
        category: 'home',
        price: 200,
        rating: 4.5,
        reviews: 19,
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format',
        provider: {
            name: 'Green Thumb Landscaping',
            avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
            rating: 4.6,
            completedJobs: 92
        },
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        duration: '1-2 days'
    }
];

// Bookings data
const bookingsData = [
    {
        id: 1,
        serviceId: 1,
        serviceName: 'Professional Home Cleaning',
        providerName: 'CleanPro Services',
        date: '2024-03-20',
        time: '10:00',
        status: 'upcoming',
        price: 120,
        notes: 'Please focus on kitchen and bathrooms'
    },
    {
        id: 2,
        serviceId: 3,
        serviceName: 'Math Tutoring',
        providerName: 'EduMasters',
        date: '2024-03-15',
        time: '16:00',
        status: 'completed',
        price: 50,
        notes: 'Algebra and geometry help needed'
    },
    {
        id: 3,
        serviceId: 5,
        serviceName: 'Personal Training',
        providerName: 'Peak Performance',
        date: '2024-03-10',
        time: '18:00',
        status: 'cancelled',
        price: 75,
        notes: 'Cancelled due to scheduling conflict'
    }
];

// Initialize dashboard
function initializeDashboard() {
    // Load user data from localStorage or API
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
    
    updateUserDisplay();
    showSection('services');
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
    }
}

// Navigation setup
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
        case 'services':
            loadServices();
            break;
        case 'lending':
            // static section; no loaders needed
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'payments':
            // Load payment data if needed
            break;
        case 'profile':
            // Profile is already loaded
            break;
        case 'support':
            // Support section is static
            break;
        case 'games':
            // Games section is static content
            break;
        
    }
}

// (reverted) removed lending functions

// Load services (prefer API, fall back to demo)
async function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;

    try {
        // Fetch from API
        const category = activeCategory;
        const search = document.getElementById('serviceSearch')?.value || '';
        const apiServices = await window.services.getAll(category, search);
        if (Array.isArray(apiServices) && apiServices.length) {
            // Map API fields to UI shape
            const apiMapped = apiServices.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description || '',
                category: s.category || 'other',
                price: s.price,
                rating: s.rating || 4.7,
                reviews: s.reviews_count || 0,
                image: s.image || 'https://via.placeholder.com/600x400?text=Service+Image',
                provider: {
                    name: s.provider_name || 'Service Provider',
                    avatar: s.provider_avatar || 'https://via.placeholder.com/100?text=SP'
                },
                availability: [],
                duration: s.duration || ''
            }));

            // Merge demo and API services, dedupe by id (prefer API)
            const byId = new Map();
            servicesData.forEach(s => byId.set(s.id, s));
            apiMapped.forEach(s => byId.set(s.id, s));
            servicesData = Array.from(byId.values());
        }
    } catch (error) {
        console.warn('Falling back to demo services due to API error:', error.message);
    }
    
    // Filter services by category
    let filteredServices = servicesData;
    if (activeCategory !== 'all') {
        filteredServices = servicesData.filter(service => service.category === activeCategory);
    }
    
    // Search filter with ranking for better precision
    const rawSearch = document.getElementById('serviceSearch')?.value || '';
    const searchTerm = rawSearch.toLowerCase().trim();
    if (searchTerm) {
        const scored = [];
        for (const service of filteredServices) {
            const title = (service.title || '').toLowerCase();
            const desc = (service.description || '').toLowerCase();
            let score = 0;
            if (title === searchTerm) score += 100; // exact title match
            if (title.includes(searchTerm)) score += 60; // title contains phrase
            if (desc.includes(searchTerm)) score += 40; // description contains phrase
            if (score > 0) scored.push({ service, score });
        }
        // If no phrase matches, fall back to token AND matching
        if (scored.length === 0) {
            const tokens = searchTerm.split(/\s+/).filter(Boolean);
            for (const service of filteredServices) {
                const blob = `${(service.title||'').toLowerCase()} ${(service.description||'').toLowerCase()}`;
                const allPresent = tokens.every(t => blob.includes(t));
                if (allPresent) {
                    let score = 10 * tokens.length;
                    // small boost if tokens are in title
                    const inTitle = tokens.filter(t => (service.title||'').toLowerCase().includes(t)).length;
                    score += inTitle * 5;
                    scored.push({ service, score });
                }
            }
        }
        scored.sort((a, b) => b.score - a.score);
        filteredServices = scored.map(s => s.service);
    }
    
    currentServices = filteredServices;
    renderServices(filteredServices);
}

// Render services
function renderServices(services) {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    
    if (services.length === 0) {
        servicesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No services found</h3>
                <p>Try adjusting your search or category filter</p>
            </div>
        `;
        return;
    }
    
    servicesGrid.innerHTML = '';
    
    services.forEach((service, index) => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.style.animationDelay = `${index * 0.1}s`;
        
        serviceCard.innerHTML = `
            <div class="service-img">
                <img src="${service.image}" alt="${service.title}" loading="lazy">
            </div>
            <div class="service-info">
                <h3>${service.title}</h3>
                <p>${service.description.substring(0, 120)}...</p>
                <div class="service-meta">
                    <div class="price">P${service.price}</div>
                    <div class="rating">
                        ${'★'.repeat(Math.floor(service.rating))}
                        <span>${service.rating} (${service.reviews})</span>
                    </div>
                </div>
                <div class="service-provider">
                    <img src="${service.provider.avatar}" alt="${service.provider.name}" loading="lazy">
                    <span>${service.provider.name}</span>
                </div>
                <button class="primary-btn book-service-btn" data-service-id="${service.id}">
                    <i class="fas fa-calendar-plus"></i>
                    Book Now
                </button>
            </div>
        `;
        
        servicesGrid.appendChild(serviceCard);
        
        // Add click event for booking
        const bookBtn = serviceCard.querySelector('.book-service-btn');
        bookBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openServiceBookingModal(service.id);
        });
    });
    
    // Animate cards
    setTimeout(() => {
        document.querySelectorAll('.service-card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, 100);
}

// Load bookings
function loadBookings() {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    
    // Filter bookings by active tab
    let filteredBookings = bookingsData;
    if (activeTab !== 'all') {
        filteredBookings = bookingsData.filter(booking => booking.status === activeTab);
    }
    
    renderBookings(filteredBookings);
}

// Render bookings
function renderBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    
    if (bookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No ${activeTab} bookings</h3>
                <p>You don't have any ${activeTab} bookings at the moment</p>
            </div>
        `;
        return;
    }
    
    bookingsList.innerHTML = '';
    
    bookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        
        const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const formattedTime = new Date(`2000-01-01T${booking.time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        bookingCard.innerHTML = `
            <div class="booking-header">
                <div>
                    <div class="booking-service">${booking.serviceName}</div>
                    <div class="booking-provider">by ${booking.providerName}</div>
                </div>
                <div class="booking-status ${booking.status}">${booking.status}</div>
            </div>
            <div class="booking-details">
                <div class="booking-detail">
                    <label>Date</label>
                    <span>${formattedDate}</span>
                </div>
                <div class="booking-detail">
                    <label>Time</label>
                    <span>${formattedTime}</span>
                </div>
                <div class="booking-detail">
                    <label>Price</label>
                    <span>${booking.price}</span>
                </div>
            </div>
            ${booking.notes ? `
                <div class="booking-notes">
                    <label>Notes:</label>
                    <p>${booking.notes}</p>
                </div>
            ` : ''}
            ${booking.status === 'upcoming' ? `
                <div class="booking-actions">
                    <button class="reschedule-btn" onclick="rescheduleBooking(${booking.id})">
                        <i class="fas fa-calendar-alt"></i>
                        Reschedule
                    </button>
                    <button class="cancel-btn" onclick="cancelBooking(${booking.id})">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            ` : ''}
        `;
        
        bookingsList.appendChild(bookingCard);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Category filter buttons
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.getAttribute('data-category');
            loadServices();
        });
    });
    
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
    
    // Search functionality
    const searchInput = document.getElementById('serviceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadServices, 300));
    }

    // Goods search
    const goodsSearch = document.getElementById('goodsSearch');
    if (goodsSearch) {
        goodsSearch.addEventListener('input', debounce(loadGoods, 300));
    }

    // Attach enhanced search history handlers
    attachServiceSearchHandlers();
    
    // Quick book button
    const quickBookBtn = document.getElementById('quickBookBtn');
    if (quickBookBtn) {
        quickBookBtn.addEventListener('click', () => {
            openModal('quickBookModal');
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Profile form
    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    // Quick book form
    const quickBookForm = document.getElementById('quickBookForm');
    if (quickBookForm) {
        quickBookForm.addEventListener('submit', handleQuickBook);
    }
    
    // Support form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleSupportMessage);
    }
}

// Demo goods (AI-generated placeholders via Unsplash)
goodsInit();
function goodsInit() {
    goodsData = [
        {
            id: 1001,
            title: 'Eco Multi-Surface Cleaner',
            description: 'Plant-based cleaner for streak-free shine. Safe and effective.',
            price: 14.99,
            stock: 64,
            image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&auto=format&fit=crop'
        },
        {
            id: 1002,
            title: 'Microfiber Towel Pack (5)',
            description: 'Ultra-soft, lint-free towels. Perfect for delicate finishes.',
            price: 11.50,
            stock: 150,
            image: 'https://images.unsplash.com/photo-1595433707802-6b2626ef95b9?w=800&auto=format&fit=crop'
        },
        {
            id: 1003,
            title: 'Heavy-Duty Scrub Brush',
            description: 'Ergonomic grip and durable bristles for deep cleaning.',
            price: 8.25,
            stock: 89,
            image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&auto=format&fit=crop'
        },
        {
            id: 1004,
            title: 'Natural Air Freshener',
            description: 'Non-toxic essential oil blend; long-lasting freshness.',
            price: 9.75,
            stock: 120,
            image: 'https://images.unsplash.com/photo-1592945403244-b3fb9b1b1eb8?w=800&auto=format&fit=crop'
        }
    ];
}

// Load goods
function loadGoods() {
    const grid = document.getElementById('goodsGrid');
    if (!grid) return;

    const query = (document.getElementById('goodsSearch')?.value || '').trim().toLowerCase();
    let filtered = goodsData;
    if (query) {
        filtered = goodsData.filter(g => g.title.toLowerCase().includes(query) || g.description.toLowerCase().includes(query));
    }
    renderGoods(filtered);
}

// Render goods
function renderGoods(goods) {
    const grid = document.getElementById('goodsGrid');
    if (!grid) return;

    if (goods.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No goods found</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = goods.map(g => `
        <div class="good-card">
            <div class="good-img"><img src="${g.image}" alt="${g.title}" loading="lazy"></div>
            <div class="good-info">
                <div class="good-title">${g.title}</div>
                <div class="good-desc">${g.description}</div>
                <div class="good-meta">
                    <div class="good-price">P${g.price.toFixed(2)}</div>
                    <div class="good-stock">Stock: ${g.stock}</div>
                </div>
                <div class="good-actions">
                    <button class="outline-btn" data-good-id="${g.id}" onclick="openPurchaseGood(${g.id})"><i class="fas fa-shopping-cart"></i> Buy</button>
                    <button class="primary-btn" data-good-id="${g.id}" onclick="openPurchaseGood(${g.id})"><i class="fas fa-bolt"></i> Quick Buy</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Purchase modal
function openPurchaseGood(goodId) {
    const good = goodsData.find(g => g.id === goodId);
    if (!good) return;

    const container = document.getElementById('purchaseGoodContent');
    if (!container) return;

    container.innerHTML = `
        <div class="service-booking-header">
            <div class="service-booking-img"><img src="${good.image}" alt="${good.title}"></div>
            <div>
                <h3>${good.title}</h3>
                <p class="good-desc">${good.description}</p>
                <div class="good-meta" style="margin: 10px 0 20px;">
                    <div class="good-price" style="font-size:1.2rem;">P${good.price.toFixed(2)}</div>
                    <div class="good-stock">In stock: ${good.stock}</div>
                </div>
            </div>
        </div>
        <form id="purchaseGoodForm" class="booking-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="goodQuantity">Quantity</label>
                    <input type="number" id="goodQuantity" min="1" max="${good.stock}" value="1" required>
                </div>
                <div class="form-group">
                    <label for="goodAddress">Delivery Address</label>
                    <input type="text" id="goodAddress" placeholder="Street, City" required>
                </div>
            </div>
            <div class="form-group">
                <label for="goodNotes">Notes (optional)</label>
                <textarea id="goodNotes" rows="3" placeholder="Delivery notes..."></textarea>
            </div>
            <button type="submit" class="primary-btn"><i class="fas fa-credit-card"></i> Pay & Place Order</button>
        </form>
    `;

    openModal('purchaseGoodModal');

    const form = document.getElementById('purchaseGoodForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handlePurchaseGood(goodId);
    });
}

async function handlePurchaseGood(goodId) {
    const good = goodsData.find(g => g.id === goodId);
    if (!good) return;

    const qty = Math.max(1, parseInt(document.getElementById('goodQuantity').value || '1'));
    if (qty > good.stock) {
        showNotification('Requested quantity exceeds available stock', 'error');
        return;
    }

    const address = document.getElementById('goodAddress').value.trim();
    const notes = document.getElementById('goodNotes').value.trim();
    if (!address) {
        showNotification('Please enter delivery address', 'error');
        return;
    }

    // TODO: integrate with real API when available
    // Simulate success
    good.stock -= qty;
    closeModal('purchaseGoodModal');
    showNotification(`Order placed for ${qty} × ${good.title}. Total P${(qty * good.price).toFixed(2)}.`, 'success');
    // Refresh goods list to reflect new stock
    if (document.querySelector('#goods-section.active')) {
        loadGoods();
    }
}

// Expose purchase function for inline handlers
window.openPurchaseGood = openPurchaseGood;

// Modal functions
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

// Service booking modal
function openServiceBookingModal(serviceId) {
    const service = servicesData.find(s => s.id === serviceId);
    if (!service) return;
    
    const modalContent = document.getElementById('serviceBookingContent');
    if (!modalContent) return;
    
    // Find other services by the same provider to display beside their avatar
    const providerServices = servicesData
        .filter(s => s.provider.name === service.provider.name)
        .map(s => s.title);
    
    modalContent.innerHTML = `
        <div class="service-booking-header">
            <div class="service-booking-img">
                <img src="${service.image}" alt="${service.title}">
            </div>
            <div class="service-booking-info">
                <h3>${service.title}</h3>
                <div class="provider-info">
                    <img src="${service.provider.avatar}" alt="${service.provider.name}">
                    <div>
                        <div class="provider-name">${service.provider.name}</div>
                        <div class="provider-rating">
                            ${'★'.repeat(Math.floor(service.provider.rating))} 
                            ${service.provider.rating} • ${service.provider.completedJobs} jobs completed
                        </div>
                        <div class="provider-services">
                            ${providerServices.map(title => `
                                <span class="provider-service-chip">${title}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="service-price">P${service.price}</div>
            </div>
        </div>
        
        <form class="booking-form" id="bookingForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="bookingDate">Select Date</label>
                    <input type="date" id="bookingDate" required min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="bookingTime">Select Time</label>
                    <select id="bookingTime" required>
                        <option value="">Choose time...</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="bookingNotes">Special Requirements (Optional)</label>
                <textarea id="bookingNotes" rows="3" placeholder="Any specific requirements or notes..."></textarea>
            </div>
            
            <div class="booking-summary">
                <div class="summary-row">
                    <span>Service Duration:</span>
                    <span>${service.duration}</span>
                </div>
                <div class="summary-row">
                    <span>Total Cost:</span>
                    <span class="total-price">P${service.price}</span>
                </div>
            </div>
            
            <button type="submit" class="primary-btn">
                <i class="fas fa-check"></i>
                Confirm Booking
            </button>
        </form>
    `;
    
    openModal('serviceBookingModal');
    
    // Add form submit handler
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleServiceBooking(serviceId);
    });
}

// Handle service booking
async function handleServiceBooking(serviceId) {
    const service = servicesData.find(s => s.id === serviceId);
    const date = document.getElementById('bookingDate').value;
    const time = document.getElementById('bookingTime').value;
    const notes = document.getElementById('bookingNotes').value;
    
    if (!date || !time) {
        showNotification('Please select both date and time', 'error');
        return;
    }
    
    // If logged in, create booking via API so provider sees it
    if (window.auth && window.auth.isLoggedIn()) {
        try {
            await window.bookings.create({ service_id: serviceId, date, time, notes });
            closeModal('serviceBookingModal');
            showNotification('Booking requested! The provider has been notified.', 'success');
            if (document.querySelector('#bookings-section.active')) {
                loadBookings();
            }
            return;
        } catch (error) {
            console.error('API booking failed, falling back to local:', error);
        }
    }

    // Fallback local-only booking
    const newBooking = {
        id: Date.now(),
        serviceId: serviceId,
        serviceName: service.title,
        providerName: service.provider.name,
        date: date,
        time: time,
        status: 'upcoming',
        price: service.price,
        notes: notes
    };
    bookingsData.unshift(newBooking);
    closeModal('serviceBookingModal');
    showNotification('Booking confirmed! You will receive a confirmation email shortly.', 'success');
    if (document.querySelector('#bookings-section.active')) {
        loadBookings();
    }
}

// -------- Enhanced Services Search: history + actions --------
function loadRecentServiceSearches() {
    try {
        const raw = localStorage.getItem(RECENT_SERVICE_SEARCH_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (_) {
        return [];
    }
}

function saveRecentServiceSearch(query) {
    const q = (query || '').trim();
    if (!q) return;
    const maxItems = 8;
    const list = loadRecentServiceSearches();
    const withoutDup = list.filter(item => item.toLowerCase() !== q.toLowerCase());
    withoutDup.unshift(q);
    const trimmed = withoutDup.slice(0, maxItems);
    localStorage.setItem(RECENT_SERVICE_SEARCH_KEY, JSON.stringify(trimmed));
}

function attachServiceSearchHandlers() {
    const input = document.getElementById('serviceSearch');
    const btn = document.querySelector('.search-btn');
    const bar = document.querySelector('.search-bar');
    if (!input || !bar) return;

    // Create dropdown container once
    let dropdown = bar.querySelector('.search-history');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-history';
        bar.appendChild(dropdown);
    }

    function renderHistory(filter = '') {
        const entries = loadRecentServiceSearches();
        const q = (filter || '').toLowerCase();
        const items = q ? entries.filter(e => e.toLowerCase().includes(q)) : entries;
        dropdown.innerHTML = items.map(e => `
            <div class="search-history-item" data-value="${e.replace(/"/g, '&quot;')}">
                <i class="fas fa-clock" style="margin-right:8px;color:var(--lighter-text)"></i>${e}
            </div>
        `).join('');
        dropdown.classList.toggle('show', items.length > 0);

        dropdown.querySelectorAll('.search-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const val = item.getAttribute('data-value');
                input.value = val;
                performServiceSearch(true);
                dropdown.classList.remove('show');
            });
        });
    }

    function performServiceSearch(commitHistory = false) {
        const q = input.value.trim();
        if (commitHistory && q) saveRecentServiceSearch(q);
        loadServices();
    }

    input.addEventListener('focus', () => renderHistory(input.value));
    input.addEventListener('input', () => renderHistory(input.value));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performServiceSearch(true);
            dropdown.classList.remove('show');
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => dropdown.classList.remove('show'), 150);
    });

    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            performServiceSearch(true);
            dropdown.classList.remove('show');
        });
    }
}

// Handle quick book
function handleQuickBook(e) {
    e.preventDefault();
    
    const serviceType = document.getElementById('quickServiceType').value;
    const date = document.getElementById('quickDate').value;
    const time = document.getElementById('quickTime').value;
    const details = document.getElementById('quickDetails').value;
    
    if (!serviceType || !date || !time) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    (async () => {
        try {
            const location = document.getElementById('profileLocation')?.value || '';
            const match = await window.aiMatch.find(serviceType, location);
            const selected = Array.isArray(match) ? match[0] : match;
            if (!selected || !selected.id) throw new Error('No match');
            
            if (window.auth && window.auth.isLoggedIn()) {
                await window.bookings.create({ service_id: selected.id, date, time, notes: details });
                showNotification(`Booking requested for ${selected.title}!`, 'success');
            } else {
                const newBooking = {
                    id: Date.now(),
                    serviceId: selected.id,
                    serviceName: selected.title,
                    providerName: selected.provider_name || selected.provider?.name || 'Provider',
                    date,
                    time,
                    status: 'upcoming',
                    price: selected.price || 0,
                    notes: details
                };
                bookingsData.unshift(newBooking);
                showNotification(`Quick booking confirmed for ${selected.title}!`, 'success');
            }
        } catch (err) {
            console.warn('AI match failed, using client-side search:', err.message);
            const matchingServices = servicesData.filter(service =>
                service.title.toLowerCase().includes(serviceType.toLowerCase()) ||
                service.description.toLowerCase().includes(serviceType.toLowerCase())
            );
    if (matchingServices.length === 0) {
        showNotification('No matching services found. Please try a different service type.', 'error');
        return;
    }
    const selectedService = matchingServices[0];
    const newBooking = {
        id: Date.now(),
        serviceId: selectedService.id,
        serviceName: selectedService.title,
        providerName: selectedService.provider.name,
        date: date,
        time: time,
        status: 'upcoming',
        price: selectedService.price,
        notes: details
    };
    bookingsData.unshift(newBooking);
    showNotification(`Quick booking confirmed for ${selectedService.title}!`, 'success');
        } finally {
            closeModal('quickBookModal');
    document.getElementById('quickBookForm').reset();
            if (document.querySelector('#bookings-section.active')) {
                loadBookings();
            }
        }
    })();
}

// Update profile
function updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const phone = document.getElementById('profilePhone').value;
    const location = document.getElementById('profileLocation').value;
    const bio = document.getElementById('profileBio').value;
    
    // Update current user
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;
    currentUser.location = location;
    currentUser.bio = bio;
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
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

// Booking actions
function rescheduleBooking(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;
    
    // For demo, just show a notification
    showNotification('Reschedule request sent. You will be contacted to arrange a new time.', 'success');
}

function cancelBooking(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;
    
    if (confirm('Are you sure you want to cancel this booking?')) {
        booking.status = 'cancelled';
        loadBookings();
        showNotification('Booking cancelled successfully.', 'success');
    }
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await window.auth.logout();
            // The logout function in auth.js already handles the redirect
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback redirect
            window.location.href = 'index.html';
        }
    }
}

// Load user data
async function loadUserData() {
    try {
        // Check if user is authenticated
        if (!window.auth || !window.auth.isLoggedIn()) {
            throw new Error('User not authenticated');
        }

        // Get current user from auth API
        const user = await window.auth.getCurrentUser();
        if (user) {
            currentUser = {
                id: user.id,
                name: user.name || 'Unknown User',
                email: user.email || '',
                phone: user.phone || '',
                location: user.address || '',
                avatar: user.avatar || 'https://randomuser.me/api/portraits/men/32.jpg'
            };
        } else {
            throw new Error('Failed to load user data');
        }
        updateUserDisplay();
    } catch (error) {
        console.error('Failed to load user data:', error);
        showNotification('Failed to load user data. Please refresh the page.', 'error');
        
        // Set fallback data
        currentUser.name = 'User';
        updateUserDisplay();
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

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// Mobile responsiveness
function setupMobileHandlers() {
    // Add mobile menu toggle if needed
    const sidebar = document.querySelector('.sidebar');
    
    // Create mobile menu toggle button
    if (window.innerWidth <= 768) {
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-menu-toggle';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileToggle.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
            background: var(--primary-color);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3);
        `;
        
        document.body.appendChild(mobileToggle);
        
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

// Initialize mobile handlers
window.addEventListener('resize', setupMobileHandlers);
setupMobileHandlers();

// Export functions for global access
window.rescheduleBooking = rescheduleBooking;
window.cancelBooking = cancelBooking;