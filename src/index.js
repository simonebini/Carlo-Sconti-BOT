const { Telegraf } = require("telegraf");
const { join } = require("path");
const axios = require("axios");
require("dotenv").config({ path: join(__dirname, "../.env") });
const path = require('path');
const {
    BOT_TOKEN,
    TRIVIA_KEY,
} = process.env;

let score = 0;

if (!BOT_TOKEN || !TRIVIA_KEY) {
    throw new Error("BOT_TOKEN must be provided!");
}

const bot = new Telegraf(BOT_TOKEN);
let currentQuestion = null;

//gestore comando per avviare il bot
bot.command("start", (ctx) => {

    ctx.replyWithVideo(
        { source: path.join(__dirname, '../img/sigla.mp4') },
        {
            caption: "Eccoci qui, benvenuti! Iniziamo a giocare.",
            reply_markup: {
                keyboard: [['Inizia il Gioco']],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        }
      );
});

//gestore comando per terminare la partita
bot.hears(["Termina Partita"], async (ctx) => {

    score = 0;
    currentQuestion = null;

                
    ctx.replyWithPhoto(
        { source: path.join(__dirname, '../img/saluti.jpg') },
        {
            caption: "Ci rivediamo domani alla prossima puntata!",
            reply_markup: {
                keyboard: [['Inizia il Gioco']],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
          });

});

//gestore comando per iniziare la partita o passare alla domanda successiva
bot.hears(["Inizia il Gioco", "Prossima Domanda"], async (ctx) => {
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

//gestore le risposte dell'utente
bot.on("text", async (ctx) => {
    if (currentQuestion) {
        const userAnswer = ctx.message.text;
        const correctAnswer = decodeURIComponent(currentQuestion.correct_answer);

        ctx.replyWithAnimation({
            source: path.join(__dirname, '../img/scossa.gif'),
        });
        currentQuestion = null;

        setTimeout(() => {
            if (userAnswer === correctAnswer) {
                score += 10;
            
                ctx.replyWithPhoto(
                    { source: path.join(__dirname, '../img/giusta.jpg'), },
                    {
                        caption: `Eh si, la risposta corretta è: ${correctAnswer}`,
                        reply_markup: {
                        keyboard: [['Prossima Domanda'], ['Termina Partita']],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                      },
                    });
            
            } else {
                if (score > 0) score -= 2;
                else score = 0;
            
                ctx.replyWithPhoto(
                    { source: path.join(__dirname, '../img/sbagliata.jpg'), },
                    {
                        caption: `E invece no, purtroppo la risposta corretta è: ${correctAnswer}`,
                        reply_markup: {
                        keyboard: [['Prossima Domanda'], ['Termina Partita']],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                      },
                    });
            }

            ctx.reply(`Il tuo punteggio attuale è: ${score}`);
        }, 4000);
    }
});

//mescolo array di risposte possibili
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

bot.launch().then(() => {
    console.log('Bot trivia avviato.');
}).catch((err) => {
    console.error('Errore nell avvio del bot:', err);
});