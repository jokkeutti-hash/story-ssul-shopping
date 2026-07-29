import { useState, useRef, useCallback } from "react";

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
    prompt: "cinematic film photography, anamorphic 2.39:1 widescreen, dramatic Rembrandt lighting with deep shadows and bright highlights, shallow depth of field f/1.8, color graded with teal-and-orange LUT, lens flare from practical light source, 35mm film grain overlay, ARRI Alexa camera look, professional film set quality, bokeh background, motivated lighting from single key light",
    negative: "avoid: flat lighting, overexposed, digital look, amateur, no grain, cartoon",
  },
  {
    id: "anime", label: "애니메이션", emoji: "🎌", desc: "일본 애니 스타일",
    prompt: "high-quality Japanese anime style, Studio Ghibli and Makoto Shinkai inspired, clean precise line art with consistent stroke weight, cel-shading with soft gradient fills, vibrant saturated color palette, speed lines for motion, detailed background illustration, large expressive eyes, hair with individual strand highlights, sakura petals or sparkle effects, 2D hand-drawn aesthetic",
    negative: "avoid: 3D render, realistic photography, CGI, blurry lines, Western cartoon style",
  },
  {
    id: "watercolor", label: "수채화", emoji: "🎨", desc: "감성 수채화풍",
    prompt: "traditional watercolor painting on textured cold-press paper, wet-on-wet bleeding edges, granulation texture visible in washes, white paper showing through highlights, loose gestural brush marks, limited palette of 4-5 harmonious colors, pigment pooling in shadows, soft diffused edges, translucent layered glazes, impressionistic rendering, visible paper tooth texture, painterly imperfection",
    negative: "avoid: digital smooth gradients, sharp edges, photorealistic, heavy outlines, oil paint texture",
  },
  {
    id: "neon_cyberpunk", label: "네온·사이버펑크", emoji: "🌃", desc: "미래적 네온 감성",
    prompt: "cyberpunk neon noir aesthetic, rain-soaked reflective streets at night, magenta and cyan volumetric neon signs, atmospheric fog with god rays, high contrast deep blacks with vivid neon fills, holographic UI overlays, wet ground reflections doubling neon colors, dystopian urban environment, blade runner inspired color palette, rim lighting from neon sources, chromatic aberration effect",
    negative: "avoid: daylight, natural colors, warm tones, clean environment, low contrast",
  },
  {
    id: "minimal", label: "미니멀", emoji: "⬜", desc: "깔끔한 미니멀리즘",
    prompt: "pure minimalist composition, vast negative space on clean white or off-white background, single hero subject centered or rule-of-thirds placed, razor-sharp focus with no distractions, flat diffused studio lighting eliminating all shadows, muted monochromatic color palette with one accent hue, precise geometric composition, Swiss graphic design principles, breathing room around subject, no texture",
    negative: "avoid: busy background, multiple subjects, dark tones, texture, clutter, vibrant colors",
  },
  {
    id: "vintage", label: "빈티지·필름", emoji: "📷", desc: "레트로 필름 감성",
    prompt: "Kodak Portra 400 film photography aesthetic, warm faded analog tones with lifted blacks, heavy film grain noise especially in shadows, slight color shift toward orange in midtones, cyan in shadows, light leaks in corners, vignette darkening edges, slightly soft focus from vintage lens, 1970s-1980s aesthetic, expired film look, desaturated highlights, authentic analog imperfection",
    negative: "avoid: digital sharpness, clean modern look, vivid colors, no grain, contemporary style",
  },
  {
    id: "hyperrealistic", label: "하이퍼리얼", emoji: "🔬", desc: "초극사실적 묘사",
    prompt: "hyperrealistic commercial photography, 100MP medium format camera quality, studio strobe lighting with large octabox softbox, every surface texture rendered in microscopic detail, razor-sharp focus edge to edge, accurate color reproduction, product photography standard, subtle natural reflections, no visible grain, technically perfect exposure, advertising campaign quality, shot on Hasselblad H6D",
    negative: "avoid: painterly, illustration, artistic interpretation, grain, blur, artistic style",
  },
  {
    id: "illustration", label: "일러스트", emoji: "✏", desc: "현대적 일러스트",
    prompt: "contemporary editorial illustration style, bold confident vector-like line art, limited flat color palette with intentional color blocking, geometric simplified forms, layered composition with clear foreground-midground-background, texture overlays on flat fills, influenced by Malika Favre and Olimpia Zagnoli, strong graphic design sensibility, crisp clean shapes, modern magazine cover aesthetic",
    negative: "avoid: photorealistic, anime, watercolor, rough texture, hand-drawn imprecision",
  },
  {
    id: "dark_luxury", label: "다크 럭셔리", emoji: "🖤", desc: "고급스러운 어둠",
    prompt: "dark luxury editorial photography, near-black background with 5% lift, single narrow rim light creating product silhouette, 24-karat gold and deep black color story, velvet and polished metal surface textures, extreme shallow depth with specular highlights glinting, jewelry editorial lighting standard, perfume bottle advertisement aesthetic, dramatic shadows with 10:1 lighting ratio, smoke or mist for atmosphere",
    negative: "avoid: bright environment, casual feel, flat lighting, colorful, playful, lo-fi",
  },
  {
    id: "nature", label: "자연·유기적", emoji: "🌿", desc: "자연친화적 감성",
    prompt: "organic nature photography, golden hour soft sunlight filtering through leaves, dappled light and shadow patterns, earthy color palette of sage green, terracotta, warm beige, botanical elements naturally integrated, macro texture of leaves bark stone, gentle lens blur of out-of-focus foliage, environmentally conscious aesthetic, slow-living visual language, imperfect natural beauty",
    negative: "avoid: artificial lighting, urban setting, synthetic materials, harsh flash, neon colors",
  },
  {
    id: "pop_art", label: "팝아트", emoji: "🎭", desc: "팝아트 스타일",
    prompt: "Roy Lichtenstein and Andy Warhol inspired pop art, benday halftone dot pattern overlaid on bold flat colors, thick black outlines with 4-6pt stroke weight, primary color palette red yellow blue with added hot pink, repeated motif screen-print aesthetic, thought bubbles or speech bubble graphic elements, high contrast with no gradients, comic book printing artifact aesthetic, Pantone solid colors only",
    negative: "avoid: photorealistic, subtle colors, gradients, painterly, no outlines, 3D render",
  },
  {
    id: "dreamy", label: "몽환적", emoji: "☁", desc: "몽환적 분위기",
    prompt: "ethereal dreamscape photography, extreme lens bloom and halation glow around highlights, soft double exposure layering, pastel color palette lavender pink peach mist, heavy diffusion filter effect, out-of-focus foreground bokeh bubbles, surreal floating elements, haze and atmospheric fog reducing contrast, fairy tale otherworldly mood, slow shutter motion blur, iridescent light rainbow lens flare",
    negative: "avoid: sharp focus, high contrast, realistic, dark tones, urban, harsh lighting",
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
    policy:"광고주 친화 콘텐츠 필수, 성인 콘텐츠·폭력·혐오 금지, 저작권 준수",
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
    caption_tip:"해시태그 20-30개, 위치 태그 추가, 제품 태그 활용",
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
    caption_tip:"해시태그 최소화, 질문형 문구로 댓글 유도",
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
  // ── 동영상 플랫폼 ────────────────────────────────────────────────────────
  youtube_long:    {
    label:"YouTube (롱폼)", icon:"YT", color:"#CC0000", ratio:"16:9", duration:"5-15분",
    size:"1920×1080px (4K 3840×2160 권장)", fps:"24-60fps", maxSize:"256GB",
    tone:"구독자와 대화하는 친근한 말투, 전문성 + 친근함 병행, 시청 유지율 중시",
    style:"상세 리뷰·스토리텔링, 교육·정보, 썸네일·인트로 중요, 챕터 구분",
    policy:"YouTube 수익창출 정책 준수, 광고주 친화 필수",
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

const STORAGE_KEY = "pvps_sb_v2";
function loadStorage() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
function saveStorage(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

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

async function callOpenRouter(messages, apiKey, model) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://claude.ai", "X-Title": "PVPS Storyboard" },
    body: JSON.stringify({ model, messages, max_tokens: 8192, temperature: 0.8 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `OpenRouter 오류 ${res.status}`); }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callClaude(messages, apiKey, model, img = null, imgType = "image/jpeg") {
  const formattedMessages = messages.map((m, i) => {
    if (i === 0 && img) {
      return {
        role: m.role,
        content: [
          { type: "image", source: { type: "base64", media_type: imgType, data: img } },
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

// ─── Kimi API (Moonshot AI — OpenAI 호환) ────────────────────────────────────

async function callKimi(messages, apiKey, model) {
  const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 8192 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Kimi API 오류 ${res.status}`); }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
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

          {/* AI Prompt */}
          <div>
            <div style={{ fontSize: 10, color: frameworkColor, fontWeight: 700, marginBottom: 5 }}>🤖 AI 영상 프롬프트</div>
            <div style={{ background: "#060612", border: `1px solid ${frameworkColor}20`, borderRadius: 9, padding: 11, position: "relative" }}>
              <div style={{ position: "absolute", top: 6, right: 7, fontSize: 9, color: frameworkColor, background: `${frameworkColor}20`, borderRadius: 4, padding: "1px 6px" }}>PROMPT</div>
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
  const [orKey, setOrKey] = useState(stored.orKey || "");
  const [claudeKey, setClaudeKey] = useState(stored.claudeKey || "");
  const [kimiKey, setKimiKey] = useState(stored.kimiKey || "");
  const [tavilyKey, setTavilyKey] = useState(stored.tavilyKey || "");
  const [engine, setEngine] = useState("claude");
  const [orModel, setOrModel] = useState("deepseek/deepseek-v4-flash:free");
  const [claudeModel, setClaudeModel] = useState("claude-haiku-4-5-20251001");
  const [kimiModel, setKimiModel] = useState("kimi-k3");
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testLoading, setTestLoading] = useState(false);

  // Input
  const [productUrl, setProductUrl] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const fileRef = useRef();

  // Config
  const [framework, setFramework] = useState("harmon_circle");
  const [platform, setPlatform] = useState("youtube_shorts");
  const [globalStyle, setGlobalStyle] = useState("cinematic");
  const [sceneStyles, setSceneStyles] = useState({});
  const [brandTone, setBrandTone] = useState("");

  // Output
  const [productInfo, setProductInfo] = useState(null);
  const [storyboard, setStoryboard] = useState(null);
  const [selectedScenes, setSelectedScenes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [loadingPct, setLoadingPct] = useState(0);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [regenScene, setRegenScene] = useState(null);

  const fw = STORY_FRAMEWORKS[framework];
  const platCfg = PLATFORM_CONFIGS[platform];
  const activeScenes = selectedScenes || fw.scenes.map(s => s.id);

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); };
  const toggleScene = (id) => {
    const cur = selectedScenes || fw.scenes.map(s => s.id);
    if (cur.includes(id) && cur.length > 1) setSelectedScenes(cur.filter(x => x !== id));
    else if (!cur.includes(id)) setSelectedScenes([...cur, id].sort((a, b) => fw.scenes.findIndex(s => s.id === a) - fw.scenes.findIndex(s => s.id === b)));
  };

  const processFile = useCallback((file) => {
    if (!file?.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setImageMediaType(file.type || "image/jpeg");
    const r = new FileReader();
    r.onload = e => setImageBase64(e.target.result.split(",")[1]);
    r.readAsDataURL(file);
  }, []);

  const saveKeys = () => { saveStorage({ ...loadStorage(), geminiKey, orKey, claudeKey, kimiKey, tavilyKey }); setShowKeys(false); };

  const callAI = useCallback(async (textPrompt, img = null, imgType = null) => {
    if (engine === "gemini") {
      const parts = [];
      if (img) parts.push({ inline_data: { mime_type: imgType || "image/jpeg", data: img } });
      parts.push({ text: textPrompt });
      return callGemini(parts, geminiKey);
    } else if (engine === "claude") {
      return callClaude([{ role: "user", content: textPrompt }], claudeKey, claudeModel, img, imgType || "image/jpeg");
    } else if (engine === "kimi") {
      return callKimi([{ role: "user", content: textPrompt }], kimiKey, kimiModel);
    } else {
      const content = img ? [{ type: "image_url", image_url: { url: `data:${imgType};base64,${img}` } }, { type: "text", text: textPrompt }] : textPrompt;
      return callOpenRouter([{ role: "user", content }], orKey, orModel);
    }
  }, [engine, geminiKey, claudeKey, claudeModel, kimiKey, kimiModel, orKey, orModel]);

  // ── Build scene prompt (카메라 자동, 정책 자동 삽입) ──────────────────────
  const buildScenePrompt = useCallback((info, sceneId, sceneCfg, styleId) => {
    const style = IMAGE_STYLES.find(s => s.id === styleId) || IMAGE_STYLES[0];
    const autoCamera = getAutoCamera(sceneId, styleId);
    const styleNeg = style.negative || "avoid: low quality, blurry, watermark, misleading content";

    return `${POLICY_RULES}
상품 정보:
${JSON.stringify(info, null, 2)}

스토리 프레임워크: ${fw.label} (${fw.desc})
현재 씬: [${sceneCfg.label}] ${sceneCfg.emoji} — ${sceneCfg.desc}
플랫폼: ${platCfg.label}
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

위 콘텐츠 정책과 스타일·카메라를 완벽히 반영하여, 이 씬의 영상 프롬프트를 JSON으로만 응답. 마크다운 없이 순수 JSON.

IMPORTANT: The ai_prompt MUST:
1. Include the exact camera movement: "${autoCamera}"
2. COPY AND INTEGRATE ALL of these style elements exactly as specified: "${style.prompt}"
3. Be 80+ words in English with highly specific visual detail
4. Mention specific lighting, color palette, texture, and camera specs from the style
5. Be 100% YouTube/advertiser-policy compliant
6. Feature the actual product naturally in the scene
7. The style should be unmistakably recognizable in the final video output

{
  "visual": "한국어 장면 묘사 3-4문장 (구체적 행동·감정·분위기·${style.label} 스타일 특징 명시)",
  "narration": "나레이션/대사 10-20자 (임팩트)",
  "text_overlay": "화면 텍스트 5-15자",
  "duration": "추천 길이 예: 3-5초",
  "ai_prompt": "${style.prompt}, camera: ${autoCamera}, [product and scene specific: describe the product placement, human subject if any, specific lighting setup, color palette, atmosphere matching ${style.label} style — minimum 80 words total]",
  "negative_prompt": "${styleNeg}, violence, gore, sexual content, nudity, hate symbols, dangerous activities, misleading imagery, copyrighted characters, watermark, low quality"
}`;
  }, [fw, platCfg, brandTone]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const apiKey = engine === "gemini" ? geminiKey : engine === "claude" ? claudeKey : engine === "kimi" ? kimiKey : orKey;
    if (!apiKey) { setError("API 키를 먼저 입력해주세요."); return; }
    if (!productUrl && !productDesc && !imageBase64) { setError("상품 URL, 설명, 또는 이미지를 입력하세요."); return; }

    setError(""); setLoading(true); setLoadingPct(5);
    setStoryboard(null); setProductInfo(null);

    try {
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
        `상품 정보 JSON으로만 응답. 마크다운 없이.\n${context}${imageBase64 ? "\n[이미지 첨부]" : ""}\n{"name":"상품명","category":"카테고리","price":"가격","usp":"핵심가치 1문장","target":"타겟층","mood":"분위기","keywords":["k1","k2","k3"]}`,
        imageBase64, imageMediaType
      );
      const info = parseJSON(rawInfo);
      setProductInfo(info);

      // 씬별 생성
      const scenes = fw.scenes;
      const result = {};
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        const styleId = sceneStyles[sc.id] || globalStyle;
        setLoadingStep(`${sc.emoji} ${sc.label} 씬 생성 중... (${i + 1}/${scenes.length})`);
        setLoadingPct(15 + Math.round((i / scenes.length) * 80));
        try {
          const raw = await callAI(buildScenePrompt(info, sc.id, sc, styleId));
          result[sc.id] = parseJSON(raw);
        } catch (e) {
          result[sc.id] = { visual: "생성 실패: " + e.message, ai_prompt: "", narration: "", text_overlay: "", duration: "3-5초", negative_prompt: "" };
        }
      }

      setStoryboard(result);
      setSelectedScenes(scenes.map(s => s.id));
      setLoadingPct(100);

    } catch (e) { setError(e.message); }
    finally { setLoading(false); setLoadingStep(""); setTimeout(() => setLoadingPct(0), 800); }
  };

  // ── Regen single ──────────────────────────────────────────────────────────
  const handleRegenerate = async (sceneId) => {
    const apiKey = engine === "gemini" ? geminiKey : engine === "claude" ? claudeKey : engine === "kimi" ? kimiKey : orKey;
    if (!productInfo || !apiKey) return;
    setRegenScene(sceneId);
    try {
      const sc = fw.scenes.find(s => s.id === sceneId);
      const styleId = sceneStyles[sceneId] || globalStyle;
      const raw = await callAI(buildScenePrompt(productInfo, sceneId, sc, styleId));
      setStoryboard(prev => ({ ...prev, [sceneId]: parseJSON(raw) }));
    } catch (e) { setError("재생성 실패: " + e.message); }
    finally { setRegenScene(null); }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAll = () => {
    if (!storyboard || !productInfo) return;
    let out = `# 스토리보드 — ${productInfo.name}\n프레임워크: ${fw.label} | 플랫폼: ${platCfg.label} | ${new Date().toLocaleString("ko-KR")}\n\n`;
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
      out += `**AI 영상 프롬프트:**\n\`\`\`\n${d.ai_prompt}\n\`\`\`\n\n`;
      if (d.negative_prompt) out += `**네거티브:** ${d.negative_prompt}\n\n`;
      out += `---\n\n`;
    });
    const blob = new Blob([out], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `storyboard-${Date.now()}.md`; a.click();
  };

  const activeKey = engine === "gemini" ? geminiKey : engine === "claude" ? claudeKey : engine === "kimi" ? kimiKey : orKey;
  const canGenerate = !loading && !!activeKey && (!!productUrl || !!productDesc || !!imageBase64);

  // ── 1단계: 상품 탐색 ─────────────────────────────────────────────────────
  const DISCOVER_PLATFORMS = [
    { id: "coupang",  label: "쿠팡",       color: "#FF5722", query: "site:coupang.com",       domain: "coupang.com" },
    { id: "naver",    label: "네이버쇼핑",  color: "#03C75A", query: "site:smartstore.naver.com", domain: "smartstore.naver.com" },
    { id: "aliexpress",label: "알리",      color: "#FF6A00", query: "site:aliexpress.com",    domain: "aliexpress.com" },
    { id: "11st",     label: "11번가",     color: "#E8380D", query: "site:11st.co.kr",        domain: "11st.co.kr" },
    { id: "gmarket",  label: "G마켓",      color: "#B50029", query: "site:gmarket.co.kr",     domain: "gmarket.co.kr" },
  ];

  const handleDiscover = async () => {
    if (!tavilyKey) { setError("Tavily API 키가 필요합니다. 설정에서 입력해주세요."); return; }
    if (!discoverCategory.trim()) { setError("카테고리나 키워드를 입력해주세요."); return; }
    const apiKey = engine === "gemini" ? geminiKey : engine === "claude" ? claudeKey : engine === "kimi" ? kimiKey : orKey;
    if (!apiKey) { setError("AI API 키를 설정해주세요."); return; }

    setDiscoverLoading(true); setDiscoverResults([]); setError("");
    const plat = DISCOVER_PLATFORMS.find(p => p.id === discoverPlatform);

    try {
      // Step 1: Tavily로 인기 상품 검색
      setDiscoverStep(`🔍 ${plat.label} 인기 상품 검색 중...`);
      const searchQuery = `${plat.query} ${discoverCategory} 베스트셀러 인기상품 리뷰많은`;
      const searchRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
        body: JSON.stringify({
          query: searchQuery,
          max_results: 8,
          ...(plat.domain ? { include_domains: [plat.domain] } : {}),
          search_depth: "advanced",
          include_images: true,
          include_image_descriptions: true,
        }),
      });
      if (!searchRes.ok) throw new Error(`Tavily 검색 오류 ${searchRes.status}`);
      const searchData = await searchRes.json();
      const results = searchData.results || [];

      if (!results.length) throw new Error("검색 결과가 없습니다. 키워드를 바꿔보세요.");

      // 검색결과별 이미지 추출 (없으면 전역 이미지 목록에서 같은 순번으로 보완)
      const globalImages = (searchData.images || []).map(img => (typeof img === "string" ? img : img?.url)).filter(Boolean);
      const resultImages = results.map((r, i) => {
        const imgs = r.images || [];
        const first = imgs[0];
        const own = first ? (typeof first === "string" ? first : first.url) : "";
        return own || globalImages[i] || "";
      });

      // Step 2: AI로 상품별 분석 + 수익성 평가
      setDiscoverStep(`🤖 AI가 상품 수익성·트렌드 분석 중...`);
      const productList = results.map((r, i) =>
        `${i + 1}. 제목: ${r.title}\nURL: ${r.url}\n내용: ${(r.content || "").slice(0, 200)}`
      ).join("\n\n");

      const analyzePrompt = `아래는 ${plat.label}의 "${discoverCategory}" 관련 상품 목록입니다.
각 상품을 분석해서 JSON으로만 응답. 마크다운 없이 순수 JSON.

상품 목록:
${productList}

분석 기준:
- 판매량·리뷰 수 (많을수록 좋음)
- 검색 트렌드 (상승 중인 카테고리)
- 수익률 예상 (마진 높은 상품)
- 콘텐츠 제작 용이성 (영상 만들기 좋은 상품)

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
  }
]}
"source_index"는 위 상품 목록의 번호(1부터 시작)를 정확히 그대로 넣으세요 — url/이미지 매칭에 사용됩니다.`;

      const raw = await callAI(analyzePrompt);
      const parsed = parseJSON(raw);
      const products = (parsed.products || [])
        .map(p => {
          const idx = Math.max(0, (Number(p.source_index) || 1) - 1);
          const src = results[idx];
          return { ...p, url: src?.url || "", image_url: resultImages[idx] || "" };
        })
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
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
      } else if (testEngine === "claude") {
        result = await callClaude([{ role: "user", content: TEST_PROMPT }], testKey, testModelId);
      } else if (testEngine === "kimi") {
        result = await callKimi([{ role: "user", content: TEST_PROMPT }], testKey, testModelId);
      } else {
        result = await callOpenRouter([{ role: "user", content: TEST_PROMPT }], testKey, testModelId);
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
                { id: "gemini",  label: "Google Gemini",     link: "https://aistudio.google.com/app/apikey",         val: geminiKey,  set: setGeminiKey,  ph: "AIzaSy...",    color: "#4285F4", icon: "G",  req: false, info: "무료 1,500/일 · 이미지 분석 가능" },
                { id: "claude",  label: "Claude (Anthropic)", link: "https://console.anthropic.com/settings/keys",    val: claudeKey,  set: setClaudeKey,  ph: "sk-ant-...",   color: "#D97706", icon: "C",  req: false, info: "Sonnet 4.5 / Opus 4.6 / Haiku 4.5" },
                { id: "kimi",    label: "Kimi K3 (Moonshot)", link: "https://platform.moonshot.ai",                   val: kimiKey,    set: setKimiKey,    ph: "sk-...",       color: "#06b6d4", icon: "K",  req: false, info: "K3(2.8T·1M ctx) · $1 최소 충전 필요" },
                { id: "or",      label: "OpenRouter",         link: "https://openrouter.ai/keys",                     val: orKey,      set: setOrKey,      ph: "sk-or-v1-...", color: "#7c3aed", icon: "OR", req: false, info: "DeepSeek V4 Flash 무료 포함" },
                { id: "tavily",  label: "Tavily (URL 크롤링)", link: "https://tavily.com",                             val: tavilyKey,  set: setTavilyKey,  ph: "tvly-...",     color: "#03C75A", icon: "T",  req: false, info: "무료 1,000/월 · 없어도 동작" },
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
                        const next = { geminiKey, claudeKey, kimiKey, orKey: orKey, tavilyKey };
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
                        const next = { geminiKey, claudeKey, kimiKey, orKey: orKey, tavilyKey };
                        next[f.id === "or" ? "orKey" : f.id + "Key"] = "";
                        saveStorage({ ...loadStorage(), ...next });
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
                    { id: "kimi",       label: "Kimi K3",    color: "#06b6d4" },
                    { id: "openrouter", label: "OpenRouter", color: "#7c3aed" },
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
                {engine === "kimi" && (
                  <select value={kimiModel} onChange={e => setKimiModel(e.target.value)}
                    style={{ width: "100%", background: "#0d0d1a", border: "1px solid #06b6d4aa", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none" }}>
                    <option value="kimi-k3">Kimi K3 ⭐ (2.8T · 1M ctx)</option>
                    <option value="kimi-k2.6">Kimi K2.6 (저렴)</option>
                    <option value="kimi-k2.7-code">Kimi K2.7 Code</option>
                  </select>
                )}
                {engine === "openrouter" && (
                  <select value={orModel} onChange={e => setOrModel(e.target.value)}
                    style={{ width: "100%", background: "#0d0d1a", border: "1px solid #7c3aed99", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none" }}>
                    <option value="deepseek/deepseek-v4-flash:free">DeepSeek V4 Flash ⭐ (무료)</option>
                    <option value="deepseek/deepseek-r1:free">DeepSeek R1 (무료)</option>
                    <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash (무료)</option>
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

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#12122a", borderRadius: 10, border: "1px solid #2a2a3e", overflow: "hidden", marginLeft: 12 }}>
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
          <button onClick={() => setShowKeys(true)}
            style={{ background: geminiKey ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${geminiKey ? "#03C75A40" : "#ff606040"}`, borderRadius: 8, padding: "5px 12px", color: geminiKey ? "#03C75A" : "#ff6060", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            🔑 {engine === "gemini" ? "Gemini" : engine === "claude" ? "Claude" : engine === "kimi" ? "Kimi" : "OpenRouter"} · {[geminiKey, claudeKey, kimiKey, orKey].filter(Boolean).length > 0 ? `키 ${[geminiKey, claudeKey, kimiKey, orKey].filter(Boolean).length}개` : "설정"}
          </button>
        </div>
        {(loading || discoverLoading) && (
          <div style={{ fontSize: 11, color: fw.color, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
            {discoverLoading ? discoverStep : loadingStep}
          </div>
        )}
      </header>

      {/* ── STEP 1: 상품 탐색 ── */}
      {appStep === 1 && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px" }}>
          {/* Step header */}
          <div style={{ background: "#0d0d1a", border: `1px solid ${fw.color}40`, borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36 }}>🔎</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>1단계 — 잘 팔리는 상품 탐색</div>
              <div style={{ fontSize: 12, color: "#6060a0", marginTop: 3 }}>
                쿠팡·네이버·알리·11번가·G마켓에서 트렌드 높고 수익성 좋은 상품을 AI가 분석해서 추천해드려요
              </div>
            </div>
            {!tavilyKey && (
              <div style={{ marginLeft: "auto", background: "#1a1200", border: "1px solid #3a2a00", borderRadius: 9, padding: "8px 12px", fontSize: 11, color: "#f59e0b" }}>
                ⚠ Tavily API 키 필요<br />
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

              <button onClick={handleDiscover} disabled={discoverLoading || !discoverCategory || !tavilyKey}
                style={{ background: (!discoverLoading && discoverCategory && tavilyKey) ? `linear-gradient(135deg,${fw.color},#03C75A)` : "#1e1e2e", border: "none", borderRadius: 10, padding: "12px", color: (!discoverLoading && discoverCategory && tavilyKey) ? "#fff" : "#5a5a7a", fontWeight: 700, fontSize: 13, cursor: (!discoverLoading && discoverCategory && tavilyKey) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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

          {discoverResults.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#6060a0", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: `${fw.color}20`, color: fw.color, borderRadius: 5, padding: "2px 8px", fontWeight: 700 }}>{DISCOVER_PLATFORMS.find(p => p.id === discoverPlatform)?.label}</span>
                <span>"{discoverCategory}" 검색 결과 {discoverResults.length}개 · 종합 점수 순</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {discoverResults.map((product, i) => (
                  <div key={i} style={{ background: "#0d0d1a", border: `2px solid ${i === 0 ? fw.color + "60" : "#1e1e2e"}`, borderRadius: 14, overflow: "hidden", position: "relative", cursor: "pointer", transition: "all 0.2s" }}
                    onClick={() => handleSelectProduct(product)}>
                    {/* Product image */}
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} loading="lazy" referrerPolicy="no-referrer"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        style={{ width: "100%", height: 150, objectFit: "cover", display: "block", background: "#070712" }} />
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
                    <button style={{ width: "100%", marginTop: 10, background: `linear-gradient(135deg,${fw.color},#7c3aed)`, border: "none", borderRadius: 9, padding: "9px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      이 상품으로 스토리보드 만들기 →
                    </button>
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
      {appStep === 2 && (
      <div className={`main-layout${storyboard ? "" : " no-result"}`} style={{ gridTemplateColumns: storyboard ? "300px 1fr" : "480px" }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Input */}
          <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 13, padding: 13 }}>
            <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 9 }}>상품 입력</div>
            <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4 }}>🔗 URL</div>
            <input type="url" placeholder="https://smartstore.naver.com/..." value={productUrl} onChange={e => setProductUrl(e.target.value)}
              style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
            <div style={{ fontSize: 10, color: "#5a5a7a", marginBottom: 4 }}>✏ 상품 설명</div>
            <textarea placeholder="상품명, 특징, 가격, 타겟 등..." value={productDesc} onChange={e => setProductDesc(e.target.value)} rows={2}
              style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 8 }} />
            <div onClick={() => !image && fileRef.current.click()}
              style={{ border: `2px dashed ${image ? "#4285F460" : "#2a2a3e"}`, borderRadius: 8, background: "#0a0a15", cursor: image ? "default" : "pointer", minHeight: 65, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {image ? (
                <>
                  <img src={image} alt="" style={{ maxWidth: "100%", maxHeight: 100, objectFit: "contain" }} />
                  <button onClick={e => { e.stopPropagation(); setImage(null); setImageBase64(null); }}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.8)", border: "none", color: "#fff", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11 }}>✕</button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 10, color: "#5a5a7a", fontSize: 11 }}>🖼 이미지 업로드 (선택)</div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
          </div>

          {/* Framework */}
          <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 13, padding: 13 }}>
            <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 9 }}>스토리 프레임워크</div>
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
            <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>플랫폼 선택</div>

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
              {["naver_clip","kakaotalk_pung","toss_shortform","kakaostory"].map(key => {
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
            <div style={{ fontSize: 11, color: "#6b6b8a", fontWeight: 700, letterSpacing: 1, marginBottom: 7 }}>브랜드 톤 (선택)</div>
            <input placeholder="예: 고급스럽고 감성적인, 친근하고 유머러스한..." value={brandTone} onChange={e => setBrandTone(e.target.value)}
              style={{ width: "100%", background: "#12122a", border: "1px solid #2a2a3e", borderRadius: 7, padding: "7px 10px", color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>

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

          {error && <div style={{ background: "#1a0808", border: "1px solid #4a1a1a", borderRadius: 10, padding: "9px 12px", fontSize: 12, color: "#ff8080", lineHeight: 1.6 }}>⚠ {error}</div>}

          <button onClick={handleGenerate} disabled={!canGenerate}
            style={{ background: canGenerate ? `linear-gradient(135deg,${fw.color},#7c3aed)` : "#1e1e2e", border: "none", borderRadius: 12, padding: "13px", color: canGenerate ? "#fff" : "#5a5a7a", fontWeight: 700, fontSize: 13, cursor: canGenerate ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading
              ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> {loadingStep}</>
              : `${fw.icon} ${fw.label} 스토리보드 생성 (${fw.scenes.length}씬)`}
          </button>
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
                  { id: "kimi",       label: kimiModel,           color: "#06b6d4", icon: "K",  key: kimiKey,    model: kimiModel,                      free: "$3/M" },
                  { id: "openrouter", label: "DeepSeek V4 Flash", color: "#7c3aed", icon: "OR", key: orKey,      model: "deepseek/deepseek-v4-flash:free", free: "무료" },
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

            {/* Scene cards */}
            {fw.scenes.map((sc, i) => (
              <SceneCard
                key={sc.id}
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
        .main-layout { display: grid; gap: 16px; justify-content: center; align-items: start; padding: 16px 14px; max-width: 1180px; margin: 0 auto; }

        /* 데스크탑: 좌우 2열 */
        @media (min-width: 900px) {
          .main-layout { grid-template-columns: 300px 1fr; }
          .main-layout.no-result { grid-template-columns: 500px; }
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
