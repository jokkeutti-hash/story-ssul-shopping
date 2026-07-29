function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// signed-date 포맷: yyMMdd'T'HHmmss'Z' (UTC)
function signedDate() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${yy}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// 쿠팡파트너스 API는 HMAC 서명이 필요하고 CORS도 막혀 있어서, 클라이언트가
// 보관한 키를 요청 헤더로 전달받아 이 Function에서 서명 후 대신 호출한다.
// 주의: Search API는 시간당 최대 10회로 제한됨(쿠팡파트너스 공식 정책).
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q");
  const accessKey = request.headers.get("X-Coupang-Access-Key");
  const secretKey = request.headers.get("X-Coupang-Secret-Key");

  if (!keyword) return json({ error: "검색어(q)가 필요합니다." }, 400);
  if (!accessKey || !secretKey) return json({ error: "쿠팡 ACCESS KEY/SECRET KEY가 필요합니다." }, 400);

  const method = "GET";
  const path = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
  const query = `keyword=${encodeURIComponent(keyword)}&limit=10`;
  const date = signedDate();
  const signature = await hmacSha256Hex(secretKey, date + method + path + query);
  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${date}, signature=${signature}`;

  const res = await fetch(`https://api-gateway.coupang.com${path}?${query}`, {
    headers: { Authorization: authorization },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: `쿠팡 API 오류 ${res.status} (시간당 10회 제한을 초과했을 수 있습니다)`, detail }, res.status);
  }

  const data = await res.json();
  const list = data?.data?.productData || data?.data || [];
  const items = list.map(it => ({
    title: it.productName || "",
    url: it.productUrl || "",
    image: it.productImage || "",
    price: it.productPrice,
    isRocket: !!it.isRocket,
    category: it.categoryName || "",
  }));

  return json({ items });
}
