# Zaman Aynası — TouchDesigner build script
#
# Kurulum: TouchDesigner'da /project1 içinde bir Text DAT oluştur, bu dosyanın
# tamamını içine yapıştır, Text DAT'a sağ tıkla -> "Run Script".
# (Ya da Textport'ta: exec(open(r'C:\yol\build_zaman_aynasi.py', encoding='utf-8').read()) )
#
# Betik /project1/zaman_aynasi adında bir Base COMP kurar. Tekrar çalıştırmak
# güvenlidir: eski ağı silip yeniden kurar. Kontroller Base COMP'un "Zaman"
# sayfasındaki özel parametrelerdedir.
#
# Fikir: Son ~2 saniyenin kareleri tek bir doku atlasında (8x8 karo) halka
# tampon olarak saklanır. Çıkıştaki her piksel, bir "gecikme haritasına" göre
# farklı bir geçmiş kareden okunur. R/G/B kanalları ayrı gecikmelerle okunarak
# zamanda renk kayması elde edilir. Sadece GLSL + Feedback TOP kullanır;
# NVIDIA'ya özel hiçbir şey yok, Intel iGPU'da çalışır.

# ---------------------------------------------------------------- ayarlar
PARENT = '/project1'
NAME = 'zaman_aynasi'
TILES_X, TILES_Y = 8, 8        # 64 kare hafıza
TILE_W, TILE_H = 400, 225      # her karenin atlas içindeki çözünürlüğü (atlas: 3200x1800)
OUT_W, OUT_H = 1280, 720       # çıkış. Ev PC'sinde (RTX) 1920x1080 yapılabilir.
DEMO_W, DEMO_H = 1280, 720

# ---------------------------------------------------------------- shaders
WRITE_GLSL = r'''
// Halka tampona yazma: bu karede sırası gelen karoya canlı görüntüyü kopyalar,
// diğer karoları önceki kareden (feedback) aynen taşır.
// input 0: feedback (atlas), input 1: kaynak (kamera / demo)
uniform vec4 uYaz;   // x = kare sayacı, y = karo X, z = karo Y
layout(location = 0) out vec4 fragColor;

void main() {
    vec2 uv = vUV.st;
    vec2 tiles = uYaz.yz;
    vec2 cell = floor(uv * tiles);
    float idx = cell.y * tiles.x + cell.x;
    float writeIdx = mod(uYaz.x, tiles.x * tiles.y);
    vec4 c;
    if (abs(idx - writeIdx) < 0.5) {
        c = texture(sTD2DInputs[1], fract(uv * tiles));
    } else {
        c = texture(sTD2DInputs[0], uv);
    }
    fragColor = TDOutputSwizzle(c);
}
'''

READ_GLSL = r'''
// Zamanda okuma: her piksel için bir gecikme hesaplar ve atlastan o yaştaki
// kareyi okur. İki kare arasında yumuşak geçiş yapar.
// input 0: atlas (null_atlas), input 1: canlı kaynak
uniform vec4 uZaman;  // x = kare sayacı, y = mod (0-5 arası, ondalık = geçiş), z = derinlik 0-1, w = renk kayması (kare)
uniform vec4 uAyar;   // x = zaman (sn), y = karışım 0-1, z = karo X, w = karo Y
layout(location = 0) out vec4 fragColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
    return s;
}
float tri(float x) { return 1.0 - abs(2.0 * fract(x) - 1.0); }

// 0 Tarama, 1 Halkalar, 2 Sıvı, 3 Spiral, 4 Dilimler
float delayMap(int m, vec2 uv, vec2 p) {
    float t = uAyar.x;
    float r = length(p);
    float ang = atan(p.y, p.x);
    if (m == 0) return 1.0 - uv.y;
    if (m == 1) return 0.5 + 0.5 * sin(r * 14.0 - t * 2.0);
    if (m == 2) return clamp((fbm(p * 2.2 + vec2(0.0, t * 0.15)) - 0.25) * 1.8, 0.0, 1.0);
    if (m == 3) return tri(ang / 6.28318 + r * 0.9 - t * 0.06);
    float seg = floor((ang + 3.14159) / 6.28318 * 8.0);
    return mod(seg * 3.0, 8.0) / 7.0 * (0.6 + 0.4 * smoothstep(0.05, 0.5, r));
}

vec3 fetchAge(float age, vec2 uv) {
    vec2 tiles = uAyar.zw;
    float n = tiles.x * tiles.y;
    float idx = mod(uZaman.x - age + n * 8.0, n);
    vec2 cell = vec2(mod(idx, tiles.x), floor(idx / tiles.x));
    vec2 inset = 0.5 * uTD2DInfos[0].res.xy * tiles;
    vec2 local = clamp(uv, inset, 1.0 - inset);
    return texture(sTD2DInputs[0], (cell + local) / tiles).rgb;
}

vec3 tap(float age, vec2 uv) {
    float n = uAyar.z * uAyar.w;
    age = clamp(age, 0.0, n - 2.0);
    float a0 = floor(age);
    return mix(fetchAge(a0, uv), fetchAge(a0 + 1.0, uv), age - a0);
}

void main() {
    vec2 uv = vUV.st;
    vec2 res = uTDOutputInfo.res.zw;
    vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);

    float mm = mod(uZaman.y, 5.0);
    int m0 = int(floor(mm));
    int m1 = int(mod(floor(mm) + 1.0, 5.0));
    float d = mix(delayMap(m0, uv, p), delayMap(m1, uv, p), smoothstep(0.0, 1.0, fract(mm)));

    float n = uAyar.z * uAyar.w;
    float age = d * uZaman.z * (n - 3.0);
    float ch = uZaman.w;
    vec3 past = vec3(tap(age + ch, uv).r, tap(age, uv).g, tap(age - ch, uv).b);

    vec3 live = texture(sTD2DInputs[1], uv).rgb;
    vec3 col = mix(live, past, uAyar.y);
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
'''

DEMO_GLSL = r'''
// Kamera yokken test kaynağı: dolaşan metaball'lar ve süpüren bir ışık çubuğu.
uniform vec4 uDemo;   // x = zaman (sn)
layout(location = 0) out vec4 fragColor;

vec3 pal(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }

void main() {
    vec2 res = uTDOutputInfo.res.zw;
    vec2 p = (vUV.st - 0.5) * vec2(res.x / res.y, 1.0);
    float t = uDemo.x;
    float f = 0.0;
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 c = vec2(sin(t * (0.7 + fi * 0.13) + fi * 1.7) * 0.45,
                      cos(t * (0.9 + fi * 0.11) + fi * 2.3) * 0.28);
        f += 0.012 / dot(p - c, p - c);
    }
    vec3 col = vec3(0.02, 0.02, 0.03);
    float body = smoothstep(0.9, 1.1, f);
    col = mix(col, pal(t * 0.1 + min(f, 3.0) * 0.06) * (0.55 + 0.45 * smoothstep(1.0, 3.0, f)), body);
    // merkezden dönen ışık çizgileri: zaman haritası bunları eğrilere çevirir
    float ang = atan(p.y, p.x), r = length(p);
    float spokes = pow(abs(cos(ang * 3.0 - t * 1.1)), 120.0) * smoothstep(0.55, 0.1, r);
    col += spokes * pal(0.6 + t * 0.05) * 1.2;
    float bar = smoothstep(0.02, 0.0, abs(p.x - sin(t * 1.3) * 0.6));
    col += bar * vec3(1.0, 0.85, 0.6) * 0.8;
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
'''

# ---------------------------------------------------------------- yardımcılar
missing = []

def setp(o, name, value):
    p = getattr(o.par, name, None)
    if p is None:
        missing.append(o.name + '.' + name)
        return
    p.val = value

def sete(o, name, expr):
    p = getattr(o.par, name, None)
    if p is None:
        missing.append(o.name + '.' + name)
        return
    p.expr = expr

def place(o, col, row):
    o.nodeX = col * 200
    o.nodeY = -row * 150

def custom_res(o, w, h):
    setp(o, 'outputresolution', 'custom')
    setp(o, 'resolutionw', w)
    setp(o, 'resolutionh', h)

def uniform(g, slot, name, exprs):
    # GLSL TOP'un vektör uniform'ları yeni sürümlerde sequence; yeterli blok aç.
    try:
        if g.seq.vec.numBlocks < slot + 1:
            g.seq.vec.numBlocks = slot + 1
    except Exception:
        pass
    setp(g, 'vec%dname' % slot, name)
    for comp, e in zip('xyzw', exprs):
        if e is not None:
            sete(g, 'vec%dvalue%s' % (slot, comp), e)

def text_dat(parent_comp, name, text, col, row):
    d = parent_comp.create(textDAT, name)
    d.text = text.strip() + '\n'
    place(d, col, row)
    return d

def glsl(parent_comp, name, dat):
    g = parent_comp.create(glslTOP, name)
    setp(g, 'pixeldat', dat.name)
    return g

# ---------------------------------------------------------------- kurulum
result = {}
try:
    root = op(PARENT)
    old = root.op(NAME)
    if old:
        old.destroy()
    base = root.create(baseCOMP, NAME)
    result['path'] = base.path

    # Özel parametreler (Base COMP -> "Zaman" sayfası)
    page = base.appendCustomPage('Zaman')
    pSrc = page.appendMenu('Source', label='Kaynak')[0]
    pSrc.menuNames = ['demo', 'kamera']
    pSrc.menuLabels = ['Demo', 'Kamera']
    pMode = page.appendMenu('Mode', label='Mod')[0]
    pMode.menuNames = ['tarama', 'halkalar', 'sivi', 'spiral', 'dilimler']
    pMode.menuLabels = ['Tarama', 'Halkalar', 'Sıvı', 'Spiral', 'Dilimler']
    pMode.val = 'halkalar'
    pAuto = page.appendToggle('Auto', label='Otomatik geçiş')[0]
    pAuto.val = True
    pRate = page.appendFloat('Autorate', label='Geçiş hızı')[0]
    pRate.normMin, pRate.normMax, pRate.default, pRate.val = 0.0, 0.5, 0.06, 0.06
    pDepth = page.appendFloat('Depth', label='Derinlik')[0]
    pDepth.normMin, pDepth.normMax, pDepth.default, pDepth.val = 0.0, 1.0, 0.85, 0.85
    pChroma = page.appendFloat('Chroma', label='Renk kayması')[0]
    pChroma.normMin, pChroma.normMax, pChroma.default, pChroma.val = 0.0, 8.0, 2.5, 2.5
    pMix = page.appendFloat('Mix', label='Karışım')[0]
    pMix.normMin, pMix.normMax, pMix.default, pMix.val = 0.0, 1.0, 1.0, 1.0
    pStep = page.appendInt('Step', label='Kayıt aralığı (kare)')[0]
    pStep.normMin, pStep.normMax, pStep.default, pStep.val = 1, 4, 2, 2
    pStep.clampMin, pStep.min = True, 1

    frame_expr = "int(absTime.frame / max(1, parent().par.Step.eval()))"

    # Shader metinleri
    d_write = text_dat(base, 'yaz_glsl', WRITE_GLSL, 2, 2)
    d_read = text_dat(base, 'oku_glsl', READ_GLSL, 5, 2)
    d_demo = text_dat(base, 'demo_glsl', DEMO_GLSL, 0, 2)

    # Kaynaklar
    demo = glsl(base, 'demo', d_demo)
    custom_res(demo, DEMO_W, DEMO_H)
    uniform(demo, 0, 'uDemo', ['absTime.seconds', None, None, None])
    place(demo, 0, 0)

    cam = base.create(videodeviceinTOP, 'kamera')
    sete(cam, 'active', "parent().par.Source.menuIndex == 1")
    place(cam, 0, 1)

    src = base.create(switchTOP, 'kaynak')
    src.inputConnectors[0].connect(demo)
    src.inputConnectors[1].connect(cam)
    sete(src, 'index', "parent().par.Source.menuIndex")
    place(src, 1, 0)

    null_src = base.create(nullTOP, 'null_kaynak')
    null_src.inputConnectors[0].connect(src)
    place(null_src, 2, 0)

    # Halka tampon: constant (başlangıç) -> feedback -> yaz -> null_atlas
    init = base.create(constantTOP, 'atlas_baslangic')
    custom_res(init, TILES_X * TILE_W, TILES_Y * TILE_H)
    place(init, 1, 1)

    fb = base.create(feedbackTOP, 'atlas_feedback')
    fb.inputConnectors[0].connect(init)
    place(fb, 2, 1)

    write = glsl(base, 'yaz', d_write)
    write.inputConnectors[0].connect(fb)
    write.inputConnectors[1].connect(null_src)
    uniform(write, 0, 'uYaz', [frame_expr, str(TILES_X), str(TILES_Y), None])
    place(write, 3, 1)

    null_atlas = base.create(nullTOP, 'null_atlas')
    null_atlas.inputConnectors[0].connect(write)
    place(null_atlas, 4, 1)

    setp(fb, 'top', 'null_atlas')   # döngüyü en son kapat

    # Zamanda okuma
    read = glsl(base, 'oku', d_read)
    read.inputConnectors[0].connect(null_atlas)
    read.inputConnectors[1].connect(null_src)
    custom_res(read, OUT_W, OUT_H)
    mode_expr = ("(absTime.seconds * parent().par.Autorate.eval()) % 5 "
                 "if parent().par.Auto.eval() else parent().par.Mode.menuIndex")
    uniform(read, 0, 'uZaman', [frame_expr, mode_expr,
                                "parent().par.Depth.eval()", "parent().par.Chroma.eval()"])
    uniform(read, 1, 'uAyar', ['absTime.seconds', "parent().par.Mix.eval()",
                               str(TILES_X), str(TILES_Y)])
    place(read, 5, 0)

    out = base.create(nullTOP, 'null_out')
    out.inputConnectors[0].connect(read)
    place(out, 6, 0)

    out_op = base.create(outTOP, 'out1')
    out_op.inputConnectors[0].connect(out)
    place(out_op, 7, 0)

    try:
        fb.par.resetpulse.pulse()
    except Exception:
        pass
    try:
        out.viewer = True
        base.viewer = True
    except Exception:
        pass

    result['ok'] = True
    result['missing_params'] = missing
except Exception as e:
    result['ok'] = False
    result['error'] = repr(e)
    result['missing_params'] = missing

print('Zaman Aynası:', result)
