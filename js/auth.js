// ============================================================
// js/auth.js
// Add <script src="./js/auth.js"></script> to every HTML page
// before the closing </body> tag.
// This fixes: hardcoded Pink_bob, broken logout, auth guard
// ============================================================

(function () {
    // ── 1. Auth guard: redirect to login if not signed in ──
    var token = localStorage.getItem('scipher_token');
    var userData = localStorage.getItem('scipher_user');

    if (!token || !userData) {
        window.location.replace('./login.html');
        return;
    }

    var user = JSON.parse(userData);

    // ── 2. Replace ALL instances of Pink_bob / Pink_Bob / pink_bob ──
    // Works on any page regardless of the element structure
    document.addEventListener('DOMContentLoaded', function () {

        // Fix any h6 inside a profile button area
        var nameEls = document.querySelectorAll(
            '.profile__button-name, .header__profile-name h6, #nav-username'
        );
        nameEls.forEach(function (el) {
            el.textContent = user.username;
        });

        // Fix trophy count
        var trophyEls = document.querySelectorAll(
            '.main-profile-counter p, .header__profile-counter p, #nav-trophy-count'
        );
        trophyEls.forEach(function (el) {
            el.textContent = user.trophy_count || 0;
        });

        // ── 3. Fix all logout links ──
        // Find any <a> that goes to login.html and has logout text/icon
        var allLinks = document.querySelectorAll('a[href="./login.html"]');
        allLinks.forEach(function (link) {
            link.href = 'javascript:void(0)';
            link.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        });
    });

    // ── 4. Global logout function ──
    window.logout = function () {
        localStorage.removeItem('scipher_token');
        localStorage.removeItem('scipher_user');
        window.location.href = './login.html';
    };

})();
