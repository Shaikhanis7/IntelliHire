# FILE 1 — src/core/exceptions/auth_exceptions.py
# ═══════════════════════════════════════════════════════════════════════════════
#
# Messages are intentionally keyword-matched to AuthPage.tsx error handlers:
#
#  Frontend login check:
#    'password' | 'credential' | 'invalid' | '401' | 'unauthorized'
#      → "Incorrect email or password. Please try again."
#    'not found' | 'user'
#      → "No account found with this email address."
#    'network' | 'fetch'
#      → "Connection error..."
#
#  Frontend signup check:
#    'email' | 'exists' | 'already'
#      → "An account with this email already exists. Try signing in instead."
#    'network' | 'fetch'
#      → "Connection error..."
 
class UserAlreadyExists(Exception):
    def __init__(self, message: str = "An account with this email already exists."):
        self.message = message
        super().__init__(self.message)
 
 
class InvalidCredentials(Exception):
    def __init__(self, message: str = "Invalid email or password."):
        # Keyword 'invalid' triggers the correct branch in LoginForm
        self.message = message
        super().__init__(self.message)
 
 
class InvalidToken(Exception):
    def __init__(self, message: str = "Invalid or expired token."):
        self.message = message
        super().__init__(self.message)
 
 
class UserNotFound(Exception):
    def __init__(self, message: str = "No account found with this email address."):
        # Keyword 'not found' triggers the correct branch in LoginForm
        self.message = message
        super().__init__(self.message)
 