'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function HakkimizdaPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center text-2xl">
            <Info className="mr-3 h-7 w-7 text-blue-600" />
            Hakkımızda
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Misyonumuz</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero.
              Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.
              Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.
              Mauris massa. Vestibulum lacinia arcu eget nulla.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Vizyonumuz</h2>
            <p>
              Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.
              Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor.
              Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis.
              Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Değerlerimiz</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Müşteri Memnuniyeti</li>
              <li>Güvenilirlik</li>
              <li>Kaliteli Hizmet</li>
              <li>Sürekli Gelişim</li>
              <li>Takım Çalışması</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Ekibimiz</h2>
            <p>
              Deneyimli ve profesyonel ekibimizle Kıbrıs&apos;taki transfer ihtiyaçlarınız için en iyi çözümleri sunmak üzere buradayız.
              Her bir ekip üyemiz, sizlere konforlu ve güvenli bir yolculuk deneyimi yaşatmak için özenle çalışmaktadır.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
} 