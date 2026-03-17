// Dashboard JavaScript - TireloMate

document.addEventListener('DOMContentLoaded', function() {
    // --- PHASE 1: Set up UI handlers immediately (no API needed) ---
    initializeDashboard();
    setupNavigation();
    setupModals();
    setupEventListeners();

    // Logout must always work, even if everything else fails
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await window.auth.logout();
                } catch (e) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentUser');
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

        // Load data — each call is independent, one failing shouldn't block others
        try { loadUserData(); } catch (e) { console.warn('loadUserData failed:', e.message); }

        try { await detectCustomerLocation(); } catch (e) { console.warn('detectCustomerLocation failed:', e.message); }

        loadServices();
        loadBookings();

        // Auto-refresh services every 30 seconds
        setInterval(async () => {
            await loadServices();
            _updateRefreshIndicator();
        }, 30000);
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

// Customer geolocation (populated on page load, defaults to Gaborone center)
let customerLocation = { lat: null, lng: null };

// Map view state
let servicesMap = null;
let servicesMapMarkers = null;
let mapViewActive = false;
let activeTab = 'upcoming';
const RECENT_SERVICE_SEARCH_KEY = 'recent_service_searches';

// Service and booking data – populated from API only
let servicesData = [];
let bookingsData = [];

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
        case 'bookings':
            loadBookings();
            break;
        case 'payments':
            loadPaymentHistory();
            break;
        case 'profile':
            // Profile is already loaded
            break;
        case 'support':
            // Support section is static
            break;
        case 'messages':
            loadConversations();
            _startMessagePolling();
            break;
    }
    // Stop message polling when leaving messages section
    if (sectionName !== 'messages') _stopMessagePolling();
}

// Load services (prefer API, fall back to demo)
async function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;

    if (!servicesData.length) showLoading('servicesGrid');

    console.log('loadServices called, customerLocation:', customerLocation);

    try {
        // Fetch from API – prefer nearby endpoint when we have customer location
        const category = activeCategory;
        const search = document.getElementById('serviceSearch')?.value || '';
        let apiServices = [];

        // 1) Try nearby endpoint if we have location and no search term
        if (customerLocation.lat && !search) {
            try {
                const params = new URLSearchParams({
                    lat: customerLocation.lat,
                    lng: customerLocation.lng
                });
                if (category !== 'all') params.append('category', category);
                const res = await fetch(`http://localhost:5000/api/services/nearby?${params}`);
                if (res.ok) {
                    apiServices = await res.json();
                    console.log('Nearby endpoint returned', apiServices.length, 'services');
                }
            } catch (nearbyErr) {
                console.warn('Nearby endpoint failed, falling back to standard:', nearbyErr.message);
            }
        }

        // 2) Always also fetch from standard endpoint to catch services without location
        let standardServices = [];
        try {
            standardServices = await window.services.getAll(category, search);
            console.log('Standard endpoint returned', Array.isArray(standardServices) ? standardServices.length : 0, 'services');
        } catch (stdErr) {
            console.warn('Standard endpoint failed:', stdErr.message);
        }

        // 3) Merge: nearby results first, then add any standard results not already included
        if (Array.isArray(apiServices) && apiServices.length) {
            const seenIds = new Set(apiServices.map(s => s.id));
            if (Array.isArray(standardServices)) {
                for (const s of standardServices) {
                    if (!seenIds.has(s.id)) {
                        apiServices.push(s);
                        seenIds.add(s.id);
                    }
                }
            }
        } else {
            apiServices = Array.isArray(standardServices) ? standardServices : [];
        }

        console.log('Total merged services:', apiServices.length);

        if (Array.isArray(apiServices) && apiServices.length) {
            // Map API fields to UI shape
            servicesData = apiServices.map(s => ({
                id: s.id,
                provider_id: s.provider_id,
                title: s.title,
                description: s.description || '',
                category: s.category || 'other',
                price: s.price,
                rating: s.rating || 0,
                reviews: s.reviews_count || 0,
                image: s.image || 'https://via.placeholder.com/600x400?text=Service+Image',
                provider: {
                    name: s.provider_name || 'Service Provider',
                    avatar: s.provider_avatar || 'https://via.placeholder.com/100?text=SP',
                    rating: 0,
                    completedJobs: 0
                },
                provider_name: s.provider_name,
                availability: [],
                duration: s.duration_estimate || s.duration || '',
                distance_km: s.distance_km || null,
                location_lat: s.location_lat,
                location_lng: s.location_lng,
                location_address: s.location_address
            }));
        }
    } catch (error) {
        console.warn('Service load error:', error.message);
        if (!servicesData.length) showNotification('Could not load services. Check your connection.', 'error');
    }

    hideLoading('servicesGrid');

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

    // Also refresh map markers if map is active
    if (mapViewActive && servicesMap) {
        updateMapMarkers(filteredServices);
    }
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
        
        const distanceBadge = service.distance_km != null
            ? `<span style="display:inline-block;background:#28a745;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;margin-left:8px;"><i class="fas fa-map-marker-alt"></i> ${service.distance_km} km away</span>`
            : '';

        serviceCard.innerHTML = `
            <div class="service-img">
                <img src="${service.image}" alt="${service.title}" loading="lazy">
            </div>
            <div class="service-info">
                <h3>${service.title}${distanceBadge}</h3>
                <p>${service.description.substring(0, 120)}...</p>
                <div class="service-meta">
                    <div class="price">P${service.price}</div>
                    <div class="rating" id="svc-rating-${service.id}">
                        <span style="color:#aaa;">Loading...</span>
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

    // Async-fetch real ratings for each service
    services.forEach(service => {
        if (service.provider_id) {
            api.getProviderRating(service.provider_id).then(data => {
                const el = document.getElementById(`svc-rating-${service.id}`);
                if (el && data) {
                    const stars = '★'.repeat(Math.floor(data.average_rating)) + '☆'.repeat(5 - Math.floor(data.average_rating));
                    el.innerHTML = `<span style="color:#f5a623;">${stars}</span> <span>${data.average_rating} (${data.review_count})</span>`;
                    // Cache on service object for booking modal
                    service._realRating = data.average_rating;
                    service._realReviewCount = data.review_count;
                }
            }).catch(() => {
                const el = document.getElementById(`svc-rating-${service.id}`);
                if (el) el.innerHTML = '<span style="color:#aaa;">No reviews yet</span>';
            });
        } else {
            const el = document.getElementById(`svc-rating-${service.id}`);
            if (el) el.innerHTML = '<span style="color:#aaa;">No reviews yet</span>';
        }
    });
}

// Load bookings from API
async function loadBookings() {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;

    if (!bookingsData.length) showLoading('bookingsList');

    try {
        if (window.auth && window.auth.isLoggedIn()) {
            const apiBookings = await window.bookings.getAll();
            if (Array.isArray(apiBookings)) {
                bookingsData = apiBookings.map(b => ({
                    id: b.id,
                    serviceId: b.service_id,
                    provider_id: b.provider_id,
                    serviceName: b.service_title || 'Service',
                    providerName: b.provider_name || 'Provider',
                    date: b.date,
                    time: b.time,
                    status: b.status === 'pending' ? 'upcoming' : b.status,
                    price: b.service_price || b.total_price || 0,
                    notes: b.notes || ''
                }));
            }
        }
    } catch (error) {
        console.warn('Failed to load bookings:', error.message);
        showNotification('Could not load bookings. Please try again.', 'error');
    }

    hideLoading('bookingsList');

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
            ${booking.provider_id ? `
                <div style="margin-top:8px;">
                    <button class="primary-btn" style="font-size:0.8rem;padding:6px 12px;background:#6c63ff;" onclick="openMessageWithUser('${booking.provider_id}', '${(booking.providerName || '').replace(/'/g, "\\'")}')">
                        <i class="fas fa-comment-dots"></i>
                        Message Provider
                    </button>
                </div>
            ` : ''}
            ${booking.status === 'upcoming' ? `
                <div class="booking-actions">
                    <button class="reschedule-btn" onclick="rescheduleBooking('${booking.id}')">
                        <i class="fas fa-calendar-alt"></i>
                        Reschedule
                    </button>
                    <button class="cancel-btn" onclick="cancelBooking('${booking.id}')">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                </div>
            ` : ''}
            ${booking.status === 'completed' ? `
                <div style="margin-top:8px;">
                    <button class="primary-btn" style="font-size:0.8rem;padding:6px 12px;background:#f5a623;" onclick="openReviewModal('${booking.serviceId}', '${booking.id}', '${(booking.serviceName || '').replace(/'/g, "\\'")}')">
                        <i class="fas fa-star"></i>
                        Leave Review
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

    // View toggle (List / Map)
    const listViewBtn = document.getElementById('listViewBtn');
    const mapViewBtn = document.getElementById('mapViewBtn');
    if (listViewBtn && mapViewBtn) {
        listViewBtn.addEventListener('click', () => switchToListView(listViewBtn, mapViewBtn));
        mapViewBtn.addEventListener('click', () => switchToMapView(listViewBtn, mapViewBtn));
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
                        <div class="provider-rating" id="modal-provider-rating">
                            <span style="color:#aaa;">Loading rating...</span>
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
            
            <button type="submit" class="primary-btn" id="confirmBookingBtn">
                <i class="fas fa-check"></i>
                Confirm Booking
            </button>
        </form>

        <!-- inDrive-style waiting area (hidden until booking starts) -->
        <div id="bookingStatusArea" style="display:none;margin-top:16px;padding:16px;background:#f8f9fa;border-radius:10px;text-align:center;">
            <div id="bookingStatusSpinner" style="margin-bottom:10px;">
                <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#e91e8c;"></i>
            </div>
            <div id="bookingStatusText" style="font-weight:600;color:#333;margin-bottom:6px;">Waiting for provider to accept...</div>
            <div id="bookingStatusSub" style="font-size:0.85rem;color:#888;"></div>
            <div id="bookingProviderAttempt" style="font-size:0.85rem;color:#666;margin-top:6px;"></div>
            <button type="button" id="cancelWaitingBtn" class="outline-btn" style="margin-top:12px;border-color:#dc3545;color:#dc3545;">
                <i class="fas fa-times"></i>
                Cancel &amp; Stop Searching
            </button>
        </div>
    `;

    openModal('serviceBookingModal');

    // Fetch real provider rating for modal
    if (service.provider_id) {
        api.getProviderRating(service.provider_id).then(data => {
            const el = document.getElementById('modal-provider-rating');
            if (el && data) {
                const stars = '★'.repeat(Math.floor(data.average_rating)) + '☆'.repeat(5 - Math.floor(data.average_rating));
                el.innerHTML = `<span style="color:#f5a623;">${stars}</span> ${data.average_rating} • ${data.review_count} reviews`;
            }
        }).catch(() => {
            const el = document.getElementById('modal-provider-rating');
            if (el) el.innerHTML = 'No reviews yet';
        });
    }

    // Add form submit handler
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleServiceBooking(serviceId);
    });
}

// Active fallback state so the cancel button can abort the loop
let _bookingFallbackAborted = false;

// Handle service booking with inDrive-style provider fallback
async function handleServiceBooking(serviceId) {
    const service = servicesData.find(s => s.id === serviceId);
    const date = document.getElementById('bookingDate').value;
    const time = document.getElementById('bookingTime').value;
    const notes = document.getElementById('bookingNotes').value;

    if (!date || !time) {
        showNotification('Please select both date and time', 'error');
        return;
    }

    // If not logged in or API unavailable, fall back to local booking
    if (!window.auth || !window.auth.isLoggedIn()) {
        _createLocalBooking(service, serviceId, date, time, notes);
        return;
    }

    // --- inDrive-style fallback flow ---
    const statusArea = document.getElementById('bookingStatusArea');
    const statusText = document.getElementById('bookingStatusText');
    const statusSub = document.getElementById('bookingStatusSub');
    const attemptInfo = document.getElementById('bookingProviderAttempt');
    const confirmBtn = document.getElementById('confirmBookingBtn');
    const cancelBtn = document.getElementById('cancelWaitingBtn');

    // Show waiting UI, disable confirm button
    statusArea.style.display = 'block';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    _bookingFallbackAborted = false;

    // Wire up the cancel button
    cancelBtn.onclick = () => {
        _bookingFallbackAborted = true;
        statusText.textContent = 'Cancelled.';
        statusSub.textContent = '';
        document.getElementById('bookingStatusSpinner').style.display = 'none';
        cancelBtn.style.display = 'none';
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
    };

    // 1) Fetch Dijkstra-ranked providers for this category
    let rankedProviders = [];
    try {
        const params = new URLSearchParams({
            lat: customerLocation.lat || -24.6282,
            lng: customerLocation.lng || 25.9231
        });
        if (service.category && service.category !== 'all') {
            params.append('category', service.category);
        }
        const res = await fetch(`http://localhost:5000/api/services/nearby?${params}`);
        if (res.ok) {
            rankedProviders = await res.json();
        }
    } catch (err) {
        console.warn('Could not fetch nearby providers:', err.message);
    }

    // If we couldn't get ranked providers, do a simple single-attempt booking
    if (!rankedProviders.length) {
        try {
            const _bk = await window.bookings.create({ service_id: serviceId, provider_id: service.provider_id, date, time, notes });
            _showPaymentStep(_bk.id || _bk.data?.id, service.title, service.provider?.name || 'Provider', service.price);
            return;
        } catch (error) {
            console.error('API booking failed, falling back to local:', error);
            showNotification('Could not reach server. Booking saved locally.', 'error');
            _createLocalBooking(service, serviceId, date, time, notes);
            return;
        }
    }

    // 2) Try up to 3 providers from the ranked list
    const maxAttempts = Math.min(3, rankedProviders.length);

    for (let i = 0; i < maxAttempts; i++) {
        if (_bookingFallbackAborted) return;

        const candidate = rankedProviders[i];
        const providerLabel = candidate.title || candidate.provider_name || `Provider ${i + 1}`;
        attemptInfo.textContent = `Attempt ${i + 1}/${maxAttempts}: ${providerLabel} (${candidate.distance_km} km)`;
        statusText.textContent = 'Waiting for provider to accept...';
        statusSub.textContent = '';

        // Create booking with this specific service/provider
        let booking;
        try {
            booking = await window.bookings.create({
                service_id: candidate.id,
                provider_id: candidate.provider_id,
                date,
                time,
                notes
            });
        } catch (err) {
            console.error(`Booking attempt ${i + 1} failed:`, err);
            statusSub.textContent = 'Could not reach provider, trying next...';
            await _sleep(1500);
            continue;
        }

        const bookingId = booking.id || (booking.data && booking.data.id);
        if (!bookingId) {
            statusSub.textContent = 'Unexpected response, trying next...';
            await _sleep(1500);
            continue;
        }

        // 3) Poll for 60 seconds (every 10s) to see if provider confirms
        const confirmed = await _pollBookingStatus(bookingId, 60000, 10000, statusSub);

        if (_bookingFallbackAborted) return;

        if (confirmed) {
            _showPaymentStep(bookingId, candidate.title || service.title, candidate.provider_name || 'Provider', candidate.price || service.price);
            return;
        }

        // 4) Provider didn't respond – cancel this booking and try next
        try {
            await window.bookings.updateStatus(bookingId, 'cancelled');
        } catch (_) { /* best-effort cancel */ }

        if (i < maxAttempts - 1) {
            showNotification("Provider didn't respond. Trying next nearest provider...", 'info');
            statusText.textContent = "Provider didn't respond. Trying next...";
        }
    }

    // 5) All attempts exhausted
    if (!_bookingFallbackAborted) {
        document.getElementById('bookingStatusSpinner').style.display = 'none';
        statusText.textContent = 'No providers available right now.';
        statusSub.textContent = 'Please try again later.';
        cancelBtn.textContent = 'Close';
        cancelBtn.style.borderColor = '#666';
        cancelBtn.style.color = '#666';
        cancelBtn.onclick = () => closeModal('serviceBookingModal');
        showNotification('No providers available right now. Please try again later.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
    }
}

// Poll a booking's status until confirmed or timeout
function _pollBookingStatus(bookingId, totalMs, intervalMs, statusSubEl) {
    return new Promise((resolve) => {
        let elapsed = 0;
        const timer = setInterval(async () => {
            if (_bookingFallbackAborted) {
                clearInterval(timer);
                resolve(false);
                return;
            }
            elapsed += intervalMs;
            const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
            if (statusSubEl) statusSubEl.textContent = `Checking again in ${Math.min(10, remaining)}s... (${remaining}s left)`;

            try {
                const allBookings = await window.bookings.getAll();
                const booking = Array.isArray(allBookings)
                    ? allBookings.find(b => b.id === bookingId || b.id === String(bookingId))
                    : null;
                if (booking && booking.status === 'confirmed') {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
            } catch (_) { /* ignore poll errors */ }

            if (elapsed >= totalMs) {
                clearInterval(timer);
                resolve(false);
            }
        }, intervalMs);
    });
}

function _finishBookingSuccess() {
    closeModal('serviceBookingModal');
    showNotification('Booking confirmed! Your provider is on the way.', 'success');
    if (document.querySelector('#bookings-section.active')) {
        loadBookings();
    }
}

function _showPaymentStep(bookingId, serviceName, providerName, price) {
    const content = document.getElementById('serviceBookingContent');
    if (!content) { _finishBookingSuccess(); return; }

    content.innerHTML = `
        <div style="text-align:center;padding:10px 0;">
            <i class="fas fa-check-circle" style="font-size:2.5rem;color:#28a745;margin-bottom:10px;"></i>
            <h2 style="margin:0 0 4px;">Booking Confirmed!</h2>
            <p style="color:#666;margin-bottom:20px;">Complete your payment to finalize.</p>
        </div>
        <div style="background:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:#888;">Service</span>
                <span style="font-weight:600;">${serviceName}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:#888;">Provider</span>
                <span style="font-weight:600;">${providerName}</span>
            </div>
            <div style="display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:4px;">
                <span style="font-weight:700;font-size:1.1rem;">Total</span>
                <span style="font-weight:700;font-size:1.1rem;color:#e91e8c;">P${price}</span>
            </div>
        </div>
        <div style="margin-bottom:20px;">
            <label style="font-weight:600;display:block;margin-bottom:10px;">Payment Method</label>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;cursor:pointer;transition:border-color 0.2s;" class="pay-method-label">
                    <input type="radio" name="payMethod" value="cash" checked style="accent-color:#e91e8c;">
                    <i class="fas fa-money-bill-wave" style="color:#28a745;width:20px;"></i>
                    <span>Cash on Delivery</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;cursor:pointer;transition:border-color 0.2s;" class="pay-method-label">
                    <input type="radio" name="payMethod" value="mobile_money" style="accent-color:#e91e8c;">
                    <i class="fas fa-mobile-alt" style="color:#6c63ff;width:20px;"></i>
                    <span>Mobile Money</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;cursor:pointer;transition:border-color 0.2s;" class="pay-method-label">
                    <input type="radio" name="payMethod" value="card_simulation" style="accent-color:#e91e8c;">
                    <i class="fas fa-credit-card" style="color:#e91e8c;width:20px;"></i>
                    <span>Card (Simulation)</span>
                </label>
            </div>
        </div>
        <button id="payNowBtn" class="primary-btn" style="width:100%;font-size:1rem;padding:14px;">
            <i class="fas fa-lock"></i>
            Pay P${price}
        </button>
        <div id="paymentResultArea" style="display:none;margin-top:16px;"></div>
    `;

    // Highlight selected radio
    content.querySelectorAll('input[name="payMethod"]').forEach(r => {
        r.addEventListener('change', () => {
            content.querySelectorAll('.pay-method-label').forEach(l => l.style.borderColor = '#e0e0e0');
            r.closest('.pay-method-label').style.borderColor = '#e91e8c';
        });
    });
    // Trigger initial highlight
    const checkedLabel = content.querySelector('input[name="payMethod"]:checked')?.closest('.pay-method-label');
    if (checkedLabel) checkedLabel.style.borderColor = '#e91e8c';

    document.getElementById('payNowBtn').addEventListener('click', async () => {
        const method = content.querySelector('input[name="payMethod"]:checked')?.value;
        if (!method) return;
        const btn = document.getElementById('payNowBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const payment = await api.createPayment(bookingId, price, method);
            const methodLabels = { cash: 'Cash on Delivery', mobile_money: 'Mobile Money', card_simulation: 'Card (Simulation)' };
            const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            document.getElementById('paymentResultArea').style.display = 'block';
            document.getElementById('paymentResultArea').innerHTML = `
                <div style="text-align:center;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                    <i class="fas fa-check-circle" style="font-size:3rem;color:#16a34a;margin-bottom:10px;"></i>
                    <h3 style="margin:0 0 16px;color:#166534;">Payment Successful!</h3>
                    <div style="background:#fff;border-radius:8px;padding:14px;text-align:left;font-size:0.9rem;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                            <span style="color:#888;">Transaction Ref</span>
                            <span style="font-weight:700;font-family:monospace;">${payment.transaction_ref}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                            <span style="color:#888;">Amount</span>
                            <span style="font-weight:600;">P${payment.amount}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                            <span style="color:#888;">Method</span>
                            <span>${methodLabels[payment.payment_method] || payment.payment_method}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:#888;">Date</span>
                            <span>${now}</span>
                        </div>
                    </div>
                    <button class="primary-btn" style="margin-top:16px;width:100%;" onclick="closeModal('serviceBookingModal'); loadBookings();">
                        <i class="fas fa-check"></i> Done
                    </button>
                </div>
            `;
            btn.style.display = 'none';
            showNotification('Payment completed!', 'success');
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-lock"></i> Pay P${price}`;
            showNotification('Payment failed. Please try again.', 'error');
        }
    });
}

function _createLocalBooking(service, serviceId, date, time, notes) {
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

function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            
            await window.bookings.create({ service_id: selected.id, provider_id: selected.provider_id, date, time, notes: details });
            showNotification(`Booking requested for ${selected.title}!`, 'success');
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
    if (window.auth && window.auth.isLoggedIn()) {
        try {
            await window.bookings.create({ service_id: selectedService.id, provider_id: selectedService.provider_id, date, time, notes: details });
        } catch (_) {}
    }
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
async function updateProfile(e) {
    e.preventDefault();

    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;

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

    // Update local state
    currentUser.name = name;
    currentUser.phone = phone;
    currentUser.email = document.getElementById('profileEmail').value;
    currentUser.location = document.getElementById('profileLocation').value;
    currentUser.bio = document.getElementById('profileBio')?.value || '';
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
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
    showNotification('Reschedule request sent. You will be contacted to arrange a new time.', 'success');
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        if (window.auth && window.auth.isLoggedIn()) {
            await window.bookings.updateStatus(bookingId, 'cancelled');
        }
    } catch (err) {
        showNotification('Failed to cancel booking. Please try again.', 'error');
    }
    await loadBookings();
    showNotification('Booking cancelled successfully.', 'success');
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

// Detect customer location via browser geolocation; defaults to Gaborone center
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

function _updateRefreshIndicator() {
    let el = document.getElementById('servicesRefreshIndicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'servicesRefreshIndicator';
        el.style.cssText = 'text-align:right;font-size:0.75rem;color:#999;padding:4px 8px;';
        const grid = document.getElementById('servicesGrid');
        if (grid && grid.parentNode) grid.parentNode.insertBefore(el, grid);
    }
    const now = new Date();
    el.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function detectCustomerLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported, defaulting to Gaborone');
            customerLocation = { lat: -24.6282, lng: 25.9231 };
            resolve();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                customerLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('Customer location detected:', customerLocation);
                resolve();
            },
            (error) => {
                console.warn('Geolocation failed, defaulting to Gaborone:', error.message);
                customerLocation = { lat: -24.6282, lng: 25.9231 };
                resolve();
            },
            { timeout: 5000 }
        );
    });
}

// ===== Services Map View =====

function switchToListView(listBtn, mapBtn) {
    mapViewActive = false;
    listBtn.style.background = '#e91e8c';
    listBtn.style.color = '#fff';
    mapBtn.style.background = '#fff';
    mapBtn.style.color = '#e91e8c';
    document.getElementById('servicesGrid').style.display = '';
    document.getElementById('servicesMapContainer').style.display = 'none';
}

function switchToMapView(listBtn, mapBtn) {
    mapViewActive = true;
    mapBtn.style.background = '#e91e8c';
    mapBtn.style.color = '#fff';
    listBtn.style.background = '#fff';
    listBtn.style.color = '#e91e8c';
    document.getElementById('servicesGrid').style.display = 'none';
    document.getElementById('servicesMapContainer').style.display = 'block';

    if (!servicesMap) {
        const lat = customerLocation.lat || -24.6282;
        const lng = customerLocation.lng || 25.9231;
        servicesMap = L.map('servicesMapContainer').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(servicesMap);
        servicesMapMarkers = L.layerGroup().addTo(servicesMap);
    }

    setTimeout(() => servicesMap.invalidateSize(), 200);
    updateMapMarkers(currentServices);
}

function updateMapMarkers(services) {
    if (!servicesMap || !servicesMapMarkers) return;

    servicesMapMarkers.clearLayers();

    // Customer marker (blue circle)
    if (customerLocation.lat && customerLocation.lng) {
        L.circleMarker([customerLocation.lat, customerLocation.lng], {
            radius: 10,
            fillColor: '#4361ee',
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9
        })
        .bindPopup('<b>Your Location</b>')
        .addTo(servicesMapMarkers);
    }

    // Service markers
    services.forEach(service => {
        const lat = service.location_lat;
        const lng = service.location_lng;
        if (!lat || !lng) return;

        const stars = '★'.repeat(Math.floor(service.rating || 0));
        const distLine = service.distance_km != null
            ? `<div style="color:#28a745;font-weight:600;"><i class="fas fa-route"></i> ${service.distance_km} km away</div>`
            : '';

        const popup = `
            <div style="min-width:180px;font-family:Poppins,sans-serif;">
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px;">${service.title}</div>
                <div style="color:#666;font-size:0.85rem;">${service.provider?.name || service.provider_name || 'Provider'}</div>
                <div style="margin:4px 0;font-weight:600;color:#e91e8c;">P${service.price}</div>
                <div style="color:#f5a623;">${stars}</div>
                ${distLine}
                <button onclick="openServiceBookingModal('${service.id}')"
                        style="margin-top:8px;width:100%;padding:6px;background:#e91e8c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
                    Book Now
                </button>
            </div>
        `;

        L.marker([lat, lng])
            .bindPopup(popup)
            .addTo(servicesMapMarkers);
    });
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
window.openMessageWithUser = openMessageWithUser;
window.openReviewModal = openReviewModal;

// ===== Payment History =====

async function loadPaymentHistory() {
    const container = document.getElementById('paymentsListContainer');
    if (!container) return;

    showLoading('paymentsListContainer');

    try {
        const payments = await api.getPayments();
        if (!Array.isArray(payments) || payments.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center;color:#999;"><i class="fas fa-receipt" style="font-size:2rem;margin-bottom:8px;"></i><p>No payments yet</p></div>';
            return;
        }

        const methodLabels = { cash: 'Cash', mobile_money: 'Mobile Money', card_simulation: 'Card' };

        container.innerHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead>
                    <tr style="border-bottom:2px solid #e0e0e0;text-align:left;">
                        <th style="padding:10px 8px;">Ref</th>
                        <th style="padding:10px 8px;">Service</th>
                        <th style="padding:10px 8px;">Amount</th>
                        <th style="padding:10px 8px;">Method</th>
                        <th style="padding:10px 8px;">Date</th>
                        <th style="padding:10px 8px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(p => {
                        const date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                        return `
                        <tr style="border-bottom:1px solid #f0f0f0;">
                            <td style="padding:10px 8px;font-family:monospace;font-weight:600;font-size:0.85rem;">${p.transaction_ref}</td>
                            <td style="padding:10px 8px;">${p.service_title || 'Service'}</td>
                            <td style="padding:10px 8px;font-weight:600;">P${p.amount}</td>
                            <td style="padding:10px 8px;">${methodLabels[p.payment_method] || p.payment_method}</td>
                            <td style="padding:10px 8px;color:#888;">${date}</td>
                            <td style="padding:10px 8px;"><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:0.8rem;font-weight:600;">${p.status}</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Failed to load payments:', err);
        showNotification('Could not load payment history.', 'error');
        container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center;color:#999;"><i class="fas fa-receipt" style="font-size:2rem;margin-bottom:8px;"></i><p>No payments yet</p></div>';
    }
}

// ===== Review System =====

let _reviewRating = 0;

function openReviewModal(serviceId, bookingId, serviceName) {
    _reviewRating = 0;
    document.getElementById('reviewServiceName').textContent = serviceName;
    document.getElementById('reviewComment').value = '';
    _renderStarInput(0);
    openModal('reviewModal');

    // Star hover/click
    const stars = document.querySelectorAll('#starRatingInput i');
    stars.forEach(star => {
        star.onmouseenter = () => _renderStarInput(parseInt(star.dataset.star), true);
        star.onmouseleave = () => _renderStarInput(_reviewRating);
        star.onclick = () => { _reviewRating = parseInt(star.dataset.star); _renderStarInput(_reviewRating); };
    });

    // Submit
    const btn = document.getElementById('submitReviewBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async () => {
        if (_reviewRating < 1) { showNotification('Please select a star rating', 'error'); return; }
        try {
            await window.reviews.create(serviceId, {
                rating: _reviewRating,
                comment: document.getElementById('reviewComment').value,
                booking_id: bookingId
            });
            closeModal('reviewModal');
            showNotification('Review submitted! Thank you.', 'success');
            loadBookings();
        } catch (e) {
            const msg = e.message || '';
            if (msg.includes('already reviewed')) {
                showNotification('You already reviewed this booking', 'error');
            } else {
                showNotification('Failed to submit review', 'error');
            }
        }
    });
}

function _renderStarInput(count, isHover = false) {
    const stars = document.querySelectorAll('#starRatingInput i');
    stars.forEach((star, i) => {
        if (i < count) {
            star.className = 'fas fa-star';
            star.style.color = '#f5a623';
        } else {
            star.className = 'far fa-star';
            star.style.color = '#ddd';
        }
    });
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
    // Cache current user id
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
            container.innerHTML = '<div class="empty-state" style="padding:40px 16px;text-align:center;color:#999;"><i class="fas fa-comments" style="font-size:2rem;margin-bottom:8px;"></i><p>No conversations yet</p></div>';
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
        if (!silent) showNotification('Could not load conversations.', 'error');
    }
}

function _selectConversation(userId, userName) {
    _activeChatUserId = userId;
    document.getElementById('chatWithName').textContent = userName;
    document.getElementById('chatInputArea').style.display = 'flex';
    _loadChatThread(userId);
    loadConversations(true); // refresh highlight

    // Wire send button
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
        showNotification('Could not load messages.', 'error');
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
    // Navigate to messages section then open that conversation
    showSection('messages');
    // Update sidebar active state
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