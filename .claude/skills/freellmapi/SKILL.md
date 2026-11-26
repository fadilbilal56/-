---
name: freellmapi
description: >
  Set up and use FreeLLMAPI, a self-hosted router that puts the free tiers of many LLM
  providers (Google, Groq, Cerebras, OpenRouter and more) behind one OpenAI-compatible
  endpoint and switches to the next provider automatically when one hits its rate limit.
  Use when the user wants free or cheap LLM API access, says "FreeLLMAPI", "free LLM API",
  "تبديل تلقائي", "API مجاني", wants to cut API costs, or wants an app or script to call
  an LLM without paying.
metadata:
  homepage: https://github.com/tashfeenahmed/freellmapi
---

# FreeLLMAPI

One local endpoint (`http://localhost:3001/v1`, OpenAI-compatible) in front of many free
provider keys. The router picks a model, falls over to the next provider on a rate limit,
and tracks each key's usage so it stays under every free cap.

## Install (needs Docker)

Show the user the script before running it, and run it only once they agree:
`https://freellmapi.co/install.sh` (sets up `~/freellmapi`, makes an encryption key,
pulls the image, starts the container). Then:

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
```

Other paths (Docker Compose, local dev, desktop app for macOS/Windows):
https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md

## After install: what the user must do (never do it for them)

1. Open http://localhost:3001.
2. **Keys** page: add their own free keys from each provider they signed up for.
   Never ask for keys in the chat; they paste them into the dashboard themselves.
3. Reorder the **Fallback Chain** if they want.
4. Copy the **unified key** from the Keys page header. That is the only key apps need.

## Use it

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:3001/v1", api_key="<unified key>")
r = client.chat.completions.create(
    model="auto",   # or "auto:fast", "auto:smart", or a model id
    messages=[{"role": "user", "content": "Hello"}],
)
print(r.choices[0].message.content)
```

- Read the key from an environment variable, never hard-code it in committed code.
- Each response has an `X-Routed-Via: <platform>/<model>` header showing who served it.
- Streaming, tool calling, vision, embeddings and an Anthropic Messages endpoint are
  documented in `docs/en/api/01-rest-api.md` in the repo.

## Tell the user plainly

- Free tiers are smaller, slower models with changing limits; fine for drafts, bulk
  and side projects, not a replacement for a strong model on hard or sensitive work.
- Prompts go to whichever third-party provider serves them: never send patient data
  or other confidential information through it.
