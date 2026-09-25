/**
 * Wallet Environment & API Configuration
 * 
 * Provides clean separation between Development and Production API endpoints.
 * Ensures the native Android mobile app connects to the PC backend over local Wi-Fi,
 * while leaving production and standard web access completely unaffected.
 */

(function () {
    const APP_CONFIG = {
        // Active environment: 'development' | 'production'
        // In 'development', the native Android build routes requests to DEV_API_URL.
        // In 'production', the native Android build routes requests to PROD_API_URL.
        ENVIRONMENT: 'production',

        // Development API URL for Android mobile builds over Wi-Fi
        // Set to your computer's actual Wi-Fi LAN IP and Express port
        DEV_API_URL: 'http://10.246.23.55:8000',

        // Production API URL for production Android APK (e.g. 'https://api.yourdomain.com')
        // When empty string '', standard web browsers use relative URLs automatically.
        PROD_API_URL: 'https://wallet-ochre-tau.vercel.app',

        /**
         * Detect if the code is executing inside the Capacitor native Android app
         */
        isNativePlatform() {
            if (typeof window === 'undefined') return false;

            // 1. Capacitor native bridge object detection
            if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
                if (window.Capacitor.isNativePlatform()) return true;
            }

            // 2. Platform identifier check
            if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
                if (window.Capacitor.getPlatform() === 'android') return true;
            }

            // 3. Android WebView protocol & origin detection
            // Capacitor Android serves local assets at http://localhost (port empty / 80) or capacitor://localhost
            const isCapacitorScheme = window.location.protocol === 'capacitor:';
            const isLocalhostWebView = (
                window.location.hostname === 'localhost' &&
                window.location.port !== '8000' &&
                window.location.port !== '3000'
            );

            return isCapacitorScheme || isLocalhostWebView;
        },

        /**
         * Returns the active API Base URL
         */
        getApiBaseUrl() {
            // Optional local storage override for quick testing without rebuilding
            if (typeof localStorage !== 'undefined') {
                const customUrl = localStorage.getItem('wallet_custom_api_url');
                if (customUrl && customUrl.trim()) {
                    return customUrl.trim().replace(/\/+$/, '');
                }
            }

            // Native Android App: Route to LAN IP in dev, or prod backend in prod
            if (this.isNativePlatform()) {
                if (this.ENVIRONMENT === 'production') {
                    return (this.PROD_API_URL || '').replace(/\/+$/, '');
                }
                return (this.DEV_API_URL || '').replace(/\/+$/, '');
            }

            // Standard Web Browser (PC localhost or hosted website):
            // Return empty string so all API requests resolve relatively to current origin
            return '';
        },

        /**
         * Resolves a relative API endpoint (e.g. '/api/transactions') into a full URL
         */
        apiUrl(endpoint) {
            const base = this.getApiBaseUrl();
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
            return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
        }
    };

    // Attach to global window
    window.APP_CONFIG = APP_CONFIG;
    window.apiUrl = function (endpoint) {
        return APP_CONFIG.apiUrl(endpoint);
    };

    console.log(`[Wallet Config] Environment: ${APP_CONFIG.ENVIRONMENT} | Native: ${APP_CONFIG.isNativePlatform()} | API Base: "${APP_CONFIG.getApiBaseUrl() || '(relative)'}"`);
})();
