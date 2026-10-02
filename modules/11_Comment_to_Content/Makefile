.PHONY: dev backend frontend install test

dev:
	node scripts/start_dev.js

backend:
	python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

install:
	pip install -r backend/requirements.txt
	cd frontend && npm install

test:
	python backend/tests/test_pipeline.py
