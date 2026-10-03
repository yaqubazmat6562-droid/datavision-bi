// ==========================================================
// DATAVISION BI - Auth Module
// ==========================================================

const AuthModule = (function() {

    function showMessage(text, type) {
        var msg = document.getElementById("authMessage");
        if (!msg) return;

        msg.className = "auth-message " + type;
        msg.textContent = text;
        msg.style.display = "block";
    }

    function hideMessage() {
        var msg = document.getElementById("authMessage");
        if (msg) {
            msg.style.display = "none";
        }
    }

    function setLoading(btnId, loading, originalText) {
        var btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? "Please wait..." : originalText;
    }

    async function signup() {
        hideMessage();

        var fullName = (document.getElementById("fullName") || {}).value || "";
        var email = (document.getElementById("email") || {}).value || "";
        var company = (document.getElementById("company") || {}).value || "";
        var country = (document.getElementById("country") || {}).value || "IN";
        var currency = (document.getElementById("currency") || {}).value || "INR";
        var password = (document.getElementById("password") || {}).value || "";
        var confirmPassword = (document.getElementById("confirmPassword") || {}).value || "";
        var agreeTerms = (document.getElementById("agreeTerms") || {}).checked || false;

        // Client validation
        if (!fullName.trim()) {
            return showMessage("Please enter your full name.", "error");
        }

        if (!email.trim() || !email.includes("@")) {
            return showMessage("Please enter a valid email address.", "error");
        }

        if (password.length < 8) {
            return showMessage("Password must be at least 8 characters.", "error");
        }

        if (password !== confirmPassword) {
            return showMessage("Passwords do not match.", "error");
        }

        if (!agreeTerms) {
            return showMessage("Please accept the Terms of Service.", "error");
        }

        setLoading("signupBtn", true, "Create Account");
        showMessage("Creating your account...", "info");

        try {
            var response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullName.trim(),
                    email: email.trim().toLowerCase(),
                    company: company.trim(),
                    country: country,
                    currency: currency,
                    password: password
                })
            });

            var data = await response.json();

            if (!data.success) {
                setLoading("signupBtn", false, "Create Account");
                return showMessage(data.message, "error");
            }

            showMessage("Account created! Redirecting...", "success");

            // Redirect
            setTimeout(function() {
                window.location.href = data.redirect || "/";
            }, 800);

        } catch (error) {
            setLoading("signupBtn", false, "Create Account");
            showMessage("Connection error: " + error.message, "error");
        }
    }

    async function login() {
        hideMessage();

        var email = (document.getElementById("email") || {}).value || "";
        var password = (document.getElementById("password") || {}).value || "";
        var remember = (document.getElementById("remember") || {}).checked || false;

        if (!email.trim() || !password) {
            return showMessage("Please enter email and password.", "error");
        }

        setLoading("loginBtn", true, "Sign In");
        showMessage("Signing in...", "info");

        try {
            var response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password,
                    remember: remember
                })
            });

            var data = await response.json();

            if (!data.success) {
                setLoading("loginBtn", false, "Sign In");
                return showMessage(data.message, "error");
            }

            showMessage("Success! Redirecting...", "success");

            setTimeout(function() {
                window.location.href = data.redirect || "/";
            }, 600);

        } catch (error) {
            setLoading("loginBtn", false, "Sign In");
            showMessage("Connection error: " + error.message, "error");
        }
    }

    async function logout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {}
        window.location.href = "/login";
    }

    async function checkAuth() {
        try {
            var response = await fetch("/api/auth/me");
            var data = await response.json();
            return data;
        } catch (error) {
            return { authenticated: false };
        }
    }

    return {
        signup: signup,
        login: login,
        logout: logout,
        checkAuth: checkAuth
    };

})();