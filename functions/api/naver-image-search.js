function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

// 네이버 이미지 검색(openapi.naver.com)은 CORS를 막아놔서 브라우저에서 직접 호출이 안 되고,
// API HUB(NCP)와는 발급 콘솔·키 쌍이 다른 별도 서비스라서 이 프록시로 대신 호출한다.
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const clientId = request.headers.get("X-Naver-Client-Id");
  const clientSecret = request.headers.get("X-Naver-Client-Secret");

  if (!query) return json({ error: "검색어(q)가 필요합니다." }, 400);
  if (!clientId || !clientSecret) return json({ error: "네이버 오픈API Client ID/Secret이 필요합니다." }, 400);

  const res = await fetch(
    `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query)}&display=6&filter=large`,
    { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret } }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: `네이버 이미지 검색 오류 ${res.status}`, detail }, res.status);
  }

  const data = await res.json();
  const items = (data.items || []).map(it => ({ link: it.link, thumbnail: it.thumbnail, title: (it.title || "").replace(/<[^>]+>/g, "") }));
  return json({ items });
}
