# Sıfırdan · 29 Ekim 2026 (Kocaeli)

Cumhuriyet'in 103. yılı için 75 saniyelik, 1920×1080, 30 fps bir video. Videonun
tamamı kodla üretildi: içinde tek bir fotoğraf, çizim, video ya da hazır müzik yok.
Görüntüler Three.js ve GLSL ile çiziliyor, müzik Web Audio ile sentezleniyor.

## Sahneler

| Süre | Sahne |
|---|---|
| 0–6 | Bir terminal `29.10.1923` yazıyor, saat tıkırtısı duyuluyor |
| 6–13 | Rakamlar kora dönüşüp savruluyor. *"Yorgun bir ülke." / "Ve bir karar."* |
| 13–25 | Korlar Türkiye haritasını oluşturuyor, kamera Kocaeli'ye yaklaşıyor. 28 Haziran 1921 kurtuluş, 16–17 Ocak 1923 basın toplantısı |
| 25–40 | 29 Ekim 1923'te Ankara'dan yayılan ışık dalgası, 1928 yeni harfler, 1930'larda demir ağlar, 1934 kadınlara seçme ve seçilme hakkı, 1936 Kocaeli'de üretilen ilk yerli kâğıt |
| 40–54 | İzmit Saat Kulesi ışık çizgileriyle kendini çiziyor. Kadranda yıllar akıyor: 1923 → 2026 |
| 54–65 | Türk Bayrağı ve havai fişekler |
| 65–71 | *"Türkiye Cumhuriyeti ilelebet payidar kalacaktır."* sözü kâğıda yazılıyor |
| 71–75 | Yıldızlardan "103" ve *"29 Ekim Cumhuriyet Bayramımız kutlu olsun." · Kocaeli* |

## Doğruluk notları

- **Bayrak:** 2893 sayılı Türk Bayrağı Kanunu'ndaki ölçülerle, analitik olarak çiziliyor (`src/flag.js`). Uçkurluk 1/30 G, ay dış dairesi 1/2 G, iç daire 0,4 G, merkezler arası 0,0625 G, yıldız dairesi 1/4 G ve ay iç dairesinden 1/3 G uzakta, boy 1,5 G. Renk #E30A17. Render'dan alınan piksel ölçümleri bu değerlerle birebir tutuyor.
- **Harita:** Natural Earth (kamu malı) ülke sınırı ve il sınırları (`tools/build_geo.py`).
- **Gökyüzü:** Kapanış sahnesindeki yıldızlar, 29 Ekim 2026 gecesi saat 21.00'de İzmit'ten görünen gerçek gökyüzü. Hipparcos kataloğundan, "Doğduğun Gecenin Gökyüzü" projesinin astronomi koduyla hesaplandı.
- **Saat Kulesi:** Fotoğraflara ve yazılı tariflere göre modellendi (`src/tower.js`): 1902, proje Vedat Tek, 16,4 m.

## Üretim

```bash
npm install                                         # three.js
python3 tools/build_geo.py                          # harita verisi (data/ altındaki kaynaklardan)
python3 -m http.server 8123 --bind 127.0.0.1        # depo kökünden
# önizleme: http://127.0.0.1:8123/29ekim/src/index.html?play
node tools/stills.cjs out/stills 20 45 58           # tek tek kareler
node tools/audio.cjs out/muzik.wav                  # müzik
node tools/render.cjs out/segments                  # video (10 sn'lik parçalar halinde, kaldığı yerden devam eder)
```
