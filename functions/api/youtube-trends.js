function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

function normalize(items) {
  return (items || []).map((v) => ({
    id: v.id,
    title: v.snippet?.title || "",
    channel: v.snippet?.channelTitle || "",
    thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "",
    publishedAt: v.snippet?.publishedAt || "",
    viewCount: Number(v.statistics?.viewCount || 0),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));
}

// 클라이언트가 보관한 YouTube Data API 키를 헤더로 받아 대신 호출한다(CORS 회피 + 키 비노출 목적은 아님,
// 다른 프록시 함수들과 동일하게 요청마다 즉시 사용하고 저장하지 않음).
export async function onRequestPost(context) {
  const { request } = context;
  const apiKey = request.headers.get("X-Youtube-Api-Key");
  if (!apiKey) return json({ error: "YouTube Data API 키가 필요합니다." }, 400);

  let body;
  try { body = await request.json(); } catch { return json({ error: "잘못된 요청입니다." }, 400); }
  const mode = body.mode === "search" ? "search" : "trending";

  try {
    if (mode === "trending") {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=15&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) return json({ error: data.error?.message || `YouTube API 오류 ${res.status}` }, res.status);
      return json({ videos: normalize(data.items) });
    }

    const q = (body.q || "").trim();
    if (!q) return json({ error: "검색어가 필요합니다." }, 400);

    const publishedAfter = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=15&regionCode=KR&relevanceLanguage=ko&publishedAfter=${publishedAfter}&q=${encodeURIComponent(q)}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchRes.ok) return json({ error: searchData.error?.message || `YouTube 검색 오류 ${searchRes.status}` }, searchRes.status);

    const ids = (searchData.items || []).map((it) => it.id?.videoId).filter(Boolean);
    if (!ids.length) return json({ videos: [] });

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();
    if (!videosRes.ok) return json({ error: videosData.error?.message || `YouTube API 오류 ${videosRes.status}` }, videosRes.status);

    const videos = normalize(videosData.items).sort((a, b) => b.viewCount - a.viewCount);
    return json({ videos });
  } catch (e) {
    return json({ error: `YouTube API 호출 실패: ${e.message}` }, 500);
  }
}
