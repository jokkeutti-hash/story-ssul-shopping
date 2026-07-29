export async function onRequest(context) {
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
