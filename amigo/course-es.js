// Amigo · Kaibigan: Spanish, the way kids in Mexico say it, for his friends
// at school. The rules for a unit are in amigo/README.md; tools/test-amigo.mjs
// checks every one.
(function (root) {
  'use strict';

  const COURSE = {
    id: 'es',
    name: 'Español',
    who: 'For friends at school',
    voices: ['es-MX', 'es-US', 'es'],
    praise: ['¡Muy bien!', '¡Eso!', '¡Bien hecho!'],
    units: [
      {
        id: 'recreo', title: 'En el recreo', sub: 'At recess',
        blurb: 'Asking to play, playing tag, and making a new kid feel welcome.',
        done: '¡Qué padre!', doneNote: '“¡Qué padre!” means “How cool!” in Mexico.',
        phrases: [
          { t: '¿Quieres jugar?', en: 'Do you want to play?', wrong: ['Do you want to eat?', 'Where are you going?'] },
          { t: '¡Vamos a jugar!', en: 'Let’s play!', wrong: ['Let’s go home!', 'Let’s eat!'] },
          { t: '¿Puedo jugar con ustedes?', en: 'Can I play with you guys?', wrong: ['Can I eat with you guys?', 'Can you play with me?'],
            note: '“Ustedes” is “you all.” In Mexico it’s what you say to a group of friends.' },
          { t: '¿Cómo te llamas?', en: 'What’s your name?', wrong: ['How old are you?', 'Where do you live?'] },
          { t: 'Me llamo Diego.', en: 'My name is Diego.', wrong: ['I’m calling Diego.', 'I like Diego.'] },
          { t: '¿Qué onda?', en: 'What’s up?', wrong: ['What’s your name?', 'Where are you going?'],
            note: 'In Mexico, it’s how friends say hi, not how you greet a teacher.' },
          { t: 'Te toca.', en: 'It’s your turn.', wrong: ['It’s my turn.', 'Nice try.'] },
          { t: 'Me toca.', en: 'It’s my turn.', wrong: ['It’s your turn.', 'Wait for me.'] },
          { t: '¡Tú la traes!', en: 'You’re it!', wrong: ['You’re out!', 'You win!'],
            note: 'That’s what you shout in tag. In Mexico, tag is often called “las traes.”' },
          { t: '¡Espérame!', en: 'Wait for me!', wrong: ['Come here!', 'Watch out!'] },
          { t: '¡Ven acá!', en: 'Come here!', wrong: ['Go away!', 'Wait for me!'] },
          { t: '¡Aguas!', en: 'Watch out!', wrong: ['Water!', 'Hurry up!'],
            note: 'In Mexico, “¡Aguas!” (waters) means “Watch out!”' },
          { t: '¡Qué padre!', en: 'How cool!', wrong: ['How sad!', 'Dad’s here!'],
            note: 'In Mexico, “padre” (father) also means cool.' },
          { t: '¿Quieres sentarte con nosotros?', en: 'Do you want to sit with us?', wrong: ['Do you want to go home?', 'Do you want my homework?'] },
          { t: '¡No se vale!', en: 'No fair!', wrong: ['I give up!', 'Not now!'],
            note: 'Mexican kids shout it when someone cheats or breaks a rule.' },
        ],
        words: [['hola', 'hi'], ['amigo', 'friend (a boy)'], ['amiga', 'friend (a girl)'], ['jugar', 'to play'], ['recreo', 'recess'], ['correr', 'to run'],
          ['brincar', 'to jump'], ['columpio', 'swing'], ['resbaladilla', 'slide'], ['pelota', 'ball'], ['patio', 'schoolyard'], ['maestra', 'teacher']],
        scenes: [
          { kind: 'What do you ask?', prompt: 'Some kids are playing soccer, and you want to join.', right: '¿Puedo jugar con ustedes?',
            wrong: ['¿Puedo ir al baño?', '¿Me prestas tu lápiz?'], note: 'The others ask to go to the bathroom, and to borrow a pencil.' },
          { kind: 'What do you shout?', prompt: 'You tag your friend in a game of tag.', right: '¡Tú la traes!', wrong: ['¡Qué padre!', '¡Espérame!'],
            note: '“¡Qué padre!” means “How cool!”' },
          { kind: 'What do you say?', prompt: 'Your friend runs off ahead of you.', right: '¡Espérame!', wrong: ['¡Me toca!', '¡Qué padre!'],
            note: '“¡Qué padre!” means “How cool!”' },
          { kind: 'What do you shout?', prompt: 'A ball is flying straight at your friend’s head.', right: '¡Aguas!', wrong: ['¡Te toca!', '¡Ven acá!'] },
          { kind: 'What could you say?', prompt: 'A new kid is sitting alone at recess.', right: '¿Quieres sentarte con nosotros?',
            wrong: ['¿Quieres irte a tu casa?', '¿Quieres mi tarea?'], note: 'The others ask if he wants to go home, or wants your homework.' },
        ],
      },
      {
        id: 'futbol', title: 'Futbol', sub: 'Soccer',
        blurb: 'Calling for the ball, cheering a goal, and the words on the field.',
        done: '¡Golazo!', doneNote: 'A “golazo” is a great goal.',
        phrases: [
          { t: '¿Jugamos una cascarita?', en: 'Want to play a pickup game?', wrong: ['Who has the ball?', 'Is the game over?'],
            note: 'In Mexico, a “cascarita” is a pickup soccer game.' },
          { t: '¡Pásala!', en: 'Pass it!', wrong: ['Kick it out!', 'Stop it!'] },
          { t: '¡Pásamela!', en: 'Pass it to me!', wrong: ['Pass it to him!', 'Take it from me!'] },
          { t: '¡Estoy solo!', en: 'I’m open!', wrong: ['I’m tired!', 'I’m lost!'],
            note: 'Word for word it’s “I’m alone”: nobody is guarding you.' },
          { t: '¡Tírale!', en: 'Shoot!', wrong: ['Run!', 'Pass!'] },
          { t: '¡Qué golazo!', en: 'What a goal!', wrong: ['What a save!', 'What a foul!'] },
          { t: '¡Buen pase!', en: 'Nice pass!', wrong: ['Nice shot!', 'Nice try!'] },
          { t: '¡Casi!', en: 'Almost!', wrong: ['Again!', 'Enough!'] },
          { t: '¡No pasa nada!', en: 'It’s okay!', wrong: ['Good game!', 'Hurry up!'],
            note: 'What you tell a teammate who just messed up.' },
          { t: '¿Quién es el portero?', en: 'Who’s the goalie?', wrong: ['Who’s the captain?', 'Where’s the ball?'] },
          { t: '¿En qué equipo estoy?', en: 'What team am I on?', wrong: ['What time is it?', 'Who won?'] },
          { t: '¡Vamos ganando!', en: 'We’re winning!', wrong: ['We’re losing!', 'Let’s go home!'] },
          { t: '¡Fue mano!', en: 'Hand ball!', wrong: ['Good hands!', 'Hands up!'],
            note: '“Mano” is hand: the ball touched someone’s hand.' },
          { t: '¡Atájala!', en: 'Stop it! (to your goalie)', wrong: ['Throw it!', 'Kick it!'],
            note: 'You yell it to your goalie: catch it, stop it.' },
        ],
        words: [['cancha', 'field'], ['portería', 'goal (the net)'], ['portero', 'goalie'], ['pase', 'pass'], ['gol', 'goal'], ['falta', 'foul'],
          ['patear', 'to kick'], ['ganar', 'to win'], ['perder', 'to lose'], ['empate', 'tie'], ['equipo', 'team'], ['árbitro', 'referee']],
        scenes: [
          { kind: 'What do you shout?', prompt: 'You’re open near the goal, and you want the ball.', right: '¡Pásamela!', wrong: ['¡Tírale!', '¡Casi!'],
            note: '“¡Casi!” means “Almost!”' },
          { kind: 'What do you shout?', prompt: 'Your friend scores a goal from way out.', right: '¡Qué golazo!', wrong: ['¡Qué sueño!', '¡Qué frío!'],
            note: '“¡Qué sueño!” is “I’m so sleepy,” and “¡Qué frío!” is “It’s so cold.”' },
          { kind: 'What do you say?', prompt: 'Your teammate’s shot just misses the goal.', right: '¡Casi!', wrong: ['¡Qué golazo!', '¡Estoy solo!'] },
          { kind: 'What do you shout?', prompt: 'The ball bounces off a player’s hand.', right: '¡Fue mano!', wrong: ['¡Buen pase!', '¡Vamos ganando!'] },
        ],
      },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = COURSE;
  else (root.AMIGO_COURSES = root.AMIGO_COURSES || {}).es = COURSE;
})(this);
