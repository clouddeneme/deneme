# SIFIRDAN v2 · Çekim Senaryosu

**29 Ekim 2026 · Cumhuriyet'in 103. yılı · Kocaeli**
45 saniye · 1920×1080 · 30 fps (1350 kare) · tamamı kodla üretilir (Three.js + GLSL + Web Audio)

---

## 1. Fikir

> **Karanlıktan aydınlığa, sıfırdan 103 yıla.**

Video tek bir günün ışığıyla akar. 1923'ün şafağında, bir terminal imlecinin karanlığında başlar. Güneş, Cumhuriyet'in ilanıyla doğar. Sabah ışığında ülke kurulur, gün ışığında Kocaeli'de kâğıt üretilir ve üzerine Cumhuriyet'in sözü yazılır. Gün batımında İzmit Saat Kulesi 103 yılı sayar. Video, mavi saatte havai fişeklerle ve bir bayram tebriğiyle biter.

**Üç kural:**
1. **Tek plan.** Kesme ve siyaha kararma yok. Her sahne bir öncekinin içinden doğar: rakam kora, kor haritaya, harita kâğıda, kâğıt saat kadranına dönüşür.
2. **Hiç geri kararmaz.** Işık sürekli artar. En karanlık an ilk 3 saniyedir, ondan sonra gökyüzü hep aydınlıktır.
3. **Kocaeli omurgadır.** Uçuş Kocaeli'den başlar, Kocaeli'ye döner, kâğıt Kocaeli'de doğar, final Kocaeli'de biter.

---

## 2. Görsel dil

### Renk akışı (ışık yolculuğu)

| Bölüm | Süre | Gökyüzü / zemin | Vurgu |
|---|---|---|---|
| Şafak öncesi | 0:00–0:04 | Lacivert → mor (`#1C2048 → #463E78`) | Sıcak kor turuncusu `#FFB46E` |
| Gün doğumu | 0:04–0:10 | Ufukta turuncu-pembe, üstte mavi | Güneş altını `#FFDCA0` |
| Sabah | 0:10–0:20 | Açık gök mavisi `#78B4EB`, denizler `#4F8FC0` | Kara kum-altın `#E8C482`, Kocaeli kırmızısı `#E30A17` |
| Gün ışığı | 0:20–0:31 | Krem, güneş ışığı `#FFF6E4` | Mürekkep `#1D1A17` |
| Gün batımı | 0:31–0:40 | Mor → pembe → turuncu (`#4659AA → #EB786E → #FFBE78`) | Kule kremi `#E6D8B8`, bayrak `#E30A17` |
| Mavi saat | 0:40–0:45 | Derin mavi `#14286E → #3250A0`, asla siyah değil | Havai fişek kırmızı, beyaz, altın |

### Tipografi
- **Ana cümleler:** Cormorant Garamond 600 (zarif serif). Karanlık sahnelerde fildişi ve hafif gölgeli, aydınlık sahnelerde mürekkep rengi ve gölgesiz.
- **Tarih satırları:** IBM Plex Mono, büyük harf ve geniş aralıklı (ör. `28 HAZİRAN 1921 · KOCAELİ`). Önce altın bir çizgi uzar, sonra yazı belirir.
- **Yıllar:** Bodoni Moda (sayaçta ve "103"te).
- **Kural:** Ekranda aynı anda en fazla iki satır yazı olur ve her yazı en az 1,5 saniye okunur.

### Kamera dili
- 35 mm lens (dikey görüş açısı 35°), sahne sahne 28–50 mm arası değişir.
- Hareketler her zaman yumuşak başlayıp yumuşak biter. Duraklarda kamera hiç tam durmaz, hep hafifçe kayar.
- Harita bölümünde bir drone gibi alçak irtifa uçuşu: yatışlar, pikeler, takip çekimleri.

---

## 3. Müzik

- **Tonalite:** Re majör. Baştan umutlu, giderek coşkulu. Minör yalnızca ilk 3 saniyede gölge olarak var.
- **Tempo:** 120 BPM. Bir ölçü 2 saniye, bütün kesme ve durak noktaları ölçü başlarına denk gelir.
- **Enstrümanlar** (hepsi kodla sentezlenir): saat tıkırtısı, yaylı pad, pizzicato benzeri pluck, piyano, bakır ses, çan, büyük davul, zil, havai fişek patlamaları.
- **Motif:** Dört notalık bir "Cumhuriyet motifi": **Re – La – Si – La**. Önce piyanoda tek başına (kâğıt sahnesi), sonra bakırda ve tam orkestrada (final) duyulur.

| Süre | Müzik |
|---|---|
| 0:00–0:04 | Saat tıkırtısı (saniyede 1) ve klavye tıkları. Altta derinden bir pad. |
| 0:04 | Patlama: davul ve yükselen bir hışırtı. Pad açılıyor. |
| 0:07–0:10 | Güneş doğarken Re majör akoru tüm genişliğiyle açılıyor. |
| 0:08–0:20 | Pluck ostinatosu (sekizlikler), her 2 saniyede bir davul vuruşu ve akor değişimi: D – A – Bm – G – D – A |
| 0:20–0:31 | Ritim çekiliyor. Kâğıt makinesinin ritmi düşük bir tıkırtıyla sürüyor. Mürekkep yazarken piyanoda motif çalıyor. |
| 0:31–0:36 | Kadranda yıllar akarken tıkırtılar hızlanıp bir vızıltıya dönüşüyor. Gerilim akoru: A. |
| 0:36 | Doruk: Re majör, tam orkestra, bakırda motif, zil. |
| 0:39–0:43 | Havai fişek patlamaları müzikle eşzamanlı. |
| 0:44,6 | Son "tik". Yankı. |

---

## 4. Çekim çekim senaryo

### PLAN 1 · İmleç (0:00–0:04,0)
**Işık:** Şafak öncesi. Lacivert-mor bir gökyüzü degradesi, ufukta çok hafif bir pembelik. Simsiyah değil.
**Görüntü:**
- 0:00,0 Ekranın ortasında fildişi bir imleç yanıp sönüyor.
- 0:00,6 – 0:02,8 Imleç harf harf yazıyor: **`29.10.1923`** (IBM Plex Mono, 150 px). Her tuşta küçük bir ışık titreşimi var.
- 0:03,0 – 0:04,0 Rakamlar ısınıp kor turuncusuna dönüyor, kenarlarından kıvılcımlar kopuyor.

**Kamera:** Sabit, ama 4 saniyede %3 içeri kayıyor.
**Ses:** Saniyede bir tıkırtı (tik/tak), klavye tıkları, altta Re-La boşluk akoru.

### PLAN 2 · Kor ve düşüş (0:04,0–0:08,0)
**Görüntü:**
- 0:04,0 Rakamlar 30.000 kora dönüşüp patlıyor.
- 0:04,2 – 0:06,5 **Kamera korların içine dalıyor.** Kıvılcımlar kameranın yanından geçiyor, objektif ileri ve aşağı dönüyor. 90°'lik bir pike: ekranın altında, uzakta karanlık bir zemin beliriyor.
- 0:06,5 – 0:08,0 Korlar zemine yağıyor. Düştükleri yerde **Türkiye'nin kıyı çizgisi** yanıyor, korlar ülkenin içine yerleşiyor. Komşu ülkeler soluk kum renginde, denizler koyu mavi beliriyor.
- 0:07,0 **Güneş doğuyor.** Ufkun doğusunda (Kafkaslar yönünde) güneş yükseliyor, ilk ışık haritanın üzerinden yayılıyor.

**Kamera:** Dalıştan yatay uçuşa geçiş. Haritanın 1,5 birim üzerinde, ufka 20° bakan alçak bir açıyla batıya, Kocaeli'ye doğru dönüyor.
**Yazı:** 0:05,0 – 0:06,8 ortada küçük harflerle: *"Yorgun bir ülke. Ve bir karar."*
**Ses:** Patlamada davul, hışırtı. 0:07'de Re majör açılıyor.

### PLAN 3 · Kocaeli: kurtuluş (0:08,0–0:10,0)
**Işık:** Gün doğumu. Güneş kameranın arkasında, alçak ve turuncu. Uzun gölgeler var.
**Görüntü:** Kamera Marmara'nın üzerinden alçaktan süzülerek İzmit Körfezi'ne giriyor. Kocaeli'nin sınırı kırmızı bir ışık çizgisiyle çiziliyor, içi kırmızımsı parıltıyla doluyor.
**Kamera:** Körfez boyunca doğuya doğru, sağa hafif yatışla takip çekimi.
**Yazı:**
- `28 HAZİRAN 1921 · KOCAELİ` — **Kocaeli kurtuldu.**
- 0:09,0'da ikinci satır: `16–17 OCAK 1923 · İZMİT` — *Atatürk basına konuştu.*

**Ses:** Davul vuruşu, akor: Re.

### PLAN 4 · Ankara: Cumhuriyet (0:10,0–0:12,0)
**Görüntü:** Kamera yükselip doğuya, Ankara'ya dönüyor. 0:10,4'te Ankara'dan **altın bir ışık halkası** çıkıyor. Halka kameranın **altından** geçip bütün ülkeye yayılıyor ve geçtiği her yeri sabah ışığıyla aydınlatıyor. Gökyüzü bu anda maviye dönüyor.
**Kamera:** Ankara'ya doğru 30° pike, sonra halkanın yayılmasıyla birlikte yükselme.
**Yazı:** `29 EKİM 1923` — **Cumhuriyet ilan edildi.**
**Ses:** En güçlü davul vuruşu, akor: La. Bakırda kısa bir parlama.

### PLAN 5 · Yeni harfler (0:12,0–0:14,0)
**Görüntü:** Haritadaki ışıklar havalanıp gökyüzünde yeni alfabeyi oluşturuyor: **A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z**. Harfler iki dalga halinde kameraya doğru geliyor ve **kamera harflerin arasından geçiyor**. Yakından geçen harfler büyüyüp kameranın kenarından kayıyor.
**Kamera:** Harflere doğru hızlanan bir ileri hareket, geçiş anında hafif yatış.
**Yazı:** `1 KASIM 1928` — **Yeni harfler.**
**Ses:** Akor: Si minör. Harfler geçerken yumuşak "vuuş" sesleri.

### PLAN 6 · Demir ağlar (0:14,0–0:16,0)
**Görüntü:** Harflerin arkasından Ankara'dan doğuya uzanan bir demiryolu çiziliyor. Hattın ucunda parlak bir **ışık treni** var ve kamera onun **yanında yarışıyor**. Tren her şehre vardığında şehir yanıyor ve küçük bir etiket beliriyor: `1927 KAYSERİ` · `1930 SİVAS` · `1939 ERZURUM`. Arkada diğer hatlar (Malatya, Elazığ, Diyarbakır, Samsun) aynı anda örülüyor.
**Kamera:** Trenin sağından, 1 birim yükseklikten takip çekimi. Kamera trenle birlikte hızlanıyor.
**Yazı:** `1930'LAR` — **Demir ağlar.**
**Ses:** Akor: Sol. Pluck ritmi tren hızına kilitleniyor, tekerlek ritmi gibi.

### PLAN 7 · Kadınlar (0:16,0–0:18,0)
**Görüntü:** Kamera trenden ayrılıp yükseliyor. Altında bütün harita boyunca binlerce küçük ışık aynı anda **çiçek açar gibi** parlıyor. Gün ışığında görünsünler diye sıcak beyaz ve kırmızı tonlarda, kısa ışık patlamaları halinde.
**Kamera:** 2 saniyede 3 birimden 8 birime yükselme, aynı anda 15°'lik dönüş.
**Yazı:** `5 ARALIK 1934` — **Kadınlara seçme ve seçilme hakkı.**
**Ses:** Akor: Re. Çanlar.

### PLAN 8 · Kocaeli'ye dönüş (0:18,0–0:20,0)
**Görüntü:** Kamera batıya dönüp **Kocaeli'ye pike yapıyor.** Kocaeli il sınırı haritadan **3B bir blok olarak yükseliyor**: kırmızı kenarlı, altın yüzeyli bir ada. Bloğun üstünde ışık parçacıkları bir girdap gibi toplanıyor.
**Kamera:** Geniş bir sol dönüşle 45° pike, Kocaeli bloğunun 2 birim yakınına kadar.
**Ses:** Akor: La, yükselen hışırtı.

### PLAN 9 · SEKA: kâğıt doğuyor (0:20,0–0:25,0)
**Işık:** Gün ışığı. Gökyüzü açık ve krem tonlarında, güneş tepede ve yumuşak.
**Görüntü:**
- 0:20,0 Kocaeli bloğundaki ışık girdabı sıvı gibi akan bir **hamura** dönüşüyor.
- 0:20,5 Hamur iki büyük silindirin arasına giriyor. Silindirler 1930'ların kâğıt makinesi gibi pirinç halkalı ve döner.
- 0:21,0 Silindirlerden **bembeyaz, upuzun bir kâğıt şeridi** çıkıp kameraya doğru akıyor. Şerit dalgalanıyor, güneş üzerinde parlıyor, kenarlarından lifler görünüyor.
- 0:21,0 – 0:23,5 **Kamera kâğıdın üzerinde kayıyor**, şeridin akışıyla aynı yönde ve biraz daha yavaş. Kâğıt kameranın altından akıp gidiyor.
- 0:23,5 – 0:25,0 Şerit yavaşlıyor ve bir yaprak kesiliyor (keskin bir "şak" sesiyle). Yaprak havada süzülerek ekranı dolduracak şekilde kameranın önünde duruyor.

**Kamera:** 0:21'den itibaren kâğıdın 0,6 birim üzerinden, aşağı 35° bakarak kayıyor. 0:24'te kâğıda dik, kuşbakışı konuma dönüyor.
**Yazı** (0:21,5 – 0:24,5): `1936 · KOCAELİ` — **İlk yerli kâğıt.** (Bu fabrika bugünkü SEKA'nın başlangıcı.)
**Ses:** Ritim çekiliyor. Makinenin ritmini düşük, metalik tıkırtılar veriyor. Kesimde "şak". Pad: Sol majör.

### PLAN 10 · Söz (0:25,0–0:31,0)
**Görüntü:**
- Kâğıt ekranı dolduruyor. Kâğıt dokusunda lifler, hafif kabarma ve yumuşak bir güneş gölgesi var.
- 0:25,4 – 0:28,8 Görünmez bir dolma kalem yazıyor. Mürekkep önce ıslak ve parlak, sonra kuruyup matlaşıyor:
  > *Türkiye Cumhuriyeti*
  > *ilelebet payidar kalacaktır.*
- 0:29,2 Altında, mürekkep kırmızısıyla: **— MUSTAFA KEMAL ATATÜRK**
- Kâğıdın köşesinde çok küçük bir filigran: `Kocaeli · 1936`

**Kamera:** Kuşbakışı. Yazı ilerledikçe kalemi takip eden hafif bir kayma ve 6 saniyede %6 içeri hareket.
**Ses:** Piyanoda **Cumhuriyet motifi**: Re – La – Si – La. Kalem sesi çok hafif. İmzada motif çözülüyor.

### PLAN 11 · Kâğıttan kadrana (0:31,0–0:32,6)
**Işık:** Gün batımına geçiş.
**Görüntü:** Bir rüzgâr kâğıdı köşesinden kaldırıyor. Kâğıt kıvrılıp **kameranın önünden kayarak** sağa uçuyor. Arkasında, kâğıdın beyazıyla aynı tonda başka bir beyaz yüzey beliriyor: **saat kadranı**. Kadranın arkasındaki gökyüzü pembe-turuncu.
**Kamera:** Kuşbakışından yatay görüşe 90° dönüş, kâğıdın uçuşuyla eşzamanlı. Kesme yok.
**Ses:** Rüzgâr. Tıkırtılar yeniden başlıyor.

### PLAN 12 · Kadran: 103 yıl (0:32,6–0:36,4)
**Görüntü:** Roma rakamlı kadran. Akrep ve yelkovan hızlanarak dönüyor. Sağda, gökyüzünün önünde Bodoni harfleriyle bir yıl sayacı akıyor: **1923 → 2026**. Sayaç yavaş başlıyor, ortada hızlanıyor, sonda yavaşlıyor ve **2026**'da duruyor.
**Kamera:** Kadranın tam karşısında, kadran ekranın sol yarısında. 4 saniyede %8 içeri hareket.
**Yazı:** Sayaç durunca: **Cumhuriyet'in 103 yılı.**
**Ses:** Tıkırtılar akrep ve yelkovana bağlı olarak hızlanıp vızıltıya dönüşüyor. Gerilim akoru La, yükselen zil.

### PLAN 13 · Saat Kulesi ve bayrak (0:36,4–0:40,0)
**Işık:** Gün batımı. Gökyüzü mor, pembe ve turuncu. Kulenin krem taşı batı güneşiyle altın renginde parlıyor. Pencerelerden sıcak ışık sızıyor.
**Görüntü:**
- 0:36,4 Kamera kadrandan geriye çekiliyor ve **İzmit Saat Kulesi**'nin tamamı ortaya çıkıyor: teras, kahverengi korkuluk, madalyonlar, saat katı, sivri külah.
- **Kulenin sağında, meydanda bir gönder** var. Gönderde büyük bir **Türk Bayrağı** dalgalanıyor. Bayrak gerçek bir kumaş simülasyonuyla hesaplanıyor: ağırlığıyla sarkıyor, rüzgârda kıvrılıyor, ucu çırpınıyor. Ölçüler 2893 sayılı Kanun'daki gibi, renk #E30A17.
- Bayrak, gün batımı güneşini arkadan alıyor ve kumaşın içinden ışık süzülüyor.

**Kamera:** Kadrandan geriye doğru 12 birimlik bir çekilme. Aynı anda sağa doğru 25°'lik yay hareketi: kule sol üçte birde, bayrak sağ üçte birde.
**Ses:** **Doruk.** Re majör, tam orkestra, bakırda Cumhuriyet motifi, zil, davul.

### PLAN 14 · Mavi saat: 103 (0:40,0–0:45,0)
**Işık:** Güneş battı. Gökyüzü derin mavi, ufukta son bir turuncu çizgi. Kule ve bayrak ışıklandırmayla aydınlanıyor. Arkada kentin sıcak ışıkları var.
**Görüntü:**
- 0:39,6 İlk havai fişekler kulenin arkasında patlıyor: kırmızı, beyaz ve altın renkte, müzikle eşzamanlı.
- 0:40,6 – 0:42,0 Havai fişeklerin kıvılcımları dağılmadan gökyüzünde toplanıp **"103"** rakamını oluşturuyor.
- 0:42,0 Altında:
  > **29 Ekim Cumhuriyet Bayramımız kutlu olsun.**
  > `KOCAELİ`
- 0:44,6 Son "tik". 0:44,7 – 0:45,0 görüntü maviye (siyaha değil) yumuşakça kararıyor.

**Kamera:** Çok yavaş bir yükselme. Kule ve bayrak alt üçte birde, "103" gökyüzünde.
**Ses:** Havai fişek patlamaları, finalde motifin tam hali, son tik ve yankı.

---

## 5. Teknik notlar

| Konu | Yaklaşım |
|---|---|
| Gökyüzü | Zaman parametresiyle renk değiştiren bir gökyüzü kubbesi shader'ı: güneş diski, ufuk parıltısı, güneş ışınları |
| Harita | Natural Earth: Türkiye ve komşular (kara) ile denizler. Parçacıklar, kıyı çizgisi, gün ışığında gölgeli 3B harita |
| Kocaeli bloğu | İl sınırından 3B'ye yükselen bir prizma |
| Kâğıt makinesi | Silindirler, akan şerit (dalgalı yüzey shader'ı), kesilen yaprak |
| Kâğıttan kadrana geçiş | Kâğıdın beyazı ile kadranın beyazı aynı kare içinde üst üste getirilerek kesmesiz geçiş |
| Bayrak | Verlet kumaş simülasyonu (72×48 düğüm), direğe bağlı, rüzgâr ve hava direnci hesaplanıyor. Simülasyon önceden hesaplanıyor ve her kare aynı sonucu veriyor. Desen kanundaki ölçülerle analitik çiziliyor, kumaş dokusu ve dikişler var. |
| Kule | Fotoğraflara göre modellenen İzmit Saat Kulesi, gün batımı ve gece ışıklandırmasıyla |
| Render | 1350 kare, kare başına yaklaşık 1,6 saniye, toplam yaklaşık 36 dakika |

## 6. Tarihî doğruluk

| Bilgi | Kaynak notu |
|---|---|
| 28 Haziran 1921 · İzmit'in (Kocaeli) düşman işgalinden kurtuluşu | TBMM Genel Kurul tutanakları, her yıl anılıyor |
| 16–17 Ocak 1923 · İzmit Basın Toplantısı | Atatürk Ansiklopedisi |
| 29 Ekim 1923 · Cumhuriyet'in ilanı | |
| 1 Kasım 1928 · Harf Devrimi (1353 sayılı Kanun) | |
| 1927 Kayseri, 1930 Sivas, 1939 Erzurum · demiryolunun ulaştığı yıllar | Ulaştırma Bakanlığı verisi |
| 5 Aralık 1934 · Kadınlara milletvekili seçme ve seçilme hakkı | TBMM |
| 1936 · İzmit Kâğıt Fabrikası'nda ilk kâğıt (18 Nisan 1936), bugünkü SEKA'nın başlangıcı | SEKA Kâğıt Müzesi kaynakları |
| İzmit Saat Kulesi · 1902, proje Vedat Tek, 16,4 m | Kültür Portalı, Vikipedi |
| "Türkiye Cumhuriyeti ilelebet payidar kalacaktır." · Mustafa Kemal Atatürk | |
| 29 Ekim 2026 = 103. yıl | |
