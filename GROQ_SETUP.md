
# Groq Integration Guide

This project now supports **Groq** as an alternative LLM provider for faster inference.

## Setup

1. Get your Groq API keys from [Groq Console](https://console.groq.com/).
2. Add them to your `.env.local` file (or Vercel environment variables):

```bash
GROQ_KEY_1=gsk_your_key_here_1
GROQ_KEY_2=gsk_your_key_here_2
GROQ_KEY_3=gsk_your_key_here_3
```

You can add up to 3 keys for rotation.

## Models Used

- **Primary**: `llama-3.3-70b-versatile` (High quality, standard rate limits)
- **Secondary**: `llama-3.1-8b-instant` (Faster, higher rate limits, fallback)

## Usage

1. Open the application.
2. Select **Groq Llama** from the provider dropdown.
3. Click **Generate Diagram**.
