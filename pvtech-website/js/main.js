// PV Tech LLC – Main JavaScript

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function () {
    var menuBtn = document.querySelector('.mobile-menu-btn');
    var nav = document.querySelector('.main-nav');

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            nav.classList.toggle('open');
            menuBtn.classList.toggle('active');
        });

        // Close menu when a link is clicked
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('open');
                menuBtn.classList.remove('active');
            });
        });
    }

    // Contact form handling
    var form = document.getElementById('contact-form');
    var status = document.getElementById('form-status');

    if (form && status) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var name = document.getElementById('name').value.trim();
            var email = document.getElementById('email').value.trim();
            var message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                status.className = 'form-status error';
                status.textContent = 'Please fill in all required fields.';
                return;
            }

            // Basic email validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                status.className = 'form-status error';
                status.textContent = 'Please enter a valid email address.';
                return;
            }

            // Show success message (no backend - static site)
            status.className = 'form-status success';
            status.textContent = 'Thank you for your message. We will respond within 24 hours.';
            form.reset();
        });
    }
});
