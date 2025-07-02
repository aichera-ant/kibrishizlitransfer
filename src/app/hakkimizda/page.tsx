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
        <CardContent className="pt-6 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Misyonumuz</h2>
            <p className="leading-relaxed">
              Kıbrıs Hızlı Transfer olarak, Kuzey Kıbrıs Türk Cumhuriyeti'nde faaliyet gösteren öncü transfer hizmeti sağlayıcısıyız. 
              Misyonumuz, ziyaretçilerimize havalimanından otellere, otellerden turistik bölgelere kadar güvenli, konforlu ve 
              zamanında ulaşım hizmeti sunmaktır. Modern araç filomuz ve deneyimli şoför kadromuzla, Kıbrıs'taki seyahatinizi 
              stressiz ve keyifli bir deneyime dönüştürmeyi hedefliyoruz.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Vizyonumuz</h2>
            <p className="leading-relaxed">
              Kıbrıs'ta transfer hizmetlerinde kalite standardını belirleyen, müşteri memnuniyetini ön planda tutan ve 
              teknolojik yenilikleri hizmet kalitesiyle buluşturan lider kuruluş olmak vizyonumuzun temelini oluşturmaktadır. 
              Sürdürülebilir turizm anlayışıyla, Kıbrıs'ın güzelliklerini keşfetmek isteyen her misafirimize unutulmaz 
              bir ulaşım deneyimi yaşatmayı amaçlıyoruz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Hizmet Kalitemiz</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Modern Araç Filomuz</h3>
                <p className="text-sm">Mercedes-Benz marka lüks araçlarımızla, konforlu ve güvenli yolculuk deneyimi.</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Profesyonel Şoförler</h3>
                <p className="text-sm">Deneyimli, güvenilir ve yerel bilgiye sahip profesyonel şoför kadromuz.</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">7/24 Hizmet</h3>
                <p className="text-sm">Uçak saatlerinize uygun, kesintisiz hizmet anlayışı.</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">Online Rezervasyon</h3>
                <p className="text-sm">Kullanıcı dostu platformumuzla kolay ve hızlı rezervasyon imkanı.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Hizmet Değerlerimiz</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium">Güvenilirlik</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm font-medium">Zamanında Teslimat</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-sm font-medium">Müşteri Odaklılık</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <span className="text-sm font-medium">Kaliteli Hizmet</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <span className="text-sm font-medium">Şeffaflık</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <span className="text-sm font-medium">Sürekli Gelişim</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Kapsama Alanımız</h2>
            <p className="leading-relaxed mb-4">
              Ercan Havalimanı başta olmak üzere, Kuzey Kıbrıs'ın tüm önemli noktalarına transfer hizmeti vermekteyiz. 
              Başlıca hizmet verdiğimiz bölgeler:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-2">
                <li>• Girne ve çevresi</li>
                <li>• Lefkoşa merkez</li>
                <li>• Gazimağusa bölgesi</li>
                <li>• İskele ve Karpaz</li>
              </ul>
              <ul className="space-y-2">
                <li>• Güzelyurt ve çevresi</li>
                <li>• Lapta sahil şeridi</li>
                <li>• Bafra turizm bölgesi</li>
                <li>• Tüm otel ve turistik tesisler</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Neden Bizi Tercih Etmelisiniz?</h2>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                  <div>
                    <strong>Yılların Deneyimi:</strong> Kıbrıs turizm sektöründe uzun yılların verdiği tecrübe
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                  <div>
                    <strong>Uygun Fiyatlar:</strong> Kaliteli hizmeti en uygun fiyatlarla sunma prensibi
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                  <div>
                    <strong>Müşteri Memnuniyeti:</strong> %100 müşteri memnuniyeti hedefiyle çalışan ekip
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                  <div>
                    <strong>Güvenli Seyahat:</strong> Sigortalı araçlar ve profesyonel şoförlerle güvenli yolculuk
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
} 