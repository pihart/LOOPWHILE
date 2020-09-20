const register = `([A-Z]+)`;
const functionName = `([a-z]+)`;
const number = `(\\d+)`;
const positive = `([1-9]\\d*)`;
const regnum = `([A-Z]+|\\d+)`;
const array = `\\[(.*)\\]`;

const functionRegex = `function ${functionName}\((.*)\)`;

const usedRegisters = [];

// TODO: arrays, function x(a, b, ..., f)       Call functions with x()
const commands = {
    addition: {
        syntax: `${register} = ${regnum} \\+ ${regnum}`,
        code: (a, b, c) => a === b && c === "1" ? null : [`${a} = ${b}`, `${a} += ${c}`]
    },

    subtraction: {
        syntax: `${register} = ${regnum} - ${regnum}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} -= ${c}`]
    },

    multiplication: {
        syntax: `${register} = ${regnum} \\* ${regnum}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} *= ${c}`]
    },

    division: {
        syntax: `${register} = ${regnum} \\/ ${regnum}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} /= ${c}`]
    },

    mod: {
        syntax: `${register} = ${regnum} % ${regnum}`,
        code: (a, b, c) => {
            const r = newRegister();
            const rr = newRegister();
            const x = newRegister();
            return [`${r} = ${b}`, `${x} = ${b}`, `${rr} = ${c}`, `${rr}--`, ``, `LOOP ${b}`, `${x} -= ${rr}`, `LOOP ${x}`, `${r} = ${x}`, `${r}--`, `END`, `${x}--`, `END`, `${a} = ${r}`]
        }
    },

    exponentiation: {
        syntax: `${register} = ${regnum} \\*\\* ${regnum}`,
        code: (a, b, c) => {
            return [
                `${a} = 1`,
                `LOOP ${c}`,
                `${a} *= ${b}`,
                `END`
            ]
        }
    },

    assignment: {
        syntax: `${register} = ${positive}`,
        code: (a, b) => [`${a} = 0`, ...`${a}++\n`.repeat(b).split("\n")]
    },

    plusequals: {
        syntax: `${register} \\+= ${regnum}`,
        code: (a, b) => [`LOOP ${b}`, `${a}++`, `END`]
    },

    minusequals: {
        syntax: `${register} -= ${regnum}`,
        code: (a, b) => [`LOOP ${b}`, `${a}--`, `END`]
    },

    timesequals: {
        syntax: `${register} \\*= ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${a}`, `${a} = 0`, `LOOP ${b}`, `${a} += ${r}`, `END`];
        }
    },

    divequals: {
        syntax: `${register} \\/= ${regnum}`,
        code: (a, bb) => {
            const r = newRegister();
            const b = newRegister();
            return [`${b} = ${bb}`, `${b}--`, `${r} = 0`, `LOOP ${a}`, `${a} -= ${b}`, `${r} += ${a}`, `${a}--`, `${r} -= ${a}`, `END`, `${a} = ${r}`]
        }
    },

    modequals: {
        syntax: `${register} %= ${regnum}`,
        code: (a, b) => [`${a} = ${a} % ${b}`]
    },

    expequals: {
        syntax: `${register} \\*\\*= ${regnum}`,
        code: (a, b) => [`${a} = ${a} ** ${b}`]
    },

    increment: {
        syntax: `${register}\\+\\+`,
        code: (a) => [`${a} = ${a} + 1`]
    },

    decrement: {
        syntax: `${register}--`,
        code: (a) => {
            const r = newRegister();
            return [`${r} = 0`, `LOOP ${a}`, `${a} = ${r}`, `${r}++`, `END`];
        }
    },

    loop: {
        syntax: `LOOP ${number}`,
        code: a => {
            const r = newRegister();
            return [`${r} = ${a}`, `LOOP ${r}`];
        }
    },

    if: {
        syntax: `IF ${regnum} == ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = 1`, `IF ${a} >= ${b}`, `IF ${a} <= ${b}`, `${r} = 0`, `END`, `END`, `IF0 ${r}`];
        }
    },

    ifne: {
        syntax: `IF ${regnum} != ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = 1`, `IF ${a} >= ${b}`, `IF ${a} <= ${b}`, `${r} = 0`, `END`, `END`, `IF+ ${r}`];
        }
    },

    ifgreater: {
        syntax: `IF ${regnum} > ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${a} - ${b}`, `IF+ ${r}`];
        }
    },

    ifless: {
        syntax: `IF ${regnum} < ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${b} - ${a}`, `IF+ ${r}`];
        }
    },

    ifgeq: {
        syntax: `IF ${regnum} >= ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${b} - ${a}`, `IF0 ${r}`];
        }
    },

    ifleq: {
        syntax: `IF ${regnum} <= ${regnum}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${a} - ${b}`, `IF0 ${r}`];
        }
    },

    ifpos: {
        syntax: `IF\\+ ${regnum}`,
        code: a => {
            const r = newRegister();
            return [`${r} = 0`, `LOOP ${a}`, `${r} = 1`, `END`, `LOOP ${r}`];
        }
    },

    if0: {
        syntax: `IF0 ${regnum}`,
        code: a => {
            const r = newRegister();
            return [`${r} = 1`, `LOOP ${a}`, `${r} = 0`, `END`, `LOOP ${r}`];
        }
    },

    // base 10
    // LAST, REST = ARRAY
    // pop: {
    //     syntax: `${register}, ${register} = pop ${register}`,
    //     code: (a, b, c) => [`${b}, ${a} = split ${c} 1`]
    // },

    // // base 10
    // // LAST, REST = ARRAY
    // split: {
    //     syntax: `${register}, ${register} = split ${register} ${register}`,
    //     code: (a, b, c) => {
    //         return [
    //             `,
    //             ${a} = split ${c} 1`];
    //     }
    // },

    identity: {
        syntax: `${register} = ${register}`,
        code: (a, b) => a === b ? undefined : null
    },

    setArray: {
        syntax: `${register} = ${array}`,
        code: (a, arr) => {
            arr = arr.split(",")
                // .map(el => [...(+el).toString(8)].map(a=>+a+1).join(""));
                .map(el => (+el).toString(2));
            return [`${a} = ${parseInt(arr.join("2"), 3)}`];
        }
    },

    // push: {
    //     syntax: `${register}.push\\(${regnum}\\)`,
    //     code: (reg, val) => {
    //         // Loop val
    //         // r = val / 2
    //         return [reg]
    //     }
    // }

};

const instructionTypes = {
    begin: Symbol(),
    end: Symbol(),
    flat: Symbol()
}

// const validSyntax = [`${register} = 0`];

const type = instruction => {

    for (const pattern of [`LOOP .+`, "IF .+", "IF0 .+", "LOOP .+", "WHILE .*",
        //functionRegex
    ].map(s => `^${s}$`)) {
        if (instruction.match(pattern))
            return instructionTypes.begin;
    }

    if (instruction.match("^END$"))
        return instructionTypes.end;

    return instructionTypes.flat;

}


const newRegister = () => {
    let a = `JS`

    while (usedRegisters.includes(a))
        a += `A`

    usedRegisters.push(a);
    return a
}

// no function nesting allowed
/*
const defineFunctions = instructions => {
    let stack = 0;
    let stackAtFunction;
    let parameters;

    for (let i = 0; i < instructions.length; i++) {
        let instruction = instructions[i];
        switch (type(instruction)) {
            case instructionTypes.begin:
                if (parameters) {

                } else {
                    let match = instruction.match(`^${functionRegex}$`)[1];
                    if (match) {
                        stackAtFunction = stack;
                        match = match[2].split(", ");
                        parameters = {};
                        match.forEach(param => {
                            parameters[param] = newRegister()
                        })
                    }
                }
                stack++;
                break;
            case instructionTypes.end:
                stack--;
                if (parameters) {

                }
                break;
            case instructionTypes.flat:
                indent = `    `.repeat(stack);
        }

        instructions[i] = instruction;
    }

    return instructions;
}
*/

const transpile = (code) => {

    let instructions = code.split(`\n`)
        .map(i => i.split(`//`).shift())
        .map(i => i.trim());

    let changed = true;

    while (changed) {
        changed = false;
        Object.values(commands).forEach(command => {
            instructions = instructions.map(line => {
                const [match, ...params] = line.match(`^${command.syntax}$`) || [null];
                if (match !== null && !command.ignore) {
                    let newCode = command.code(...params);
                    if (newCode !== null && newCode !== line) {
                        changed = true;
                        return newCode;
                    }
                }
                return line;
            }).filter(line => line).flat()
        });
    }
    return indentCode(instructions);
}
const indentCode = instructions => {
    let stack = 0;

    for (let i = 0; i < instructions.length; i++) {

        let indent;
        switch (type(instructions[i])) {
            case instructionTypes.begin:
                indent = `    `.repeat(stack++);
                break;
            case instructionTypes.end:
                indent = `    `.repeat(--stack);
                break;
            case instructionTypes.flat:
                indent = `    `.repeat(stack);
        }

        instructions[i] = indent + instructions[i];
    }

    return instructions;
}

module.exports = transpile;
