function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

// Cloudflare Workers AI — 무료 티어(하루 Neurons 한도 내) 이미지 생성.
// env.AI 바인딩을 쓰므로 별도 API 키/토큰이 필요 없다 (wrangler.jsonc의 ai 바인딩으로 계정에 자동 연결됨).
export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const prompt = (body.prompt || "").slice(0, 2048);
  if (!prompt) return json({ error: "prompt가 필요합니다." }, 400);

  try {
    const response = await context.env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 8 });
    return json({ image: response.image });
  } catch (e) {
    return json({ error: `이미지 생성 실패: ${e.message}` }, 500);
  }
}
