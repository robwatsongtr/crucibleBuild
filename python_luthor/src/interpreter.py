import operator
from .tokens import TokenType
from .nodes import (
    NumberNode,
    BinaryOpNode,
    IdentifierNode,
    AssignNode,
    BlockNode,
    ConditionalNode,
    WhileNode,
    PrintNode,
    UnaryOpNode
)

class Interpreter:
    def __init__(self, program):
        self.program = program
        self.symbol_table = {}

    binary_op_map = {
        TokenType.PLUS: operator.add,
        TokenType.MINUS: operator.sub,
        TokenType.MULTIPLY: operator.mul,
        TokenType.DIVIDE: operator.truediv,
        TokenType.LESS_THAN: operator.lt,
        TokenType.GREATER_THAN: operator.gt,
        TokenType.LESS_THAN_EQUAL: operator.le,
        TokenType.GREATER_THAN_EQUAL: operator.ge,
        TokenType.EQUAL_TO: operator.eq,
        TokenType.NOT_EQUAL: operator.ne
    }

    unary_op_map = {
        TokenType.MINUS: operator.neg
    }

    def run(self):
        for statement in self.program.statements:
            self.evaluate(statement)


    def evaluate(self, node):
        if isinstance(node, NumberNode):
            return node.number 
        
        elif isinstance(node, IdentifierNode):
            if node.identifier in self.symbol_table:

                return self.symbol_table[node.identifier]
            else:
                raise ValueError(
                    f"ERROR: '{node.identifier}' does not exist"
                )
            
        elif isinstance(node, BinaryOpNode):
            left = self.evaluate(node.left)
            right = self.evaluate(node.right)

            return self.binary_op_map[node.op_type.token_type](left, right)
        
        elif isinstance(node, UnaryOpNode):
            operand = self.evaluate(node.operand)

            return self.unary_op_map[node.op_type.token_type](operand)
        
        elif isinstance(node, AssignNode):
            var_name = node.var_name
            expr_eval = self.evaluate(node.expression)

            self.symbol_table[var_name] = expr_eval

        elif isinstance(node, PrintNode):
            expr_eval = self.evaluate(node.expression)
            print(f"> {expr_eval}")

        elif isinstance(node, BlockNode):
            for statement in node.statements:
                self.evaluate(statement)

        elif isinstance(node, WhileNode):
            condition_eval = self.evaluate(node.condition)

            while condition_eval:
                self.evaluate(node.body_block)
                condition_eval = self.evaluate(node.condition)
            
        elif isinstance(node, ConditionalNode):
            result = self.evaluate(node.condition)

            if result:
                self.evaluate(node.then_block)
            else:
                if node.else_block:
                    self.evaluate(node.else_block)

        
