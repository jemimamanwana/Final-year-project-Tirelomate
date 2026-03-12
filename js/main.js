document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");



    // Modal functionality
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const serviceModal = document.getElementById('serviceModal');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const closeButtons = document.querySelectorAll('.close');
    
    // AI-Generated Image URLs for services
    const serviceImages = {
        gardening: 'img/gardening.jpg',
        cleaning: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format',
        webdev: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&auto=format',
        tutoring: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&auto=format',
        design: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format',
        training: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format',
        mobile: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=600&auto=format',
        interior: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format'
    };

    // AI-Generated Profile Pictures
    const profilePictures = {
        provider1: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format',
        provider2: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format',
        provider3: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&auto=format',
        provider4: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format',
        provider5: 'https://images.unsplash.com/photo-1562788869-4ed32648eb72?w=200&auto=format',
        provider6: 'https://images.unsplash.com/photo-1564564244660-5d73c057f2d2?w=200&auto=format',
        provider7: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&auto=format',
        provider8: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format'
    };

    // Client profile pictures
    const clientPictures = Array.from({length: 12}, (_, i) => 
        `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${i+1}.jpg`
    );

    // Enhanced services data with AI-generated images
    const services = [
        {
            id: 1,
            title: 'Professional Gardening',
            description: 'Expert gardening services including lawn care, planting, and landscape design. Our certified gardeners will transform your outdoor space into a beautiful oasis.',
            category: 'home',
            price: 'P50/hr',
            rating: 4.8,
            reviews: 24,
            image: serviceImages.gardening,
            provider: {
                name: 'Green Thumb Landscaping',
                avatar: profilePictures.provider1
            }
        },
        {
            id: 2,
            title: 'Home Cleaning',
            description: 'Thorough home cleaning services with eco-friendly products. We pay attention to every detail to ensure your home is spotless and fresh.',
            category: 'home',
            price: 'P35/hr',
            rating: 4.9,
            reviews: 42,
            image: serviceImages.cleaning,
            provider: {
                name: 'Sparkle Clean',
                avatar: profilePictures.provider2
            }
        },
        {
            id: 3,
            title: 'Web Development',
            description: 'Custom website development using modern technologies. From simple blogs to complex web applications, we build solutions tailored to your needs.',
            category: 'tech',
            price: 'P75/hr',
            rating: 4.7,
            reviews: 18,
            image: serviceImages.webdev,
            provider: {
                name: 'CodeCraft Solutions',
                avatar: profilePictures.provider3
            }
        },
        {
            id: 4,
            title: 'Math Tutoring',
            description: 'Experienced tutor for all levels of mathematics. Personalized lessons to help students understand concepts and improve grades.',
            category: 'education',
            price: 'P40/hr',
            rating: 4.9,
            reviews: 31,
            image: serviceImages.tutoring,
            provider: {
                name: 'Math Masters',
                avatar: profilePictures.provider4
            }
        },
        {
            id: 5,
            title: 'Graphic Design',
            description: 'Professional logo and branding design services. We create memorable visual identities that represent your brand effectively.',
            category: 'creative',
            price: 'P60/hr',
            rating: 4.6,
            reviews: 15,
            image: serviceImages.design,
            provider: {
                name: 'Visual Impact Studio',
                avatar: profilePictures.provider5
            }
        },
        {
            id: 6,
            title: 'Personal Training',
            description: 'Custom fitness programs tailored to your goals. Achieve your health objectives with personalized coaching and support.',
            category: 'health',
            price: 'P55/hr',
            rating: 4.8,
            reviews: 27,
            image: serviceImages.training,
            provider: {
                name: 'Peak Performance',
                avatar: profilePictures.provider6
            }
        },
        {
            id: 7,
            title: 'Mobile App Development',
            description: 'Build iOS and Android apps with our expert developers. We create user-friendly, high-performance mobile applications.',
            category: 'tech',
            price: 'P85/hr',
            rating: 4.7,
            reviews: 22,
            image: serviceImages.mobile,
            provider: {
                name: 'App Innovators',
                avatar: profilePictures.provider7
            }
        },
        {
            id: 8,
            title: 'Interior Design',
            description: 'Transform your living space with professional interior design services. We create beautiful, functional spaces that reflect your style.',
            category: 'home',
            price: 'P65/hr',
            rating: 4.8,
            reviews: 19,
            image: serviceImages.interior,
            provider: {
                name: 'Elegant Spaces',
                avatar: profilePictures.provider8
            }
        }
    ];
    
    // Enhanced reviews data with random user images
    const reviews = {
        1: [
            {
                user: 'Jane Smith',
                avatar: clientPictures[0],
                rating: 5,
                comment: 'The gardeners transformed my backyard into a beautiful oasis. They were punctual, professional, and went above and beyond.'
            },
            {
                user: 'Robert Johnson',
                avatar: clientPictures[1],
                rating: 4,
                comment: 'Good work overall, though they were a bit late to the appointment. The quality of gardening was excellent though.'
            }
        ],
        2: [
            {
                user: 'Emily Davis',
                avatar: clientPictures[2],
                rating: 5,
                comment: 'My house has never been cleaner! Highly recommend. They use eco-friendly products and are very thorough.'
            }
        ],
        3: [
            {
                user: 'Michael Chen',
                avatar: clientPictures[3],
                rating: 5,
                comment: 'The web developer built exactly what I needed. Great communication throughout the project.'
            }
        ],
        4: [
            {
                user: 'Sarah Wilson',
                avatar: clientPictures[4],
                rating: 5,
                comment: 'My son\'s math grades improved significantly after just a few sessions. The tutor is patient and explains concepts clearly.'
            }
        ],
        5: [
            {
                user: 'David Thompson',
                avatar: clientPictures[5],
                rating: 5,
                comment: 'The logo design perfectly captured our brand identity. The designer was creative and incorporated all our feedback.'
            }
        ],
        6: [
            {
                user: 'Olivia Martinez',
                avatar: clientPictures[6],
                rating: 5,
                comment: 'After just 3 months of training, I\'ve lost 15 pounds and feel stronger than ever. My trainer customized workouts perfectly.'
            }
        ],
        7: [
            {
                user: 'James Rodriguez',
                avatar: clientPictures[7],
                rating: 5,
                comment: 'Our app launched successfully and users love it! The development team was professional and solved complex technical challenges.'
            }
        ],
        8: [
            {
                user: 'Sophia Taylor',
                avatar: clientPictures[8],
                rating: 5,
                comment: 'The interior designer completely transformed our living room. The 3D renderings helped us visualize the changes.'
            }
        ]
    };
    
    // Modal functions
    function openModal(modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            modal.querySelector('.modal-content').style.transform = 'translateY(0)';
            modal.querySelector('.modal-content').style.opacity = '1';
        }, 10);
    }
    
    function closeModal(modal) {
        modal.querySelector('.modal-content').style.transform = 'translateY(-20px)';
        modal.querySelector('.modal-content').style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
    
    // Event listeners for modals
    loginBtn.addEventListener('click', () => openModal(loginModal));
    signupBtn.addEventListener('click', () => openModal(signupModal));
    
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        setTimeout(() => openModal(signupModal), 300);
    });
    
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(signupModal);
        setTimeout(() => openModal(loginModal), 300);
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showNotification('Please fill in all fields');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            // Attempt login using the API
            const response = await window.auth.login(email, password);
            
            if (response.token) {
                showNotification('Login successful! Redirecting to dashboard...', 'success');
                
                // Update UI to show user is logged in
                updateAuthUI();
                
                // Close modal and redirect based on user type
                setTimeout(() => {
                    closeModal(loginModal);
                    // Redirect based on user type
                    if (response.user_type === 'provider') {
                        window.location.href = 'Services-provider-dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
            } else {
                showNotification('Login failed. Please try again.', 'error');
                // Reset button state immediately for failed login
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message || 'Login failed. Please try again.', 'error');
            // Reset button state for error case
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Login';
            submitBtn.disabled = false;
        }
    });
    
    document.getElementById('signupForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        
        // Get selected user type
        const userType = document.getElementById('signupUserType').value;
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;
            
            // Attempt registration using the API with user type
            const response = await window.auth.register(name, email, password, userType);
            
            if (response.token) {
                showNotification('Account created successfully! Welcome to Tirelomate. Redirecting to dashboard...', 'success');
                
                // Update UI to show user is logged in
                updateAuthUI();
                
                // Close modal and redirect based on user type
                setTimeout(() => {
                    closeModal(signupModal);
                    // Redirect based on user type
                    if (response.user_type === 'provider') {
                        window.location.href = 'Services-provider-dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
            } else {
                showNotification('Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Enhanced notification function
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
    
    // Load services with animation
    function loadServices(category = 'all') {
        const servicesGrid = document.getElementById('servicesGrid');
        if (!servicesGrid) {
            console.error('servicesGrid element not found!');
            return;
        }
        
        servicesGrid.innerHTML = '';
        
        const filteredServices = category === 'all' 
            ? services 
            : services.filter(service => service.category === category);
        
        filteredServices.forEach((service, index) => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.style.opacity = '0';
            serviceCard.style.transform = 'translateY(20px)';
            serviceCard.style.transition = `opacity 0.3s ease, transform 0.3s ease ${index * 0.1}s`;
            
            serviceCard.innerHTML = `
                <div class="service-img">
                    <img src="${service.image}" alt="${service.title}" onerror="this.src='https://via.placeholder.com/300x200?text=Service+Image'">
                </div>
                <div class="service-info">
                    <h3>${service.title}</h3>
                    <p>${service.description.substring(0, 100)}...</p>
                    <div class="service-meta">
                        <span class="price">${service.price}</span>
                        <span class="rating">
                            ${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))}
                            <span>(${service.reviews})</span>
                        </span>
                    </div>
                    <div class="service-provider">
                        <img src="${service.provider.avatar}" alt="${service.provider.name}" onerror="this.src='https://via.placeholder.com/50?text=Provider'">
                        <span>${service.provider.name}</span>
                    </div>
                </div>
            `;
            
            serviceCard.addEventListener('click', () => openServiceModal(service.id));
            servicesGrid.appendChild(serviceCard);
            
            setTimeout(() => {
                serviceCard.style.opacity = '1';
                serviceCard.style.transform = 'translateY(0)';
            }, 100);
        });
    }
    
    // Open service modal
    function openServiceModal(serviceId) {
        const service = services.find(s => s.id === serviceId);
        const serviceReviews = reviews[serviceId] || [];
        
        document.getElementById('serviceModalContent').innerHTML = `
            <div class="service-modal-img">
                <img src="${service.image}" alt="${service.title}" onerror="this.src='https://via.placeholder.com/600x400?text=Service+Image'">
            </div>
            <div class="service-modal-info">
                <h3>${service.title}</h3>
                <div class="service-provider-info">
                    <img src="${service.provider.avatar}" alt="${service.provider.name}" onerror="this.src='https://via.placeholder.com/100?text=Provider'">
                    <div>
                        <h4>${service.provider.name}</h4>
                        <div class="rating">
                            ${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))}
                            <span>${service.rating} (${service.reviews} reviews)</span>
                        </div>
                    </div>
                </div>
                <div class="service-modal-meta">
                    <span class="price">${service.price}</span>
                    <span class="category">${service.category.charAt(0).toUpperCase() + service.category.slice(1)}</span>
                </div>
                <div class="service-modal-description">
                    <p>${service.description}</p>
                </div>
                <button class="primary-btn book-service">Book This Service</button>
                
                <div class="service-modal-reviews">
                    <h4>Customer Reviews <span>(${serviceReviews.length})</span></h4>
                    ${serviceReviews.length > 0 
                        ? serviceReviews.map(review => `
                            <div class="review">
                                <div class="review-user">
                                    <img src="${review.avatar}" alt="${review.user}" onerror="this.src='https://via.placeholder.com/50?text=User'">
                                    <div class="review-user-info">
                                        <h4>${review.user}</h4>
                                        <div class="rating">
                                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                        </div>
                                    </div>
                                </div>
                                <div class="review-content">
                                    <p>${review.comment}</p>
                                </div>
                            </div>
                        `).join('')
                        : '<p class="no-reviews">No reviews yet. Be the first to review this service!</p>'}
                </div>
            </div>
        `;
        
        openModal(serviceModal);
        
        document.querySelector('.book-service').addEventListener('click', () => {
            showNotification('Please login or sign up to book this service');
            setTimeout(() => {
                closeModal(serviceModal);
                openModal(signupModal);
            }, 1500);
        });
    }
    
    // Category filtering
    document.querySelectorAll('.category').forEach(category => {
        category.addEventListener('click', function() {
            document.querySelector('.category.active').classList.remove('active');
            this.classList.add('active');
            loadServices(this.dataset.category);
        });
    });
    
    // Search functionality
    const searchInput = document.querySelector('.search-bar input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeCategory = document.querySelector('.category.active')?.dataset.category || 'all';
            loadServices(activeCategory, e.target.value);
        });
    }
    
    // Check if user is already logged in
    if (window.auth && window.auth.isLoggedIn()) {
        console.log('User is logged in, updating UI...');
        
        // Update the UI to show user is logged in
        updateAuthUI();
        
        // Don't automatically redirect - let the user navigate manually
        // This prevents the blinking/redirect loop issue
        console.log('User is logged in but staying on current page to prevent redirect loops');
    }
    
    // Function to update UI based on authentication status
    function updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userWelcome = document.getElementById('userWelcome');
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        if (window.auth && window.auth.isLoggedIn()) {
            // User is logged in
            if (authButtons) authButtons.style.display = 'none';
            if (userWelcome) {
                userWelcome.style.display = 'flex';
                // Try to get user data for welcome message
                window.auth.getCurrentUser().then(async user => {
                    if (user && welcomeMessage) {
                        try {
                            const isProvider = await window.auth.isProvider();
                            const dashboardType = isProvider ? 'Service Provider' : 'Customer';
                            welcomeMessage.textContent = `Welcome, ${user.name}! (${dashboardType})`;
                        } catch (error) {
                            welcomeMessage.textContent = `Welcome, ${user.name}!`;
                        }
                    }
                }).catch(() => {
                    if (welcomeMessage) welcomeMessage.textContent = 'Welcome, User!';
                });
            }
        } else {
            // User is not logged in
            if (authButtons) authButtons.style.display = 'flex';
            if (userWelcome) userWelcome.style.display = 'none';
        }
    }
    
    // Add event listeners for dashboard and logout buttons
    const dashboardBtn = document.getElementById('dashboardBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', async () => {
            try {
                // Check user type and redirect to appropriate dashboard
                const isProvider = await window.auth.isProvider();
                if (isProvider) {
                    window.location.href = 'Services-provider-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                console.error('Error checking user type:', error);
                // Fallback to customer dashboard
                window.location.href = 'dashboard.html';
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await window.auth.logout();
                updateAuthUI();
                showNotification('Logged out successfully', 'success');
            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Logout failed', 'error');
            }
        });
    }
    
    // Initialize the page
    loadServices();
    
    // Update auth UI on page load
    updateAuthUI();
    
    // Add hover effect to service cards
    document.addEventListener('mouseover', function(e) {
        const card = e.target.closest('.service-card');
        if (card) {
            const img = card.querySelector('.service-img img');
            if (img) img.style.transform = 'scale(1.05)';
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        const card = e.target.closest('.service-card');
        if (card) {
            const img = card.querySelector('.service-img img');
            if (img) img.style.transform = 'scale(1)';
        }
    });
});