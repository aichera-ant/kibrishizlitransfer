'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, Car, Users, ShieldCheck } from 'lucide-react';

const services = [
  {
    icon: <Car className="h-10 w-10 text-blue-500 mb-4" />,
    title: 'Havaalanı Transferleri',
    description: 'Havaalanından otelinize veya istediğiniz herhangi bir noktaya konforlu ve güvenli transfer hizmetleri.',
  },
  {
    icon: <Briefcase className="h-10 w-10 text-green-500 mb-4" />,
    title: 'Şehirlerarası Transferler',
    description: 'Kıbrıs içinde farklı şehirlere veya bölgelere özel transfer çözümleri.',
  },
  {
    icon: <Users className="h-10 w-10 text-purple-500 mb-4" />,
    title: 'Grup Transferleri',
    description: 'Kalabalık gruplar için geniş araç filomuzla özel taşıma hizmetleri.',
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-red-500 mb-4" />,
    title: 'VIP Transfer Hizmetleri',
    description: 'Özel ve lüks araçlarımızla, kişiye özel VIP transfer deneyimi.',
  },
  // İhtiyaç duyulursa daha fazla hizmet eklenebilir
];

export default function HizmetlerPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Sunduğumuz Hizmetler
        </h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Kıbrıs&apos;taki tüm transfer ihtiyaçlarınız için profesyonel çözümler sunuyoruz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {services.map((service, index) => (
          <Card key={index} className="flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              {service.icon}
              <CardTitle className="text-xl font-semibold text-gray-800">{service.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                {service.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 