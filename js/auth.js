// ============================================================
// js/auth.js
// ============================================================

(function () {
    var userData = localStorage.getItem('scipher_user');
    var token = localStorage.getItem('scipher_token');

    // No session at all → go to login
    if (!userData) {
        window.location.replace('./login.html');
        return;
    }

    var user;
    try { user = JSON.parse(userData); } catch(e) {
        localStorage.removeItem('scipher_user');
        window.location.replace('./login.html');
        return;
    }

    // Guest session — has scipher_user with isGuest:true, no token needed → allow through
    // Registered session — must have both scipher_user and scipher_token → allow through
    // Anything else (user data but no token, not a guest) → stale, clear and redirect
    if (!user.isGuest && !token) {
        localStorage.removeItem('scipher_user');
        window.location.replace('./login.html');
        return;
    }

    // ── Passed auth — update the page UI ─────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        // Replace username in nav on any page layout
        document.querySelectorAll(
            '.profile__button-name, .header__profile-name h6, #nav-username'
        ).forEach(function (el) {
            el.textContent = user.isGuest ? user.username + ' (Guest)' : user.username;
        });

        // Replace trophy count
        document.querySelectorAll(
            '.main-profile-counter p, .header__profile-counter p, #nav-trophy-count'
        ).forEach(function (el) {
            el.textContent = user.trophy_count || 0;
        });

        // Fix logout links inside profile dropdowns
        document.querySelectorAll('.profile__dropdown a[href="./login.html"]').forEach(function (link) {
            link.href = 'javascript:void(0)';
            link.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        });

        // Guest banner
        if (user.isGuest) {
            var banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);padding:8px 20px;border-radius:20px;font-size:0.8rem;z-index:9999;white-space:nowrap;';
            banner.innerHTML = '👤 Playing as guest — <a href="./login.html" style="color:#00e5ff;text-decoration:none;" onclick="logout()">Sign in</a> to save your stats';
            document.body.appendChild(banner);
            setTimeout(function () {
                banner.style.transition = 'opacity 0.5s';
                banner.style.opacity = '0';
                setTimeout(function () { banner.remove(); }, 500);
            }, 5000);
        }
    });

    // ── Logout ────────────────────────────────────────────────
    window.logout = function () {
        localStorage.removeItem('scipher_token');
        localStorage.removeItem('scipher_user');
        window.location.href = './login.html';
    };

})();
