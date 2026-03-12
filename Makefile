.PHONY: up down logs clean install dev

# Start Infrastructure (DB + Redis)
up:
	docker-compose up -d

# Stop Infrastructure
down:
	docker-compose down

# View Infrastructure Logs
logs:
	docker-compose logs -f

# Clean Infrastructure Volumes
clean:
	docker-compose down -v

# Run App Locally (Hot Reload)
dev:
	bun --hot src/index.ts

# Install Dependencies
install:
	bun install

# Lint
lint:
	bun run lint

# --- Redis Commands ---
redis-cli:
	docker exec -it support-redis redis-cli

redis-monitor:
	docker exec -it support-redis redis-cli MONITOR

redis-keys:
	docker exec -it support-redis redis-cli KEYS '*'

redis-queue-stats:
	@echo "Queue Stats:"
	@docker exec -it support-redis redis-cli LLEN bull:support-tickets:wait
	@docker exec -it support-redis redis-cli LLEN bull:support-tickets:active
	@docker exec -it support-redis redis-cli LLEN bull:support-tickets:completed
	@docker exec -it support-redis redis-cli LLEN bull:support-tickets:failed