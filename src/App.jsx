import { useState, useRef, useCallback, Fragment } from "react";

// ─── YouTube & Image Policy Safety Rules ─────────────────────────────────────
// 모든 생성 프롬프트에 자동 삽입되는 정책 가이드라인

const POLICY_RULES = `
[CONTENT POLICY — MANDATORY, NEVER VIOLATE]
✅ YouTube Community Guidelines & Image Policy Compliance:
- NO violence, gore, graphic injuries, weapons shown aggressively
- NO sexual or suggestive content, revealing clothing, or implicit nudity
- NO hate speech, discrimination based on race/gender/religion/nationality
- NO dangerous activities or challenges that could harm viewers
- NO misleading thumbnails or clickbait that misrepresents the product
- NO copyrighted characters, logos, or trademarked imagery without permission
- NO real identifiable people without implied consent context (use models/silhouettes)
- NO alcohol, tobacco, gambling, or controlled substances imagery
- NO shocking, disturbing, or traumatic content
- NO content targeting children in inappropriate ways
- ALL content must be brand-safe, advertiser-friendly, and family-appropriate
- ALL people shown must appear adult (18+), fully clothed, dignified
- ALL claims about products must be truthful and non-misleading
- ALWAYS show products in honest, authentic, respectful contexts
[END POLICY]
`;

// ─── Camera Move Logic: 스토리씬 + 이미지스타일로 자동 결정 ─────────────────

const AUTO_CAMERA_MAP = {
  // 프레임워크별 씬 ID → 이미지스타일별 카메라 매핑
  // 씬 감정: open(오프닝), tension(긴장), reveal(공개), calm(평온), cta(행동유도)

  // 골든서클
  why:      { cinematic:"slow dolly push-in, revealing wide environment then focusing on product", anime:"smooth pan across illustrated world, gentle zoom", watercolor:"slow gentle zoom in, soft and contemplative", neon_cyberpunk:"dramatic dolly through neon-lit corridor toward product", minimal:"clean static shot, subtle zoom in", vintage:"handheld gentle push in, nostalgic warmth", hyperrealistic:"macro pull-back reveal, ultra-sharp focus shift", illustration:"animated pan reveal, bold graphic transitions", dark_luxury:"slow cinematic push through darkness into golden light", nature:"organic handheld movement through natural setting", pop_art:"dynamic zoom with pop art frame transition", dreamy:"floating ethereal drift toward subject", _default:"slow cinematic push-in" },
  how:      { cinematic:"tracking shot alongside product process, steady cam", anime:"dynamic action follow shot", watercolor:"flowing pan following brush-stroke motion", neon_cyberpunk:"fast tracking through tech process", minimal:"clean overhead tracking shot", vintage:"documentary handheld follow", hyperrealistic:"precision tracking macro shot", illustration:"kinetic graphic tracking", dark_luxury:"sleek dolly alongside craftsmanship", nature:"natural handheld follow through process", pop_art:"energetic zoom tracking", dreamy:"soft floating follow shot", _default:"smooth tracking shot" },
  what:     { cinematic:"360 orbit around hero product, dramatic lighting", anime:"product showcase spin with sparkle effects", watercolor:"gentle orbit with painted texture reveal", neon_cyberpunk:"360 neon orbit, reflections and glows", minimal:"clean orbit, pure white background", vintage:"slow orbit with film grain", hyperrealistic:"precision 360 product photography orbit", illustration:"illustrated spin reveal", dark_luxury:"moody slow orbit in darkness with accent lighting", nature:"orbit with organic natural elements", pop_art:"fast pop orbit with color burst", dreamy:"dreamlike slow spin with haze", _default:"360 product orbit" },
  proof:    { cinematic:"handheld documentary, real person testimonial", anime:"character reaction close-up", watercolor:"warm intimate close-up", neon_cyberpunk:"tight face shot with tech overlay", minimal:"clean talking-head static", vintage:"warm interview-style handheld", hyperrealistic:"ultra-sharp portrait close-up", illustration:"illustrated testimonial reveal", dark_luxury:"dramatic low-key portrait lighting", nature:"natural outdoor testimonial", pop_art:"bold portrait with graphic overlay", dreamy:"soft portrait with bokeh", _default:"intimate close-up testimonial" },
  cta:      { cinematic:"dramatic pull-back to reveal full scene, epic scale", anime:"energetic zoom out with action lines", watercolor:"gentle zoom out to full composition", neon_cyberpunk:"explosive pull-back with neon burst", minimal:"clean zoom out to product on white", vintage:"warm pull-back, nostalgic", hyperrealistic:"sharp wide pull-back, commercial grade", illustration:"graphic explode-out reveal", dark_luxury:"elegant reveal pull-back", nature:"wide nature pull-back reveal", pop_art:"bold pop zoom-out", dreamy:"dreamy float-back reveal", _default:"pull-back CTA reveal" },

  // 하몬써클
  you:      { cinematic:"establishing wide shot, slow push toward character", anime:"character introduction pan", watercolor:"gentle establishing pan", neon_cyberpunk:"atmospheric wide establishing", minimal:"clean establishing static", vintage:"warm establishing handheld", hyperrealistic:"wide establishing dolly", illustration:"illustrated world reveal", dark_luxury:"moody establishing wide", nature:"natural world establishing pan", pop_art:"bold establishing with graphic frame", dreamy:"floating wide establishing", _default:"wide establishing shot" },
  need:     { cinematic:"close-up on frustrated face, handheld tension", anime:"expression close-up with reaction", watercolor:"intimate emotional close-up", neon_cyberpunk:"tight shot with tension overlay", minimal:"stark close-up, negative space", vintage:"intimate handheld close-up", hyperrealistic:"sharp emotional portrait", illustration:"expressive illustrated face", dark_luxury:"dramatic shadow close-up", nature:"naturalistic close-up", pop_art:"bold expressive close-up", dreamy:"soft emotional close-up", _default:"emotional close-up" },
  go:       { cinematic:"dramatic threshold crossing, dolly through doorway", anime:"dramatic transition shot", watercolor:"flowing transition pan", neon_cyberpunk:"portal-style transition", minimal:"clean geometric transition", vintage:"nostalgic transition handheld", hyperrealistic:"sharp threshold dolly", illustration:"illustrated world-switch", dark_luxury:"mysterious threshold dolly", nature:"natural path following shot", pop_art:"explosive transition", dreamy:"dreamy dissolve float", _default:"transition dolly" },
  search:   { cinematic:"exploratory handheld, curious searching motion", anime:"energetic exploration pan", watercolor:"curious gentle pan", neon_cyberpunk:"fast scanning tech motion", minimal:"clean search static", vintage:"exploratory handheld", hyperrealistic:"detailed macro exploration", illustration:"kinetic exploration pan", dark_luxury:"mysterious search motion", nature:"natural curiosity handheld", pop_art:"dynamic search pan", dreamy:"floating discovery motion", _default:"exploratory handheld" },
  find:     { cinematic:"slow reveal dolly, moment of discovery lighting", anime:"sparkle reveal zoom", watercolor:"blooming reveal zoom", neon_cyberpunk:"neon discovery flash zoom", minimal:"clean reveal zoom", vintage:"warm discovery handheld", hyperrealistic:"sharp reveal zoom", illustration:"illustrated discovery reveal", dark_luxury:"dramatic spotlight reveal", nature:"natural discovery reveal", pop_art:"pop reveal zoom", dreamy:"magical float reveal", _default:"discovery reveal zoom" },
  take:     { cinematic:"decisive close-up on hands taking product", anime:"action grab with motion blur", watercolor:"decisive warm close-up", neon_cyberpunk:"tech acquisition close-up", minimal:"clean decisive close-up", vintage:"nostalgic close-up", hyperrealistic:"ultra-sharp detail close-up", illustration:"bold action illustration", dark_luxury:"elegant acquisition close-up", nature:"natural choice close-up", pop_art:"bold decisive pop shot", dreamy:"gentle dreamy close-up", _default:"decisive close-up" },
  return:   { cinematic:"returning establishing shot, familiar warmth", anime:"homecoming pan", watercolor:"warm return establishing", neon_cyberpunk:"returning to familiar neon world", minimal:"clean return static", vintage:"warm homecoming handheld", hyperrealistic:"sharp return establishing", illustration:"illustrated homecoming", dark_luxury:"elegant return reveal", nature:"natural return pan", pop_art:"warm pop homecoming", dreamy:"soft return float", _default:"return establishing" },
  change:   { cinematic:"crane shot rising, transformed world reveal", anime:"epic character reveal zoom", watercolor:"blooming transformation reveal", neon_cyberpunk:"epic neon transformation", minimal:"clean transformation reveal", vintage:"warm transformation handheld", hyperrealistic:"sharp epic reveal", illustration:"illustrated transformation", dark_luxury:"dramatic transformed reveal", nature:"natural growth reveal", pop_art:"bold transformation pop", dreamy:"magical transformation float", _default:"transformation crane rise" },

  // AIDA
  attention:{ cinematic:"explosive dolly crash zoom, maximum impact", anime:"dynamic action zoom", watercolor:"surprising reveal zoom", neon_cyberpunk:"neon explosion zoom", minimal:"stark surprise static", vintage:"surprising handheld push", hyperrealistic:"sharp impact zoom", illustration:"bold graphic impact", dark_luxury:"dramatic impact reveal", nature:"surprising natural reveal", pop_art:"explosive pop zoom", dreamy:"surprising dreamy reveal", _default:"impact crash zoom" },
  interest: { cinematic:"curious slow dolly investigation", anime:"interested lean-in zoom", watercolor:"gentle curious zoom", neon_cyberpunk:"tech investigation tracking", minimal:"clean interest zoom", vintage:"curious handheld", hyperrealistic:"detailed investigation macro", illustration:"illustrated curiosity reveal", dark_luxury:"intriguing close investigation", nature:"natural curiosity handheld", pop_art:"bold interest zoom", dreamy:"curious float zoom", _default:"curious investigation dolly" },
  desire:   { cinematic:"sensual slow product reveal, golden light", anime:"beautiful showcase pan", watercolor:"dreamy desire reveal", neon_cyberpunk:"luxurious neon reveal", minimal:"elegant desire reveal", vintage:"warm desire close-up", hyperrealistic:"perfect beauty shot", illustration:"gorgeous illustrated reveal", dark_luxury:"luxurious dark reveal", nature:"organic beauty reveal", pop_art:"vibrant desire pop shot", dreamy:"magical desire float", _default:"sensual product reveal" },
  action:   { cinematic:"urgent push-in CTA, dynamic energy", anime:"action-packed CTA zoom", watercolor:"decisive action reveal", neon_cyberpunk:"urgent neon CTA", minimal:"clean urgent CTA", vintage:"energetic CTA handheld", hyperrealistic:"sharp urgent close-up", illustration:"bold CTA graphic", dark_luxury:"elegant urgent CTA", nature:"natural action reveal", pop_art:"explosive CTA pop", dreamy:"floating CTA reveal", _default:"urgent CTA push" },

  // 문제-해결
  pain:     { cinematic:"oppressive close-up, handheld tension", anime:"suffering expression close-up", watercolor:"heavy sad close-up", neon_cyberpunk:"harsh tight shot", minimal:"stark pain static", vintage:"heavy handheld close-up", hyperrealistic:"sharp discomfort portrait", illustration:"expressive pain illustration", dark_luxury:"dark moody close-up", nature:"constrained nature shot", pop_art:"bold pain expression", dreamy:"distorted dream close-up", _default:"oppressive close-up" },
  agitate:  { cinematic:"shaky handheld escalation, tension building", anime:"escalating action", watercolor:"swirling agitation", neon_cyberpunk:"glitching tension shot", minimal:"stark escalation", vintage:"shaky escalation handheld", hyperrealistic:"sharp tension escalation", illustration:"kinetic agitation", dark_luxury:"dark escalating tension", nature:"stormy agitation", pop_art:"explosive agitation", dreamy:"disturbed dream motion", _default:"shaky tension escalation" },
  solution: { cinematic:"heroic product reveal, triumphant lighting", anime:"hero product reveal", watercolor:"blooming solution reveal", neon_cyberpunk:"epic solution reveal flash", minimal:"clean solution reveal", vintage:"warm solution reveal", hyperrealistic:"perfect solution product shot", illustration:"illustrated hero reveal", dark_luxury:"dramatic solution reveal", nature:"natural harmony reveal", pop_art:"bold solution pop reveal", dreamy:"magical solution reveal", _default:"heroic product reveal" },
  result:   { cinematic:"joyful wide shot, warm golden light", anime:"happy result pan", watercolor:"warm joyful wide shot", neon_cyberpunk:"celebratory neon wide", minimal:"clean positive static", vintage:"warm celebration handheld", hyperrealistic:"sharp joy portrait", illustration:"joyful illustrated scene", dark_luxury:"elegant success reveal", nature:"natural joy in nature", pop_art:"celebratory pop shot", dreamy:"joyful dreamy float", _default:"joyful wide celebration" },

  // 비포·애프터
  before:   { cinematic:"dull static wide, flat lighting", anime:"gray mundane pan", watercolor:"muted before scene", neon_cyberpunk:"dark de-saturated before", minimal:"stark before static", vintage:"heavy before handheld", hyperrealistic:"flat before shot", illustration:"dull before illustration", dark_luxury:"heavy shadow before", nature:"constrained before shot", pop_art:"muted before pop", dreamy:"heavy before scene", _default:"flat before static" },
  struggle: { cinematic:"tight frustrated handheld, no escape feel", anime:"struggle close-up", watercolor:"heavy struggle close-up", neon_cyberpunk:"trapped tight shot", minimal:"stark struggle close-up", vintage:"struggle handheld", hyperrealistic:"sharp struggle portrait", illustration:"expressive struggle illustration", dark_luxury:"dark struggle close-up", nature:"constrained struggle", pop_art:"bold struggle expression", dreamy:"distorted struggle", _default:"tight struggle handheld" },
  bridge:   { cinematic:"magical golden transition dolly", anime:"transformation transition", watercolor:"colour bloom transition", neon_cyberpunk:"neon transition flash", minimal:"clean bridge transition", vintage:"warm bridge handheld", hyperrealistic:"sharp bridge reveal", illustration:"illustrated bridge transition", dark_luxury:"dramatic bridge reveal", nature:"natural bridge transition", pop_art:"pop bridge transition", dreamy:"magical dreamy bridge", _default:"transformation transition" },
  after:    { cinematic:"bright warm wide shot, smiling character", anime:"happy after reveal", watercolor:"bright warm after scene", neon_cyberpunk:"vibrant after reveal", minimal:"bright clean after", vintage:"warm happy handheld", hyperrealistic:"sharp joy portrait", illustration:"joyful after illustration", dark_luxury:"elegant after reveal", nature:"joyful nature after", pop_art:"vibrant after pop", dreamy:"bright dreamy after", _default:"bright after reveal" },
  new_life: { cinematic:"soaring crane shot, epic life reveal", anime:"epic life reveal", watercolor:"expansive life bloom", neon_cyberpunk:"epic neon life reveal", minimal:"expansive clean reveal", vintage:"warm life handheld", hyperrealistic:"epic sharp wide", illustration:"expansive life illustration", dark_luxury:"elegant life reveal", nature:"expansive nature reveal", pop_art:"epic life pop reveal", dreamy:"soaring dreamy reveal", _default:"soaring epic reveal" },
};

function getAutoCamera(sceneId, styleId) {
  const sceneMap = AUTO_CAMERA_MAP[sceneId];
  if (!sceneMap) return "smooth cinematic camera movement, steady and professional";
  return sceneMap[styleId] || sceneMap["_default"] || "smooth cinematic camera movement";
}

// ─── Story Frameworks ─────────────────────────────────────────────────────────

const STORY_FRAMEWORKS = {
  golden_circle: {
    label: "골든서클", icon: "⭕", color: "#f59e0b", desc: "Why → How → What", author: "Simon Sinek",
    scenes: [
      { id: "why",   label: "WHY",   emoji: "💡", desc: "왜 이 제품이 존재하는가? 브랜드 철학·비전" },
      { id: "how",   label: "HOW",   emoji: "⚙",  desc: "어떻게 만들었는가? 기술·과정·차별점" },
      { id: "what",  label: "WHAT",  emoji: "📦", desc: "무엇을 파는가? 제품 기능·스펙 소개" },
      { id: "proof", label: "PROOF", emoji: "✅", desc: "실제 사용자 반응·리뷰·증거" },
      { id: "cta",   label: "CTA",   emoji: "🚀", desc: "지금 행동하세요! 구매·공유 유도" },
    ],
  },
  harmon_circle: {
    label: "하몬써클", icon: "🔄", color: "#8b5cf6", desc: "8단계 스토리 사이클", author: "Dan Harmon",
    scenes: [
      { id: "you",    label: "YOU",    emoji: "👤", desc: "주인공(고객)의 일상 상황 설정" },
      { id: "need",   label: "NEED",   emoji: "😩", desc: "주인공이 원하는 것·결핍·문제점" },
      { id: "go",     label: "GO",     emoji: "🚪", desc: "낯선 세계로의 진입 — 제품을 처음 만남" },
      { id: "search", label: "SEARCH", emoji: "🔍", desc: "제품을 탐색·체험하는 과정" },
      { id: "find",   label: "FIND",   emoji: "💎", desc: "원하는 것을 발견! 핵심 가치 체험" },
      { id: "take",   label: "TAKE",   emoji: "✊", desc: "구매 결정 — 제품을 선택함" },
      { id: "return", label: "RETURN", emoji: "🏠", desc: "일상으로 돌아옴 — 변화된 삶" },
      { id: "change", label: "CHANGE", emoji: "🌟", desc: "이전과 달라진 주인공 — 감동 마무리" },
    ],
  },
  aida: {
    label: "AIDA", icon: "📈", color: "#06b6d4", desc: "Attention → Interest → Desire → Action", author: "Elias St. Elmo Lewis",
    scenes: [
      { id: "attention", label: "ATTENTION", emoji: "👀", desc: "시선 강탈! 임팩트 있는 오프닝" },
      { id: "interest",  label: "INTEREST",  emoji: "🤔", desc: "호기심 유발 — 제품의 독특한 점" },
      { id: "desire",    label: "DESIRE",    emoji: "🔥", desc: "갖고 싶다! 감정적 욕구 자극" },
      { id: "action",    label: "ACTION",    emoji: "🛒", desc: "지금 바로 구매하세요 — CTA" },
    ],
  },
  problem_solution: {
    label: "문제-해결", icon: "🔧", color: "#10b981", desc: "Pain → Agitate → Solve", author: "PAS Formula",
    scenes: [
      { id: "pain",     label: "PAIN",     emoji: "😤", desc: "공감되는 문제 상황 제시" },
      { id: "agitate",  label: "AGITATE",  emoji: "😱", desc: "문제를 더 심각하게 느끼게 하기" },
      { id: "solution", label: "SOLUTION", emoji: "💊", desc: "제품이 완벽한 해결책임을 보여줌" },
      { id: "result",   label: "RESULT",   emoji: "🎉", desc: "해결 후 달라진 삶의 모습" },
      { id: "cta",      label: "CTA",      emoji: "📲", desc: "지금 해결하세요!" },
    ],
  },
  before_after: {
    label: "비포·애프터", icon: "🔀", color: "#f43f5e", desc: "Before → Bridge → After", author: "Story Brand",
    scenes: [
      { id: "before",   label: "BEFORE",   emoji: "😞", desc: "제품 없을 때의 불편한 현실" },
      { id: "struggle", label: "STRUGGLE", emoji: "😤", desc: "이 문제로 인한 구체적인 고통" },
      { id: "bridge",   label: "BRIDGE",   emoji: "🌉", desc: "전환점 — 제품과의 첫 만남" },
      { id: "after",    label: "AFTER",    emoji: "😍", desc: "제품 사용 후 달라진 모습" },
      { id: "new_life", label: "NEW LIFE", emoji: "✨", desc: "새로운 일상의 완성된 모습" },
    ],
  },
};

// ─── Image Styles ─────────────────────────────────────────────────────────────

const IMAGE_STYLES = [
  {
    id: "cinematic", label: "시네마틱", emoji: "🎬", desc: "영화급 조명·색보정",
    prompt: "cinematic film photography, anamorphic 2.39:1 widescreen, dramatic Rembrandt lighting with deep shadows and bright highlights, shallow depth of field f/1.8, color graded with teal-and-orange LUT, lens flare from practical light source, 35mm film grain overlay, ARRI Alexa camera look, professional film set quality, bokeh background, motivated lighting from single key light, volumetric haze catching light shafts, subtle vignette darkening frame edges, layered foreground-midground-background depth separation, meticulous production-design set dressing, Denis Villeneuve-inspired epic scale and grandeur",
    negative: "avoid: flat lighting, overexposed, digital look, amateur, no grain, cartoon, cluttered composition, flat single-plane depth",
  },
  {
    id: "anime", label: "애니메이션 (시티팝)", emoji: "🌆", desc: "80년대 시티팝 감성 애니",
    prompt: "1980s Japanese City Pop album cover art style fused with high-quality anime illustration, Hiroshi Nagai and Eizin Suzuki inspired retro travel-poster aesthetic, warm airbrushed gradient sunset sky in pink-orange-purple, glossy palm trees and retro convertible cars, minimalist flat geometric Japanese coastal cityscape silhouettes, nostalgic vaporwave-adjacent warm color palette, soft glowing rim highlights, clean anime-style character line art with 80s fashion and feathered hairstyles when characters appear, warm golden-hour haze, vintage vinyl-cover composition, subtle halftone grain, dreamy nostalgic retro mood",
    negative: "avoid: 3D render, realistic photography, CGI, blurry lines, Western cartoon style, cold blue-toned modern cyberpunk neon, contemporary flat corporate illustration",
  },
  {
    id: "watercolor", label: "수채화", emoji: "🎨", desc: "감성 반실사 일러스트풍",
    prompt: "semi-realistic digital painting illustration, Korean webtoon/mobile-game key-visual quality, soft painterly brushwork blended with photographic-level lighting and depth of field, individually rendered flowing hair strands with wind motion, warm golden-hour cinematic color grading, glossy soft skin shading with warm undertones, clean fine linework balanced with painterly color blending (not flat cel-shading, not heavy black outlines), atmospheric background softly out of focus like a shallow-depth photo, dynamic candid lifestyle pose and angle, rich environmental detail (foliage, water, architecture) rendered in the same soft painterly treatment as the subject, dreamy nostalgic warm mood",
    negative: "avoid: flat cel-shaded anime look, traditional watercolor paper texture or paint bleeding, plastic/artificial CGI skin, harsh 3D render look, heavy black outlines, cold color tones",
  },
  {
    id: "neon_cyberpunk", label: "네온·사이버펑크", emoji: "🌃", desc: "미래적 네온 감성",
    prompt: "cyberpunk neon noir aesthetic, rain-soaked reflective streets at night, magenta and cyan volumetric neon signs, atmospheric fog with god rays, high contrast deep blacks with vivid neon fills, holographic UI overlays, wet ground reflections doubling neon colors, dystopian urban environment, blade runner inspired color palette, rim lighting from neon sources, chromatic aberration effect, wet asphalt and brushed chrome surface reflections, layered neon signage receding into fog for depth, steam rising from street vents, low camera angle looking up at towering holographic billboards, Blade Runner 2049-scale futuristic megacity atmosphere",
    negative: "avoid: daylight, natural colors, warm tones, clean environment, low contrast, dry surfaces, flat single-layer background",
  },
  {
    id: "minimal", label: "미니멀", emoji: "⬜", desc: "깔끔한 미니멀리즘",
    prompt: "pure minimalist composition, vast negative space on clean white or off-white background, single hero subject centered or rule-of-thirds placed, razor-sharp focus with no distractions, flat diffused studio lighting eliminating all shadows, muted monochromatic color palette with one accent hue, precise geometric composition, Swiss graphic design principles, breathing room around subject, no texture, single softbox positioned at 45 degrees casting a barely-visible soft shadow gradient beneath the subject, Muji/Aesop-inspired restrained tonal palette, subject occupying no more than 20% of frame area, precise alignment to an invisible grid",
    negative: "avoid: busy background, multiple subjects, dark tones, texture, clutter, vibrant colors, hard shadows, cramped composition",
  },
  {
    id: "vintage", label: "빈티지·필름", emoji: "📷", desc: "레트로 필름 감성",
    prompt: "Kodak Portra 400 film photography aesthetic, warm faded analog tones with lifted blacks, heavy film grain noise especially in shadows, slight color shift toward orange in midtones, cyan in shadows, light leaks in corners, vignette darkening edges, slightly soft focus from vintage lens, 1970s-1980s aesthetic, expired film look, desaturated highlights, authentic analog imperfection, faint dust specks and fine scratches on the film surface, warm halation glow bleeding around bright highlights, slightly underexposed shadow crush, candid unposed family-photo-album framing with a hint of motion blur",
    negative: "avoid: digital sharpness, clean modern look, vivid colors, no grain, contemporary style, perfectly posed composition, crisp digital clarity",
  },
  {
    id: "hyperrealistic", label: "하이퍼리얼", emoji: "🔬", desc: "초극사실적 묘사",
    prompt: "hyperrealistic commercial photography, 100MP medium format camera quality, studio strobe lighting with large octabox softbox, every surface texture rendered in microscopic detail, razor-sharp focus edge to edge, accurate color reproduction, product photography standard, subtle natural reflections, no visible grain, technically perfect exposure, advertising campaign quality, shot on Hasselblad H6D, pore-level skin detail and individual fabric weave threads visible, fine condensation droplets or dust particles rendered with pin-sharp clarity, focus-stacked macro-level edge-to-edge sharpness, color-calibrated true-to-life tones as seen on a reference monitor",
    negative: "avoid: painterly, illustration, artistic interpretation, grain, blur, artistic style, soft focus, plastic-looking skin, texture smoothing",
  },
  {
    id: "illustration", label: "일러스트", emoji: "✏", desc: "현대적 일러스트",
    prompt: "contemporary editorial illustration style, bold confident vector-like line art, limited flat color palette with intentional color blocking, geometric simplified forms, layered composition with clear foreground-midground-background, texture overlays on flat fills, influenced by Malika Favre and Olimpia Zagnoli, strong graphic design sensibility, crisp clean shapes, modern magazine cover aesthetic, subtle riso-print grain texture with faint offset-print misregistration on edges, restrained 3-4 color palette with a single bold accent color, generous negative space, typography-friendly balanced composition, slight isometric depth cue within an otherwise flat 2D plane",
    negative: "avoid: photorealistic, anime, watercolor, rough texture, hand-drawn imprecision, gradient shading, busy cluttered layout",
  },
  {
    id: "dark_luxury", label: "다크 럭셔리", emoji: "🖤", desc: "고급스러운 어둠",
    prompt: "dark luxury editorial photography, near-black background with 5% lift, single narrow rim light creating product silhouette, 24-karat gold and deep black color story, velvet and polished metal surface textures, extreme shallow depth with specular highlights glinting, jewelry editorial lighting standard, perfume bottle advertisement aesthetic, dramatic shadows with 10:1 lighting ratio, smoke or mist for atmosphere, brushed titanium and obsidian black lacquer material accents, single hard-edged spotlight carving out the subject from darkness, subtle lens vignette framing, film-noir cinematic composition, luxury car showroom lighting reference",
    negative: "avoid: bright environment, casual feel, flat lighting, colorful, playful, lo-fi, even soft lighting, cluttered background",
  },
  {
    id: "nature", label: "자연·유기적", emoji: "🌿", desc: "자연친화적 감성",
    prompt: "organic nature photography, golden hour soft sunlight filtering through leaves, dappled light and shadow patterns, earthy color palette of sage green, terracotta, warm beige, botanical elements naturally integrated, macro texture of leaves bark stone, gentle lens blur of out-of-focus foliage, environmentally conscious aesthetic, slow-living visual language, imperfect natural beauty, fine morning dew droplets or mist rising softly off grass and foliage, handheld film-like softness with gentle natural camera sway, Kinfolk-magazine editorial styling, natural material props like linen fabric raw wood and hand-thrown ceramic",
    negative: "avoid: artificial lighting, urban setting, synthetic materials, harsh flash, neon colors, plastic props, studio backdrop",
  },
  {
    id: "pop_art", label: "팝아트", emoji: "🎭", desc: "팝아트 스타일",
    prompt: "Roy Lichtenstein and Andy Warhol inspired pop art, benday halftone dot pattern overlaid on bold flat colors, thick black outlines with 4-6pt stroke weight, primary color palette red yellow blue with added hot pink, repeated motif screen-print aesthetic, thought bubbles or speech bubble graphic elements, high contrast with no gradients, comic book printing artifact aesthetic, Pantone solid colors only, visible CMYK color-separation misregistration for authentic print artifact feel, bold flat color-block background panels, comic-panel border framing with dynamic speed lines, varying Ben-Day dot size and density to suggest depth and shading",
    negative: "avoid: photorealistic, subtle colors, gradients, painterly, no outlines, 3D render, muted tones, soft edges",
  },
  {
    id: "dreamy", label: "몽환적", emoji: "☁", desc: "몽환적 분위기",
    prompt: "ethereal dreamscape photography, extreme lens bloom and halation glow around highlights, soft double exposure layering, pastel color palette lavender pink peach mist, heavy diffusion filter effect, out-of-focus foreground bokeh bubbles, surreal floating elements, haze and atmospheric fog reducing contrast, fairy tale otherworldly mood, slow shutter motion blur, iridescent light rainbow lens flare, prism light-leak flares with soft chromatic fringing at edges, gauzy translucent fabric diffusion overlay across the frame, weightless slow-motion floating hair and fabric, soft pastel gradient sky, drifting glitter-like light-particle bokeh",
    negative: "avoid: sharp focus, high contrast, realistic, dark tones, urban, harsh lighting, static rigid poses, saturated primary colors",
  },
  {
    id: "joseon", label: "조선 민화", emoji: "🏮", desc: "한국 전통 민화·조선 스타일",
    prompt: "Korean Joseon Dynasty Minhwa folk painting style, traditional hanji paper texture with warm cream-beige ground, natural mineral pigment colors using malachite green, cinnabar red, azurite blue, yellow ochre, pine soot black, white clay, bold confident brushwork with varying pressure, flat decorative two-dimensional perspective, symbolic iconography of tigers magpies lotus peony pine cranes, decorative patterned borders, hand-painted book illustration quality, Joseon court painting and folk art hybrid aesthetic, no Western perspective or shading",
    negative: "avoid: photorealistic, 3D, Western perspective, gradient shading, modern colors, CGI, anime",
  },
];


const PLATFORM_CONFIGS = {
  // ── 글로벌 숏폼 ──────────────────────────────────────────────────────────
  youtube_shorts:  {
    label:"YouTube Shorts", icon:"▶", color:"#FF0000", ratio:"9:16", duration:"60초 이내 (최대 3분)",
    size:"1080×1920px", fps:"24-60fps", maxSize:"256MB",
    tone:"에너지 넘치고 빠른 전개, 첫 3초 안에 훅, 자막 필수",
    style:"역동적·빠른 컷, 강렬한 오프닝, 유튜브 알고리즘 SEO 최적화",
    policy:"광고주 친화 콘텐츠 필수, 성인 콘텐츠·폭력·혐오 금지, 저작권 준수, 제휴/협찬 링크가 있으면 업로드 시 YouTube 스튜디오의 '유료 프로모션 포함' 토글을 반드시 켤 것(설명란 문구만으론 법적 고지 요건 불충분)",
    caption_tip:"해시태그 3-5개 권장, 자막은 화면 중앙 하단 배치",
  },
  tiktok:          {
    label:"TikTok", icon:"♪", color:"#69C9D0", ratio:"9:16", duration:"15-60초 (최대 10분)",
    size:"1080×1920px", fps:"24-60fps", maxSize:"287.6MB",
    tone:"Z세대 말투, 유머·밈 활용, 댓글 유도형, 트렌드 반응 빠르게",
    style:"트렌디·음악 싱크, 챌린지·밈, 텍스트 오버레이, 화면 전환 빠르게",
    policy:"TikTok 커뮤니티 가이드라인 준수, 위험 챌린지·허위정보 금지",
    caption_tip:"해시태그 5-10개, 음악 트렌드 활용, 첫 댓글 고정 활용",
  },
  instagram_reels: {
    label:"Instagram Reels", icon:"◈", color:"#E1306C", ratio:"9:16", duration:"15-90초",
    size:"1080×1920px", fps:"24-30fps", maxSize:"1GB",
    tone:"감성적·라이프스타일, 브랜드 무드 강조, 세련된 어투",
    style:"고화질·감성 필터, 라이프스타일 연출, 일상 속 제품 자연스럽게",
    policy:"Instagram 커뮤니티 가이드라인, 과도한 노출·폭력 금지",
    caption_tip:"2026년 1월부터 해시태그 최대 5개로 플랫폼 자체 제한(초과 시 게시물에서 해시태그 기능 자체가 막힘) — 가장 관련성 높은 3-5개만 엄선. 캡션은 최대 2,200자지만 모바일에서 앞 55-60자만 보이고 '더 보기'로 잘리므로 핵심 후킹 문구를 맨 앞에 배치. 위치 태그 추가, 제품 태그 활용",
  },
  facebook_reels:  {
    label:"Facebook Reels", icon:"f", color:"#1877F2", ratio:"9:16", duration:"15-90초",
    size:"1080×1920px", fps:"24-30fps", maxSize:"1GB",
    tone:"30-50대 타겟, 공감·감동 스토리, 공유 유도 강조",
    style:"감동적 스토리텔링, 광범위 도달, 공유하고 싶은 콘텐츠",
    policy:"Facebook 커뮤니티 규정 준수, 오해 유발 콘텐츠 금지",
    caption_tip:"해시태그 3-5개, 공유 유도 문구 포함, 외부 링크 자제",
  },
  x_twitter:       {
    label:"X (Twitter)", icon:"✕", color:"#e8e8f0", ratio:"9:16", duration:"140초 이내",
    size:"1280×720px (권장)", fps:"30-60fps", maxSize:"512MB",
    tone:"직설적·임팩트, 트렌드 반응, 논쟁 유발 OK, 짧고 강하게",
    style:"임팩트·트렌드 반응, 대화 유발, 뉴스성 콘텐츠, 실시간 이슈 연결",
    policy:"X 이용약관 준수, 혐오·폭력·스팸 금지",
    caption_tip:"해시태그 1-2개 (트렌딩), 리트윗·인용 유도 문구",
  },
  threads:         {
    label:"Threads", icon:"⊕", color:"#AAAAAA", ratio:"9:16", duration:"15-30초",
    size:"1080×1920px", fps:"24-30fps", maxSize:"1GB",
    tone:"캐주얼·진솔한 말투, 커뮤니티 대화 유도, 친근하게",
    style:"캐주얼·진정성, 대화형, 일상 공유, 꾸미지 않은 자연스러움",
    policy:"Instagram 정책 동일 적용, 혐오·스팸 금지",
    caption_tip:"Threads는 해시태그 기능 자체가 없음(해시태그 절대 넣지 말 것, 대신 문장 안에 자연스럽게 키워드 녹일 것) — 게시물 최대 500자(추가 텍스트 첨부 시 최대 10,000자까지 가능하지만 짧고 대화하듯 쓰는 게 반응이 더 좋음), 질문형 문구로 댓글 유도",
  },
  pinterest:       {
    label:"Pinterest", icon:"P", color:"#E60023", ratio:"9:16", duration:"15-60초",
    size:"1000×1500px (2:3 권장)", fps:"24-30fps", maxSize:"2GB",
    tone:"영감·아이디어 제공, DIY·인테리어·패션 감성, 저장하고 싶게",
    style:"영감·DIY·쇼핑 유도, 감성 비주얼, 정보성 텍스트 오버레이",
    policy:"Pinterest 가이드라인, 오해 유발·성인 콘텐츠 금지",
    caption_tip:"키워드 중심 설명, 핀 제목 SEO 최적화, CTA 포함",
  },
  linkedin:        {
    label:"LinkedIn", icon:"in", color:"#0A66C2", ratio:"16:9", duration:"15-60초",
    size:"1920×1080px", fps:"24-30fps", maxSize:"200MB",
    tone:"전문적·비즈니스 어투, 인사이트·학습 포인트 제공, 신뢰감",
    style:"전문적·인사이트, B2B·직장인 감성, 산업 트렌드 연결",
    policy:"LinkedIn 전문직 커뮤니티 기준, 과도한 홍보·스팸 금지",
    caption_tip:"해시태그 3-5개, 업계 인플루언서 태그, 댓글로 추가 인사이트",
  },
  // ── 국내 숏폼 ────────────────────────────────────────────────────────────
  naver_clip:      {
    label:"Naver Clip", icon:"N", color:"#03C75A", ratio:"9:16", duration:"60초 이내",
    size:"1080×1920px", fps:"30fps", maxSize:"500MB",
    tone:"정보 전달 중심, 신뢰감 있는 한국어 경어체, 구체적 수치·근거 제시",
    style:"정보 전달·상세 설명, 신뢰감, 자막 필수, 네이버 쇼핑 연계",
    policy:"네이버 커뮤니티 정책, 허위·과장 광고 금지, 원산지·성분 표기 준수",
    caption_tip:"해시태그 10-20개, 네이버 검색 키워드 포함, 구매 링크 추가",
  },
  kakaotalk_pung:  {
    label:"카카오톡 펑", icon:"K♡", color:"#FFCD00", ratio:"9:16", duration:"15-60초",
    size:"1080×1920px", fps:"30fps", maxSize:"50MB",
    tone:"친구에게 보내는 말투, 반말·이모티콘 적극 활용, 24시간 소멸 긴박감",
    style:"친근·일상 감성, 24시간 소멸형, 진정성 강조, 사적인 느낌",
    policy:"카카오 이용약관 준수, 스팸·음란·혐오 금지, 개인정보 노출 주의",
    caption_tip:"짧고 임팩트 있는 문구, 이모티콘 활용, 친구 태그 유도",
  },
  toss_shortform:  {
    label:"토스 숏폼", icon:"T₩", color:"#0064FF", ratio:"9:16", duration:"15-30초",
    size:"1080×1920px", fps:"30fps", maxSize:"100MB",
    tone:"간결·명확한 혜택 전달, 금액·% 수치 강조, 신뢰감 있는 정보 제공",
    style:"간결·신뢰감, 금융·쇼핑 혜택 강조, 구매 전환 최적화, 데이터 기반",
    policy:"금융광고 심의 기준 준수, 과장·허위 혜택 금지, 필수 고지사항 표기",
    caption_tip:"혜택 수치 강조, 기간 한정 강조, 바로 클릭 유도 CTA",
  },
  kakaostory:      {
    label:"카카오스토리", icon:"KS", color:"#FAE100", ratio:"1:1", duration:"30초 이내",
    size:"1080×1080px", fps:"30fps", maxSize:"100MB",
    tone:"일상 공유 말투, 친근·감성적, 카카오 친구들에게 자랑하는 느낌",
    style:"친근·일상 감성, 정방형 구성, 카카오 유저 타겟, 감성 사진 연계",
    policy:"카카오 이용약관 준수, 개인정보·저작권 침해 금지",
    caption_tip:"짧은 감성 문구, 이모지 적극 사용, 댓글 유도",
  },
  danggeun:        {
    label:"당근마켓", icon:"🥕", color:"#FF8100", ratio:"9:16", duration:"15-30초",
    size:"1080×1920px", fps:"24-30fps", maxSize:"100MB",
    tone:"동네 이웃에게 말하듯 친근한 반말·구어체, 꾸미지 않은 직거래 느낌, 신뢰감",
    style:"소박·친근한 동네 감성, 직거래 강조, 가격 흥정 가능 뉘앙스, 과장 없는 진솔함",
    policy:"당근마켓 이용정책 준수, 허위매물·사기 금지, 실제 상태 그대로 표현",
    caption_tip:"동네 이름·거래 지역 언급, 가격 제시, 직거래 장소·시간 안내",
  },
  // ── 동영상 플랫폼 ────────────────────────────────────────────────────────
  youtube_long:    {
    label:"YouTube (롱폼)", icon:"YT", color:"#CC0000", ratio:"16:9", duration:"5-15분",
    size:"1920×1080px (4K 3840×2160 권장)", fps:"24-60fps", maxSize:"256GB",
    tone:"구독자와 대화하는 친근한 말투, 전문성 + 친근함 병행, 시청 유지율 중시",
    style:"상세 리뷰·스토리텔링, 교육·정보, 썸네일·인트로 중요, 챕터 구분",
    policy:"YouTube 수익창출 정책 준수, 광고주 친화 필수, 제휴/협찬 링크가 있으면 업로드 시 YouTube 스튜디오의 '유료 프로모션 포함' 토글을 반드시 켤 것(설명란 문구만으론 법적 고지 요건 불충분)",
    caption_tip:"설명란에 타임스탬프·링크, 해시태그 3개, 자막 파일 업로드",
  },
  naver_tv:        {
    label:"Naver TV", icon:"NT", color:"#03A55A", ratio:"16:9", duration:"1-10분",
    size:"1920×1080px", fps:"24-30fps", maxSize:"4GB",
    tone:"방송형 진행, 신뢰감 있는 경어체, 정보 전달 중심, 친절한 설명",
    style:"방송형·정보 전달, 국내 시청자 최적화, 네이버 검색 연동, 신뢰감",
    policy:"네이버 동영상 정책, 저작권·초상권 준수, 허위정보 금지",
    caption_tip:"네이버 검색 키워드 제목 포함, 챕터 구분, 블로그·카페 연동",
  },
  // ── 커머스 라이브 ────────────────────────────────────────────────────────
  coupang_live:    {
    label:"쿠팡 라이브", icon:"C", color:"#FF5722", ratio:"9:16", duration:"30-60초",
    size:"1080×1920px", fps:"30fps", maxSize:"500MB",
    tone:"쇼호스트 말투, 가격·혜택 즉각 강조, 긴박감·한정 수량 강조",
    style:"가격 강조·구매 유도, 라이브 커머스 감성, 상품 상세 클로즈업",
    policy:"쿠팡 판매자 정책, 허위 가격 표기 금지, 상품 정보 정확성 필수",
    caption_tip:"최저가·할인율 강조, 구매 링크 고정, 리뷰 수·별점 노출",
  },
  naver_shopping:  {
    label:"네이버 쇼핑라이브", icon:"NS", color:"#00B33C", ratio:"9:16", duration:"30-60초",
    size:"1080×1920px", fps:"30fps", maxSize:"500MB",
    tone:"쇼호스트형 친근한 말투, 상품 장점 구체적 수치로 설명, 구매 유도",
    style:"상품 상세·할인 강조, 구매 전환 최적화, 리뷰·사용후기 연계",
    policy:"네이버 쇼핑 판매자 정책, 가격·스펙 정확성 필수, 후기 조작 금지",
    caption_tip:"스마트스토어 링크, 쿠폰 코드 강조, 리뷰 유도 문구",
  },
  kakao_shopping:  {
    label:"카카오 쇼핑라이브", icon:"K", color:"#FFCD00", ratio:"9:16", duration:"30-60초",
    size:"1080×1920px", fps:"30fps", maxSize:"500MB",
    tone:"쇼호스트 친근한 말투, 카카오 특유의 친밀감, 실시간 소통 강조",
    style:"가격·혜택 강조, 카카오톡 공유 유도, 카카오페이 연동 구매",
    policy:"카카오 판매자 정책, 허위·과장 광고 금지, 상품 정보 정확성 필수",
    caption_tip:"카카오톡 선물하기 연계, 카카오페이 할인 강조, 톡캘린더 알림 유도",
  },
  toss_shopping:   {
    label:"토스 쇼핑", icon:"T₩", color:"#0064FF", ratio:"9:16", duration:"30-60초",
    size:"1080×1920px", fps:"30fps", maxSize:"500MB",
    tone:"간결·명확한 혜택 전달, 금액·% 수치 강조, 신뢰감 있는 정보 제공",
    style:"가격·혜택 강조, 구매 전환 최적화, 토스페이 즉시결제 연동",
    policy:"금융광고 심의 기준 준수, 과장·허위 혜택 금지, 필수 고지사항 표기",
    caption_tip:"토스페이 즉시결제 강조, 혜택 수치 강조, 기간 한정 강조",
  },
};

const CATEGORY_LIST = ["패션의류", "패션잡화", "화장품/미용", "디지털/가전", "가구/인테리어", "출산/육아", "식품", "스포츠/레저", "생활/건강", "여가/생활편의"];
const STORY_GENRE_GROUPS = [
  { group: "🏗 건축·공학", items: ["랜드마크 비하인드(에펠탑 등)", "다리·터널 구조 원리", "방공호·요새·군사시설", "도시계획·인프라", "실패한 건축·붕괴 사고"] },
  { group: "🔀 융합·교차지식", items: ["건축 속 수학", "건축 속 미술", "건축 속 과학", "미술 속 미스터리(숨은 코드·위작·도난)", "명언 속 예언(소름 돋게 들어맞은 말들)", "음식 속 화학", "언어 속 역사", "음악 속 수학", "자연 속 물리학(동물의 공학)", "일상 속 경제학", "스포츠 속 물리학(마그누스 효과·역학)", "영화 속 과학 고증", "신화 속 과학적 근거", "색깔의 역사(금보다 비쌌던 안료)", "지도 속 정치(투영법에 숨은 권력)", "게임 속 경제학(확률·화폐 설계)", "광고 속 심리학", "전래동화 속 숨은 역사"] },
  { group: "🔬 과학·기술", items: ["우주·천문", "물리·화학 원리", "생물·자연현상", "신기술·미래과학", "발명·발견 비하인드"] },
  { group: "🧠 심리학", items: ["심리 실험 이야기", "인간관계·행동심리", "성격유형·자기이해", "이상심리·정신질환 실화"] },
  { group: "🎓 인문학", items: ["철학·사상사", "종교·신화", "언어·어원 이야기", "사회학·인류학", "사자성어·고사성어", "명언·격언"] },
  { group: "🔮 명리학·사주·타로", items: ["사주풀이·운세 이야기", "타로카드 해석", "관상·손금", "띠·별자리 운세", "풍수지리"] },
  { group: "📚 문학", items: ["순수문학·감성에세이", "고전 재해석", "시·서정 스토리텔링"] },
  { group: "🎨 예술", items: ["미술·화가 이야기", "음악·공연 비하인드", "영화·연극 비하인드"] },
  { group: "📜 역사", items: ["조선야담·민담", "근현대사 비화", "세계사 미스터리", "역사인물 재조명"] },
  { group: "🌍 지리·문화", items: ["세계 이색문화", "여행지 비하인드", "음식문화의 유래"] },
  { group: "💰 경제·재테크", items: ["실화 창업·사업 스토리", "재테크 지식", "경제사·경제위기"] },
  { group: "💕 로맨스", items: ["운명적 만남", "짝사랑·첫사랑", "국제 로맨스", "이별·재회", "황혼 로맨스"] },
  { group: "🔍 미스터리·스릴러", items: ["추리 수사극", "음모론", "미제사건 실화", "심리 스릴러"] },
  { group: "🪄 판타지·SF", items: ["이세계·환생", "초능력", "미래 디스토피아"] },
  { group: "😂 코미디", items: ["일상 개그", "패러디·풍자", "밈·유행어 콘텐츠"] },
  { group: "💥 액션", items: ["사이다 복수극", "히어로·액션", "무협·사극액션"] },
  { group: "📹 다큐·실화", items: ["실화 바탕 사건사고", "인터뷰·증언", "서프라이즈 실화"] },
  { group: "🌱 인생·자기계발", items: ["인생명언·조언", "시니어 도전기", "자기계발·동기부여"] },
  { group: "👻 공포·오컬트", items: ["귀신·괴담", "도시전설", "심령현상 실화"] },
  { group: "👨‍👩‍👧 가족·휴먼드라마", items: ["막장 사연(고부갈등 등)", "가슴 따뜻한 가족애", "국뽕 드라마"] },
];
const STORY_GENRE_LIST = STORY_GENRE_GROUPS.flatMap(g => g.items);

const IDIOM_SUGGESTIONS = [
  { idiom: "새옹지마(塞翁之馬)", meaning: "인생의 화와 복은 예측할 수 없다" },
  { idiom: "고진감래(苦盡甘來)", meaning: "고생 끝에 낙이 온다" },
  { idiom: "전화위복(轉禍爲福)", meaning: "화가 오히려 복이 되다" },
  { idiom: "우공이산(愚公移山)", meaning: "꾸준히 하면 큰일도 이룬다" },
  { idiom: "대기만성(大器晩成)", meaning: "큰 인물은 늦게 이루어진다" },
  { idiom: "마부작침(磨斧作針)", meaning: "노력하면 안 되는 일이 없다" },
  { idiom: "형설지공(螢雪之功)", meaning: "고생하며 이룬 성공" },
  { idiom: "사필귀정(事必歸正)", meaning: "모든 일은 결국 바르게 돌아간다" },
  { idiom: "인과응보(因果應報)", meaning: "원인에 따라 결과가 따른다" },
  { idiom: "진인사대천명(盡人事待天命)", meaning: "최선을 다한 후 하늘의 뜻을 기다린다" },
  { idiom: "일신우일신(日新又日新)", meaning: "나날이 새롭게 발전한다" },
  { idiom: "권토중래(捲土重來)", meaning: "실패 후 다시 일어나 재도전한다" },
  { idiom: "타산지석(他山之石)", meaning: "남의 하찮은 언행도 나의 수양에 도움이 된다" },
  { idiom: "역지사지(易地思之)", meaning: "상대방의 입장에서 생각해본다" },
  { idiom: "온고지신(溫故知新)", meaning: "옛것을 익혀 새것을 안다" },
  { idiom: "청출어람(靑出於藍)", meaning: "제자가 스승보다 뛰어나다" },
];

const STORAGE_KEY = "pvps_sb_v2";
function loadStorage() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
function saveStorage(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

// ── 생성 기록 (중복 방지용, 메타데이터만 저장) ──────────────────────────────
const HISTORY_KEY = "pvps_gen_history";
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; } }
function saveHistoryList(list) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 200))); } catch {} }

// ── 스토리 숏폼 시리즈 저장소 (장르별로 계속 이어서 만들기용, 메타데이터만) ──
const STORY_SERIES_KEY = "pvps_story_series";
function loadStorySeries() { try { return JSON.parse(localStorage.getItem(STORY_SERIES_KEY)) || []; } catch { return []; } }
function saveStorySeriesList(list) { try { localStorage.setItem(STORY_SERIES_KEY, JSON.stringify(list.slice(0, 500))); } catch {} }

const USED_IDIOMS_KEY = "pvps_used_idioms";
function loadUsedIdioms() { try { return JSON.parse(localStorage.getItem(USED_IDIOMS_KEY)) || []; } catch { return []; } }
function saveUsedIdiomsList(list) { try { localStorage.setItem(USED_IDIOMS_KEY, JSON.stringify(list.slice(0, 500))); } catch {} }

// ── 고수수료 숏폼 카드 서랍 (색인카드 저장소) ────────────────────────────────
const HC_CARDS_KEY = "pvps_hc_cards";
function loadHcCards() { try { return JSON.parse(localStorage.getItem(HC_CARDS_KEY)) || []; } catch { return []; } }
function saveHcCardsList(list) { try { localStorage.setItem(HC_CARDS_KEY, JSON.stringify(list.slice(0, 300))); } catch {} }

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("JSON 파싱 실패");
  return JSON.parse(clean.slice(s, e + 1));
}

async function callGemini(parts, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens: 8192, temperature: 0.8 } }) }
  );
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini 오류 ${res.status}`); }
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
}

async function callClaude(messages, apiKey, model, images = []) {
  const formattedMessages = messages.map((m, i) => {
    if (i === 0 && images.length) {
      return {
        role: m.role,
        content: [
          ...images.map(img => ({ type: "image", source: { type: "base64", media_type: img.mediaType || "image/jpeg", data: img.base64 } })),
          { type: "text", text: m.content },
        ],
      };
    }
    return m;
  });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: 8192, temperature: 0.8, messages: formattedMessages }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Claude API 오류 ${res.status}`); }
  const d = await res.json();
  return d.content?.map(c => c.text || "").join("") || "";
}


// ─── Scene Card ───────────────────────────────────────────────────────────────

function SceneCard({ scene, sceneData, frameworkColor, styleId, onCopy, copiedKey, onRegenerate, isRegenerating, isSelected, onToggle, onStyleChange, index, platCfg }) {
  const [expanded, setExpanded] = useState(true);
  const imgStyle = IMAGE_STYLES.find(s => s.id === styleId);
  const autoCamera = getAutoCamera(scene.id, styleId);

  if (!sceneData) return null;

  return (
    <div style={{ background: isSelected ? "#0d0d1a" : "#0a0a12", border: `2px solid ${isSelected ? frameworkColor + "55" : "#1e1e2e"}`, borderRadius: 16, overflow: "hidden", transition: "all 0.2s", opacity: isSelected ? 1 : 0.45 }}>
      {/* Platform spec bar */}
      {isSelected && platCfg && (
        <div style={{ background: "#070a07", borderBottom: `1px solid ${frameworkColor}18`, padding: "5px 12px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#4a6a4a", fontWeight: 700 }}>{platCfg.icon} {platCfg.label}</span>
          {[
            platCfg.ratio, platCfg.size, platCfg.duration, platCfg.fps, platCfg.maxSize
          ].filter(Boolean).map((v, i) => (
            <span key={i} style={{ fontSize: 9, color: "#3a5a3a", background: "#0a120a", borderRadius: 4, padding: "2px 6px" }}>{v}</span>
          ))}
        </div>
      )}
      {/* Header */}
      <div style={{ background: isSelected ? `${frameworkColor}15` : "#0d0d1a", padding: "11px 14px", display: "flex", alignItems: "center", gap: 9 }}>
        <button onClick={onToggle}
          style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? frameworkColor : "#3a3a5a"}`, background: isSelected ? frameworkColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
          {isSelected && <span style={{ fontSize: 10, color: "#fff", fontWeight: 900 }}>✓</span>}
        </button>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: isSelected ? frameworkColor : "#2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>{scene.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? frameworkColor : "#5a5a7a" }}>{scene.label}</span>
            {/* Per-scene style selector */}
            <select value={styleId} onChange={e => onStyleChange(e.target.value)}
              style={{ background: "#12122a", border: `1px solid ${frameworkColor}40`, borderRadius: 5, padding: "2px 6px", color: "#c8c8e0", fontSize: 10, outline: "none", cursor: "pointer" }}>
              {IMAGE_STYLES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 2 }}>📹 자동: {autoCamera.slice(0, 50)}...</div>
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => onRegenerate(scene.id)} disabled={isRegenerating}
            style={{ background: `${frameworkColor}18`, border: `1px solid ${frameworkColor}35`, borderRadius: 6, padding: "3px 9px", color: isRegenerating ? "#5a5a7a" : frameworkColor, fontSize: 10, cursor: isRegenerating ? "wait" : "pointer" }}>
            {isRegenerating ? "⟳" : "↻"}
          </button>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "3px 9px", color: "#5a5a7a", fontSize: 10, cursor: "pointer" }}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && isSelected && (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Visual */}
          <div>
            <div style={{ fontSize: 10, color: frameworkColor, fontWeight: 700, marginBottom: 5 }}>🎬 장면 묘사</div>
            <p style={{ fontSize: 13, color: "#c8c8e0", lineHeight: 1.7, margin: 0, background: "#12122a", padding: "9px 12px", borderRadius: 8 }}>{sceneData.visual}</p>
          </div>

          {/* Narration */}
          {sceneData.narration && (
            <div>
              <div style={{ fontSize: 10, color: frameworkColor, fontWeight: 700, marginBottom: 5 }}>🎙 나레이션</div>
              <p style={{ fontSize: 12, color: "#a0d4ff", lineHeight: 1.6, margin: 0, background: "#0a0a1a", padding: "9px 12px", borderRadius: 8, fontStyle: "italic" }}>"{sceneData.narration}"</p>
            </div>
          )}

          {/* Text overlay */}
          {sceneData.text_overlay && (
            <div>
              <div style={{ fontSize: 10, color: frameworkColor, fontWeight: 700, marginBottom: 5 }}>📝 화면 텍스트</div>
              <div style={{ background: "#0a0f0a", border: `1px solid ${frameworkColor}30`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#80d480", fontWeight: 700 }}>{sceneData.text_overlay}</div>
            </div>
          )}

          {/* Duration + Auto Camera */}
          <div style={{ display: "flex", gap: 8 }}>
            {sceneData.duration && (
              <div style={{ background: "#12122a", borderRadius: 8, padding: "7px 10px", flex: 1 }}>
                <div style={{ fontSize: 9, color: "#5a5a7a", marginBottom: 2 }}>⏱ 추천 길이</div>
                <div style={{ fontSize: 12, color: "#c8c8e0", fontWeight: 600 }}>{sceneData.duration}</div>
              </div>
            )}
            <div style={{ background: `${frameworkColor}10`, border: `1px solid ${frameworkColor}25`, borderRadius: 8, padding: "7px 10px", flex: 2 }}>
              <div style={{ fontSize: 9, color: frameworkColor, marginBottom: 2, fontWeight: 700 }}>📹 자동 카메라 ({imgStyle?.label})</div>
              <div style={{ fontSize: 11, color: "#a0a0c0" }}>{autoCamera.slice(0, 70)}...</div>
            </div>
          </div>

          {/* Platform policy + tone */}
          {platCfg && (
            <div style={{ background: "#080d08", border: "1px solid #1a2a1a", borderRadius: 9, padding: "9px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                <span style={{ fontSize: 9, background: "#0a1a0a", color: "#4a8a4a", borderRadius: 4, padding: "2px 7px" }}>🛡 정책 자동 준수</span>
                <span style={{ fontSize: 9, background: "#0a0a1a", color: "#4a6a9a", borderRadius: 4, padding: "2px 7px" }}>📐 {platCfg.ratio} · {platCfg.size}</span>
                <span style={{ fontSize: 9, background: "#0a0a1a", color: "#4a6a9a", borderRadius: 4, padding: "2px 7px" }}>⏱ {platCfg.duration}</span>
              </div>
              <div style={{ fontSize: 10, color: "#5a7a5a", lineHeight: 1.6 }}>
                <span style={{ color: "#4a8a4a", fontWeight: 700 }}>💬 말투: </span>{platCfg.tone}
              </div>
              <div style={{ fontSize: 10, color: "#4a5a4a", lineHeight: 1.6 }}>
                <span style={{ color: "#3a6a3a", fontWeight: 700 }}>⚠ 정책: </span>{platCfg.policy}
              </div>
              <div style={{ fontSize: 10, color: "#4a5a4a", lineHeight: 1.6 }}>
                <span style={{ color: "#3a6a3a", fontWeight: 700 }}>✏ 캡션: </span>{platCfg.caption_tip}
              </div>
            </div>
          )}

          {/* Image Prompt */}
          <div>
            <div style={{ fontSize: 10, color: frameworkColor, fontWeight: 700, marginBottom: 5 }}>🖼 이미지 프롬프트</div>
            <div style={{ background: "#060612", border: `1px solid ${frameworkColor}20`, borderRadius: 9, padding: 11, position: "relative" }}>
              <div style={{ position: "absolute", top: 6, right: 7, fontSize: 9, color: frameworkColor, background: `${frameworkColor}20`, borderRadius: 4, padding: "1px 6px" }}>IMAGE</div>
              <p style={{ fontSize: 11, color: "#7090d0", lineHeight: 1.8, margin: 0, fontFamily: "monospace", wordBreak: "break-word", paddingRight: 55 }}>{sceneData.ai_prompt}</p>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <button onClick={() => onCopy(sceneData.ai_prompt, `p-${scene.id}`)}
                style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "4px 10px", color: copiedKey === `p-${scene.id}` ? "#03C75A" : "#9090b0", fontSize: 11, cursor: "pointer" }}>
                {copiedKey === `p-${scene.id}` ? "✓ 복사됨" : "프롬프트 복사"}
              </button>
              {sceneData.negative_prompt && (
                <button onClick={() => onCopy(sceneData.negative_prompt, `n-${scene.id}`)}
                  style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "4px 10px", color: copiedKey === `n-${scene.id}` ? "#03C75A" : "#906060", fontSize: 11, cursor: "pointer" }}>
                  {copiedKey === `n-${scene.id}` ? "✓" : "🚫 네거티브"}
                </button>
              )}
            </div>
          </div>

          {/* Video Prompts — 3 platforms */}
          {[
            { key: "video_prompt_hailuo", label: "🌊 MiniMax Hailuo 2.3 Fast (768p)", color: "#06b6d4" },
            { key: "video_prompt_kling", label: "🎥 Kling 2.5 (720p)", color: "#f59e0b" },
            { key: "video_prompt_veo", label: "🔊 Google Veo 3 (최대 4K, 오디오 포함)", color: "#8b5cf6" },
          ].map(v => sceneData[v.key] && (
            <div key={v.key}>
              <div style={{ fontSize: 10, color: v.color, fontWeight: 700, marginBottom: 5 }}>{v.label}</div>
              <div style={{ background: "#060612", border: `1px solid ${v.color}20`, borderRadius: 9, padding: 11 }}>
                <p style={{ fontSize: 11, color: "#c0a8e0", lineHeight: 1.8, margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>{sceneData[v.key]}</p>
              </div>
              <button onClick={() => onCopy(sceneData[v.key], `${v.key}-${scene.id}`)}
                style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "4px 10px", color: copiedKey === `${v.key}-${scene.id}` ? "#03C75A" : "#9090b0", fontSize: 11, cursor: "pointer", marginTop: 7 }}>
                {copiedKey === `${v.key}-${scene.id}` ? "✓ 복사됨" : "프롬프트 복사"}
              </button>
            </div>
          ))}

          {/* Negative */}
          {sceneData.negative_prompt && (
            <div style={{ background: "#0f0608", border: "1px solid #3a1a1a", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, color: "#906060", fontWeight: 700, marginBottom: 4 }}>🚫 NEGATIVE PROMPT</div>
              <p style={{ fontSize: 11, color: "#906060", lineHeight: 1.6, margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>{sceneData.negative_prompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sample Data for Preview ──────────────────────────────────────────────────

const SAMPLE_PRODUCT_PREVIEW = {
  name: "다이슨 에어랩 멀티스타일러", category: "헤어 스타일링 기기", price: "699,000원",
  usp: "열 없이 완벽한 스타일링 — 머릿결을 보호하며 살롱급 연출",
  target: "20-40대 여성 직장인 · 뷰티 관심층", mood: "프리미엄·감성적",
  keywords: ["코안다효과", "열없는스타일링", "다이슨", "헤어케어"],
};

const SAMPLE_STORYBOARD_PREVIEW = {
  you:    { visual: "이른 아침, 거울 앞에 앉은 30대 직장 여성. 바쁜 일상 속 단정한 헤어스타일을 원하지만 매일 아침 스타일링에 20분을 쏟는다. 자연광이 스며드는 아늑한 드레싱룸, 화장대 위 여러 헤어 도구들이 어지럽게 놓여 있다.", narration: "오늘도 바쁜 아침", text_overlay: "매일 반복되는 스타일링", duration: "3-4초", ai_prompt: "Cinematic film photography, wide establishing shot with slow dolly push-in toward a stylish woman sitting at a vanity mirror in a sunlit bedroom, morning golden hour light streaming through sheer curtains, multiple hair tools scattered on the dresser, warm color grading, shallow depth of field, anamorphic lens, advertiser-friendly, fully clothed, dignified, brand-safe content, 8K quality", negative_prompt: "avoid: violence, nudity, revealing clothing, misleading imagery, low quality, watermark" },
  need:   { visual: "머리카락에 헤어드라이어를 가까이 댄 순간 — 지나친 열기에 눈살을 찌푸리는 표정. 클로즈업으로 손상된 머리카락 끝 갈라짐이 보인다. 답답함과 걱정이 얼굴에 드러난다.", narration: "열 손상이 걱정돼", text_overlay: "매일 쌓이는 열 손상", duration: "3-4초", ai_prompt: "Cinematic intimate handheld close-up, woman looking concerned while using a regular hair dryer, slight frown expressing worry about heat damage, split ends visible, tension in expression, warm desaturated tones suggesting frustration, shallow depth of field, advertiser-friendly professional portrait, dignified subject, brand-safe", negative_prompt: "avoid: violence, sexual content, disturbing imagery, low quality, watermark" },
  go:     { visual: "우아한 패키지에서 다이슨 에어랩을 처음 꺼내는 순간 — 빛이 제품 표면에서 반사된다. 새로운 가능성의 문이 열리는 느낌. 제품의 첨단 기술감이 물씬 풍긴다.", narration: "새로운 선택의 순간", text_overlay: "다이슨 에어랩 첫 만남", duration: "3-5초", ai_prompt: "Cinematic dramatic dolly through threshold, Dyson Airwrap being unboxed from premium packaging, first reveal shot, copper and nickel product design catching warm studio light, camera moving forward, elegant product photography, shallow depth of field, advertiser-friendly, clean and premium atmosphere, brand-safe commercial quality", negative_prompt: "avoid: violence, sexual content, misleading product claims, low quality, watermark" },
  find:   { visual: "에어랩의 코안다 효과로 머리카락이 자연스럽게 배럴에 감기는 마법 같은 순간. 슬로우모션으로 머리카락이 열 없이 완벽한 웨이브를 만들어낸다. 빛이 쏟아지고 표정은 놀라움과 기쁨으로 가득 찬다.", narration: "이게 코안다 효과구나!", text_overlay: "열 없이 완벽한 컬", duration: "4-6초", ai_prompt: "Cinematic slow reveal dolly with golden discovery lighting, extreme slow motion of hair naturally wrapping around Dyson Airwrap barrel using Coanda effect, no heat visible, silky hair strands catching warm studio light, woman's face expressing genuine amazement and joy, magical hair transformation, brand-safe, advertiser-friendly, dignified subject fully clothed", negative_prompt: "avoid: violence, sexual content, misleading claims, low quality, watermark" },
  change: { visual: "회사 복도를 걸어가는 여성 — 완벽하게 스타일링된 머리카락이 자연스럽게 흔들린다. 카메라가 크레인으로 위로 솟아오르며 자신감 넘치는 걸음걸이를 담는다. 동료들의 감탄 어린 시선.", narration: "자신감이 달라졌어", text_overlay: "머릿결 보호 + 완벽 스타일", duration: "5-6초", ai_prompt: "Cinematic soaring crane shot rising upward, confident professional woman walking through modern office corridor, perfectly styled healthy hair flowing naturally, colleagues admiring glances, camera rises to reveal full transformed life scene, warm motivational lighting, professional wardrobe, brand-safe, advertiser-friendly, empowering and dignified portrayal, commercial lifestyle photography", negative_prompt: "avoid: violence, sexual content, unrealistic beauty standards, misleading product claims, low quality, watermark" },
};

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ onClose }) {
  const [pvStyle, setPvStyle] = useState("cinematic");
  const [pvFw, setPvFw] = useState("harmon_circle");
  const [expandedScene, setExpandedScene] = useState("find");
  const [copiedKey, setCopiedKey] = useState(null);

  const fw = STORY_FRAMEWORKS[pvFw];
  const previewScenes = ["you", "need", "go", "find", "change"];
  const styleObj = IMAGE_STYLES.find(s => s.id === pvStyle) || IMAGE_STYLES[0];
  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 16px" }}>
      <div style={{ background: "#0a0a12", border: "1px solid #2a2a3e", borderRadius: 20, width: "100%", maxWidth: 900, marginBottom: 20 }}>

        {/* Modal Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "#0a0a12", zIndex: 10, borderRadius: "20px 20px 0 0" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>샘플 미리보기</div>
            <div style={{ fontSize: 10, color: "#5a5a7a" }}>다이슨 에어랩 · 하몬써클 · 실제 생성 결과 예시</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 6, padding: "3px 9px", fontSize: 10, color: "#4a8a4a" }}>🛡 정책 준수</div>
            <div style={{ background: "#1a0a2a", border: "1px solid #3a1a5a", borderRadius: 6, padding: "3px 9px", fontSize: 10, color: "#a080ff" }}>✨ SAMPLE</div>
            <button onClick={onClose} style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, padding: "5px 12px", color: "#9090b0", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✕ 닫기</button>
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Controls Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {/* Framework picker */}
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>프레임워크</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {Object.entries(STORY_FRAMEWORKS).map(([key, f]) => (
                  <button key={key} onClick={() => setPvFw(key)}
                    style={{ background: pvFw === key ? `${f.color}15` : "#12122a", border: `1px solid ${pvFw === key ? f.color : "#2a2a3e"}`, borderRadius: 7, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", textAlign: "left" }}>
                    <span style={{ fontSize: 14 }}>{f.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: pvFw === key ? f.color : "#7070a0" }}>{f.label}</div>
                      <div style={{ fontSize: 9, color: "#4a4a6a" }}>{f.scenes.length}씬 · {f.author}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style picker */}
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                이미지 스타일 → 카메라 자동 변경
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {IMAGE_STYLES.map(s => (
                  <button key={s.id} onClick={() => setPvStyle(s.id)}
                    style={{ background: pvStyle === s.id ? "#1e1030" : "#12122a", border: `1px solid ${pvStyle === s.id ? "#7c3aed" : "#2a2a3e"}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 11, color: pvStyle === s.id ? "#c4a8ff" : "#7070a0", fontWeight: pvStyle === s.id ? 700 : 400 }}>{s.emoji} {s.label}</div>
                    <div style={{ fontSize: 9, color: "#3a3a5a", marginTop: 1 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Info bar */}
          <div style={{ background: "#0d0d1a", border: `1px solid ${fw.color}40`, borderRadius: 11, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 24 }}>💇‍♀️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{SAMPLE_PRODUCT_PREVIEW.name}</div>
              <div style={{ fontSize: 11, color: "#a0d4ff" }}>{SAMPLE_PRODUCT_PREVIEW.price}</div>
            </div>
            <div style={{ flex: 1, fontSize: 11, color: "#a0c8ff", background: "#0a0a1a", borderRadius: 7, padding: "5px 10px" }}>💡 {SAMPLE_PRODUCT_PREVIEW.usp}</div>
            <div style={{ display: "flex", gap: 5 }}>
              <span style={{ fontSize: 9, background: `${fw.color}18`, color: fw.color, borderRadius: 4, padding: "2px 7px", fontWeight: 700 }}>{fw.icon} {fw.label}</span>
              <span style={{ fontSize: 9, background: "#1e1030", color: "#a080ff", borderRadius: 4, padding: "2px 7px" }}>{styleObj.emoji} {styleObj.label}</span>
            </div>
          </div>

          {/* Note: only harmon scenes have sample data */}
          {pvFw !== "harmon_circle" && (
            <div style={{ background: "#0a0a1a", border: `1px solid ${fw.color}30`, borderRadius: 11, padding: "14px 16px", marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{fw.icon}</div>
              <div style={{ fontSize: 12, color: fw.color, fontWeight: 700, marginBottom: 6 }}>{fw.label} — 씬 구조</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
                {fw.scenes.map(sc => (
                  <div key={sc.id} style={{ background: `${fw.color}12`, border: `1px solid ${fw.color}30`, borderRadius: 9, padding: "7px 11px", textAlign: "center", minWidth: 70 }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{sc.emoji}</div>
                    <div style={{ fontSize: 10, color: fw.color, fontWeight: 700 }}>{sc.label}</div>
                    <div style={{ fontSize: 8, color: "#4a4a6a", marginTop: 1 }}>{sc.desc}</div>
                    <div style={{ marginTop: 5, fontSize: 8, color: "#3a5a7a", lineHeight: 1.4 }}>{getAutoCamera(sc.id, pvStyle).slice(0, 30)}...</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#4a4a6a" }}>실제 앱에서 상품을 입력하면 위 {fw.scenes.length}개 씬이 자동 생성됩니다</div>
            </div>
          )}

          {/* Harmon circle full sample */}
          {pvFw === "harmon_circle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {previewScenes.map((scId, idx) => {
                const sc = STORY_FRAMEWORKS.harmon_circle.scenes.find(s => s.id === scId);
                const data = SAMPLE_STORYBOARD_PREVIEW[scId];
                const camera = getAutoCamera(scId, pvStyle);
                const isOpen = expandedScene === scId;
                if (!sc || !data) return null;
                return (
                  <div key={scId} style={{ background: "#0d0d1a", border: `1px solid ${fw.color}35`, borderRadius: 14, overflow: "hidden" }}>
                    {/* Scene header — clickable */}
                    <div onClick={() => setExpandedScene(isOpen ? null : scId)}
                      style={{ background: isOpen ? `${fw.color}12` : "#0d0d1a", padding: "10px 14px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer", userSelect: "none" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: isOpen ? fw.color : "#2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0, transition: "background 0.2s" }}>{idx + 1}</div>
                      <span style={{ fontSize: 16 }}>{sc.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isOpen ? fw.color : "#8080a0" }}>{sc.label}</div>
                        <div style={{ fontSize: 9, color: "#4a5a6a", marginTop: 1 }}>📹 {camera.slice(0, 55)}...</div>
                      </div>
                      <span style={{ fontSize: 11, color: "#4a4a6a" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>

                    {isOpen && (
                      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
                        {/* Visual */}
                        <div>
                          <div style={{ fontSize: 10, color: fw.color, fontWeight: 700, marginBottom: 5 }}>🎬 장면 묘사</div>
                          <p style={{ fontSize: 13, color: "#c8c8e0", lineHeight: 1.75, margin: 0, background: "#12122a", padding: "9px 12px", borderRadius: 8 }}>{data.visual}</p>
                        </div>

                        {/* Narration / Text / Duration */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: fw.color, fontWeight: 700, marginBottom: 4 }}>🎙 나레이션</div>
                            <div style={{ background: "#0a0a1a", border: `1px solid ${fw.color}20`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#a0d4ff", fontStyle: "italic" }}>"{data.narration}"</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: fw.color, fontWeight: 700, marginBottom: 4 }}>📝 화면 텍스트</div>
                            <div style={{ background: "#0a0f0a", border: `1px solid ${fw.color}25`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#80d480", fontWeight: 700 }}>{data.text_overlay}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: fw.color, fontWeight: 700, marginBottom: 4 }}>⏱ 길이</div>
                            <div style={{ background: "#12122a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#c8c8e0" }}>{data.duration}</div>
                          </div>
                        </div>

                        {/* Auto Camera */}
                        <div style={{ background: `${fw.color}0e`, border: `1px solid ${fw.color}20`, borderRadius: 8, padding: "8px 11px" }}>
                          <div style={{ fontSize: 9, color: fw.color, fontWeight: 700, marginBottom: 3 }}>📹 자동 카메라 ({styleObj.emoji} {styleObj.label} 스타일)</div>
                          <div style={{ fontSize: 11, color: "#7090a0", lineHeight: 1.5 }}>{camera}</div>
                        </div>

                        {/* Policy */}
                        <div style={{ background: "#0a150a", border: "1px solid #1a3020", borderRadius: 7, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 11 }}>🛡</span>
                          <span style={{ fontSize: 10, color: "#4a8a4a" }}>YouTube 정책 · 광고주 친화 · 이미지 정책 자동 준수</span>
                        </div>

                        {/* AI Prompt */}
                        <div>
                          <div style={{ fontSize: 10, color: fw.color, fontWeight: 700, marginBottom: 5 }}>🤖 AI 영상 프롬프트</div>
                          <div style={{ background: "#060612", border: `1px solid ${fw.color}18`, borderRadius: 9, padding: 11, marginBottom: 7, position: "relative" }}>
                            <div style={{ position: "absolute", top: 6, right: 8, fontSize: 9, color: fw.color, background: `${fw.color}20`, borderRadius: 4, padding: "1px 6px" }}>EN</div>
                            <p style={{ fontSize: 11, color: "#6888c0", lineHeight: 1.85, margin: 0, fontFamily: "monospace", wordBreak: "break-word", paddingRight: 40 }}>{data.ai_prompt}</p>
                          </div>
                          <button onClick={() => copy(data.ai_prompt, `pv-${scId}`)}
                            style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "4px 12px", color: copiedKey === `pv-${scId}` ? "#03C75A" : "#9090b0", fontSize: 11, cursor: "pointer" }}>
                            {copiedKey === `pv-${scId}` ? "✓ 복사됨" : "프롬프트 복사"}
                          </button>
                        </div>

                        {/* Negative */}
                        <div style={{ background: "#0e0608", border: "1px solid #2a1520", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 9, color: "#804040", fontWeight: 700, marginBottom: 4 }}>🚫 NEGATIVE</div>
                          <p style={{ fontSize: 11, color: "#805060", lineHeight: 1.6, margin: 0, fontFamily: "monospace" }}>{data.negative_prompt}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ fontSize: 10, color: "#3a3a5a", textAlign: "center", padding: "8px 0" }}>
                하몬써클 5개 샘플 씬 표시 (실제 앱: 8씬 전체 생성)
              </div>
            </div>
          )}

          {/* Close button */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <button onClick={onClose}
              style={{ background: "linear-gradient(135deg,#7c3aed,#4285F4)", border: "none", borderRadius: 11, padding: "11px 36px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ✓ 확인했어요 — 생성하러 가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function App() {
  const stored = loadStorage();

  // API keys
  const [geminiKey, setGeminiKey] = useState(stored.geminiKey || "");
  const [claudeKey, setClaudeKey] = useState(stored.claudeKey || "");
  const [tavilyKey, setTavilyKey] = useState(stored.tavilyKey || "");
  const [pexelsKey, setPexelsKey] = useState(stored.pexelsKey || "");
  const [naverOpenId, setNaverOpenId] = useState(stored.naverOpenId || "");
  const [naverOpenSecret, setNaverOpenSecret] = useState(stored.naverOpenSecret || "");
  const [naverClientId, setNaverClientId] = useState(stored.naverClientId || "");
  const [naverClientSecret, setNaverClientSecret] = useState(stored.naverClientSecret || "");
  const [coupangAccessKey, setCoupangAccessKey] = useState(stored.coupangAccessKey || "");
  const [coupangSecretKey, setCoupangSecretKey] = useState(stored.coupangSecretKey || "");
  const [affiliateLink, setAffiliateLink] = useState(stored.affiliateLink || "");
  const [engine, setEngine] = useState("claude");
  const [claudeModel, setClaudeModel] = useState("claude-haiku-4-5-20251001");
  const [showKeys, setShowKeys] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testMode, setTestMode] = useState(false);
  // ── 단계별 흐름 ──────────────────────────────────────────────────────────
  const [appStep, setAppStep] = useState(1); // 1: 상품탐색 2: 스토리보드생성
  // ── 1단계: 상품 탐색 ─────────────────────────────────────────────────────
  const [discoverPlatform, setDiscoverPlatform] = useState("coupang");
  const [discoverCategory, setDiscoverCategory] = useState("");
  const [discoverResults, setDiscoverResults] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverStep, setDiscoverStep] = useState("");
  const [naverTrend, setNaverTrend] = useState(null); // [{period, ratio}] — 검색어트렌드 보조 인사이트
  const [shortsTrend, setShortsTrend] = useState(null); // [{title,url,content,image}] — 유튜브/틱톡 벤치마크
  const [shortsTrendLoading, setShortsTrendLoading] = useState(false);
  const [trendTopics, setTrendTopics] = useState(null); // AI가 벤치마크 보고 추천한 제목/소재
  const [trendTopicsLoading, setTrendTopicsLoading] = useState(false);

  // 유튜브 쇼츠·틱톡 — 지금 뜨는 숏폼 벤치마크 (공식 API 없이 Tavily 웹검색으로 참고용 링크 수집) → AI가 보고 소재 추천까지
  const fetchShortsTrend = async () => {
    if (!tavilyKey) { setError("Tavily API 키가 필요합니다. 설정에서 입력해주세요."); return; }
    const kw = seriesMode ? storyGenre : (discoverCategory.trim() || "숏폼");
    const query = seriesMode ? `${kw} 장르 숏폼 드라마 요즘 인기 시리즈 유튜브 쇼츠 틱톡` : `${kw} 유튜브 쇼츠 틱톡 요즘 인기 트렌드 바이럴`;
    setShortsTrendLoading(true);
    setTrendTopics(null);
    let results = [];
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
        body: JSON.stringify({
          query,
          max_results: 8,
          search_depth: "advanced",
          include_images: true,
        }),
      });
      if (!res.ok) throw new Error(`Tavily 검색 오류 ${res.status}`);
      const data = await res.json();
      results = (data.results || []).map(r => {
        const first = (r.images || [])[0];
        return { title: r.title, url: r.url, content: (r.content || "").slice(0, 140), image: first ? (typeof first === "string" ? first : first.url) : "" };
      });
      setShortsTrend(results);
    } catch (e) {
      setError(e.message);
      setShortsTrendLoading(false);
      return;
    }
    setShortsTrendLoading(false);

    // 벤치마크 결과를 AI가 보고 실제 쓸 수 있는 제목/소재로 추천
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey || !results.length) return;
    setTrendTopicsLoading(true);
    try {
      const listText = results.map((r, i) => `${i + 1}. ${r.title} — ${r.content}`).join("\n");
      const raw = await callAI(
        `아래는 "${kw}" 관련 지금 뜨는 유튜브 쇼츠·틱톡 벤치마크 검색 결과다. 이 트렌드를 참고해서(그대로 베끼지 말고) ${seriesMode ? `장르 [${storyGenre}]` : "이 소재"}에 맞는 새로운 제목/소재 3개를 추천해줘. JSON 배열로만 응답. 마크다운 없이.

벤치마크 결과:
${listText}

[{"title":"추천 제목/소재 한 줄","reason":"이 트렌드의 어떤 점을 반영했는지 한 문장"}, ...] 3개`,
        []
      );
      const parsed = parseJSON(`{"list":${raw.replace(/```json|```/g, "").trim()}}`);
      const list = Array.isArray(parsed.list) ? parsed.list : [];
      setTrendTopics(list);
    } catch {
      // 추천 실패해도 벤치마크 링크는 이미 보여줬으니 조용히 무시
    } finally {
      setTrendTopicsLoading(false);
    }
  };

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testLoading, setTestLoading] = useState(false);

  // Input
  const [productUrl, setProductUrl] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [genHistory, setGenHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const addHistoryEntry = (entry) => {
    setGenHistory(prev => {
      const next = [{ id: Date.now(), date: new Date().toISOString(), ...entry }, ...prev];
      saveHistoryList(next);
      return next;
    });
  };
  const removeHistoryEntry = (id) => {
    setGenHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      saveHistoryList(next);
      return next;
    });
  };
  const findHistoryDuplicate = (source) => {
    const s = (source || "").trim().toLowerCase();
    if (!s) return null;
    return genHistory.find(h => h.source && (h.source.toLowerCase() === s || h.source.toLowerCase().includes(s) || s.includes(h.source.toLowerCase())));
  };

  // ── 스토리 숏폼: 장르별로 계속 이어서 만드는 시리즈 저장소 ──
  const [storyGenre, setStoryGenre] = useState(STORY_GENRE_LIST[0]);
  const [storyTopic, setStoryTopic] = useState("");
  const [idiomPool, setIdiomPool] = useState(IDIOM_SUGGESTIONS);
  const [usedIdioms, setUsedIdioms] = useState(loadUsedIdioms);
  const [idiomLoading, setIdiomLoading] = useState(false);
  const visibleIdioms = idiomPool.filter(it => !usedIdioms.includes(it.idiom));

  const pickIdiom = (it) => {
    setStoryTopic(`${it.idiom} — ${it.meaning}`);
    setUsedIdioms(prev => {
      const next = [...prev, it.idiom];
      saveUsedIdiomsList(next);
      return next;
    });
  };

  const fetchMoreIdioms = async () => {
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey) { setError("AI API 키를 설정해주세요."); return; }
    setIdiomLoading(true);
    try {
      const raw = await callAI(
        `한국인에게 익숙한 사자성어·고사성어 10개를 새로 추천해줘. 아래 목록과 절대 겹치지 않게: ${[...idiomPool.map(i => i.idiom), ...usedIdioms].join(", ")}

중요: idiom 필드는 반드시 "한글 독음(한자)" 형식으로만 작성할 것 — 한자만 단독으로 쓰지 말 것. 예시: "새옹지마(塞翁之馬)", "고진감래(苦盡甘來)"

JSON 배열로만 응답. 마크다운 없이.
[{"idiom":"한글독음(漢字)","meaning":"뜻 한 줄, 한국어"}, ...] 형식으로 10개`,
        []
      );
      const parsed = parseJSON(`{"list":${raw.replace(/```json|```/g, "").trim()}}`);
      const list = Array.isArray(parsed.list) ? parsed.list : [];
      if (list.length) setIdiomPool(list);
      else setError("새 사자성어를 못 받아왔어요. 다시 시도해주세요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setIdiomLoading(false);
    }
  };
  const [storySeries, setStorySeries] = useState(loadStorySeries);
  const genreEpisodes = storySeries.filter(e => e.genre === storyGenre).sort((a, b) => a.epNumber - b.epNumber);
  const nextEpNumber = genreEpisodes.length ? genreEpisodes[genreEpisodes.length - 1].epNumber + 1 : 1;
  const [currentEpNumber, setCurrentEpNumber] = useState(null);
  const addStoryEpisode = (entry) => {
    setStorySeries(prev => {
      const next = [{ id: Date.now(), date: new Date().toISOString(), ...entry }, ...prev];
      saveStorySeriesList(next);
      return next;
    });
  };
  const removeStoryEpisode = (id) => {
    setStorySeries(prev => {
      const next = prev.filter(e => e.id !== id);
      saveStorySeriesList(next);
      return next;
    });
  };

  const MAX_IMAGES = 5;
  const [images, setImages] = useState([]); // [{ previewUrl, base64, mediaType }]
  const fileRef = useRef();

  // Config
  const [framework, setFramework] = useState("harmon_circle");
  const [platform, setPlatform] = useState("youtube_shorts");
  const [globalStyle, setGlobalStyle] = useState("cinematic");
  const [sceneStyles, setSceneStyles] = useState({});
  const [brandTone, setBrandTone] = useState("");

  // Output
  const [productInfo, setProductInfo] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null); // {title, description, hashtags} — 선택 플랫폼에 맞는 업로드 메타데이터
  const [storyboard, setStoryboard] = useState(null);
  const [selectedScenes, setSelectedScenes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [loadingPct, setLoadingPct] = useState(0);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [regenScene, setRegenScene] = useState(null);
  const [seriesMode, setSeriesMode] = useState(false);

  // ── 고수수료 숏폼 (카드 카탈로그) — 완전히 별도 화면, 다른 모드와 상태/렌더 트리 공유 없음 ──
  const [hcMode, setHcMode] = useState(false);
  const [hcProductName, setHcProductName] = useState("");
  const [hcLoading, setHcLoading] = useState(false);
  const [hcLoadingStep, setHcLoadingStep] = useState("");
  const [hcError, setHcError] = useState("");
  const [hcResult, setHcResult] = useState(null);
  const [hcCards, setHcCards] = useState(loadHcCards);
  const [hcShowDrawer, setHcShowDrawer] = useState(false);
  const [hcCategory, setHcCategory] = useState("product"); // "product" | "travel"

  const fw = STORY_FRAMEWORKS[framework];
  const platCfg = PLATFORM_CONFIGS[platform];
  const activeScenes = selectedScenes || fw.scenes.map(s => s.id);

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); };
  const toggleScene = (id) => {
    const cur = selectedScenes || fw.scenes.map(s => s.id);
    if (cur.includes(id) && cur.length > 1) setSelectedScenes(cur.filter(x => x !== id));
    else if (!cur.includes(id)) setSelectedScenes([...cur, id].sort((a, b) => fw.scenes.findIndex(s => s.id === a) - fw.scenes.findIndex(s => s.id === b)));
  };

  const processFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
    setImages(prev => {
      const room = MAX_IMAGES - prev.length;
      const entries = incoming.slice(0, room).map(file => ({
        file, previewUrl: URL.createObjectURL(file), base64: null, mediaType: file.type || "image/jpeg",
      }));
      entries.forEach(entry => {
        const r = new FileReader();
        r.onload = e => {
          const base64 = e.target.result.split(",")[1];
          setImages(cur => cur.map(im => im.previewUrl === entry.previewUrl ? { ...im, base64 } : im));
        };
        r.readAsDataURL(entry.file);
      });
      return [...prev, ...entries.map(({ file, ...rest }) => rest)];
    });
  }, []);
  const removeImage = idx => setImages(prev => prev.filter((_, i) => i !== idx));

  const saveKeys = () => { saveStorage({ ...loadStorage(), geminiKey, claudeKey, tavilyKey, pexelsKey, naverClientId, naverClientSecret, naverOpenId, naverOpenSecret, coupangAccessKey, coupangSecretKey, affiliateLink }); setShowKeys(false); };

  // refImages: [{ base64, mediaType }] — 여러 장의 실제 상품 사진을 AI에게 함께 전달
  const callAI = useCallback(async (textPrompt, refImages = []) => {
    const imgs = refImages.filter(im => im?.base64);
    if (engine === "gemini") {
      const parts = imgs.map(im => ({ inline_data: { mime_type: im.mediaType || "image/jpeg", data: im.base64 } }));
      parts.push({ text: textPrompt });
      return callGemini(parts, geminiKey);
    }
    return callClaude([{ role: "user", content: textPrompt }], claudeKey, claudeModel, imgs);
  }, [engine, geminiKey, claudeKey, claudeModel]);

  // ── AI 자동 선택: 프레임워크 / 브랜드 톤 (스토리마다 다양하게) ──────────────
  const [frameworkAutoLoading, setFrameworkAutoLoading] = useState(false);
  const [brandToneAutoLoading, setBrandToneAutoLoading] = useState(false);

  const autoPickFramework = async () => {
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey) { setError("AI API 키를 설정해주세요."); return; }
    const topic = seriesMode ? (storyTopic || storyGenre) : (productDesc || productUrl);
    if (!topic) { setError("소재·주제 또는 상품 정보를 먼저 입력해주세요."); return; }
    setFrameworkAutoLoading(true);
    try {
      const recentFrameworks = [...storySeries, ...genHistory].slice(0, 5).map(e => e.frameworkKey).filter(Boolean);
      const options = Object.entries(STORY_FRAMEWORKS).map(([key, f]) => `${key}: ${f.label} (${f.desc}) - ${f.scenes.length}씬`).join("\n");
      const raw = await callAI(
        `아래 소재에 가장 잘 어울리는 스토리 프레임워크를 하나 골라줘. JSON으로만 응답. 마크다운 없이.
소재: ${topic}
${recentFrameworks.length ? `최근에 쓴 프레임워크(가능하면 겹치지 않게 다양하게 선택): ${recentFrameworks.join(", ")}` : ""}

선택지:
${options}

{"framework":"위 key 중 하나","reason":"선택 이유 한 문장"}`,
        []
      );
      const parsed = parseJSON(raw);
      if (STORY_FRAMEWORKS[parsed.framework]) {
        setFramework(parsed.framework);
        setSelectedScenes(null);
      } else {
        setError("프레임워크 자동 선택에 실패했어요. 다시 시도해주세요.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setFrameworkAutoLoading(false);
    }
  };

  const autoPickBrandTone = async () => {
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey) { setError("AI API 키를 설정해주세요."); return; }
    setBrandToneAutoLoading(true);
    try {
      const topic = seriesMode ? (storyTopic || storyGenre) : (productDesc || productUrl || "");
      const recentTones = [...storySeries, ...genHistory].slice(0, 5).map(e => e.brandTone).filter(Boolean);
      const raw = await callAI(
        `아래 소재에 어울리는 브랜드 톤(말투·분위기)을 한국어 짧은 문구로 하나 새로 만들어줘. JSON으로만 응답. 마크다운 없이.
소재: ${topic || "일반적인 숏폼 콘텐츠"}
${recentTones.length ? `최근에 쓴 톤(겹치지 않게 다르게 만들 것): ${recentTones.join(" / ")}` : ""}
{"brand_tone":"예시 형식(그대로 복사하지 말고 새로 만들 것): 고급스럽고 감성적인 / 친근하고 유머러스한 / 담담하고 신뢰감 있는 — 10~20자"}`,
        []
      );
      const parsed = parseJSON(raw);
      if (parsed.brand_tone) setBrandTone(parsed.brand_tone);
    } catch (e) {
      setError(e.message);
    } finally {
      setBrandToneAutoLoading(false);
    }
  };

  // ── Build scene prompt (카메라 자동, 정책 자동 삽입) ──────────────────────
  const buildScenePrompt = useCallback((info, sceneId, sceneCfg, styleId, episodeInfo) => {
    const style = IMAGE_STYLES.find(s => s.id === styleId) || IMAGE_STYLES[0];
    const autoCamera = getAutoCamera(sceneId, styleId);
    // 사진이 아닌 회화·벡터·그래픽 스타일 — "카메라·렌즈" 같은 사진 용어를 넣으면 실사로 나와버리는 원인이 됨
    // 수채화는 이제 반실사(카메라 심도·조명 느낌 포함) 스타일이라 사진 용어 금지 대상에서 제외
    const isIllustrative = ["anime", "illustration", "pop_art", "joseon"].includes(styleId);
    const styleNeg = (style.negative || "avoid: low quality, blurry, watermark, misleading content")
      + (isIllustrative ? ", photograph, photography, photorealistic, realistic photo, DSLR, camera lens, depth of field, film grain, live-action" : "");
    const seriesNote = episodeInfo
      ? `\n스토리 숏폼 시리즈: 장르 [${episodeInfo.genre}], 이번 화는 ${episodeInfo.epNumber}화 (계속 이어지는 시리즈).${episodeInfo.isLastScene ? " 이 씬은 반드시 궁금증·긴장감을 남기고 끝나야 함(클리프행어) — narration과 visual 모두에 다음 화로 이어지는 여운/떡밥을 암시하는 내용을 포함할 것." : ""}${episodeInfo.prevSummary ? `\n이전 화까지의 줄거리(연속성 유지, 겹치는 전개 금지): ${episodeInfo.prevSummary}` : ""}
유튜브 정책 추가 준수(절대 규칙, 예외 없음): 이 소재가 자극적이거나 민감한 내용(범죄·공포·비극·갈등·괴담·도난·사고·재난 등)을 다룰 경우, 단순 자극·선정성에 그치지 않고 반드시 교훈·성찰·경각심·따뜻한 메시지 중 하나를 이야기에 녹여낼 것. 실제 사건·인물·장소를 다룰 때는 사실을 왜곡하거나 조롱하지 말고 존중하는 태도를 유지할 것. 폭력·유혈·성적 묘사는 절대 금지이며, 위 [CONTENT POLICY] 규칙에 조금이라도 어긋날 소지가 있으면 자극적인 디테일을 빼고 안전한 방향으로 순화해서 표현할 것 — 정책 위반 가능성이 있다면 흥미보다 안전을 우선한다.\n`
      : "";

    return `${POLICY_RULES}
${episodeInfo ? "콘텐츠 정보" : "상품 정보"}:
${JSON.stringify(info, null, 2)}

스토리 프레임워크: ${fw.label} (${fw.desc})
현재 씬: [${sceneCfg.label}] ${sceneCfg.emoji} — ${sceneCfg.desc}
${seriesNote}플랫폼: ${platCfg.label}
- 영상 규격: ${platCfg.ratio} / ${platCfg.size} / ${platCfg.fps} / 최대 ${platCfg.maxSize}
- 권장 길이: ${platCfg.duration}
- 말투·톤: ${platCfg.tone}
- 콘텐츠 스타일: ${platCfg.style}
- 정책 준수: ${platCfg.policy}
- 캡션 팁: ${platCfg.caption_tip}

이미지 스타일: ${style.label}
스타일 프롬프트 (반드시 전부 반영): ${style.prompt}
카메라 무브 (자동 결정됨): ${autoCamera}
${brandTone ? `브랜드 톤: ${brandTone}` : ""}
${info.visual_details ? `\n실제 상품 사진에서 관찰된 특징 (반드시 모든 프롬프트에 구체적으로 반영, 참고 이미지가 첨부되어 있다면 그 실물 외형을 그대로 묘사할 것): ${info.visual_details}\n` : ""}

위 콘텐츠 정책과 스타일·카메라를 완벽히 반영하여, 이 씬의 프롬프트들을 JSON으로만 응답. 마크다운 없이 순수 JSON.
프롬프트가 길어져도 괜찮으니 최대한 상세하고 정확하게 작성할 것 — 짧게 요약하지 말 것.

이미지 프롬프트(ai_prompt)와 영상 생성 플랫폼 3곳(MiniMax Hailuo 2.3 Fast 768p / Kling 2.5 720p / Google Veo 3)용 프롬프트를 각각 따로 작성한다. 각 플랫폼은 강점이 달라서 같은 문장을 반복하지 말고 아래 특성에 맞게 최적화할 것:
- ai_prompt (정지 이미지용): ${isIllustrative
    ? `이 스타일(${style.label})은 사진이 아니라 회화·벡터·그래픽 아트다. 절대로 "camera", "lens", "depth of field", "photography", "photorealistic", "DSLR" 같은 사진 용어를 쓰지 말 것 — 대신 구도·레이아웃, 선의 굵기와 질감, 색면 배치, 명암 대비, 배경/환경 디테일, 정확한 상품/피사체 형태를 극도로 상세하게 묘사할 것. 프롬프트 맨 앞에 "${style.label} style illustration/artwork, NOT a photograph, NOT photorealistic"을 명시할 것.`
    : `조명(key/fill/rim, 방향, 색온도), 전체 색감, 표면 질감·재질, 카메라 프레이밍·렌즈 특성, 배경/환경 디테일, 정확한 상품/피사체 배치를 극도로 상세하게.`} 200단어 이상 영문.
- video_prompt_hailuo (MiniMax Hailuo 2.3 Fast용): 명확한 인과관계의 동작 체인(원인→시각적 결과)을 문장으로 순서대로 서술. 물·천·머리카락·파티클·충격·움직임의 관성 변화가 있다면 그 물리적 변화를 명시적으로 묘사. 과도하게 복잡한 동시다발적 동작은 피하고 하나의 명확한 동작 흐름에 집중. 150단어 내외 영문.
- video_prompt_kling (Kling 2.5용): 정밀한 카메라 무브먼트 태그(예: dolly in, orbit left, crane up 등)와 구도·프레이밍을 명확히 지정. 장면 전체에서 피사체의 외형(색상·형태)이 일관되게 유지되도록 고정 디스크립터를 반복 명시. 시네마틱 톤·롱테이크 느낌 강조. 150단어 내외 영문.
- video_prompt_veo (Google Veo 3용): Veo는 오디오를 함께 생성하므로, 시각 묘사에 더해 배경음·환경음·대사/나레이션 사운드를 함께 지시할 것(예: "sound of: ..."). 저작권 안전장치: 실제 존재하는 노래 제목·가사·아티스트명·브랜드 시그니처 징글을 절대 지목하지 말 것 — 배경음악이 필요하면 "upbeat acoustic guitar instrumental", "soft lo-fi piano" 처럼 장르·악기·분위기만 묘사할 것. 대사·나레이션이 들어갈 경우 반드시 실제 발화될 문장을 한국어 그대로 큰따옴표로 인용해서 넣을 것 (예: dialogue: "이건 안 될 것 같아" — 영어로 번역하거나 의역하지 말 것). 최고 수준의 실사 사실감(photorealism) 표현에 집중. 150단어 내외 영문(단, 인용된 대사 문장 자체는 한국어 그대로).

IMPORTANT — 4개 프롬프트 전부 공통 규칙:
1. Include the exact camera movement direction implied by: "${autoCamera}"
2. COPY AND INTEGRATE these style elements — do NOT just gesture at the style with one adjective: "${style.prompt}"${isIllustrative ? ` — the ai_prompt text MUST actually contain several of these exact technique keywords verbatim (not paraphrased into generic terms), so the specific medium/technique is unmistakable and never slides into photorealism.` : ""}
3. If real product photos were provided, ground every visual detail (color, shape, material, logo/packaging) in what those photos actually show — never invent a different-looking product
4. Be 100% YouTube/advertiser-policy compliant, brand-safe — this is an absolute rule with NO exceptions, for ai_prompt/video_prompt_hailuo/video_prompt_kling/video_prompt_veo all equally. If any depicted action, imagery, or dialogue could even remotely risk violating the [CONTENT POLICY] above (violence, gore, weapons used aggressively, sexual/suggestive content, hate symbols, dangerous activities, disturbing/shocking imagery, real identifiable people, copyrighted characters/logos), do NOT include it — replace it with a safer equivalent that still serves the story. When in doubt, prioritize safety over dramatic impact.
5. The style should be unmistakably recognizable in the final output
6. 모든 이미지·영상(ai_prompt, video_prompt_hailuo, video_prompt_kling, video_prompt_veo 전부)의 배경·장소·간판·소품·인물은 명확히 "한국"으로 설정할 것 — 한글 간판/표지판, 한국식 거리·건물·인테리어, 한국인 등장인물을 명시적으로 묘사에 포함할 것 (소재상 명백히 해외/특정 국가가 배경이어야 하는 경우 제외). 화면에 텍스트/간판이 보이면 그 텍스트는 한글로 명시할 것. 등장인물의 대사·음성이 나오는 경우 전부 한국어로 할 것 — 영어 대사 금지.
7. ai_prompt, video_prompt_hailuo, video_prompt_kling, video_prompt_veo 4개 전부 맨 끝에 이 플랫폼의 영상 규격을 반드시 명시할 것 — 정확히 이 형식으로 프롬프트 문장 끝에 추가: "Aspect ratio ${platCfg.ratio} (${platCfg.ratio === "9:16" ? "vertical/portrait" : platCfg.ratio === "16:9" ? "horizontal/landscape" : "square"}), resolution ${platCfg.size}." 플랫폼마다 세로(9:16)·가로(16:9) 등 비율이 다르므로 절대 임의로 다른 비율을 쓰지 말 것.
8. 위 1~7번 규칙(정책·한국 배경·화면비 등)을 지키느라 내용을 뭉뚱그리거나 배경을 비워버리면 절대 안 됨. visual/narration/ai_prompt/video_prompt_hailuo/video_prompt_kling/video_prompt_veo 전부 이 씬 [${sceneCfg.label}]과 아래 콘텐츠/상품 정보에만 해당하는 매우 구체적이고 생생한 디테일로 채울 것 — 배경 장소(어디인지 정확히), 주변 소품·사물, 인물의 구체적 동작·표정, 시간대·날씨·분위기를 전부 명시. "사무실에서 컴퓨터 앞에 앉아 일한다", "책상에서 서류를 본다" 같은 막연하고 아무 데나 갖다 붙일 수 있는 뻔한 스톡사진식 장면은 절대 금지 — 이 소재가 아니면 나올 수 없는 고유한 장면이어야 한다. 배경이 텅 비어 보이거나 정보가 빈약한 것보다, 구체적인 디테일이 과할 정도로 많은 게 낫다.
9. 스타일을 아무리 강하게 입혀도 상품/핵심 피사체 자체는 절대 사라지거나 추상적으로 뭉개지면 안 됨 — 상품의 실제 형태·비율·색상·로고·패키지가 매 프롬프트(ai_prompt 포함 4개 전부)에서 명확히 알아볼 수 있게 유지되도록 구체적으로 묘사할 것. 스타일(질감·색감·화풍)은 상품을 감싸는 표현 방식일 뿐, 상품 자체를 가리거나 왜곡해서는 안 된다.

{
  "visual": "한국어 장면 묘사 4-6문장 (구체적 행동·감정·분위기·${style.label} 스타일 특징 명시, 실제 사진이 있다면 그 외형을 반영)",
  "narration": "나레이션/대사 10-20자 (임팩트)",
  "text_overlay": "화면 텍스트 5-15자",
  "duration": "추천 길이 예: 3-5초",
  "ai_prompt": "[정지 이미지 생성용, 200단어 이상 영문, 매우 상세하게]",
  "video_prompt_hailuo": "[MiniMax Hailuo 2.3 Fast용 영문 프롬프트, 인과관계 동작 체인 중심]",
  "video_prompt_kling": "[Kling 2.5용 영문 프롬프트, 카메라무브 태그 + 구도 일관성 중심]",
  "video_prompt_veo": "[Google Veo 3용 영문 프롬프트, 오디오/사운드 지시 포함]",
  "negative_prompt": "${styleNeg}, violence, gore, sexual content, nudity, hate symbols, dangerous activities, misleading imagery, copyrighted characters, watermark, low quality"
}`;
  }, [fw, platCfg, brandTone]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey) { setError("API 키를 먼저 입력해주세요."); return; }
    if (!seriesMode && !productUrl && !productDesc && !images.length) { setError("상품 URL, 설명, 또는 이미지를 입력하세요."); return; }

    setError(""); setLoading(true); setLoadingPct(5);
    setStoryboard(null); setProductInfo(null); setVideoMetadata(null);

    const prevSummary = seriesMode && genreEpisodes.length
      ? genreEpisodes.slice(-3).map(e => `${e.epNumber}화: ${e.productName}${e.summary ? " - " + e.summary : ""}`).join(" / ")
      : "";
    // 장르·모드 구분 없이 지금까지 만든 모든 글과 겹치지 않도록 — 제목만 모아서 전달
    const allPastTitles = [
      ...storySeries.map(e => e.productName),
      ...genHistory.map(h => h.productName),
    ].filter(Boolean).slice(0, 60);
    const noOverlapNote = allPastTitles.length
      ? `\n지금까지 만든 모든 글 제목 목록(절대 겹치지 않게, 비슷한 소재·전개도 피할 것): ${allPastTitles.join(", ")}\n`
      : "";

    try {
      let info;
      if (seriesMode) {
        // 주제 구상 — 상품이 아니라 장르 기반 스토리 소재 (상품 숏폼과 완전히 분리된 흐름)
        setLoadingStep("📝 주제 구상 중...");
        setLoadingPct(10);
        const rawInfo = await callAI(
          `장르 [${storyGenre}]에 맞는 스토리 숏폼 시리즈의 ${nextEpNumber}화 소재를 기획해서 JSON으로만 응답. 마크다운 없이.
${storyTopic ? `사용자가 지정한 소재(최대한 반영): ${storyTopic}` : "소재는 이 장르에서 흥미롭고 훅이 강한 걸로 자유롭게 선정."}
${storyTopic ? `\n만약 위 소재가 명언·격언·사자성어·고사성어라면: 그 문구/성어가 전하는 교훈을 보여주는 구체적인 인물·상황 스토리로 각색할 것. 그 문구 자체를 오프닝 내레이션이나 마지막 장면 내레이션으로 활용하고, 스토리 말미에 그 교훈이 명확히 드러나도록 마무리할 것.\n` : ""}
${prevSummary ? `이전 화까지의 줄거리(절대 겹치지 않게 자연스럽게 이어갈 것): ${prevSummary}` : ""}${noOverlapNote}
{"name":"이번 화 제목/소재 한 줄","category":"${storyGenre}","price":"","usp":"핵심 후킹 포인트 1문장 (명언/사자성어라면 그 문구 자체 또는 핵심 교훈)","target":"타겟 시청자층","mood":"분위기","keywords":["k1","k2","k3"],"visual_details":""}`,
          images
        );
        info = parseJSON(rawInfo);
      } else {
        // 상품 분석
        setLoadingStep("🔍 상품 분석 중...");
        setLoadingPct(10);
        let context = productDesc || "";
        if (productUrl) {
          if (tavilyKey) {
            try {
              const res = await fetch("https://api.tavily.com/extract", {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
                body: JSON.stringify({ urls: [productUrl], include_images: true }),
              });
              if (res.ok) { const d = await res.json(); context += "\n" + (d.results?.[0]?.raw_content || "").slice(0, 4000); }
            } catch {}
          } else { context += `\nURL: ${productUrl}`; }
        }

        const rawInfo = await callAI(
          `상품 정보 JSON으로만 응답. 마크다운 없이.\n${context}${images.length ? `\n[실제 상품 사진 ${images.length}장 첨부 — 색상·형태·재질·패키지 등 실물 특징을 정확히 반영]` : ""}${noOverlapNote}\n{"name":"상품명","category":"카테고리","price":"가격","usp":"핵심가치 1문장(이전과 겹치지 않는 새로운 각도로)","target":"타겟층","mood":"분위기","keywords":["k1","k2","k3"],"visual_details":"사진에서 관찰되는 색상·형태·재질·질감 등 실제 외형 특징 3-4문장 (사진이 없으면 빈 문자열)"}`,
          images
        );
        info = parseJSON(rawInfo);
      }
      setProductInfo(info);

      // 씬별 생성 — 업로드한 실제 상품 사진을 씬 프롬프트 생성에도 함께 전달
      const scenes = fw.scenes;
      const thisEpNumber = seriesMode ? nextEpNumber : null;
      setCurrentEpNumber(thisEpNumber);
      const result = {};
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        const styleId = sceneStyles[sc.id] || globalStyle;
        const episodeInfo = seriesMode
          ? { genre: storyGenre, epNumber: thisEpNumber, isLastScene: i === scenes.length - 1, prevSummary }
          : null;
        setLoadingStep(`${seriesMode ? `[${storyGenre} ${thisEpNumber}화] ` : ""}${sc.emoji} ${sc.label} 씬 생성 중... (${i + 1}/${scenes.length})`);
        setLoadingPct(15 + Math.round((i / scenes.length) * 80));
        try {
          const raw = await callAI(buildScenePrompt(info, sc.id, sc, styleId, episodeInfo), images);
          result[sc.id] = parseJSON(raw);
        } catch (e) {
          result[sc.id] = { visual: "생성 실패: " + e.message, ai_prompt: "", narration: "", text_overlay: "", duration: "3-5초", negative_prompt: "" };
        }
      }

      setStoryboard(result);
      setSelectedScenes(scenes.map(s => s.id));

      // 선택 플랫폼에 맞는 업로드 메타데이터(제목·설명·해시태그) 생성
      setLoadingStep("🏷 태그·설명 생성 중...");
      setLoadingPct(95);
      try {
        const allNarrations = scenes.map(sc => result[sc.id]?.narration).filter(Boolean).join(" / ");
        const metaRaw = await callAI(
          `아래 ${seriesMode ? "스토리" : "상품"} 정보와 씬별 나레이션을 참고해서, "${platCfg.label}" 플랫폼에 업로드할 제목·설명·해시태그를 만들어줘. JSON으로만 응답. 마크다운 없이.

정보: ${JSON.stringify(info)}
전체 나레이션 흐름: ${allNarrations}

플랫폼 특성:
- 말투·톤: ${platCfg.tone}
- 콘텐츠 스타일: ${platCfg.style}
- 정책: ${platCfg.policy}
- 캡션 팁: ${platCfg.caption_tip}
- 권장 길이: ${platCfg.duration}

법적·저작권 안전장치 (절대 규칙):
1. 제목·설명·해시태그 어디에도 타 브랜드의 등록상표·로고명·유명인 실명을 무단으로 언급하거나 마치 그들이 보증·협찬한 것처럼 암시하지 말 것. 저작권 있는 노래 제목·가사·캐릭터 이름을 그대로 인용하지 말 것.
2. 효능·효과를 확정적으로 단정하는 과장 표현(완치, 100% 효과, 최고, 무조건, 즉시 효과 등 근거 없는 최상급·의학적 단정 표현) 금지 — 표시광고법·건강기능식품법상 과장광고 소지가 있는 문구는 "~에 도움을 줄 수 있어요" 같은 완곡한 표현으로 대체할 것.
3. 타 브랜드명을 검색 유입 목적으로 자사 콘텐츠에 끼워 넣는 키워드 낚시(예: "OO 대신 이거") 금지.
4. 해시태그 개수·형식은 위 "캡션 팁"에 명시된 플랫폼 자체 제한을 절대 넘기지 말 것 (예: Instagram은 최대 5개, Threads는 해시태그 기능 자체가 없으므로 hashtags를 빈 배열로 반환).${affiliateLink ? `
5. 이 콘텐츠는 제휴/구매 링크가 포함된 광고성 콘텐츠다 — 공정거래위원회 "추천·보증 등에 관한 표시·광고 심사지침"에 따라 경제적 이해관계(제휴 수수료)가 있음을 명확히 밝혀야 한다. description 맨 앞이나 끝에 "*이 영상은 제휴 마케팅 활동의 일환으로, 파트너스 활동을 통해 일정액의 수수료를 제공받을 수 있습니다." 문구를 반드시 포함할 것. 해시태그를 지원하는 플랫폼이면 hashtags 배열에 "#광고"도 포함할 것 (단, 위 4번 규칙의 개수 제한 안에서).${(platform === "youtube_shorts" || platform === "youtube_long") ? ` YouTube는 title 맨 앞에 "[광고] " 접두어를 붙일 것, 그리고 description 끝에 "⚠ 업로드 시 YouTube 스튜디오 설정에서 '유료 프로모션 포함'을 반드시 켜주세요 — 설명란 문구만으로는 법적 고지 요건이 충족되지 않습니다." 문구를 추가로 넣을 것.` : ""}` : ""}

{"title":"영상 제목 (플랫폼 톤에 맞게, 후킹 있게, 30자 내외)","description":"업로드 설명문 (플랫폼 캡션 팁 반영, 100-200자)","hashtags":["#태그1","#태그2","..."]}`,
          []
        );
        setVideoMetadata(parseJSON(metaRaw));
      } catch {
        // 메타데이터 생성 실패해도 스토리보드 자체는 이미 완성됐으니 조용히 무시
      }
      setLoadingPct(100);
      addHistoryEntry({
        source: productUrl || productDesc,
        productName: info.name || "",
        framework: fw.label,
        frameworkKey: framework,
        brandTone,
        platform: platCfg.label,
        seriesMode,
      });
      if (seriesMode) {
        addStoryEpisode({
          genre: storyGenre,
          epNumber: thisEpNumber,
          productName: info.name || "",
          summary: info.usp || "",
          framework: fw.label,
          frameworkKey: framework,
          brandTone,
          platform: platCfg.label,
        });
      }

    } catch (e) { setError(e.message); }
    finally { setLoading(false); setLoadingStep(""); setTimeout(() => setLoadingPct(0), 800); }
  };

  // ── Regen single ──────────────────────────────────────────────────────────
  const handleRegenerate = async (sceneId) => {
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!productInfo || !apiKey) return;
    setRegenScene(sceneId);
    try {
      const scenes = fw.scenes;
      const i = scenes.findIndex(s => s.id === sceneId);
      const sc = scenes[i];
      const styleId = sceneStyles[sceneId] || globalStyle;
      const episodeInfo = seriesMode
        ? { genre: storyGenre, epNumber: currentEpNumber, isLastScene: i === scenes.length - 1, prevSummary: "" }
        : null;
      const raw = await callAI(buildScenePrompt(productInfo, sceneId, sc, styleId, episodeInfo), images);
      setStoryboard(prev => ({ ...prev, [sceneId]: parseJSON(raw) }));
    } catch (e) { setError("재생성 실패: " + e.message); }
    finally { setRegenScene(null); }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAll = () => {
    if (!storyboard || !productInfo) return;
    let out = `# 스토리보드 — ${productInfo.name}\n프레임워크: ${fw.label} | 플랫폼: ${platCfg.label} | ${new Date().toLocaleString("ko-KR")}\n\n`;
    if (affiliateLink) out += `🔗 **구매 링크:** ${affiliateLink}\n\n`;
    if (videoMetadata) {
      out += `## 🏷 업로드 메타데이터 (${platCfg.label})\n**제목:** ${videoMetadata.title}\n\n**설명:**\n${videoMetadata.description}\n\n**해시태그:** ${(videoMetadata.hashtags || []).join(" ")}\n\n---\n\n`;
    }
    fw.scenes.filter(s => activeScenes.includes(s.id)).forEach((sc, i) => {
      const d = storyboard[sc.id]; if (!d) return;
      const styleId = sceneStyles[sc.id] || globalStyle;
      const style = IMAGE_STYLES.find(s => s.id === styleId);
      out += `## Scene ${i + 1}: ${sc.emoji} ${sc.label}\n> ${sc.desc}\n\n`;
      out += `**스타일:** ${style?.emoji} ${style?.label}\n`;
      out += `**카메라:** ${getAutoCamera(sc.id, styleId)}\n\n`;
      out += `**장면 묘사:** ${d.visual}\n\n`;
      if (d.narration) out += `**나레이션:** "${d.narration}"\n\n`;
      if (d.text_overlay) out += `**화면 텍스트:** ${d.text_overlay}\n\n`;
      out += `**이미지 프롬프트:**\n\`\`\`\n${d.ai_prompt}\n\`\`\`\n\n`;
      if (d.video_prompt_hailuo) out += `**영상 프롬프트 — MiniMax Hailuo 2.3 Fast:**\n\`\`\`\n${d.video_prompt_hailuo}\n\`\`\`\n\n`;
      if (d.video_prompt_kling) out += `**영상 프롬프트 — Kling 2.5:**\n\`\`\`\n${d.video_prompt_kling}\n\`\`\`\n\n`;
      if (d.video_prompt_veo) out += `**영상 프롬프트 — Google Veo 3:**\n\`\`\`\n${d.video_prompt_veo}\n\`\`\`\n\n`;
      if (d.negative_prompt) out += `**네거티브:** ${d.negative_prompt}\n\n`;
      out += `---\n\n`;
    });
    if (affiliateLink) out += `## 🔗 구매하러 가기\n${affiliateLink}\n`;
    const blob = new Blob([out], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `storyboard-${Date.now()}.md`; a.click();
  };

  // script-voice-editor(대본·목소리·영상 편집기)가 다루는 대본/세그먼트/타이밍 구조에 맞춘 내보내기.
  // 그 앱은 라벨/duration 문자열을 모르므로, "3-5초" 같은 범위 표기는 평균값(초 단위 숫자)으로 환산해
  // 누적 start/end를 계산한다. 이미지·영상 프롬프트는 그 앱이 아직 안 쓰지만 참고용으로 세그먼트마다 같이 담는다.
  const parseDurationSeconds = (str) => {
    const nums = String(str || "").match(/[\d.]+/g)?.map(Number) || [];
    if (!nums.length) return 4;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };

  const exportToEditor = () => {
    if (!storyboard) return;
    let cursor = 0;
    const segments = fw.scenes.filter(s => activeScenes.includes(s.id)).map((sc, i) => {
      const d = storyboard[sc.id]; if (!d) return null;
      const dur = parseDurationSeconds(d.duration);
      const seg = {
        index: i,
        sceneId: sc.id,
        sceneLabel: sc.label,
        text: d.narration || "",
        textOverlay: d.text_overlay || "",
        start: Number(cursor.toFixed(2)),
        end: Number((cursor + dur).toFixed(2)),
        duration: Number(dur.toFixed(2)),
        visual: d.visual || "",
        aiPrompt: d.ai_prompt || "",
        videoPromptHailuo: d.video_prompt_hailuo || "",
        videoPromptKling: d.video_prompt_kling || "",
        videoPromptVeo: d.video_prompt_veo || "",
        negativePrompt: d.negative_prompt || "",
      };
      cursor += dur;
      return seg;
    }).filter(Boolean);

    const scriptText = segments.map(s => s.text).filter(Boolean).join("\n");

    const payload = {
      exportedFrom: "storyboard-studio",
      exportedAt: new Date().toISOString(),
      meta: {
        framework: fw.label,
        platform: platCfg.label,
        title: productInfo?.name || "",
        totalScenes: segments.length,
        estimatedTotalDuration: Number(cursor.toFixed(2)),
      },
      script: scriptText,
      segments,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `storyboard-editor-export-${Date.now()}.json`; a.click();
  };

  const activeKey = engine === "gemini" ? geminiKey : claudeKey;
  const canGenerate = !loading && !!activeKey && (seriesMode || !!productUrl || !!productDesc || !!images.length);

  // ── 1단계: 상품 탐색 ─────────────────────────────────────────────────────
  const DISCOVER_PLATFORMS = [
    { id: "coupang",  label: "쿠팡",       color: "#FF5722", query: "site:coupang.com",       domain: "coupang.com" },
    { id: "naver",    label: "네이버쇼핑",  color: "#03C75A", query: "site:smartstore.naver.com", domain: "smartstore.naver.com" },
    { id: "kakao",    label: "카카오쇼핑",  color: "#FFCD00", query: "site:store.kakao.com",   domain: "store.kakao.com" },
    { id: "toss",     label: "토스쇼핑",   color: "#0064FF", query: "site:toss.im 쇼핑",       domain: "toss.im" },
  ];
  const canDiscover = !!tavilyKey
    || (discoverPlatform === "coupang" && !!coupangAccessKey && !!coupangSecretKey);

  // 네이버 API HUB 검색어트렌드 — 실패해도 메인 탐색 흐름을 막지 않는 보조 인사이트
  const fetchNaverTrend = async (keyword) => {
    if (!naverClientId || !naverClientSecret) return null;
    try {
      const res = await fetch("/api/naver-trend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ncp-Apigw-Api-Key-Id": naverClientId,
          "X-Ncp-Apigw-Api-Key": naverClientSecret,
        },
        body: JSON.stringify({ keyword }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.series?.length ? data.series : null;
    } catch {
      return null;
    }
  };

  const HC_CATEGORY_CONFIG = {
    product: {
      label: "상품",
      subjectLabel: "제품",
      placeholder: "예: 삼성 비스포크 AI 스팀 로봇청소기",
      searchSuffix: "가격 스펙 최저가 할인",
      commissionAssumption: "고단가 가전·IT 제품 제휴 커미션 통상 3~9% 수준",
      sourceNote: "실제 제조사(삼성/LG 등) 공식 배포 영상·렌더링 컷을 소스로 쓴다는 전제이므로, 장면 묘사도 그런 공식 홍보영상 톤(깨끗한 스튜디오 배경, 제품 클로즈업, 제조사 브랜드 룩)으로 작성 — 특정 개인 유튜버 영상을 모사하라고 지시하지 말 것.",
    },
    travel: {
      label: "여행",
      subjectLabel: "여행 상품(투어·액티비티·티켓·숙소 등)",
      placeholder: "예: 다낭 바나힐 투어 / 제주 왕복 항공권 특가",
      searchSuffix: "가격 후기 예약 최저가 마이리얼트립",
      commissionAssumption: "마이리얼트립 기준 투어·액티비티·입장권 제휴 커미션 통상 5~10% 수준 (숙소는 3~8%, 항공권 단독 예약은 수수료가 매우 낮거나 정액제인 경우가 많음)",
      sourceNote: "제휴 플랫폼은 마이리얼트립을 기본으로 전제하고, 실제 관광청·투어 운영사·항공사가 공식 배포한 이미지·프로모션 영상을 소스로 쓴다는 전제로 장면을 묘사할 것 — 특정 개인 유튜버·인플루언서 영상을 모사하라고 지시하지 말 것.",
    },
  };

  // ── 고수수료 숏폼: 실시간 검색 근거 기반 4씬 대본 + SEO + 예상 수수료 ──────
  const fetchHcCard = async () => {
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey) { setHcError("API 키를 먼저 입력해주세요."); return; }
    if (!hcProductName.trim()) { setHcError(hcCategory === "travel" ? "여행지·숙소·항공권 이름을 입력해주세요." : "제품명을 입력해주세요."); return; }
    if (!tavilyKey) { setHcError("실시간 가격·정보 확인을 위해 Tavily API 키가 필요합니다."); return; }

    const cfg = HC_CATEGORY_CONFIG[hcCategory];
    setHcLoading(true); setHcError(""); setHcResult(null);
    try {
      setHcLoadingStep(`🔍 실시간 ${cfg.label} 정보·이미지 검색 중...`);
      const searchRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
        body: JSON.stringify({
          query: `${hcProductName} ${cfg.searchSuffix}`,
          max_results: 6,
          search_depth: "advanced",
          include_images: true,
        }),
      });
      if (!searchRes.ok) throw new Error(`Tavily 검색 오류 ${searchRes.status}`);
      const searchData = await searchRes.json();
      const results = searchData.results || [];
      if (!results.length) throw new Error("검색 결과가 없습니다. 이름을 더 정확히 입력해보세요.");
      const searchContext = results.map((r, i) => `${i + 1}. ${r.title}\n${(r.content || "").slice(0, 300)}\n출처: ${r.url}`).join("\n\n");

      setHcLoadingStep("🤖 대본·SEO·수수료 분석 중...");
      const prompt = `${POLICY_RULES}

너는 "검색 기반 구매전환형 쇼핑 숏폼" 전문 카피라이터다. 아래 실시간 검색 결과만 근거로, ${cfg.subjectLabel} "${hcProductName}"의 숏폼 광고 대본과 메타데이터를 만들어라.

실시간 검색 결과 (이 안에 없는 가격·정보는 절대 지어내지 말 것 — 확실하지 않으면 "정보 부족"이라고 표기):
${searchContext}

절대 규칙:
1. 검색 결과에 없는 가격·할인율·스펙·수치를 지어내지 말 것. 검색 결과끼리 가격이 다르면 범위로("~대") 표기.
2. 효능·효과를 단정하는 과장 표현(완치·100%·최고·무조건 등) 금지 — 검색 결과에 있는 사실 기반 장점만 서술.
3. 실제 브랜드/제품명·상호는 검색 결과에 나온 그대로 정확히 쓰되, 타 브랜드 비방이나 무단 보증 암시 금지.
4. 이 대본은 제휴 링크를 통한 구매 유도 콘텐츠다 — 공정거래위원회 표시광고법에 따라 video_metadata_description에 "*이 영상은 제휴 마케팅 활동의 일환으로, 파트너스 활동을 통해 일정액의 수수료를 제공받을 수 있습니다." 문구를 반드시 포함할 것.
5. ${cfg.sourceNote}
6. estimated_commission은 검색된 가격대와 "${cfg.commissionAssumption}" 가정을 근거로 한 대략적 추정치임을 명확히 하고, commission_note에 "실제 수수료율은 가입한 제휴 프로그램 정책을 반드시 확인하세요"라고 명시할 것.
${hcCategory === "travel" ? `7. CTA 씬 나레이션에는 "마이리얼트립"을 자연스럽게 언급할 것 (예: "마이리얼트립에서 예약하기" 같은 톤) — 실제 대사에 억지로 끼워 넣지 말고 구어체로 자연스럽게.` : ""}

대본은 정확히 4씬 구조를 따를 것: 가격후킹 → 공감 → 특장점 → CTA. 각 씬은 실제 숏폼에서 소리 내어 읽는 나레이션 문장(구어체, 자연스러운 한국어)으로 작성.

이미지 검색에 쓸 stock_image_keyword도 함께 만들 것: 영어 2~4단어, Pexels 같은 스톡사진 사이트에서 이 소재를 가장 잘 표현할 수 있는 일반적인 검색어 (특정 브랜드명 없이, 예: "robot vacuum cleaner home" 또는 "danang beach resort").

JSON으로만 응답. 마크다운 없이.
{
  "product_name": "정확한 이름(검색결과 기준)",
  "price_info": "검색결과 기반 가격 요약 (정보 부족하면 명시)",
  "scenes": [
    { "stage": "가격후킹", "duration": "0~5초", "narration": "..." },
    { "stage": "공감", "duration": "5~15초", "narration": "..." },
    { "stage": "특장점", "duration": "15~40초", "narration": "..." },
    { "stage": "CTA", "duration": "40~50초", "narration": "..." }
  ],
  "seo_title": "정확한 이름 + 핵심 숫자/이유가 들어간 영상 제목 (검색 노출 최적화, 30자 내외)",
  "thumbnail_hook": "썸네일에 넣을 5~10자 후킹 문구",
  "search_keywords": ["키워드1","키워드2","키워드3","키워드4"],
  "estimated_commission": "예: 9만~18만원",
  "commission_note": "수수료 추정 근거 및 실제 확인 필요 안내",
  "video_metadata_description": "제휴 고지 문구를 포함한 영상 설명문 2~3문장",
  "sources": ["실제 참고한 출처 URL 1~2개"],
  "stock_image_keyword": "영어 2~4단어 스톡사진 검색어"
}`;

      const raw = await callAI(prompt, []);
      const parsed = parseJSON(raw);

      // 저작권 걱정 없는 진짜 무료 스톡 이미지 (Pexels 라이선스 — 별도 표기 없이 상업적 사용 가능)
      let stockImages = [];
      if (pexelsKey && parsed.stock_image_keyword) {
        setHcLoadingStep("🖼 무료 스톡 이미지 검색 중...");
        try {
          const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(parsed.stock_image_keyword)}&per_page=4`, {
            headers: { Authorization: pexelsKey },
          });
          if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json();
            stockImages = (pexelsData.photos || []).map(p => p.src?.medium).filter(Boolean);
          }
        } catch { /* 스톡 이미지 실패해도 카드 생성 자체는 계속 진행 */ }
      }

      // 검색 결과 이미지 (네이버 이미지 검색 + Tavily) — 실제 저작권 확인 필요, "무료"가 아님
      let searchImages = [...(searchData.images || []).filter(Boolean)];
      if (naverOpenId && naverOpenSecret) {
        try {
          const naverRes = await fetch(`/api/naver-image-search?q=${encodeURIComponent(hcProductName)}`, {
            headers: { "X-Naver-Client-Id": naverOpenId, "X-Naver-Client-Secret": naverOpenSecret },
          });
          if (naverRes.ok) {
            const naverData = await naverRes.json();
            searchImages = [...searchImages, ...(naverData.items || []).map(it => it.link)];
          }
        } catch { /* 실패해도 계속 진행 */ }
      }
      searchImages = searchImages.slice(0, 4);

      const card = { ...parsed, id: Date.now(), createdAt: new Date().toISOString(), category: hcCategory, stockImages, searchImages };
      setHcResult(card);
      const updated = [card, ...hcCards];
      setHcCards(updated);
      saveHcCardsList(updated);
    } catch (e) {
      setHcError(e.message);
    } finally {
      setHcLoading(false);
      setHcLoadingStep("");
    }
  };

  const handleDiscover = async () => {
    if (!discoverCategory.trim()) { setError("카테고리나 키워드를 입력해주세요."); return; }
    const apiKey = engine === "gemini" ? geminiKey : claudeKey;
    if (!apiKey) { setError("AI API 키를 설정해주세요."); return; }

    const plat = DISCOVER_PLATFORMS.find(p => p.id === discoverPlatform);
    const useCoupangApi = plat.id === "coupang" && coupangAccessKey && coupangSecretKey;
    if (!useCoupangApi && !tavilyKey) { setError("Tavily API 키가 필요합니다. 설정에서 입력해주세요."); return; }

    setDiscoverLoading(true); setDiscoverResults([]); setNaverTrend(null); setError("");
    fetchNaverTrend(discoverCategory).then(setNaverTrend);

    try {
      // Step 1: 상품 검색 — 쿠팡은 키가 있으면 공식 API, 그 외엔 Tavily 웹검색
      // (네이버쇼핑 공식 검색 API는 2026-07-31 폐지되어 더 이상 존재하지 않음 — 네이버도 Tavily 경로로 검색)
      let items = []; // { title, url, image, content, priceText }

      if (useCoupangApi) {
        setDiscoverStep(`🔍 쿠팡파트너스 공식 API로 검색 중...`);
        const res = await fetch(`/api/coupang-search?q=${encodeURIComponent(discoverCategory)}`, {
          headers: { "X-Coupang-Access-Key": coupangAccessKey, "X-Coupang-Secret-Key": coupangSecretKey },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `쿠팡 API 오류 ${res.status}`);
        items = (data.items || []).map(it => ({
          title: it.title, url: it.url, image: it.image,
          content: `가격: ${it.price ? Number(it.price).toLocaleString() + "원" : "-"} · 로켓배송: ${it.isRocket ? "예" : "아니오"} · 카테고리: ${it.category || "-"}${it.rank ? ` · 쿠팡 검색 인기순위: ${it.rank}위` : ""}`,
          priceText: it.price ? `${Number(it.price).toLocaleString()}원` : "",
        }));
        // HTTP는 200이지만 쿠팡 응답 바디 안에서 실패를 알리는 경우 — rMessage를 그대로 보여줘야 원인 파악 가능
        if (!items.length && data.rCode && data.rCode !== "0") {
          throw new Error(`쿠팡 API 응답: ${data.rMessage || "알 수 없는 오류"} (rCode: ${data.rCode})`);
        }
      } else {
        setDiscoverStep(`🔍 ${plat.label} 인기 상품 검색 중...`);
        const searchQuery = `${plat.query} ${discoverCategory} 베스트셀러 인기상품 리뷰많은`;
        const searchRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
          body: JSON.stringify({
            query: searchQuery,
            max_results: 15,
            ...(plat.domain ? { include_domains: [plat.domain] } : {}),
            search_depth: "advanced",
            include_images: true,
            include_image_descriptions: true,
          }),
        });
        if (!searchRes.ok) throw new Error(`Tavily 검색 오류 ${searchRes.status}`);
        const searchData = await searchRes.json();
        const results = searchData.results || [];
        // 검색결과 자체에 달려있는 이미지만 사용 — 없으면 빈 값(다른 상품 이미지를 갖다 붙이지 않음)
        items = results.map(r => {
          const first = (r.images || [])[0];
          const own = first ? (typeof first === "string" ? first : first.url) : "";
          return { title: r.title, url: r.url, image: own, content: (r.content || "").slice(0, 200), priceText: "" };
        });
      }

      // 에러 페이지·품절/점검 안내 등 실제 상품이 아닌 결과는 분석 전에 걸러냄
      const ERROR_PAGE_PATTERNS = ["에러페이지", "시스템오류", "시스템 오류", "페이지를 찾을 수 없", "찾을 수 없는 페이지", "404", "500 error", "page not found", "오류가 발생", "서비스 준비중", "점검중", "일시적인 오류", "요청하신 페이지"];
      items = items.filter(it => {
        const hay = `${it.title || ""} ${it.content || ""}`.toLowerCase();
        return !ERROR_PAGE_PATTERNS.some(p => hay.includes(p.toLowerCase()));
      });

      if (!items.length) throw new Error("검색 결과가 없습니다. 키워드를 바꿔보세요.");

      // Step 2: AI로 상품별 분석 + 수익성 평가
      setDiscoverStep(`🤖 AI가 상품 수익성·트렌드 분석 중...`);
      const productList = items.map((it, i) => `${i + 1}. 제목: ${it.title}\n${it.content}`).join("\n\n");

      const analyzePrompt = `아래는 ${plat.label}의 "${discoverCategory}" 관련 상품 목록입니다. 총 ${items.length}개입니다.
각 상품을 분석해서 JSON으로만 응답. 마크다운 없이 순수 JSON.

상품 목록 (총 ${items.length}개):
${productList}

분석 기준:
- 판매량·리뷰 수 (많을수록 좋음)
- "쿠팡 검색 인기순위"가 표기되어 있다면 그 숫자가 낮을수록(1위에 가까울수록) 실제로 잘 팔리고 있다는 강력한 근거이므로 trend_score·total_score에 적극 반영할 것. 단, 이 원본 순위 숫자는 검색할 때마다 바뀔 수 있어 화면에 표시되는 최종 추천 순위(1~${items.length}위, rank 필드)와 헷갈리게 되므로, reason 문장 안에 "쿠팡 검색 인기순위 N위" 같은 구체적 숫자를 직접 인용하지 말 것 — "쿠팡에서 검색 상위권 노출" 정도로만 정성적으로 표현하고, 사용자에게 보여줄 유일한 순위는 rank 필드뿐이다.
- 검색 트렌드 (상승 중인 카테고리)
- 수익률 예상 (마진 높은 상품)
- 콘텐츠 제작 용이성 (영상 만들기 좋은 상품)

주의: 위 상품 목록에 없는 사실(정확한 가격·리뷰 수 등)을 지어내지 마세요. 정보가 부족하면 "가격대"나 "리뷰 수"는 "정보 부족" 또는 대략적 추정으로 표기하고, trend_score·profit_score·content_score는 주어진 제목/내용만으로 합리적으로 판단하세요.

중요: "products" 배열에는 위 상품 목록 ${items.length}개 전부를 빠짐없이 하나씩 분석해서 넣으세요. 절대 1개만 반환하지 마세요 — 반드시 ${items.length}개의 항목을 포함해야 합니다. 아래는 그 중 한 항목의 형식 예시일 뿐입니다:

{"products":[
  {
    "rank": 1,
    "source_index": 1,
    "name": "상품명",
    "price_range": "가격대 (예: 2-5만원)",
    "category": "카테고리",
    "trend_score": 8,
    "profit_score": 7,
    "content_score": 9,
    "total_score": 8,
    "review_count": "리뷰 수 (예: 1,200개+)",
    "reason": "추천 이유 2-3문장 (트렌드·수익성·콘텐츠 관점)",
    "keywords": ["키워드1","키워드2","키워드3"],
    "usp": "핵심 셀링포인트 1문장",
    "target": "타겟 고객층",
    "caution": "주의사항 (경쟁 심함/마진 낮음 등, 없으면 없음)"
  },
  { "...": "위와 동일한 형식으로 나머지 상품들도 계속" }
]}
"source_index"는 위 상품 목록의 번호(1부터 시작)를 정확히 그대로 넣으세요 — url/이미지/가격 매칭에 사용됩니다. products 배열 길이는 반드시 ${items.length}이어야 합니다.`;

      const raw = await callAI(analyzePrompt);
      const parsed = parseJSON(raw);
      const products = (parsed.products || [])
        .map(p => {
          const idx = Math.max(0, (Number(p.source_index) || 1) - 1);
          const src = items[idx];
          return { ...p, name: src?.title || p.name || "", url: src?.url || "", image_url: src?.image || "", price_range: src?.priceText || p.price_range };
        })
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
        .slice(0, 5);
      setDiscoverResults(products);

    } catch (e) {
      setError(e.message);
    } finally {
      setDiscoverLoading(false);
      setDiscoverStep("");
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setProductUrl(product.url || "");
    setProductDesc(`상품명: ${product.name}
카테고리: ${product.category}
가격대: ${product.price_range}
타겟: ${product.target}
USP: ${product.usp}
키워드: ${(product.keywords || []).join(", ")}`);
    setAppStep(2);
  };

  // ── Test Mode: 샘플로 각 엔진 결과 비교 ──────────────────────────────────
  const TEST_PROMPT = `상품 정보:
{"name":"에어팟 프로 2세대","category":"무선 이어폰","price":"329,000원","usp":"노이즈캔슬링으로 완전한 집중","target":"20-40대 직장인","mood":"프리미엄"}

씬: [FIND] 💎 핵심 가치 발견
스타일: 시네마틱 / 카메라: slow reveal dolly, moment of discovery lighting

위 씬에 맞는 영상 프롬프트를 JSON으로만 응답. 마크다운 없이 순수 JSON.
{"visual":"한국어 장면 묘사 2-3문장","narration":"나레이션 10자 내외","ai_prompt":"AI 영상 생성 영문 프롬프트 40단어 이상"}`;

  const handleTest = async (testEngine, testKey, testModelId) => {
    if (!testKey) return;
    setTestResults(prev => ({ ...prev, [testEngine]: { loading: true, result: null, error: null, time: null } }));
    const start = Date.now();
    try {
      let result;
      if (testEngine === "gemini") {
        result = await callGemini([{ text: TEST_PROMPT }], testKey);
      } else {
        result = await callClaude([{ role: "user", content: TEST_PROMPT }], testKey, testModelId);
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      let parsed = null;
      try { parsed = parseJSON(result); } catch {}
      setTestResults(prev => ({ ...prev, [testEngine]: { loading: false, result: parsed || result, error: null, time: elapsed } }));
    } catch (e) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      setTestResults(prev => ({ ...prev, [testEngine]: { loading: false, result: null, error: e.message, time: elapsed } }));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070f", color: "#e8e8f0", fontFamily: "'Inter','Apple SD Gothic Neo',sans-serif" }}>

      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 9999 }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg,${fw.color},#03C75A)`, width: `${loadingPct}%`, transition: "width 0.4s" }} />
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && <PreviewModal onClose={() => setShowPreview(false)} />}

      {/* API Key Modal */}
      {showKeys && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a3e", borderRadius: 20, width: "100%", maxWidth: 480, marginTop: "auto", marginBottom: "auto" }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#4285F4,#7c3aed)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔑</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#e8e8f0" }}>API 키 관리</div>
                <div style={{ fontSize: 10, color: "#5a5a7a", marginTop: 1 }}>입력 · 저장 · 삭제</div>
              </div>
              <button onClick={() => setShowKeys(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6060a0", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>

            {/* Key Fields */}
            <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { id: "gemini",  stateKey: "geminiKey",  label: "Google Gemini",     link: "https://aistudio.google.com/app/apikey",         val: geminiKey,  set: setGeminiKey,  ph: "AIzaSy...",    color: "#4285F4", icon: "G",  req: false, info: "무료 1,500/일 · 이미지 분석 가능" },
                { id: "claude",  stateKey: "claudeKey",  label: "Claude (Anthropic)", link: "https://console.anthropic.com/settings/keys",    val: claudeKey,  set: setClaudeKey,  ph: "sk-ant-...",   color: "#D97706", icon: "C",  req: false, info: "Sonnet 4.5 / Opus 4.6 / Haiku 4.5" },
                { id: "tavily",  stateKey: "tavilyKey",  label: "Tavily (URL 크롤링)", link: "https://tavily.com",                             val: tavilyKey,  set: setTavilyKey,  ph: "tvly-...",     color: "#03C75A", icon: "T",  req: false, info: "무료 1,000/월 · 없어도 동작" },
                { id: "pexels",  stateKey: "pexelsKey",  label: "Pexels (무료 스톡 이미지)", link: "https://www.pexels.com/api/",                  val: pexelsKey,  set: setPexelsKey,  ph: "Pexels API Key", color: "#05A081", icon: "P",  req: false, info: "저작권 걱정 없는 무료 스톡 이미지 · 고수수료 숏폼에서 사용" },
                { id: "naverOpenId",     stateKey: "naverOpenId",     label: "네이버 오픈API Client ID",     link: "https://developers.naver.com/apps/#/register", val: naverOpenId,     set: setNaverOpenId,     ph: "Client ID",     color: "#03C75A", icon: "N",  req: false, info: "이미지 검색용 · API HUB와 다른 별도 서비스 · developers.naver.com에서 발급" },
                { id: "naverOpenSecret", stateKey: "naverOpenSecret", label: "네이버 오픈API Client Secret", link: "https://developers.naver.com/apps/#/register", val: naverOpenSecret, set: setNaverOpenSecret, ph: "Client Secret", color: "#03C75A", icon: "N",  req: false, info: "네이버 오픈API Client ID와 한 쌍" },
                { id: "naverId",     stateKey: "naverClientId",     label: "네이버 API HUB Key ID",     link: "https://www.ncloud.com/product/applicationService/naverApiHub", val: naverClientId,     set: setNaverClientId,     ph: "X-NCP-APIGW-API-KEY-ID",     color: "#03C75A", icon: "N",  req: false, info: "쇼핑검색 API는 폐지됨 · 검색어트렌드 보조 인사이트용 · 없어도 동작" },
                { id: "naverSecret", stateKey: "naverClientSecret", label: "네이버 API HUB Secret", link: "https://www.ncloud.com/product/applicationService/naverApiHub", val: naverClientSecret, set: setNaverClientSecret, ph: "X-NCP-APIGW-API-KEY",     color: "#03C75A", icon: "N",  req: false, info: "네이버클라우드플랫폼(NCP) 콘솔에서 발급, Key ID와 한 쌍" },
                { id: "coupangAccess", stateKey: "coupangAccessKey", label: "쿠팡파트너스 ACCESS KEY", link: "https://partners.coupang.com", val: coupangAccessKey, set: setCoupangAccessKey, ph: "ACCESS KEY", color: "#FF5722", icon: "C",  req: false, info: "상품검색 API · 시간당 10회 제한 · 없어도 동작" },
                { id: "coupangSecret", stateKey: "coupangSecretKey", label: "쿠팡파트너스 SECRET KEY", link: "https://partners.coupang.com", val: coupangSecretKey, set: setCoupangSecretKey, ph: "SECRET KEY", color: "#FF5722", icon: "C",  req: false, info: "쿠팡 ACCESS KEY와 한 쌍" },
              ].map(f => (
                <div key={f.id} style={{ background: "#12122a", border: `1px solid ${f.val ? f.color + "50" : "#2a2a3e"}`, borderRadius: 13, padding: 14, transition: "border 0.2s" }}>
                  {/* Label row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: f.val ? f.color : "#2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff", flexShrink: 0, transition: "background 0.2s" }}>{f.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#c8c8e0" }}>
                        {f.label}
                        {f.req && <span style={{ color: "#ff6060", marginLeft: 5, fontSize: 9, fontWeight: 400 }}>*필수</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#4a4a6a", marginTop: 1 }}>{f.info}</div>
                    </div>
                    <a href={f.link} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: f.color, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap" }}>발급 →</a>
                  </div>
                  {/* Input row */}
                  <input
                    type="password"
                    placeholder={f.ph}
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    style={{ width: "100%", background: "#0d0d1a", border: `1px solid ${f.val ? f.color + "60" : "#2a2a3e"}`, borderRadius: 9, padding: "9px 12px", color: "#e8e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 9 }}
                  />
                  {/* Status + Delete row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, fontSize: 10, color: f.val ? f.color : "#3a3a5a" }}>
                      {f.val ? `✓ 입력됨 (${f.val.slice(0, 8)}...)` : "미입력"}
                    </div>
                    {/* Save single key */}
                    <button
                      onClick={() => {
                        const next = { geminiKey, claudeKey, tavilyKey, pexelsKey, naverClientId, naverClientSecret, naverOpenId, naverOpenSecret, coupangAccessKey, coupangSecretKey, affiliateLink };
                        saveStorage({ ...loadStorage(), ...next });
                      }}
                      disabled={!f.val}
                      style={{ background: f.val ? `${f.color}18` : "#1a1a2a", border: `1px solid ${f.val ? f.color + "50" : "#2a2a3e"}`, borderRadius: 7, padding: "5px 12px", color: f.val ? f.color : "#3a3a5a", fontSize: 11, fontWeight: 700, cursor: f.val ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                      💾 저장
                    </button>
                    {/* Delete single key */}
                    <button
                      onClick={() => {
                        f.set("");
                        saveStorage({ ...loadStorage(), [f.stateKey]: "" });
                      }}
                      disabled={!f.val}
                      style={{ background: f.val ? "#2a0808" : "#1a1a1a", border: `1px solid ${f.val ? "#5a1a1a" : "#2a2a2a"}`, borderRadius: 7, padding: "5px 12px", color: f.val ? "#ff6060" : "#3a3a3a", fontSize: 11, fontWeight: 700, cursor: f.val ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                      🗑 삭제
                    </button>
                  </div>
                </div>
              ))}

              {/* Engine + Model selector */}
              <div style={{ background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 13, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c8c8e0", marginBottom: 12 }}>AI 엔진 · 모델 선택</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  {[
                    { id: "gemini",     label: "Gemini",     color: "#4285F4" },
                    { id: "claude",     label: "Claude",     color: "#D97706" },
                  ].map(e => (
                    <button key={e.id} onClick={() => setEngine(e.id)}
                      style={{ background: engine === e.id ? `${e.color}18` : "#0d0d1a", border: `1px solid ${engine === e.id ? e.color : "#2a2a3e"}`, borderRadius: 8, padding: "8px", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: engine === e.id ? e.color : "#7070a0" }}>{e.label}</div>
                    </button>
                  ))}
                </div>
                {engine === "gemini" && (
                  <div style={{ fontSize: 10, color: "#4285F4", background: "#4285F418", borderRadius: 7, padding: "6px 10px" }}>Gemini 2.5 Flash 자동 사용</div>
                )}
                {engine === "claude" && (
                  <select value={claudeModel} onChange={e => setClaudeModel(e.target.value)}
                    style={{ width: "100%", background: "#0d0d1a", border: "1px solid #D97706aa", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none" }}>
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 ⭐ ($1/$5 — 추천)</option>
                    <option value="claude-sonnet-4-5">Claude Sonnet 4.5 ($3/$15)</option>
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 ($3/$15)</option>
                    <option value="claude-opus-4-7">Claude Opus 4.7 ($5/$25)</option>
                    <option value="claude-opus-4-8">Claude Opus 4.8 ($5/$25)</option>
                  </select>
                )}
              </div>

              <div style={{ background: "#0a0a15", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", fontSize: 10, color: "#4a4a6a", lineHeight: 1.7 }}>
                🔒 키는 브라우저 localStorage에만 저장 · 외부 전송 없음
              </div>
            </div>

            {/* Footer — 전체 저장/닫기 */}
            <div style={{ padding: "12px 20px 18px", borderTop: "1px solid #1e1e2e", display: "flex", gap: 8 }}>
              <button onClick={() => setShowKeys(false)}
                style={{ flex: 1, background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 10, padding: "11px", color: "#9090b0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                닫기
              </button>
              <button onClick={saveKeys}
                style={{ flex: 2, background: "linear-gradient(135deg,#4285F4,#7c3aed)", border: "none", borderRadius: 10, padding: "11px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                💾 전체 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1a1a28", padding: "13px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, background: "#07070f", zIndex: 100 }}>
        <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${fw.color},#7c3aed)`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>스토리보드 영상 프롬프트 스튜디오</div>
          <div style={{ fontSize: 10, color: "#5a5a7a" }}>카메라 자동 · YouTube 정책 자동 준수 · 씬별 스타일</div>
        </div>

        {/* Step indicator — 상품 숏폼 전용 하위 단계 */}
        {!hcMode && !seriesMode && (
          <>
            <div style={{ width: 1, height: 20, background: "#2a2a3e", marginLeft: 12 }} />
            <span style={{ fontSize: 9, color: "#4a4a6a", marginLeft: 4 }}>상품 숏폼 단계:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#12122a", borderRadius: 10, border: "1px solid #2a2a3e", overflow: "hidden" }}>
            {[
              { step: 1, label: "1️⃣ 상품 탐색" },
              { step: 2, label: "2️⃣ 스토리보드" },
            ].map((s, i) => (
              <button key={s.step} onClick={() => setAppStep(s.step)}
                style={{ background: appStep === s.step ? `${fw.color}22` : "transparent", border: "none", borderRight: i === 0 ? "1px solid #2a2a3e" : "none", padding: "6px 14px", color: appStep === s.step ? fw.color : "#6060a0", fontSize: 11, fontWeight: appStep === s.step ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                {s.label}
              </button>
            ))}
            </div>
          </>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 7, alignItems: "center" }}>
          <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 7, padding: "4px 10px", fontSize: 10, color: "#50a050", display: "flex", alignItems: "center", gap: 4 }}>
            🛡 정책 자동 준수
          </div>
          <button onClick={() => setShowPreview(true)}
            style={{ background: "#1a0a2a", border: "1px solid #3a1a5a", borderRadius: 8, padding: "5px 12px", color: "#a080ff", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            👁 샘플 미리보기
          </button>
          <button onClick={() => setTestMode(t => !t)}
            style={{ background: testMode ? "#0a1a1a" : "#12122a", border: `1px solid ${testMode ? "#06b6d4" : "#2a2a3e"}`, borderRadius: 8, padding: "5px 12px", color: testMode ? "#06b6d4" : "#7070a0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            🧪 엔진 테스트
          </button>
          {storyboard && (
            <button onClick={exportAll} style={{ background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 8, padding: "5px 12px", color: "#9090b0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>⬇ MD 내보내기</button>
          )}
          {storyboard && (
            <button onClick={exportToEditor} title="script-voice-editor(대본·목소리·영상 편집기)가 바로 읽을 수 있는 JSON으로 내보내기"
              style={{ background: "#0a1a2a", border: "1px solid #1a3a5a", borderRadius: 8, padding: "5px 12px", color: "#4a9eff", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>📤 편집기로 내보내기</button>
          )}
          <button onClick={() => setShowKeys(true)}
            style={{ background: geminiKey ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${geminiKey ? "#03C75A40" : "#ff606040"}`, borderRadius: 8, padding: "5px 12px", color: geminiKey ? "#03C75A" : "#ff6060", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            🔑 {engine === "gemini" ? "Gemini" : "Claude"} · {[geminiKey, claudeKey].filter(Boolean).length > 0 ? `키 ${[geminiKey, claudeKey].filter(Boolean).length}개` : "설정"}
          </button>

          {/* 최상위 모드 전환 — 나머지 도구들과는 확실히 분리되도록 맨 끝, 굵은 이중 구분선 뒤에 배치 */}
          <div style={{ width: 2, height: 26, background: "linear-gradient(to bottom, transparent, #3a3a5a, transparent)", marginLeft: 3, marginRight: 3 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <span style={{ fontSize: 8, color: "#4a4a6a", letterSpacing: 1, fontWeight: 700 }}>모드 전환</span>
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#0a0a15", borderRadius: 10, border: "1px solid #33335a", overflow: "hidden", boxShadow: "0 0 0 1px #00000080" }}>
              <button onClick={() => { setSeriesMode(false); setHcMode(false); }}
                style={{ background: (!seriesMode && !hcMode) ? `${fw.color}30` : "transparent", border: "none", borderRight: "1px solid #33335a", padding: "7px 15px", color: (!seriesMode && !hcMode) ? fw.color : "#6060a0", fontSize: 12, fontWeight: (!seriesMode && !hcMode) ? 800 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                🛍️ 상품 스토리 숏폼
              </button>
              <button onClick={() => { setSeriesMode(true); setHcMode(false); }}
                style={{ background: (seriesMode && !hcMode) ? "#f59e0b30" : "transparent", border: "none", borderRight: "1px solid #33335a", padding: "7px 15px", color: (seriesMode && !hcMode) ? "#f59e0b" : "#6060a0", fontSize: 12, fontWeight: (seriesMode && !hcMode) ? 800 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                📺 카테고리 숏폼
              </button>
              <button onClick={() => setHcMode(true)}
                style={{ background: hcMode ? "#b8722a30" : "transparent", border: "none", padding: "7px 15px", color: hcMode ? "#e8a860" : "#6060a0", fontSize: 12, fontWeight: hcMode ? 800 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                🗂️ 고수수료 숏폼
              </button>
            </div>
          </div>
        </div>
        {(loading || discoverLoading) && (
          <div style={{ fontSize: 11, color: fw.color, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
            {discoverLoading ? discoverStep : loadingStep}
          </div>
        )}
      </header>

      {/* ── 고수수료 숏폼: 완전히 별도 화면, 다른 모드와 렌더 트리 공유 없음 ── */}
      {hcMode && (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "18px 16px" }}>
          <div style={{ background: "linear-gradient(135deg,#3a2a1a,#2a1f14)", border: "1px solid #6b4a2a", borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36 }}>🗂️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#e8c9a0" }}>고수수료 숏폼 — 색인카드 카탈로그</div>
              <div style={{ fontSize: 12, color: "#b89468", marginTop: 3 }}>
                피드가 아니라 검색을 공략한다 — 제품명 하나로 구매전환형 대본 4씬 + SEO + 예상 수수료까지
              </div>
            </div>
            <button onClick={() => setHcShowDrawer(v => !v)} style={{ marginLeft: "auto", background: "#2a1f14", border: "1px solid #6b4a2a", borderRadius: 9, padding: "8px 14px", color: "#e8c9a0", fontSize: 12, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
              🗄 카드 서랍 ({hcCards.length}) {hcShowDrawer ? "▲" : "▼"}
            </button>
          </div>

          {hcShowDrawer && (
            <div style={{ background: "#1a140d", border: "1px solid #4a3620", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {hcCards.length === 0 && <div style={{ fontSize: 11, color: "#6b5638", padding: "8px 4px" }}>아직 만든 카드가 없어요</div>}
              {hcCards.map(c => (
                <div key={c.id} onClick={() => setHcResult(c)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#2a1f14", border: "1px solid #4a3620", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 14 }}>🗃️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#e8c9a0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.product_name}</div>
                    <div style={{ fontSize: 9, color: "#8a7050" }}>{c.category === "travel" ? "✈️" : "🛍️"} {new Date(c.createdAt).toLocaleString("ko-KR")} · 예상 수수료 {c.estimated_commission}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); const updated = hcCards.filter(x => x.id !== c.id); setHcCards(updated); saveHcCardsList(updated); }}
                    style={{ background: "none", border: "none", color: "#8a7050", cursor: "pointer", flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={() => setHcCategory("product")}
              style={{ background: hcCategory === "product" ? "#b8722a30" : "#1a140d", border: `1px solid ${hcCategory === "product" ? "#b8722a" : "#4a3620"}`, borderRadius: 8, padding: "6px 14px", color: hcCategory === "product" ? "#e8a860" : "#8a7050", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              🛍️ 상품
            </button>
            <button onClick={() => setHcCategory("travel")}
              style={{ background: hcCategory === "travel" ? "#b8722a30" : "#1a140d", border: `1px solid ${hcCategory === "travel" ? "#b8722a" : "#4a3620"}`, borderRadius: 8, padding: "6px 14px", color: hcCategory === "travel" ? "#e8a860" : "#8a7050", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ✈️ 여행
            </button>
          </div>
          <div style={{ background: "#1a140d", border: "1px solid #4a3620", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, color: "#b89468", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                {hcCategory === "travel" ? "여행지·숙소·항공권 이름" : "제품명 (100만원 이상 고단가 제품 추천)"}
              </div>
              <input value={hcProductName} onChange={e => setHcProductName(e.target.value)} placeholder={HC_CATEGORY_CONFIG[hcCategory].placeholder}
                onKeyDown={e => e.key === "Enter" && !hcLoading && fetchHcCard()}
                style={{ width: "100%", background: "#2a1f14", border: "1px solid #6b4a2a", borderRadius: 8, padding: "10px 12px", color: "#f0dcc0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={fetchHcCard} disabled={hcLoading}
              style={{ background: hcLoading ? "#3a2a1a" : "linear-gradient(135deg,#b8722a,#8a4a1a)", border: "none", borderRadius: 9, padding: "11px 20px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: hcLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {hcLoading ? (hcLoadingStep || "생성 중...") : "🗂️ 색인카드 뽑기"}
            </button>
          </div>

          {hcError && <div style={{ background: "#2a0d0d", border: "1px solid #6b2020", borderRadius: 10, padding: "9px 12px", fontSize: 12, color: "#ff8080", marginBottom: 16 }}>⚠ {hcError}</div>}

          {!tavilyKey && (
            <div style={{ background: "#2a1f14", border: "1px solid #6b4a2a", borderRadius: 10, padding: "9px 12px", fontSize: 11, color: "#e8c9a0", marginBottom: 16 }}>
              ⚠ 실시간 가격·스펙 검색을 위해 Tavily API 키가 필요합니다 —{" "}
              <button onClick={() => setShowKeys(true)} style={{ background: "none", border: "none", color: "#f0a860", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}>설정에서 입력 →</button>
            </div>
          )}

          {hcResult && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8c9a0", marginBottom: 10 }}>
                📇 {hcResult.product_name} <span style={{ fontSize: 11, color: "#8a7050", fontWeight: 400 }}>· {hcResult.price_info}</span>
              </div>
              {hcResult.stockImages?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                    {hcResult.stockImages.map((img, i) => (
                      <img key={i} src={img} alt="" loading="lazy" referrerPolicy="no-referrer"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        style={{ height: 110, borderRadius: 8, border: "1px solid #2a6a4a", flexShrink: 0, background: "#1a140d" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: "#5aa080", marginTop: 4 }}>✓ Pexels 무료 스톡 이미지 — 저작권 걱정 없이 상업적으로 사용 가능</div>
                </div>
              )}
              {hcResult.searchImages?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                    {hcResult.searchImages.map((img, i) => (
                      <img key={i} src={img} alt="" loading="lazy" referrerPolicy="no-referrer"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        style={{ height: 110, borderRadius: 8, border: "1px solid #4a3620", flexShrink: 0, background: "#1a140d" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: "#6b5638", marginTop: 4 }}>⚠ 검색 결과 이미지(네이버·웹) — 저작권이 확인된 게 아니므로 실제 영상에 쓰기 전 출처를 반드시 확인하세요.</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
                {(hcResult.scenes || []).map((sc, i) => (
                  <div key={i} style={{ background: "#f5e9d0", color: "#3a2a1a", borderRadius: 4, padding: "16px 14px", minHeight: 180, boxShadow: "0 4px 10px rgba(0,0,0,0.4)", position: "relative", fontFamily: "'Courier New', monospace", border: "1px solid #d8c090" }}>
                    <div style={{ fontSize: 9, color: "#8a6a3a", letterSpacing: 1, marginBottom: 4 }}>SCENE {i + 1} · {sc.duration}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b3a1a", marginBottom: 8, textTransform: "uppercase" }}>{sc.stage}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>{sc.narration}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#1a140d", border: "1px solid #4a3620", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, color: "#b89468", fontWeight: 700, letterSpacing: 1 }}>🏷 SEO·수수료 카드</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#8a7050", marginBottom: 3 }}>SEO 제목</div>
                    <div style={{ fontSize: 12, color: "#f0dcc0" }}>{hcResult.seo_title}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#8a7050", marginBottom: 3 }}>썸네일 후킹 문구</div>
                    <div style={{ fontSize: 12, color: "#f0dcc0" }}>{hcResult.thumbnail_hook}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#8a7050", marginBottom: 3 }}>검색 키워드</div>
                    <div style={{ fontSize: 12, color: "#90c0f0" }}>{(hcResult.search_keywords || []).join(", ")}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#8a7050", marginBottom: 3 }}>예상 수수료</div>
                    <div style={{ fontSize: 12, color: "#90d090", fontWeight: 700 }}>{hcResult.estimated_commission}</div>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: "#8a7050", fontStyle: "italic" }}>{hcResult.commission_note}</div>
                <div style={{ background: "#2a1f14", borderRadius: 8, padding: "8px 10px", fontSize: 10, color: "#c0a880", lineHeight: 1.6 }}>
                  📝 {hcResult.video_metadata_description}
                </div>
                {hcResult.sources?.length > 0 && (
                  <div style={{ fontSize: 9, color: "#6b5638" }}>
                    출처: {hcResult.sources.map((s, i) => <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ color: "#8a9ad0", marginRight: 6 }}>[{i + 1}]</a>)}
                  </div>
                )}
                <button onClick={() => copy(JSON.stringify(hcResult, null, 2), "hc-copy")}
                  style={{ background: "none", border: "1px solid #6b4a2a", borderRadius: 8, padding: "8px 0", color: "#e8c9a0", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                  {copiedKey === "hc-copy" ? "✓ 복사됨" : "📋 전체 복사 (JSON)"}
                </button>
              </div>
            </div>
          )}

          {!hcResult && !hcLoading && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b5638" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🗂️</div>
              <div style={{ fontSize: 13 }}>제품명을 넣고 "색인카드 뽑기"를 눌러보세요</div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: 상품 탐색 ── */}
      {!hcMode && !seriesMode && appStep === 1 && (
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "18px 16px" }}>
          {/* Step header */}
          <div style={{ background: "#0d0d1a", border: `1px solid ${fw.color}40`, borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36 }}>🔎</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>1단계 — 잘 팔리는 상품 탐색</div>
              <div style={{ fontSize: 12, color: "#6060a0", marginTop: 3 }}>
                쿠팡·네이버·알리·11번가·G마켓에서 트렌드 높고 수익성 좋은 상품을 AI가 분석해서 추천해드려요
              </div>
            </div>
            {!canDiscover && (
              <div style={{ marginLeft: "auto", background: "#1a1200", border: "1px solid #3a2a00", borderRadius: 9, padding: "8px 12px", fontSize: 11, color: "#f59e0b" }}>
                ⚠ {discoverPlatform === "coupang" ? "쿠팡 ACCESS/SECRET KEY 필요 (또는 Tavily)" : "Tavily API 키 필요"}<br />
                <button onClick={() => setShowKeys(true)} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontSize: 10, textDecoration: "underline", padding: 0 }}>설정에서 입력 →</button>
              </div>
            )}
          </div>

          {/* Search controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Platform + Category */}
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1 }}>플랫폼 선택</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {DISCOVER_PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setDiscoverPlatform(p.id)}
                    style={{ background: discoverPlatform === p.id ? `${p.color}20` : "#12122a", border: `1px solid ${discoverPlatform === p.id ? p.color : "#2a2a3e"}`, borderRadius: 8, padding: "8px", cursor: "pointer", color: discoverPlatform === p.id ? p.color : "#7070a0", fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1 }}>분야 선택</div>
              <select value={CATEGORY_LIST.includes(discoverCategory) ? discoverCategory : ""} onChange={e => e.target.value && setDiscoverCategory(e.target.value)}
                style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 9, padding: "9px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                <option value="">직접 입력 (아래 칸에)</option>
                {CATEGORY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1 }}>카테고리 · 키워드</div>
              <input
                placeholder="예: 다이어트 식품, 스킨케어, 캠핑용품, 무선이어폰..."
                value={discoverCategory}
                onChange={e => setDiscoverCategory(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleDiscover()}
                style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 9, padding: "10px 12px", color: "#e8e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />

              {/* Quick category chips */}
              <div>
                <div style={{ fontSize: 10, color: "#4a4a6a", marginBottom: 6 }}>빠른 선택</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {["다이어트·건강식품","스킨케어·뷰티","캠핑·아웃도어","무선이어폰","홈트·운동용품","반려동물","주방용품","공기청정기","패션·의류","어린이 장난감"].map(cat => (
                    <button key={cat} onClick={() => setDiscoverCategory(cat)}
                      style={{ background: discoverCategory === cat ? `${fw.color}20` : "#12122a", border: `1px solid ${discoverCategory === cat ? fw.color : "#2a2a3e"}`, borderRadius: 20, padding: "4px 10px", cursor: "pointer", color: discoverCategory === cat ? fw.color : "#7070a0", fontSize: 10, transition: "all 0.15s" }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleDiscover} disabled={discoverLoading || !discoverCategory || !canDiscover}
                style={{ background: (!discoverLoading && discoverCategory && canDiscover) ? `linear-gradient(135deg,${fw.color},#03C75A)` : "#1e1e2e", border: "none", borderRadius: 10, padding: "12px", color: (!discoverLoading && discoverCategory && canDiscover) ? "#fff" : "#5a5a7a", fontWeight: 700, fontSize: 13, cursor: (!discoverLoading && discoverCategory && canDiscover) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {discoverLoading ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> {discoverStep}</> : `🔍 ${DISCOVER_PLATFORMS.find(p => p.id === discoverPlatform)?.label} 상품 탐색`}
              </button>
            </div>

            {/* Scoring guide */}
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>AI 분석 기준</div>
              {[
                { icon: "📈", label: "트렌드 점수", desc: "검색량 상승 중인 카테고리", color: "#06b6d4" },
                { icon: "💰", label: "수익률 점수", desc: "마진 높고 경쟁 적당한 상품", color: "#03C75A" },
                { icon: "🎬", label: "콘텐츠 점수", desc: "영상으로 만들기 쉬운 상품", color: "#7c3aed" },
                { icon: "⭐", label: "종합 점수", desc: "세 가지를 합산한 추천 지수", color: fw.color },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a2a" }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: "#5a5a7a" }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 10, color: "#4a4a6a", lineHeight: 1.7 }}>
                상품을 선택하면 자동으로 2단계로<br />이동해서 스토리보드를 생성합니다
              </div>
            </div>
          </div>

          {/* Results */}
          {error && (
            <div style={{ background: "#1a0808", border: "1px solid #4a1a1a", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ff8080", marginBottom: 12 }}>⚠ {error}</div>
          )}

          {discoverResults.length > 0 && naverTrend && (
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 11, color: "#03C75A", fontWeight: 700, whiteSpace: "nowrap" }}>📈 네이버 검색 관심도<br /><span style={{ color: "#5a5a7a", fontWeight: 400 }}>최근 5개월</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32, flex: 1 }}>
                {naverTrend.map((pt, i) => (
                  <div key={i} title={`${pt.period}: ${pt.ratio}`} style={{ flex: 1, height: `${Math.max(4, pt.ratio)}%`, background: `${fw.color}`, opacity: 0.4 + (0.6 * i) / Math.max(1, naverTrend.length - 1), borderRadius: 2 }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#6b6b8a", whiteSpace: "nowrap" }}>
                {naverTrend[naverTrend.length - 1]?.ratio > naverTrend[0]?.ratio ? "🔺 상승 추세" : naverTrend[naverTrend.length - 1]?.ratio < naverTrend[0]?.ratio ? "🔻 하락 추세" : "➖ 보합"}
              </div>
            </div>
          )}

          {discoverResults.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#6060a0", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: `${fw.color}20`, color: fw.color, borderRadius: 5, padding: "2px 8px", fontWeight: 700 }}>{DISCOVER_PLATFORMS.find(p => p.id === discoverPlatform)?.label}</span>
                <span>"{discoverCategory}" 검색 결과 {discoverResults.length}개 · 종합 점수 순 (최대 5개 추천)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {discoverResults.map((product, i) => (
                  <div key={i} style={{ background: "#0d0d1a", border: `2px solid ${i === 0 ? fw.color + "60" : "#1e1e2e"}`, borderRadius: 14, overflow: "hidden", position: "relative", cursor: "pointer", transition: "all 0.2s" }}
                    onClick={() => handleSelectProduct(product)}>
                    {/* Product image */}
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} loading="lazy" referrerPolicy="no-referrer"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        style={{ width: "100%", height: 180, objectFit: "contain", display: "block", background: "#070712" }} />
                    )}
                    <div style={{ padding: 16, position: "relative" }}>
                    {/* Rank badge */}
                    <div style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: i === 0 ? fw.color : "#2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>
                      {i + 1}
                    </div>
                    {i === 0 && (
                      <div style={{ fontSize: 9, background: `${fw.color}25`, color: fw.color, borderRadius: 4, padding: "2px 7px", fontWeight: 700, marginBottom: 6, display: "inline-block" }}>🏆 1위 추천</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, paddingRight: 36 }}>{product.name}</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, background: "#1e1e2e", color: "#9090b0", borderRadius: 5, padding: "2px 7px" }}>{product.category}</span>
                      {product.price_range && <span style={{ fontSize: 10, background: "#0a1a0a", color: "#03C75A", borderRadius: 5, padding: "2px 7px" }}>💰 {product.price_range}</span>}
                      {product.review_count && <span style={{ fontSize: 10, background: "#0a0a1a", color: "#a080ff", borderRadius: 5, padding: "2px 7px" }}>⭐ {product.review_count}</span>}
                    </div>

                    {/* Score bars */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                      {[
                        { label: "트렌드", score: product.trend_score, color: "#06b6d4" },
                        { label: "수익률", score: product.profit_score, color: "#03C75A" },
                        { label: "콘텐츠", score: product.content_score, color: "#7c3aed" },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 9, color: "#5a5a7a" }}>{s.label}</span>
                            <span style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.score}/10</span>
                          </div>
                          <div style={{ height: 4, background: "#1e1e2e", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(s.score / 10) * 100}%`, background: s.color, borderRadius: 2, transition: "width 0.6s" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: 11, color: "#a0c8ff", background: "#0a0a1a", borderRadius: 7, padding: "7px 9px", marginBottom: 8, lineHeight: 1.5 }}>
                      💡 {product.usp}
                    </div>
                    <div style={{ fontSize: 11, color: "#8080a0", lineHeight: 1.5, marginBottom: product.caution && product.caution !== "없음" ? 8 : 0 }}>
                      {product.reason}
                    </div>
                    {product.caution && product.caution !== "없음" && (
                      <div style={{ fontSize: 10, color: "#f59e0b", background: "#1a1200", borderRadius: 6, padding: "5px 8px" }}>
                        ⚠ {product.caution}
                      </div>
                    )}

                    {/* CTA */}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button onClick={e => { e.stopPropagation(); copy(product.name, `disc-name-${i}`); }} disabled={!product.name}
                        style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 9, padding: "9px 12px", color: copiedKey === `disc-name-${i}` ? "#03C75A" : "#9090b0", fontWeight: 700, fontSize: 12, cursor: product.name ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                        {copiedKey === `disc-name-${i}` ? "✓ 복사됨" : "📋 제목 복사"}
                      </button>
                      <button onClick={e => { e.stopPropagation(); copy(product.url, `disc-url-${i}`); }} disabled={!product.url}
                        style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 9, padding: "9px 12px", color: copiedKey === `disc-url-${i}` ? "#03C75A" : "#9090b0", fontWeight: 700, fontSize: 12, cursor: product.url ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                        {copiedKey === `disc-url-${i}` ? "✓ 복사됨" : "🔗 링크 복사"}
                      </button>
                      <button style={{ flex: 1, background: `linear-gradient(135deg,${fw.color},#7c3aed)`, border: "none", borderRadius: 9, padding: "9px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        이 상품으로 스토리보드 만들기 →
                      </button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!discoverResults.length && !discoverLoading && !error && (
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 14, padding: "50px 20px", textAlign: "center", color: "#3a3a5a" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🛒</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#6060a0" }}>플랫폼과 카테고리를 선택하고 탐색하세요</div>
              <div style={{ fontSize: 12, color: "#4a4a6a", lineHeight: 1.8 }}>
                AI가 트렌드·수익성·콘텐츠 적합도를 분석해서<br />
                스토리보드 만들기 좋은 상품을 추천해드려요
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: 스토리보드 ── */}
      {!hcMode && (seriesMode || appStep === 2) && (
      <div className={`main-layout${storyboard ? "" : " no-result"}${seriesMode ? " series-mode" : ""}`}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* 카테고리 숏폼은 장르를 먼저 정해야 트렌드·소재 추천이 맞물리므로 맨 앞으로 배치 */}
          {seriesMode && (
            <div style={{ background: "#1a1200", border: "1px solid #f59e0b40", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#c99a4a", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>① 장르 선택 — 여기서부터 시작</div>
                <select value={storyGenre} onChange={e => { setStoryGenre(e.target.value); setShortsTrend(null); setTrendTopics(null); }}
                  style={{ width: "100%", background: "#12122a", border: "1px solid #f59e0b40", borderRadius: 8, padding: "8px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                  {STORY_GENRE_GROUPS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {storyGenre === "사자성어·고사성어" && (
                <div>
                  <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 6 }}>💬 사자성어 추천 (클릭하면 소재로 채워지고 목록에서 사라짐 — 중복 방지)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {visibleIdioms.map(it => (
                      <button key={it.idiom} type="button" onClick={() => pickIdiom(it)}
                        title={it.meaning}
                        style={{ background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 20, padding: "4px 10px", cursor: "pointer", color: "#7070a0", fontSize: 10, transition: "all 0.15s" }}>
                        {it.idiom}
                      </button>
                    ))}
                    {visibleIdioms.length === 0 && (
                      <div style={{ fontSize: 10, color: "#4a4a6a" }}>다 사용했어요 — 아래 버튼으로 새로 받아보세요.</div>
                    )}
                  </div>
                  <button type="button" onClick={fetchMoreIdioms} disabled={idiomLoading}
                    style={{ background: "none", border: "1px solid #7c3aed50", borderRadius: 8, padding: "6px 0", width: "100%", color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: idiomLoading ? "not-allowed" : "pointer" }}>
                    🎲 {idiomLoading ? "받아오는 중..." : "다른 사자성어 더 추천받기 (AI)"}
                  </button>
                </div>
              )}

              <div>
                <button onClick={fetchShortsTrend} disabled={shortsTrendLoading}
                  style={{ width: "100%", background: "none", border: "1px solid #FF005060", borderRadius: 8, padding: "8px 0", color: "#FF0050", fontSize: 11, fontWeight: 700, cursor: shortsTrendLoading ? "not-allowed" : "pointer" }}>
                  🔥 {shortsTrendLoading ? "불러오는 중..." : `지금 뜨는 [${storyGenre}] 숏폼 확인`}
                </button>
                {shortsTrend && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
                    {shortsTrend.length === 0 && <div style={{ fontSize: 10, color: "#6a5a3a" }}>검색 결과가 없어요.</div>}
                    {shortsTrend.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", fontSize: 10, color: "#c99a4a", textDecoration: "none", background: "#12122a", borderRadius: 6, padding: "5px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🔗 {r.title}
                      </a>
                    ))}
                  </div>
                )}
                {trendTopicsLoading && (
                  <div style={{ fontSize: 10, color: "#c99a4a", marginTop: 8 }}>💡 벤치마크 분석해서 소재 추천 중...</div>
                )}
                {trendTopics && trendTopics.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: "#03C75A", fontWeight: 700, marginBottom: 5 }}>💡 이 트렌드 기반 추천 소재 (클릭하면 소재로 채워짐)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {trendTopics.map((t, i) => (
                        <button key={i} type="button" onClick={() => setStoryTopic(t.title)} title={t.reason}
                          style={{ textAlign: "left", background: "#0a1a0a", border: "1px solid #03C75A40", borderRadius: 7, padding: "6px 9px", cursor: "pointer" }}>
                          <div style={{ fontSize: 11, color: "#90d0a0", fontWeight: 600 }}>{t.title}</div>
                          {t.reason && <div style={{ fontSize: 9, color: "#5a7a5a", marginTop: 2 }}>{t.reason}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 9, color: "#c99a4a", lineHeight: 1.6 }}>
                매번 생성할 때마다 이 장르의 "다음 화"가 자동으로 이어집니다 — 씬 마지막에 클리프행어(다음 화 예고)가 자동 삽입되고, 이전 화 줄거리를 참고해서 겹치지 않게 이어집니다.
              </div>

              <div style={{ background: "#12122a", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>
                  📖 [{storyGenre}] 시리즈 · {genreEpisodes.length > 0 ? `${genreEpisodes.length}화까지 진행됨 → 다음은 ${nextEpNumber}화` : "아직 없음 → 1화부터 시작"}
                </div>
                {genreEpisodes.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto" }}>
                    {genreEpisodes.map(e => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#8a7a5a" }}>
                        <span style={{ flexShrink: 0, color: "#f59e0b", fontWeight: 700 }}>{e.epNumber}화</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.productName || "(제목 없음)"}</span>
                        <button onClick={() => removeStoryEpisode(e.id)} style={{ background: "none", border: "none", color: "#6a5a3a", cursor: "pointer", flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input — 상품 숏폼과 스토리 숏폼은 완전히 다른 입력을 씀 */}
          {!seriesMode ? (
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 13, padding: 13 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 9 }}>① 상품 입력</div>
              <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4 }}>🔗 URL</div>
              <input type="url" placeholder="https://smartstore.naver.com/..." value={productUrl} onChange={e => setProductUrl(e.target.value)}
                style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4 }}>✏ 상품 설명</div>
              <textarea placeholder="상품명, 특징, 가격, 타겟 등..." value={productDesc} onChange={e => setProductDesc(e.target.value)} rows={2}
                style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4 }}>🖼 실제 상품 사진 ({images.length}/{MAX_IMAGES}) <span style={{ color: "#4a4a6a" }}>— 여러 장일수록 AI가 실물을 더 정확히 반영</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 6 }}>
                {images.map((im, i) => (
                  <div key={im.previewUrl} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #2a2a3e", aspectRatio: "1", background: "#0a0a15" }}>
                    <img src={im.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: im.base64 ? 1 : 0.4 }} />
                    <button onClick={() => removeImage(i)}
                      style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.8)", border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 10, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <div onClick={() => fileRef.current.click()}
                    style={{ border: "2px dashed #2a2a3e", borderRadius: 8, background: "#0a0a15", cursor: "pointer", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a5a7a", fontSize: 20 }}>
                    +
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { processFiles(e.target.files); e.target.value = ""; }} />
            </div>
          ) : (
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 13, padding: 13 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 9 }}>② 소재 입력 (상품 아님, 선택)</div>
              <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4 }}>✏ 소재·주제·명언 (선택 — 비워두면 AI가 장르에 맞게 자동 선정 · 장르를 "사자성어·고사성어"로 선택하면 ① 장르 선택에서 추천 목록이 나와요)</div>
              <textarea placeholder="예: '삶은 짧지 않다. 당신이 짧게 만들 뿐이다' / 새옹지마 / 에펠탑이 원래 철거될 뻔한 이야기..." value={storyTopic} onChange={e => setStoryTopic(e.target.value)} rows={3}
                style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4, marginTop: 4 }}>🖼 참고 이미지 (선택, 스타일 참고용)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 6 }}>
                {images.map((im, i) => (
                  <div key={im.previewUrl} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #2a2a3e", aspectRatio: "1", background: "#0a0a15" }}>
                    <img src={im.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: im.base64 ? 1 : 0.4 }} />
                    <button onClick={() => removeImage(i)}
                      style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.8)", border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 10, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <div onClick={() => fileRef.current.click()}
                    style={{ border: "2px dashed #2a2a3e", borderRadius: 8, background: "#0a0a15", cursor: "pointer", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a5a7a", fontSize: 20 }}>
                    +
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { processFiles(e.target.files); e.target.value = ""; }} />
            </div>
          )}

          {/* Framework */}
          <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 13, padding: 13 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1 }}>{seriesMode ? "③ " : "② "}스토리 프레임워크</div>
              <button onClick={autoPickFramework} disabled={frameworkAutoLoading}
                style={{ background: "none", border: "1px solid #7c3aed50", borderRadius: 7, padding: "3px 9px", color: "#a78bfa", fontSize: 10, fontWeight: 700, cursor: frameworkAutoLoading ? "not-allowed" : "pointer" }}>
                🎲 {frameworkAutoLoading ? "고르는 중..." : "AI 자동 선택"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.entries(STORY_FRAMEWORKS).map(([key, f]) => (
                <button key={key} onClick={() => { setFramework(key); setSelectedScenes(null); }}
                  style={{ background: framework === key ? `${f.color}15` : "#12122a", border: `2px solid ${framework === key ? f.color : "#2a2a3e"}`, borderRadius: 9, padding: "9px 11px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: framework === key ? f.color : "#9090b0" }}>{f.label}</div>
                      <div style={{ fontSize: 9, color: "#5a5a7a" }}>{f.desc} · {f.scenes.length}씬 · {f.author}</div>
                    </div>
                  </div>
                  {framework === key && (
                    <div style={{ marginTop: 7, display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {f.scenes.map(s => <span key={s.id} style={{ fontSize: 9, background: `${f.color}20`, color: f.color, borderRadius: 4, padding: "2px 5px" }}>{s.emoji} {s.label}</span>)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Platform + Global Style */}
          <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 13, padding: 13 }}>
            <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>{seriesMode ? "④ " : "③ "}플랫폼 선택</div>

            {/* Group: 글로벌 숏폼 */}
            <div style={{ fontSize: 9, color: "#4a4a6a", fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>🌏 글로벌 숏폼</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
              {["youtube_shorts","tiktok","instagram_reels","facebook_reels","x_twitter","threads","pinterest","linkedin"].map(key => {
                const cfg = PLATFORM_CONFIGS[key]; if (!cfg) return null;
                return (
                  <button key={key} onClick={() => setPlatform(key)}
                    style={{ background: platform === key ? `${cfg.color}18` : "#12122a", border: `1px solid ${platform === key ? cfg.color : "#2a2a3e"}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: platform === key ? cfg.color : "#7070a0" }}>{cfg.icon} {cfg.label}</div>
                    <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 1 }}>{cfg.ratio} · {cfg.duration}</div>
                  </button>
                );
              })}
            </div>

            {/* Group: 국내 숏폼 */}
            <div style={{ fontSize: 9, color: "#4a4a6a", fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>🇰🇷 국내 숏폼</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
              {["naver_clip","kakaotalk_pung","toss_shortform","kakaostory","danggeun"].map(key => {
                const cfg = PLATFORM_CONFIGS[key]; if (!cfg) return null;
                return (
                  <button key={key} onClick={() => setPlatform(key)}
                    style={{ background: platform === key ? `${cfg.color}18` : "#12122a", border: `1px solid ${platform === key ? cfg.color : "#2a2a3e"}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: platform === key ? cfg.color : "#7070a0" }}>{cfg.icon} {cfg.label}</div>
                    <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 1 }}>{cfg.ratio} · {cfg.duration}</div>
                  </button>
                );
              })}
            </div>

            {/* Group: 동영상·커머스 */}
            <div style={{ fontSize: 9, color: "#4a4a6a", fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>🎥 동영상·커머스</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 12 }}>
              {["youtube_long","naver_tv","coupang_live","naver_shopping","kakao_shopping","toss_shopping"].map(key => {
                const cfg = PLATFORM_CONFIGS[key]; if (!cfg) return null;
                return (
                  <button key={key} onClick={() => setPlatform(key)}
                    style={{ background: platform === key ? `${cfg.color}18` : "#12122a", border: `1px solid ${platform === key ? cfg.color : "#2a2a3e"}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: platform === key ? cfg.color : "#7070a0" }}>{cfg.icon} {cfg.label}</div>
                    <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 1 }}>{cfg.ratio} · {cfg.duration}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>기본 이미지 스타일 <span style={{ color: "#4a4a6a", fontWeight: 400, textTransform: "none" }}>(씬별 개별 변경 가능)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {IMAGE_STYLES.map(s => (
                <button key={s.id} onClick={() => setGlobalStyle(s.id)}
                  style={{ background: globalStyle === s.id ? "#1e1030" : "#12122a", border: `1px solid ${globalStyle === s.id ? "#7c3aed" : "#2a2a3e"}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 11 }}>{s.emoji} <span style={{ fontWeight: 600, color: globalStyle === s.id ? "#c4a8ff" : "#7070a0" }}>{s.label}</span></div>
                  <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 1 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Auto camera preview */}
          <div style={{ background: "#0a1020", border: "1px solid #1a2a40", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#4285F4", fontWeight: 700, marginBottom: 8 }}>📹 자동 카메라 미리보기 ({fw.label} × {IMAGE_STYLES.find(s => s.id === globalStyle)?.label})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {fw.scenes.slice(0, 4).map(sc => (
                <div key={sc.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, minWidth: 18 }}>{sc.emoji}</span>
                  <div>
                    <span style={{ fontSize: 9, color: "#4285F4", fontWeight: 700 }}>{sc.label}: </span>
                    <span style={{ fontSize: 9, color: "#5a7a9a" }}>{getAutoCamera(sc.id, sceneStyles[sc.id] || globalStyle).slice(0, 55)}...</span>
                  </div>
                </div>
              ))}
              {fw.scenes.length > 4 && <div style={{ fontSize: 9, color: "#3a4a5a" }}>+ {fw.scenes.length - 4}개 씬 더...</div>}
            </div>
          </div>


          {/* Brand tone */}
          <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1 }}>{seriesMode ? "⑤ " : "④ "}브랜드 톤 (선택)</div>
              <button onClick={autoPickBrandTone} disabled={brandToneAutoLoading}
                style={{ background: "none", border: "1px solid #7c3aed50", borderRadius: 7, padding: "3px 9px", color: "#a78bfa", fontSize: 10, fontWeight: 700, cursor: brandToneAutoLoading ? "not-allowed" : "pointer" }}>
                🎲 {brandToneAutoLoading ? "만드는 중..." : "AI 자동 생성"}
              </button>
            </div>
            <input placeholder="예: 고급스럽고 감성적인, 친근하고 유머러스한..." value={brandTone} onChange={e => setBrandTone(e.target.value)}
              style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Affiliate link — 상품 숏폼 전용 (스토리 숏폼과 무관) */}
          {!seriesMode && (
            <div style={{ background: "#0d0d1a", border: `1px solid ${affiliateLink ? "#f59e0b50" : "#1e1e2e"}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 7 }}>🔗 내 제휴 링크 (선택)</div>
              <input placeholder="https://link.coupang.com/a/... 또는 제휴 링크" value={affiliateLink}
                onChange={e => { setAffiliateLink(e.target.value); saveStorage({ ...loadStorage(), affiliateLink: e.target.value }); }}
                style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 5 }}>자동 저장됨 · MD 내보내기 결과물에 자동 삽입됩니다</div>
            </div>
          )}

          {/* Policy notice */}
          <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#50a050", fontWeight: 700, marginBottom: 6 }}>🛡 자동 적용 정책</div>
            <div style={{ fontSize: 9, color: "#3a6a3a", lineHeight: 1.8 }}>
              ✓ YouTube 커뮤니티 가이드라인<br />
              ✓ 광고주 친화적 콘텐츠 기준<br />
              ✓ 이미지 생성 플랫폼 정책<br />
              ✓ 폭력·성적·혐오 콘텐츠 자동 차단<br />
              ✓ 허위·오해 유발 표현 방지<br />
              ✓ 저작권 침해 요소 차단
            </div>
          </div>

          {(() => {
            const dup = findHistoryDuplicate(productUrl || productDesc);
            return dup ? (
              <div style={{ background: "#1a1200", border: "1px solid #3a2a00", borderRadius: 10, padding: "9px 12px", fontSize: 11, color: "#f59e0b", lineHeight: 1.6 }}>
                ⚠ 이 상품, {new Date(dup.date).toLocaleDateString("ko-KR")}에 [{dup.framework}]로 이미 만든 적 있어요{dup.productName ? ` (${dup.productName})` : ""} — 그대로 진행하면 중복 생성됩니다.
              </div>
            ) : null;
          })()}

          {error && <div style={{ background: "#1a0808", border: "1px solid #4a1a1a", borderRadius: 10, padding: "9px 12px", fontSize: 12, color: "#ff8080", lineHeight: 1.6 }}>⚠ {error}</div>}

          <button onClick={handleGenerate} disabled={!canGenerate}
            style={{ background: canGenerate ? `linear-gradient(135deg,${fw.color},#7c3aed)` : "#1e1e2e", border: "none", borderRadius: 12, padding: "13px", color: canGenerate ? "#fff" : "#5a5a7a", fontWeight: 700, fontSize: 13, cursor: canGenerate ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading
              ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> {loadingStep}</>
              : seriesMode
                ? `⑥ 📺 [${storyGenre}] ${nextEpNumber}화 생성 (${fw.scenes.length}씬)`
                : `⑤ ${fw.icon} ${fw.label} 스토리보드 생성 (${fw.scenes.length}씬)`}
          </button>

          <button onClick={() => setShowHistory(v => !v)}
            style={{ background: "none", border: "1px solid #2a2a3e", borderRadius: 9, padding: "8px", color: "#8a8ab0", fontSize: 11, cursor: "pointer" }}>
            📋 생성 기록{seriesMode ? " (카테고리 숏폼)" : " (상품 스토리 숏폼)"} {genHistory.filter(h => !!h.seriesMode === seriesMode).length > 0 ? `(${genHistory.filter(h => !!h.seriesMode === seriesMode).length})` : ""} {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 10, maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {genHistory.filter(h => !!h.seriesMode === seriesMode).length === 0 && <div style={{ fontSize: 11, color: "#4a4a6a", padding: "8px 4px" }}>아직 만든 기록이 없어요</div>}
              {genHistory.filter(h => !!h.seriesMode === seriesMode).map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#12122a", borderRadius: 8, padding: "7px 9px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#c0c0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.productName || h.source || "(제목 없음)"}</div>
                    <div style={{ fontSize: 9, color: "#5a5a7a", marginTop: 1 }}>{h.framework} · {h.platform}{h.seriesMode ? " · 카테고리 숏폼" : ""} · {new Date(h.date).toLocaleDateString("ko-KR")}</div>
                  </div>
                  <button onClick={() => removeHistoryEntry(h.id)} style={{ background: "none", border: "none", color: "#5a5a7a", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Test Panel ── */}
        {testMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#0a1a1a", border: "1px solid #06b6d4aa", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>🧪</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#06b6d4" }}>AI 엔진 테스트 모드</div>
                  <div style={{ fontSize: 10, color: "#4a7a7a" }}>동일한 샘플 씬으로 각 엔진 결과·속도 비교</div>
                </div>
              </div>
              <div style={{ background: "#060f0f", border: "1px solid #1a3a3a", borderRadius: 9, padding: 11, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#06b6d4", fontWeight: 700, marginBottom: 5 }}>테스트 프롬프트 (FIND 씬 · 에어팟 프로 · 시네마틱)</div>
                <div style={{ fontSize: 10, color: "#4a7a7a", lineHeight: 1.6, fontFamily: "monospace" }}>{"{"}"name":"에어팟 프로 2세대", "usp":"노이즈캔슬링"{"}"} → FIND씬 · slow reveal dolly</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "gemini",     label: "Gemini 2.5 Flash", color: "#4285F4", icon: "G",  key: geminiKey,  model: "gemini-2.5-flash",            free: "무료" },
                  { id: "claude",     label: claudeModel,         color: "#D97706", icon: "C",  key: claudeKey,  model: claudeModel,                    free: "유료" },
                ].map(eng => {
                  const res = testResults[eng.id];
                  return (
                    <div key={eng.id} style={{ background: "#0d0d1a", border: `1px solid ${eng.color}30`, borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: eng.key ? eng.color : "#2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff" }}>{eng.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: eng.key ? eng.color : "#5a5a7a" }}>{eng.label}</div>
                          <div style={{ fontSize: 9, color: "#4a4a6a" }}>{eng.free} {res?.time && `· ${res.time}초`}</div>
                        </div>
                        <button
                          onClick={() => handleTest(eng.id, eng.key, eng.model)}
                          disabled={!eng.key || res?.loading}
                          style={{ background: eng.key ? `${eng.color}20` : "#1e1e2e", border: `1px solid ${eng.key ? eng.color + "50" : "#2a2a3e"}`, borderRadius: 6, padding: "4px 10px", color: eng.key ? eng.color : "#4a4a6a", fontSize: 10, fontWeight: 700, cursor: eng.key ? "pointer" : "not-allowed" }}>
                          {res?.loading ? "⟳" : eng.key ? "▶ 테스트" : "키 없음"}
                        </button>
                      </div>
                      {res?.loading && (
                        <div style={{ fontSize: 10, color: eng.color, textAlign: "center", padding: "10px 0" }}>
                          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> 생성 중...
                        </div>
                      )}
                      {res?.error && (
                        <div style={{ background: "#1a0808", border: "1px solid #4a1a1a", borderRadius: 7, padding: "7px 10px", fontSize: 10, color: "#ff8080", lineHeight: 1.5 }}>
                          ⚠ {res.error}
                        </div>
                      )}
                      {res?.result && !res.loading && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {res.result.visual && (
                            <div>
                              <div style={{ fontSize: 9, color: eng.color, fontWeight: 700, marginBottom: 3 }}>🎬 장면 묘사</div>
                              <p style={{ fontSize: 11, color: "#c8c8e0", lineHeight: 1.6, margin: 0, background: "#12122a", padding: "7px 10px", borderRadius: 7 }}>{res.result.visual}</p>
                            </div>
                          )}
                          {res.result.narration && (
                            <div>
                              <div style={{ fontSize: 9, color: eng.color, fontWeight: 700, marginBottom: 3 }}>🎙 나레이션</div>
                              <div style={{ fontSize: 11, color: "#a0d4ff", fontStyle: "italic", background: "#0a0a1a", padding: "5px 9px", borderRadius: 6 }}>"{res.result.narration}"</div>
                            </div>
                          )}
                          {res.result.ai_prompt && (
                            <div>
                              <div style={{ fontSize: 9, color: eng.color, fontWeight: 700, marginBottom: 3 }}>🤖 AI 영상 프롬프트</div>
                              <div style={{ background: "#060612", border: `1px solid ${eng.color}18`, borderRadius: 7, padding: 9 }}>
                                <p style={{ fontSize: 10, color: "#6888c0", lineHeight: 1.7, margin: 0, fontFamily: "monospace", wordBreak: "break-word" }}>{res.result.ai_prompt}</p>
                              </div>
                            </div>
                          )}
                          {typeof res.result === "string" && (
                            <div style={{ background: "#12122a", borderRadius: 7, padding: 9 }}>
                              <p style={{ fontSize: 10, color: "#9090b0", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{res.result.slice(0, 400)}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {!res && !res?.loading && (
                        <div style={{ fontSize: 10, color: "#3a3a5a", textAlign: "center", padding: "12px 0" }}>
                          {eng.key ? "▶ 테스트 버튼을 눌러보세요" : "API 키를 먼저 설정하세요"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => setTestResults({})} style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, padding: "6px 14px", color: "#6060a0", fontSize: 11, cursor: "pointer" }}>초기화</button>
                <button onClick={() => setTestMode(false)} style={{ background: "#06b6d420", border: "1px solid #06b6d440", borderRadius: 8, padding: "6px 16px", color: "#06b6d4", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ 테스트 완료 — 생성하러 가기</button>
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT: Storyboard ── */}
        {storyboard ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {/* Product bar */}
            {productInfo && (
              <div style={{ background: "#0d0d1a", border: `1px solid ${fw.color}40`, borderRadius: 11, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{productInfo.name}</div>
                  <div style={{ fontSize: 10, color: "#6a6a9a" }}>{productInfo.category} · {productInfo.mood}</div>
                </div>
                <div style={{ flex: 1, fontSize: 11, color: "#a0c8ff", background: "#0a0a1a", borderRadius: 7, padding: "5px 10px" }}>💡 {productInfo.usp}</div>
                <div style={{ fontSize: 10, color: "#5a5a7a" }}>{activeScenes.length}/{fw.scenes.length} 씬 선택</div>
              </div>
            )}

            {/* 업로드 메타데이터: 선택 플랫폼에 맞는 제목·설명·해시태그 */}
            {videoMetadata && (
              <div style={{ background: "#0d0d1a", border: "1px solid #2a2a3e", borderRadius: 11, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🏷 {platCfg.label} 업로드 메타데이터</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#5a5a7a", marginBottom: 3 }}>제목</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ flex: 1, fontSize: 12, color: "#e8e8f0", background: "#12122a", borderRadius: 6, padding: "6px 9px" }}>{videoMetadata.title}</div>
                      <button onClick={() => copy(videoMetadata.title, "meta-title")} style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "5px 8px", color: copiedKey === "meta-title" ? "#03C75A" : "#9090b0", fontSize: 10, cursor: "pointer" }}>{copiedKey === "meta-title" ? "✓" : "복사"}</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#5a5a7a", marginBottom: 3 }}>설명</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, fontSize: 11, color: "#c0c0e0", background: "#12122a", borderRadius: 6, padding: "6px 9px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{videoMetadata.description}</div>
                      <button onClick={() => copy(videoMetadata.description, "meta-desc")} style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "5px 8px", color: copiedKey === "meta-desc" ? "#03C75A" : "#9090b0", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>{copiedKey === "meta-desc" ? "✓" : "복사"}</button>
                    </div>
                  </div>
                  {videoMetadata.hashtags?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 9, color: "#5a5a7a", marginBottom: 3 }}>해시태그</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ flex: 1, fontSize: 11, color: "#a0c8ff", background: "#12122a", borderRadius: 6, padding: "6px 9px" }}>{videoMetadata.hashtags.join(" ")}</div>
                        <button onClick={() => copy(videoMetadata.hashtags.join(" "), "meta-tags")} style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, padding: "5px 8px", color: copiedKey === "meta-tags" ? "#03C75A" : "#9090b0", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>{copiedKey === "meta-tags" ? "✓" : "복사"}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Episode header (스토리 숏폼 모드) */}
            {seriesMode && currentEpNumber && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
                <div style={{ height: 1, flex: 1, background: "#f59e0b30" }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", whiteSpace: "nowrap" }}>📺 [{storyGenre}] EPISODE {currentEpNumber}</div>
                <div style={{ height: 1, flex: 1, background: "#f59e0b30" }} />
              </div>
            )}

            {/* Scene cards */}
            {fw.scenes.map((sc, i) => (
              <Fragment key={sc.id}>
                <SceneCard
                  scene={sc}
                  sceneData={storyboard[sc.id]}
                  frameworkColor={fw.color}
                  styleId={sceneStyles[sc.id] || globalStyle}
                  onCopy={copy}
                  copiedKey={copiedKey}
                  onRegenerate={handleRegenerate}
                  isRegenerating={regenScene === sc.id}
                  isSelected={activeScenes.includes(sc.id)}
                  onToggle={() => toggleScene(sc.id)}
                  onStyleChange={styleId => setSceneStyles(prev => ({ ...prev, [sc.id]: styleId }))}
                  index={i}
                  platCfg={platCfg}
                />
                {seriesMode && i === fw.scenes.length - 1 && (
                  <div style={{ textAlign: "center", fontSize: 11, color: "#f59e0b", padding: "2px 0 6px", fontStyle: "italic" }}>🔜 다음 화에서 계속... ({nextEpNumber}화 생성하기)</div>
                )}
              </Fragment>
            ))}

            {/* Footer */}
            <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 11, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontSize: 11, color: "#5a5a7a" }}>
                선택 씬 {activeScenes.length}개 · 예상 영상 {activeScenes.length * 3}~{activeScenes.length * 6}초
              </div>
              <button onClick={exportAll}
                style={{ background: `${fw.color}20`, border: `1px solid ${fw.color}50`, borderRadius: 8, padding: "7px 14px", color: fw.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ⬇ 전체 스토리보드 MD
              </button>
            </div>
          </div>
        ) : !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gridColumn: "1/-1" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🎬</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#6060a0" }}>스토리보드를 생성해보세요</div>
            <div style={{ fontSize: 12, color: "#4a4a6a", textAlign: "center", lineHeight: 1.8, marginBottom: 14 }}>
              스토리 프레임워크 선택 → 이미지 스타일 선택<br />
              카메라 무브는 씬+스타일에 따라 <span style={{ color: fw.color, fontWeight: 600 }}>자동 결정</span><br />
              모든 콘텐츠는 <span style={{ color: "#50a050", fontWeight: 600 }}>YouTube 정책 자동 준수</span>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
              {Object.values(STORY_FRAMEWORKS).map(f => (
                <span key={f.label} style={{ fontSize: 10, background: `${f.color}15`, border: `1px solid ${f.color}40`, color: f.color, borderRadius: 12, padding: "3px 10px" }}>{f.icon} {f.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder, textarea::placeholder { color: #4a4a6a; }
        select option { background: #12122a; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #07070f; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 4px; }

        /* ── 반응형 ── */
        .main-layout { display: grid; gap: 16px; justify-content: center; align-items: start; padding: 16px 14px; max-width: 1180px; margin: 0 auto; grid-template-columns: 1fr; }
        .main-layout.no-result { max-width: 680px; }

        /* 데스크탑: 좌우 2열 */
        @media (min-width: 900px) {
          .main-layout { grid-template-columns: 340px 1fr; max-width: 1400px; }
          /* 입력 전(결과 없음) 화면: 2열로 나누면 패널 높이가 서로 달라 옆에 큰 빈 공간이 생기고
             ①②③ 순서도 헷갈리게 되므로, 1열을 유지하되 폭만 넉넉하게 넓혀서 여백만 줄임 */
          .main-layout.no-result { grid-template-columns: 900px; max-width: 900px; }
        }

        /* 태블릿 */
        @media (min-width: 600px) and (max-width: 899px) {
          .main-layout { grid-template-columns: 1fr; max-width: 600px; }
          .platform-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .engine-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }

        /* 모바일 */
        @media (max-width: 599px) {
          .main-layout { grid-template-columns: 1fr; padding: 10px 10px; gap: 10px; }
          .platform-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .engine-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .header-btns { gap: 5px !important; }
          .header-btns button, .header-btns a { font-size: 10px !important; padding: 4px 7px !important; }
          .header-title { font-size: 12px !important; }
          .header-sub { display: none; }
          .scene-card-body { padding: 10px !important; }
        }

        /* 공통 */
        button { font-family: inherit; }
        input, textarea, select { font-family: inherit; }
      `}</style>
    </div>
  );
}
