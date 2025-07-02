'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function IletisimPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message'),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        (event.target as HTMLFormElement).reset();
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">İletişim Bilgilerimiz</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Ortaköy Hızlı Transfer Ltd</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 mt-1 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-700">24/7 İletişim Hattı</h4>
                    <a href="tel:+905338847266" className="text-lg font-bold text-green-600 hover:text-green-700">
                      +90 533 884 72 66
                    </a>
                    <p className="text-sm text-gray-500 mt-1">WhatsApp ve arama yapabilirsiniz</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 mt-1 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-700">E-posta</h4>
                    <a href="mailto:info@cyprusfasttransfer.com" className="text-blue-600 hover:text-blue-700 font-medium">
                      info@cyprusfasttransfer.com
                    </a>
                    <p className="text-sm text-gray-500 mt-1">En geç 2 saat içinde yanıtlıyoruz</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 mt-1 text-purple-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-700">Çalışma Saatleri</h4>
                    <p className="text-gray-600">7/24 Hizmet</p>
                    <p className="text-sm text-gray-500 mt-1">Uçak saatlerinize uygun transfer hizmeti</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 mt-1 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-700">Hizmet Bölgesi</h4>
                    <p className="text-gray-600">
                      Kuzey Kıbrıs Türk Cumhuriyeti<br />
                      Ercan Havalimanı ve tüm turistik bölgeler
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Hızlı İletişim İpucu</h4>
              <p className="text-sm text-yellow-700">
                Acil durumlar için WhatsApp üzerinden <strong>+90 533 884 72 66</strong> numarasına 
                mesaj gönderebilir veya arayabilirsiniz. Uçak saatinizi ve lokasyonunuzu belirtmeyi unutmayın!
              </p>
            </div>
          </div>

          {/* Contact Form Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Bize Ulaşın</h2>
            <p className="text-gray-600 text-sm mb-4">
              Transfer rezervasyonu, fiyat bilgisi veya herhangi bir sorunuz için formu doldurun. 
              En kısa sürede size dönüş yapacağız.
            </p>

            {/* Success/Error Messages */}
            {submitStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.
                </AlertDescription>
              </Alert>
            )}
            
            {submitStatus === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Mesaj gönderilirken bir hata oluştu. Lütfen telefon numaramızdan bize ulaşın.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Ad Soyad *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    type="text" 
                    placeholder="Adınız ve Soyadınız" 
                    required 
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta *</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="ornek@email.com" 
                    required 
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">Konu *</Label>
                <select 
                  id="subject" 
                  name="subject" 
                  required 
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="">Konu seçiniz</option>
                  <option value="Transfer Rezervasyonu">Transfer Rezervasyonu</option>
                  <option value="Fiyat Bilgisi">Fiyat Bilgisi</option>
                  <option value="Rezervasyon İptali">Rezervasyon İptali</option>
                  <option value="Şikayet/Öneri">Şikayet/Öneri</option>
                  <option value="Genel Bilgi">Genel Bilgi</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">Mesajınız *</Label>
                <Textarea 
                  id="message" 
                  name="message" 
                  placeholder="Uçak saatiniz, nereden nereye transfer ihtiyacınız ve diğer detayları belirtiniz..." 
                  required 
                  rows={5} 
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 İpucu:</strong> Hızlı cevap alabilmek için mesajınızda 
                  şu bilgileri belirtiniz: Transfer tarihi, uçak saati, yolcu sayısı, 
                  nereden nereye gideceğiniz.
                </p>
              </div>
              
              <div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Mesajı Gönder
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 