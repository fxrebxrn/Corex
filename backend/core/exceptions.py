class AppError(Exception):
    status_code = 400
    detail = "Application error"

class InvalidTokenError(AppError):
    status_code = 401
    detail = "Invalid token"

class ExpiredTokenError(AppError):
    status_code = 401
    detail = "Token has expired"

class NotFoundError(AppError):
    status_code = 404
    detail = "Not found"

class UserNotFound(NotFoundError):
    status_code = 404
    detail = "User not found"
