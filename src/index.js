const { Telegraf } = require("telegraf");
const { join } = require("path");
const axios = require("axios");
require("dotenv").config({ path: join(__dirname, "../.env") });

const {
    BOT_TOKEN,
    TRIVIA_KEY,
    ALLOWED_CHAT_IDS,
    ADMIN_CHAT_ID
} = process.env;

let score = 0;

if (!BOT_TOKEN || !TRIVIA_KEY) {
    throw new Error("BOT_TOKEN must be provided!");
}

const bot = new Telegraf(BOT_TOKEN);

// Variabile di stato per tenere traccia della domanda corrente
let currentQuestion = null;

// Gestisci il comando /start
bot.command("start", (ctx) => {
    ctx.reply("Eccoci qui, benvenuti! Iniziamo a giocare.", {
        reply_markup: {
            keyboard: [['Inizia la Ghigliottina']],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });
});

// Gestisci la pressione del pulsante "Inizia Trivia"
bot.hears(["Inizia la Ghigliottina", "Prossima Domanda"], async (ctx) => {
    try {
        const response = await axios.get(TRIVIA_KEY);
        currentQuestion = response.data.results[0];

        const options = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
        const shuffledOptions = shuffleArray(options);

        const formattedQuestion = decodeURIComponent(currentQuestion.question);

        ctx.reply(formattedQuestion, {
            reply_markup: {
                keyboard: shuffledOptions.map((option) => [option]),
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    } catch (error) {
        console.error('Errore nella richiesta API:', error.message);
        ctx.reply('Si è verificato un errore durante il recupero delle domande. Riprova più tardi.');
    }
});

// Gestisci le risposte dell'utente
bot.on("text", async (ctx) => {
    if (currentQuestion) {
        const userAnswer = ctx.message.text;
        const correctAnswer = decodeURIComponent(currentQuestion.correct_answer);

        // Invia il messaggio "Ghigliottina"
        ctx.reply("Ghigliottina");

        // Pulisci la domanda corrente
        currentQuestion = null;

        if (userAnswer === correctAnswer) {
            score += 10;

            setTimeout(() => {
                ctx.reply(`Eh si, la risposta corretta è: ${correctAnswer}`, {
                    reply_markup: {
                        keyboard: [['Prossima Domanda']],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });
            }, 2000);

        } else {
            if(score > 0) score -= 2;
            else score = 0;
            
            setTimeout(() => {
                ctx.reply(`E invece no, purtroppo la risposta corretta è: ${correctAnswer}`, {
                    reply_markup: {
                        keyboard: [['Prossima Domanda']],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });
            }, 2000);

        }

        setTimeout(() => {
            // Invia il punteggio attuale
            ctx.reply(`Il tuo punteggio attuale è: ${score}`);
        }, 2000);
    }
});

// Funzione per mescolare un array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Avvia il bot
bot.launch().then(() => {
    console.log('Bot trivia avviato. Premi Ctrl+C per uscire.');
}).catch((err) => {
    console.error('Errore nell\'avvio del bot:', err);
});