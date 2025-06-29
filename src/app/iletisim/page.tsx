'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function IletisimPage() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Handle form submission logic here
    alert('Mesajınız gönderildi! (Bu bir demo bildirimidir.)');
    // Reset form fields if needed
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center text-2xl">
            <Mail className="mr-3 h-7 w-7 text-green-600" />
            İletişim
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
          {/* Contact Information Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">İletişim Bilgilerimiz</h2>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700">Adres</h3>
                <p className="text-gray-600">
                  Örnek Caddesi No: 123, Kat: 4 Daire: 5<br />
                  Girne, KKTC
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700">Telefon</h3>
                <p className="text-gray-600">+90 555 123 45 67</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700">E-posta</h3>
                <p className="text-gray-600">info@orneksirket.com</p>
              </div>
            </div>
            {/* You can add a simple map embed here if needed */}
            {/* e.g., <iframe src="..." width="100%" height="250" style={{border:0}} allowFullScreen loading="lazy"></iframe> */}
          </div>

          {/* Contact Form Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Bize Ulaşın</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Adınız Soyadınız</Label>
                <Input id="name" name="name" type="text" placeholder="Adınız ve Soyadınız" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta Adresiniz</Label>
                <Input id="email" name="email" type="email" placeholder="ornek@mail.com" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">Konu</Label>
                <Input id="subject" name="subject" type="text" placeholder="Mesajınızın konusu" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">Mesajınız</Label>
                <Textarea id="message" name="message" placeholder="Mesajınızı buraya yazın..." required rows={5} className="mt-1" />
              </div>
              <div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />
                  Mesajı Gönder
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 