# Standart Node.js 18 imajını kullan
FROM node:18

# Çalışma dizini
WORKDIR /app

# Bağımlılıkları kurmadan önce package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları kur
# Next.js build süreci bazı devDependencies'e ihtiyaç duyabileceğinden npm ci kullanıyoruz.
# Eğer sadece production bağımlılıkları ile build alınabiliyorsa `npm ci --omit=dev` denenebilir.
RUN npm ci

# Uygulama kodunun geri kalanını kopyala
COPY . .

# Uygulamayı build et
RUN npm run build

# Üretim sunucusu portu
EXPOSE 3000

# Üretim sunucusunu çalıştır
CMD ["npm", "run", "start"] 