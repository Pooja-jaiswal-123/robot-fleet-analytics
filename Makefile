.PHONY: up down logs rebuild ps clean

up:
	docker compose up -d --build
	@echo ""
	@echo "Dashboard:    http://localhost:8080"
	@echo "API docs:     http://localhost:8000/docs"
	@echo "ClickHouse:   http://localhost:8123 (intern/intern)"

down:
	docker compose down

logs:
	docker compose logs -f

rebuild:
	docker compose up -d --build --force-recreate

ps:
	docker compose ps

clean:
	docker compose down -v
