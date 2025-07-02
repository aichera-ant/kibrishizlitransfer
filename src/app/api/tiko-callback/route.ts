import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Supabase İstemcisini Başlatma
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables.')
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// E-posta gönderim fonksiyonu (rezervasyon API'sinden kopyalandı)
async function sendReservationConfirmationEmail(reservationData: any, reservationCode: string) {
  try {
    // SMTP Configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Tarih formatlaması
    const reservationDate = new Date(reservationData.reservation_time).toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Ödeme durumuna göre mesaj
    const paymentStatusMessage = '💳 Kredi kartı ile ödeme alındı - ONAYLANDI'

    const emailContent = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: reservationData.customer_email,
      bcc: 'info@cyprusfasttransport.com',
      subject: `✅ Rezervasyon Onayı - ${reservationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .code { background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
            .content { padding: 30px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
            .info-label { font-weight: bold; color: #495057; margin-bottom: 5px; }
            .info-value { color: #212529; }
            .total-section { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .total-amount { font-size: 32px; font-weight: bold; margin: 10px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
            .contact-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .whatsapp-btn { background: #25d366; color: white; padding: 12px 25px; border-radius: 25px; text-decoration: none; display: inline-block; margin: 10px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Kıbrıs Hızlı Transfer</h1>
              <p>Rezervasyonunuz Onaylandı!</p>
              <div class="code">
                Rezervasyon Kodu: ${reservationCode}
              </div>
            </div>
            
            <div class="content">
              <div class="section">
                <div class="section-title">👤 Yolcu Bilgileri</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Ad Soyad</div>
                    <div class="info-value">${reservationData.customer_name} ${reservationData.customer_last_name}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Telefon</div>
                    <div class="info-value">${reservationData.customer_phone}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">E-posta</div>
                    <div class="info-value">${reservationData.customer_email}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Yolcu Sayısı</div>
                    <div class="info-value">${reservationData.passenger_count} kişi</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">🚌 Transfer Detayları</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Tarih & Saat</div>
                    <div class="info-value">${reservationDate}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Araç Tipi</div>
                    <div class="info-value">Mercedes ${reservationData.vehicle_id === 9 ? 'Vito' : 'Sprinter'}</div>
                  </div>
                </div>
                ${reservationData.flight_details ? `
                <div class="info-item">
                  <div class="info-label">✈️ Uçuş Bilgileri</div>
                  <div class="info-value">${reservationData.flight_details}</div>
                </div>
                ` : ''}
                ${reservationData.notes ? `
                <div class="info-item">
                  <div class="info-label">📝 Notlar</div>
                  <div class="info-value">${reservationData.notes}</div>
                </div>
                ` : ''}
              </div>

              <div class="total-section">
                <div>💰 Toplam Ücret</div>
                <div class="total-amount">${reservationData.total_price.toLocaleString('tr-TR')} ${reservationData.currency}</div>
                <div>${paymentStatusMessage}</div>
              </div>

              <div class="contact-info">
                <h3>📞 Acil Durum İletişim</h3>
                <p><strong>7/24 Hizmet Hattı:</strong> +90 533 884 72 66</p>
                <a href="https://wa.me/905338847266?text=Merhaba, ${reservationCode} kodlu rezervasyonum hakkında bilgi almak istiyorum." class="whatsapp-btn">
                  📱 WhatsApp ile İletişim
                </a>
              </div>

              <div class="section">
                <div class="section-title">ℹ️ Önemli Bilgiler</div>
                <ul>
                  <li>Transfer saatinden <strong>15 dakika önce</strong> hazır olunuz</li>
                  <li>Şoförümüz size <strong>30 dakika önceden</strong> ulaşacaktır</li>
                  <li>Uçak gecikmesi durumunda ekstra ücret alınmaz</li>
                  <li>Rezervasyon değişikliği için en az <strong>24 saat önceden</strong> haber veriniz</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Ortaköy Hızlı Transfer Ltd</strong></p>
              <p>📧 info@cyprusfasttransport.com | 📞 +90 533 884 72 66</p>
              <p>🌐 www.kibrishizlitransfer.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
KIBRIS HIZLI TRANSFER - REZERVASYON ONAYI

Rezervasyon Kodu: ${reservationCode}

YOLCU BİLGİLERİ:
Ad Soyad: ${reservationData.customer_name} ${reservationData.customer_last_name}
Telefon: ${reservationData.customer_phone}
E-posta: ${reservationData.customer_email}
Yolcu Sayısı: ${reservationData.passenger_count} kişi

TRANSFER DETAYLARI:
Tarih & Saat: ${reservationDate}
Araç: Mercedes ${reservationData.vehicle_id === 9 ? 'Vito' : 'Sprinter'}
${reservationData.flight_details ? `Uçuş: ${reservationData.flight_details}` : ''}
${reservationData.notes ? `Notlar: ${reservationData.notes}` : ''}

ÖDEME:
Toplam Ücret: ${reservationData.total_price.toLocaleString('tr-TR')} ${reservationData.currency}
${paymentStatusMessage}

ACİL DURUM İLETİŞİM:
7/24 Hizmet Hattı: +90 533 884 72 66
WhatsApp: https://wa.me/905338847266

ÖNEMLİ BİLGİLER:
- Transfer saatinden 15 dakika önce hazır olunuz
- Şoförümüz size 30 dakika önceden ulaşacaktır
- Uçak gecikmesi durumunda ekstra ücret alınmaz
- Rezervasyon değişikliği için en az 24 saat önceden haber veriniz

Ortaköy Hızlı Transfer Ltd
info@cyprusfasttransport.com | +90 533 884 72 66
www.kibrishizlitransfer.com
      `
    }

    await transporter.sendMail(emailContent)
    console.log(`✅ Rezervasyon onay e-postası gönderildi: ${reservationData.customer_email}`)
    return true

  } catch (error) {
    console.error('❌ Rezervasyon e-postası gönderim hatası:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[TIKO Callback] Received POST request')
    
    // TIKO'dan gelen veriyi oku
    const body = await request.json()
    console.log('[TIKO Callback] Body:', body)
    
    // URL parametrelerini de oku
    const url = new URL(request.url)
    const paymentStatus = url.searchParams.get('payment_status')
    const reservationCode = url.searchParams.get('reservation_code')
    
    console.log('[TIKO Callback] URL Params:', { paymentStatus, reservationCode })
    
    // Ödeme durumuna göre işlem yap
    if (reservationCode) {
      console.log(`[TIKO Callback] Payment ${paymentStatus} for reservation ${reservationCode}`)
      
      // Başarılı ödeme durumunda rezervasyon bilgilerini çek ve e-posta gönder
      if (paymentStatus === 'success') {
        try {
          // Rezervasyon bilgilerini Supabase'den çek
          const { data: reservation, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('code', reservationCode)
            .single()

          if (error) {
            console.error('[TIKO Callback] Rezervasyon bulunamadı:', error)
          } else if (reservation) {
            console.log('[TIKO Callback] Rezervasyon bulundu, e-posta gönderiliyor...')
            
            // Ödeme durumunu güncelle
            await supabase
              .from('reservations')
              .update({ 
                status: 'confirmed',
                payment_status: 'paid'
              })
              .eq('code', reservationCode)

            // E-posta gönder
            sendReservationConfirmationEmail(reservation, reservationCode)
              .then((success) => {
                if (success) {
                  console.log(`[TIKO Callback] ✅ Başarılı ödeme sonrası e-posta gönderildi: ${reservation.customer_email}`)
                } else {
                  console.error(`[TIKO Callback] ❌ E-posta gönderilemedi: ${reservation.customer_email}`)
                }
              })
              .catch((error) => {
                console.error('[TIKO Callback] ❌ E-posta gönderim hatası:', error)
              })
          }
        } catch (error) {
          console.error('[TIKO Callback] Rezervasyon bilgisi çekme hatası:', error)
        }
      } else {
        console.log('[TIKO Callback] Ödeme başarısız, rezervasyon iptal ediliyor...')
        
        // Başarısız ödeme durumunda rezervasyonu iptal et
        try {
          await supabase
            .from('reservations')
            .update({ 
              status: 'cancelled',
              payment_status: 'failed'
            })
            .eq('code', reservationCode)
          
          console.log(`[TIKO Callback] Rezervasyon iptal edildi: ${reservationCode}`)
        } catch (error) {
          console.error('[TIKO Callback] Rezervasyon iptal etme hatası:', error)
        }
      }
      
      // Kullanıcıyı doğru sayfaya yönlendir
      const redirectUrl = paymentStatus === 'success' 
        ? `https://www.kibrishizlitransfer.com/rezervasyon-tamamla?payment_status=success&reservation_code=${reservationCode}`
        : `https://www.kibrishizlitransfer.com/rezervasyon-tamamla?payment_status=failed&reservation_code=${reservationCode}`
      
      // HTML redirect sayfası döndür (TIKO tarayıcıda göstereceği için)
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Ödeme ${paymentStatus === 'success' ? 'Başarılı' : 'Başarısız'}</title>
            <script>
              window.location.href = '${redirectUrl}';
            </script>
          </head>
          <body>
            <p>Yönlendiriliyorsunuz...</p>
          </body>
        </html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }
    
    // TIKO'nun beklediği şekilde cevap ver
    return NextResponse.json(
      { status: 'OK', message: 'Callback received successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('[TIKO Callback] Error:', error)
    
    // Hata durumunda da 200 dön (TIKO tekrar denemesin)
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal error but acknowledged' },
      { status: 200 }
    )
  }
}

// GET istekleri için de callback işlemi yap
export async function GET(request: NextRequest) {
  try {
    console.log('[TIKO Callback] Received GET request')
    
    // URL parametrelerini oku
    const url = new URL(request.url)
    const paymentStatus = url.searchParams.get('payment_status')
    const reservationCode = url.searchParams.get('reservation_code')
    
    console.log('[TIKO Callback] GET Params:', { paymentStatus, reservationCode })
    
    // Ödeme durumuna göre işlem yap
    if (reservationCode) {
      console.log(`[TIKO Callback] Payment ${paymentStatus} for reservation ${reservationCode}`)
      
      // Başarılı ödeme durumunda rezervasyon bilgilerini çek ve e-posta gönder
      if (paymentStatus === 'success') {
        try {
          // Rezervasyon bilgilerini Supabase'den çek
          const { data: reservation, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('code', reservationCode)
            .single()

          if (error) {
            console.error('[TIKO Callback] Rezervasyon bulunamadı:', error)
          } else if (reservation) {
            console.log('[TIKO Callback] Rezervasyon bulundu, e-posta gönderiliyor...')
            
            // Ödeme durumunu güncelle
            await supabase
              .from('reservations')
              .update({ 
                status: 'confirmed',
                payment_status: 'paid'
              })
              .eq('code', reservationCode)

            // E-posta gönder
            sendReservationConfirmationEmail(reservation, reservationCode)
              .then((success) => {
                if (success) {
                  console.log(`[TIKO Callback] ✅ Başarılı ödeme sonrası e-posta gönderildi: ${reservation.customer_email}`)
                } else {
                  console.error(`[TIKO Callback] ❌ E-posta gönderilemedi: ${reservation.customer_email}`)
                }
              })
              .catch((error) => {
                console.error('[TIKO Callback] ❌ E-posta gönderim hatası:', error)
              })
          }
        } catch (error) {
          console.error('[TIKO Callback] Rezervasyon bilgisi çekme hatası:', error)
        }
      } else {
        console.log('[TIKO Callback] Ödeme başarısız, rezervasyon iptal ediliyor...')
        
        // Başarısız ödeme durumunda rezervasyonu iptal et
        try {
          await supabase
            .from('reservations')
            .update({ 
              status: 'cancelled',
              payment_status: 'failed'
            })
            .eq('code', reservationCode)
          
          console.log(`[TIKO Callback] Rezervasyon iptal edildi: ${reservationCode}`)
        } catch (error) {
          console.error('[TIKO Callback] Rezervasyon iptal etme hatası:', error)
        }
      }
      
      // Kullanıcıyı doğru sayfaya yönlendir
      const redirectUrl = paymentStatus === 'success' 
        ? `/rezervasyon-tamamla?payment_status=success&reservation_code=${reservationCode}`
        : `/rezervasyon-tamamla?payment_status=failed&reservation_code=${reservationCode}`
      
      // HTML redirect sayfası döndür
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Ödeme ${paymentStatus === 'success' ? 'Başarılı' : 'Başarısız'}</title>
            <script>
              window.location.href = '${redirectUrl}';
            </script>
          </head>
          <body>
            <p>Yönlendiriliyorsunuz...</p>
            <p>Ödeme Durumu: ${paymentStatus === 'success' ? 'Başarılı' : 'Başarısız'}</p>
            <p>Rezervasyon Kodu: ${reservationCode}</p>
          </body>
        </html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }
    
    // Parametreler eksikse basit mesaj döndür
    return NextResponse.json(
      { status: 'OK', message: 'TIKO callback endpoint - parameters missing' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('[TIKO Callback] GET Error:', error)
    
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal error' },
      { status: 500 }
    )
  }
} 