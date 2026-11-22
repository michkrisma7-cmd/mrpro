#!/bin/sh
# Jalankan di VPS: sh build.sh  → vet + tes + kompilasi di container golang
# sekali pakai (RAM dibatasi 512 MB), lalu image scratch chatbot-mrp:<tanggal>.
set -eu
cd "$(dirname "$0")"
TAG="${1:-$(date +%Y%m%d-%H%M)}"
mkdir -p bin
docker run --rm --memory=512m --cpus=1 -v "$PWD":/src -w /src \
  -e CGO_ENABLED=0 -e GOFLAGS=-buildvcs=false golang:1.25-alpine sh -c '
  go vet ./... && go test -count=1 ./... &&
  go build -trimpath -ldflags="-s -w" -o bin/chatbot-mrp . &&
  cp /etc/ssl/certs/ca-certificates.crt bin/'
docker build -q -t "chatbot-mrp:$TAG" -t chatbot-mrp:latest -f Dockerfile bin
echo "image: chatbot-mrp:$TAG"
