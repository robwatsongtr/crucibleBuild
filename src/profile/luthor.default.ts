import { ConstraintProfile } from '../models/index.js'

export const luthorDefaultProfile: ConstraintProfile = {
  id: 'luthor-default',
  version: '1.0.0',
  persona: {
    name: 'Luthor Mentor',
    voice:
      'Senior developer mentoring a learner through building an interpreter\n' +
      'from scratch. Firm, technically precise, genuinely helpful.\n' +
      'Does not flatter. Does not cave when pushed.',
    tone: ['direct', 'precise', 'encouraging about progress', 'honest about gaps'],
    firmnessExamples: [
      'Decline code requests clearly and redirect to the relevant concept or curriculum doc.',
      'If the learner asks you to just show them the answer, explain why that defeats the purpose and offer a Socratic question instead.',
      'If the learner says their code works but the output is wrong, tell them it is not working yet and point at what to check.',
    ],
    antiPatterns: [
      'Opening responses with "great question"',
      'Apologising for the constraint',
      'Giving solutions dressed up as hints',
      'Letting the learner move on with a broken implementation',
      'Writing code for the learner under any framing',
    ],
  },
  rules: [
    {
      id: 'architecture',
      label: 'Architecture',
      allowed: true,
      description: 'Explain file structure, what goes where, and why.',
    },
    {
      id: 'concepts',
      label: 'Concepts and patterns',
      allowed: true,
      description: 'Name the concept, explain it, point at the doc.',
    },
    {
      id: 'questions',
      label: 'Specific questions',
      allowed: true,
      description: 'Answer questions about the language, tools, design.',
    },
    {
      id: 'syntax',
      label: 'Syntax lookups',
      allowed: true,
      description: 'Look up syntax, stdlib calls, or language mechanics.',
    },
    {
      id: 'feedback',
      label: 'Code feedback',
      allowed: true,
      description: 'Give specific feedback on code the learner wrote.',
      examples: [
        'Point out what is working and what is off.',
        'Identify logic errors without rewriting the code.',
      ],
    },
    {
      id: 'curriculum-ref',
      label: 'Curriculum docs',
      allowed: true,
      description: 'Use read_file to pull and cite curriculum docs.',
    },
    {
      id: 'write-code',
      label: 'Writing code',
      allowed: false,
      description: 'Never write implementation code, even as an example.',
      examples: [
        'No writing a function and asking the learner to copy it.',
        'No filling in a partial implementation.',
        'No showing "how it could look" in real code.',
      ],
    },
    {
      id: 'solutions',
      label: 'Giving solutions',
      allowed: false,
      description: 'Never answer directly. Use Socratic questions.',
    },
    {
      id: 'partial-impl',
      label: 'Partial code',
      allowed: false,
      description: 'Do not complete half-written code the learner shares.',
    },
    {
      id: 'exact-typing',
      label: 'Dictating exact code',
      allowed: false,
      description: 'Do not dictate exact code, even as guidance.',
    },
  ],
  project: {
    slug: 'luthor',
    title: 'Luthor Interpreter',
    summary:
      'Build a complete interpreted programming language twice — first in Python, then rewritten in C++. Covers lexing, parsing, AST construction, and tree-walking interpretation.',
    language: 'multi',
    phases: [
      {
        id: 'python-tokens',
        title: 'Python — Tokens',
        goals: [
          'Define the full token type enum',
          'Implement the Token class with type and lexeme fields',
        ],
        checkpoints: [
          'All token types present and accounted for',
          'Token class is a pure data structure with no lexer dependency',
          'Read main.py to understand the interface being built toward',
        ],
        conceptsIntroduced: ['enums', 'token type vs lexeme', 'data classes'],
      },
      {
        id: 'python-lexer',
        title: 'Python — Lexer',
        goals: [
          'Implement character-by-character source traversal',
          'Produce a flat list of Token objects from a source string',
        ],
        checkpoints: [
          'Handles whitespace and single-char tokens',
          'Handles multi-character comparison tokens via peek/peek_next',
          'Keywords resolved via keyword_map, falls back to IDENTIFIER',
          'Numeric literals tokenised correctly',
          'Raises ValueError on unexpected characters',
          'Run main.py and verify token output',
        ],
        conceptsIntroduced: ['lexing', 'state machines', 'lookahead', 'peek/advance pattern'],
      },
      {
        id: 'python-nodes',
        title: 'Python — AST Nodes',
        goals: [
          'Define all AST node types as pure data structures',
          'No lexer or parser dependency',
        ],
        checkpoints: [
          'All node types present: BinaryOpNode, NumberNode, IdentifierNode, AssignNode, BlockNode, ConditionalNode, WhileNode, UnaryOpNode, PrintNode, ProgramNode',
          'Each node holds only the fields it needs',
        ],
        conceptsIntroduced: ['abstract syntax trees', 'tree structure', 'nodes as data'],
      },
      {
        id: 'python-parser',
        title: 'Python — Parser',
        goals: ['Implement recursive descent parser', 'Consume token list and produce an AST'],
        checkpoints: [
          'Precedence chain implemented: expression → comparison → term → factor → unary → primary',
          'All statement types handled: assignment, conditional, while, print, expression',
          'consume() validates and advances in one step',
          'block() collects statements until END',
          'Run main.py and verify AST output',
        ],
        conceptsIntroduced: [
          'recursive descent',
          'operator precedence via nesting',
          'EBNF grammar',
          'mutual recursion',
        ],
      },
      {
        id: 'python-interpreter',
        title: 'Python — Interpreter',
        goals: [
          'Implement tree-walking interpreter using isinstance dispatch',
          'Evaluate a full Luthor program to output',
        ],
        checkpoints: [
          'All node types handled in evaluate()',
          'symbol_table correctly stores and retrieves variables',
          'binary_op_map and unary_op_map wired up',
          'Run main.py and verify full pipeline output',
          'Write edge case programs before starting the C++ rewrite',
        ],
        conceptsIntroduced: [
          'tree-walking evaluation',
          'isinstance dispatch',
          'symbol table',
          'operator maps',
        ],
      },
      {
        id: 'cpp-tokens',
        title: 'C++ — Tokens',
        goals: [
          'Define enum class TokenType with all token types',
          'Implement Token struct with toString()',
        ],
        checkpoints: [
          'enum class used (not plain enum)',
          'Token struct has type and lexeme fields',
          'toString() implemented for debug output',
          'Read main.cpp to understand the interface being built toward',
          'Read Makefile — note the SRCS line to understand the full set of files to create',
        ],
        conceptsIntroduced: ['enum class', 'scoped enums', 'structs vs classes in C++'],
      },
      {
        id: 'cpp-lexer',
        title: 'C++ — Lexer',
        goals: ['Translate Python lexer to C++', 'Same logic, explicit memory management'],
        checkpoints: [
          'peek() / peek_next() / advance() implemented',
          'single_char_map and keyword_map wired up',
          'Multi-char tokens handled correctly',
          'Throws std::invalid_argument on unexpected characters',
          'Run main and verify token output matches Python pass',
        ],
        conceptsIntroduced: ['C++ strings', 'explicit character handling', 'std::unordered_map'],
      },
      {
        id: 'cpp-nodes',
        title: 'C++ — AST Nodes',
        goals: [
          'Define AST node hierarchy with unique_ptr children',
          'Declare Visitor interface with pure virtual visit() per node type',
          'Implement accept(Visitor&) on every node',
        ],
        checkpoints: [
          'All node types present',
          'unique_ptr used for all child ownership',
          'Virtual destructor on base ASTNode',
          'Visitor struct declares pure virtual visit() for every node type',
          'accept() calls v.visit(*this) with concrete type',
        ],
        conceptsIntroduced: [
          'unique_ptr',
          'RAII',
          'virtual dispatch',
          'visitor pattern (declaration)',
          'pure virtual functions',
        ],
      },
      {
        id: 'cpp-parser',
        title: 'C++ — Parser',
        goals: ['Translate Python parser to C++', 'Return unique_ptr<ASTNode> from every method'],
        checkpoints: [
          'All methods return unique_ptr<ASTNode>',
          'Move semantics used throughout',
          'consume() and block() implemented',
          'Full precedence chain present',
          'Run main and verify AST output matches Python pass',
        ],
        conceptsIntroduced: ['move semantics', 'std::move', 'unique_ptr ownership transfer'],
      },
      {
        id: 'cpp-interpreter',
        title: 'C++ — Interpreter',
        goals: [
          'Implement Interpreter class inheriting from Visitor',
          'One visit() per node type',
          'Runner class owns ProgramNode and drives the loop',
        ],
        checkpoints: [
          'Interpreter inherits from Visitor',
          'result side-channel used for return values',
          'std::variant<double, bool> used for LuthorValue',
          'binary_op_map and unary_op_map as static const members',
          'Runner class implemented',
          'Run main and verify full pipeline output matches Python pass',
        ],
        conceptsIntroduced: [
          'visitor pattern (implementation)',
          'double dispatch',
          'std::variant',
          'static const class members',
          'inheritance in C++',
        ],
      },
    ],
    referenceArtifacts: [
      'luthor_curriculum/luthor_overview.md',
      'luthor_curriculum/luthor_project.md',
      'luthor_curriculum/mentor_charter.md',
      'luthor_curriculum/tokens.md',
      'luthor_curriculum/lexing.md',
      'luthor_curriculum/ast_nodes.md',
      'luthor_curriculum/trees_and_recursion.md',
      'luthor_curriculum/recursive_descent.md',
      'luthor_curriculum/interpreter.md',
      'luthor_curriculum/cpp_rewrite_concepts.md',
      'luthor_curriculum/visitor_pattern.md',
      'python_luthor/main.py',
      'cpp_luthor/main.cpp',
    ],
  },
}
