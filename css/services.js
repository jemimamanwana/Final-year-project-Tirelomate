// ServiceHub Enhanced JavaScript - Dynamic Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    createDynamicShapes();
    initTypingEffect();
    loadServices();
    initChatbot();
    setupSearch();
    setupModals();
    setupScrollEffects();
    setupFormValidation();
    
    // Show notification on page load after typing effect
    setTimeout(() => {
        showNotification('Welcome to ServiceHub! Find your perfect service provider today.', 3000);
    }, 4000);
});

// Typing Effect for Hero Title
function initTypingEffect() {
    const heroTitle = document.querySelector('.hero-content h1');
    if (!heroTitle) return;
    
    const originalText = heroTitle.textContent;
    const words = originalText.split(' ');
    
    // Clear the original text and add typing container
    heroTitle.innerHTML = '<span class="typing-text"></span>';
    const typingContainer = heroTitle.querySelector('.typing-text');
    
    let wordIndex = 0;
    let charIndex = 0;
    let currentWord = '';
    
    function typeEffect() {
        if (wordIndex < words.length) {
            if (charIndex < words[wordIndex].length) {
                currentWord += words[wordIndex][charIndex];
                charIndex++;
            } else {
                // Finished current word, add space and move to next word
                if (wordIndex < words.length - 1) {
                    currentWord += ' ';
                }
                wordIndex++;
                charIndex = 0;
            }
            
            typingContainer.innerHTML = currentWord;
            
            // Vary typing speed for more natural effect
            const typingSpeed = Math.random() * 100 + 50; // 50-150ms
            setTimeout(typeEffect, typingSpeed);
        } else {
            // Typing complete, remove cursor after a delay
            setTimeout(() => {
                typingContainer.classList.remove('typing-text');
            }, 2000);
        }
    }
    
    // Start typing effect after a short delay
    setTimeout(typeEffect, 500);
}

// Create floating background shapes
function createDynamicShapes() {
    const shapesContainer = document.createElement('div');
    shapesContainer.id = 'dynamic-shapes';
    document.body.appendChild(shapesContainer);
    
    const shapes = [
        { class: 'shape-1', color: '#4361ee', size: 100, top: 20, left: 10, animationDelay: 0 },
        { class: 'shape-2', color: '#f72585', size: 150, top: 60, left: 80, animationDelay: 2, borderRadius: '20px' },
        { class: 'shape-3', color: '#3a0ca3', size: 80, top: 80, left: 15, animationDelay: 4, borderRadius: '50%' },
        { class: 'shape-4', color: '#b5179e', size: 120, top: 30, left: 70, animationDelay: 6, transform: 'rotate(45deg)' }
    ];
    
    shapes.forEach(shape => {
        const element = document.createElement('div');
        element.className = `dynamic-shape ${shape.class}`;
        element.style.width = `${shape.size}px`;
        element.style.height = `${shape.size}px`;
        element.style.background = shape.color;
        element.style.top = `${shape.top}%`;
        element.style.left = `${shape.left}%`;
        element.style.animationDelay = `${shape.animationDelay}s`;
        element.style.position = 'absolute';
        element.style.opacity = '0.1';
        element.style.animation = 'float 6s ease-in-out infinite';
        element.style.borderRadius = shape.borderRadius || '20px';
        element.style.zIndex = '-1';
        
        if (shape.transform) {
            element.style.transform = shape.transform;
        }
        
        shapesContainer.appendChild(element);
    });
}

// Load services from API (mock data)
function loadServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    
    // Mock data for demonstration
    const mockServices = [
        {
            id: 1,
            title: "Professional Home Cleaning",
            description: "Thorough cleaning of your entire home by experienced professionals.",
            category: "Home Services",
            price: 120,
            rating: 4.8,
            review_count: 42,
            provider_name: "CleanPro",
            provider_avatar: "https://randomuser.me/api/portraits/women/44.jpg",
            image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format"
        },
        {
            id: 2,
            title: "Website Development",
            description: "Custom website development tailored to your business needs.",
            category: "Tech Services",
            price: 800,
            rating: 4.9,
            review_count: 36,
            provider_name: "WebCraft",
            provider_avatar: "https://randomuser.me/api/portraits/men/32.jpg",
            image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&auto=format"
        },
        {
            id: 3,
            title: "Math Tutoring",
            description: "Personalized math tutoring for high school and college students.",
            category: "Education",
            price: 50,
            rating: 4.7,
            review_count: 28,
            provider_name: "EduMasters",
            provider_avatar: "https://randomuser.me/api/portraits/women/68.jpg",
            image: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&auto=format"
        },
        {
            id: 4,
            title: "Graphic Design",
            description: "Professional graphic design services for your brand and marketing needs.",
            category: "Creative",
            price: 250,
            rating: 4.9,
            review_count: 55,
            provider_name: "DesignPro",
            provider_avatar: "https://randomuser.me/api/portraits/women/25.jpg",
            image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format"
        },
        {
            id: 5,
            title: "Personal Fitness Training",
            description: "Get in shape with personalized fitness training and nutrition guidance.",
            category: "Health & Wellness",
            price: 75,
            rating: 4.6,
            review_count: 33,
            provider_name: "FitLife",
            provider_avatar: "https://randomuser.me/api/portraits/men/15.jpg",
            image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format"
        },
        {
            id: 6,
            title: "Business Consulting",
            description: "Strategic business consulting to help grow your company and optimize operations.",
            category: "Business Services",
            price: 150,
            rating: 4.8,
            review_count: 47,
            provider_name: "BizGrowth",
            provider_avatar: "https://randomuser.me/api/portraits/men/45.jpg",
            image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&auto=format"
        }
    ];
    
    displayServices(mockServices);
}

function displayServices(services) {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    
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
                <p>${service.description}</p>
                <div class="service-meta">
                    <div class="price">$${service.price}</div>
                    <div class="rating">
                        <i class="fas fa-star"></i>
                        <span>${service.rating}</span>
                        <span>(${service.review_count})</span>
                    </div>
                </div>
                <div class="service-provider">
                    <img src="${service.provider_avatar}" alt="${service.provider_name}" loading="lazy">
                    <span>${service.provider_name}</span>
                </div>
                <button class="primary-btn view-service" data-id="${service.id}">View Details</button>
            </div>
        `;
        
        servicesGrid.appendChild(serviceCard);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-service').forEach(button => {
        button.addEventListener('click', function() {
            const serviceId = this.getAttribute('data-id');
            viewServiceDetails(serviceId);
        });
    });
    
    // Add animation class after a delay
    setTimeout(() => {
        document.querySelectorAll('.service-card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, 100);
}

function viewServiceDetails(serviceId) {
    // Mock service details
    const mockServiceDetails = {
        1: {
            id: 1,
            title: "Professional Home Cleaning",
            description: "Thorough cleaning of your entire home by experienced professionals. We cover all areas including living rooms, bedrooms, kitchens, and bathrooms. Our team uses eco-friendly products and pays attention to every detail to ensure your home is spotless. We also offer deep cleaning services, move-in/move-out cleaning, and regular maintenance cleaning schedules.",
            category: "Home Services",
            price: 120,
            rating: 4.8,
            review_count: 42,
            provider_name: "CleanPro",
            provider_avatar: "https://randomuser.me/api/portraits/women/44.jpg",
            image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format",
            reviews: [
                {
                    user_name: "Sarah Johnson",
                    user_avatar: "https://randomuser.me/api/portraits/women/32.jpg",
                    rating: 5,
                    comment: "Excellent service! My home has never been cleaner. The team was professional, punctual, and very thorough.",
                    created_at: "2024-01-15"
                },
                {
                    user_name: "Michael Chen",
                    user_avatar: "https://randomuser.me/api/portraits/men/45.jpg",
                    rating: 4,
                    comment: "Very thorough cleaning, would definitely book again. Great attention to detail and friendly staff.",
                    created_at: "2024-01-10"
                }
            ]
        },
        2: {
            id: 2,
            title: "Website Development",
            description: "Custom website development tailored to your business needs. We specialize in responsive design, e-commerce solutions, and modern web technologies. Our team creates websites that not only look great but also perform excellently and convert visitors into customers.",
            category: "Tech Services",
            price: 800,
            rating: 4.9,
            review_count: 36,
            provider_name: "WebCraft",
            provider_avatar: "https://randomuser.me/api/portraits/men/32.jpg",
            image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&auto=format",
            reviews: [
                {
                    user_name: "Emily Rodriguez",
                    user_avatar: "https://randomuser.me/api/portraits/women/28.jpg",
                    rating: 5,
                    comment: "Amazing work! They built exactly what I needed for my business. The website is fast, beautiful, and user-friendly.",
                    created_at: "2024-01-12"
                }
            ]
        }
        // Add more service details as needed
    };
    
    const service = mockServiceDetails[serviceId] || mockServiceDetails[1];
    showServiceModal(service);
}

function showServiceModal(service) {
    const modalContent = document.getElementById('serviceModalContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="service-modal-img">
            <img src="${service.image}" alt="${service.title}" loading="lazy">
        </div>
        <div class="service-modal-info">
            <h3>${service.title}</h3>
            <div class="service-provider-info">
                <img src="${service.provider_avatar}" alt="${service.provider_name}" loading="lazy">
                <span>${service.provider_name}</span>
            </div>
            <div class="service-modal-meta">
                <div class="price">$${service.price}</div>
                <div class="rating">
                    <i class="fas fa-star"></i>
                    <span>${service.rating}</span>
                    <span>(${service.review_count} reviews)</span>
                </div>
            </div>
            <div class="service-modal-description">
                <p>${service.description}</p>
            </div>
            <button class="primary-btn book-service">Book Now</button>
            
            <div class="service-modal-reviews">
                <h4>Customer Reviews</h4>
                ${service.reviews.map(review => `
                    <div class="review">
                        <div class="review-user">
                            <img src="${review.user_avatar}" alt="${review.user_name}" loading="lazy">
                            <div class="review-user-info">
                                <h4>${review.user_name}</h4>
                                <div class="rating">
                                    ${'<i class="fas fa-star"></i>'.repeat(review.rating)}
                                </div>
                            </div>
                        </div>
                        <div class="review-content">
                            <p>${review.comment}</p>
                            <small>${formatDate(review.created_at)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Open modal
    document.getElementById('serviceModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Add event listener to book button
    const bookButton = modalContent.querySelector('.book-service');
    if (bookButton) {
        bookButton.addEventListener('click', function() {
            closeAllModals();
            showNotification(`Booking request sent for ${service.title}! We'll contact you soon.`, 4000);
        });
    }
}

// Search functionality
function setupSearch() {
    const searchButton = document.querySelector('.search-bar button');
    const searchForm = document.querySelector('.search-bar');
    
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch();
        });
    }
    
    const searchInputs = document.querySelectorAll('.search-bar input');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        
        // Add real-time search suggestions
        input.addEventListener('input', function() {
            if (this.value.length > 2) {
                showSearchSuggestions(this.value, this);
            } else {
                hideSearchSuggestions();
            }
        });
    });
}

function performSearch() {
    const serviceInput = document.querySelector('.search-bar input[placeholder*="service"]');
    const locationInput = document.querySelector('.search-bar input[placeholder*="Location"]');
    
    const service = serviceInput ? serviceInput.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    
    if (!service && !location) {
        showNotification('Please enter a service or location to search', 3000, 'warning');
        return;
    }
    
    // Show loading state
    const searchButton = document.querySelector('.search-bar button');
    const originalText = searchButton.innerHTML;
    searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    searchButton.disabled = true;
    
    // Simulate API call with timeout
    setTimeout(() => {
        // Mock filtering based on search
        const filteredServices = getFilteredServices(service, location);
        
        displayServices(filteredServices);
        searchButton.innerHTML = originalText;
        searchButton.disabled = false;
        
        // Scroll to results
        const providersSection = document.getElementById('providers');
        if (providersSection) {
            providersSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showNotification(`Found ${filteredServices.length} services matching your search`, 3000);
    }, 1500);
}

function getFilteredServices(service, location) {
    // Mock filtered results based on search terms
    const allServices = [
        {
            id: 1,
            title: "Professional Home Cleaning",
            description: `Thorough cleaning service ${location ? `in ${location}` : 'in your area'}`,
            category: "Home Services",
            price: 120,
            rating: 4.8,
            review_count: 42,
            provider_name: "CleanPro",
            provider_avatar: "https://randomuser.me/api/portraits/women/44.jpg",
            image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format"
        },
        {
            id: 4,
            title: "Deep Cleaning Service",
            description: `Intensive deep cleaning ${location ? `serving ${location}` : 'for homes and apartments'}`,
            category: "Home Services",
            price: 200,
            rating: 4.9,
            review_count: 35,
            provider_name: "SparkleClean",
            provider_avatar: "https://randomuser.me/api/portraits/women/51.jpg",
            image: "https://images.unsplash.com/photo-1563453392212-326d32d2d093?w=600&auto=format"
        },
        {
            id: 2,
            title: "Website Development",
            description: `Custom web development ${location ? `in ${location}` : 'for your business'}`,
            category: "Tech Services",
            price: 800,
            rating: 4.9,
            review_count: 36,
            provider_name: "WebCraft",
            provider_avatar: "https://randomuser.me/api/portraits/men/32.jpg",
            image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&auto=format"
        }
    ];
    
    // Simple filtering logic
    if (service.toLowerCase().includes('clean')) {
        return allServices.filter(s => s.category === "Home Services");
    } else if (service.toLowerCase().includes('web') || service.toLowerCase().includes('tech')) {
        return allServices.filter(s => s.category === "Tech Services");
    } else {
        return allServices;
    }
}

function showSearchSuggestions(query, inputElement) {
    hideSearchSuggestions();
    
    const suggestions = [
        'House Cleaning', 'Web Development', 'Math Tutoring', 'Graphic Design',
        'Personal Training', 'Business Consulting', 'Photography', 'Plumbing'
    ].filter(item => item.toLowerCase().includes(query.toLowerCase()));
    
    if (suggestions.length === 0) return;
    
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'search-suggestions';
    suggestionsList.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid var(--border-color);
        border-top: none;
        border-radius: 0 0 8px 8px;
        box-shadow: var(--shadow);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
    `;
    
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = suggestion;
        suggestionItem.style.cssText = `
            padding: 12px 20px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            transition: var(--transition);
        `;
        
        suggestionItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--primary-light)';
        });
        
        suggestionItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
        });
        
        suggestionItem.addEventListener('click', function() {
            inputElement.value = suggestion;
            hideSearchSuggestions();
            performSearch();
        });
        
        suggestionsList.appendChild(suggestionItem);
    });
    
    const searchContainer = inputElement.closest('.search-bar');
    searchContainer.style.position = 'relative';
    searchContainer.appendChild(suggestionsList);
}

function hideSearchSuggestions() {
    const existingSuggestions = document.querySelector('.search-suggestions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }
}

// Chatbot functionality
function initChatbot() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotInput = document.getElementById('chatbotInput');
    
    if (!chatbotToggle || !chatbotWindow) return;
    
    // Toggle chatbot window
    chatbotToggle.addEventListener('click', function() {
        chatbotWindow.classList.toggle('active');
        if (chatbotWindow.classList.contains('active')) {
            chatbotInput.focus();
        }
    });
    
    // Close chatbot
    if (chatbotClose) {
        chatbotClose.addEventListener('click', function() {
            chatbotWindow.classList.remove('active');
        });
    }
    
    // Send message
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        chatbotInput.value = '';
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot loading';
        loadingDiv.innerHTML = `
            <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        
        const chatbotMessages = document.getElementById('chatbotMessages');
        chatbotMessages.appendChild(loadingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
        // Simulate API response with timeout
        setTimeout(() => {
            // Remove loading indicator
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
            
            // Generate response based on user input
            const response = generateChatbotResponse(message);
            addMessage(response, 'bot');
        }, 1500);
    }
    
    // Send message on button click or Enter key
    if (chatbotSend) {
        chatbotSend.addEventListener('click', sendMessage);
    }
    
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

function generateChatbotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('clean') || lowerMessage.includes('cleaning')) {
        return "I found several excellent cleaning services in your area! CleanPro has a 4.8★ rating with prices starting at P120. They offer regular cleaning, deep cleaning, and move-in/out services. Would you like me to show you more options or help you book an appointment?";
    } else if (lowerMessage.includes('tutor') || lowerMessage.includes('math') || lowerMessage.includes('education')) {
        return "For tutoring services, I recommend EduMasters with a 4.7★ rating. They offer personalized math tutoring for high school and college students at P50/hour. They also provide test prep and other subjects. Would you like to see available time slots?";
    } else if (lowerMessage.includes('website') || lowerMessage.includes('web') || lowerMessage.includes('development')) {
        return "WebCraft specializes in custom website development with a 4.9★ rating! Their projects start at P800 and they create responsive, modern websites that convert visitors to customers. I can connect you with their team for a free consultation. Interested?";
    } else if (lowerMessage.includes('design') || lowerMessage.includes('graphic') || lowerMessage.includes('creative')) {
        return "DesignPro offers professional graphic design services with a 4.9★ rating! They handle branding, marketing materials, logos, and more starting at P250. Their portfolio includes work for startups to Fortune 500 companies. Want to see their portfolio?";
    } else if (lowerMessage.includes('fitness') || lowerMessage.includes('training') || lowerMessage.includes('health')) {
        return "FitLife provides personalized fitness training with a 4.6★ rating! Sessions are P75 each and include customized workout plans and nutrition guidance. They offer both in-person and virtual training options. Ready to start your fitness journey?";
    } else if (lowerMessage.includes('business') || lowerMessage.includes('consulting')) {
        return "BizGrowth offers strategic business consulting with a 4.8★ rating! At P150/hour, they help optimize operations, develop growth strategies, and improve efficiency. They've helped over 200 businesses increase revenue. Shall I schedule a consultation?";
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
        return "Service prices vary by category: Cleaning (P120-200), Tutoring (P50/hr), Web Development (P800+), Design (P250+), Fitness Training (P75/session), Business Consulting (P150/hr). All providers offer free consultations! What service interests you most?";
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return "Hello! 👋 I'm here to help you find the perfect service provider. What type of service are you looking for today? I can help with cleaning, tutoring, web development, design, fitness training, business consulting, and more!";
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return "You're welcome! 😊 I'm always here to help you find the best service providers. Is there anything else you'd like to know about our services or providers?";
    } else {
        return "I can help you find the best service providers in your area! 🔍 Popular categories include:\n\n• Home Services (cleaning, repairs)\n• Tech Services (web development, IT support)\n• Education (tutoring, test prep)\n• Creative (design, photography)\n• Health & Wellness (fitness, nutrition)\n• Business Services (consulting, marketing)\n\nWhat service are you looking for?";
    }
}

function addMessage(text, sender) {
    const chatbotMessages = document.getElementById('chatbotMessages');
    if (!chatbotMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Modal functionality
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    // Close modal when clicking close button
    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });
    
    // Close modal when clicking outside
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function openModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Scroll effects
function setupScrollEffects() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.category-card, .service-card, .testimonial-card, .step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
    
    // Parallax effect for hero image
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero-image');
        if (parallax) {
            const speed = scrolled * 0.5;
            parallax.style.transform = `translateY(${speed}px)`;
        }
    });
}

// Form validation
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const formType = form.id;
            
            // Basic validation
            let isValid = true;
            const requiredFields = form.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = '#dc3545';
                    field.addEventListener('input', function() {
                        this.style.borderColor = '';
                    }, { once: true });
                }
            });
            
            // Email validation
            const emailFields = form.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                if (field.value && !isValidEmail(field.value)) {
                    isValid = false;
                    field.style.borderColor = '#dc3545';
                    showNotification('Please enter a valid email address', 3000, 'error');
                }
            });
            
            // Password validation for signup
            if (formType === 'signupForm') {
                const password = form.querySelector('#signupPassword');
                const confirmPassword = form.querySelector('#signupConfirmPassword');
                
                if (password && confirmPassword && password.value !== confirmPassword.value) {
                    isValid = false;
                    confirmPassword.style.borderColor = '#dc3545';
                    showNotification('Passwords do not match', 3000, 'error');
                }
            }
            
            if (isValid) {
                if (formType === 'signupForm') {
                    // Handle actual signup submission
                    handleSignupSubmission(form);
                } else {
                    // Simulate form submission for login
                    const submitButton = form.querySelector('button[type="submit"]');
                    const originalText = submitButton.textContent;
                    submitButton.textContent = 'Processing...';
                    submitButton.disabled = true;
                    
                    setTimeout(() => {
                        closeAllModals();
                        showNotification(
                            'Welcome back!',
                            3000,
                            'success'
                        );
                        
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                        form.reset();
                    }, 2000);
                }
            }
        });
    });
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, duration = 3000, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-weight: 500;
        max-width: 90%;
        text-align: center;
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 100);
    
    // Hide notification
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Popular tags functionality
document.addEventListener('DOMContentLoaded', function() {
    const popularTags = document.querySelectorAll('.popular-tags a');
    
    popularTags.forEach(tag => {
        tag.addEventListener('click', function(e) {
            e.preventDefault();
            const serviceInput = document.querySelector('.search-bar input[placeholder*="service"]');
            if (serviceInput) {
                serviceInput.value = this.textContent;
                performSearch();
            }
        });
    });
});

// Category links functionality
document.addEventListener('DOMContentLoaded', function() {
    const categoryLinks = document.querySelectorAll('.category-link');
    
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const categoryTitle = this.closest('.category-card').querySelector('h3').textContent;
            const serviceInput = document.querySelector('.search-bar input[placeholder*="service"]');
            if (serviceInput) {
                serviceInput.value = categoryTitle;
                performSearch();
            }
        });
    });
});

// Handle signup form submission
async function handleSignupSubmission(form) {
    const name = form.querySelector('#signupName').value;
    const email = form.querySelector('#signupEmail').value;
    const password = form.querySelector('#signupPassword').value;
    const confirmPassword = form.querySelector('#signupConfirmPassword').value;
    
    // Get selected user type
    const userType = form.querySelector('#signupUserType').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 3000, 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Creating Account...';
        submitButton.disabled = true;
        
        // Check if auth object exists
        if (!window.auth) {
            throw new Error('Authentication system not available');
        }
        
        // Attempt registration using the API with user type
        const response = await window.auth.register(name, email, password, userType);
        
        if (response.token) {
            showNotification('Account created successfully! Welcome to ServiceHub. Redirecting to dashboard...', 3000, 'success');
            
            // Close modal and redirect based on user type
            setTimeout(() => {
                closeAllModals();
                if (userType === 'provider') {
                    window.location.href = 'Services-provider-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } else {
            showNotification('Registration failed. Please try again.', 3000, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed. Please try again.', 3000, 'error');
    } finally {
        // Reset button state
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('ServiceHub initialized successfully! 🚀');
});