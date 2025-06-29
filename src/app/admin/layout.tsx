import AdminLayout from '@/components/admin/layout'
import { ReactNode } from 'react'

// TODO: Burada veya middleware'de kimlik doğrulaması kontrolü ekle

export default function Layout({ children }: { children: ReactNode }) {
	return <AdminLayout>{children}</AdminLayout>
} 