const register = `([A-Z]+)`;
const number = `(\\d+)`;

const usedRegisters = [];

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

    identity: {
        syntax: `${register} = ${register}`,
        code: (a, b) => {
            return a === b ? [] : `${a} = ${b}`;
        },
        ignore: true
    }

};

const validSyntax = [`${register} = 0`];


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
            console.log({command})
            instructions = instructions.map(line => {
                console.log({line})
                const [match, ...params] = line.match(`^${command.syntax}$`) || [null];
                console.log({match})
                if (match !== null && !command.ignore) {
                    for (const regex of validSyntax) {
                        if (line.match(`^${regex}$`)) {
                            console.log("skipping; not marking as changed")
                            return line;
                        }
                    } // cannot use Array.prototype.some for some stupid reason
                    changed = true
                    console.log("marking as changed")
                    return command.code(...params);
                }
                return line;
            }).flat()
        });
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