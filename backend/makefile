# Variables
REGISTRY ?= sanjayapradeep
PROJECT_NAME = timetracker
VERSION ?= latest
COMMIT_SHA = $(shell git rev-parse --short HEAD)

# Image names
API_IMAGE = $(REGISTRY)/$(PROJECT_NAME)
MIGRATE_IMAGE = $(REGISTRY)/$(PROJECT_NAME)

# Docker build context (current directory)
BUILD_CONTEXT = .

.PHONY: help build build-api-image build-migrate-image build-images push push-api push-migrate clean run-local stop-local test

# Default target
help:
	@echo "Available targets:"
	@echo "  build          - Build Go binaries locally"
	@echo "  build-images   - Build both API and migrate Docker images"
	@echo "  build-images-with-commit-sha   - Build both API and migrate Docker images with commit SHA tag"
	@echo "  build-api-image   - Build API Docker image"
	@echo "  build-migrate-image - Build migrate Docker image"
	@echo "  build-api-image-with-commit-sha:   - Build API Docker image with commit SHA tag"
	@echo "  build-migrate-image-with-commit-sha:   - Build migrate Docker image with commit SHA tag"
	@echo "  push           - Push both images to registry"
	@echo "  push-api       - Push API image to registry"
	@echo "  push-migrate   - Push migrate image to registry"
	@echo "  tag-latest     - Tag both images as latest"
	@echo "  run-local      - Run local development with docker-compose"
	@echo "  stop-local     - Stop local development containers"
	@echo "  clean          - Remove local images"
	@echo ""
	@echo "Variables:"
	@echo "  REGISTRY       - Docker registry (default: localhost:5000)"
	@echo "  VERSION        - Image version tag (default: latest)"
	@echo "  COMMIT_SHA     - Git commit SHA (auto-detected)"

# Build Go binaries locally
build: 
	@echo "Building API binary..."
	go build -o ./api/cmd/api ./api/cmd
	@echo "Building migrate binary..."
	go build -o ./migrate/cmd/migrate ./migrate/cmd

# Build Docker images
build-images: build-api-image build-migrate-image

build-api-image:
	@echo "Building API image..."
	docker build -t $(API_IMAGE):api-$(VERSION) -f api/Dockerfile $(BUILD_CONTEXT)

build-migrate-image:
	@echo "Building migrate image..."
	docker build -t $(MIGRATE_IMAGE):migrate-$(VERSION) -f migrate/Dockerfile $(BUILD_CONTEXT)

# Build Docker images with commit SHA tags
build-images-with-commit-sha: build-api-image build-migrate-image

build-api-image-with-commit-sha:
	@echo "Building API image..."
	docker build -t $(API_IMAGE):api-$(COMMIT_SHA) -f api/Dockerfile $(BUILD_CONTEXT)

build-migrate-image-with-commit-sha:
	@echo "Building migrate image..."
	docker build -t $(MIGRATE_IMAGE):migrate-$(COMMIT_SHA) -f migrate/Dockerfile $(BUILD_CONTEXT)

# Push targets
push: push-api push-migrate

push-api:
	@echo "Pushing API image..."
	docker push $(API_IMAGE):api-$(VERSION)
	docker push $(API_IMAGE):api-$(COMMIT_SHA)

push-migrate:
	@echo "Pushing migrate image..."
	docker push $(MIGRATE_IMAGE):migrate-$(VERSION)
	docker push $(MIGRATE_IMAGE):migrate-$(COMMIT_SHA)

# Tag as latest
tag-latest:
	docker tag $(API_IMAGE):api-$(VERSION) $(API_IMAGE):latest
	docker tag $(MIGRATE_IMAGE):migrate-$(VERSION) $(MIGRATE_IMAGE):latest

# Local development
run-local:
	@echo "Starting local development environment..."
	docker-compose up -d db
	@echo "Waiting for database to be ready..."
	sleep 10
	docker-compose run --rm migrate
	docker-compose up -d api

stop-local:
	@echo "Stopping local development environment..."
	docker-compose down

# Cleanup
clean:
	@echo "Removing local images..."
	docker rmi $(API_IMAGE):$(VERSION) $(API_IMAGE):$(COMMIT_SHA) || true
	docker rmi $(MIGRATE_IMAGE):$(VERSION) $(MIGRATE_IMAGE):$(COMMIT_SHA) || true
	docker image prune -f

# Test
test:
	@echo "Running tests..."
	go test ./...

# Build and push workflow
release: build-images tag-latest push
	@echo "Release complete: $(VERSION) and $(COMMIT_SHA)"

# Development workflow
dev: build run-local
	@echo "Development environment ready"

# Complete workflow with images
dev-images: build-images run-local
	@echo "Development environment ready with Docker images"