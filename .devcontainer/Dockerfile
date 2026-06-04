FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

COPY .node-version /tmp/.node-version

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libudev-dev \
        python3 \
        python3-setuptools \
        ca-certificates \
        curl \
        xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && NODE_VERSION_RAW="$(cat /tmp/.node-version)" \
    && NODE_VERSION="${NODE_VERSION_RAW#v}" \
    && ARCH="$(dpkg --print-architecture)" \
    && case "$ARCH" in \
        amd64) NODE_ARCH='x64' ;; \
        arm64) NODE_ARCH='arm64' ;; \
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
       esac \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -o /tmp/node.tar.xz \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o /tmp/SHASUMS256.txt \
    && grep "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" /tmp/SHASUMS256.txt | sha256sum --check --status \
    && rm -f /tmp/SHASUMS256.txt \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner \
    && rm -f /tmp/node.tar.xz \
    && corepack enable \
    && node --version \
    && npm --version \
    && corepack --version \
    && rm -f /tmp/.node-version
