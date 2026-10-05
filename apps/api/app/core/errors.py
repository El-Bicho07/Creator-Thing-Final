from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict | None = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class AIProviderError(AppError):
    def __init__(self, message: str = "AI provider error", details: dict | None = None):
        super().__init__("AI_PROVIDER_ERROR", message, status.HTTP_502_BAD_GATEWAY, details)


class AIRateLimitError(AppError):
    def __init__(self, message: str = "AI rate limit exceeded", details: dict | None = None):
        super().__init__("AI_RATE_LIMIT", message, status.HTTP_429_TOO_MANY_REQUESTS, details)


class AITimeoutError(AppError):
    def __init__(self, message: str = "AI request timeout", details: dict | None = None):
        super().__init__("AI_TIMEOUT", message, status.HTTP_504_GATEWAY_TIMEOUT, details)


class InvalidGenerationError(AppError):
    def __init__(self, message: str = "Invalid AI generation", details: dict | None = None):
        super().__init__("INVALID_GENERATION", message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class AuthenticationRequiredError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__("AUTH_REQUIRED", message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access denied"):
        super().__init__("FORBIDDEN", message, status.HTTP_403_FORBIDDEN)


class ResourceNotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__("RESOURCE_NOT_FOUND", message, status.HTTP_404_NOT_FOUND)


class JobFailedError(AppError):
    def __init__(self, message: str = "Background job failed", details: dict | None = None):
        super().__init__("JOB_FAILED", message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation error", details: dict | None = None):
        super().__init__("VALIDATION_ERROR", message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        logger.warning(f"AppError: {exc.code} - {exc.message}", extra={"details": exc.details})
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        logger.warning(f"ValidationError: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": exc.errors()
                }
            }
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        logger.error(f"IntegrityError: {exc}")
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "CONFLICT",
                    "message": "Data integrity violation",
                    "details": {}
                }
            }
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred"
                }
            }
        )