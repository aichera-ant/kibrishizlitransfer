'use client'

import { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api/client'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
// import { Badge } from "@/components/ui/badge" // Kullanılmadığı için kaldırıldı
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { AxiosError } from 'axios'; // AxiosError tipini import et (apiClient axios kullanıyorsa)

// Kullanıcı veri tipi (API'ye göre detaylandırılabilir)
interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    created_at?: string;
    updated_at?: string;
}

// API yanıtı için tip
interface UsersApiResponse {
    data: User[];
    links: { [key: string]: string | null };
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        path: string;
        per_page: number;
        to: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // TODO: Sayfalama state'leri

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await apiClient.get<UsersApiResponse>('/admin/users')
            setUsers(response.data.data)
        } catch (err: unknown) { // any yerine unknown kullanıldı
            console.error('Kullanıcılar alınamadı:', err)
            let errorMessage = 'Kullanıcılar yüklenirken bir hata oluştu.';
            if (err instanceof AxiosError && err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err instanceof Error) {
                // Genel Error mesajı (AxiosError değilse)
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false)
        }
    }, [setIsLoading, setError, setUsers]); // apiClient genellikle değişmez, bağımlılıklara eklenmedi

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleDelete = async (id: number) => {
        if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
            try {
                await apiClient.delete(`/admin/users/${id}`)
                setUsers(users.filter(u => u.id !== id))
                alert('Kullanıcı başarıyla silindi.');
            } catch (err: unknown) { // any yerine unknown kullanıldı
                console.error('Kullanıcı silinemedi:', err)
                let alertMessage = 'Kullanıcı silinirken bir hata oluştu.';
                if (err instanceof AxiosError && err.response?.data?.message) {
                    alertMessage += ': ' + err.response.data.message;
                } else if (err instanceof Error) {
                    alertMessage += ': ' + err.message;
                }
                alert(alertMessage);
            }
        }
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Kullanıcı Yönetimi</h1>
                <Button asChild>
                    <Link href="/admin/users/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kullanıcı Ekle
                    </Link>
                </Button>
            </div>

            {error && (
                <div className="mb-4 rounded border border-red-400 bg-red-100 p-4 text-red-700">
                    <p><strong>Hata:</strong> {error}</p>
                </div>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Ad</TableHead>
                            <TableHead>E-posta</TableHead>
                            <TableHead>Doğrulanma</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : users.length > 0 ? (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.email_verified_at ? 'Evet' : 'Hayır'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/admin/users/edit/${user.id}`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Gösterilecek kullanıcı bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {/* TODO: Sayfalama */}
            </Card>
        </div>
    )
} 