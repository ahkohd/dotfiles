---
name: multimodal
description: Use when you cannot inspect media directly and the user provides images, screenshots, image-heavy PDFs, video, or audio. Send the media blob to the configured multimodal alt model, read its response, then continue the task using that response as context.
---

# Multimodal fallback

```text
media -> alternate -> context for you
```

## Image

```bash
IMG=/path/to/image.png
B64=$(base64 < "$IMG" | tr -d '\n')

curl -s https://llm.victor.computer/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d @- <<JSON | jq -r '.choices[0].message.content'
{
  "model": "alternate",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "Describe this image concisely and factually."},
      {"type": "image_url", "image_url": {"url": "data:image/png;base64,$B64"}}
    ]
  }]
}
JSON
```

Read the response, then continue the user's task.

## Audio

```bash
AUDIO=/path/to/audio.wav
B64=$(base64 < "$AUDIO" | tr -d '\n')

curl -s https://llm.victor.computer/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d @- <<JSON | jq -r '.choices[0].message.content'
{
  "model": "alternate",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "Transcribe this audio. Return only the transcript."},
      {"type": "input_audio", "input_audio": {"data": "$B64", "format": "wav"}}
    ]
  }]
}
JSON
```

Read the transcript, then continue the user's task.

## If unavailable

Say the local alternate is unavailable. Ask whether to wait, use a cloud model, or continue from the user's description.

Do not silently send private media to cloud providers.
