import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing from environment variables.')
  // Potentially throw an error or handle this case as appropriate
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// E-posta gönderim fonksiyonu
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
    const paymentStatusMessage = reservationData.payment_method === 'card' 
      ? '💳 Kredi kartı ile ödeme alınacaktır'
      : '🏦 Havale/EFT ile ödeme yapabilirsiniz'

    const emailContent = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: reservationData.customer_email,
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

// Function to generate a short, somewhat readable reservation code
// function generateReservationCode(): string { // Removed unused function
// const prefix = "KTR"; // Kibris Transfer Reservation
// const timestampPart = Date.now().toString().slice(-4); // Last 4 digits of current timestamp
// const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random alphanumeric chars
// return `${prefix}${timestampPart}${randomPart}`;
// } // Removed unused function generateReservationCode


export async function POST(request: NextRequest) {
  console.log('[API /reservations] POST request received.');
  try {
    console.log('[API /reservations] Attempting to parse JSON payload...');
    const payload = await request.json();
    console.log('[API /reservations] JSON payload parsed successfully.');
    
    // LOG THE ENTIRE PAYLOAD BEFORE VALIDATIONS
    console.log('[API /reservations] Raw payload before validation:', JSON.stringify(payload, null, 2));

    // Validate essential payload parts (basic validation)
    console.log('[API /reservations] Validating required reservation fields...');
    if (!payload.pickup_location_id || !payload.dropoff_location_id || !payload.reservation_date || !payload.passenger_count || !payload.vehicle_id) {
      console.error('[API /reservations] Validation failed: Missing required reservation fields.');
      return NextResponse.json({ message: 'Missing required reservation fields.' }, { status: 400 });
    }

    console.log('[API /reservations] Validating required customer fields...');
    if (!payload.customer_name || !payload.customer_last_name || !payload.customer_email || !payload.customer_phone) {
        console.error('[API /reservations] Validation failed: Missing required customer fields.');
        return NextResponse.json({ message: 'Missing required customer fields.' }, { status: 400 });
    }

    // console.log('[API /reservations] Validating card details if payment method is card...');
    // if (payload.payment_method === 'card' && (!payload.card_details || !payload.card_details.cardholder_name || !payload.card_details.card_number || !payload.card_details.expiry_date || !payload.card_details.cvc)) {
    //     console.error('[API /reservations] Validation failed: Missing required card details for card payment.');
    //     return NextResponse.json({ message: 'Missing required card details for card payment.' }, { status: 400 });
    // }

    console.log('[API /reservations] Validating presence of reservation code...');
    // Validate that the client-sent reservation code is present
    if (!payload.code) {
      console.error('[API /reservations] Validation failed: Reservation code is missing from payload.');
      return NextResponse.json({ message: 'Reservation code is missing from payload.' }, { status: 400 });
    }
    console.log('[API /reservations] All validations passed.');

    // Use the reservation code from the payload
    const newReservationCode = payload.code;

    console.log('[API /reservations] Received payload:', payload); // Gelen payload'ı logla

    const reservationData = {
      pickup_location_id: payload.pickup_location_id,
      dropoff_location_id: payload.dropoff_location_id,
      reservation_time: payload.reservation_date, // Changed from reservation_date
      passenger_count: payload.passenger_count,
      vehicle_id: payload.vehicle_id, // This is vehicle_id_example from frontend
      // transfer_type: payload.transfer_type, // Temporarily removed, column not found in DB schema
      customer_name: payload.customer_name,
      customer_last_name: payload.customer_last_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      flight_details: payload.flight_details,
      notes: payload.notes,
      total_price: payload.total_price,
      currency: payload.currency,
      payment_method: payload.payment_method,
      card_details: null, // Always set to null to prevent saving card details
      extras: payload.extras, // Array of {id, name, price}
      status: payload.status || 'pending_confirmation',
      code: newReservationCode,
    };

    console.log('[API /reservations] Processing reservationData:', JSON.stringify(reservationData, null, 2)); // Log the data to be inserted

    const { data, error } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single(); // Assuming you want the inserted row back and expect only one row

    if (error) {
      console.error('Supabase insert error:', error);
      // Check for unique constraint violation for CODE, if such constraint exists on CODE column
      if (error.code === '23505' && error.message.toLowerCase().includes('constraint') && error.message.toLowerCase().includes('code')) {
        return NextResponse.json({ message: 'Failed to generate a unique reservation code (duplicate). Please try again.' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Error creating reservation in database.', details: error.message }, { status: 500 });
    }

    if (data) {
      console.log('[API /reservations] Rezervasyon başarıyla oluşturuldu. E-posta TIKO ödeme onayından sonra gönderilecek.');

      return NextResponse.json({ 
        message: 'Reservation created successfully!', 
        code: newReservationCode, // Return the new code
        reservationId: data.id // Optionally return the DB id
      }, { status: 201 });
    } else {
      // This case should ideally not be reached if insert was successful and .single() was used.
      return NextResponse.json({ message: 'Reservation created but no data returned from DB.' }, { status: 500 });
    }

  } catch (error: unknown) { // error: any -> error: unknown
    console.error('Error processing reservation request:', error);
    let message = 'An unexpected error occurred.';
    let details = null;

    if (error instanceof SyntaxError) { // Specific check for JSON parsing error
        message = 'Invalid request body: Malformed JSON.';
        // For SyntaxError, error.message is often descriptive enough for details
        if (error instanceof Error) details = error.message; 
        return NextResponse.json({ message, details }, { status: 400 });
    }
    
    // General error handling
    if (error instanceof Error) {
        message = error.message;
        // details = error.stack; // Optionally add stack for more debug info
    }
    return NextResponse.json({ message, details }, { status: 500 });
  }
} 