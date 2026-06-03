from enum import Enum, auto

class TokenType(Enum):
    # single char symbols 
    PLUS = auto()
    MINUS = auto()
    MULTIPLY = auto()
    DIVIDE = auto()
    L_PARENS = auto()
    R_PARENS = auto()
    LESS_THAN = auto()
    GREATER_THAN = auto()
    
    # multi char symbols
    LESS_THAN_EQUAL = auto() # <= 
    GREATER_THAN_EQUAL = auto() # >=
    EQUAL_TO = auto() # ==
    NOT_EQUAL = auto() # != 

    # value carrying tokens 
    NUMBER = auto()
    IDENTIFIER = auto()

    # keywords 
    KNOW = auto() # assignment
    SUPPOSE = auto()  # if
    DOOM = auto() # print 
    CRIME = auto() # while 

    OTHERWISE = auto()  # else
    END = auto() # block delimiter
    
    EOF = auto()


class Token:
    def __init__(self, lexeme, token_type):
        self.token_type = token_type
        self.lexeme = lexeme 

    def __repr__(self):
        return f"Token(token_type='{self.token_type}', lexeme='{self.lexeme}')"