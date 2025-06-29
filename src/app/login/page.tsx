'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Eski API istemcisi ve CSRF token alımı kaldırıldı
// import apiClient, { fetchCsrfToken } from '@/lib/api/client' 
import { supabase } from '@/lib/supabaseClient' // Supabase istemcisi import edildi
import { AuthApiError } from '@supabase/supabase-js' // AuthApiError tipini import et
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	const handleLogin = async (event: React.FormEvent) => {
		event.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			// Eski API çağrıları kaldırıldı
			// await fetchCsrfToken()
			// await apiClient.post('/login', { email, password })

			// Supabase ile giriş yapmayı dene
			const { data, error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password,
			})

			if (signInError) {
				// Supabase'den gelen hatayı yakala
				throw signInError 
			}

			// Başarılı girişte dashboard'a yönlendir (veya kullanıcı oturumunu kontrol et)
			console.log('Giriş başarılı:', data) // İsteğe bağlı: Başarılı yanıtı logla
			router.push('/admin/dashboard')

		} catch (error: unknown) {
			console.error('Login hatası:', error)
			// Supabase AuthError tipini kontrol et (daha güvenli)
			if (error instanceof AuthApiError) { // AuthApiError tipini kullan
				setError(error.message || 'E-posta veya şifre hatalı.')
			} else if (error instanceof Error) {
				setError(error.message)
			} else {
				setError('Giriş işlemi sırasında bilinmeyen bir hata oluştu.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">Admin Girişi</CardTitle>
					<CardDescription>
						Devam etmek için e-posta ve şifrenizi girin.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleLogin}>
					<CardContent className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="email">E-posta</Label>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
								value={email}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								disabled={isLoading}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Şifre</Label>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								disabled={isLoading}
							/>
						</div>
						{error && (
							<p className="text-sm text-red-500">{error}</p>
						)}
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							className="w-full"
							disabled={isLoading}
						>
							{isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	)
} 