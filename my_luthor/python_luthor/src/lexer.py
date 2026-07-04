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

    keyword_map = {
        'know' : TokenType.KNOW,
        'suppose' : TokenType.SUPPOSE,
        'otherwise' : TokenType.OTHERWISE,
        'end' : TokenType.END,
        'doom' : TokenType.DOOM,
        'crime' : TokenType.CRIME
    }

    multi_start = ['<', '>', '=', '!']

    def advance(self):
        self.pos += 1

    def advance_twice(self):
        self.pos += 2

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
            
            elif self.peek().isspace():
                self.advance()

            elif self.peek() in self.multi_start and self.peek_next() == '=':
                if self.peek() == '<':
                    lexeme = '<='
                    token = Token(TokenType.LESS_THAN_EQUAL, lexeme)
                    tokens.append(token)
                    self.advance_twice()
                elif self.peek() == '>':
                    lexeme = '>='
                    token = Token(TokenType.GREATER_THAN_EQUAL, lexeme)
                    tokens.append(token)
                    self.advance_twice()
                elif self.peek() == '!':
                    lexeme = '!='
                    token = Token(TokenType.NOT_EQUAL, lexeme)
                    tokens.append(token)
                    self.advance_twice()
                else:
                    lexeme = '=='
                    token = Token(TokenType.EQUAL_TO, lexeme)
                    tokens.append(token)
                    self.advance_twice()

            elif self.peek() in self.single_char_map:
                t_type = self.single_char_map.get(self.peek())
                lexeme = self.peek()
                token = Token(t_type, lexeme)
                tokens.append(token)
                self.advance()

            elif self.peek().isalpha():
                word = ''
                while self.peek() is not None and (
                    self.peek().isalnum() or self.peek() == '_'
                ):
                    word += self.peek()
                    self.advance()

                if word in self.keyword_map:
                    tokens.append( Token(self.keyword_map.get(word), word) )
                else:
                    tokens.append( Token(TokenType.IDENTIFIER, word) )

            elif self.peek().isdigit():
                number = ''
                while self.peek() is not None and self.peek().isdigit():
                    number += self.peek()
                    self.advance()

                tokens.append( Token(TokenType.NUMBER, number) )
            
            else:
                raise ValueError(
                    f"Unexpected character(s) starting with '{self.peek()}' at {self.pos}"
                )


