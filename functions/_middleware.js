export async function onRequest(context) {
  return context.next(); // TEMP: Basic Auth 임시 비활성화 — 배포 확인 후 이 줄만 지우면 원복
  // eslint-disable-next-line no-unreachable
  const auth = context.request.headers.get("Authorization");
  const user = context.env.BASIC_AUTH_USER;
  const pass = context.env.BASIC_AUTH_PASS;

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [reqUser, reqPass] = atob(encoded).split(":");
      if (reqUser === user && reqPass === pass) {
        return context.next();
      }
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Storyboard Studio"' },
  });
}
