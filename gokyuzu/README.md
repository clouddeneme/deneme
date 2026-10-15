# Doğduğun Gecenin Gökyüzü

Doğum tarihini, saatini ve şehrini girince o dakikada o yerden görünen gökyüzünü
hesaplayıp poster olarak çizen tek sayfalık bir web uygulaması.

- 5.044 yıldız (Hipparcos, d3-celestial verisi), 88 takımyıldızın çizgileri ve Türkçe adları, Samanyolu
- Gezegenler JPL yaklaşık yörünge elemanlarıyla, Ay Meeus serisiyle hesaplanır. Ay, gerçek evresiyle ve aydınlık yüzü Güneş'e dönük çizilir.
- "Senin yıldızın": Uzaklığı yaşına en yakın yıldız. Bu gece ondan gelen ışık sen doğarken yola çıktı.
- "Güneş gerçekte": Burcun ile Güneş'in o gün gerçekten önünde durduğu takımyıldız (13. burç Yılancı dahil)
- Saat dilimi geçmişiyle birlikte hesaplanır (Türkiye'nin 2016 öncesi yaz saati uygulaması gibi).
- Gece, Mürekkep ve Kâğıt adında üç poster stili, "Geceyi oynat" animasyonu ve 3000×4200 PNG indirme

## Yapı

```
src/astro.js       astronomi hesapları (tarayıcı + node)
src/data.json      sıkıştırılmış katalog (tools/build_data.py üretir)
src/template.html  arayüz ve çizim
tools/build.py     dist/gokyuzu.html'i tek dosya olarak birleştirir
tools/validate.py  astro.js'i astropy ile karşılaştırır
```

```
python3 tools/build_data.py <d3-celestial/data>   # katalog değişirse
python3 tools/build.py
python3 tools/validate.py                          # node + astropy gerekir
```

## Doğruluk

`tools/validate.py` 1940–2049 arasındaki 60 rastgele tarih ve konumda astropy ile karşılaştırma yapar:

| Cisim | En büyük hata |
|---|---|
| Güneş, Merkür, Venüs, Mars, Uranüs, Neptün | < 0,04° |
| Ay | 0,08° |
| Jüpiter, Satürn | 0,18° |
| Yıldızlar (Vega, Sirius) | 0,01° |
| Ay'ın aydınlık oranı | %0,7 |

Takımyıldız tespitinde 540 kontrolün 536'sı birebir tutar. Kalan 4 fark sınıra çok yakın vakalardır.

Yıldız verisi: [d3-celestial](https://github.com/ofrohn/d3-celestial), © 2015 Olaf Frohn, BSD-3-Clause.
