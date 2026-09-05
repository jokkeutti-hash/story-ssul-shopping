function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

// 네이버 쇼핑검색 API는 2026-07-31부로 완전 폐지되어 대체가 없다.
// 대신 살아있는 NAVER API HUB(네이버클라우드플랫폼)의 "검색어트렌드"로
// 키워드의 최근 상대적 관심도 추이만 보조 인사이트로 제공한다.
// CORS가 막혀 있어 클라이언트가 보관한 NCP APIGW 키를 헤더로 전달받아 대신 호출한다.
export async function onRequestPost(context) {
  const { request } = context;
  const keyId = request.headers.get("X-Ncp-Apigw-Api-Key-Id");
  const keySecret = request.headers.get("X-Ncp-Apigw-Api-Key");
  if (!keyId || !keySecret) return json({ error: "네이버 API HUB Client ID/Secret이 필요합니다." }, 400);

  let body;
  try { body = await request.json(); } catch { return json({ error: "잘못된 요청입니다." }, 400); }
  const keyword = (body.keyword || "").trim();
  if (!keyword) return json({ error: "키워드가 필요합니다." }, 400);

  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 5);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const res = await fetch("https://naverapihub.apigw.ntruss.com/search-trend/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-NCP-APIGW-API-KEY-ID": keyId,
      "X-NCP-APIGW-API-KEY": keySecret,
    },
    body: JSON.stringify({
      startDate: fmt(start),
      endDate: fmt(end),
      timeUnit: "month",
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: `네이버 트렌드 API 오류 ${res.status}`, detail }, res.status);
  }

  const data = await res.json();
  const series = data.results?.[0]?.data || [];
  return json({ series });
}
