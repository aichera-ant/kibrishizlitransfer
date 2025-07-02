'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image'; // Assuming you use next/image for optimized images
import { Car, Users, Briefcase as LuggageIcon, Snowflake } from 'lucide-react';

// Placeholder vehicle data - replace with your actual data source
const vehicles = [
  {
    id: 1,
    name: 'Mercedes Vito',
    type: 'Minivan',
    capacity: 6,
    luggage: '4-5 Orta Boy Valiz',
    features: ['Klima', 'Konforlu Koltuklar', 'Geniş İç Hacim'],
    imageUrl: '/mercedes-vito-siyah.jpg', // Correct image path
    priceRange: '1000 - 1500 TRY',
  },
  {
    id: 2,
    name: 'Mercedes Sprinter',
    type: 'Minibüs',
    capacity: 10,
    luggage: '8-10 Orta Boy Valiz',
    features: ['Klima', 'Geniş Bagaj Alanı', 'Rahat Yolculuk'],
    imageUrl: '/mercedes-sprinter-siyah.jpg', // Correct image path
    priceRange: '1800 - 2500 TRY',
  },
  {
    id: 3,
    name: 'Sedan Araç (Örn: Passat)',
    type: 'Sedan',
    capacity: 3,
    luggage: '2-3 Orta Boy Valiz',
    features: ['Klima', 'Ekonomik Seçenek', 'Konforlu Sürüş'],
    imageUrl: '', // No image available yet
    priceRange: '700 - 1000 TRY',
  },
  // Add more vehicles as needed
];

export default function AraclarPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Araç Filomuz
        </h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Transfer ihtiyaçlarınıza uygun, konforlu ve güvenli araç seçeneklerimiz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="p-0 relative">
              {/* Ensure you have a placeholder or actual images at these paths */}
              <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                {vehicle.imageUrl ? (
                  <Image 
                    src={vehicle.imageUrl} 
                    alt={vehicle.name} 
                    width={400} 
                    height={224} 
                    className="object-cover w-full h-full"
                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x224?text=Araç+Görseli'; }} // Fallback
                  />
                ) : (
                  <Car className="w-24 h-24 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-grow flex flex-col">
              <CardTitle className="text-xl font-semibold text-gray-800 mb-2">{vehicle.name}</CardTitle>
              <CardDescription className="text-sm text-gray-500 mb-3">{vehicle.type}</CardDescription>
              
              <div className="space-y-2 text-sm text-gray-700 mb-4 flex-grow">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-500" /> Kapasite: {vehicle.capacity} Yolcu
                </div>
                <div className="flex items-center">
                  <LuggageIcon className="h-4 w-4 mr-2 text-green-500" /> Bagaj: {vehicle.luggage}
                </div>
                {vehicle.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center">
                    <Snowflake className="h-4 w-4 mr-2 text-purple-500" /> {feature}
                  </div>
                ))}
              </div>
              
              <div className="mt-auto">
                <p className="text-lg font-semibold text-gray-800 mb-3">{vehicle.priceRange}</p>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = '/'} // Redirect to homepage or booking page
                >
                  Hemen Rezervasyon Yap
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 