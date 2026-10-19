# Provider Adapters and Honest ChatGPT Integration

## Why adapters are mandatory

The user's existing ChatGPT sign-in is a browser entitlement, not an authorized general-purpose API. Automating arbitrary ChatGPT web UI may be limited by current product behavior, terms, anti-abuse measures or login flow changes. **Do not build CHAI around an undocumented promise that a web tab will always programmatically generate and send messages.**

## Supported modes

| Mode | User input | Model execution | Automatic messages | Baseline status |
| --- | --- | --- | --- | --- |
| Mock | Local UI | deterministic fixtures | yes | required MVP |
| Local | Local UI | Ollama / LM Studio endpoint (opt-in) | yes, within actual local model abilities | recommended |
| Official API | Local UI | authorized API with BYOK | yes, per API policy/quotas | optional |
| ChatGPT interactive web | First-party ChatGPT browser pane | user's web ChatGPT session | **manual by default** | required MVP |
| ChatGPT compliant web adapter | User-controlled session | only if current provider behavior/rules permit reliable programmatic use | capability-gated | research + proof before enabling |

Three visible logical roles can exist even when only one provider is capable of automatic work. Label each role mode and availability. **Never** claim a worker is using a specific GPT model/effort without provider confirmation.

## Login rules

1. Load only official `https://chatgpt.com` origin in isolated partition and show origin.
2. User personally handles email/SSO/2FA/CAPTCHA on the legitimate provider page.
3. CHAI must not present an imitation ChatGPT password screen or solicit credentials into its own chat.
4. If provider prohibits embedded login or third-party contexts, provide an explicitly limited external-browser/manual handoff. Do not import external Chrome cookies or tamper with provider safeguards.
5. Session may expire; on `AUTH_REQUIRED` pause dependent work and notify user.
6. Preserve queued task work locally without creating alternate accounts to evade quotas.

## Provider capability interface

Implement the contract in `docs/STATE_PROTOCOL.md`. Provider declares `canSendProgrammatically`, `canReceiveProgrammatically`, `canStream`, `canResumeConversation`, `canSelectModel`, `canSelectEffort`, auth state and rate/quota status. Renderer uses actual capabilities for controls. Unsupported capabilities must produce typed error and clear UI.

### ChatGPT-web worker proof gate

Before setting `compliant-web` enabled:

- [ ] Review current published provider policies and allowed automation/integration methods (link and date recorded in repo).
- [ ] Show user consent and browser session boundaries.
- [ ] Verify login and navigation on real Kali without accessing cookies/passwords programmatically.
- [ ] Prove sending and receiving in permitted way over repeated sessions, not one hardcoded DOM demo.
- [ ] Test interruption, SSO challenge, provider limit, model picker updates, connection drops and logout.
- [ ] Confirm the app never routes through multiple sessions to circumvent provider policy.
- [ ] Publish limitations in docs and UI. If any gate fails, mark unsupported and continue using supported modes.

## Worker delegation

The local manager schedules jobs to adapters; the adapter isn't itself the permission authority. A model's response is only a **proposal**. Workers receive limited context, produce typed work results, and invoke only named tool capabilities through CHAI's validated gateway. Store correlation IDs/evidence for all handoffs. Do not silently paste sensitive files into an external chat session.

## Economic constraints

- Mock is free/offline, useful for real orchestration tests but does not provide open-ended intelligence.
- Local model adapters are free of per-call API fees but require user's compute, memory and an installed model; performance varies.
- API adapters may incur fees; opt-in and show user cost limits/settings.
- Browser ChatGPT usage remains bound to account/provider rules, subscriptions and limits; CHAI cannot promise unlimited tokens, hours, or background usage simply by opening three windows.

## Failure states and UX copy

- `Interactive only — ChatGPT is available to use manually in this pane. Autonomous model messaging is not enabled.`
- `Waiting for login — Please finish signing in directly on chatgpt.com.`
- `Waiting for provider — Your task and progress are saved locally. You can resume when service is available or switch to a configured provider.`
- `Rate limited — CHAI will not bypass the provider's usage limit.`
- `Local model unavailable — Start your configured local provider or choose Mock mode.`

## Future research

Watch for official product/API integrations that support delegated execution without browser scraping. Validate developer terms at implementation time, not from hardcoded assumptions in a 2026 prompt package.

## Verified policy boundary — 2026-10-19

Reviewed https://openai.com/policies/terms-of-use/ (effective January 1, 2026). Its usage restrictions include automated/programmatic output extraction and circumvention of limits. CHAI therefore ships no DOM-scraping ChatGPT worker or automated session-rotation transport. Its ChatGPT mode is manual interaction plus user-pasted structured plans. Local Ollama is a separate adapter, not a ChatGPT subscription feature.
