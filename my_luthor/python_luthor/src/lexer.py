from .tokens import Token, TokenType

class Lexer:
    def __init__(self, stream):
        self.stream = stream
        self.pos = 0 

    