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

    # state transition for two character tokens 
    multi_start = ['<', '>', '=', '!']

    keyword_map = {
        'know' : TokenType.KNOW,
        'suppose' : TokenType.SUPPOSE,
        'otherwise' : TokenType.OTHERWISE,
        'end' : TokenType.END,
        'doom' : TokenType.DOOM,
        'crime' : TokenType.CRIME
    }

    def advance(self):
        self.pos += 1

    def advance_twice(self):
        self.pos += 2 
    
    def peek(self):
        if self.pos < len(self.stream): 
            return self.stream[self.pos]
        else:
            return None # reached end of input 
        
    def peek_next(self):
        if self.pos + 1 < len(self.stream): 
            return self.stream[self.pos + 1]
        else:
            return None 
        
    def tokenize(self):
        tokens = []

        while True:
            # EOF
            if self.peek() is None:
                token = Token("", TokenType.EOF)
                tokens.append(token)

                # we're done!
                return tokens
            
            # handle whitespace
            elif self.peek().isspace():
                self.advance()

            # multi character comparison tokens 
            elif self.peek() in self.multi_start and self.peek_next() == '=':
                if self.peek() == '<':
                    lexeme = '<='
                    token = Token(lexeme, TokenType.LESS_THAN_EQUAL)
                    tokens.append(token)
                    self.advance_twice()
                elif self.peek() == '>':
                    lexeme = '>='
                    token = Token(lexeme, TokenType.GREATER_THAN_EQUAL)
                    tokens.append(token)
                    self.advance_twice()
                elif self.peek() == '=':
                    lexeme = '=='
                    token = Token(lexeme, TokenType.EQUAL_TO)
                    tokens.append(token)
                    self.advance_twice()
                elif self.peek() == '!':
                    lexeme = '!='
                    token = Token(lexeme, TokenType.NOT_EQUAL)
                    tokens.append(token)
                    self.advance_twice()

            # single character tokens 
            elif self.peek() in self.single_char_map:
                t_type = self.single_char_map.get(self.peek())
                lexeme = self.peek()
                token = Token(lexeme, t_type)
                tokens.append(token)
                self.advance()

            # Words: keywords or identifiers 
            elif self.peek().isalpha():
                word = ''

                while self.peek() is not None and (
                    self.peek().isalnum() or self.peek() == '_'
                ):
                    word += self.peek()
                    self.advance()

                if word in self.keyword_map:
                    keyword_t = self.keyword_map.get(word)
                    token = Token(word, keyword_t)
                else:
                    token = Token(word, TokenType.IDENTIFIER)
            
                tokens.append(token)

            # handle numbers 
            elif self.peek().isdigit():
                digits = ''

                while self.peek() is not None and self.peek().isdigit(): 
                    digits += self.peek()
                    self.advance()

                token = Token(digits, TokenType.NUMBER)
                tokens.append(token)
                # no self.advance() needed because already in loop 

            else:
                raise ValueError(
                    f"Unexpected character(s) starting with '{self.peek()}' at {self.pos}"
                )