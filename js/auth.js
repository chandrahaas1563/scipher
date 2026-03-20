// ============================================================
// js/auth.js
// Handles auth guard, dynamic username, logout on all pages
// Works for both registered users and guests
// ============================================================

(function () {
    var userData = localStorage.getItem('scipher_user');

    if (!userData) {
        // No session at all — redirect to login
        window.location.replace('./login.html');
        return;
    }

    var user = JSON.parse(userData);
    var token = localStorage.getItem('scipher_token');

    // Guest check — guests have no token but have isGuest flag
    var isGuest = user.isGuest === true;

    if (!isGuest && !token) {
        // Has user data but no token and not a guest — stale session, clear it
        localStorage.removeItem('scipher_user');
        window.location.replace('./login.html');
        return;
    }

    // ── On page load: update username and trophy count ──────
    document.addEventListener('DOMContentLoaded', function () {

        // Fix username in nav (works on all page layouts)
        var nameEls = document.querySelectorAll(
            '.profile__button-name, .header__profile-name h6, #nav-username'
        );
        nameEls.forEach(function (el) {
            el.textContent = isGuest ? user.username + ' (Guest)' : user.username;
        });

        // Fix trophy count
        var trophyEls = document.querySelectorAll(
            '.main-profile-counter p, .header__profile-counter p, #nav-trophy-count'
        );
        trophyEls.forEach(function (el) {
            el.textContent = user.trophy_count || 0;
        });

        // Fix all logout links inside profile dropdowns
        var allLinks = document.querySelectorAll('a[href="./login.html"]');
        allLinks.forEach(function (link) {
            var parent = link.closest('.profile__dropdown');
            if (parent) {
                link.href = 'javascript:void(0)';
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    logout();
                });
            }
        });

        // Guest banner
        if (isGuest) {
            var banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);padding:8px 20px;border-radius:20px;font-size:0.8rem;z-index:9999;white-space:nowrap;';
            banner.innerHTML = '👤 Playing as guest — <a href="./create-account.html" style="color:#00e5ff;text-decoration:none;">Create an account</a> to save your stats';
            document.body.appendChild(banner);
            setTimeout(function() {
                banner.style.transition = 'opacity 0.5s';
                banner.style.opacity = '0';
                setTimeout(function() { banner.remove(); }, 500);
            }, 5000);
        }
    });

    // ── Global logout ────────────────────────────────────────
    window.logout = function () {
        localStorage.removeItem('scipher_token');
        localStorage.removeItem('scipher_user');
        window.location.href = './login.html';
    };

})();
