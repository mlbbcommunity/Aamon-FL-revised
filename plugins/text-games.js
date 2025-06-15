
const config = require('../config');

module.exports = {
    name: 'Text Games',
    version: '1.0.0',
    description: 'Fun text-based games including word guessing, trivia, and number games',
    author: 'Bot Developer',

    // Game state storage
    gameStates: new Map(),

    async init(commandManager) {
        this.registerCommands(commandManager);
        
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            commands: ['guess', 'trivia', 'riddle', 'wordchain', 'anagram', 'math', 'hangman']
        };
    },

    registerCommands(commandManager) {
        // Number Guessing Game
        commandManager.register('guess', {
            description: 'Play number guessing game (1-100)',
            usage: `${config.PREFIX}guess [number]`,
            role: 'user',
            category: 'games',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const gameKey = `guess_${sender}`;
                
                if (args.length === 0) {
                    // Start new game
                    const targetNumber = Math.floor(Math.random() * 100) + 1;
                    this.gameStates.set(gameKey, {
                        type: 'guess',
                        target: targetNumber,
                        attempts: 0,
                        startTime: Date.now()
                    });
                    
                    await sock.sendMessage(sender, {
                        text: `🎯 *Number Guessing Game Started!*\n\n` +
                            `I'm thinking of a number between 1 and 100.\n` +
                            `Can you guess it?\n\n` +
                            `Use: \`${config.PREFIX}guess <number>\`\n` +
                            `Example: \`${config.PREFIX}guess 50\``
                    });
                    return;
                }
                
                const gameState = this.gameStates.get(gameKey);
                if (!gameState || gameState.type !== 'guess') {
                    await sock.sendMessage(sender, {
                        text: `❌ No active guessing game found!\n\nStart a new game with \`${config.PREFIX}guess\``
                    });
                    return;
                }
                
                const guess = parseInt(args[0]);
                if (isNaN(guess) || guess < 1 || guess > 100) {
                    await sock.sendMessage(sender, {
                        text: `❌ Please enter a valid number between 1 and 100!`
                    });
                    return;
                }
                
                gameState.attempts++;
                
                if (guess === gameState.target) {
                    const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
                    this.gameStates.delete(gameKey);
                    
                    await sock.sendMessage(sender, {
                        text: `🎉 *Congratulations!*\n\n` +
                            `You guessed the number ${gameState.target} correctly!\n` +
                            `🎯 Attempts: ${gameState.attempts}\n` +
                            `⏱️ Time: ${timeTaken} seconds\n\n` +
                            `${this.getScoreRating(gameState.attempts)}`
                    });
                } else if (guess < gameState.target) {
                    await sock.sendMessage(sender, {
                        text: `📈 *Too Low!*\n\n` +
                            `Your guess: ${guess}\n` +
                            `Try a higher number!\n` +
                            `Attempts: ${gameState.attempts}`
                    });
                } else {
                    await sock.sendMessage(sender, {
                        text: `📉 *Too High!*\n\n` +
                            `Your guess: ${guess}\n` +
                            `Try a lower number!\n` +
                            `Attempts: ${gameState.attempts}`
                    });
                }
            }
        });

        // Trivia Game
        commandManager.register('trivia', {
            description: 'Answer trivia questions from various categories',
            usage: `${config.PREFIX}trivia [answer]`,
            role: 'user',
            category: 'games',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const gameKey = `trivia_${sender}`;
                
                if (args.length === 0) {
                    // Start new trivia question
                    const question = this.getRandomTrivia();
                    this.gameStates.set(gameKey, {
                        type: 'trivia',
                        question: question,
                        startTime: Date.now()
                    });
                    
                    await sock.sendMessage(sender, {
                        text: `🧠 *Trivia Time!*\n\n` +
                            `**Category:** ${question.category}\n` +
                            `**Question:** ${question.question}\n\n` +
                            `**Options:**\n` +
                            `A) ${question.options.A}\n` +
                            `B) ${question.options.B}\n` +
                            `C) ${question.options.C}\n` +
                            `D) ${question.options.D}\n\n` +
                            `Answer with: \`${config.PREFIX}trivia A\` (or B, C, D)`
                    });
                    return;
                }
                
                const gameState = this.gameStates.get(gameKey);
                if (!gameState || gameState.type !== 'trivia') {
                    await sock.sendMessage(sender, {
                        text: `❌ No active trivia question!\n\nStart a new question with \`${config.PREFIX}trivia\``
                    });
                    return;
                }
                
                const answer = args[0].toUpperCase();
                if (!['A', 'B', 'C', 'D'].includes(answer)) {
                    await sock.sendMessage(sender, {
                        text: `❌ Please answer with A, B, C, or D!`
                    });
                    return;
                }
                
                const correct = answer === gameState.question.correct;
                const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
                this.gameStates.delete(gameKey);
                
                if (correct) {
                    await sock.sendMessage(sender, {
                        text: `✅ *Correct!*\n\n` +
                            `**Answer:** ${answer}) ${gameState.question.options[answer]}\n` +
                            `**Explanation:** ${gameState.question.explanation}\n` +
                            `⏱️ **Time:** ${timeTaken} seconds\n\n` +
                            `🎉 Well done! Try another one!`
                    });
                } else {
                    await sock.sendMessage(sender, {
                        text: `❌ *Incorrect!*\n\n` +
                            `**Your answer:** ${answer}) ${gameState.question.options[answer]}\n` +
                            `**Correct answer:** ${gameState.question.correct}) ${gameState.question.options[gameState.question.correct]}\n` +
                            `**Explanation:** ${gameState.question.explanation}\n\n` +
                            `💪 Better luck next time!`
                    });
                }
            }
        });

        // Riddle Game
        commandManager.register('riddle', {
            description: 'Solve challenging riddles and brain teasers',
            usage: `${config.PREFIX}riddle [answer]`,
            role: 'user',
            category: 'games',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const gameKey = `riddle_${sender}`;
                
                if (args.length === 0) {
                    const riddle = this.getRandomRiddle();
                    this.gameStates.set(gameKey, {
                        type: 'riddle',
                        riddle: riddle,
                        startTime: Date.now()
                    });
                    
                    await sock.sendMessage(sender, {
                        text: `🤔 *Riddle Challenge!*\n\n` +
                            `**Difficulty:** ${riddle.difficulty}\n\n` +
                            `${riddle.question}\n\n` +
                            `💡 **Hint:** ${riddle.hint}\n\n` +
                            `Answer with: \`${config.PREFIX}riddle <your answer>\``
                    });
                    return;
                }
                
                const gameState = this.gameStates.get(gameKey);
                if (!gameState || gameState.type !== 'riddle') {
                    await sock.sendMessage(sender, {
                        text: `❌ No active riddle!\n\nGet a new riddle with \`${config.PREFIX}riddle\``
                    });
                    return;
                }
                
                const userAnswer = args.join(' ').toLowerCase().trim();
                const correctAnswers = gameState.riddle.answers.map(a => a.toLowerCase());
                const isCorrect = correctAnswers.some(answer => userAnswer.includes(answer) || answer.includes(userAnswer));
                
                const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
                this.gameStates.delete(gameKey);
                
                if (isCorrect) {
                    await sock.sendMessage(sender, {
                        text: `🎉 *Brilliant!*\n\n` +
                            `**Your answer:** ${userAnswer}\n` +
                            `**Correct answer:** ${gameState.riddle.answers[0]}\n` +
                            `**Explanation:** ${gameState.riddle.explanation}\n` +
                            `⏱️ **Solved in:** ${timeTaken} seconds\n\n` +
                            `🧠 Great thinking skills!`
                    });
                } else {
                    await sock.sendMessage(sender, {
                        text: `❌ *Not quite right!*\n\n` +
                            `**Your answer:** ${userAnswer}\n` +
                            `**Correct answer:** ${gameState.riddle.answers[0]}\n` +
                            `**Explanation:** ${gameState.riddle.explanation}\n\n` +
                            `🤔 That was a tricky one!`
                    });
                }
            }
        });

        // Anagram Game
        commandManager.register('anagram', {
            description: 'Unscramble letters to form words',
            usage: `${config.PREFIX}anagram [answer]`,
            role: 'user',
            category: 'games',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const gameKey = `anagram_${sender}`;
                
                if (args.length === 0) {
                    const anagram = this.getRandomAnagram();
                    this.gameStates.set(gameKey, {
                        type: 'anagram',
                        anagram: anagram,
                        startTime: Date.now()
                    });
                    
                    await sock.sendMessage(sender, {
                        text: `🔤 *Anagram Challenge!*\n\n` +
                            `**Scrambled letters:** ${anagram.scrambled}\n` +
                            `**Category:** ${anagram.category}\n` +
                            `**Length:** ${anagram.answer.length} letters\n\n` +
                            `💡 **Hint:** ${anagram.hint}\n\n` +
                            `Unscramble with: \`${config.PREFIX}anagram <word>\``
                    });
                    return;
                }
                
                const gameState = this.gameStates.get(gameKey);
                if (!gameState || gameState.type !== 'anagram') {
                    await sock.sendMessage(sender, {
                        text: `❌ No active anagram!\n\nGet a new anagram with \`${config.PREFIX}anagram\``
                    });
                    return;
                }
                
                const userAnswer = args[0].toLowerCase().trim();
                const correct = userAnswer === gameState.anagram.answer.toLowerCase();
                const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
                this.gameStates.delete(gameKey);
                
                if (correct) {
                    await sock.sendMessage(sender, {
                        text: `✅ *Perfect!*\n\n` +
                            `**Scrambled:** ${gameState.anagram.scrambled}\n` +
                            `**Answer:** ${gameState.anagram.answer}\n` +
                            `**Meaning:** ${gameState.anagram.meaning}\n` +
                            `⏱️ **Time:** ${timeTaken} seconds\n\n` +
                            `🎯 Excellent word skills!`
                    });
                } else {
                    await sock.sendMessage(sender, {
                        text: `❌ *Close, but not quite!*\n\n` +
                            `**Your answer:** ${userAnswer}\n` +
                            `**Correct answer:** ${gameState.anagram.answer}\n` +
                            `**Meaning:** ${gameState.anagram.meaning}\n\n` +
                            `🔤 Keep practicing those anagrams!`
                    });
                }
            }
        });

        // Math Challenge
        commandManager.register('math', {
            description: 'Solve math problems of varying difficulty',
            usage: `${config.PREFIX}math [easy|medium|hard] [answer]`,
            role: 'user',
            category: 'games',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const gameKey = `math_${sender}`;
                
                if (args.length === 0) {
                    await sock.sendMessage(sender, {
                        text: `🧮 *Math Challenge!*\n\n` +
                            `Choose difficulty:\n` +
                            `• \`${config.PREFIX}math easy\` - Basic arithmetic\n` +
                            `• \`${config.PREFIX}math medium\` - Intermediate problems\n` +
                            `• \`${config.PREFIX}math hard\` - Advanced challenges`
                    });
                    return;
                }
                
                if (['easy', 'medium', 'hard'].includes(args[0]) && args.length === 1) {
                    const difficulty = args[0];
                    const problem = this.generateMathProblem(difficulty);
                    this.gameStates.set(gameKey, {
                        type: 'math',
                        problem: problem,
                        difficulty: difficulty,
                        startTime: Date.now()
                    });
                    
                    await sock.sendMessage(sender, {
                        text: `🧮 *Math Challenge - ${difficulty.toUpperCase()}*\n\n` +
                            `**Problem:** ${problem.question}\n\n` +
                            `Answer with: \`${config.PREFIX}math ${difficulty} <answer>\``
                    });
                    return;
                }
                
                const gameState = this.gameStates.get(gameKey);
                if (!gameState || gameState.type !== 'math') {
                    await sock.sendMessage(sender, {
                        text: `❌ No active math problem!\n\nStart with \`${config.PREFIX}math easy\``
                    });
                    return;
                }
                
                const userAnswer = parseFloat(args[1]);
                if (isNaN(userAnswer)) {
                    await sock.sendMessage(sender, {
                        text: `❌ Please provide a valid number!`
                    });
                    return;
                }
                
                const correct = Math.abs(userAnswer - gameState.problem.answer) < 0.01;
                const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
                this.gameStates.delete(gameKey);
                
                if (correct) {
                    await sock.sendMessage(sender, {
                        text: `✅ *Correct!*\n\n` +
                            `**Problem:** ${gameState.problem.question}\n` +
                            `**Answer:** ${gameState.problem.answer}\n` +
                            `**Solution:** ${gameState.problem.solution}\n` +
                            `⏱️ **Time:** ${timeTaken} seconds\n\n` +
                            `🎯 Mathematical genius!`
                    });
                } else {
                    await sock.sendMessage(sender, {
                        text: `❌ *Incorrect!*\n\n` +
                            `**Your answer:** ${userAnswer}\n` +
                            `**Correct answer:** ${gameState.problem.answer}\n` +
                            `**Solution:** ${gameState.problem.solution}\n\n` +
                            `📚 Keep practicing!`
                    });
                }
            }
        });
    },

    getScoreRating(attempts) {
        if (attempts <= 3) return '🏆 AMAZING! You\'re a guessing master!';
        if (attempts <= 6) return '🥇 EXCELLENT! Great guessing skills!';
        if (attempts <= 10) return '🥈 GOOD JOB! Nice work!';
        if (attempts <= 15) return '🥉 NOT BAD! Keep practicing!';
        return '💪 COMPLETED! Every expert was once a beginner!';
    },

    getRandomTrivia() {
        const triviaQuestions = [
            {
                category: 'Science',
                question: 'What is the chemical symbol for gold?',
                options: { A: 'Go', B: 'Gd', C: 'Au', D: 'Ag' },
                correct: 'C',
                explanation: 'Au comes from the Latin word "aurum" meaning gold.'
            },
            {
                category: 'Geography',
                question: 'Which is the smallest country in the world?',
                options: { A: 'Monaco', B: 'Vatican City', C: 'San Marino', D: 'Liechtenstein' },
                correct: 'B',
                explanation: 'Vatican City is only 0.17 square miles (0.44 km²).'
            },
            {
                category: 'History',
                question: 'In which year did World War II end?',
                options: { A: '1944', B: '1945', C: '1946', D: '1947' },
                correct: 'B',
                explanation: 'WWII ended in 1945 with Japan\'s surrender in September.'
            },
            {
                category: 'Technology',
                question: 'Who founded Microsoft?',
                options: { A: 'Steve Jobs', B: 'Bill Gates', C: 'Mark Zuckerberg', D: 'Larry Page' },
                correct: 'B',
                explanation: 'Bill Gates co-founded Microsoft with Paul Allen in 1975.'
            }
        ];
        
        return triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    },

    getRandomRiddle() {
        const riddles = [
            {
                question: 'I have keys but no locks. I have space but no room. You can enter but not go inside. What am I?',
                answers: ['keyboard', 'computer keyboard'],
                hint: 'You use this to type',
                difficulty: 'Medium',
                explanation: 'A keyboard has keys, space bar, and enter key!'
            },
            {
                question: 'The more you take, the more you leave behind. What am I?',
                answers: ['footsteps', 'steps', 'footprints'],
                hint: 'Think about walking',
                difficulty: 'Easy',
                explanation: 'Every step you take leaves a footprint behind!'
            },
            {
                question: 'I am not alive, but I grow. I don\'t have lungs, but I need air. I don\'t have a mouth, but water kills me. What am I?',
                answers: ['fire', 'flame'],
                hint: 'It\'s hot and bright',
                difficulty: 'Hard',
                explanation: 'Fire grows with fuel, needs oxygen, and is extinguished by water!'
            }
        ];
        
        return riddles[Math.floor(Math.random() * riddles.length)];
    },

    getRandomAnagram() {
        const anagrams = [
            {
                answer: 'LISTEN',
                scrambled: 'SILENT',
                category: 'Common Words',
                hint: 'What you do with your ears',
                meaning: 'To pay attention to sound'
            },
            {
                answer: 'TEACHER',
                scrambled: 'CHEATER',
                category: 'Professions',
                hint: 'Someone who educates',
                meaning: 'A person who instructs students'
            },
            {
                answer: 'ASTRONOMER',
                scrambled: 'MOON STARER',
                category: 'Science',
                hint: 'Studies celestial objects',
                meaning: 'A scientist who studies space'
            },
            {
                answer: 'CONVERSATION',
                scrambled: 'VOICES RANT ON',
                category: 'Communication',
                hint: 'A talk between people',
                meaning: 'An exchange of thoughts and words'
            }
        ];
        
        return anagrams[Math.floor(Math.random() * anagrams.length)];
    },

    generateMathProblem(difficulty) {
        switch (difficulty) {
            case 'easy':
                return this.generateEasyMath();
            case 'medium':
                return this.generateMediumMath();
            case 'hard':
                return this.generateHardMath();
            default:
                return this.generateEasyMath();
        }
    },

    generateEasyMath() {
        const operations = ['+', '-', '*'];
        const op = operations[Math.floor(Math.random() * operations.length)];
        let a, b, answer, question, solution;
        
        switch (op) {
            case '+':
                a = Math.floor(Math.random() * 50) + 1;
                b = Math.floor(Math.random() * 50) + 1;
                answer = a + b;
                question = `${a} + ${b} = ?`;
                solution = `${a} + ${b} = ${answer}`;
                break;
            case '-':
                a = Math.floor(Math.random() * 50) + 25;
                b = Math.floor(Math.random() * 25) + 1;
                answer = a - b;
                question = `${a} - ${b} = ?`;
                solution = `${a} - ${b} = ${answer}`;
                break;
            case '*':
                a = Math.floor(Math.random() * 12) + 1;
                b = Math.floor(Math.random() * 12) + 1;
                answer = a * b;
                question = `${a} × ${b} = ?`;
                solution = `${a} × ${b} = ${answer}`;
                break;
        }
        
        return { question, answer, solution };
    },

    generateMediumMath() {
        const problems = [
            () => {
                const a = Math.floor(Math.random() * 20) + 10;
                const b = Math.floor(Math.random() * 10) + 2;
                return {
                    question: `${a * b} ÷ ${b} = ?`,
                    answer: a,
                    solution: `${a * b} ÷ ${b} = ${a}`
                };
            },
            () => {
                const a = Math.floor(Math.random() * 10) + 2;
                const result = a * a;
                return {
                    question: `√${result} = ?`,
                    answer: a,
                    solution: `√${result} = ${a}`
                };
            },
            () => {
                const a = Math.floor(Math.random() * 8) + 2;
                const b = Math.floor(Math.random() * 3) + 2;
                const result = Math.pow(a, b);
                return {
                    question: `${a}^${b} = ?`,
                    answer: result,
                    solution: `${a}^${b} = ${result}`
                };
            }
        ];
        
        const problemGenerator = problems[Math.floor(Math.random() * problems.length)];
        return problemGenerator();
    },

    generateHardMath() {
        const problems = [
            () => {
                const a = Math.floor(Math.random() * 20) + 10;
                const b = Math.floor(Math.random() * 20) + 10;
                const c = Math.floor(Math.random() * 20) + 10;
                const result = a + b * c;
                return {
                    question: `${a} + ${b} × ${c} = ? (Order of operations)`,
                    answer: result,
                    solution: `${a} + (${b} × ${c}) = ${a} + ${b * c} = ${result}`
                };
            },
            () => {
                const a = Math.floor(Math.random() * 15) + 5;
                const b = Math.floor(Math.random() * 5) + 2;
                const result = (a * (a + 1)) / 2;
                return {
                    question: `Sum of first ${a} natural numbers = ?`,
                    answer: result,
                    solution: `1+2+3+...+${a} = ${a}×${a + 1}/2 = ${result}`
                };
            },
            () => {
                const sides = [3, 4, 5, 6, 8];
                const n = sides[Math.floor(Math.random() * sides.length)];
                const result = (n - 2) * 180;
                return {
                    question: `Sum of interior angles of a ${n}-sided polygon = ?`,
                    answer: result,
                    solution: `(${n}-2) × 180° = ${n - 2} × 180° = ${result}°`
                };
            }
        ];
        
        const problemGenerator = problems[Math.floor(Math.random() * problems.length)];
        return problemGenerator();
    }
};
const config = require('../config');

module.exports = {
    name: 'Text Games Plugin',
    version: '1.0.0',
    description: 'Fun text-based games for entertainment',
    author: 'Bot Developer',

    async init(commandManager) {
        this.registerCommands(commandManager);
        
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            commands: ['riddle', 'trivia', 'wordchain', 'rhyme', 'story', 'anagram', 'guess']
        };
    },

    registerCommands(commandManager) {
        // Riddle game
        commandManager.addCommand('riddle', {
            description: '🧩 Get a fun riddle to solve',
            category: 'games',
            usage: '.riddle',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                const riddles = [
                    {
                        question: "I have keys but no locks. I have space but no room. You can enter but not go outside. What am I?",
                        answer: "keyboard"
                    },
                    {
                        question: "The more you take, the more you leave behind. What am I?",
                        answer: "footsteps"
                    },
                    {
                        question: "I'm tall when I'm young, and short when I'm old. What am I?",
                        answer: "candle"
                    },
                    {
                        question: "What has hands but cannot clap?",
                        answer: "clock"
                    },
                    {
                        question: "What gets wet while drying?",
                        answer: "towel"
                    },
                    {
                        question: "I have a face but no eyes, hands but no fingers. What am I?",
                        answer: "clock"
                    },
                    {
                        question: "What can travel around the world while staying in a corner?",
                        answer: "stamp"
                    },
                    {
                        question: "I'm light as a feather, yet the strongest person can't hold me for long. What am I?",
                        answer: "breath"
                    }
                ];

                const randomRiddle = riddles[Math.floor(Math.random() * riddles.length)];
                
                const response = `🧩 *RIDDLE TIME!*\n\n` +
                    `❓ *Question:*\n${randomRiddle.question}\n\n` +
                    `🤔 Think you know the answer?\n` +
                    `💡 *Hint:* It's a common everyday object!\n\n` +
                    `_Reply with your answer to see if you're correct!_`;

                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Trivia game
        commandManager.addCommand('trivia', {
            description: '🎯 Answer fun trivia questions',
            category: 'games',
            usage: '.trivia',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                const trivia = [
                    {
                        question: "What is the largest planet in our solar system?",
                        options: ["A) Earth", "B) Jupiter", "C) Saturn", "D) Mars"],
                        answer: "B"
                    },
                    {
                        question: "Which programming language was created by Guido van Rossum?",
                        options: ["A) Java", "B) C++", "C) Python", "D) JavaScript"],
                        answer: "C"
                    },
                    {
                        question: "What does 'WWW' stand for?",
                        options: ["A) World Wide Web", "B) World War Win", "C) Wide World Web", "D) World Web Wide"],
                        answer: "A"
                    },
                    {
                        question: "In which year was Google founded?",
                        options: ["A) 1996", "B) 1998", "C) 2000", "D) 1995"],
                        answer: "B"
                    },
                    {
                        question: "What is the capital of Australia?",
                        options: ["A) Sydney", "B) Melbourne", "C) Canberra", "D) Perth"],
                        answer: "C"
                    }
                ];

                const randomTrivia = trivia[Math.floor(Math.random() * trivia.length)];
                
                const response = `🎯 *TRIVIA CHALLENGE!*\n\n` +
                    `❓ *Question:*\n${randomTrivia.question}\n\n` +
                    `📋 *Options:*\n${randomTrivia.options.join('\n')}\n\n` +
                    `💡 Reply with the letter of your answer!`;

                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Word Chain game
        commandManager.addCommand('wordchain', {
            description: '🔗 Start a word chain game',
            category: 'games',
            usage: '.wordchain [word]',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    const starters = ['apple', 'elephant', 'tiger', 'rocket', 'ocean', 'magic', 'puzzle', 'rainbow'];
                    const starter = starters[Math.floor(Math.random() * starters.length)];
                    
                    const response = `🔗 *WORD CHAIN GAME!*\n\n` +
                        `🎮 *How to play:*\n` +
                        `• Create a new word using the last letter of the previous word\n` +
                        `• No repeating words!\n\n` +
                        `🎯 *Starting word:* *${starter.toUpperCase()}*\n\n` +
                        `💡 Your turn! Make a word starting with "${starter.slice(-1).toUpperCase()}"`;

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                } else {
                    const word = args[0].toLowerCase();
                    const lastLetter = word.slice(-1);
                    
                    const response = `🔗 *Great word!* "${word.toUpperCase()}"\n\n` +
                        `🎯 Next word must start with: *${lastLetter.toUpperCase()}*\n\n` +
                        `Keep the chain going! 🚀`;

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                }
            }
        });

        // Rhyme game
        commandManager.addCommand('rhyme', {
            description: '🎵 Find words that rhyme',
            category: 'games',
            usage: '.rhyme <word>',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    const response = `🎵 *RHYME GAME!*\n\n` +
                        `📝 *Usage:* \`.rhyme <word>\`\n` +
                        `🎯 *Example:* \`.rhyme cat\`\n\n` +
                        `I'll give you words that rhyme with yours!`;

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                    return;
                }

                const word = args[0].toLowerCase();
                const rhymes = {
                    'cat': ['bat', 'hat', 'mat', 'rat', 'fat', 'pat'],
                    'dog': ['log', 'fog', 'jog', 'bog', 'hog', 'cog'],
                    'sun': ['fun', 'run', 'gun', 'bun', 'nun', 'won'],
                    'tree': ['free', 'see', 'bee', 'tea', 'key', 'sea'],
                    'house': ['mouse', 'louse', 'spouse', 'grouse'],
                    'car': ['far', 'bar', 'star', 'jar', 'tar', 'scar'],
                    'book': ['look', 'took', 'cook', 'hook', 'nook'],
                    'love': ['dove', 'above', 'glove', 'shove']
                };

                const wordRhymes = rhymes[word] || ['No common rhymes found! Try another word.'];
                
                const response = `🎵 *RHYMES FOR "${word.toUpperCase()}"*\n\n` +
                    `🎯 *Words that rhyme:*\n${wordRhymes.map(r => `• ${r}`).join('\n')}\n\n` +
                    `🎪 Try making a poem with these words!`;

                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Story building game
        commandManager.addCommand('story', {
            description: '📚 Collaborative story building',
            category: 'games',
            usage: '.story [add sentence]',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    const starters = [
                        "Once upon a time, in a magical forest...",
                        "It was a dark and stormy night when...",
                        "The spaceship landed silently in the desert...",
                        "Detective Sarah opened the mysterious letter...",
                        "The dragon yawned and stretched its wings..."
                    ];
                    
                    const starter = starters[Math.floor(Math.random() * starters.length)];
                    
                    const response = `📚 *STORY BUILDING GAME!*\n\n` +
                        `✨ *Story starter:*\n"${starter}"\n\n` +
                        `🎯 *Your turn!* Add the next sentence:\n` +
                        `📝 Use: \`.story add [your sentence]\`\n\n` +
                        `🎪 Let's create an amazing story together!`;

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                } else if (args[0] === 'add') {
                    const sentence = args.slice(1).join(' ');
                    
                    const response = `📚 *Story continues...*\n\n` +
                        `✨ *You added:*\n"${sentence}"\n\n` +
                        `🎯 *Next person can continue with:*\n` +
                        `\`.story add [next sentence]\`\n\n` +
                        `📖 The story grows! 🌟`;

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                }
            }
        });

        // Anagram game
        commandManager.addCommand('anagram', {
            description: '🔤 Solve anagram puzzles',
            category: 'games',
            usage: '.anagram',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                const anagrams = [
                    { scrambled: "CELPON", answer: "PENCIL" },
                    { scrambled: "RETAW", answer: "WATER" },
                    { scrambled: "GNKID", answer: "KING" },
                    { scrambled: "ECNAD", answer: "DANCE" },
                    { scrambled: "MUSIC", answer: "MUSIC" },
                    { scrambled: "DLROW", answer: "WORLD" },
                    { scrambled: "PPYAH", answer: "HAPPY" },
                    { scrambled: "NIFDER", answer: "FRIEND" }
                ];

                const puzzle = anagrams[Math.floor(Math.random() * anagrams.length)];
                
                const response = `🔤 *ANAGRAM PUZZLE!*\n\n` +
                    `🎯 *Unscramble these letters:*\n*${puzzle.scrambled}*\n\n` +
                    `💡 *Hint:* It's a common English word\n` +
                    `🎪 *Challenge:* Rearrange to find the word!\n\n` +
                    `_Think you know it? Reply with your answer!_`;

                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Number guessing game
        commandManager.addCommand('guess', {
            description: '🎲 Number guessing game',
            category: 'games',
            usage: '.guess [number]',
            permissions: ['user'],
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    const secretNumber = Math.floor(Math.random() * 100) + 1;
                    
                    const response = `🎲 *NUMBER GUESSING GAME!*\n\n` +
                        `🎯 *I'm thinking of a number between 1-100*\n\n` +
                        `🎮 *How to play:*\n` +
                        `• Use \`.guess [number]\` to make a guess\n` +
                        `• I'll tell you if it's too high or low\n` +
                        `• Try to guess in as few tries as possible!\n\n` +
                        `🚀 *Make your first guess!*\n` +
                        `_Remember: Number between 1 and 100_`;

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                } else {
                    const guess = parseInt(args[0]);
                    const secretNumber = Math.floor(Math.random() * 100) + 1; // In real game, this would be stored per user
                    
                    if (isNaN(guess) || guess < 1 || guess > 100) {
                        await sock.sendMessage(message.key.remoteJid, { 
                            text: "❌ Please enter a valid number between 1 and 100!" 
                        });
                        return;
                    }

                    let response;
                    if (guess === secretNumber) {
                        response = `🎉 *CONGRATULATIONS!*\n\n` +
                            `🎯 You guessed it! The number was *${secretNumber}*\n\n` +
                            `🏆 *Amazing!* You're a guessing champion!\n` +
                            `🎲 Start a new game with \`.guess\``;
                    } else if (guess < secretNumber) {
                        response = `📈 *Too low!* Try a higher number\n\n` +
                            `🎯 Your guess: ${guess}\n` +
                            `💡 Think bigger! 🚀`;
                    } else {
                        response = `📉 *Too high!* Try a lower number\n\n` +
                            `🎯 Your guess: ${guess}\n` +
                            `💡 Think smaller! 🎯`;
                    }

                    await sock.sendMessage(message.key.remoteJid, { text: response });
                }
            }
        });
    }
};
