FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY ../go.mod .
COPY ../go.sum .
RUN go mod download
    
COPY . ./api
COPY ../db ./db
COPY ../internal ./internal
COPY ../logger ./logger
COPY ../errorutil ./errorutil

RUN go build -o /api/cmd/api ./api/cmd

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /api/cmd/api .
EXPOSE 8080
