import axios from 'axios'

// Helper function to get cookie value by name
function getCookie(name: string): string | null {
	const value = `; ${document.cookie}`
	const parts = value.split(`; ${name}=`)
	if (parts.length === 2) {
		// Pop the last part, split by ';', and return the first element
		const cookieValue = parts.pop()?.split(';').shift();
        // Decode the cookie value if it's URL encoded
        return cookieValue ? decodeURIComponent(cookieValue) : null;
	}
	return null
}

// Backend API adresini .env.local dosyasından veya doğrudan al
const baseURL = '/api' // Changed to relative path

const apiClient = axios.create({
	baseURL: baseURL,
	withCredentials: true, // Cookie'lerin gönderilmesini sağlar (Sanctum için önemli)
	// xsrfCookieName ve xsrfHeaderName burada artık gerekli değil, interceptor halledecek.
	headers: {
		'X-Requested-With': 'XMLHttpRequest',
		Accept: 'application/json',
	},
})

// Request interceptor to add XSRF token header
apiClient.interceptors.request.use((config) => {
	const token = getCookie('XSRF-TOKEN')
	if (token) {
		config.headers['X-XSRF-TOKEN'] = token
	}
	return config
}, (error) => {
	// Do something with request error
	return Promise.reject(error)
})

// CSRF cookie'sini almak için bir fonksiyon (giriş öncesi çağrılacak)
export const fetchCsrfToken = async () => {
	try {
		// apiClient yerine doğrudan axios kullanarak tam URL belirtelim
		await axios.get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true })
		console.log('CSRF token fetched') // Geliştirme için log
	} catch (error) {
		console.error('Error fetching CSRF token:', error)
		// Hata yönetimi eklenebilir
	}
}

export default apiClient 