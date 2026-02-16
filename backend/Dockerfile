# Builder stage
FROM ubuntu:22.04 AS build

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential cmake libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . /src

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release

# Runtime stage
FROM ubuntu:22.04 AS runtime
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      libpq5 && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd --system hoa && \
    useradd --system --gid hoa --home /app --shell /usr/sbin/nologin hoa

WORKDIR /app
COPY --from=build /src/build/hoa_backend /app/hoa_backend
COPY documents /app/documents
RUN chown -R hoa:hoa /app

USER hoa

ENV PORT=8080

EXPOSE 8080
CMD ["./hoa_backend"]
