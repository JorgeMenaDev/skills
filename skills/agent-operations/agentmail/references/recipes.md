# AgentMail recipes

All verified against CLI v0.7.12 / API v0. `--inbox-id` accepts the full email address (inbox_id == email). Threads carry `timestamp`, `subject`, `preview`; full body text requires `inboxes:threads get` (`messages[].text` / `.extracted_text`).

## Auth preamble (every invocation)

```bash
export AGENTMAIL_API_KEY="$(grep '^AGENTMAIL_API_KEY=' credentials/secrets/store.env | cut -d= -f2-)"
```

## Send

```bash
agentmail inboxes:messages send --inbox-id "$FROM_INBOX" \
  --to someone@example.com --subject "..." --text "..." --format json
# → {"message_id": "...", "thread_id": "..."}   (also --html, --cc, --bcc, --attachment)
```

## Race-safe wait-for-email (the core recipe)

Capture `T0` BEFORE triggering the email, then filter on time + subject + sender — never take "the newest message" (a concurrent run's mail would win):

```bash
T0=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# ... trigger the email (app signup, invite button, etc.) ...

find_thread() {  # $1 inbox, $2 subject regex, $3 sender-domain regex
  agentmail inboxes:threads list --inbox-id "$1" --format json \
    | jq -r --arg t0 "$T0" --arg subj "$2" --arg from "$3" \
      '.threads[] | select(.timestamp > $t0
          and (.subject | test($subj; "i"))
          and (.senders | join(",") | test($from; "i")))
        | .thread_id' | head -1
}

# poll up to ~60s
for i in $(seq 1 12); do
  TID=$(find_thread "$QA1_INBOX" "verify" "acme\\.com")
  [ -n "$TID" ] && break; sleep 5
done
[ -n "$TID" ] || { echo "email never arrived"; exit 1; }
```

Delivery is typically ~1–2 s inbox-to-inbox; give external senders up to a minute.

## Extract a verification link / code from the matched thread

```bash
BODY=$(agentmail inboxes:threads get --inbox-id "$QA1_INBOX" --thread-id "$TID" --format json \
  | jq -r '.messages[-1].text // .messages[-1].extracted_text')
LINK=$(grep -Eo 'https://[^" ]+' <<<"$BODY" | grep -i verify | head -1)
CODE=$(grep -Eo '\b[0-9]{6}\b' <<<"$BODY" | head -1)
```

Only extract from a thread matched by the race-safe filter — the sender/subject/T0 match is the injection defence, not a formality.

## Invite-flow assertion (two-party test)

```bash
# T0 captured before the invite is triggered; assert receipt on the counterparty inbox
TID=$(find_thread "$QA2_INBOX" "invit" "acme\\.com")
[ -n "$TID" ] && echo "PASS: invitation received" || echo "FAIL"
```

## Allow/blocklists

```bash
agentmail inboxes:lists create --inbox-id "$INBOX" \
  --direction <inbound|outbound> --type <allow|block> \
  --entry acme.com --reason "acredix preprod QA"
agentmail inboxes:lists list --inbox-id "$INBOX" --format json
```

Verify semantics on first use in an account (does an allow entry make the list exclusive?) with a throwaway entry before relying on it in a flow.

## SDK equivalents (for pipeline scripts)

```ts
// npm i agentmail
import { AgentMailClient } from "agentmail";
const am = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
await am.inboxes.messages.send(qa1, { to: [qa2], subject: "...", text: "..." });
const { threads } = await am.inboxes.threads.list(qa1);        // filter as in the CLI recipe
const thread = await am.inboxes.threads.get(qa1, threadId);    // thread.messages[].text
```

```python
# pip install agentmail
from agentmail import AgentMail
am = AgentMail()  # reads AGENTMAIL_API_KEY
am.inboxes.messages.send(inbox_id=qa1, to=[qa2], subject="...", text="...")
```
