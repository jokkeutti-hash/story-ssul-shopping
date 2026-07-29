function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

// 네이버 쇼핑 검색 API는 브라우저에서 직접 호출 시 CORS로 막히기 때문에
// 클라이언트가 보관한 키를 요청 헤더로 그대로 전달받아 서버(Function)에서 대신 호출한다.
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const clientId = request.headers.get("X-Naver-Client-Id");
  const clientSecret = request.headers.get("X-Naver-Client-Secret");

  if (!query) return json({ error: "검색어(q)가 필요합니다." }, 400);
  if (!clientId || !clientSecret) return json({ error: "네이버 Client ID/Secret이 필요합니다." }, 400);

  const naverUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=10&sort=sim`;
  const res = await fetch(naverUrl, {
    headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: `네이버 API 오류 ${res.status}`, detail }, res.status);
  }

  const data = await res.json();
  const items = (data.items || []).map(it => ({
    title: (it.title || "").replace(/<\/?b>/g, ""),
    url: it.link,
    image: it.image || "",
    lprice: it.lprice,
    hprice: it.hprice,
    mallName: it.mallName || "",
    brand: it.brand || it.maker || "",
    category: [it.category1, it.category2, it.category3, it.category4].filter(Boolean).join(" > "),
  }));

  return json({ items });
}
