FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY ../go.mod .
COPY ../go.sum .
RUN go mod download
    
COPY ../api ./api
COPY ../db ./db
COPY ../internal ./internal
COPY ../logger ./logger
COPY ../errorutil ./errorutil

RUN go build -o ./api/cmd/api ./api/cmd

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/api/cmd/api .
EXPOSE 8080
ENTRYPOINT ["./app/api/cmd/api"]
