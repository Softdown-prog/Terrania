FROM golang:1.23-alpine AS build
WORKDIR /src
COPY server-go/go.mod ./
RUN go mod download
COPY server-go/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/terrania-go ./cmd/terrania

FROM alpine:3.21
RUN addgroup -S terrania && adduser -S -G terrania terrania
COPY --from=build /out/terrania-go /usr/local/bin/terrania-go
USER terrania
ENV PORT=8788 NODE_ENV=production
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/usr/local/bin/terrania-go", "--healthcheck"]
ENTRYPOINT ["/usr/local/bin/terrania-go"]
