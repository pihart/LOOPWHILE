const register = `([A-Z]+)`;
const functionName = `([a-z]+)`;
const number = `(\\d+)`;

const usedRegisters = [];


// TODO: arrays, function x(a, b, ..., f)       Call functions with x()
const commands = {
    addition: {
        syntax: `${register} = ${register} \\+ ${register}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} += ${c}`]
    },

    subtraction: {
        syntax: `${register} = ${register} - ${register}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} -= ${c}`]
    },

    multiplication: {
        syntax: `${register} = ${register} \\* ${register}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} *= ${c}`]
    },

    division: {
        syntax: `${register} = ${register} \\/ ${register}`,
        code: (a, b, c) => [`${a} = ${b}`, `${a} /= ${c}`]
    },

    mod: {
        syntax: `${register} = ${register} % ${register}`,
        // code: (a, b, c) => [`${a} = ${b}`, `${a} %= ${c}`]
        code: (a, b, c) => {
            const r = newRegister();
            const rr = newRegister();
            const x = newRegister();
            return [`${r} = ${b}`, `${x} = ${b}`, `${rr} = ${c}`, `${rr}--`, ``, `LOOP ${b}`, `${x} -= ${rr}`, `LOOP ${x}`, `${r} = ${x}`, `${r}--`, `END`, `${x}--`, `END`, `${a} = ${r}`]
        }
    },

    assignment: {
        syntax: `${register} = ${number}`,
        code: (a, b) => [`${a} = 0`, ...`${a}++\n`.repeat(b).split("\n")]
    },

    plusequals: {
        syntax: `${register} \\+= ${register}`,
        code: (a, b) => [`LOOP ${b}`, `${a}++`, `END`]
    },

    minusequals: {
        syntax: `${register} -= ${register}`,
        code: (a, b) => [`LOOP ${b}`, `${a}--`, `END`]
    },

    timesequals: {
        syntax: `${register} \\*= ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${a}`, `${a} = 0`, `LOOP ${b}`, `${a} += ${r}`, `END`];
        }
    },

    divequals: {
        syntax: `${register} \\/= ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${b}--`, `${r} = 0`, `LOOP ${a}`, `${a} -= ${b}`, `${r} += ${a}`, `${a}--`, `${r} -= ${a}`, `END`, `${a} = ${r}`]
        }
    },

    modequals: {
        syntax: `${register} %= ${register}`,
        code: (a, b) => [`${a} = ${a} % ${b}`]
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

    if: {
        syntax: `IF ${register} == ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = 1`, `IF ${a} >= ${b}`, `IF ${a} <= ${b}`, `${r} = 0`, `END`, `END`, `IF0 ${r}`];
        }
    },

    ifne: {
        syntax: `IF ${register} != ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = 1`, `IF ${a} >= ${b}`, `IF ${a} <= ${b}`, `${r} = 0`, `END`, `END`, `IF+ ${r}`];
        }
    },

    ifgreater: {
        syntax: `IF ${register} > ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${a} - ${b}`, `IF+ ${r}`];
        }
    },

    ifless: {
        syntax: `IF ${register} < ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${b} - ${a}`, `IF+ ${r}`];
        }
    },

    ifgeq: {
        syntax: `IF ${register} >= ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${b} - ${a}`, `IF0 ${r}`];
        }
    },

    ifleq: {
        syntax: `IF ${register} <= ${register}`,
        code: (a, b) => {
            const r = newRegister();
            return [`${r} = ${a} - ${b}`, `IF0 ${r}`];
        }
    },

    ifpos: {
        syntax: `IF\\+ ${register}`,
        code: a => {
            const r = newRegister();
            return [`${r} = 0`, `LOOP ${a}`, `${r} = 1`, `END`, `LOOP ${r}`];
        }
    },

    if0: {
        syntax: `IF0 ${register}`,
        code: a => {
            const r = newRegister();
            return [`${r} = 1`, `LOOP ${a}`, `${r} = 0`, `END`, `LOOP ${r}`];
        }
    },

    identity: {
        syntax: `${register} = ${register}`,
        code: (a, b) => {
            return a === b ? [] : `${a} = ${b}`;
        },
        ignore: true
    }

};

const instructionTypes = {
    begin: Symbol(),
    end: Symbol(),
    flat: Symbol()
}

const validSyntax = [`${register} = 0`];

const type = instruction => {

    for (const pattern of [`LOOP .+`, "IF .+", "IF0 .+", "LOOP .+", `function ${functionName}\((.*)\)`].map(s => `^${s}$`)) {
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
                    for (const regex of validSyntax) {
                        if (line.match(`^${regex}$`)) {
                            return line;
                        }
                    }
                    changed = true
                    return command.code(...params);
                }
                return line;
            }).flat()
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


// Polyfill ECMAScript 2019
if (!Array.prototype.flat) {
    Object.defineProperty(Array.prototype, 'flat',
        {
            value: function (depth = 1, stack = []) {
                for (let item of this) {
                    if (item instanceof Array && depth > 0) {
                        item.flat(depth - 1, stack);
                    } else {
                        stack.push(item);
                    }
                }

                return stack;
            }
        });
}