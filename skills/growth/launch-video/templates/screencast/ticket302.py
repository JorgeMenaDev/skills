# One-shot loopback redirect: mints a 60 s Clerk sign-in token for one user and 302s to Andy's sign-in.
# Keeps the ticket out of the agent's tool calls. Exits after one request.
import os, json, urllib.request, http.server, urllib.parse, sys
USER, REDIR = sys.argv[1], sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        req = urllib.request.Request("https://api.clerk.com/v1/sign_in_tokens", method="POST",
            data=json.dumps({"user_id": USER, "expires_in_seconds": 60}).encode(),
            headers={"Authorization": "Bearer " + os.environ["K"], "Content-Type": "application/json", "User-Agent": "matias-launch-video/1.0"})
        tok = json.load(urllib.request.urlopen(req))["token"]
        q = urllib.parse.urlencode({"__clerk_ticket": tok, "redirect_url": REDIR})
        self.send_response(302); self.send_header("Location", "https://app.andypartner.com/en/sign-in?" + q); self.end_headers()
        raise SystemExit
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", 47651), H).handle_request()
