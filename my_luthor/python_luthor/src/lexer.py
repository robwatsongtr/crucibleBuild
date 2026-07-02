from .tokens import Token, TokenType

class Lexer:
    def __init__(self, stream):
        self.stream = stream
        self.pos = 0 

    single_char_map = {
        '+' : TokenType.PLUS,
        '-' : TokenType.MINUS,
        '*' : TokenType.MULTIPLY,
        '/' : TokenType.DIVIDE,
        '(' : TokenType.L_PARENS,
        ')' : TokenType.R_PARENS,
        '>' : TokenType.GREATER_THAN,
        '<' : TokenType.LESS_THAN,
    }

    def advance(self):
        self.pos += 1

    def peek(self):
        strmlen = len(self.stream)
        return self.stream[self.pos] if self.pos < strmlen else None
    
    def peek_next(self):
        strmlen = len(self.stream)
        return self.stream[self.pos + 1] if self.pos + 1 < strmlen else None

    
    def tokenize(self):
        tokens = []

        while(True):
            if self.peek() is None:
               tokens.append(Token(TokenType.EOF, "")) 

               return tokens 
            
            



    