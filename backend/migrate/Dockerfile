FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY ../go.mod .
COPY ../go.sum .
RUN go mod download
    
COPY ../migrate ./migrate
COPY ../db ./db
COPY ../internal ./internal
COPY ../logger ./logger
COPY ../errorutil ./errorutil

RUN go build -o /app/migrate/cmd/migrate ./migrate/cmd

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/migrate/cmd/migrate .
ENTRYPOINT ["./app/migrate/cmd/migrate"]
