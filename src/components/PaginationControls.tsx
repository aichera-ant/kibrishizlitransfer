'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationControlsProps {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
    total?: number;     // Toplam kayıt sayısı (opsiyonel)
    from?: number;      // Gösterilen ilk kayıt no (opsiyonel)
    to?: number;        // Gösterilen son kayıt no (opsiyonel)
}

export default function PaginationControls({
    currentPage,
    lastPage,
    onPageChange,
    total,
    from,
    to
}: PaginationControlsProps) {

    const handleFirstPage = () => onPageChange(1);
    const handlePreviousPage = () => onPageChange(currentPage - 1);
    const handleNextPage = () => onPageChange(currentPage + 1);
    const handleLastPage = () => onPageChange(lastPage);

    // Basit sayfa numarası listesi oluşturma (örn: [1, ..., 4, 5, 6, ..., 10])
    const getPageNumbers = () => {
        const delta = 2; // Mevcut sayfanın etrafında kaç sayfa gösterilecek
        const range = [];
        const rangeWithDots = [];

        range.push(1);
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(lastPage - 1, currentPage + delta); i++) {
            range.push(i);
        }
        range.push(lastPage);

        let l: number | null = null;
        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
        return rangeWithDots;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="mt-6 flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            {/* Bilgi Metni (Opsiyonel) */}
            {(total !== undefined && from !== undefined && to !== undefined) && (
                <div className="text-sm text-muted-foreground">
                    Toplam {total} kayıttan {from}-{to} arası gösteriliyor.
                </div>
            )}

            {/* Sayfalama Butonları */}
            <div className="flex items-center space-x-1">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFirstPage}
                    disabled={currentPage === 1}
                    aria-label="İlk Sayfa"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    aria-label="Önceki Sayfa"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Sayfa Numaraları */}
                {pageNumbers.map((page, index) => (
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-2 py-1 text-sm">{page}</span>
                    )
                ))}

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPage}
                    disabled={currentPage === lastPage}
                    aria-label="Sonraki Sayfa"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLastPage}
                    disabled={currentPage === lastPage}
                    aria-label="Son Sayfa"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
} 