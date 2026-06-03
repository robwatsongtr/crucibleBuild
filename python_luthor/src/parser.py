from .tokens import TokenType
from .nodes import ( 
    BinaryOpNode, 
    NumberNode, 
    IdentifierNode, 
    AssignNode,
    BlockNode,
    ConditionalNode,
    PrintNode,
    WhileNode,
    ProgramNode,
    UnaryOpNode 
)

class Parser:
    def __init__(self, token_stream):
        self.tok_stream = token_stream
        self.tok_pos = 0

    comparison_tokens = [
        TokenType.LESS_THAN, 
        TokenType.GREATER_THAN, 
        TokenType.LESS_THAN_EQUAL, 
        TokenType.GREATER_THAN_EQUAL, 
        TokenType.EQUAL_TO, 
        TokenType.NOT_EQUAL
    ]

    def advance(self):
        self.tok_pos += 1

    def token_peek(self):
        token = self.tok_stream[self.tok_pos]

        return token if token.token_type != TokenType.EOF else None 

    def consume(self, expected_token):
        # safe for caller if you don't check for none in caller's method 
        if self.token_peek() is None:
            raise ValueError(
                f"Unexpected end of input at {self.tok_pos}"
            )

        token = self.token_peek() 

        # actual check for the grammar validaion 
        if token.token_type == expected_token:
            self.advance()

            return token 
        else:
            raise ValueError(
                f"Unexpected token '{token.token_type}' at {self.tok_pos}"
            )

    # ------------------------ Grammar methods -----------------------------
    # --------------------------------------------------------------------
    # (the grammar is the validaion logic)


    # Enter and exit. This is a loop over statements that assembles the 'parse tree'
    def program(self):
        statements = []

        while self.token_peek():
            statement = self.statement()
            statements.append(statement)

        program = ProgramNode(statements)

        return program 
    
    # ---------------------------------------------------------
    # THE DISPATCHER, on keywords, or to expresison parser
    # ---------------------------------------------------------
    def statement(self):
        if self.token_peek().token_type == TokenType.KNOW:
            result = self.assignment()
            return result
        
        elif self.token_peek().token_type == TokenType.SUPPOSE:
            result = self.conditional()
            return result
        
        elif self.token_peek().token_type == TokenType.DOOM:
            result = self.print_statement()
            return result 
        
        elif self.token_peek().token_type == TokenType.CRIME:
            result = self.while_statement()
            return result 
        
        else:
            result = self.expression()
            return result 
     # -------------------------------------------------------------   
     # ------------------------------------------------------------


     # ------------ Statement level methods: structure --------------------------
    def assignment(self):
        # we know what's coming so no need to peek before consuming
        self.consume(TokenType.KNOW)
        var_name = self.consume(TokenType.IDENTIFIER).lexeme 
        expr = self.expression()
        root = AssignNode(var_name, expr)

        return root 
    
    def conditional(self):
        self.consume(TokenType.SUPPOSE)

        condition = self.expression()
        then_block = self.block() # grab then block first because it has to be there 
        else_block = None 

        # grab the else block if it's there 
        if self.token_peek() and self.token_peek().token_type == TokenType.OTHERWISE:
            self.consume(TokenType.OTHERWISE)
            else_block = self.block() 

        root = ConditionalNode(condition, then_block, else_block)

        return root 

    def print_statement(self):
        self.consume(TokenType.DOOM)
        expression = self.expression()

        root = PrintNode(expression)

        return root 
    
    def while_statement(self):
        self.consume(TokenType.CRIME)

        condition = self.expression()
        body_block = self.block()

        root = WhileNode(condition, body_block)

        return root 

    def block(self):
        block = []

        while self.token_peek() and self.token_peek().token_type != TokenType.END:
            statement = self.statement()
            block.append(statement)

        self.consume(TokenType.END)
        root = BlockNode(block)

        return root 
    
    
    # --------------------- Expressison Parser: Compute values-------------------
    def expression(self):
        root = self.comparison()

        return root  
    
    def comparison(self):
        root = self.term() # grab left side 

        while self.token_peek() and self.token_peek().token_type in self.comparison_tokens:
            comp = self.token_peek() # need to check what the token is first, peek at it)
            self.consume(comp.token_type) # does validation, grabs, and advances
            r_node = self.term() # grab right side 
            root = BinaryOpNode(comp, root, r_node)

        return root 

    def term(self):
        root = self.factor()
 
        while self.token_peek() and (
            self.token_peek().token_type in (TokenType.PLUS, TokenType.MINUS)
        ):
            op = self.token_peek()
            self.consume(op.token_type) 
            r_node = self.factor()
            root = BinaryOpNode(op, root, r_node)

        return root 
   
    def factor(self):
        root = self.unary()

        while self.token_peek() and (
            self.token_peek().token_type in (TokenType.MULTIPLY, TokenType.DIVIDE)
        ):
            op = self.token_peek()
            self.consume(op.token_type) 
            r_node = self.unary()
            root = BinaryOpNode(op, root, r_node)

        return root 
    
    
    def unary(self):
        if self.token_peek() and self.token_peek().token_type == TokenType.MINUS:
            op = self.token_peek()
            self.consume(op.token_type)
            operand = self.primary()
            root = UnaryOpNode(op, operand)

        else:
            root = self.primary()

        return root 

    def primary(self):
        if self.token_peek().token_type == TokenType.NUMBER:
            num = self.token_peek() 
            self.consume(num.token_type)

            return NumberNode(float(num.lexeme))
        
        elif self.token_peek().token_type == TokenType.IDENTIFIER:
            identifier = self.token_peek() 
            self.consume(identifier.token_type)

            return IdentifierNode(identifier.lexeme)

        else:
            # handle parens, creating a nested parse of everything inside them
            if self.token_peek().token_type == TokenType.L_PARENS:
                self.consume(TokenType.L_PARENS)
                result = self.expression()
                self.consume(TokenType.R_PARENS)

                return result