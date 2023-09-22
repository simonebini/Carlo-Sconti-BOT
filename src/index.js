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

if (!BOT_TOKEN || !TRIVIA_KEY) {
    throw new Error("BOT_TOKEN must be provided!");
}

const bot = new Telegraf(BOT_TOKEN);

const notifyAdmin = (message) => {
    if (ADMIN_CHAT_ID) {
        bot.telegram.sendMessage(ADMIN_CHAT_ID, message);
    }
};

// Middleware per verificare l'autorizzazione degli utenti
bot.use((ctx, next) => {
    // Controlla se ALLOWED_CHAT_IDS è definito e autorizza solo i chat_id elencati
    if (ctx.updateType === "message" && ALLOWED_CHAT_IDS) {
        const allowedChatIds = ALLOWED_CHAT_IDS.split(",");

        if (!allowedChatIds.includes(ctx.message.chat.id.toString())) {
            notifyAdmin(`Accesso non autorizzato da chat_id ${ctx.message.chat.id}`);
            ctx.reply("Non sei autorizzato a utilizzare questo bot!");
            return;
        }
    }

    // Continua con il prossimo middleware
    next();
});

// Gestisci il comando /start
bot.command("start", (ctx) => {

    ctx.reply("Benvenuto! Clicca sul pulsante 'Inizia Trivia' per iniziare il gioco.", {
        reply_markup: {
            keyboard: [['Inizia Trivia']],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });
});

// Gestisci la pressione del pulsante "Inizia Trivia"
bot.hears("Inizia Trivia", async (ctx) => {

    try {
        const response = await axios.get(TRIVIA_KEY);
        const question = response.data.results[0];

        const options = [...question.incorrect_answers, question.correct_answer];
        const shuffledOptions = shuffleArray(options);

        const formattedQuestion = decodeURIComponent(question.question);

        ctx.reply(formattedQuestion, {
            reply_markup: {
                keyboard: shuffledOptions.map((option) => [option]),
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });

        // Attendi la risposta dell'utente
        bot.on("text", async (answerMsg) => {
            const userAnswer = answerMsg.text;
            const correctAnswer = decodeURIComponent(question.correct_answer);

            if (userAnswer === correctAnswer) {
                ctx.reply(`Risposta corretta! La risposta è: ${correctAnswer}`);
            } else {
                ctx.reply(`Risposta sbagliata. La risposta corretta è: ${correctAnswer}`);
            }

            // Fai in modo che l'utente possa avviare una nuova domanda
            ctx.reply("Clicca su 'Inizia Trivia' per una nuova domanda.", {
                reply_markup: {
                    keyboard: [['Inizia Trivia']],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        });
    } catch (error) {
        console.error('Errore nella richiesta API:', error.message);
        ctx.reply('Si è verificato un errore durante il recupero delle domande. Riprova più tardi.');
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