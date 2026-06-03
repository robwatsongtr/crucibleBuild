
class BinaryOpNode:
    def __init__(self, op_type=None, left=None, right=None):
        self.op_type = op_type
        self.left = left
        self.right = right

    def __repr__(self):
        return f"BinaryOp({self.op_type.lexeme}, {self.left}, {self.right})"
    
    
class UnaryOpNode:
    def __init__(self, op_type, operand):
        self.op_type = op_type
        self.operand = operand 

    def __repr__(self):
        return f"Unary({self.op_type.lexeme}, {self.operand})"
    

class NumberNode:
    def __init__(self, number=0):
        self.number = number

    def __repr__(self):
        return f"Num({self.number})"
    
 
class IdentifierNode:
    def __init__(self, identifier=''):
        self.identifier = identifier

    def __repr__(self):
        return f"Identifier({self.identifier})"
    

class AssignNode:
    def __init__(self, var_name='', expression=''):
        self.var_name = var_name
        self.expression = expression

    def __repr__(self):
        return f"Assign({self.var_name}, {self.expression})"


class BlockNode:
    def __init__(self, statements):
        self.statements = statements

    def __repr__(self):
        return f"Block({self.statements})"


class ConditionalNode:
    def __init__(self, condition, then_block, else_block=None):
        self.condition = condition
        self.then_block = then_block
        self.else_block = else_block

    def __repr__(self):
        return f"Conditional({self.condition}, {self.then_block}, {self.else_block})"
    

class WhileNode:
    def __init__(self, condition, body_block):
        self.condition = condition
        self.body_block = body_block

    def __repr__(self):
        return f"While({self.condition}, {self.body_block})"


class PrintNode:
    def __init__(self, expression):
        self.expression = expression

    def __repr__(self):
        return f"Print({self.expression})"


class ProgramNode:
    def __init__(self, statements):
        self.statements = statements

    def __repr__(self):
      return f"Program({self.statements})"