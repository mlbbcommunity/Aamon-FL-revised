const config = require('../config');
const logger = require('../utils/logger');

// Game state storage
const gameStates = {
    riddles: new Map(),
    trivia: new Map(),
    wordChain: new Map(),
    stories: new Map(),
    anagrams: new Map(),
    guessing: new Map()
};

// Game data
const riddles = [
    {
        question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
        answer: "echo",
        hint: "It repeats what you say"
    },
    {
        question: "The more you take, the more you leave behind. What am I?",
        answer: "footsteps",
        hint: "You make them when walking"
    },
    {
        question: "I have keys but no locks. I have space but no room. You can enter but not go inside. What am I?",
        answer: "keyboard",
        hint: "Used with computers"
    },
    {
        question: "What has hands but cannot clap?",
        answer: "clock",
        hint: "It tells time"
    },
    {
        question: "What gets wet while drying?",
        answer: "towel",
        hint: "Used after shower"
    }
];

const triviaQuestions = [
    {
        question: "What is the largest planet in our solar system?",
        options: ["A) Earth", "B) Jupiter", "C) Saturn", "D) Mars"],
        answer: "B",
        explanation: "Jupiter is the largest planet in our solar system"
    },
    {
        question: "Which programming language was created by Guido van Rossum?",
        options: ["A) Java", "B) Python", "C) JavaScript", "D) C++"],
        answer: "B",
        explanation: "Python was created by Guido van Rossum in 1991"
    },
    {
        question: "What does 'HTTP' stand for?",
        options: ["A) HyperText Transfer Protocol", "B) High Transfer Text Protocol", "C) Home Tool Transfer Protocol", "D) HyperText Tool Protocol"],
        answer: "A",
        explanation: "HTTP stands for HyperText Transfer Protocol"
    },
    {
        question: "Which element has the chemical symbol 'O'?",
        options: ["A) Gold", "B) Silver", "C) Oxygen", "D) Iron"],
        answer: "C",
        explanation: "Oxygen has the chemical symbol 'O'"
    }
];

const anagramWords = [
    { word: "listen", anagram: "silent", hint: "Opposite of loud" },
    { word: "earth", anagram: "heart", hint: "Organ that pumps blood" },
    { word: "stressed", anagram: "desserts", hint: "Sweet treats" },
    { word: "evil", anagram: "live", hint: "To be alive" },
    { word: "race", anagram: "care", hint: "To look after someone" }
];

function initializePlugin(commandManager) {
    // Riddle command
    commandManager.register('riddle', {
        description: 'Get a fun riddle to solve',
        usage: `${config.PREFIX}riddle`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;
                const riddle = riddles[Math.floor(Math.random() * riddles.length)];

                gameStates.riddles.set(userId, {
                    riddle: riddle,
                    startTime: Date.now(),
                    hintsUsed: 0
                });

                const riddleText = `🧩 *RIDDLE TIME* 🧩\n\n` +
                    `❓ ${riddle.question}\n\n` +
                    `💡 Type your answer or use \`${config.PREFIX}hint\` for a clue!\n` +
                    `⏰ You have 60 seconds to solve it!`;

                await sock.sendMessage(userId, { text: riddleText });

                // Auto-expire after 60 seconds
                setTimeout(() => {
                    if (gameStates.riddles.has(userId)) {
                        gameStates.riddles.delete(userId);
                        sock.sendMessage(userId, { 
                            text: `⏰ *Time's up!* The answer was: **${riddle.answer}**\n\nTry another riddle with \`${config.PREFIX}riddle\`` 
                        });
                    }
                }, 60000);

            } catch (error) {
                logger.error('Error in riddle command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error starting riddle game' });
            }
        }
    });

    // Trivia command
    commandManager.register('trivia', {
        description: 'Answer multiple choice trivia questions',
        usage: `${config.PREFIX}trivia`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;
                const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

                gameStates.trivia.set(userId, {
                    question: question,
                    startTime: Date.now()
                });

                const triviaText = `🎯 *TRIVIA TIME* 🎯\n\n` +
                    `❓ ${question.question}\n\n` +
                    question.options.join('\n') + '\n\n' +
                    `💡 Reply with A, B, C, or D\n` +
                    `⏰ You have 30 seconds!`;

                await sock.sendMessage(userId, { text: triviaText });

                // Auto-expire after 30 seconds
                setTimeout(() => {
                    if (gameStates.trivia.has(userId)) {
                        gameStates.trivia.delete(userId);
                        sock.sendMessage(userId, { 
                            text: `⏰ *Time's up!* The answer was: **${question.answer}**\n\n${question.explanation}\n\nTry again with \`${config.PREFIX}trivia\`` 
                        });
                    }
                }, 30000);

            } catch (error) {
                logger.error('Error in trivia command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error starting trivia game' });
            }
        }
    });

    // Word Chain command
    commandManager.register('wordchain', {
        description: 'Play word chain games',
        usage: `${config.PREFIX}wordchain [word]`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;
                const currentGame = gameStates.wordChain.get(userId);

                if (!args[0]) {
                    // Start new game
                    const startWords = ['apple', 'elephant', 'table', 'energy', 'yellow'];
                    const startWord = startWords[Math.floor(Math.random() * startWords.length)];

                    gameStates.wordChain.set(userId, {
                        currentWord: startWord,
                        words: [startWord],
                        score: 0,
                        startTime: Date.now()
                    });

                    const gameText = `🔗 *WORD CHAIN GAME* 🔗\n\n` +
                        `🎯 Starting word: **${startWord}**\n\n` +
                        `📝 Rules:\n` +
                        `• Next word must start with: **${startWord.slice(-1).toUpperCase()}**\n` +
                        `• Use \`${config.PREFIX}wordchain <word>\` to play\n` +
                        `• Each valid word = +1 point\n\n` +
                        `💡 Example: ${startWord} → ${startWord.slice(-1)}...`;

                    await sock.sendMessage(userId, { text: gameText });
                    return;
                }

                if (!currentGame) {
                    await sock.sendMessage(userId, { text: `❌ No active game! Start with \`${config.PREFIX}wordchain\`` });
                    return;
                }

                const newWord = args[0].toLowerCase();
                const lastChar = currentGame.currentWord.slice(-1);

                if (newWord.charAt(0) !== lastChar) {
                    await sock.sendMessage(userId, { 
                        text: `❌ Word must start with **${lastChar.toUpperCase()}**\n\nCurrent word: **${currentGame.currentWord}**` 
                    });
                    return;
                }

                if (currentGame.words.includes(newWord)) {
                    await sock.sendMessage(userId, { text: '❌ Word already used! Try a different word.' });
                    return;
                }

                // Valid word
                currentGame.words.push(newWord);
                currentGame.currentWord = newWord;
                currentGame.score++;

                const successText = `✅ Great word! **${newWord}**\n\n` +
                    `🏆 Score: ${currentGame.score}\n` +
                    `🎯 Next word must start with: **${newWord.slice(-1).toUpperCase()}**\n\n` +
                    `Continue with \`${config.PREFIX}wordchain <word>\``;

                await sock.sendMessage(userId, { text: successText });

            } catch (error) {
                logger.error('Error in wordchain command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error in word chain game' });
            }
        }
    });

    // Rhyme command
    commandManager.register('rhyme', {
        description: 'Find words that rhyme',
        usage: `${config.PREFIX}rhyme <word>`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                if (!args[0]) {
                    await sock.sendMessage(message.key.remoteJid, { 
                        text: `❌ Please provide a word!\n\nUsage: \`${config.PREFIX}rhyme <word>\`` 
                    });
                    return;
                }

                const word = args[0].toLowerCase();
                const rhymeDict = {
                    'cat': ['bat', 'hat', 'mat', 'rat', 'sat'],
                    'day': ['way', 'say', 'play', 'stay', 'may'],
                    'light': ['bright', 'night', 'right', 'sight', 'might'],
                    'tree': ['free', 'see', 'bee', 'key', 'three'],
                    'love': ['dove', 'above', 'glove', 'shove'],
                    'time': ['rhyme', 'climb', 'lime', 'chime'],
                    'blue': ['true', 'new', 'flew', 'grew', 'knew'],
                    'song': ['long', 'strong', 'wrong', 'along']
                };

                const rhymes = rhymeDict[word] || ['Sorry, no rhymes found!'];

                const rhymeText = `🎵 *RHYMING WORDS* 🎵\n\n` +
                    `📝 Word: **${word}**\n\n` +
                    `🎯 Rhymes:\n${rhymes.map(r => `• ${r}`).join('\n')}\n\n` +
                    `💡 Try another word with \`${config.PREFIX}rhyme <word>\``;

                await sock.sendMessage(message.key.remoteJid, { text: rhymeText });

            } catch (error) {
                logger.error('Error in rhyme command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error finding rhymes' });
            }
        }
    });

    // Story command
    commandManager.register('story', {
        description: 'Collaborative story building',
        usage: `${config.PREFIX}story [add sentence]`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;

                if (!args[0]) {
                    // Show current story or start new
                    const currentStory = gameStates.stories.get(userId);

                    if (!currentStory) {
                        // Start new story
                        const starters = [
                            "Once upon a time, in a magical kingdom...",
                            "It was a dark and stormy night when...",
                            "The old wizard opened his dusty spellbook and...",
                            "Sarah discovered a mysterious door in her basement that..."
                        ];

                        const starter = starters[Math.floor(Math.random() * starters.length)];
                        gameStates.stories.set(userId, {
                            sentences: [starter],
                            contributors: 1,
                            startTime: Date.now()
                        });

                        const storyText = `📚 *STORY BUILDING* 📚\n\n` +
                            `${starter}\n\n` +
                            `✍️ Add to the story with:\n` +
                            `\`${config.PREFIX}story add <your sentence>\`\n\n` +
                            `📖 View story: \`${config.PREFIX}story\``;

                        await sock.sendMessage(userId, { text: storyText });
                    } else {
                        // Show current story
                        const storyText = `📚 *CURRENT STORY* 📚\n\n` +
                            currentStory.sentences.join(' ') + '\n\n' +
                            `✍️ Sentences: ${currentStory.sentences.length}\n` +
                            `👥 Contributors: ${currentStory.contributors}\n\n` +
                            `Add more: \`${config.PREFIX}story add <sentence>\``;

                        await sock.sendMessage(userId, { text: storyText });
                    }
                    return;
                }

                if (args[0] === 'add' && args.slice(1).length > 0) {
                    let currentStory = gameStates.stories.get(userId);

                    if (!currentStory) {
                        await sock.sendMessage(userId, { text: `❌ No active story! Start with \`${config.PREFIX}story\`` });
                        return;
                    }

                    const newSentence = args.slice(1).join(' ');
                    currentStory.sentences.push(newSentence);
                    currentStory.contributors++;

                    const successText = `✅ Added to story!\n\n` +
                        `📚 *Latest addition:*\n"${newSentence}"\n\n` +
                        `📖 View full story: \`${config.PREFIX}story\``;

                    await sock.sendMessage(userId, { text: successText });
                } else {
                    await sock.sendMessage(userId, { 
                        text: `❌ Invalid usage!\n\nUsage: \`${config.PREFIX}story add <sentence>\`` 
                    });
                }

            } catch (error) {
                logger.error('Error in story command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error in story building' });
            }
        }
    });

    // Anagram command
    commandManager.register('anagram', {
        description: 'Solve anagram puzzles',
        usage: `${config.PREFIX}anagram`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;
                const anagram = anagramWords[Math.floor(Math.random() * anagramWords.length)];

                gameStates.anagrams.set(userId, {
                    anagram: anagram,
                    startTime: Date.now()
                });

                const anagramText = `🔤 *ANAGRAM PUZZLE* 🔤\n\n` +
                    `🎯 Unscramble: **${anagram.anagram.toUpperCase()}**\n\n` +
                    `💡 Hint: ${anagram.hint}\n\n` +
                    `✍️ Type your answer!\n` +
                    `⏰ You have 45 seconds!`;

                await sock.sendMessage(userId, { text: anagramText });

                // Auto-expire after 45 seconds
                setTimeout(() => {
                    if (gameStates.anagrams.has(userId)) {
                        gameStates.anagrams.delete(userId);
                        sock.sendMessage(userId, { 
                            text: `⏰ *Time's up!* The answer was: **${anagram.word}**\n\nTry another with \`${config.PREFIX}anagram\`` 
                        });
                    }
                }, 45000);

            } catch (error) {
                logger.error('Error in anagram command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error starting anagram puzzle' });
            }
        }
    });

    // Number guessing command
    commandManager.register('guess', {
        description: 'Number guessing game (1-100)',
        usage: `${config.PREFIX}guess [number]`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;

                if (!args[0]) {
                    // Start new game
                    const targetNumber = Math.floor(Math.random() * 100) + 1;
                    gameStates.guessing.set(userId, {
                        target: targetNumber,
                        attempts: 0,
                        maxAttempts: 7,
                        startTime: Date.now()
                    });

                    const gameText = `🎯 *NUMBER GUESSING GAME* 🎯\n\n` +
                        `🎲 I'm thinking of a number between 1-100\n\n` +
                        `🎯 You have 7 attempts to guess it!\n\n` +
                        `💡 Use: \`${config.PREFIX}guess <number>\`\n` +
                        `📊 I'll tell you if it's higher or lower!`;

                    await sock.sendMessage(userId, { text: gameText });
                    return;
                }

                const currentGame = gameStates.guessing.get(userId);
                if (!currentGame) {
                    await sock.sendMessage(userId, { text: `❌ No active game! Start with \`${config.PREFIX}guess\`` });
                    return;
                }

                const guess = parseInt(args[0]);
                if (isNaN(guess) || guess < 1 || guess > 100) {
                    await sock.sendMessage(userId, { text: '❌ Please enter a number between 1-100!' });
                    return;
                }

                currentGame.attempts++;
                const attemptsLeft = currentGame.maxAttempts - currentGame.attempts;

                if (guess === currentGame.target) {
                    gameStates.guessing.delete(userId);
                    const winText = `🎉 *CONGRATULATIONS!* 🎉\n\n` +
                        `✅ You guessed it! The number was **${currentGame.target}**\n\n` +
                        `🏆 Attempts used: ${currentGame.attempts}/${currentGame.maxAttempts}\n` +
                        `⏱️ Time: ${Math.round((Date.now() - currentGame.startTime) / 1000)}s\n\n` +
                        `🎯 Play again with \`${config.PREFIX}guess\``;

                    await sock.sendMessage(userId, { text: winText });
                } else if (attemptsLeft === 0) {
                    gameStates.guessing.delete(userId);
                    await sock.sendMessage(userId, { 
                        text: `💔 *Game Over!*\n\nThe number was **${currentGame.target}**\n\nTry again with \`${config.PREFIX}guess\`` 
                    });
                } else {
                    const hint = guess < currentGame.target ? '📈 Higher!' : '📉 Lower!';
                    const feedbackText = `${hint}\n\n` +
                        `🎯 Your guess: **${guess}**\n` +
                        `🔄 Attempts left: **${attemptsLeft}**\n\n` +
                        `Keep trying with \`${config.PREFIX}guess <number>\``;

                    await sock.sendMessage(userId, { text: feedbackText });
                }

            } catch (error) {
                logger.error('Error in guess command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error in guessing game' });
            }
        }
    });

    // Hint command for riddles
    commandManager.register('hint', {
        description: 'Get a hint for active riddle',
        usage: `${config.PREFIX}hint`,
        category: 'games',
        handler: async (sock, message, args) => {
            try {
                const userId = message.key.remoteJid;
                const currentRiddle = gameStates.riddles.get(userId);

                if (!currentRiddle) {
                    await sock.sendMessage(userId, { text: `❌ No active riddle! Start with \`${config.PREFIX}riddle\`` });
                    return;
                }

                if (currentRiddle.hintsUsed >= 1) {
                    await sock.sendMessage(userId, { text: '❌ You already used your hint for this riddle!' });
                    return;
                }

                currentRiddle.hintsUsed++;
                const hintText = `💡 *HINT* 💡\n\n${currentRiddle.riddle.hint}\n\n🎯 Now solve the riddle!`;

                await sock.sendMessage(userId, { text: hintText });

            } catch (error) {
                logger.error('Error in hint command:', error);
                await sock.sendMessage(message.key.remoteJid, { text: '❌ Error getting hint' });
            }
        }
    });

    // Message handler for game answers
    const messageHandler = require('../handlers/messageHandler');
    const originalHandle = messageHandler.handle;

    messageHandler.handle = async function(sock, message) {
        const messageContent = this.extractMessageText(message);
        const userId = message.key.remoteJid;

        // Check for riddle answers
        if (gameStates.riddles.has(userId) && messageContent && !messageContent.startsWith(config.PREFIX)) {
            const currentRiddle = gameStates.riddles.get(userId);
            if (messageContent.toLowerCase().trim() === currentRiddle.riddle.answer.toLowerCase()) {
                gameStates.riddles.delete(userId);
                const timeTaken = Math.round((Date.now() - currentRiddle.startTime) / 1000);
                await sock.sendMessage(userId, { 
                    text: `🎉 *Correct!* 🎉\n\nAnswer: **${currentRiddle.riddle.answer}**\nTime: ${timeTaken}s\n\nTry another: \`${config.PREFIX}riddle\`` 
                });
                return;
            }
        }

        // Check for trivia answers
        if (gameStates.trivia.has(userId) && messageContent && !messageContent.startsWith(config.PREFIX)) {
            const currentTrivia = gameStates.trivia.get(userId);
            const answer = messageContent.toUpperCase().trim();
            if (['A', 'B', 'C', 'D'].includes(answer)) {
                gameStates.trivia.delete(userId);
                if (answer === currentTrivia.question.answer) {
                    const timeTaken = Math.round((Date.now() - currentTrivia.startTime) / 1000);
                    await sock.sendMessage(userId, { 
                        text: `🎉 *Correct!* 🎉\n\n${currentTrivia.question.explanation}\nTime: ${timeTaken}s\n\nTry another: \`${config.PREFIX}trivia\`` 
                    });
                } else {
                    await sock.sendMessage(userId, { 
                        text: `❌ *Wrong!* The answer was **${currentTrivia.question.answer}**\n\n${currentTrivia.question.explanation}\n\nTry again: \`${config.PREFIX}trivia\`` 
                    });
                }
                return;
            }
        }

        // Check for anagram answers
        if (gameStates.anagrams.has(userId) && messageContent && !messageContent.startsWith(config.PREFIX)) {
            const currentAnagram = gameStates.anagrams.get(userId);
            if (messageContent.toLowerCase().trim() === currentAnagram.anagram.word.toLowerCase()) {
                gameStates.anagrams.delete(userId);
                const timeTaken = Math.round((Date.now() - currentAnagram.startTime) / 1000);
                await sock.sendMessage(userId, { 
                    text: `🎉 *Correct!* 🎉\n\nAnswer: **${currentAnagram.anagram.word}**\nTime: ${timeTaken}s\n\nTry another: \`${config.PREFIX}anagram\`` 
                });
                return;
            }
        }

        // Call original handler
        return originalHandle.call(this, sock, message);
    };

    logger.info('Text Games plugin loaded successfully');
}

module.exports = { initializePlugin };