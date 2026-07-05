
class NumberNode:
    def __init__(self, number):
        self.number = number 

    def __repr__(self):
        return f'Number({self.number})'
    

class IdentifierNode:
    def __init__(self, identifier):
        self.identifier = identifier

    def __repr__(self):
        return f'Identifier({self.identifier})'
    
    
class BinaryOpNode:
    def __init__(self, left, right, op):
        self.left = left
        self.right = right
        self.op = op 

    def __repr__(self):
        return f'BinaryOp({self.left}, {self.right}, {self.op})'
    
    
class UnaryOpNode:
    def __init__(self, operand, op):
        self.operand = operand
        self.op = op

    def __repr__(self):
        return f'UnaryOp({self.operand}, {self.op})'
    

class AssignNode:
    def __init__(self, name, expression):
        self.name = name
        self.expression = expression

    def __repr__(self):
        return f'Assign({self.name}, {self.expression})'
    

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
    

class BlockNode:
    def __init__(self, statements):
        self.statements = statements

    def __repr__(self):
        return f"Block({self.statements})"


class ProgramNode:
    def __init__(self, statements):
        self.statements = statements

    def __repr__(self):
      return f"Program({self.statements})"