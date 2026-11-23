# Image dari biner yang sudah dikompilasi oleh build.sh (scratch: tanpa OS, ±8 MB).
FROM scratch
COPY ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY chatbot-mrp /chatbot-mrp
USER 65534:65534
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/chatbot-mrp", "-health"]
ENTRYPOINT ["/chatbot-mrp"]
