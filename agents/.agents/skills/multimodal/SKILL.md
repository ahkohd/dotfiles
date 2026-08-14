---
name: multimodal
description: Use when you cannot inspect media directly and the user provides images, screenshots, image-heavy PDFs, or video frames. Send each image blob to the configured multimodal alternate, read its response, then continue using that response as context.
---

# Multimodal fallback

```text
image -> alternate -> context for you
```

## Image

```bash
IMG=/path/to/image.png
MIME=$(file -b --mime-type "$IMG")
B64=$(base64 < "$IMG" | tr -d '\n')

curl -fsS https://llm.victor.computer/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d @- <<JSON | jq -r '.choices[0].message.content'
{
  "model": "alternate",
  "reasoning_effort": "none",
  "chat_template_kwargs": {"enable_thinking": false, "preserve_thinking": false},
  "messages": [{
    "role": "user",
    "content": [
      {"type": "image_url", "image_url": {"url": "data:$MIME;base64,$B64"}},
      {"type": "text", "text": "Describe this image concisely and factually."}
    ]
  }]
}
JSON
```

Read the response, then continue the user's task.

## Audio

The alternate is vision-only. Do not send it audio. Use configured local speech-to-text. If none is available, say so.

## If unavailable

Say the local alternate is unavailable. Ask whether to wait, use a cloud model, or continue from the user's description.

Do not silently send private media to cloud providers.
