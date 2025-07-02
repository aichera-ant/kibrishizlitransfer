import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Form verilerini doğrula
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Tüm alanların doldurulması zorunludur.' },
        { status: 400 }
      )
    }

    // E-posta formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi giriniz.' },
        { status: 400 }
      )
    }

    // SMTP Configuration (Environment Variables)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // GoDaddy için gerekli olabilir
      }
    })

    // Environment variables kontrolü
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ E-posta SMTP environment variables eksik!')
      return NextResponse.json(
        { error: 'E-posta servisi yapılandırması hatalı. Lütfen sistem yöneticisiyle iletişime geçin.' },
        { status: 500 }
      )
    }

    // E-posta içeriği
    const emailContent = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.EMAIL_TO || process.env.SMTP_USER,
      subject: `İletişim Formu: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Kıbrıs Hızlı Transfer</h1>
              <h2>Yeni İletişim Mesajı</h2>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">👤 Ad Soyad:</span> ${name}
              </div>
              <div class="info-row">
                <span class="label">📧 E-posta:</span> 
                <a href="mailto:${email}">${email}</a>
              </div>
              <div class="info-row">
                <span class="label">📋 Konu:</span> ${subject}
              </div>
              <div class="info-row">
                <span class="label">💬 Mesaj:</span><br>
                <div style="margin-top: 10px; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e0e0e0;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
              <div class="info-row">
                <span class="label">📅 Tarih:</span> ${new Date().toLocaleString('tr-TR', { 
                  timeZone: 'Europe/Istanbul',
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div class="footer">
              <p>Bu mesaj <strong>www.kibrishizlitransfer.com</strong> iletişim formundan gönderilmiştir.</p>
              <p>Ortaköy Hızlı Transfer Ltd | +90 533 884 72 66</p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Text versiyonu da ekleyelim
      text: `
Yeni İletişim Mesajı - Kıbrıs Hızlı Transfer

Ad Soyad: ${name}
E-posta: ${email}
Konu: ${subject}
Tarih: ${new Date().toLocaleString('tr-TR')}

Mesaj:
${message}

---
Bu mesaj www.kibrishizlitransfer.com iletişim formundan gönderilmiştir.
Ortaköy Hızlı Transfer Ltd | +90 533 884 72 66
      `
    }

    // E-posta gönder
    console.log('📧 E-posta gönderiliyor...')
    await transporter.sendMail(emailContent)
    console.log('✅ E-posta başarıyla gönderildi!')
    
    // Console'a da kaydet
    console.log('=== YENİ İLETİŞİM MESAJI ===')
    console.log('Tarih:', new Date().toLocaleString('tr-TR'))
    console.log('Ad Soyad:', name)
    console.log('E-posta:', email)
    console.log('Konu:', subject)
    console.log('Mesaj:', message)
    console.log('=== MESAJ SONU ===')

    return NextResponse.json(
      { 
        success: true, 
        message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.' 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('İletişim formu hatası:', error)
    return NextResponse.json(
      { error: 'Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'İletişim API endpoint\'i çalışıyor.' })
} 