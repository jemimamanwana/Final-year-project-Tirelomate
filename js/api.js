// API Integration for Agora Frontend
// This file handles all communication with the backend API

const API_BASE_URL = 'http://localhost:5000/api';

// API Helper Functions
class API {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header if token exists (Bearer scheme)
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication Methods
    async login(email, password) {
        try {
            const response = await this.request('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.token) {
                this.setToken(response.token);
            }

            return response;
        } catch (error) {
            throw new Error('Login failed: ' + error.message);
        }
    }

    async register(name, email, password, user_type = 'customer') {
        try {
            const response = await this.request('/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, user_type })
            });

            if (response.token) {
                this.setToken(response.token);
            }

            return response;
        } catch (error) {
            throw new Error('Registration failed: ' + error.message);
        }
    }

    async logout() {
        try {
            await this.request('/logout', {
                method: 'POST'
            });
            this.clearToken();
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            this.clearToken(); // Clear token even if API call fails
            return { success: true };
        }
    }

    // Check if current user is a provider
    async isProvider() {
        try {
            const user = await this.getCurrentUser();
            return user.user_type === 'provider';
        } catch (error) {
            console.error('Error checking user type:', error);
            return false;
        }
    }

    // User Methods
    async getCurrentUser() {
        try {
            const token = this.token;
            if (!token) {
                throw new Error('No authentication token');
            }

            // Use the new /user/me endpoint
            return await this.request('/user/me');
        } catch (error) {
            throw new Error('Failed to get user data: ' + error.message);
        }
    }

    async updateProfile(userData) {
        try {
            const token = this.token;
            if (!token) {
                throw new Error('No authentication token');
            }

            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.user_id;

            return await this.request(`/user/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
        } catch (error) {
            throw new Error('Failed to update profile: ' + error.message);
        }
    }

    // Services Methods
    async getServices(category = 'all', search = '') {
        try {
            const params = new URLSearchParams();
            if (category !== 'all') params.append('category', category);
            if (search) params.append('search', search);

            const queryString = params.toString();
            const endpoint = queryString ? `/services?${queryString}` : '/services';

            return await this.request(endpoint);
        } catch (error) {
            throw new Error('Failed to fetch services: ' + error.message);
        }
    }

    async getServiceById(serviceId) {
        try {
            return await this.request(`/services/${serviceId}`);
        } catch (error) {
            throw new Error('Failed to fetch service: ' + error.message);
        }
    }

    async createService(serviceData) {
        try {
            return await this.request('/services', {
                method: 'POST',
                body: JSON.stringify(serviceData)
            });
        } catch (error) {
            throw new Error('Failed to create service: ' + error.message);
        }
    }

    async updateService(serviceId, serviceData) {
        try {
            return await this.request(`/services/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify(serviceData)
            });
        } catch (error) {
            throw new Error('Failed to update service: ' + error.message);
        }
    }

    async deleteService(serviceId) {
        try {
            return await this.request(`/services/${serviceId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error('Failed to delete service: ' + error.message);
        }
    }

    // Reviews Methods
    async getServiceReviews(serviceId) {
        try {
            return await this.request(`/services/${serviceId}/reviews`);
        } catch (error) {
            throw new Error('Failed to fetch reviews: ' + error.message);
        }
    }

    async createReview(serviceId, reviewData) {
        try {
            return await this.request(`/services/${serviceId}/reviews`, {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
        } catch (error) {
            throw new Error('Failed to create review: ' + error.message);
        }
    }

    async getProviderRating(providerId) {
        return await this.request(`/provider/${providerId}/rating`);
    }

    async getProviderReviews(providerId) {
        return await this.request(`/provider/${providerId}/reviews`);
    }

    // Bookings Methods
    async getBookings() {
        try {
            return await this.request('/bookings');
        } catch (error) {
            throw new Error('Failed to fetch bookings: ' + error.message);
        }
    }

    async createBooking(bookingData) {
        try {
            return await this.request('/bookings', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });
        } catch (error) {
            throw new Error('Failed to create booking: ' + error.message);
        }
    }

    async updateBookingStatus(bookingId, status) {
        try {
            return await this.request(`/bookings/${bookingId}`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
        } catch (error) {
            throw new Error('Failed to update booking: ' + error.message);
        }
    }

    // Provider-specific endpoints
    async getProviderBookings(status = 'upcoming') {
        try {
            const params = new URLSearchParams({ status });
            return await this.request(`/provider/bookings?${params.toString()}`);
        } catch (error) {
            throw new Error('Failed to fetch provider bookings: ' + error.message);
        }
    }

    async getProviderServices() {
        try {
            return await this.request('/provider/services');
        } catch (error) {
            throw new Error('Failed to fetch provider services: ' + error.message);
        }
    }

    async updateProviderBookingStatus(bookingId, status) {
        try {
            return await this.request(`/provider/booking/${bookingId}`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
        } catch (error) {
            throw new Error('Failed to update provider booking: ' + error.message);
        }
    }

    // AI Match Method
    async aiMatch(service, location, top_n = 1) {
        try {
            return await this.request('/ai-match', {
                method: 'POST',
                body: JSON.stringify({ service, location, top_n })
            });
        } catch (error) {
            throw new Error('Failed to find AI match: ' + error.message);
        }
    }

    // Chat Method
    async sendChatMessage(message) {
        try {
            return await this.request('/chat', {
                method: 'POST',
                body: JSON.stringify({ message })
            });
        } catch (error) {
            throw new Error('Failed to send message: ' + error.message);
        }
    }

    // Payment Methods
    async createPayment(bookingId, amount, paymentMethod) {
        return await this.request('/payments', {
            method: 'POST',
            body: JSON.stringify({ booking_id: bookingId, amount, payment_method: paymentMethod })
        });
    }

    async getPayments() {
        return await this.request('/payments');
    }

    // Messaging Methods
    async getConversations() {
        return await this.request('/messages/conversations');
    }

    async getMessages(withUserId) {
        return await this.request(`/messages?with=${withUserId}`);
    }

    async sendDirectMessage(receiverId, content, bookingId = null) {
        const body = { receiver_id: receiverId, content };
        if (bookingId) body.booking_id = bookingId;
        return await this.request('/messages', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
}

// Create global API instance
const api = new API();

// Export for use in other files
window.api = api;

// Authentication Helper Functions
window.auth = {
    // Check if user is logged in
    isLoggedIn() {
        return !!api.token;
    },

    // Get current user data
    async getCurrentUser() {
        if (!this.isLoggedIn()) {
            return null;
        }
        try {
            return await api.getCurrentUser();
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    },

    // Check if current user is a service provider
    async isProvider() {
        const user = await this.getCurrentUser();
        return user && user.user_type === 'provider';
    },

    // Login user
    async login(email, password) {
        try {
            const response = await api.login(email, password);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Register user
    async register(name, email, password, user_type = 'customer') {
        try {
            const response = await api.register(name, email, password, user_type);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Logout user
    async logout() {
        try {
            await api.logout();
            // Clear any cached profile data used by dashboards
            try {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('currentProvider');
            } catch (_) {}
            // Navigate back to home
            window.location.replace('index.html');
        } catch (error) {
            console.error('Logout error:', error);
            try {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('currentProvider');
            } catch (_) {}
            window.location.replace('index.html');
        }
    }
};

// Service Helper Functions
window.services = {
    // Get all services
    async getAll(category = 'all', search = '') {
        try {
            return await api.getServices(category, search);
        } catch (error) {
            console.error('Failed to get services:', error);
            return [];
        }
    },

    // Get service by ID
    async getById(serviceId) {
        try {
            return await api.getServiceById(serviceId);
        } catch (error) {
            console.error('Failed to get service:', error);
            return null;
        }
    },

    // Create new service
    async create(serviceData) {
        try {
            return await api.createService(serviceData);
        } catch (error) {
            throw error;
        }
    }
};

// Booking Helper Functions
window.bookings = {
    // Get user bookings
    async getAll() {
        try {
            return await api.getBookings();
        } catch (error) {
            console.error('Failed to get bookings:', error);
            return [];
        }
    },

    // Create new booking
    async create(bookingData) {
        try {
            return await api.createBooking(bookingData);
        } catch (error) {
            throw error;
        }
    },

    // Update booking status
    async updateStatus(bookingId, status) {
        try {
            return await api.updateBookingStatus(bookingId, status);
        } catch (error) {
            throw error;
        }
    }
};

// Review Helper Functions
window.reviews = {
    // Get service reviews
    async getForService(serviceId) {
        try {
            return await api.getServiceReviews(serviceId);
        } catch (error) {
            console.error('Failed to get reviews:', error);
            return [];
        }
    },

    // Create new review
    async create(serviceId, reviewData) {
        try {
            return await api.createReview(serviceId, reviewData);
        } catch (error) {
            throw error;
        }
    }
};

// AI Match Helper Functions
window.aiMatch = {
    // Find AI match
    async find(service, location) {
        try {
            return await api.aiMatch(service, location);
        } catch (error) {
            console.error('Failed to find AI match:', error);
            return null;
        }
    }
};

// Chat Helper Functions
window.chat = {
    // Send chat message
    async sendMessage(message) {
        try {
            return await api.sendChatMessage(message);
        } catch (error) {
            console.error('Failed to send chat message:', error);
            return { response: 'Sorry, I am unable to respond at the moment. Please try again later.' };
        }
    }
};

// Messaging Helper Functions
window.messaging = {
    async getConversations() {
        try { return await api.getConversations(); }
        catch (e) { console.error('Failed to get conversations:', e); return []; }
    },
    async getMessages(withUserId) {
        try { return await api.getMessages(withUserId); }
        catch (e) { console.error('Failed to get messages:', e); return []; }
    },
    async send(receiverId, content, bookingId) {
        return await api.sendDirectMessage(receiverId, content, bookingId);
    }
};

// Utility Functions
window.utils = {
    // Show notification
    showNotification(message, type = 'info', duration = 4000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    },

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    },

    // Format price
    formatPrice(price) {
        return `$${parseFloat(price).toFixed(2)}`;
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format time
    formatTime(timeString) {
        const date = new Date(`2000-01-01T${timeString}`);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    // Debounce function
    debounce(func, wait) {
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
};

console.log('API integration loaded successfully');

