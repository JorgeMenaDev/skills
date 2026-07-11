# Per-phase Docker sandbox image (local mini and hosted cloud runners).
# Build: docker build -t {{IMAGE_NAME}} .sandcastle/
# Canonical sandbox image (bun app tooling + agent-browser + Chromium).
FROM node:22-bookworm

ARG AGENT_UID=1000
ARG AGENT_GID=1000
LABEL dev.hermes.afk-pipeline.version="{{AFK_VERSION}}" \
  dev.hermes.afk-pipeline.agent-uid="$AGENT_UID" \
  dev.hermes.afk-pipeline.agent-gid="$AGENT_GID"

RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  ripgrep \
  ca-certificates \
  unzip \
  python3 \
  # Browser for agent-browser: Chrome for Testing has no linux/arm64 builds,
  # so on this (Apple Silicon) image we use Debian's chromium instead.
  chromium \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libasound2 \
  libxkbcommon0 \
  libgtk-3-0 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libcairo2 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libx11-xcb1 \
  libxcursor1 \
  libxi6 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  fonts-liberation \
  fonts-noto-color-emoji \
  fonts-noto-cjk \
  fonts-freefont-ttf \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash \
  && cp /root/.bun/bin/bun /usr/local/bin/bun \
  && cp /root/.bun/bin/bunx /usr/local/bin/bunx \
  && chmod +x /usr/local/bin/bun /usr/local/bin/bunx

# agent-browser + Codex CLIs (native binaries fetched by npm postinstall)
RUN npm install -g agent-browser @openai/codex

RUN groupmod -o -g "$AGENT_GID" -n agent node \
  && usermod -o -u "$AGENT_UID" -d /home/agent -m -l agent -g "$AGENT_GID" node \
  && touch /home/agent/.gitconfig \
  && chown -R agent:agent /home/agent \
  && chmod -R a+rwX /home/agent

USER ${AGENT_UID}:${AGENT_GID}
WORKDIR /home/agent

# Claude Code CLI (as the agent user → /home/agent/.local/bin)
RUN curl -fsSL https://claude.ai/install.sh | bash
# Cursor is optional and cloud-only. Claude/Codex image builds must not depend
# on Cursor's installer/CDN; the workflow enables this layer only for
# `engine: cursor` on the hosted `agent:implement` lane.
ARG INSTALL_CURSOR=0
RUN if [ "$INSTALL_CURSOR" = "1" ]; then curl -fsS https://cursor.com/install | bash; fi
ENV PATH="/home/agent/.local/bin:${PATH}"

# Sandcastle matches the container process to the runner UID/GID so bind mounts
# and hosted auth remain usable. Normalize permissions *after* both installers,
# which create new 0755-owned directories under /home/agent.
USER root
RUN chmod -R a+rwX /home/agent
USER ${AGENT_UID}:${AGENT_GID}

# Point agent-browser at the system chromium (no Chrome-for-Testing on arm64).
ENV AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium

# agent-browser auto-appends --no-sandbox to Chrome when CI is set — required
# for headless Chrome under Docker's default seccomp profile.
ENV CI=true

ENTRYPOINT ["sleep", "infinity"]
