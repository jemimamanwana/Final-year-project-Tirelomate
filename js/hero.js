// ===== HERO.JS — Slider, Typing Effect, Scroll Animations, Navbar =====

(function () {
    'use strict';

    // ===== TYPEWRITER EFFECT =====
    const heroTexts = [
        'FIND TRUSTED <span class="accent">PROFESSIONALS</span>',
        'BOOK LOCAL <span class="accent">SERVICES</span>',
        'DISCOVER SKILLED <span class="accent">PROVIDERS</span>',
        'HIRE EXPERT <span class="accent">CLEANERS</span>',
        'CONNECT WITH <span class="accent">TUTORS</span>'
    ];

    const typingTarget = document.getElementById('typingTarget');
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingTimeout = null;

    // Strip HTML tags to get plain text length for typing
    function stripTags(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    function typeWriter() {
        if (!typingTarget) return;

        const currentFullText = heroTexts[textIndex];
        const plainText = stripTags(currentFullText);

        if (!isDeleting) {
            // Typing forward — build up the HTML progressively
            charIndex++;
            typingTarget.innerHTML = buildPartialHTML(currentFullText, charIndex);

            if (charIndex >= plainText.length) {
                // Fully typed — pause then start deleting
                typingTimeout = setTimeout(() => {
                    isDeleting = true;
                    typeWriter();
                }, 2500);
                return;
            }
            typingTimeout = setTimeout(typeWriter, 80);
        } else {
            // Deleting
            charIndex--;
            typingTarget.innerHTML = buildPartialHTML(currentFullText, charIndex);

            if (charIndex <= 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % heroTexts.length;
                typingTimeout = setTimeout(typeWriter, 400);
                return;
            }
            typingTimeout = setTimeout(typeWriter, 40);
        }
    }

    // Build partial HTML showing only `count` visible characters
    function buildPartialHTML(html, count) {
        var result = '';
        var visible = 0;
        var inTag = false;
        var i = 0;

        while (i < html.length && visible < count) {
            var ch = html[i];
            if (ch === '<') {
                // Include the entire tag
                var tagEnd = html.indexOf('>', i);
                if (tagEnd !== -1) {
                    result += html.substring(i, tagEnd + 1);
                    i = tagEnd + 1;
                    continue;
                }
            }
            result += ch;
            visible++;
            i++;
        }

        // Close any open tags
        var openTags = [];
        var tagRegex = /<(\/?)(span|div|b|i|em|strong)[^>]*>/gi;
        var match;
        while ((match = tagRegex.exec(result)) !== null) {
            if (match[1] === '/') {
                openTags.pop();
            } else {
                openTags.push(match[2]);
            }
        }
        while (openTags.length > 0) {
            result += '</' + openTags.pop() + '>';
        }

        return result;
    }

    // ===== HERO SLIDER =====
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.querySelector('.hero-arrow.prev');
    const nextBtn = document.querySelector('.hero-arrow.next');
    let currentSlide = 0;
    let slideInterval = null;
    let pauseTimeout = null;

    function goToSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;

        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        currentSlide = index;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    function startAutoSlide() {
        stopAutoSlide();
        slideInterval = setInterval(nextSlide, 6000);
    }

    function stopAutoSlide() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    }

    function pauseAutoSlide() {
        stopAutoSlide();
        if (pauseTimeout) clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(startAutoSlide, 10000);
    }

    // Arrow buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            prevSlide();
            pauseAutoSlide();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            nextSlide();
            pauseAutoSlide();
        });
    }

    // Dot buttons
    dots.forEach(function (dot, index) {
        dot.addEventListener('click', function () {
            goToSlide(index);
            pauseAutoSlide();
        });
    });

    // Start auto-slide
    if (slides.length > 0) {
        startAutoSlide();
    }

    // ===== NAVBAR SCROLL EFFECT =====
    var header = document.querySelector('header');
    window.addEventListener('scroll', function () {
        if (!header) return;
        if (window.scrollY > 80) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });

    // ===== SCROLL-TRIGGERED ANIMATIONS =====
    var scrollObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        scrollObserver.observe(el);
    });

    // ===== MOBILE MENU TOGGLE =====
    var menuToggle = document.querySelector('.mobile-menu-toggle');
    var navMenu = document.querySelector('nav');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function () {
            navMenu.classList.toggle('mobile-open');
        });
    }

    // ===== INIT TYPEWRITER =====
    if (typingTarget) {
        typeWriter();
    }

})();
