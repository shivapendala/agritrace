.PHONY: start build test

start:
	@echo "Starting backend and frontend..."
	docker-compose up -d

build:
	@echo "Building backend and frontend..."
	docker-compose build

test:
	@echo "Running tests..."
	cd backend && pytest
