#pragma once 
#include "nodes.h"

class Runner {
public:
    Runner(std::unique_ptr<ProgramNode> program);

    void run(Visitor&);
private:
    std::unique_ptr<ProgramNode> program;

};