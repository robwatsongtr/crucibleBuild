#include "src/interpreter.h"
#include "src/lexer.h"
#include "src/parser.h"
#include "src/runner.h"

#include <string> 
#include <iostream>
#include <stdexcept>
#include <fstream>
#include <sstream>

/*
Example, to pass in an Interpreter as a visitor:
                                                                                                            
  Interpreter interp;                                                                                                                       
  Runner runner(std::move(program));                                                                                                      
  runner.run(interp);

*/

int main (int argc, char* argv[]) {
    try {
        if (argc < 2) {
            throw std::invalid_argument("missing filename argument");
        }

        // read source file in ----------------------------------
        std::ifstream source_file; 
        source_file.exceptions(std::ifstream::failbit | std::ifstream::badbit);
        source_file.open(argv[1]);

        std::stringstream buf; 
        buf << source_file.rdbuf();
        std::string source_contents = buf.str();

        // pipeline ----------------------------------------------
        std::cout << "\n";
        std::cout << "Program: " << "\n\n" << source_contents;
        std::cout << "\n\n"; 

        std::cout << "Step 1: Lexical Analysis (Tokenization)"<< "\n";
        std::cout << "\n";
        Lexer lexer(source_contents); 
        auto tokens = lexer.tokenize();

        for (auto tok : tokens) {
            std::cout << " " << tok.toString() << "\n";
        }
        std::cout << "\n";

        std::cout << "Step 2: Syntax Analysis (Parsing)"<< "\n";
        std::cout << "\n";
        Parser parser(tokens); 
        auto ast = parser.program();
        std::cout << " " << ast->toString() << "\n";
        std::cout << "\n";

        std::cout << "Step 3: Interpreter evaluation"<< "\n";
        std::cout << "\n";
        Interpreter interpreter; 
        Runner runner(std::move(ast));
        runner.run(interpreter);
        std::cout << "\n";
    
    } catch (const std::exception& e) {
        std::cerr << e.what() << "\n";
        return 1;
    }
}


 
